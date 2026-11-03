# Oakvale Kingdom

A single-player medieval strategy game combining village building, resource management, farming, army development and real-time defense. Grow a small settlement into a kingdom, manage its residents and defend what you build against increasingly powerful raids.

**Your goal is to keep the main castle standing, develop your kingdom and conquer the Black Fortress.** Upgrade the castle through its 5 levels, expand your territory, train an army and defeat the three enemy camps.

## How to play

1. Start with a settlement, resources, 12 residents and a small defending army.
2. Build Houses for population capacity and connect new buildings to an operational road along at least one edge.
3. Plant wheat through Farms and trees through Lumberyards. Harvest mature plots for food and wood; level 3 buildings automate harvesting and regrowth.
4. Keep your production buildings staffed, mine stone in Quarries and use Markets to sell selected resources for gold.
5. Upgrade the main castle to unlock higher building levels and territory expansions. The castle has 5 levels; other upgradeable buildings have 3.
6. Train swordsmen, archers and guards in Barracks. Build Walls and Watchtowers, repair damaged buildings and prepare for the next raid.
7. Send troops on expeditions to defeat the Raider Camp, Iron Pass and Black Fortress. Keep enough defenders at home while your expedition is away.

Raids normally begin after 60 seconds of preparation, or immediately through **Start now**. Raiders approach from a randomly chosen side of your territory. If they destroy the main castle, the game ends. Expeditions use a 20-second army-strength simulation and unlock the next camp after victory.

The game interface is in English. It runs locally in your browser without an account or a game server. The simulation does not advance while the game is closed, and background tabs may slow its timers.

## Download and run on Mac or Windows

The commands below download the repository, install its dependencies and start the game in your browser. Each operating system has one complete copyable command block. Run only the block for your operating system in a new folder where `game_kingdom` does not already exist.

