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

The map fills the screen, with resources at the top. Click **Build** in the bottom right, choose a building, and click a free tile. Green highlights indicate valid placement. The menu closes after selection, and the selected building remains active for repeated construction. Click the cancel button to exit the mode.

Click the visible part of an existing building to open its upgrade, move, repair, or removal menu. Transparent parts of the artwork do not capture clicks. Drag with a mouse or finger to pan the map. The map starts at 100% zoom. Use the mouse wheel or zoom buttons to change it in 10% steps from 40% to 180%, or click the percentage to reset to 100%. Resizing preserves the current zoom. Use the **Move** and **Remove** buttons in the selected building's menu. Removal opens a confirmation. The game runs continuously without a pause control. **Village** and **Army** open settlement and military controls.

## Construction and territory

Every building, including castles, walls, and towers, needs at least one operational road directly beside an edge when built or moved. A wall can also share a dry tile with a road; the road beneath provides access and the wall becomes a gate. Diagonal contact is insufficient. Roads themselves do not require adjacent roads. This rule checks new placement; removing a road does not remove existing buildings.

New games start with non-overlapping buildings, walls, and towers, each with immediate road access. The starting roads form a connected network of 47 tiles. Layout updates do not relocate buildings in existing saves.

The main castle has 5 levels. Other upgradeable buildings have 3. Territory expansions require castle levels 3, 4, and 5 respectively. Each expansion adds 3 tiles in every direction. Buildings require dry ground; roads can cross water as bridges. Dense forest cannot be built on.

## Economy and residents

Farms, lumberyards, and quarries require 5 workers at level 1, 8 at level 2, and 11 at level 3. Nonempty incomplete teams work at 50% speed. An empty team produces nothing and does not grow crops. Destroyed buildings stop working and release their workers.

Assign or release one civilian at a time using the + and − controls in a building menu. Each resident can work in only one building. New buildings start empty, and new residents remain available until assigned. Upgrades keep the current team. Training requires a free resident; release an assigned worker first if necessary. Soldiers and recruits do not work. Existing saves preserve their former automatic teams on their first load, then keep manual assignments.

Houses add 6 resident slots per level. A new resident arrives every 18 seconds for 15 food if capacity is available. Each resident consumes 0.5 food per minute. Unassigned residents leave when food runs out. Removing or losing a house makes excess civilians leave and releases their assignments. Demolition is blocked if the remaining housing cannot accommodate soldiers and recruits. Loading an older overcrowded save reconciles its population with housing while retaining soldiers.

Incomplete workshops and houses show a gray occupancy bubble above their roof, such as `3/8`. Workshop bubbles count assigned workers against required workers, including the market's single worker. House bubbles count residents against the house's six slots per level, filling the village's six base slots first and then houses in construction order. Housing counts include soldiers and recruits and use the full population rather than the limited street animations. Full or destroyed buildings show no bubble. Counts update immediately after assignments, population changes, repairs, and upgrades. Bubbles remain readable at every map zoom; floating upgrade-level numbers have been removed.

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

Barracks train swordsmen, archers, and guards, one at a time. Higher barracks levels reduce training time. Swordsmen deal 12 damage; archers and guards each deal 6 damage. Archers trade health for a five-tile range and retreat from nearby melee troops. Guards have more health and a larger shield. The army panel displays attack, health, and range separately from expedition strength.

### Raids

Each raid starts after 60 seconds of preparation, or immediately through **Start now** beside the timer. Raiders approach from a randomly chosen northern, eastern, southern, or western boundary of your territory. Expansions move their spawn points to the new boundary. If boundary tiles contain forest, water, or buildings, raiders spawn on the nearest free ground inward. The direction appears with an uppercase initial in the notification and raid banner. Raiders and defenders crossing open water ride in small canoes; on bridges they walk. Archer and tower arrows fly toward their targets and deal damage only on impact. Arrows already in flight can still hit after the shooter dies; arrows whose target has died are removed. A raid ends after the last attacker and remaining valid projectiles are resolved.

Every wave includes swordsmen, archers, and guards. Waves alternate between balanced parties, more archers, and more guards, while retaining the existing count of `3 + 2 × wave`. Enemy health scales with each troop's health relative to a swordsman. Enemy archers and guards deal exactly half the corresponding swordsman's damage against both troops and buildings at every wave. Guards advance more slowly; archers keep their distance. The first victory grants 40 gold, 30 wood, 15 stone, and 20 food. Each following wave increases rewards by 2%, rounded to whole resources.

Walls, towers, and soldiers defend the settlement. Level 1 walls have 560 health and cost 6 stone. Repairs cost 1 wood for each started block of 20 missing health points. Towers attack the closest enemy within 7 tiles and fire over structures. Defenders detect all living attackers across the map, including enemies behind walls or buildings. Allied archers shoot over friendly walls; buildings still block their arrows. Melee attacks require a clear line to their target. Raiders account for roads, boats, troop speed, and their own damage when planning a breach. They engage nearby defenders and destroy buildings within the approach corridor, including structures beside an open road and buildings near the castle that archers could otherwise shoot past. Similar nearby targets spread the attackers out, with a small preference for dangerous watchtowers. Once they choose a structure, they finish destroying it before continuing, resuming that target after fighting defenders. Walls blocking their route are breached; existing gaps remain useful rather than prompting attacks on unrelated wall segments. Roads and bridges remain travel surfaces. Defenders choose reachable targets using routes that favor quicker ground and can pass through intact friendly gates. If all attackers are unreachable, melee defenders move to the closest reachable position inside the wall, track the threat, and advance as soon as a gate or breach opens. Valid routes are reused until terrain or building obstacles change, the target moves out of reach of the route, or movement stalls; nearby buildings are scanned twice per second while approaching.

