# Spiderweb

A web port of the [Tangle of Webs](https://inconvergent.net/2019/a-tangle-of-webs/) generative sketch, originally written in Processing for pen-plotter output.

The sketch grows an organic web by repeatedly adding edges through random lines and relaxing the graph with elastic forces. Built with Paper.js, dat.GUI, and Vite.

## Development

Requires [pnpm](https://pnpm.io/).

```bash
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

### Build

```bash
pnpm build
pnpm preview
```

Production output goes to `dist/`.

## Controls

### Keyboard

| Key | Action |
|-----|--------|
| `Space` | Reset |
| `→` | Grow one batch |
| `S` | Export SVG |

### GUI

- **Actions** — Reset, Grow, Export SVG, Randomize seed
- **Physics** — `forceMultiplier`, `edgeLengthThresh`
- **Growth** — `growSteps`, `relaxSteps` per batch
- **Display** — Debug overlay, Hamiltonian TSP tour
- **Seed** — Reproducible random state

Parameters sync to the URL query string so you can share a link and get the same result (including growth history via `growBatches`).

## Export

SVG export follows the same pattern as [chrome](https://github.com/DriesCruyskens/chrome): the downloaded filename embeds the current parameters as JSON, so you can recover the recipe from the file name.

Debug visuals (candidate line and intersection dots) are omitted from exports.

## Deployment

Configured for static hosting on Vercel via `vercel.json`. Connect the repo and deploy — Vercel detects pnpm from `pnpm-lock.yaml`.

## Credits

Algorithm from [inconvergent.net — A Tangle of Webs](https://inconvergent.net/2019/a-tangle-of-webs/).

Web app structure inspired by [chrome](https://github.com/DriesCruyskens/chrome).
