-- ═══════════════════════════════════════════════════════════════════
-- Allotment concurrency control
-- Prevents two simultaneous Edge Function invocations from:
--   (a) running the allotment algorithm at the same time
--   (b) double-allotting the same portfolio slot
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Mutex table (single row, always id = 1) ───────────────────────
-- Serialises the entire allotment run so only ONE runs at a time.
-- If a second registration fires while the first run is in progress,
-- it sees the lock and returns immediately — the first run already
-- includes that delegate (it fetched all pending registrations).

CREATE TABLE IF NOT EXISTS allotment_mutex (
  id         int  PRIMARY KEY DEFAULT 1,
  run_id     uuid,
  locked_at  timestamptz,
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO allotment_mutex (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ── 2. try_acquire_allotment_lock() ──────────────────────────────────
-- Atomically tries to claim the mutex.
-- Returns a unique run_id  →  lock acquired, proceed.
-- Returns NULL             →  another run is active, skip.
-- Expired locks (>150 s)   →  treated as released (Edge Fn timeout).

CREATE OR REPLACE FUNCTION try_acquire_allotment_lock()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_run_id uuid := gen_random_uuid();
  v_rows   int;
BEGIN
  UPDATE allotment_mutex
     SET run_id    = v_run_id,
         locked_at = now()
   WHERE id = 1
     AND (
           run_id    IS NULL
        OR locked_at  < now() - INTERVAL '150 seconds'  -- stale lock from crashed fn
         );

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN CASE WHEN v_rows > 0 THEN v_run_id ELSE NULL END;
END;
$$;

-- ── 3. release_allotment_lock(uuid) ──────────────────────────────────
-- Only releases the lock if the caller is the current owner.
-- Safe to call multiple times (idempotent).

CREATE OR REPLACE FUNCTION release_allotment_lock(p_run_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE allotment_mutex
     SET run_id    = NULL,
         locked_at = NULL
   WHERE id = 1
     AND run_id = p_run_id;
END;
$$;

-- ── 4. claim_portfolio(portfolio_id, delegate_id) ────────────────────
-- Atomically claims ONE portfolio slot.
-- Uses WHERE status = 'vacant' so two concurrent claims on the same
-- slot can never both succeed — Postgres serialises the UPDATE.
-- Returns true  →  slot claimed.
-- Returns false →  slot already taken (try next preference).

CREATE OR REPLACE FUNCTION claim_portfolio(
  p_portfolio_id uuid,
  p_delegate_id  uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rows int;
BEGIN
  UPDATE portfolios
     SET status      = 'allotted',
         delegate_id = p_delegate_id,
         updated_at  = now()
   WHERE id     = p_portfolio_id
     AND status = 'vacant';

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

-- ── 5. Indexes for performance ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_portfolios_status   ON portfolios (status);
CREATE INDEX IF NOT EXISTS idx_portfolios_committee ON portfolios (committee);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations (allocation_status);
