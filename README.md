# Pirate Battle

A 2D top-down naval shooter built with React, TypeScript and PixiJS. Navigate between islands, fight enemy ships and score points until the match ends.

## Status

In development. Available now: main menu, Options (with validation and persistence), session setup screen, player movement with keyboard and touch controls, arena bounds and island collision. Combat, enemies, ranking, match history and deployment are still to come.

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

Requires Node.js 22.13 or later in the Node.js 22 line, or Node.js 24 and later. No environment variables are required at this stage.

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

## Controls

The main menu has a **Controls** section listing the commands. Movement and rotation work with the keyboard and with on-screen touch controls. Firing controls will be added with combat.

## Options

Both options are saved together in the browser's local storage. The values are captured when **Play** is selected, so later changes apply to new matches only. Invalid saved data or unavailable storage falls back to the defaults.

| Option | Accepted values | Default |
| --- | --- | --- |
| Game session time | Whole seconds, 60 to 180 | 120 |
| Enemy spawn time | Whole seconds, 1 to 60 | 8 |

## Arena collisions and development debugger

The ship's rectangular collider follows its rotation and stays within the arena. On contact, it slides along walls and circular obstacles wherever movement remains possible; a direct approach stops at the blocked surface. Obstacles stay fixed. Turning at contact can shift the ship to keep the rectangle clear; an incompatible rotation is blocked. Resizing the arena returns the ship to the center. Contact resolution lives in `src/arena/Physics.ts`.

Gameplay values currently live in `src/arena/ShipController.ts` (forward speed: 180 scaled pixels/second; rotation: 2 radians/second) and `src/arena/PixiArena.ts` (island center: 75% of arena width and 50% of height; radius: 48 scaled pixels). Edit `SHIP_COLLIDER_WIDTH_FACTOR` and `SHIP_COLLIDER_HEIGHT_FACTOR` in `PixiArena.ts` to tune the ship rectangle independently. Both start at `0.7`, making each collider dimension 70% of the corresponding scaled texture dimension; `1` uses the full dimension. The development debugger shows the resulting rotated rectangle.

With `npm run dev`, collider outlines appear automatically: cyan for the ship, magenta for the island and yellow for the arena. They follow movement and resizing. `npm run build` excludes the debugger; `npm run preview` serves the game without outlines.

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