Install [Git](https://git-scm.com/downloads) and [Node.js](https://nodejs.org/en/download) first. Use Node.js 22.12 or newer; npm is included with Node.js. Restart your terminal after installing them.

Internet access is needed to download the repository and dependencies. The game runs using JavaScript and browser APIs, so a native compiler is not required.

### macOS

Open Terminal and paste the entire block:

```sh
git --version && node --version && npm --version &&
git clone https://github.com/denis-hristov/game_kingdom.git &&
cd game_kingdom/kingdom &&
npm ci &&
npm run dev
```

### Windows

Open PowerShell and paste the entire block. `npm.cmd` works with the usual PowerShell script restrictions, so no execution-policy change is needed.

```powershell
$ErrorActionPreference = 'Stop'
git --version
if ($LASTEXITCODE -ne 0) { throw 'Install Git, then restart PowerShell.' }
node --version
if ($LASTEXITCODE -ne 0) { throw 'Install Node.js 22.12 or newer, then restart PowerShell.' }
npm.cmd --version
if ($LASTEXITCODE -ne 0) { throw 'npm is required. Reinstall Node.js, then restart PowerShell.' }
git clone https://github.com/denis-hristov/game_kingdom.git
if ($LASTEXITCODE -ne 0) { throw 'Repository download failed.' }
Set-Location game_kingdom/kingdom
npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
npm.cmd run dev
```

When the server starts, open the address printed in the terminal, usually **[http://127.0.0.1:5173](http://127.0.0.1:5173)**. Keep the terminal open while playing; press Ctrl+C to stop it. If port 5173 is occupied, use the alternative address printed by Vite.

To play again later, open a terminal inside `game_kingdom/kingdom` and run `npm run dev` on Mac or `npm.cmd run dev` on Windows. All npm commands must run from the inner `kingdom` folder, which contains `package.json`.

You can also use GitHub's **Code > Download ZIP**, extract the archive and open a terminal inside its `kingdom` folder. Continue from the dependency installation step for your operating system.

### Desktop availability

| Platform | Available version | How to play |
| --- | --- | --- |
| macOS | Browser game | Follow the macOS block and open the local address in a modern browser. |
| Windows | Browser game | Follow the Windows block and open the local address in a modern browser. |

The current repository provides the browser version for both platforms. Native `.app` and `.exe` installers and automatic desktop packaging are not included. Local play uses the running development server; this project does not install a Service Worker or an offline browser cache.

## Technologies

| Technology | How the game uses it |
| --- | --- |
| React 19 and React DOM | Interface panels, building menus, resource displays, army management, dialogs and game state updates. |
| JavaScript and JSX | Simulation rules, economy, residents, planting, construction, upgrades, training, raids and expeditions. |
| HTML Canvas 2D | Renders the world, terrain, buildings, residents, troops, crops and combat effects. |
| SVG artwork | Separate illustrations for all 10 building types, shared by the map and menus. |
| Sprite caching and alpha hit testing | Rasterizes SVG artwork once at four times its game size, reuses cached images and selects buildings by their visible pixels. |
| CSS | Full-screen map layout, responsive panels, typography and interface feedback. |
| Vite 7, Node.js and npm | Development server, dependency installation and optimized static production builds. |
| Browser animation and input APIs | `requestAnimationFrame` drives rendering; pointer input supports panning, building placement, planting and harvesting. |
| Grid-based pathfinding | Breadth-first search finds routes around buildings and walls; connected-road traversal animates residents along the road network. |
| JSON and `localStorage` | Serialize and store the settlement, resources, army, crops, progress and activity log in the current browser. |
| Node.js built-in test runner | Automated checks for game rules, construction, staffing, planting, trading, combat, movement and save compatibility. |

### Terrain and world rendering

The world uses a **44 by 44 logical grid**. Terrain is calculated from tile coordinates: a sine curve defines the winding river, forest surrounds the outer map and grass provides buildable ground. Coordinate-based noise adds consistent visual variation to grass, decorations and trees.

New settlements share the same terrain and starting layout. The current generator does not use a player-selectable seed. Random raid directions are chosen separately during play.

The renderer caches the ground layer, draws buildings from cached sprites and interpolates movement between simulation ticks. Camera panning, zooming and high-density display scaling keep the world usable across different window sizes.

### Campaign and simulation

The campaign contains three enemy camps defined in `kingdom/src/engine.js`. The simulation advances once per second and manages resource production, worker allocation, population, crop growth, training queues, raids and expeditions. Main-castle upgrades unlock higher building levels and three territory expansions, each adding three tiles in every direction.

Progress is saved every 5 seconds, when leaving the page and through the **Save** button. Saves belong to the current browser and site address; changing browsers or ports creates a separate save location. Clearing browser site data can remove progress. Compatibility handling preserves older settlements and translates activity entries from earlier Bulgarian saves.

## Development

See [the game documentation](kingdom/README.md) for detailed controls, economy, construction, combat, movement and rendering notes.

Run the commands below from `game_kingdom/kingdom` after installing dependencies:

| Task | Command | Result |
| --- | --- | --- |
| Start development | `npm run dev` | Local browser game with Vite. |
| Run existing tests | `npm test` | Checks the simulation and interaction rules. |
| Build for production | `npm run build` | Generates static files in `kingdom/dist`, relative to the repository root. |

On Windows PowerShell, use `npm.cmd` in place of `npm`. Serve the production `dist` folder through a static web server or static hosting provider. Opening `index.html` directly from the filesystem is not the supported launch method.

| Folder or file | Contents |
| --- | --- |
| `kingdom/src/engine.js` | Simulation rules, resources, building definitions, units, raids, expeditions and save handling. |
| `kingdom/src/main.jsx` | React interface, simulation timer, autosave and game controls. |
| `kingdom/src/World.jsx` | Canvas rendering, camera and map interactions. |
| `kingdom/src/navigation.js` | Pathfinding, movement and road-network traversal. |
| `kingdom/src/planting.js` | Planting and harvesting interaction helpers. |
| `kingdom/src/art.js`, `kingdom/src/sprites.js` | Procedural artwork, SVG sprite loading, caching and pixel-based selection. |
| `kingdom/public/assets/buildings` | Building SVG artwork. |
| `kingdom/tests` | Automated tests. |
| `kingdom/README.md` | Detailed gameplay and technical documentation. |

## Assets and third-party licenses

Building artwork is bundled in `kingdom/public/assets/buildings`. The interface requests Manrope and Noto Serif from Google Fonts when a connection is available and uses system font fallbacks otherwise. React, React DOM, Vite and other dependencies retain their respective licenses.

The current prototype has local browser saves and simplified combat. Multiplayer, cloud synchronization and in-game purchases are outside its current scope.
