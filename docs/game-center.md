# Game Center: application behavior and handoff

This implementation is on **Dev**. It adds no backend, analytics, advertising, own user account, purchases or cloud saves. It has not been compiled or tested on an iPhone in this Linux environment. App Store Connect records and signing are external release gates, not created by this code.

## Native contract and UI

`src/services/gameCenter/` is the typed platform boundary for the custom `VeylithGameCenter` Capacitor plugin. See [native setup](game-center-ios.md) for Swift integration and Apple setup. The app initializes native authentication at launch and listens for authentication changes. Cancelling or declining authentication does not prevent play. Web platforms do not call a native plugin. Options contains connection status, reconnect, leaderboards and achievements buttons. Authentication and dashboard overlays pause/reset active game input; closing native UI does not automatically resume a run. The player explicitly resumes.

The plugin accepts an expected `playerId` with every write and validates it natively. Authentication events contain `{ available, authenticated, playerId?, displayName? }`. `uiStateChanged` contains `{ active }`. No password, Apple token or credential is handled by JavaScript.

## Scores and achievements

Ten classic leaderboards use IDs `com.francismartinez.veylith.forest1.time` through `.forest10.time`. Configure **lowest score wins**, integer milliseconds. Identity follows stable forest IDs, NOT visible display order. The order shown to users is:

| Display position | Stable level | Leaderboard suffix |
| ---------------- | ------------ | ------------------ |
| 1                | forest-1     | forest1.time       |
| 2                | forest-2     | forest2.time       |
| 3                | forest-6     | forest6.time       |
| 4                | forest-7     | forest7.time       |
| 5                | forest-8     | forest8.time       |
| 6                | forest-9     | forest9.time       |
| 7                | forest-10    | forest10.time      |
| 8                | forest-3     | forest3.time       |
| 9                | forest-4     | forest4.time       |
| 10               | forest-5     | forest5.time       |

The two achievement IDs are `com.francismartinez.veylith.first_win` (100% on a valid victory) and `.earth_complete` (10% per distinct Earth level earned by the authenticated player). Apple records, localization and artwork must be configured and reviewed before release.

At the first playing transition of each canonical attempt, the service captures the authenticated player and an identity generation. Only a completed run still belonging to that same generation may submit; signing out, switching accounts, or A→B→A invalidates the attempt. Signing in halfway through a run does not upload that run. Retry creates a fresh attempt. Editor playtests, character previews and the two historical prototypes do not submit scores or achievements.

The submitted time is the current run, rounded UP to integer milliseconds (positive, maximum 24 hours), never the device's shared best time. GameKit's configured leaderboard retains the best score. A session-local cache avoids sending a slower already-submitted score for the same player. It resets on identity change, so another player is never blocked by the device's historical record. Tokens are single-use, avoiding duplicate completion submission.

## Offline, data and identity limits

Local progression, coins, stars and unlocks remain under the existing `veylith.progress` schema. They are not bound to Game Center and are not uploaded or migrated. **Game Center does not sync the save.**

A separate `veylith.gamecenter.v1.<encoded playerId>` localStorage entry records only the stable level IDs actually completed during authenticated attempts. It never imports shared save history. This lets the Earth achievement accumulate over multiple sessions, separately for each player; the list is validated and capped to the ten canonical IDs. If local storage is unavailable the ledger is session-only. Clearing app data can lose partial local achievement counting; already accepted Game Center achievements remain managed by Apple.

Scores are not queued persistently or replayed on reconnect. A failed network submission is reported in Options; the game remains playable and local progression is unaffected. Complete another authenticated run while connected to submit its time. Earned per-player level IDs remain local, so the next authenticated victory can report that player's aggregate achievement percentage. An in-flight identity change stops subsequent calls and native methods recheck identity. There is no cross-account pending-score queue.

The website's privacy author should review these actual data flows: the native plugin uses the Game Center player identifier/display name; JavaScript keeps current identity in memory and stores a per-player completion ledger locally; configured GameKit scores/achievement percentages are sent to Apple. This document is a technical handoff, not a privacy policy or an App Store privacy declaration.

## Website and license contract

Options links to these **planned, not yet verified live** destinations:

- Privacy: `https://veylith.francismartinez.com/privacy`
- Support: `https://veylith.francismartinez.com/support`

The separate website task must publish and validate those exact routes (or coordinate changes in `src/services/releaseLinks.ts`). Do not submit to review while they are broken. External links use a new browser target with `noopener noreferrer`; test actual behavior on iPhone. Third-party license notices are bundled as `public/third-party-notices.txt` and displayed as text inside Options without a network dependency.

## Validation still required

Unit/integration tests cover unsupported web, cancellation/failure, single initialization, stale auth results, identity transitions, duplicate attempt tokens, invalid score/level rejection, score failure without replay, per-player achievement isolation, storage failure, retry/pause timing and the unchanged local progress route. These are not a native GameKit certification.

On a signed physical iPhone: test first launch authentication, cancellation, Settings sign-out/switch, unavailable network and recovery, overlay pause/resume/input, exact leaderboard IDs/units/sort, both achievement displays and progress, privacy/support browser return, offline licenses, force-quit/relaunch and long-session behavior. Check no scores are submitted from editor/lab or after an identity change. Release remains blocked by external Apple setup/device validation and the separately assigned campaign review.
