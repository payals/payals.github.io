-- Refusals the engine produces, for the talk's slides.
-- Runs on a throwaway database. Every ERROR line below is real PostgreSQL output.
-- Usage: createdb pgtalk_refusals && psql -X -e -d pgtalk_refusals -f refusals.sql > refusals.out 2>&1
\set ON_ERROR_STOP off
\set VERBOSITY default

-- ---------------------------------------------------------------
-- 1. A constraint refuses model output that a JSON schema accepted
-- ---------------------------------------------------------------
CREATE TABLE answers (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  confidence  numeric NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  body        jsonb   NOT NULL,
  CONSTRAINT cites_something CHECK (coalesce(jsonb_array_length(body->'citations'), 0) > 0)
);
-- shape is fine, value is not
INSERT INTO answers (confidence, body) VALUES (1.5, '{"answer":"x","citations":[3]}');
-- shape is fine, citations are empty
INSERT INTO answers (confidence, body) VALUES (0.9, '{"answer":"x","citations":[]}');
-- the citations key is missing: a NULL CHECK would have passed this, coalesce refuses it
INSERT INTO answers (confidence, body) VALUES (0.9, '{"answer":"x"}');
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
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'agent_role') THEN CREATE ROLE agent_role NOLOGIN; END IF; END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM agent_role;
CREATE FUNCTION record_gate(p_step bigint, p_gate text, p_passed boolean) RETURNS void
  LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public AS
  $$ INSERT INTO gate_log VALUES (p_step, p_gate, p_passed) $$;
REVOKE EXECUTE ON FUNCTION record_gate FROM PUBLIC;   -- EXECUTE is granted to PUBLIC by default
GRANT  EXECUTE ON FUNCTION record_gate TO agent_role;
SET ROLE agent_role;
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

-- ---------------------------------------------------------------
-- 10. Whoever does the work cannot write the verdict, read it, or become the one who can
-- ---------------------------------------------------------------
-- Bind each role to an identity the agent cannot forge. That is pg_hba.conf, not SQL:
--   local   all  grader_role  peer                  # the OS user IS the role (same box, different user)
--   hostssl all  grader_role  10.0.2.0/24  cert     # or a second host, with its own client certificate
-- The database cannot tell those two apart, and does not need to: identity is the role.
\set owner :USER
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'actor_role')  THEN CREATE ROLE actor_role  LOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'grader_role') THEN CREATE ROLE grader_role LOGIN; END IF;
END $$;
ALTER ROLE actor_role LOGIN; ALTER ROLE grader_role LOGIN;
-- (LOGIN so this script can connect as each one over the local trust socket; in production pg_hba does the binding)
GRANT CONNECT ON DATABASE pgtalk_refusals TO actor_role, grader_role;
CREATE SCHEMA work;   -- what the worker writes
CREATE SCHEMA eval;   -- what only the grader writes
CREATE TABLE work.attempts (
  id         bigint  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  step_id    bigint  NOT NULL,
  actor      text    NOT NULL DEFAULT current_user,       -- the role that did the work
  claim      text    NOT NULL,                             -- what it says happened
  written_by text    NOT NULL DEFAULT session_user,        -- who really connected (survives SET ROLE)
  from_addr  inet             DEFAULT inet_client_addr(),  -- and from where (NULL on a local socket)
  at         timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE eval.verdicts (
  id         bigint  PRIMARY KEY,                          -- assigned by the sealing trigger, inside a lock
  attempt_id bigint  NOT NULL REFERENCES work.attempts,
  actor      text    NOT NULL,                             -- copied from the attempt by the trigger
  judge      text    NOT NULL DEFAULT current_user,        -- stamped by the engine, never by the client
  passed     boolean NOT NULL,
  written_by text    NOT NULL DEFAULT session_user,
  from_addr  inet             DEFAULT inet_client_addr(),
  at         timestamptz NOT NULL DEFAULT now(),
  prev_hash  bytea,
  hash       bytea   NOT NULL,
  CONSTRAINT no_self_judging CHECK (judge IS DISTINCT FROM actor)
);
CREATE SEQUENCE eval.verdicts_id_seq OWNED BY eval.verdicts.id;
-- the worker: one schema, one table, two columns
GRANT USAGE ON SCHEMA work TO actor_role, grader_role;
GRANT INSERT (step_id, claim) ON work.attempts TO actor_role;
GRANT SELECT ON work.attempts TO actor_role;                    -- it may read what it filed
REVOKE ALL ON SCHEMA eval FROM actor_role, PUBLIC;
-- the grader: may read attempts, may add verdicts, may not name the judge or touch the seal
GRANT SELECT ON work.attempts TO grader_role;
GRANT USAGE ON SCHEMA eval TO grader_role;
GRANT SELECT ON eval.verdicts TO grader_role;
GRANT INSERT (attempt_id, passed) ON eval.verdicts TO grader_role;
GRANT USAGE ON SEQUENCE eval.verdicts_id_seq TO grader_role;     -- the seal needs the next id
-- every verdict seals the one before it
CREATE FUNCTION eval.seal_verdict() RETURNS trigger
  LANGUAGE plpgsql SET search_path = pg_catalog, eval, work AS $$   -- runs as the inserting role, so current_user is the real judge
DECLARE prev bytea;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('eval.verdicts'));          -- one sealer at a time
  NEW.id    := nextval('eval.verdicts_id_seq');                       -- id assigned inside the lock, so id order = chain order
  NEW.actor := (SELECT actor FROM work.attempts WHERE id = NEW.attempt_id);
  NEW.judge := current_user;                                          -- not what the client wrote
  SELECT hash INTO prev FROM eval.verdicts ORDER BY id DESC LIMIT 1;  -- READ COMMITTED: sees the last committed seal
  NEW.prev_hash := prev;
  NEW.hash := sha256(coalesce(prev, '\x'::bytea) ||
              convert_to(format('%s|%s|%s|%s|%s|%s', NEW.id, NEW.attempt_id, NEW.actor, NEW.judge, NEW.passed, NEW.at), 'UTF8'));
  RETURN NEW;
