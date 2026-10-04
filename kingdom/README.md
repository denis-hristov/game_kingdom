# Oakvale Kingdom

A single-player medieval browser strategy game built with React and Canvas. Build a settlement, grow its economy, train an army, and defend your main castle.

For download instructions, requirements, and a quick introduction, see the [repository README](../README.md).

## Run locally

From this directory:

```bash
npm install
npm run dev
```

Open the address printed by Vite. Run `npm run build` to create the production files in `dist`, or `npm test` to check the game logic.

## Controls

The map fills the screen, with resources at the top. Click **Build** in the bottom right, choose a building, and click a free tile. Green highlights indicate valid placement. The menu closes after selection, and the selected building remains active for repeated construction. Press `Escape` or the cancel button to exit the mode.

Click the visible part of an existing building to open its upgrade, move, repair, or removal menu. Transparent parts of the artwork do not capture clicks. Drag with a mouse or finger to pan the map. Use the mouse wheel or zoom buttons to change the scale. Press `Space` to pause. **Village** and **Army** open settlement and military controls.

## Construction and territory

Every building, including castles, walls, and towers, needs at least one operational road directly beside an edge when built or moved. Diagonal contact is insufficient. Roads themselves do not require adjacent roads. This rule checks new placement; removing a road does not remove existing buildings.

New games start with non-overlapping buildings, walls, and towers, each with immediate road access. The starting roads form a connected network of 47 tiles. Layout updates do not relocate buildings in existing saves.

The main castle has 5 levels. Other upgradeable buildings have 3. Territory expansions require castle levels 3, 4, and 5 respectively. Each expansion adds 3 tiles in every direction. Water and dense forest cannot be built on.

## Economy and residents

Farms, lumberyards, and quarries require 5 workers at level 1, 8 at level 2, and 11 at level 3. Incomplete teams work at 50% speed. Destroyed buildings stop working and release their workers.

Civilian residents are assigned automatically in construction order, with each resident working in only one building. Training, casualties, immigration, and upgrades recalculate assignments. Soldiers do not work.

Houses add 6 resident slots per level. A new resident arrives every 18 seconds for 15 food if capacity is available. Each resident consumes 0.5 food per minute. Unassigned residents leave when food runs out.

Quarries produce 18 stone per minute per level with a full workforce.

### Wheat and trees

Farms and lumberyards do not produce food or wood passively. Each supports 5 planted plots at level 1, 8 at level 2, and 11 at level 3.

Select a building and click **Plant wheat** or **Plant tree**, then click or drag across empty tiles in your territory. Invalid and already planted tiles are skipped while dragging.

Growth takes 45 seconds with a full workforce, or 90 seconds when understaffed. Each wheat plot yields 5 food, and each tree yields 5 wood.

At levels 1 and 2, click or drag across mature crops to harvest them and free their plots. Start the drag on a planted tile. Unripe crops are skipped. At level 3, both buildings automatically harvest and start another growth cycle in the same plot.

**Remove planted plots** enables a mode that clears only the selected building’s crops by clicking or dragging. Clearing a plot yields no resources and stops its automatic regrowth.

Food and wood rates include the expected average yield from automatic harvesting, accounting for planted plots and staffing.

### Markets

A market requires 1 worker and does not generate gold passively. Select one resource to sell automatically every 20 staffed seconds.

| Market level | Food sold | Wood sold | Stone sold | Gold received |
| --- | --- | --- | --- | --- |
| 1 | 15 | 10 | 5 | 1 |
| 2 | 25 | 15 | 8 | 2 |
| 3 | 30 | 20 | 10 | 3 |

Each trade sells only the selected resource. Switching resources or stopping trading resets the timer. Without a worker, the timer pauses. If there is insufficient stock, the trade is skipped. The selected resource and remaining time are saved. Projected rates include active trades when staffing and stock allow them.

## Army and combat

Barracks train swordsmen, archers, and guards, one at a time. Higher barracks levels reduce training time.

### Raids

Each raid starts after 60 seconds of preparation, or immediately through **Start now** beside the timer. Raiders approach from a randomly chosen northern, eastern, southern, or western boundary of your territory. Expansions move their spawn points to the new boundary. If boundary tiles contain forest, water, or buildings, raiders spawn on the nearest free ground inward. The direction appears in the notification and raid banner.

The first victory grants 40 gold, 30 wood, 15 stone, and 20 food. Each following wave increases rewards by 2%, rounded to whole resources.

Walls, towers, and soldiers defend the settlement. Level 1 walls have 560 health and cost 6 stone. Repairs cost 1 wood for each started block of 20 missing health points. Towers attack within 7 tiles. Enemies target the nearest operational building, while defenders pursue enemies.

After each successful defense, a repair prompt offers to fix every damaged building for the displayed total wood cost. If wood is insufficient, no repairs occur; the prompt can be dismissed.

If raiders destroy the main castle, the game ends and stays frozen after reloading. **Start a new game** creates and saves a fresh settlement.

### Expeditions

Expeditions are 20-second combat simulations that compare army strength. Victory brings resources and unlocks the next camp. Stronger armies suffer fewer losses. Troops on an expedition cannot defend the village.

## Movement

Residents move smoothly along connected roads and stop when paused. During raids, soldiers and attackers can cross unpaved ground while routing around buildings and walls. Movement is interpolated between game ticks.

## Saves and compatibility

Progress is saved every 5 seconds and when leaving the page, using `localStorage` in the current browser. This is not an account or cloud save. The game does not simulate time while closed, and browsers may throttle inactive tabs.

Existing saves retain their settlement and progress. Older wall health is migrated once, and older markets receive inactive trade fields. Chronicle entries from the Bulgarian version are translated when loaded.

## SVG artwork and rendering

All 10 building types, including roads, have standalone SVG assets in `public/assets/buildings/`. Artwork can be edited independently of the game logic.

`src/sprites.js` loads each asset once, rasterizes it into a cache at four times its game size, and uses `drawImage` to render frames. Menus use the same SVG files. The cached alpha channel supports precise building selection. Canvas artwork provides a fallback if an asset fails to load.

Caching avoids redrawing individual vector details every frame; SVG alone does not guarantee fast rendering.

## Prototype limitations

There is no multiplayer, backend, in-game purchasing, or external game service. Expeditions do not have a separate tactical battlefield. Combat movement and pathfinding are simplified. The map uses a square logical grid that is visually compressed vertically. Touch controls support dragging and zoom buttons, without pinch gestures. Google Fonts load when a connection is available, with system font fallbacks.
