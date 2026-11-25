# Pirate Battle architecture

## Local development

Use Node.js 22.13 or later in the Node.js 22 release line, or Node.js 24 and later. From the repository root, install dependencies and start the app.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. To serve a production build locally, run `npm run build` followed by `npm run preview`.

## Verification

```sh
npm run lint
npm run typecheck
npx playwright install chromium
npm run test:e2e
```

Playwright runs the suite in Chromium with desktop and emulated mobile profiles. The HTML report is in `playwright-report/`. Failed tests retain traces in `test-results/`.

## Menu and session options

Vite serves and builds the app. React runs in Strict Mode with strict TypeScript. `App` owns the current screen and reads the saved options each time the player opens Options or selects Play. The session setup screen displays the options captured when Play was selected.

`sessionOptions.ts` defines the defaults and validation rules shared by the form and the browser storage reader. **Game session time** accepts whole seconds from 60 to 180 and defaults to 120. **Enemy spawn time** accepts whole seconds from 1 to 60 and defaults to 8. The app saves both values together in local storage and uses the defaults if the saved data is invalid or storage is unavailable.
