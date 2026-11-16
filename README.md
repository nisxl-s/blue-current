<div align="center">

# ⛵ Blue Current

### A little boat. A sea of stories.

A browser sailing adventure with harbor contracts, wildlife, and a living ocean.<br>
Take the helm of **Sea Wren**, explore an archipelago, and chart your own passage.

![Three.js](https://img.shields.io/badge/Three.js-0.180.0-123e4b?style=flat-square&logo=threedotjs)
![Vite](https://img.shields.io/badge/Vite-7.3.7-123e4b?style=flat-square&logo=vite)
![JavaScript](https://img.shields.io/badge/JavaScript-ES_Modules-c3a35e?style=flat-square&logo=javascript&logoColor=123e4b)
![Vercel](https://img.shields.io/badge/Hosted_on-Vercel-123e4b?style=flat-square&logo=vercel)

**[Set sail ↗](https://blue-current-alpha.vercel.app)** · [Features](#a-world-worth-exploring) · [Controls](#take-the-helm) · [Local setup](#run-locally)

*Fair winds, captain.*

</div>

---

## Beyond the shoreline

Blue Current is an open-water adventure. Sail between five ports, take timed cargo contracts, explore the wildlife grounds, and brave unpredictable pirate encounters. Earn renown through 18 naval commendations, rise from Deckhand to Admiral, and unlock new pennant colors for Sea Wren.

The world is built procedurally with Three.js: shaped coastlines, weathered rocks, detailed buildings, swaying palms, wildlife, and a sailing cruiser. Custom water shaders and shared wave sampling connect the ocean's appearance to the motion of boats and floating objects.

## Your captain's commission

Press **J** or open **Captain’s journal** to view the voyage board, 18 achievements, and signal locker. Three harbor contracts have distinct pickup and delivery ports, departure-triggered timers, cargo-loss rules, and one-time renown rewards. Slow below 2 knots within harbor range to load or deliver. A plotted contract leg recruits nearby dolphin guides.

Achievements track actual movement, port arrivals, unique salvage and surveys, regatta times, completed dolphin passages, repairs, storm returns, pirate victories, and deliveries. Rewards unlock at 150, 400, and 800 renown. Your chosen pennant appears on the mast.

Progress is stored in this browser using localStorage. Relaunch preserves earned achievements and best race times but forfeits active cargo. Reloading also clears active contracts; earned progress remains. No account, cloud save, or leaderboard is required.

## A world worth exploring

| | What awaits |
| :--- | :--- |
| 🌊 **A living ocean** | Changing swell directions, whitecaps, shoreline surf, impact ripples, underwater distortion, and translucent surface detail. |
| ⛵ **Sea Wren** | A detailed coastal cruiser with teak decking, cabin, rigging, curved sails, railings, fenders, and an auxiliary motor. Wave samples drive bow, stern, and side-to-side motion around a low center of gravity. |
| 🌅 **Weather with character** | Gradual morning, afternoon, sunset, and night transitions. Sunrise haze, visible wind, moving foliage and sails, occasional nighttime rain, lightning, and rougher seas. |
| 🐬 **Wildlife companions** | Dolphins swim and breach with body flex, wakes, and splashes. Existing nearby pods guide your plotted course and return to circle your boat if you fall behind. |
| 🧭 **Your own passage** | A local minimap expands into a chart with zoom, pan, location marks, and multi-stop routes that account for obstacles. |
| 🏴‍☠️ **Unpredictable encounters** | Random daytime pirate arrivals, pursuit, cannon fire, hull damage, and floating defensive bombs. Escape or defeat the raider to survive. |
| ⚓ **Life at sea** | Salvage sites, wildlife surveys, regatta gates, collectible buoys, and a home berth for mooring and repairs. Activities are spread across the archipelago. |
| 💥 **Visible consequences** | Damaged fittings detach, debris tumbles and floats, explosions leave smoke and spray, and a breached vessel floods before sinking. Relaunch restores your voyage. |
| 🌐 **The world's edge** | A curved waterfall surrounds the ocean rim. Outward currents grow stronger near the edge and can pull a slow-moving vessel into a fall. |
| 🎵 **An audible atmosphere** | Synthesized sea wash, engine starts and stops, wildlife calls, wind, rain, explosions, cannon effects, and pursuit music, with mute and master volume controls. |

## Ports of the archipelago

| Destination | Character |
| :--- | :--- |
| **The lighthouse** | A coastal landmark and the captain's introduction. |
| **Discovery docks** | A harbor for selected work and project briefs. |
| **The coral club** | A playful stop for discoveries and exploration. |
| **Hello harbor** | The archipelago's welcome port. |
| **The tide house** | Home port, with a cottage, garden, pier, and repair berth. |

## Take the helm

Click **Let's set sail** to begin. Sound is opt-in: click **Sound off** to enable it and reveal the volume slider.

| Control | Action |
| :--- | :--- |
| **WASD / arrow keys** | Accelerate, reverse, and steer |
| **Shift** | Boost the auxiliary motor |
| **B** | Drop a floating defensive bomb |
| **E** | Open a nearby destination |
| **G**, held | Work on a nearby salvage or survey activity |
| **F** | Moor at the tide house berth or cast off; approach below 2 knots |
| **M** | Open the navigation chart |
| **J** | Open the Captain’s Journal |
| **R** | Relaunch and return to the starting point |
| **Mouse drag** | Orbit the scene |
| **Shift + drag / right drag** | Pan the scene |
| **Mouse wheel / + / −** | Zoom within the camera limits |
| **Minimap click** | Expand the chart to plan a passage |
| **Boat logo** | Return to the opening view |

Touch controls provide steering, acceleration, reverse, and boost. On-screen prompts provide activity and mooring actions.

> **Follow the wake.** Plot a destination and a nearby dolphin pod will swim over to guide you. They cruise slightly faster than the boat, including during boost. If you lose contact, they turn back and circle nearby until you start moving again.

## Run locally

Use **Node.js 22.12+** and npm. From this project directory:

```sh
npm ci
npm run dev
```

Vite prints the local preview address. To use the project's usual preview port:

```sh
npm run dev -- --port 5175 --strictPort
```

### Build and preview

```sh
npm run build
npm run preview
```

The production build is written to `dist/`. Serve it over HTTP rather than opening the HTML directly from the filesystem.

### Automated checks

```sh
node --test src/*.test.js
```

The suite covers waves, island protection, hull motion and sinking, dolphin navigation and guidance, pirate encounters, audio volume, route planning, waterfall curvature, effect cleanup, and renderer state restoration. Browser appearance, listening quality, and performance on individual devices still require hands-on checks.

## Under the surface

**Three.js · JavaScript ES modules · GLSL · Web Audio API · HTML/CSS · Vite · Vercel**

```text
blue-current/
├── index.html                  Application shell and interface
├── src/
│   ├── main.js                 Scene setup, controls, and game loop
│   ├── captain-progress.js     Achievements, contracts, ranks, and saves
│   ├── captain-journal.js      Voyage board, commendations, and rewards
│   ├── game.css                Game HUD and journal layout
│   ├── marine.js               Shared waves, buoyancy helpers, and audio
│   ├── ocean-shaders.js        Ocean and wet-surface shaders
│   ├── water-view.js           Underwater capture and fog helpers
│   ├── weather-world.js        Lighting, weather, rain, and sail motion
│   ├── clouds.js              Camera-centered cloud sky dome
│   ├── details.js             Boat geometry and marine life
│   ├── scenery.js             Island and architectural details
│   ├── dolphin*.js            Dolphin anatomy, navigation, guides, and wakes
│   ├── naval-map.js            Minimap and expanded chart
│   ├── sea-route.js            Obstacle-aware route planning
│   ├── voyage-physics.js       Hull motion and edge currents
│   ├── voyage-activities.js    Salvage, surveys, and regatta activities
│   ├── ocean-edge.js          Curved waterfall and rim effects
│   ├── pirates.js             Pursuit and encounter integration
│   ├── vessel-damage.js       Detached fittings and sinking progression
│   ├── explosions.js          Pooled blast effects
│   ├── scene-batching.js      Static geometry batching
│   ├── port-briefs.js          Destination content
│   ├── style.css              Naval interface and responsive layout
│   └── *.test.js              Focused automated checks
├── package.json
└── README.md
```

### Visual detail with bounded work

Static scenery is batched where suitable. Repeated water, spray, and explosion effects use bounded pools and instanced geometry. Underwater rendering uses a reduced-resolution capture. Temporary effects expire and are reused instead of accumulating indefinitely.

The ocean, currents, hull response, and sinking are procedural approximations designed for interactive play. They do not solve full fluid dynamics or naval structural physics. Audio effects and music are synthesized rather than recorded samples.

## Make it your own

| File | Customize |
| :--- | :--- |
| `src/port-briefs.js` | Harbor descriptions and expedition content |
| `src/captain-progress.js` | Achievements, delivery contracts, ranks, and rewards |
| `src/main.js` | Port names, labels, positions, and scene integration |
| `src/climate.js` | The daily weather cycle |
| `src/voyage-activities.js` | Activity locations and interaction rules |
| `src/style.css` | The naval interface and responsive layouts |

When moving ports, update the associated island geometry and collision layout as well as their destination coordinates.

## Hosting

**Production:** [blue-current-alpha.vercel.app](https://blue-current-alpha.vercel.app)

The Vercel project is **`blue-current`** in the **SANJAYA** account. It serves the compiled static build. Source edits require rebuilding and redeploying; automatic Git-based releases are not configured. Vercel sign-in protection remains enabled.

## Inspiration and credits

The exploration-led portfolio concept was inspired by [Bruno Simon's portfolio](https://bruno-simon.com/) and its [published source](https://github.com/brunosimon/folio-2025). Blue Current's scene geometry, naval interface, and gameplay are built for this project; reference branding and assets are not included.

Built with [Three.js](https://threejs.org/) and [Vite](https://vite.dev/). Typography uses **DM Sans** and **Manrope** through Google Fonts, with local sans-serif fallbacks.

---

<div align="center">

**Less scrolling. More exploring.**<br>
⚓ Blue Current · Sea Wren · The Archipelago

</div>

### Sound direction
The original chase cue, Beyond the Shoals, uses a 6/8 pulse, warm triangle string-like voices, low bass, and deliberate rests. Softer sea, engine, spray, rain, and wind layers leave more headroom; ambience ducks during pursuit. Repeated effects are rate-limited, dolphin calls are less frequent, and cannon attacks are less sharp. All audio remains synthesized, with no film recordings or soundtrack quotations.

