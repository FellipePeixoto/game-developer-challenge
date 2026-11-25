# Pirate Battle architecture

Setup, commands and verification steps are in [README.md](README.md).

## Menu and session options

Vite serves and builds the app. React runs in Strict Mode with strict TypeScript. `App` owns screen transitions and captures the saved options when the player selects **Play**. `MainMenu` renders the entry points and restores focus when the player returns. `OptionsScreen` loads the saved options and persists edits. `PauseScreen` renders the pause actions and focuses **Resume**. `BattleArena` owns the Pixi mount, the arena controls, and focus restoration to **Pause** on resume.

The `src/captainLog/` modules separate navigation from presentation. `CaptainLog` owns tab selection, keyboard navigation, and pagination. `RankingTable` and `MatchHistoryTable` render the records for the requested page. `sampleRecords.ts` supplies sample records, and `CaptainLog.css` defines the panel and table styles.

`sessionOptions.ts` defines the defaults and validation rules shared by the form and the browser storage reader. **Game session time** accepts whole seconds from 60 to 180 and defaults to 120. **Enemy spawn time** accepts whole seconds from 1 to 60 and defaults to 8. The app saves both values together in local storage and uses the defaults if the saved data is invalid or storage is unavailable.

## UI assets

Resizable rectangular panels and buttons in the React UI use nine-slice rendering (9-patch) via CSS `border-image`. Each corner scales uniformly. Horizontal and vertical edges resize along their respective lengths, and the center fills the available space. Button variants and pressed states share the same slice geometry. Circular controls and their icons use `background-size: contain` to preserve their proportions.

## Landscape game frame on mobile

The game uses a shared 16:9 landscape frame for the arena, menus, and touch controls. This keeps their proportions consistent across desktop and mobile. The frame is centered and scales to fit the available viewport up to 1920 × 1080 CSS pixels. Text, spacing, and controls scale with the frame.

On a touch device with a portrait viewport, CSS uses the viewport height as the available width and rotates the entire frame by 90°. In a landscape viewport, the frame follows the browser's orientation. The rotation runs inside the page and does not require the browser to lock the device orientation.

The PixiJS canvas fills its arena host. `PixiArena.ts` uses the host's layout width and height when sizing the renderer and updating the simulation bounds. The CSS rotation affects the displayed frame while the simulation continues to use landscape coordinates.

## Arena and player collisions

Approved responsibilities: `PixiArena.ts` owns the Pixi application, island drawing, collider dimensions, animation and resource cleanup. `ShipController.ts` reads movement input and applies the position resolved by physics. `Physics.ts` owns collision geometry and contact resolution using PixiJS shapes. `CollisionDebugger.ts` draws the same collider geometry without participating in game rules.

The arena uses a rectangular boundary, a rotating rectangular ship collider and circular obstacles. The ship rectangle is centered on the sprite; its width and height have independent editable factors, initially 0.7 of the scaled texture dimensions. Physics stores its unrotated rectangle and heading separately. `Physics.move` computes the rotated extents and clamps each coordinate to the arena independently, preserving motion along walls. Circle contacts are evaluated in the rectangle's local coordinates: clamp the circle center to the box and use PixiJS `Circle.contains` on the closest point. Penetration is resolved along the contact normal, retaining tangential motion. When the circle center lies inside the box, correction uses the closest face. Obstacles remain fixed, without bounce or collision damage. Up to four passes resolve interacting contacts, with a tiny separation margin. Rotation is also resolved when the ship is stationary; if contacts remain incompatible, the previous valid position and heading are retained. The obstacle list currently contains the island.

Movement uses elapsed animation-frame time, capped at 50 ms per step, with forward speed of 180 scaled pixels per second and rotation of 2 radians per second. The texture faces down, so its rendered rotation includes a half turn to align the bow with the initial upward movement heading. At this speed the capped movement step is smaller than the colliders. Projectile collision and high-speed sweep checks belong to the combat delivery. This delivery has no random behavior and requires no seed.

On resize, the arena redraws the island, updates all collider dimensions and resets the ship to the center, matching the existing resize behavior. Input listeners, resize observation, animation frames and Pixi resources are released on exit. A pending development debugger import checks for destruction before attaching.

The debugger is dynamically imported and instantiated only inside `import.meta.env.DEV`. It draws the cyan ship rectangle from its four rotated corners, magenta circular obstacles and yellow arena bounds each frame and after resize. Its graphics and observation attributes are removed on disposal. Vite removes this development branch and debugger module from production builds. See [README.md](README.md) for development and production verification commands.
