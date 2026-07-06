# Battleship: bugs found and how they were fixed

Author: Ashlee Christoffersen | Play: https://ashchristoffersen-glitch.github.io/battleship/ | Repo: https://github.com/ashchristoffersen-glitch/battleship

Every line of code was written by Devin; I directed, reviewed and tested. One scoping session and one build session, 13 merged PRs, 9 issues logged (8 closed, 1 deliberately open). Devin's full factual log is in [devin-bug-log.md](devin-bug-log.md). The bugs below are grouped by how each was found, because the discovery method proved as important as the fix.

## Found by Devin's own testing

HTML5 drag-and-drop would not fire through automated mouse events, so ship placement could not be verified by tooling. Fix: a programmatic event workaround, saved into a reusable testing skill so that later sessions inherit it.

## Found by reading Devin's documentation critically

Devin's testing skill listed two "tips": the game-over overlay blocks the New Game button (workaround: console command), and stale boards remain visible under the difficulty screen after New Game. I read this as a player, both are defects, a player cannot open developer tools to start a new game. Fix: New Game made reachable from the overlay, boards cleared on reset, both before merge.

## Found by asking Devin to critique its own code

`placeFleetRandomly` retried random positions in a loop that could theoretically never terminate. It never failed in play and no play-testing would have caught it. Fix: enumerate all valid positions and pick from the list, with a regression test that fills the board and asserts the method throws rather than hangs.

## Found by watching a first-time player

My 6 year old son, who had never played Battleship, exposed two gaps: the game had no instructions at all, and the first version of the copy described dragging ships before rotating them, when rotation is impossible after placement. Fix: a how-to-play block on the difficulty screen, reworded to rotate, then drag.

## Found when features collided

I added a sound and animation feedback layer, which produced two instructive bugs. A sinking shot is also a hit, so both feedback paths fired and sinks looked identical to hits; each feature worked alone and failed only in combination. Fix: event precedence, every shot resolves to one tier (miss, hit, sunk), with a test asserting it. Separately, the sink animation was specified across two PRs and reported complete but had never been implemented, I caught this by testing the build against the specification. Fix: implemented properly, and my merge standard changed to requiring visual evidence from the deployed build, not a session log saying done.

## Found on testing on a real phone

Rotating a ship on touch took five or six taps: tap and drag were fighting over one element. Fix: a movement threshold distinguishing tap from drag, with a mechanical acceptance test of ten consecutive taps producing ten rotations. The reverse also happened: instructions verified at a mobile viewport broke on desktop, stretching full width. Fix: constrained width, and every layout change now verified at both viewports.

## Found in the pipeline, not the code

The first git push failed (repo missing from Devin's GitHub integration), the first PR could not be created (no base branch existed), and with all tests green, deploys still failed twice: once on an environment protection rule, once on a wedged Pages configuration on GitHub's side, fixed by re-provisioning the source and reconciling to a single main branch. I learned that code that works and code that is delivered are different problems.

## Known issue, deliberately open (#20)

Audio is silent on mobile: WebKit suspends the Web Audio context unless initialised inside a user gesture. The fix pattern is identified; two attempts did not land it, desktop audio works, and I stopped and documented rather than spend presentation-prep time on a platform quirk. The issue carries the diagnosis so the decision is visible. This also reflects an engineer's day as not all code ships with all issues resolved and thus the issues go to the backlog.

## What it taught me

The game build was fast; testing, review and verification consumed the schedule, and almost none of the bugs above live in the game logic. I rebuilt the same game in a fresh session with everything front-loaded to test whether the iteration could be compressed: it could not, because feel is discovered by testing, not specified in advance. And the two best fixes came from watching a real user, think like the end user, not the builder.
