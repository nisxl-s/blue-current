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

## Adaptive sound design

The audio direction is cinematic nautical adventure: freedom on open water, dread around danger, and momentum during pursuit. The compositions and cues are original. No movie themes, recordings, or reference assets are used. Instrument timbres are synthesized with Web Audio rather than recorded orchestral samples.

### Situational score

| Mood | Trigger | Musical character |
| :--- | :--- | :--- |
| Freedom | Sailing in safe conditions or moored without danger triggers | Spacious flute melody, sustained strings, cello, and warm horn harmony |
| Dread | Emerging pirates, strong nighttime conditions, storms above 0.5, hull below 30%, edge danger above 0.45, or loaded cargo with under 20 seconds remaining | Low cello drones, uneasy intervals, short string figures, and heartbeat-like percussion |
| Chase | Active pirate pursuit after emergence | An original 6/8 arrangement with driving strings, horns, low bass, and drums |
| Silence | Opening screen or vessel loss, except during the explicit chase-audio preview | The ongoing score stops; relevant one-shot feedback can still play |

Vessel loss takes priority over gameplay moods. Emerging pirates select dread before the pursuit begins. Once pursuit starts, chase takes priority over weather and other hazards. The explicit pirate-audio preview temporarily selects chase for six seconds.

Each musical mood has a separate gain bus. Changes crossfade over roughly one second, with a shared short room response and filtering to soften the instruments. Freedom is mixed below dread and chase. Sea, engine, wind, spray, and rain remain quieter beneath the score.

### Interface and event cues

| Event | Feedback |
| :--- | :--- |
| Enabled navigation and action buttons | A brief, soft two-note click; continuous touch steering controls are excluded |
| Close buttons | A lower, short closing tone |
| In-game notices | A small ascending chime, limited to one retrigger per 0.9 seconds |
| Critical hull or entry into rim/urgent-delivery danger | A descending warning cue, with a three-second cooldown |
| Achievement banner appears | A four-note horn-like flourish synchronized with the queued notification |
| Pirate escape or defeat | A rising victory phrase |
| Fatal hull damage or lost pirate encounter | A descending defeat phrase |

Warnings, achievements, victories, and defeats lower the score briefly so the signal remains audible. All cues honor the sound toggle and master volume. Browser interaction is required to start Web Audio; sound remains opt-in.

### Audio performance and limits

The synthesized orchestral renderer caps simultaneous voices at 40 and disconnects completed oscillator, filter, gain, and panner nodes. Mood buses and the room response are shared rather than recreated for each note. Short effects have per-kind retrigger limits, wildlife calls are spaced out, and hidden pages suspend the audio context. These bounds control accumulation; they are not a substitute for real-device performance measurements.

The implementation lives in `src/adaptive-score.js` (mood rules, arrangements, and notification phrases), `src/nautical-score.js` (original chase motif and ambient mix), and `src/marine.js` (Web Audio rendering and mixing). `src/main.js` supplies gameplay conditions and interface events. `src/captain-journal.js` triggers achievement feedback when its banner appears.

## Validation

The latest production build and 69 automated checks passed. Progression checks cover unique rewards, reload persistence, contract pickup/delivery, pause/expiry/loss/retry, storm return, repairs, race records, distance clamping, and cosmetic gating. Audio checks cover mood priority, bounded arrangements, rests, ambient ducking, hidden-page silence, distinct signals, mute and cooldown behavior, score ducking, and orchestral voice cleanup.

Browser checks covered desktop and 390-pixel layouts, contract acceptance and guide plotting, the complete achievement list, locked rewards, a real sailing achievement, and persistence after reload. The audio smoke test enabled Web Audio, entered sailing, and opened the journal. No browser console errors or warnings were captured during those checks. Full end-to-end completion of all achievements and all contracts, subjective headphone/speaker listening, and real-device performance are still manual follow-ups.

## Future directions

Fishing with species-specific bite patterns, wreck diving, procedural treasure clues, harbor upgrades, and longer voyages can expand the same loop. Multiplayer, global leaderboards, and cloud saves are outside the current release.