After each successful defense, a repair prompt offers to fix every damaged building for the displayed total wood cost. If wood is insufficient, no repairs occur; the prompt can be dismissed.

If raiders destroy the main castle, the game ends and stays frozen after reloading. **Start a new game** creates and saves a fresh settlement.

### Expeditions

Expeditions are 20-second combat simulations that compare army strength. Victory brings resources and unlocks the next camp. Stronger armies suffer fewer losses. Troops on an expedition cannot defend the village.

## Settings and raid notifications

The **Settings** button sits directly above **Build**. It contains map centering, sound effects, manual saving, the chronicle, help, and the autosave status. The map no longer has separate top-right controls, a bottom footer, or a single-player label.

During a raid, the direction and enemy count appear once at the bottom center of the map. The preparation timer remains at the top left between raids. Other map notices share the bottom-center notification area.

## Movement

Each visible resident belongs to an operational house and only walks on the road component reachable from that house. Separate neighborhoods work independently, including bridges. Disconnected paths have no wandering residents. During a raid, residents run back along the roads to their own door, remain indoors, and come out again after the raid. Losing road access keeps them indoors; losing their house reassigns them to available housing.

Soldiers spawn in separate formation slots, keep personal space, and face their movement or attack direction. They can stand beside or behind one another without occupying the same position. Roads and bridges are 25% faster than open ground. Boats on open water move at 50% of normal walking speed. Destroyed buildings and walls leave passable ruins; repairing them restores the obstacle.

Movement and projectile impacts run in steps of at most 50 milliseconds and are interpolated for display. Economy, farming, training, and raid countdowns still advance once per simulated second. Saving preserves residents, combat positions, and arrows in flight; older saves migrate automatically.

## Saves and compatibility

Progress is saved every 5 seconds and when leaving the page, using `localStorage` in the current browser. This is not an account or cloud save. The game does not simulate time while closed, and browsers may throttle inactive tabs.

Existing saves retain their settlement and progress. Older wall health is migrated once, and older markets receive inactive trade fields. Chronicle entries from the Bulgarian version are translated when loaded.

## Sound and wall rendering

Successful construction, road placement, upgrades, movement, removal, planting, and harvesting play lightweight Web Audio effects. Use **Sound on / off** to mute them; the preference is saved in this browser. Audio starts after the first interaction and does not require downloaded sound files.

Walls automatically follow neighboring segments. North/south neighbors use vertical artwork; east/west neighbors use horizontal artwork, with both at junctions. Each segment uses artwork for its own level in both directions. Upgrades change the artwork without adding floating numbers or flags. A wall over a road uses the new gate artwork in the road direction at all three wall levels. At junctions, the road with more connections determines the direction; ties follow the neighboring wall line. Gates keep wall health and block attackers while allowing allied troops to pass. Residents retain the road underneath. Build or move either layer independently; removing the wall uncovers the road, and removing the road restores the regular wall artwork. Gates cannot be placed on water.

## Water and bridges

Open **Build → Terrain** and choose **Water tile**. Click or drag across tiles to paint water for free. **Restore grass** fills player-placed water again. Terrain tools work inside your territory, cannot replace buildings or planted crops, and leave the natural river and forest intact. They can reshape the terrain beneath roads.

Place a normal **Road** on water to create a wooden bridge at the normal road price. Bridges use all 16 uploaded SVG variants: isolated, four ends, two straights, four corners, four T junctions, and a crossing. They connect to cardinally adjacent roads and other bridge tiles. Their direction, corners, and junctions update immediately as you build, move, or remove neighboring roads. Roads over the natural river also become bridges once the territory is expanded far enough.

Bridges use the road network, so residents and soldiers can cross them. Units on a bridge walk rather than use a canoe. Removing or moving a bridge leaves the water behind; restoring grass beneath a bridge turns it back into a road. Water tiles and bridge roads are saved with your village. Older saves start with no player-placed water.

## SVG artwork and rendering

The 55 rendered SVG assets in `public/assets/buildings/` include the original 33 level-specific building assets plus 6 gate levels and 16 bridge variants from `Oakvale_Bridges_Gates_SVG_Transparent/`. The castle has five visual levels, other buildings and both wall directions have three, and roads have one. Each SVG embeds the original transparent PNG; the road texture is opaque. Artwork can be edited independently of the game logic.

`src/sprites.js` loads each type and level once, rasterizes it into a cache at four times its game size, and uses `drawImage` to render frames. Per-level ground anchors compensate for transparent padding so upgrades stay grounded. Bridge crops remove transparent padding and align connection edges with the 48 × 36 map tile. Bridge files keep their original names without a level suffix. The map, selected-building panel, castle card, and moving preview follow the current level; the build menu previews level 1. The cached alpha channel for the current level supports precise building selection. Canvas artwork provides a fallback if an asset fails to load. Existing saves use the new artwork automatically.

Caching avoids redrawing individual vector details every frame; SVG alone does not guarantee fast rendering.

## Prototype limitations

There is no multiplayer, backend, in-game purchasing, or external game service. Expeditions do not have a separate tactical battlefield. Combat movement and pathfinding are simplified. The map uses a square logical grid that is visually compressed vertically. Touch controls support dragging and zoom buttons, without pinch gestures. Google Fonts load when a connection is available, with system font fallbacks.
