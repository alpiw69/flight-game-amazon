[![Competition](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Rank](https://make.fun/badge/best-flight-game-20261126-0057/alpiw69/flight-game-amazon/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Reward](https://make.fun/badge/best-flight-game-20261126-0057/alpiw69/flight-game-amazon/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

# AMAZON RIVER RUN

A modern amphibious seaplane flies low over a winding Amazon river: water takeoffs
and landings on the river, wildlife photo surveys, supply drops to stilt villages,
rain squalls and fog, floating fuel docks — six legs from Manaus to the Amazon
Research Station, dawn to golden hour.

[Make the best flight game — $500, 50 places paid](https://make.fun/bounty/best-flight-game-20261126-0057)

## How to fly

Open `game/index.html` in a desktop browser (or run `node serve.ts` and open
http://localhost:8080). No network, no libraries — plain canvas 2D.

| Key | What it does |
| --- | --- |
| Arrows / WASD | Pitch and bank |
| Shift / Ctrl | Throttle up / down |
| F | Flaps |
| G | Floats down / up (up is faster, but you cannot land on water with them up) |
| Space | Camera shutter (photograph wildlife) / drop supplies over a dock |
| B | Brake (water brake on the river) |
| P / Esc | Pause |
| Enter | Confirm / start |

## The route

1. **Dawn Departure** — mist on the river, six rings over the water.
2. **Dolphin Survey** — frame three pink river dolphins in the viewfinder and snap them.
3. **Village Drop** — drop medicine on São Miguel's dock and rice on Porto Verde's.
4. **Storm Squall** — heavy rain, fog banks and hard gusts through five rings.
5. **Night River** — lit rings, then a water landing on the buoy lights at the floating fuel station.
6. **Research Station Finale** — photograph a jaguar on the sand bank and scarlet macaws over the river, then land on the water at the station dock.

Fuel burns with the throttle; hard water landings damage the floats. Sit beside a
floating fuel dock for two seconds to fill up. The river winds — bank to follow it,
and stay over the water when you are low: the canopy is not forgiving.

## Structure

- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `game/src/config.js` — tuning, skies, scoring, feats.
- `game/src/river.js` — the winding river, the six legs, villages, docks, animals.
- `game/src/forest.js` — the rainforest: trees, emergent groves, canopy height.
- `game/src/water.js` — spray, ripples and splashes (all seeded).
- `game/src/photo.js` — the wildlife survey: framing and photo scoring.
- `game/src/flight.js` — the seaplane flight model (water takeoff, planing, floats).
- `game/src/world.js` — the game state: legs, rings, drops, photos, landings, feats.
- `game/src/render.js` — the chase view, the seaplane, the HUD, the river log.
- `game/src/shots.js` — the autopilot and the four screenshot scenes.
- `game/src/input.js`, `game/src/main.js`, `game/src/project.js`, `game/src/random.js`.

Screenshots are real renders of the game's own code, staged by `game/src/shots.js`
through the real rules with a seeded autopilot, so the same seed always gives the
same frame.
