# Blue Current — Captain's Commission

## Direction

A single-player browser sailing adventure: choose a purpose in harbor, navigate a living sea, return with a story, and earn a lasting commission. The existing ocean and boat handling remain the foundation.

## Reference study

- [Bruno Simon](https://bruno-simon.com/) and its [achievement definitions](https://github.com/brunosimon/folio-2025/blob/main/sources/data/achievements.js): a physical playground made replayable through discovery, skill challenges, races, saved achievements, and cosmetic rewards.
- [Hoardbound](https://recknlabs.itch.io/hoardbound): a sailing adventure organized around risky voyages, persistent achievements, and bringing rewards home.
- [Skull Sailor](https://skullsailor.com/about): browser-based harbor deliveries and ship progression give travel a practical purpose.

The implementation uses original naval objectives and interface copy. No reference code or assets are included.

## Implemented loop

1. Open the Captain's Journal with J or its navigation button.
2. Track a commendation, activate the buoy trail, or accept one of three delivery jobs.
3. Plot a contract leg or regatta start to recruit the existing dolphin guides.
4. Navigate hazards, weather, and pirates. Slow below 2 knots within 12 world metres of a contract port to load or deliver.
5. Earn one-time renown from commendations and completed contracts. Unlock pennants and improve the best regatta time.

Contract timers begin when cargo is collected, not on acceptance. They pause while dialogs are open, when the page is hidden, or while the player is on the opening screen. Cargo is lost on vessel loss, relaunch, abandonment, or reload. Incomplete jobs may be retried. Completed contracts cannot be farmed for repeat rewards.

## Progression

18 commendations cover exploration, unique discoveries, wildlife, seamanship, pirate encounters, and deliveries. Rank thresholds are Deckhand (0), Skipper (100), Navigator (300), Captain (600), and Admiral (1,000 renown).

The starting pennant is sea jade. Amber unlocks at 150 renown, coral at 400, and midnight at 800. Cosmetics change the mast pennant without changing combat strength or boat speed.

## Persistence and performance

Versioned localStorage holds lifetime statistics, unique discovery identifiers, the best race time, and selected pennant. Relaunch does not clear earned progress. Invalid saves recover to defaults; unavailable storage falls back to an in-memory session. Saves are batched to five seconds, with immediate achievement saves and a pagehide flush.

The journal introduces no render target, additional lighting, or per-frame 3D geometry. Its HUD updates at two Hz; achievement notifications use one bounded display queue.

## Validation

Production build and 62 automated checks passed, including seven new checks for unique rewards, reload persistence, contract pickup/delivery, pause/expiry/loss/retry, storm return, repairs, race records, distance clamping, and cosmetic gating.

Browser checks covered desktop and 390-pixel layouts, contract acceptance and guide plotting, the complete achievement list, locked rewards, a real sailing achievement, and persistence after reload. No browser console errors or warnings were captured during those checks. Full end-to-end completion of all achievements and all contracts, listening QA, and real-device performance are still manual follow-ups.

## Future directions

Fishing with species-specific bite patterns, wreck diving, procedural treasure clues, harbor upgrades, and longer voyages can expand the same loop. Multiplayer, global leaderboards, and cloud saves are outside the current release.
