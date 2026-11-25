# Pirate Battle architecture

Setup, commands and verification steps are in [README.md](README.md).

## Menu and session options

Vite serves and builds the app. React runs in Strict Mode with strict TypeScript. `App` owns the current screen and reads the saved options each time the player opens Options or selects Play. The session setup screen displays the options captured when Play was selected.

`sessionOptions.ts` defines the defaults and validation rules shared by the form and the browser storage reader. **Game session time** accepts whole seconds from 60 to 180 and defaults to 120. **Enemy spawn time** accepts whole seconds from 1 to 60 and defaults to 8. The app saves both values together in local storage and uses the defaults if the saved data is invalid or storage is unavailable.