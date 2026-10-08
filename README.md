# Kickpush

A mobile-friendly skateboarding arcade game. Cruise through Sunset Park, land tricks, link combos, and chase your highest score in 90-second sessions.

[Play Kickpush on GitHub Pages](https://irishfan3124.github.io/kickpush/). Open the link on your phone or desktop; no sign-in is needed.

## Run locally

Install Node.js, then run:

```sh
npm start
```

Open **http://localhost:5173**. No npm dependencies or build step are needed. You can also serve the `dist` folder with any static web server.

## Controls

| Move | Mobile | Keyboard |
| --- | --- | --- |
| Ollie | Tap Ollie | Space |
| Kickflip | Tap Kickflip | K |
| 360 spin | Tap 360 Spin | L |
| Melon grab | Tap Melon Grab | I |
| Grind / manual | Hold Grind / Manual | Hold J |
| Bank score | Tap Bank score | B |
| Pause / resume | Tap the pause button | P or Escape |

Use the Flip selector to choose **Kickflip, Heelflip, or Pop Shuvit**, and the Spin selector to choose **180, 360, or 540**. The K and L keys perform the selected tricks. Flip, spin, and grab buttons also start a jump from flat ground. Grabs must wait for a flip to finish. Landing a 180 or 540 changes your stance; tricks in switch stance earn 20% extra points.

The skater moves automatically. Land and your combo banks after **0.7 seconds**, or press **Bank score** immediately. Banked points stay safe if you bail. To continue a combo, hold Grind / Manual while landing: manuals connect tricks on flat ground, and grinds catch rails, benches, and ledges. Manuals have a **four-second balance limit**; release to bank or jump before balance runs out. Banking on a rail safely pops the skater out of the grind. Repeated tricks earn diminishing points, even if you alternate them.

Courses feature eleven obstacle types with shuffled layouts, varying dimensions, and clear landing stretches: kickers, quarter pipes, flat rails, down rails, long ledges, park benches, low blocks, stairs, barriers, planters, and street gaps. Terrain changes your grind into a 50–50, boardslide, noseslide, or 5–0. Jumping gaps and solid obstacles also earns clearance bonuses. Best scores and sound preferences are stored on your device.

## Check the game

```sh
npm test
```

The checks include the scoring regression at 30/60/120 fps against actual obstacle timing, instant banking, protected scores, manual balance, air trick variants, switch bonuses, repetition penalties, all eleven obstacle types, safe rail exits, sixteen complete generated 90-second runs, WebMCP, and canvas rendering at phone and desktop sizes.

## Project

- `dist/index.html`: game interface
- `dist/style.css`: responsive layout
- `dist/game.js`: canvas renderer and skater animation
- `dist/skating.js`: skating physics, tricks, course generation, input, and scoring
- `server.cjs`: local static server
- `check-game.cjs`: gameplay checks

Built with HTML, CSS, and JavaScript Canvas. Fonts load from Google Fonts when available, with system fallbacks. The `dist` directory can be deployed to any static host.

## Publish updates to GitHub Pages

GitHub Pages serves the root of the `gh-pages` branch. After committing changes to `dist` on `main`, publish the updated game with:

```sh
git push origin main
git subtree push --prefix dist origin gh-pages
```

GitHub builds and publishes the updated branch automatically. The `.nojekyll` file keeps the game files unchanged during publication.
