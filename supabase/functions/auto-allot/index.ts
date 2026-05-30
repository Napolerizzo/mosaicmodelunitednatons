// auto-allot Edge Function
// Triggered by Supabase Database Webhook on registrations INSERT
//
// Concurrency safety:
//  1. try_acquire_allotment_lock() serialises runs — if another run is already
//     executing, this invocation returns immediately (the active run already
//     fetched the newly registered delegate).
//  2. claim_portfolio() uses an atomic UPDATE WHERE status='vacant' — two
//     concurrent claims on the same slot can never both succeed.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  runMatching, calibrateWeights, resolvePreferences,
  type Portfolio, type Delegate, type FlaggedRequest,
} from './algorithm.ts'
import { consultGemini }                      from './gemini.ts'
import { sendAllotmentEmail, sendWaitlistEmail } from './email.ts'
import { appendToSheet }                       from './sheets.ts'
import { copyFilesToDrive }                    from './drive.ts'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const auth = req.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return new Response('Unauthorized', { status: 401 })

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  // ── Acquire mutex ────────────────────────────────────────────────────────────
  // Only ONE allotment run executes at a time. If another is active, we return
  // 200 immediately — the active run already read all pending delegates including
  // whoever just triggered this invocation.
  const { data: runId, error: lockErr } = await db.rpc('try_acquire_allotment_lock')
  if (lockErr) {
    console.error('Lock RPC error:', lockErr)
    return new Response(JSON.stringify({ error: 'Lock acquisition failed' }), { status: 500 })
  }
  if (!runId) {
    console.log('Another allotment run is active — skipping (delegate will be included in that run)')
    return new Response(JSON.stringify({ skipped: true, reason: 'mutex_locked' }), { status: 200 })
  }

  console.log(`Allotment run started: ${runId}`)

  try {
    // ── 1. Fetch all pending registrations ──────────────────────────────────────
    const { data: rawDelegates, error: regErr } = await db
      .from('registrations').select('*').order('created_at', { ascending: true })
    if (regErr) throw regErr

    // ── 2. Fetch vacant portfolio slots ─────────────────────────────────────────
    const { data: rawPortfolios, error: portErr } = await db
      .from('portfolios').select('*').eq('status', 'vacant')
    if (portErr) throw portErr

    const portfolios: Portfolio[] = (rawPortfolios ?? []).map((p: any) => ({
      id: p.id, committee: p.committee, portfolio: p.portfolio,
      archive_code: p.archive_code, min_experience: p.min_experience ?? 0,
      prestige_tier: p.prestige_tier ?? 1, seats: p.seats ?? 1,
      status: p.status, group_label: p.group_label ?? null,
    }))

    const knownCommittees = [...new Set(portfolios.map(p => p.committee))]
    const knownPortfoliosByCommittee = new Map<string, string[]>()
    for (const p of portfolios) {
      if (!knownPortfoliosByCommittee.has(p.committee)) knownPortfoliosByCommittee.set(p.committee, [])
      knownPortfoliosByCommittee.get(p.committee)!.push(p.portfolio)
    }

    // ── 3. Build delegate list (skip already-confirmed allotments) ───────────────
    const allFlagged: FlaggedRequest[] = []
    const delegates: Delegate[] = []
    const seenEmails = new Map<string, number>()

    for (let order = 0; order < (rawDelegates ?? []).length; order++) {
      const r: any = rawDelegates![order]
      // Never re-process delegates who already have a confirmed allocation
      if (['allotted', 'contested'].includes(r.allocation_status)) continue

      const email = (r.email ?? '').toLowerCase().trim()
      let is_duplicate = false
      if (email && seenEmails.has(email)) {
        delegates[seenEmails.get(email)!].is_duplicate = true
        is_duplicate = true
      }
      if (email) seenEmails.set(email, delegates.length)

      const base = {
        id: r.id, registration_id: r.registration_id,
        full_name: r.full_name, email: r.email ?? '',
        phone: r.phone ?? null, institution: r.institution ?? null,
        class_year: r.class_year ?? null,
        mun_count: r.mun_count ?? 0, type: r.type,
        committee_pref_1: r.committee_pref_1, committee_pref_2: r.committee_pref_2,
        committee_pref_3: r.committee_pref_3, portfolio_pref_1: r.portfolio_pref_1,
        portfolio_pref_2: r.portfolio_pref_2, portfolio_pref_3: r.portfolio_pref_3,
        registration_order: order, is_duplicate, preferences: [],
      } as Omit<Delegate, 'preferences'>

      const { preferences, flagged } = resolvePreferences(base, knownCommittees, knownPortfoliosByCommittee)
      allFlagged.push(...flagged)
      delegates.push({ ...base, preferences } as Delegate)
    }

    const activeDelegates = delegates.filter(d => !d.is_duplicate)

    if (activeDelegates.length === 0) {
      console.log('No pending delegates — releasing lock')
      await db.rpc('release_allotment_lock', { p_run_id: runId })
      return new Response(JSON.stringify({ message: 'No pending delegates' }), { status: 200 })
    }

    // ── 4. Gemini: resolve freeform portfolio requests ───────────────────────────
    for (const flag of allFlagged) {
      const [committee, portfolio] = flag.resolved_to.split(' | ')
      const existing = knownPortfoliosByCommittee.get(committee) ?? []
      const decision = await consultGemini(committee, portfolio, existing)
      if (decision.add) {
        const newCode = `GEN-${Date.now()}`
        const { data: newPort } = await db.from('portfolios').insert({
          committee, portfolio: decision.canonical_name, archive_code: newCode,
          status: 'vacant', min_experience: 0, prestige_tier: 1, seats: 1,
        }).select().single()
        if (newPort) {
          portfolios.push({
            id: newPort.id, committee, portfolio: decision.canonical_name,
            archive_code: newCode, min_experience: 0, prestige_tier: 1,
            seats: 1, status: 'vacant', group_label: 'Added by AI',
          })
          const d = activeDelegates.find(d => d.id === flag.delegate_id)
          if (d) {
            const pref = d.preferences.find(p => p.rank === flag.preference_rank)
            if (pref) { pref.portfolio = decision.canonical_name; pref.is_freeform = false }
          }
        }
      }
    }

    // ── 5. Run Hungarian matching algorithm ──────────────────────────────────────
    const { prefWeight, expWeight } = calibrateWeights(activeDelegates)
    const results = runMatching(activeDelegates, portfolios, prefWeight, expWeight)

    // ── 6. Persist results with atomic portfolio claims ──────────────────────────
    //
    // For each allotted delegate, call claim_portfolio() which does:
    //   UPDATE portfolios SET status='allotted' WHERE id=X AND status='vacant'
    // This is atomic in Postgres — two concurrent claims on the same slot
    // can't both return true. If we lose the race, the delegate is left as
    // 'pending' and will be picked up on the next run.

    let claimedCount = 0, skippedClaims = 0, waitlistedCount = 0

    for (const result of results) {
      const { delegate, portfolio, score, confidence, is_stable, stability_rate } = result

      if (portfolio) {
        // Atomically claim the portfolio slot
        const { data: claimed, error: claimErr } = await db.rpc('claim_portfolio', {
          p_portfolio_id: portfolio.id,
          p_delegate_id: delegate.id,
        })

        if (claimErr || !claimed) {
          // Slot was taken by a concurrent run between our read and this write.
          // Leave this delegate as 'pending' — they'll be re-processed next run
          // with the updated (already-allotted) portfolio removed from the pool.
          skippedClaims++
          console.warn(`Portfolio ${portfolio.committee}|${portfolio.portfolio} already claimed — delegate ${delegate.full_name} re-queued`)
          continue
        }

        claimedCount++

        // Update registration row
        await db.from('registrations').update({
          allocation_status:   is_stable ? 'allotted' : 'contested',
          allocated_committee: portfolio.committee,
          allocated_portfolio: portfolio.portfolio,
          allotment_score:     score,
          allotment_confidence: confidence,
          allotment_stability: stability_rate,
          is_allotment_stable: is_stable,
          updated_at:          new Date().toISOString(),
        }).eq('id', delegate.id)

      } else {
        // Delegate couldn't be matched (all preferences gated or no seats)
        waitlistedCount++
        await db.from('registrations').update({
          allocation_status:   'waitlisted',
          allotment_score:     0,
          allotment_confidence: 0,
          allotment_stability: 0,
          is_allotment_stable: false,
          updated_at:          new Date().toISOString(),
        }).eq('id', delegate.id)
      }

      // Post-allotment: sync to Sheets, Drive, email
      const { data: fullRow } = await db.from('registrations').select('*').eq('id', delegate.id).single()

      if (fullRow) {
        await appendToSheet({ type: delegate.type as 'sgs' | 'external', row: fullRow })
      }

      if (fullRow?.id_card_url || fullRow?.payment_screenshot_url) {
        await copyFilesToDrive({
          registrationId: delegate.registration_id ?? delegate.id,
          supabaseStoragePaths: [
            { path: fullRow.id_card_url,          label: 'id_card'  },
            { path: fullRow.payment_screenshot_url, label: 'payment' },
          ].filter(f => f.path),
          supabaseUrl:           SUPABASE_URL,
          supabaseServiceRoleKey: SERVICE_ROLE_KEY,
        })
      }

      if (delegate.email) {
        if (portfolio && claimedCount > 0) {
          await sendAllotmentEmail({
            to: delegate.email, name: delegate.full_name,
            committee: portfolio.committee, portfolio: portfolio.portfolio,
            registrationId: delegate.registration_id ?? delegate.id,
            confidence, isStable: is_stable,
          })
        } else if (!portfolio) {
          await sendWaitlistEmail({
            to: delegate.email, name: delegate.full_name,
            registrationId: delegate.registration_id ?? delegate.id,
          })
        }
      }
    }

    const summary = {
      run_id:         runId,
      processed:      activeDelegates.length,
      claimed:        claimedCount,
      waitlisted:     waitlistedCount,
      re_queued:      skippedClaims,    // will be picked up on next registration trigger
      flagged:        allFlagged.length,
      prefWeight, expWeight,
    }
    console.log('auto-allot complete:', summary)
    return new Response(JSON.stringify(summary), { status: 200, headers: { 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('auto-allot error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  } finally {
    // Always release the lock — even on error or timeout
    await db.rpc('release_allotment_lock', { p_run_id: runId }).catch(() => {})
  }
})
