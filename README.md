# Kickpush

A mobile-friendly skateboarding arcade game. Cruise through Sunset Park, land tricks, link combos, and chase your highest score in 90-second sessions.

[Play the hosted game](https://kickpush-skate.nutty-grebe-1554.chatgpt.site) (private Sites deployment; authorized sign-in required).

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
| Grind / manual | Hold Grind / Manual | Hold J |
| Pause / resume | Tap the pause button | P or Escape |

The skater moves automatically. Kickflip and 360 also start a jump from flat ground. Mix tricks to increase your multiplier, and use manuals or rail grinds to connect them. Release the manual and wait three seconds on the ground to bank your combo. A bail loses unbanked points. Best scores and sound preferences are stored on your device.

## Check the game

```sh
npm test
```

The checks cover aerial combos, multipliers, banking, manuals, bails, pause, obstacle collisions, rail transitions, late-trick rejection, run completion, restart, WebMCP, and canvas rendering at phone and desktop sizes.

## Project

- `dist/index.html`: game interface
- `dist/style.css`: responsive layout
- `dist/game.js`: canvas renderer, skating physics, tricks, and scoring
- `server.cjs`: local static server
- `check-game.cjs`: gameplay checks

Built with HTML, CSS, and JavaScript Canvas. Fonts load from Google Fonts when available, with system fallbacks. The `dist` directory can be deployed to any static host.
