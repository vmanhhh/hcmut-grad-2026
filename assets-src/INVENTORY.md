# Asset inventory

All paths relative to `assets-src/`. Tile coords are (col,row), 0-based, from the packed-with-spacing `Tilemap/tilemap.png`.
Individual tiles are also in `<pack>/Tiles/tile_NNNN.png` with NNNN = row*COLS + col (Tiny Town COLS=12, RPG Urban COLS=27, Roguelike Modern City COLS=37).
All three Kenney packs: 16x16 tiles, 1px spacing, 0 margin, CC0 (LICENSE.txt in each folder).
Ninja Adventure: DROPPED by the host (not used; the folder only holds its LICENSE.txt).

## tiny-town (Kenney, 12x11 tiles, sheet 203x186)  `tiny-town/Tilemap/tilemap.png`
Fantasy village, NOT modern. Useful only as filler.
- Grass (0-2,0), dirt path autotile (0-2,1-3), trees green/orange (3-5,0-2), bushes, mushrooms (5,2)
- Houses: roofs grey/red (0-7,4-5), walls brown/grey with door arch (2,6),(6,6), doors/windows (0-7,7)
- Stone castle wall/floor (0-3,8-10), wooden fences (8-11,3-6), sign (11,6), well/barrel/items (8-11,7-10)
- No characters. No road, lamps, benches, flags, fountain.

## rpg-urban-pack (Kenney, 27x18 tiles, sheet 458x305)  `rpg-urban-pack/Tilemap/tilemap.png`
Best fit for a city street + characters.
- Fountain/pools: teal water pools with fountain (0-7,0-2); blue water + fountain (8-15,6-8, blue); paved plazas: beige tile (0-7,3-5), grey stone (8-15,0-5)
- Pavement/roofs: grey plaza (8-15,0-2), red roof/brick (16-22,0-3), orange tile roof (16-22,4-7)
- Street lamps/poles/signs: (0-7,6-7) (double lamp (0,6), single (3,6),(4,6), bus-stop/traffic signs (5-7,6-7), green lamp (7,6))
- Rope/bunting-like clotheslines & barriers: (0-6,8-9) (strung line (1-3,8) / hanging items (0-5,9)), barricades (7-9,8-9)
- Benches: orange (9,8)/(9,9); wooden/park benches (8-9,14-ish area near (7-9,14)); trash cans/mailbox: (8-10,9-11)
- Stairs: (0-4,12-14) grey stairs
- Fences: green hedge (9-13,12), chain-link (9-12,13), wooden fence (9-13,14)
- Trees: teal (16-22,8-10), orange autumn (16-22,11-13); round/tall variants, no palms
- Roads: asphalt, crossings, parking, arrows (0-7,15-17)
- Doors/windows: doors (15-18,9-13 region), windows (15-18,12-17)
- Vehicles: taxi, buses, red/green (14-23,15-17 area)
- Characters: cols 23-26, rows 0-17, ~6 character types (green-shirt, red-shirt, blue-hair, hardhat, bald, dark-hair). Each tile 16x16; per row one pose, 4 cols appear to be 4 facing/walk poses (confirm by viewing Tiles). Walk animation is minimal (not full 4-dir x 3-frame).
- Building facades: only roofs/walls pieces; no full shop fronts.

## roguelike-modern-city (Kenney, 37x28 tiles, sheet 628x475)  `roguelike-modern-city/Tilemap/tilemap.png`
Largest set; modern building kit.
- Roof/floor autotiles: red (0-7,0-3), dark grey (8-15,0-3), light grey (16-23,0-3), beige (24-31,0-3)
- Building walls with windows: red brick (0-7,4-12), grey (8-ish,4-12), beige brick (8-15..,4-12); glass storefront/windows (12-23,5-12), green/orange awnings (23-29..,9-13 at x~23-30) -> shop awnings: green/white (23-26,9-12), orange/white (27-30,9-12)
- Park/plaza: grass lawn in stone border (32-34,0-2), water pond (31-35,4-6), fountain-like pond (32-35,4-6)
- Street furniture: lamps (0-6,16-18; also 12-15 around row 13-16), traffic lights (0-3,14-15), signs/poles (11-14,13-16), benches wood (24-27,15-16), park fence wooden (28-35,13-16), barricades/cones (24-26,5-8,18), trash/hydrants (15-22,13-15)
- Stairs: (23-27,4-5 cream stairs), (31-35,10 grey stairs)
- Roads: asphalt, lane lines, crosswalks, arrows (12-19,19-24), pavement tiles grey/beige/blue (0-11,19-23), grass/dirt autotiles (0-11,24-27)
- Trees: 6 types of conifer-like trees (35-36,10-13; two colour sets); no palm
- Doors: wooden/white/glass/double (24-35,13-27 region, e.g. (24-29,16-17) and (24-27,27))
- Vehicles: green/grey/orange cars (32-35,16-27)
- Vending/market stalls, shop signs: (30-36,4-9)
- No characters. No flags.

## MISSING (hand-draw or source elsewhere)
- Palm trees (only generic round/conifer trees)
- Flags / bunting (only clotheslines/rope)
- Full shop building facades with signage (only wall/awning/window/door pieces to assemble)
- Indoor: floors/walls exist as plain roof/floor autotiles only; NO curtains, stage, podium, chairs rows, indoor props
- Fully animated 4-dir walk frames (Kenney packs: static poses only, rpg-urban only)
- Anything from Ninja Adventure (characters 4-dir x animated, interior tilesets, props, fx, music) - pack not obtained

## ninja-adventure - NOT DOWNLOADED
itch.io page `pixel-boy.itch.io/ninja-adventure-asset-pack` loaded once in the browser pane (page lists "Ninja Adventure - Asset Pack.zip" 89 MB, CC0, name your own price), but every further navigation to pixel-boy.itch.io (the /purchase page) was denied by the browser tool permission. Folder contains only LICENSE.txt. Author's GitHub with Godot 4 project (CC0): github.com/pixel-boy/NinjaAdventure (not downloaded; outside the approved list).


## What the shipped journey actually uses (top-down rework)

- Hand-drawn by script: `tools/gen-town-art.py` -> `assets-src/generated/town/*.png` (ground, kerbs, floors, walls, trees, palms, bushes, flower beds, lamps, bunting, benches, umbrellas, fountain, shops, houses, main hall, HCMUT gate, photo stands, project board, doors, stage set, chairs, diploma folder, UI buttons) and `assets-src/generated/npc-*.png`; hosts from `tools/gen-host-sprite.py`.
- Kenney CC0 tiles cut by `tools/build-atlas.py` (names `k_*`): rpg-urban-pack (8,9) 1x2 red mailbox, (8,11) blue mailbox, (9,9) red bin, (10,10) grey bin, (10,11) hydrant, (7,10) 1x2 produce crate, (6,10) red crate, (4,11) 2x1 wide crate, (5,8) barrier; roguelike-modern-city (14,18) cone, (14,14) bin; tiny-town (8,8) well, (11,6) sign.
- Packed output: `public/game/atlas.png` + `atlas.json` and `public/game/sprites/`. Rebuild with `python tools/gen-town-art.py && python tools/build-atlas.py`.
