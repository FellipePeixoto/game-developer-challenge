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

`PixiArena.ts` owns the Pixi application, terrain drawing, collider dimensions, animation and resource cleanup. `ShipController.ts` reads movement input and applies the position resolved by physics. `Physics.ts` owns collision geometry and contact resolution using PixiJS shapes. `CollisionDebugger.ts` draws the collider geometry.

The arena uses a rectangular boundary, a rotating rectangular ship collider and axis-aligned rectangular obstacles. The ship rectangle is centered on the sprite, with independent width and height factors of 0.7 of the scaled texture dimensions. Physics stores its unrotated rectangle and heading separately. Movement clamps each coordinate to the arena using the rotated extents. Land contacts use the separating axis theorem on both rectangles. The shortest separating displacement resolves penetration while preserving tangential motion along the surface. Obstacles stay fixed without bounce or damage. Up to four passes resolve interacting contacts with a small separation margin. The previous valid position and heading are retained if resolution fails.

`ArenaMap.ts` defines a fixed terrain layout with ocean, shallows, sand and grass. `PixiArena.ts` loads the supplied textures before combat and renders the terrain as one cached texture scaled to the arena. Each land tile blocks its entire cell. The collision rectangles use the same position and scale as the tiles. Water tiles, including shallows, remain navigable.

Movement uses elapsed animation-frame time, capped at 50 ms per step. Forward and turning speeds come from `gameplayConfig.ts`. The texture faces down, so its rendered rotation includes a half turn to align the bow with the initial upward movement heading.

On resize, the arena rescales the terrain, updates all collider dimensions and resets the ship to the center, matching the existing resize behavior. Input listeners, resize observation, animation frames and Pixi resources are released on exit. A pending development debugger import checks for destruction before attaching.

The debugger is dynamically imported and instantiated only inside `import.meta.env.DEV`. It draws the cyan ship rectangle from its four rotated corners, magenta rectangular obstacles and yellow arena bounds each frame and after resize. Its graphics and observation attributes are removed on disposal. Vite removes this development branch and debugger module from production builds. See [README.md](README.md) for development and production verification commands.

## Player weapons

`ArenaInput.ts` tracks held commands and captures fire taps that finish between animation frames. `PlayerWeapons.ts` uses simulation time for the three independent cooldowns and owns projectile positions, direction, and lifetime. `gameplayConfig.ts` defines the combat parameters in seconds and at the reference arena size. The bow fires along the ship heading. Each broadside fires along the corresponding perpendicular direction from three points spaced along the hull.

`Physics.ts` checks each projectile's movement segment against land rectangles expanded by the projectile radius, including rounded corner contacts. A projectile is removed on obstacle contact, when its center leaves the arena, or when its lifetime expires. `PixiArena.ts` advances weapons inside the active simulation step and draws the remaining projectiles. On resize, their positions scale with the arena. Pause suspends their movement and cooldowns and clears held and pending input.

## Simulation seed and enemy spawning

Each arena instance owns an independent 32-bit pseudorandom sequence. `SimulationRandom.ts` initializes the sequence from browser-generated entropy or, in development, from the `seed` URL parameter. The sequence starts fresh with each new arena.

`EnemyFleet.ts` owns the active enemy instances and the spawn clock. React captures the saved interval at match start and passes it to `PixiArena.ts`, which advances the clock only during active simulation steps. At each interval, the fleet uses the simulation random sequence and the configured Chaser probability to choose an enemy type. The default distribution gives each type equal probability.

The fleet checks the entire starting ship rectangle against land and arena bounds and enforces the configured minimum center-to-center distance from the player. If random sampling finds no safe position, it checks the four outermost valid centers. The fleet skips that spawn if all checks fail and tries again at the next interval. `PixiArena.ts` owns the sprites and disposes of them as enemies leave the fleet. The development-only `enemy` URL parameter selects an isolated Chaser or Shooter.

## Chaser pursuit and impact

`Chaser.ts` owns pursuit, the collider and the transition from impact through explosion to removal. During each active simulation step, `PixiArena.ts` updates the player before advancing the Chaser. The Chaser turns toward the player's current position and attempts to move along that heading. `Physics.ts` checks that the rotated collider fits inside the arena and clears every land tile before accepting the move. The Chaser holds its position when the direct path is blocked. Ship-to-ship contact uses the same separating axis test with both colliders rotated.

An overlap with the player triggers impact once and disables the Chaser's movement and collisions. `PixiArena.ts` subtracts the configured damage and leaves the score unchanged. It replaces the ship sprite with an explosion sprite that fades over the configured duration, then hides the effect. Pause holds the explosion at its current opacity. Resizing scales the Chaser's position and hull with the arena and preserves its lifecycle state. The default values in `gameplayConfig.ts` are 100 reference pixels per second, 1 point of impact damage, and a 0.4-second explosion. The player's maximum health is 3.

## Shooter responsibilities

`Shooter.ts` owns the hull, approach, rotation, attack range, and firing cooldown. `EnemyProjectiles.ts` owns enemy projectile trajectories, lifetime, and removal, and returns damage from each simulation step. This separation keeps movement and weapon changes isolated. `Physics.ts` owns collision detection. `PixiArena.ts` advances these modules, applies damage, and renders the ship and projectiles. `gameplayConfig.ts` holds the Shooter parameters. The development scenario selects the Shooter through the `enemy=shooter` URL parameter.

## Enemy health and player kills

`EnemyFleet.ts` owns each enemy's remaining health and removes a ship when a player projectile reduces it to zero. `Physics.ts` calculates projectile contact with rotated enemy hulls using the same geometry as player ship contact. `PlayerWeapons.ts` removes a projectile after its first contact; land and arena blocking take precedence within a simulation step. Chasers in the impact explosion phase cannot take projectile damage. A Chaser destroyed by impact awards no point.

`PixiArena.ts` awards one point for each enemy removed by a player projectile, disposes of its sprite, and draws a health bar above each active enemy. `gameplayConfig.ts` defines maximum health for each enemy type and player projectile damage. Both enemy types have 2 health and player projectiles deal 1 damage by default. Development state attributes expose enemy health and score for deterministic E2E checks.

## Match end and restart

`MatchSession.ts` owns remaining active play time, player health, score, and the terminal reason. `PixiArena.ts` advances that state during active animation steps. Time expiry stops the step before movement or combat; lethal damage stops it before player attacks or further scoring. Ending clears input and prevents subsequent simulation updates. Pause does not advance the match clock.

`BattleArena` passes the saved duration to Pixi and reports the terminal reason to `App`. `App` displays the end overlay and remounts `BattleArena` for a restart, giving the new match fresh Pixi resources, simulation state, and input. Development state attributes expose remaining time and player health for E2E checks.
