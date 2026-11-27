# apostle

A private map of one person's professional circle.

- [Plan](PLAN.md)
- [Front end](FRONTEND.md)
- [Data module](docs/DATA.md)

Live prototype: https://emerickli.github.io/apostle/ (rebuilt on every push to `main`).

## Run it

You need Node 20 or newer.

```sh
npm install
npm run dev
```

Then open http://localhost:5173. Click Try a sample on the first screen to see a full map.

`npm test` runs the core tests, `npm run typecheck` checks types, and `npm run build` writes static files to `dist/`.

## Keys on the map

`1` to `4` switch between tree, radial, rings and charts. `F` fits the map to the screen, `+` and `-` zoom, and `Escape` closes the open card. Drag on empty space to pan. Scroll or pinch to zoom.