END $$;
CREATE TRIGGER verdicts_seal      BEFORE INSERT           ON eval.verdicts FOR EACH ROW EXECUTE FUNCTION eval.seal_verdict();
CREATE TRIGGER verdicts_immutable BEFORE UPDATE OR DELETE ON eval.verdicts FOR EACH ROW EXECUTE FUNCTION public.forbid_mutation();

-- the worker connects as itself and files its claim
\c - actor_role
INSERT INTO work.attempts (step_id, claim) VALUES (7, 'fix applied, tests green') RETURNING id, actor, written_by;
-- then reaches for the verdict, three ways
INSERT INTO eval.verdicts (attempt_id, passed) VALUES (1, true);     -- write one
SELECT judge, passed FROM eval.verdicts;                            -- even read one
SET ROLE grader_role;                                               -- become the grader

-- the grader connects as itself; it may write a verdict, but only the columns it was granted
\c - grader_role
INSERT INTO eval.verdicts (attempt_id, passed, judge) VALUES (1, true, 'auditor');   -- naming the judge by hand
INSERT INTO eval.verdicts (attempt_id, passed) VALUES (1, true)
  RETURNING id, actor, judge, written_by, left(encode(hash, 'hex'), 12) AS hash;
\c - :owner

-- nobody grades their own work, not even the owner
INSERT INTO work.attempts (step_id, claim) VALUES (8, 'owner did this one');
INSERT INTO eval.verdicts (attempt_id, passed) VALUES (2, true);    -- judge = actor = you

-- ---------------------------------------------------------------
-- 11. The ledger cannot be rewritten, and a bypass leaves a mark
-- ---------------------------------------------------------------
UPDATE eval.verdicts SET passed = false WHERE id = 1;
DELETE FROM eval.verdicts WHERE id = 1;
-- a second sealed verdict, then walk the chain
\c - grader_role
INSERT INTO eval.verdicts (attempt_id, passed) VALUES (2, false) RETURNING id, left(encode(prev_hash,'hex'),12) AS prev, left(encode(hash,'hex'),12) AS hash;
\c - :owner
CREATE VIEW eval.chain_check AS
SELECT bool_and(hash = sha256(coalesce(prev_hash, '\x'::bytea) ||
                convert_to(format('%s|%s|%s|%s|%s|%s', id, attempt_id, actor, judge, passed, at), 'UTF8'))) AS rows_intact,
       bool_and(prev_hash IS NOT DISTINCT FROM lag_hash)                                            AS links_intact
FROM (SELECT v.*, lag(hash) OVER (ORDER BY id) AS lag_hash FROM eval.verdicts v) s;
SELECT * FROM eval.chain_check;
-- the table owner can switch the trigger off and turn the fail into a pass. The chain still tells.
ALTER TABLE eval.verdicts DISABLE TRIGGER verdicts_immutable;
UPDATE eval.verdicts SET passed = true WHERE id = 3;
SELECT * FROM eval.chain_check;
ALTER TABLE eval.verdicts ENABLE TRIGGER verdicts_immutable;

-- ---------------------------------------------------------------
-- 12. Hybrid retrieval in one statement (the slide's query, on a three-row fixture)
-- ---------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE doc (doc_id bigint PRIMARY KEY, title text NOT NULL);
CREATE TABLE chunk (chunk_id bigint PRIMARY KEY, doc_id bigint REFERENCES doc, body text NOT NULL,
                    embedding vector(3), tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', body)) STORED);
INSERT INTO doc VALUES (1, 'runbook'), (2, 'postmortem');
INSERT INTO chunk (chunk_id, doc_id, body, embedding) VALUES
  (1, 1, 'restart the worker after a lease expires',  '[0.9, 0.1, 0.0]'),
  (2, 1, 'the reaper writes a row for a crashed worker', '[0.8, 0.2, 0.1]'),
  (3, 2, 'the dashboard stayed green for fifty-five hours', '[0.0, 0.1, 0.9]');
\set q_vec '''[0.85, 0.15, 0.05]'''
\set q '''crashed worker'''
WITH sem AS (
  SELECT chunk_id, row_number() OVER (ORDER BY embedding <=> :q_vec) AS r
  FROM chunk WHERE embedding IS NOT NULL
  ORDER BY embedding <=> :q_vec LIMIT 50
), lex AS (
  SELECT chunk_id, row_number() OVER (ORDER BY ts_rank_cd(tsv, plainto_tsquery(:q)) DESC) AS r
  FROM chunk WHERE tsv @@ plainto_tsquery(:q)
  ORDER BY ts_rank_cd(tsv, plainto_tsquery(:q)) DESC LIMIT 50
)
SELECT c.chunk_id, d.title,
       coalesce(0.7 / (60 + sem.r), 0) + coalesce(0.3 / (60 + lex.r), 0) AS rrf
FROM sem FULL OUTER JOIN lex USING (chunk_id)
JOIN chunk c USING (chunk_id) JOIN doc d USING (doc_id)
ORDER BY rrf DESC LIMIT 10;
