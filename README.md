# Preflop IQ

A tournament preflop range trainer. It deals a hand in a real spot, asks for your action, then explains the right play and shows the full range chart. Supports 2–9 players and 10–100bb stacks with a 1bb big-blind ante, and tracks a rolling Preflop IQ score.

The site is plain static HTML, CSS and JavaScript in `public/`, with no build step and no backend. Only `public/` is deployed; `tools/` and this README stay private in the repo. Progress is saved in the browser's localStorage.

## Site layout

| Path | Page |
|---|---|
| `public/index.html` + `trainer.js` | Trainer (home) |
| `public/charts/` + `charts.js` | Range chart browser |
| `public/how-it-works/` | Format, range methods, scoring, glossary |
| `public/about/` | About and privacy |
| `public/404.html` | Not-found page |
| `public/engine.js` | Shared hand data, ranges, Nash solutions and explanations |
| `public/styles.css` | Shared styles, top bar and footer |

The top bar and footer are repeated in each HTML file; edit all of them when adding a page.

## Deploying (Cloudflare Pages)

1. In Cloudflare, go to **Workers & Pages → Create → Pages → Connect to Git**, and pick this repo.
2. Build settings: framework preset **None**, build command **empty**, output directory **`public`**.
3. Deploy, then add your custom domain under **Custom domains**.

Every push to `main` redeploys. Other branches get their own preview URL.

## Where the ranges come from

| Stack | Source |
|---|---|
| 10bb, 15bb | **Solved.** Chip-EV Nash equilibrium for shove-or-fold play, 2–9 players, 1bb BB ante. Assumes at most one caller (no three-way all-ins). |
| 25–100bb | **Modeled.** Hands ranked by all-in equity, weighted toward suited, connected and paired hands as stacks deepen; each spot takes the top slice at typical tournament frequencies. |

Solving 25bb+ properly needs a full preflop solver (MonkerSolver, GTO Wizard, etc.).

## Tools

Node 18+ required. No dependencies.

| File | What it does |
|---|---|
| `tools/evaluator.js` | 7-card hand evaluator and the 169 starting-hand classes |
| `tools/equity-matrix.js` | Simulates every 169×169 matchup with card removal → `tools/data/matrix.json` |
| `tools/nash.js` | Push/fold Nash solver (fictitious play) |
| `tools/build-ranges.js` | Rebuilds the `EQA` and `NASH` data in `public/engine.js` |

`tools/data/matrix.json` is committed (20,000 boards per matchup), so you usually only need:

```sh
node tools/build-ranges.js
```

To add stack depths to the solver, edit `STACKS` in `build-ranges.js` and add the depth to `DEPTHS`, `W`, `OPEN` and `DEPTH_NOTE` in `public/engine.js` (depths of 15bb or less are treated as shove-or-fold). To regenerate the equity matrix from scratch (about 2.5 minutes on 2 cores):

```sh
node tools/equity-matrix.js 20000
```
