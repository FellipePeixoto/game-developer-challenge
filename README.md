# Pirate Battle

A 2D top-down naval shooter built with React, TypeScript and PixiJS. Navigate between islands, fight enemy ships and score points until the match ends.

## Status

The main menu opens the arena, Options, or the selected tab in Captain's Log. The arena supports pausing, keyboard and touch movement, arena bounds, and island collisions. Captain's Log displays sample ranking and match history records with five entries per page. Switching tabs returns to the first page.

## Development estimates

- AI-assisted development: 9 hours.
- Development without AI assistance: 6 days.

## Stack

| Responsibility | Technology |
| --- | --- |
| Interface and menus | React |
| Language | TypeScript (strict mode) |
| Game rendering | PixiJS |
| Remote state (ranking and history) | TanStack Query |
| HTTP client | Axios |
| API mocking | MSW |
| E2E and visual regression | Playwright |
| Build tool | Vite |

## Setup

The project supports Node.js versions from 22.13.0 through 26.13.1, inclusive. Run `node --version` to check the active version. No environment variables are required at this stage.

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

## Gameplay configuration

Adjust player movement and turning speeds, weapon cooldowns, and projectile settings in [gameplayConfig.ts](src/arena/gameplayConfig.ts). Movement speed is expressed in pixels per second at the reference arena size. Turning speed is expressed in radians per second.

The default reload time is 0.35 seconds for the bow and 0.6 seconds for each side. Projectiles last up to 1 second and disappear on island contact or when they leave the arena.

Movement and collision tests calculate control durations from the configured ship speeds. The combat tests use the Vite development server and load a fixed combat configuration so that island contact, arena exit, and expiry can each be tested with real controls.

The Chaser starts at least 160 reference pixels from the player, measured center to center. Adjust the minimum in `gameplayConfig.ts`. To reproduce a spawn in development, open `/?seed=42` and select **Play**. The same seed and arena dimensions reproduce the same initial position. Supported seeds are integers from 0 to 4294967295.

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

## Not documented yet

These sections will be added in the delivery that introduces them: further gameplay configuration, network scenario selection and reset, steps to reproduce network failures, and deployment URL.

## More

Architecture decisions are in [ARCHITECTURE.md](ARCHITECTURE.md).
