# Oakvale Kingdom

Build a village. Grow a kingdom. Defend what you create.

Oakvale Kingdom is a single-player browser strategy game set in a medieval world. Start with a small settlement and turn it into a thriving kingdom by gathering resources, housing residents, assigning workers, training soldiers, and defending your castle against increasingly powerful raids.

The game is a local prototype built with React, Vite, and HTML Canvas. No account or game server is required.

## Features

* Build and upgrade houses, farms, lumberyards, quarries, markets, barracks, walls, towers, and roads.
* Manage food, wood, stone, gold, population, and workers.
* Plant wheat and trees, harvest them manually, and unlock automatic harvesting at level 3.
* Sell resources for gold through automatic market trades.
* Train swordsmen, archers, and guards to defend your village.
* Send your army on expeditions to earn loot and unlock enemy camps.
* Upgrade the castle and expand your territory.
* Move, repair, and remove buildings.
* Save your progress automatically in your browser.

## Requirements

* [Node.js](https://nodejs.org/) 20.19+ on the 20.x release line, or 22.12+ on newer release lines, as required by Vite 7. Use a current LTS release.
* npm, included with Node.js.
* A modern browser.
* [Git](https://git-scm.com/downloads), if you want to clone the repository.

## Download

Clone the repository and enter the game directory:

```bash
git clone https://github.com/denis-hristov/game_kingdom.git
cd game_kingdom/kingdom
```

Alternatively, select **Code → Download ZIP** on GitHub, extract the archive, and open a terminal in the extracted `kingdom` folder.

## Install and run

Install the dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the address printed in the terminal, usually [http://127.0.0.1:5173](http://127.0.0.1:5173). Keep the terminal running while you play. Press `Ctrl + C` to stop the server.

All npm commands in this README should be run from the `kingdom` directory.

## How to play

* Drag the map with a mouse or finger to move around.
* Zoom with the mouse wheel or the on-screen zoom buttons.
* Click **Build**, choose a building, and select an empty tile.
* Buildings need an operational road directly beside at least one edge. A diagonal road does not count.
* Click a building to upgrade, move, repair, or remove it.
* Select a farm or lumberyard to plant wheat or trees. Click or drag across mature crops to harvest them.
* Open **Village** to manage your settlement and **Army** to train soldiers or launch expeditions.
* Press `Escape` to cancel the active mode and `Space` to pause or resume.

Raids arrive every 60 seconds, or immediately when you click **Start now**. Protect the main castle: if it falls, the game ends.

## Saving your progress

The game saves every 5 seconds and when you leave the page. You can also click **Save**.

Progress is stored in `localStorage` for the current browser and site address. It does not sync across devices, browsers, or different ports. Clearing site data may delete your save. The game does not advance while closed, and background tabs may slow its timers.

Existing saves remain compatible with the English version, including translated chronicle entries.

## Production build

```bash
npm run build
```

The optimized static files are generated in `kingdom/dist` relative to the repository root. Serve this folder with a static web server or deploy it to a static hosting provider. Opening `index.html` directly from the filesystem is not the supported way to run the game.

## Tests

```bash
npm test
```

The test suite covers construction, road access, resource management, staffing, planting, harvesting, trading, training, territory expansion, raids, repairs, movement, and save compatibility.

## Technology

* React 19
* Vite 7
* JavaScript and CSS
* HTML Canvas for the game world
* SVG building artwork
* Node.js built-in test runner

## Project structure

```text
game_kingdom/
├── README.md
└── kingdom/
    ├── public/assets/buildings/   Building SVG assets
    ├── src/                       Interface and game logic
    ├── tests/                     Automated tests
    ├── README.md                  Detailed gameplay notes
    ├── index.html
    └── package.json
```

For detailed mechanics and rendering notes, see [the game documentation](kingdom/README.md).

## Prototype scope

There is no multiplayer, cloud saving, in-game purchases, or backend. Expeditions use a simplified combat simulation rather than a separate tactical battlefield. Mobile controls support dragging and zoom buttons; pinch-to-zoom is not implemented. Fonts load from Google Fonts when available, with system fallbacks.
