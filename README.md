# Bin Day

A small browser game about the British bin system. You have bins, the council
has opinions, and the two are on divergent trajectories.

Built with Phaser 3 + Vite, in the same shape as
[Dolomites](https://github.com/dobutler/Dolomites).

## Setting up

Bin schemes vary enormously across the UK: purple is general waste in
Liverpool and does not exist in Cambridge at all. So the game opens by asking
which colour means what on your road, plus a house number and whether you
paint it on the bins. The rules underneath stay keyed to *function*, so a
council letter about recycling refers to your purple bin if that is what you
chose.

## The idea

Each day the household produces waste. You sort it, wheel the right bins to
the kerb before 7am on the right morning, and try to keep the street's good
opinion. Then the council starts writing to you: garden waste becomes a paid
subscription, food waste moves to a separate caddy, glass leaves the blue bin,
collections shift a day over the festive period. Every letter is a genuine
change to the rules you have been playing by.

Meanwhile the neighbours message asking you to put their bins out while
they're away, and foxes visit any black bin left out overnight.

The street also watches your kerb. Each neighbour has a `knowledge` value
(how well they remember the rota) and a `suggestibility` value (how readily
they abandon that and copy you). Put the right bin out and you become the
road's reference point. Put the wrong one out confidently and it propagates:
houses follow, collections are refused, street chaos climbs, and eventually
somebody works out where it started.

## How it is put together

The design decision everything else follows from: **the current rules are
data, and council letters are patches to that data.**

| Path | What it holds |
| --- | --- |
| `src/game/data/ruleset.js` | The starting rules: which bins exist, what each accepts, the collection rota, conduct rules |
| `src/game/data/letters.js` | Council letters — prose plus a list of patch operations and an effective date |
| `src/game/data/items.js` | The waste catalogue: pizza box lids and bases, sentient cheddar, encroaching bamboo, and the fly-tipping temptations |
| `src/game/data/events.js` | Scripted and random interruptions: WhatsApp favours, foxes, wind, inspections |
| `src/game/data/street.js` | The neighbours, their dials, and the chaos escalation milestones |
| `src/game/data/palette.js` | Colour and sticker options, and the colour-to-function mapping |
| `src/ui/setup.js` | The opening scheme-choosing screen |
| `src/game/systems/street.js` | The copycat mechanic: who follows your kerb, and what it costs |
| `src/game/systems/rules.js` | Pure rules engine — derives the active ruleset for any day and answers all gameplay questions |
| `src/game/systems/state.js` | Game state and the day-advance pipeline |
| `src/game/scenes/Street.js` | The Phaser scene: a pixel-art three-quarter view of a thatched cottage on a country lane, drawn entirely with primitives at 480x270 |
| `src/game/data/pixels.js` | Tiny bitmaps: house-number digits, bin stickers, recycling chevrons |
| `src/ui/overlay.js` | HTML overlay: calendar, waste tray, post, phone |

`activeRuleset(day)` rebuilds the rules from scratch each time by replaying
every letter that has taken effect, so a save game only needs the day number
and player state. Adding a new regulation means adding one object to
`letters.js` — no engine changes.

## The tip

The recycling centre takes what no bin will. It is open every day, but
everybody can only go at the weekend, which is exactly why the weekend is
the worst time to go: a ninety-five minute queue and a real chance of being
turned away at the barrier when the site fills. You can book a slot in
advance instead, which cuts the queue to fifteen minutes. Booking is the
single best use of your bin time in the game.

## Art direction

Everything on the canvas is drawn procedurally at a low internal resolution
and scaled up with `pixelArt: true`, so there are no sprite sheets to source
or license and the whole game is one `npm install` away from running. That
does cap the detail: a hand-drawn tileset would look considerably better, and
the drawing code is isolated in `Street.js` if you want to swap to one later.

## Running it

```bash
npm install
npm run dev      # http://localhost:8080
npm run build    # production build into dist/
npm test         # headless smoke test of the UI and a scripted session
npm run test:api # checks the Phaser APIs the scene uses exist in this version
```

Node 20 or newer. `npm run dev` hot-reloads, so editing anything under `src/`
updates the browser immediately.

## Playing it

- Pick an item in the **Waste** panel, then click a bin to put it in.
- Click a bin with nothing selected to wheel it to the kerb, or back in.
- Read the **Post**. The letter view lists exactly what changed.
- **End the day** to advance. Collections happen at 7am the next morning.
- Bins that are overfull, contaminated, or late are refused, and the street
  notices.

Three bars track how it is going:

- **Community standing** — how the road feels about you. Up for taking a
  neighbour's bin out, down for wrong bins, kerb clutter, and being seen in
  your pyjamas.
- **Street chaos** — how confused the road is. Rises when people copy your
  mistakes, when bins sit out for days, and when unlabelled bins wander.
- **Bin time** — your own time. Drained by missed collections, tip runs, and
  righting bins after a gale; recovers slowly when nothing goes wrong.

Other things that will happen to you: gales tip bins over and spill the
contents, grime builds up until the flies arrive (£4 a bin for the pressure
washer), and unlabelled bins go missing for days after collection because
every bin on the road looks the same at 7am. Before wheeling anything out,
you can look through the window to see whether anyone is about, and get
dressed first if they are.

## Publishing privately

- **Private repo, run locally** — free, works today. Clone and `npm run dev`.
- **GitHub Pages from a private repo** — needs GitHub Pro on a personal
  account (or Team on an organisation). The published site is still public;
  only the source stays private.
- **A site that is genuinely access-controlled** — GitHub only offers that
  through Enterprise Cloud. Cloudflare Pages plus Cloudflare Access is the
  cheaper route: it deploys from a private repo and puts an email-based login
  in front of the site.

`.github/workflows/deploy.yml` handles the Pages route once the plan allows it.

## Licence

MIT.
