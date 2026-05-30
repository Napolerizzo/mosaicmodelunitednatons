// auto-allot Edge Function
// Triggered by Supabase Database Webhook on registrations INSERT
// Runs the full Hungarian-algorithm allotment engine and dispatches emails/sheets/drive

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  runMatching, calibrateWeights, resolvePreferences,
  type Portfolio, type Delegate, type FlaggedRequest,
} from './algorithm.ts'
import { consultGemini } from './gemini.ts'
import { sendAllotmentEmail, sendWaitlistEmail } from './email.ts'
import { appendToSheet } from './sheets.ts'
import { copyFilesToDrive } from './drive.ts'

// Supabase auto-injects these two — no need to set them as secrets
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req: Request) => {
  // Accept POST only
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  // Basic auth — Supabase sends the anon key or a custom secret in Authorization header
  const auth = req.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return new Response('Unauthorized', { status: 401 })

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  try {
    // ── 1. Fetch all active (non-duplicate) registrations ──────────────────────
    const { data: rawDelegates, error: regErr } = await db
      .from('registrations')
      .select('*')
      .order('created_at', { ascending: true })

    if (regErr) throw regErr

    // ── 2. Fetch portfolio matrix (vacant slots only) ──────────────────────────
    const { data: rawPortfolios, error: portErr } = await db
      .from('portfolios')
      .select('*')
      .eq('status', 'vacant')

    if (portErr) throw portErr

    const portfolios: Portfolio[] = (rawPortfolios ?? []).map((p: any) => ({
      id: p.id,
      committee: p.committee,
      portfolio: p.portfolio,
      archive_code: p.archive_code,
      min_experience: p.min_experience ?? 0,
      prestige_tier: p.prestige_tier ?? 1,
      seats: p.seats ?? 1,
      status: p.status,
      group_label: p.group_label ?? null,
    }))

    // Build lookup structures for preference resolution
    const knownCommittees = [...new Set(portfolios.map(p => p.committee))]
    const knownPortfoliosByCommittee = new Map<string, string[]>()
    for (const p of portfolios) {
      if (!knownPortfoliosByCommittee.has(p.committee))
        knownPortfoliosByCommittee.set(p.committee, [])
      knownPortfoliosByCommittee.get(p.committee)!.push(p.portfolio)
    }

    // ── 3. Resolve preferences + build Delegate objects ───────────────────────
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
        registration_order: order, is_duplicate,
        preferences: [],
      } as Omit<Delegate, 'preferences'>

      const { preferences, flagged } = resolvePreferences(base, knownCommittees, knownPortfoliosByCommittee)
      allFlagged.push(...flagged)
      delegates.push({ ...base, preferences } as Delegate)
    }

    const activeDelegates = delegates.filter(d => !d.is_duplicate)

    // ── 4. Gemini: resolve flagged freeform portfolios ─────────────────────────
    for (const flag of allFlagged) {
      const [committee, portfolio] = flag.resolved_to.split(' | ')
      const existing = knownPortfoliosByCommittee.get(committee) ?? []
      const decision = await consultGemini(committee, portfolio, existing)

      if (decision.add) {
        // Insert new portfolio into the matrix
        const newCode = `GEN-${Date.now()}`
        const { data: newPort } = await db.from('portfolios').insert({
          committee,
          portfolio: decision.canonical_name,
          archive_code: newCode,
          status: 'vacant',
          min_experience: 0,
          prestige_tier: 1,
          seats: 1,
        }).select().single()

        if (newPort) {
          portfolios.push({
            id: newPort.id, committee, portfolio: decision.canonical_name,
            archive_code: newCode, min_experience: 0, prestige_tier: 1,
            seats: 1, status: 'vacant', group_label: 'Added by AI',
          })
          // Update the delegate's preference to point to canonical name
          const delegate = activeDelegates.find(d => d.id === flag.delegate_id)
          if (delegate) {
            const pref = delegate.preferences.find(p => p.rank === flag.preference_rank)
            if (pref) { pref.portfolio = decision.canonical_name; pref.is_freeform = false }
          }
        }
      }
    }

    // ── 5. Run matching engine ─────────────────────────────────────────────────
    const { prefWeight, expWeight } = calibrateWeights(activeDelegates)
    const results = runMatching(activeDelegates, portfolios, prefWeight, expWeight)

    // ── 6. Persist results + dispatch emails + sync sheets + copy files ────────
    for (const result of results) {
      const { delegate, portfolio, preference_rank, score, confidence, is_stable, stability_rate, reason } = result
      const status = portfolio ? (is_stable ? 'allotted' : 'contested') : 'waitlisted'

      // Update registrations row
      await db.from('registrations').update({
        allocation_status:     status,
        allocated_committee:   portfolio?.committee ?? null,
        allocated_portfolio:   portfolio?.portfolio ?? null,
        allotment_score:       score,
        allotment_confidence:  confidence,
        allotment_stability:   stability_rate,
        is_allotment_stable:   is_stable,
        updated_at:            new Date().toISOString(),
      }).eq('id', delegate.id)

      // Update portfolio status
      if (portfolio) {
        await db.from('portfolios').update({
          status: 'allotted',
          delegate_id: delegate.id,
          updated_at: new Date().toISOString(),
        }).eq('id', portfolio.id)
      }

      // Fetch full registration row for sheets
      const { data: fullRow } = await db.from('registrations').select('*').eq('id', delegate.id).single()

      // Sync to Google Sheets
      if (fullRow) {
        await appendToSheet({ type: delegate.type as 'sgs' | 'external', row: fullRow })
      }

      // Copy files to Google Drive
      if (fullRow?.id_card_url || fullRow?.payment_screenshot_url) {
        await copyFilesToDrive({
          registrationId: delegate.registration_id ?? delegate.id,
          supabaseStoragePaths: [
            { path: fullRow.id_card_url, label: 'id_card' },
            { path: fullRow.payment_screenshot_url, label: 'payment' },
          ].filter(f => f.path),
          supabaseUrl: SUPABASE_URL,
          supabaseServiceRoleKey: SERVICE_ROLE_KEY,
        })
      }

      // Send email
      if (delegate.email) {
        if (portfolio) {
          await sendAllotmentEmail({
            to: delegate.email,
            name: delegate.full_name,
            committee: portfolio.committee,
            portfolio: portfolio.portfolio,
            registrationId: delegate.registration_id ?? delegate.id,
            confidence,
            isStable: is_stable,
          })
        } else {
          await sendWaitlistEmail({
            to: delegate.email,
            name: delegate.full_name,
            registrationId: delegate.registration_id ?? delegate.id,
          })
        }
      }
    }

    const summary = {
      total: results.length,
      allotted: results.filter(r => r.portfolio).length,
      waitlisted: results.filter(r => !r.portfolio).length,
      flagged: allFlagged.length,
      prefWeight, expWeight,
    }

    console.log('auto-allot complete:', summary)
    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('auto-allot error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
