# Pirate Battle

A 2D top-down naval shooter built with React, TypeScript and PixiJS. Navigate between islands, fight enemy ships and score points until the match ends.

## Status

The playable match includes player combat, two enemy types, scoring, manual pause, match end, restart, and a semantic HUD. Captain's Log displays sample ranking and match history records; it is not connected to an API.

| Area | Implemented | Remaining scope |
| --- | --- | --- |
| Gameplay, rules, collisions, and enemy behavior | Arena and island collisions; keyboard and touch movement; front and side weapons; Chaser and Shooter behavior; timed spawning, damage, scoring, match end, and restart. | No planned gameplay rule remains in the completed stages. |
| PixiJS, architecture, and resource lifecycle | PixiJS arena with separate simulation, input, collision, enemy, and weapon modules; asset loading and teardown. | Final architecture and resource lifecycle review. |
| Interface, feedback, responsiveness, and accessibility | Menu, persistent options, manual pause, touch buttons, player and enemy health indicators, semantic HUD, and a layout that adapts to viewport orientation. | Automatic pause, combat effects and sound, ship deterioration, complete mobile review, and accessibility pass. |
| TanStack Query, Axios, and ranking and history consistency | Captain's Log has sample ranking and history tables with pagination. | HTTP integration, remote state, match registration, cache consistency, and recovery of pending records. |
| MSW and failure scenarios | None. | API mocks, reproducible network scenarios, scenario selection and reset, and failure recovery. |
| Playwright tests | E2E coverage for implemented menu, options, arena, combat, enemy, match-end, and HUD behavior. | Remaining scenarios, visual regression baselines, and final desktop and mobile coverage. |
| Performance and documentation | Setup, controls, configuration, and implemented behavior are documented here; architecture decisions are in [ARCHITECTURE.md](ARCHITECTURE.md). | Performance profiling, final documentation and test reports, and public deployment. |

## Development estimates

- AI-assisted development: 9 hours.
- Development without AI assistance: 6 days.

## Stack

| Responsibility | Technology |
| --- | --- |
| Interface and menus | React |
| Language | TypeScript (strict mode) |
| Game rendering | PixiJS |
| E2E tests | Playwright |
| Build tool | Vite |

## Setup

