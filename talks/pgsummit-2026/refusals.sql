-- Refusals the engine produces, for the talk's slides.
-- Runs on a throwaway database. Every ERROR line below is real PostgreSQL output.
-- Usage: createdb pgtalk_refusals && psql -X -e -d pgtalk_refusals -f refusals.sql > refusals.out 2>&1
\set ON_ERROR_STOP off
\set VERBOSITY terse

-- ---------------------------------------------------------------
-- 1. A constraint refuses model output that a JSON schema accepted
-- ---------------------------------------------------------------
CREATE TABLE answers (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  confidence  numeric NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  body        jsonb   NOT NULL,
  CONSTRAINT cites_something CHECK (jsonb_array_length(body->'citations') > 0)
);
-- shape is fine, value is not
INSERT INTO answers (confidence, body) VALUES (1.5, '{"answer":"x","citations":[3]}');
-- shape is fine, citations are empty
INSERT INTO answers (confidence, body) VALUES (0.9, '{"answer":"x","citations":[]}');
-- the one that passes
INSERT INTO answers (confidence, body) VALUES (0.9, '{"answer":"x","citations":[3]}');

-- ---------------------------------------------------------------
-- 2. A citation must point at a chunk that exists
-- ---------------------------------------------------------------
CREATE TABLE chunks (chunk_id bigint PRIMARY KEY, doc text NOT NULL);
INSERT INTO chunks VALUES (3, 'runbook.md');
CREATE TABLE citations (
  answer_id bigint REFERENCES answers(id),
  chunk_id  bigint REFERENCES chunks(chunk_id)
);
INSERT INTO citations SELECT id, 3   FROM answers;   -- the real chunk
INSERT INTO citations SELECT id, 999 FROM answers;   -- the model made this one up

-- ---------------------------------------------------------------
-- 3. The state machine is a table; an undeclared transition is an error
-- ---------------------------------------------------------------
CREATE TABLE transitions (from_state text, to_state text, PRIMARY KEY (from_state, to_state));
INSERT INTO transitions VALUES ('queued','running'), ('running','verified'), ('running','failed'), ('verified','done');
CREATE TABLE steps (id bigint PRIMARY KEY, status text NOT NULL DEFAULT 'queued');
CREATE FUNCTION guard_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM transitions WHERE from_state = OLD.status AND to_state = NEW.status) THEN
    RAISE EXCEPTION 'illegal transition % -> % on step %', OLD.status, NEW.status, NEW.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER steps_guard BEFORE UPDATE OF status ON steps FOR EACH ROW EXECUTE FUNCTION guard_transition();
INSERT INTO steps (id) VALUES (1);
UPDATE steps SET status = 'done' WHERE id = 1;      -- skipping straight to done
UPDATE steps SET status = 'running' WHERE id = 1 RETURNING old.status AS was, new.status AS now;  -- PG18

-- ---------------------------------------------------------------
-- 4. Absence of verification must never read as verification
-- ---------------------------------------------------------------
CREATE TABLE gate_log (step_id bigint, gate text, passed boolean NOT NULL);
-- zero gate rows for step 1: what does "all gates passed" return?
SELECT bool_and(passed)                                   AS naive_all_passed,
       coalesce(bool_and(passed), false)                  AS safe_all_passed,
       count(*) FILTER (WHERE passed) = count(*) AND count(*) > 0 AS strict_all_passed
FROM gate_log WHERE step_id = 1;

-- ---------------------------------------------------------------
-- 5. A step cannot become "verified" without a verdict row in the same transaction
-- ---------------------------------------------------------------
CREATE TABLE verdicts (step_id bigint, judge text NOT NULL, passed boolean NOT NULL);
CREATE FUNCTION require_verdict() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'verified' AND NOT EXISTS (SELECT 1 FROM verdicts WHERE step_id = NEW.id AND passed) THEN
    RAISE EXCEPTION 'step % cannot be verified: no passing verdict row', NEW.id;
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER steps_need_verdict AFTER UPDATE OF status ON steps
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION require_verdict();
BEGIN;
UPDATE steps SET status = 'verified' WHERE id = 1;   -- allowed for now ...
COMMIT;                                              -- ... refused here
SELECT status FROM steps WHERE id = 1;

-- ---------------------------------------------------------------
-- 6. The ledger is append-only, and only the owner could turn that off
-- ---------------------------------------------------------------
CREATE FUNCTION forbid_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'ledger is append-only: % on % refused', TG_OP, TG_TABLE_NAME; END $$;
CREATE TRIGGER gate_log_immutable BEFORE UPDATE OR DELETE ON gate_log FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
INSERT INTO gate_log VALUES (1, 'grounding', false);
UPDATE gate_log SET passed = true WHERE step_id = 1;
DELETE FROM gate_log WHERE step_id = 1;

-- ---------------------------------------------------------------
-- 7. The agent role has no table access at all; only typed functions
-- ---------------------------------------------------------------
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'agent_demo') THEN CREATE ROLE agent_demo NOLOGIN; END IF; END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM agent_demo;
CREATE FUNCTION record_gate(p_step bigint, p_gate text, p_passed boolean) RETURNS void
  LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public AS
  $$ INSERT INTO gate_log VALUES (p_step, p_gate, p_passed) $$;
GRANT EXECUTE ON FUNCTION record_gate TO agent_demo;
SET ROLE agent_demo;
INSERT INTO gate_log VALUES (1, 'format', true);     -- direct write
UPDATE steps SET status = 'done';                    -- direct state change
SELECT record_gate(1, 'format', true);               -- the one door that is open
RESET ROLE;

-- ---------------------------------------------------------------
-- 8. Two workers, one job: SKIP LOCKED plus a lease
-- ---------------------------------------------------------------
CREATE TABLE jobs (id bigint PRIMARY KEY, lease_token uuid, lease_until timestamptz);
INSERT INTO jobs (id) VALUES (10), (11);
BEGIN;
WITH next AS (
  SELECT id FROM jobs WHERE lease_until IS NULL OR lease_until < now()
  ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1
)
UPDATE jobs j SET lease_token = uuidv7(), lease_until = now() + interval '5 min'
FROM next WHERE j.id = next.id RETURNING j.id, j.lease_token;
-- (a second session running the same statement now gets id 11, never 10)
COMMIT;

-- ---------------------------------------------------------------
-- 9. The catalog tells you whether the rule still binds
-- ---------------------------------------------------------------
ALTER TABLE answers ADD CONSTRAINT score_range CHECK (confidence >= 0) NOT ENFORCED;   -- PG18
SELECT conname, convalidated, conenforced, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid = 'answers'::regclass ORDER BY conname;
SELECT tgname, tgenabled FROM pg_trigger WHERE tgrelid = 'gate_log'::regclass AND NOT tgisinternal;
