# TW Comms — Phase 1 Status Audit (2026-08-25)

Audited against `docs/specs/03-build-and-test-phases.md` §3 (the authoritative Phase 1
exit criteria), not against ClickUp task titles or the earlier scaffold session's own
claims. Repo state audited: commit `064e473` (post CI-fix, pre this session's changes).

**Update 2026-08-28:** ClickUp access recovered and section 3's updates were applied
as written (comments + status moves on all 7 tasks, plus 4 new `🐛 Bugs & Findings`
entries — 3 closed as already-fixed, 1 left open: the schema-drift finding).
Also found, while re-checking repo state before this pass: `apps/whatsapp-bot/auth_state/`
now contains real pairing files (`creds.json`, a session file) dated 2026-08-26, with
no corresponding record anywhere of what that live test actually showed — flagged on
`86d3zfdq7` asking whoever ran it to comment with the outcome. Two real bugs
(`.env` not loading under `pnpm dev:bot`'s cwd, `send.ts`'s arg parser breaking on
pnpm's passed-through `--`) were found and fixed alongside that discovery — commit
`296374b`. Original rate-limited note below kept for the record.

**ClickUp was unreachable during the original pass** — every read/write call
returned `Rate limit exceeded, wait ~1330 min` (shared quota across sessions,
already hit once earlier that day). Per instruction, not retried in a loop. Section
3 below is what was actually written once access came back, per the note above.

**Spec-vs-repo mechanism gap** (per `docs/specs/README.md`, not re-litigated here):
the original spec's `agent`/`human` ClickUp *tags* and native dependency *links* were
implemented instead as `[agent]`/`[human]` title prefixes and prose "Blocked by"
notes. Judged Phase 1 completeness against doc 03's actual exit criteria text, not
against whichever tagging mechanism happened to ship.

---

## 1. Build tasks vs. code — line by line

### 1.1 Baileys bot process + `baileys-antiban` wired in from the start

**Implemented, and genuinely "from the start," not retrofitted.**

- `connection.ts:70-84` — `connect()` creates the raw Baileys socket
  (`useMultiFileAuthState` for persisted auth, `makeWASocket`).
- `connection.ts:86-116` — the raw socket is wrapped by `wrapSocket()` in the same
  method, before `creds.update`/`connection.update` listeners are even attached
  (`connection.ts:118-122`). There is no code path where an unwrapped socket is used
  to send anything.
- Anti-ban config is explicit, not defaults-and-hope: `maxPerMinute/Hour/Day` from
  env (`connection.ts:94-96`), 7-day warm-up ramp (`connection.ts:100`, comment at
  97-99 explains why `growthFactor` is deliberately left unset — a fixed value would
  be a cross-account fingerprint), warm-up/rate state now persisted to disk
  (`connection.ts:101`, `config.ts` `antiban.statePath`) so a reconnect doesn't reset
  day-1 of warm-up, and explicit group-op limits matching the spec's own numbers —
  §4.2 mitigation 1 says "rate-limited group operations," `connection.ts:109-114` sets
  `add: 3/10min, create: 2/10min` explicitly rather than trusting an undocumented
  library default.
- **Verified, not assumed:** `apps/whatsapp-bot/src/antiban-throttle.test.ts`
  constructs a real `AntiBan` instance and fires 6 rapid sends past the burst
  allowance — asserts at least one gets delayed or blocked. Passes. This is an
  offline proxy for the ClickUp task's "manual test: rapid-fire send gets throttled"
  — it proves the throttle *engages*, it is not itself the live manual test.
- Live-confirmed to this extent: a real (unpaired) run on 2026-08-26 reached
  `[baileys-antiban] Destroyed — all timers cleared` on clean shutdown, meaning the
  module loads and runs against a real Baileys socket talking to real WhatsApp
  servers, not just in isolation.

### 1.2 Bot connects to the committee approval group only (soft-launch scope)

**Partially implemented — the scope restriction is operator discipline, not code.**

- No code enforces "committee group only." `send.ts:29-34` (`resolveJid`) accepts
  `committee`, `announcements`, *or any raw JID* — the raw-JID branch is an
  intentional escape hatch for `send.ts`'s own doc comment ("or a raw JID"), but it
  means nothing in code currently stops a mistyped/copy-pasted `--to` from targeting
  an unintended group. Not a Phase 1 blocker (Phase 2's approval workflow is what's
  supposed to constrain real targets), but worth naming since Phase 1's own stated
  scope is narrower than what the code allows today.
- `index.ts:20-28` — on connect, lists every group JID the account belongs to, which
  is the actual mechanism for confirming/discovering the committee group's JID. This
  part is done.
- Joining the group itself is a WhatsApp-side action (an admin adds the number) —
  not agent-executable code, and blocked on the primary SIM being registered and
  added (Phase 0, `[human]`, last known status: to do).

### 1.3 Basic manual-trigger send (no approval gate)

**Implemented, code-complete.**

- `send.ts` (58 lines) — one-shot CLI, not a server/endpoint, correctly out of
  Phase 3 scope. `send.ts:44-50`: constructs a `BotConnection`, sends via
  `sock.sendMessage(jid, ...)` in the `onReady` callback — `sock` here is the
  antiban-wrapped `SafeSocket` (`connection.ts:152`, `this.opts.onReady?.(this.sock!)`
  where `this.sock` is the `wrapSocket()` result), so the send goes through the
  anti-ban path, not a raw-socket bypass — satisfies the ClickUp task's "send goes
  through the anti-ban-wrapped send path" AC at the code level.
- Not yet run against a live send — needs pairing (blocked on primary SIM, same as
  1.2).

### 1.4 Reconnection logic with exponential backoff

**Implemented and offline-tested.**

- `reconnect.ts` — `ReconnectBackoff`: base 2s, ×2 factor, capped at 5 min + up to 1s
  jitter (`reconnect.ts:22-27`), `reset()` on stable connection.
- `connection.ts:170-180` wires it in: on a non-logged-out `close`, backs off, logs
  the delay (`connection.ts:174-177`), then reconnects; `connection.ts:144` resets
  the backoff once `open` fires. `connection.ts:158-168` correctly special-cases
  `loggedOut` (device removed) as a terminal, non-retrying state — retrying that
  would just loop against a dead session.
- `apps/whatsapp-bot/src/reconnect.test.ts` — 3 tests, all passing: exponential
  growth capped correctly, `reset()` returns to interval 1, and 50 consecutive
  attempts under simulated sustained failure never exceed `maxMs + jitterMs` (i.e.
  can't tight-loop).
- **Subtlety for the live test to actually confirm, not assume:** the cap guarantees
  any *single* reconnect attempt's delay stays ≤ ~5m1s, but the exit criterion says
  "recovers... within 5 minutes" — if a disconnect happens to land on a later backoff
  attempt (say, attempt 4+ after a prior unstable stretch) the delay could itself be
  close to the 5-minute ceiling, leaving little room for the actual reconnect
  handshake before the 5-minute mark. The offline test proves the algorithm is
  bounded; it doesn't prove every real-world disconnect recovers inside 5 minutes.
  That's what the live test is actually for.

### 1.5 Bot heartbeat → `bot_health_log` table + migration

**Implemented at code level; migration not yet applied; one schema-naming drift
worth flagging.**

- `supabase/migrations/0001_bot_health_log.sql` — `id, status, detail, recorded_at,
  created_at`, RLS enabled, service-role-only (no client policy yet, correctly
  deferred to Phase 3 per the migration's own comment).
- **Finding:** `01-specification.md` §4.5 specifies this table as
  `bot_health_log(id, event_type, detail, logged_at)` with `event_type` values
  `heartbeat | disconnect | reconnect | ban_suspected`. What's built uses `status`
  (not `event_type`) constrained to `connecting | open | reconnecting | closed` (not
  the spec's event vocabulary), and `recorded_at` (not `logged_at`). Internally
  consistent — `health.ts` and `connection.ts` agree with the migration — so this
  isn't a bug today, but it's a real drift from the written spec. Two consequences
  worth flagging now rather than after Phase 3 is built against the wrong column
  names: (a) there's no explicit `heartbeat` event type — a periodic heartbeat is
  just another `status: "open"` row, distinguishable from a real state-transition row
  only by timestamp spacing; (b) Phase 3's Bot Status screen (traffic-light,
  §4.4/§4.5) needs to be written against the columns that actually exist
  (`status`/`recorded_at`), not the spec's literal names. Not a Phase 1 blocker —
  flagging so Phase 3 doesn't inherit a silent mismatch.
- `health.ts:34-42` (`startHeartbeatLoop`) fires every `config.health.heartbeatIntervalMs`
  — was defaulting to 60s (spec says "e.g., every 5 minutes," §4.4); fixed to 300000ms
  in an earlier session pass, confirmed still correct in the current `config.ts`.
  `connection.ts` also emits a heartbeat-adjacent row on every `open`/`close`/
  `reconnecting` transition (`connection.ts:147,160,178`), not only on the timer —
  closer to spec intent than the column-naming issue above suggests.
- `health.ts:7-14` degrades gracefully without Supabase credentials (logs locally
  only) — confirmed harmless via a live smoke test (warning logged, no crash).
- **Not yet applied to live Supabase** — blocked on Phase 0's "issue Supabase
  service-role credentials for tw-comms" (`[human]`, last known status: to do).
  Nothing to migrate against until that lands.

### 1.6 Spare SIM added to the group, silent

`[human]`, not code — nothing to audit. Last known status: to do (Phase 0).

### 1.7 "TWAOA Announcements" Channel — bot can post to it

**Code implemented and verified against the installed library's actual source, not
just documentation.** This is the strongest-evidenced item in Phase 1's build list.

- `send.ts:29-34` already generically resolves `--to announcements` → `ANNOUNCEMENTS_JID`
  and sends through the same `sock.sendMessage()` path as the committee group
  (`send.ts:47`) — no separate "Channel-posting" code exists or is needed.
- Confirmed by reading the installed `@whiskeysockets/baileys@6.7.24` source directly
  (`node_modules/.pnpm/.../lib/Socket/messages-send.js`, `isNewsletter = server ===
  'newsletter'` branch; `lib/WABinary/jid-utils.js`, `isJidNewsletter = jid =>
  jid?.endsWith('@newsletter')`): Baileys natively routes `@newsletter`-suffixed JIDs
  inside `sendMessage()` itself. The ClickUp task's suggested fallback (a
  WAHA-style third-party "newsletter" endpoint) is unnecessary — this isn't a
  theoretical claim carried over from an earlier session, it's read directly out of
  the library code actually installed in this repo.
- **Blocked, not missing:** the Channel itself doesn't exist yet (`[human]`, last
  known status: to do), so there's no real `@newsletter` JID to put in
  `ANNOUNCEMENTS_JID` or send to yet. Code is ready the moment that JID exists.

---

## 2. Readiness table — the 5 exit criteria (spec §3)

| # | Exit criterion | Status | Why |
|---|---|---|---|
| 1 | Bot sends 20+ test messages to the committee group over 7 days, zero manual intervention | **Blocked** | Needs a live paired primary number in the committee group — Mani starting this now with the spare/test number and a test group, per plan. Nothing left for code to do here; this is purely the human live-test window. |
| 2 | A forced disconnect recovers automatically within 5 minutes | **Code-ready, awaiting live test** | Backoff algorithm implemented and offline-tested (§1.4) — bounded, no tight-loop. Whether a *real* disconnect actually recovers inside 5 minutes depends on live network/WhatsApp behavior the offline test can't simulate. |
| 3 | Heartbeat visible in `bot_health_log` at expected intervals throughout the test period | **Blocked (compound)** | Two independent blockers, both `[human]`/Phase 0: Supabase credentials not yet issued (so there's no live table to write rows into), *and* a live paired connection needs to run for the interval to be observable at all. Code side (§1.5) is done. |
| 4 | Zero ban/restriction on the primary number after the 7-day window | **Blocked** | Pure live-test outcome — nothing to build. The mitigations it depends on (§1.1) are confirmed wired in. |
| 5 | Spare SIM confirmed present in the group, one test send, then left idle | **Blocked** | Spare SIM procurement is `[human]`, last known status: to do. Once paired, the same `send.ts` CLI works unmodified (it's number-agnostic — whichever `auth_state`/JID is configured is what it sends as), so there's no separate code task here, just the human step. |

**Honest bottom line:** every one of Phase 1's *build* tasks (§1 above) is code-complete
or explicitly, narrowly blocked on a named Phase 0 human prerequisite — there is no
unblocked agent-executable Phase 1 work left. All 5 *exit* criteria require an actual
live run with a real number; none of them can be satisfied, faked, or approximated
from code alone, and this audit doesn't try to. That live run is what Mani is starting
now.

---

## 3. ClickUp updates that would have been made (blocked by rate limit)

Statuses below follow the harness protocol correctly this time: **`in progress` →
`review`**, never straight to `done`/`complete` (per `03-build-and-test-phases.md`
§10 and `04-clickup-task-plan.md` §4 — "nothing self-certifies"). An earlier pass
this session attempted to set task `86d3zfdq1` directly to `complete`; that call
never landed (same rate limit), which is fortunate — it would have been the wrong
status per the doc-04 status flow. Corrected below.

*(Task IDs and last-known statuses are from this session's own earlier full-folder
read, not re-verified here — ClickUp state may have moved since.)*

| Task ID | Task | → Status | Comment to post |
|---|---|---|---|
| `86d3zfdq1` | Scaffold tw-comms repo structure | `in progress` → **`review`** | Repo structure, pnpm workspaces, and README all verified — plus the scaffold's tooling was actually broken until this session (`pino-pretty` and `eslint` were referenced but never installed; `pnpm dev:bot` crashed before reaching the QR step, `pnpm lint` failed outright). Both fixed, typecheck/lint/build/test all green, live QR smoke-test confirmed. Requesting review, not marking done myself. |
| `86d3zfdq7` | Baileys base connection + auth state persistence | stays `in progress` | Code implemented (`connection.ts:70-84`), live-confirmed to the QR-generation point. Hard-blocked on `86d3zfdnx` (primary SIM) for the "stays connected" / "restart doesn't re-auth" AC — cannot self-certify without a live pairing. |
| `86d3zfdtc` | Integrate baileys-antiban middleware | stays `in progress` | Wired in from the start (`connection.ts:86-116`), warm-up/rate state now persisted across reconnects, group-op limits explicit. Offline test (`antiban-throttle.test.ts`) proves throttling engages — flagged explicitly as a proxy for, not a replacement of, the AC's specified "manual test." |
| `86d3zfdtx` | Reconnection logic with exponential backoff | stays `in progress` | Implemented + 3 offline tests passing (bounded backoff, reset, no tight-loop under sustained failure). Live "recovers within 5 min" still needs an actual forced-disconnect test — see the audit doc's §1.4 subtlety note on why the offline test alone can't confirm this. |
| `86d3zfdu0` | Bot heartbeat → bot_health_log table + migration | stays `in progress` | Migration written, heartbeat code implemented and interval-bug-fixed (was 60s, now the spec's 5min). **Flagging a schema drift from spec §4.5** (`status`/`recorded_at` vs. spec's `event_type`/`logged_at` — see audit §1.5) for Phase 3 awareness. Migration not yet applied — blocked on Supabase credentials (Phase 0). |
| `86d3zfdu3` | Bot joins committee approval group, basic manual-trigger send | `to do` → **`in progress`** | `send.ts` implements this generically and routes through the antiban-wrapped socket. Hard-blocked on the primary SIM existing *and* being added to the committee group before any live send can be attempted. |
| `86d3zfdu9` | Bot can post to the Announcements Channel | `to do` → **`in progress`** | Already covered by the same generic `send.ts` path — no separate code needed. Verified directly against the installed Baileys library source that `@newsletter` JIDs are natively supported (see audit §1.7) — the WAHA-bridge suggestion in this task's own description is unnecessary. Blocked on the Channel itself not existing yet. |

**Also worth a `🐛 Bugs & Findings` entry** (not previously tracked anywhere in
ClickUp — these were fixed via git commits `5b193c2`/`064e473` but ClickUp has no
record of them existing):
- Missing `pino-pretty`/`eslint` deps broke `pnpm dev:bot` and `pnpm lint` outright
  since the original scaffold — nobody had actually run either command successfully
  before this session.
- CI/deploy workflows pointed at a `main` branch that doesn't exist (repo default is
  `master`) — CI's push trigger never fired; deploy script would have reset to a
  nonexistent ref.
- `pnpm/action-setup@v4` failed on a version-source conflict (`version: 9` in the
  workflow vs. `packageManager: pnpm@9.15.0` in `package.json`) — only surfaced
  *after* fixing the branch-name bug above let the push trigger fire for the first
  time.
- `bot_health_log` schema drift from spec §4.5 (this audit, §1.5) — worth its own
  task before Phase 3 builds the Bot Status screen against assumed column names.

**No new Phase 1 build tasks needed.** Everything in doc 03 §3's build-task list has
either shipped or is blocked on a named, already-tracked Phase 0 `[human]` task —
this audit didn't surface a gap ClickUp doesn't already know about, beyond the Bugs
list items above.