The project supports Node.js versions from 22.13.0 through 26.13.1, inclusive. Run `node --version` to check the active version. No environment variables are required.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run preview` | Serve the production build locally (run `npm run build` first) |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run the TypeScript checks |
| `npx playwright install chromium` | Install the browser used by the E2E tests (once) |
| `npm run test:e2e` | Run the Playwright suite |

Playwright runs in Chromium with desktop and emulated mobile profiles. The HTML report is written to `playwright-report/` and traces of failed tests to `test-results/`.

## Display

The game frame stays centered at a 16:9 aspect ratio and scales to fit the browser viewport up to 1920 × 1080 CSS pixels. The PixiJS canvas fills the arena and renders at the device pixel ratio. Arena dimensions and input coordinates use CSS pixels.

On touch devices in portrait, the entire game frame rotates 90° to use the long side of the viewport as its width. In landscape, the game frame follows the viewport orientation.

The desktop interface scales with the 16:9 frame. On touch devices, menus use wider panels and larger text. Menu and arena buttons have touch targets of at least 48 × 48 CSS pixels. Ranking and Match History each show up to five records per page, with previous and next buttons to browse the full lists.

## Controls

The main menu lists the keyboard controls. Press **W** to move forward, **A** to turn left, and **D** to turn right. Press **Space** to fire one shot from the bow, **Q** to fire three shots to port, or **E** to fire three shots to starboard. Hold a fire control to repeat as the weapon reloads. Movement and fire controls can be used together on the keyboard or on screen.

Select **Pause** to suspend movement, projectiles, and reload timers. Select **Resume** to continue the current session or **Main Menu** to end it.

The saved session time counts down only during active play. The match ends when it reaches zero or player health reaches zero; movement, attacks, damage, spawning, and scoring stop. Select **Restart** on the end screen to start with fresh time, health, score, and entities, or **Main Menu** to leave the match.

The player health bar appears above the ship. The HUD shows score, remaining time, health, and whether the match is playing, paused, or finished. Time is displayed in minutes and seconds and stays fixed while paused.

## Gameplay configuration

Adjust player movement and turning speeds, weapon cooldowns, and projectile settings in [gameplayConfig.ts](src/arena/gameplayConfig.ts). Movement speed is expressed in pixels per second at the reference arena size. Turning speed is expressed in radians per second.

The default reload time is 0.35 seconds for the bow and 0.6 seconds for each side. Projectiles deal 1 damage, last up to 1 second, and disappear on enemy or island contact or when they leave the arena.

Movement and collision tests calculate control durations from the configured ship speeds. The combat tests use the Vite development server and load a fixed combat configuration so that island contact, arena exit, and expiry can each be tested with real controls.

In a standard match, the first enemy spawns after the saved **Enemy spawn time**, then the cycle repeats at that interval. Pause suspends the cycle. Each spawn has a 50% chance of being a Chaser and a 50% chance of being a Shooter. Adjust the distribution with `enemySpawn.chaserChance` in `gameplayConfig.ts`. Both types spawn in clear water at least 160 reference pixels from the player, measured center to center.

To reproduce a match in development, open `/?seed=6444` and select **Play**. Spawns are repeatable with the same seed, arena dimensions, settings, and player inputs. Supported seeds are integers from 0 to 4294967295.

The Chaser pursues the player at 100 reference pixels per second and stops when land blocks its path. The player starts with 3 health. A Chaser impact costs 1 health, leaves the score unchanged, and removes the Chaser after a 0.4-second explosion. Player shots reduce a Chaser's 2 health; destroying it awards 1 point. These values are set in `gameplayConfig.ts`.

In development, open `/?enemy=chaser&seed=42` or `/?enemy=shooter&seed=1487` and select **Play** to start with a single enemy. Remove the `enemy` parameter to play a standard match. The Shooter uses the enemy ship texture with an amber tint and fires red projectiles.

The Shooter approaches at 80 reference pixels per second, stops within a 260-pixel attack range, and fires every 1.5 seconds while in range. Land blocks its movement. Each projectile travels at 240 reference pixels per second, lasts up to 3 seconds, and deals 1 damage once before removal. Land and arena boundaries also remove enemy projectiles. Player shots reduce a Shooter's 2 health; destroying it awards 1 point. Health bars appear above both enemy types. All Shooter values are set in the `shooter` section of `gameplayConfig.ts`. Pause suspends movement, shots, and cooldowns.

Run the enemy spawning and player kill checks with `npx playwright test tests/enemy-spawning.spec.ts --project=desktop-chromium --reporter=line`.

Run the match end and restart checks with `npx playwright test tests/match-end.spec.ts --project=desktop-chromium --reporter=line`.

Run the HUD checks with `npx playwright test tests/hud.spec.ts --project=desktop-chromium --reporter=line`.

Run the Shooter checks with `npx playwright test tests/shooter.spec.ts --project=desktop-chromium --reporter=line`.

## Options

The **−** and **+** buttons change each option by one second. **Main Menu** saves both values to the browser's local storage. From the pause screen, **Back to Pause** saves the values and returns to the paused session. The values are captured when **Play** is selected, so later changes apply to new matches only. Invalid saved data or unavailable storage falls back to the defaults.

| Option | Accepted values | Default |
| --- | --- | --- |
| Game session time | Whole seconds, 60 to 180 | 120 |
| Enemy spawn time | Whole seconds, 1 to 60 | 8 |

## Arena collisions and development debugger

The ship's rectangular collider follows its rotation and stays within the arena. On contact, it slides along walls and the coastline wherever movement remains possible; a direct approach stops at the blocked surface. Obstacles stay fixed. Turning at contact can shift the ship to keep the rectangle clear; an incompatible rotation is blocked. Resizing the arena returns the ship to the center. Contact resolution lives in `src/arena/Physics.ts`.

The fixed terrain map has an upper-left island and a southern coastline separated by a navigable channel. Ocean and light-blue shallows are navigable. Sand and grass stop ships and projectiles. The arrangement is defined in `src/arena/ArenaMap.ts`. Edit `SHIP_COLLIDER_WIDTH_FACTOR` and `SHIP_COLLIDER_HEIGHT_FACTOR` in `PixiArena.ts` to tune the ship rectangle independently. Both start at `0.7`, making each collider dimension 70% of the corresponding scaled texture dimension. A value of `1` uses the full dimension. The development debugger shows the resulting rotated rectangle.

With `npm run dev`, collider outlines appear automatically: cyan for the ship, magenta for land and yellow for the arena. They follow movement and resizing. `npm run build` excludes the debugger; `npm run preview` serves the game without outlines.

Run the collision checks in development with `npx playwright test tests/collision.spec.ts --project=desktop-chromium --reporter=line`. To check the production build in PowerShell:

```powershell
npm run build
$env:PLAYWRIGHT_PRODUCTION = '1'
try {
  npx playwright test tests/collision.spec.ts --project=desktop-chromium --reporter=line
} finally {
  Remove-Item Env:PLAYWRIGHT_PRODUCTION
}
```

The production flag makes Playwright start Vite preview and check that the debugger is absent. Omit `--project=desktop-chromium` to include the mobile profile.

## More

Architecture decisions are in [ARCHITECTURE.md](ARCHITECTURE.md).
