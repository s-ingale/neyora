# Neyora — storefront (front end only)

Static marketing + shop front for Neyora, a paper-goods brand selling to-do
pads, journals and calendars. No build step, no framework, no backend yet.

## Run it

```bash
# from this folder — any one of these
npx serve .
python -m http.server 5173
```

Then open http://localhost:5173. Double-clicking `index.html` works too —
there are no module imports or network dependencies beyond the webfonts.

## Layout

```
index.html                  home — hero, our idea, the ritual, closing quote
shop.html                   the shop, on its own page
assets/css/style.css        tokens → reset → components, mobile-first
assets/js/main.js           menu, bag, scroll reveals (shared)
assets/img/*.svg            product art, mark, share card — all vector
```

Both pages carry the same header, footer, bag drawer and paper filters.
`main.js` is shared and no-ops on whatever isn't present — only the shop page
has product cards.

Cross-page links use `index.html#anchor` rather than bare `#anchor`, so the
nav works from the shop page too. If you add a third page, keep that habit.

## Design notes

- **Everything is vector.** Product art, the mark, icons and the paper
  texture are SVG or CSS, so nothing blurs on a 3× phone screen.
- **Mobile first.** Every breakpoint is `min-width`, base styles are the
  phone layout, tap targets are ≥44px, and the hero uses `100svh` so iOS
  Safari's toolbar doesn't clip it.
- **Type** is Fraunces (display) + Inter (body) + Pinyon Script (the
  wordmark) from Google Fonts, with system stacks behind each.
- **The wordmark is always lowercase.** `neyora` is set in Pinyon Script, a
  copperplate face — in caps it loses the flourish that makes it read as
  premium, so `.wordmark` forces `text-transform:lowercase`. Script faces sit
  small on the body and carry heavy side bearing, which is why it is set at
  ~1.85rem against 1.1rem body and nudged up off the baseline to sit level
  with the ring.
- **No cursor-driven motion anywhere.** Most visitors arrive from Instagram
  on a phone where there is no pointer. What motion exists — the ticker and
  the scroll reveals — works identically on both, and all of it is disabled
  under `prefers-reduced-motion`.

## The wrinkled paper

Three fixed layers multiply down over the entire page, so every section —
including the tinted shop band and the near-black quote band — reads as one
continuous crumpled sheet:

| Layer | Filter | Job |
| --- | --- | --- |
| `.crease` | `#crease` | the heavy folds |
| `.crease-fine` | `#creaseFine` | a finer crumple stacked across them |
| `.tooth` | `#tooth` | paper grain |

The trick that makes these read as *creases* rather than soft mottling is the
`feComponentTransfer` on the **alpha** channel with `tableValues="0 1 0"`.
`feDiffuseLighting` uses alpha as its height map, and that table folds smooth
noise into ridges before it gets lit — sharp fold lines instead of blobs.

Tuning, in the order you'll usually want it:

- creases too strong / too faint → `opacity` on `.crease` in `style.css`
- folds too big / too small → `baseFrequency` on `#crease` (lower = larger)
- folds too deep / too shallow → `surfaceScale`
- page drifting grey instead of pink → raise the `intercept` values in the
  final `feComponentTransfer`. Red is held highest on purpose so the shading
  falls toward rose; if you flatten the three channels it goes muddy.

## Colour

Custom properties at the top of `style.css`. The palette is muted-luxury
blush rather than candy pink — a light rosy ground, a near-black oxblood for
type and frames, burgundy as the anchor accent, dusty rose to soften.

| Token | | Use |
| --- | --- | --- |
| `--paper` | `#FAE7E3` | the ground |
| `--paper-2` | `#F3D8D3` | shop band, footer |
| `--card` | `#FEF4F2` | product tiles, inputs |
| `--ink` | `#2A141A` | type, quote band, primary buttons |
| `--wine` | `#7E2B37` | anchor accent — numerals, hovers, badge |
| `--rose` | `#C08081` | soft accent — index numerals, quote rules |

Note the crease layers multiply over everything, which desaturates whatever
sits underneath. The base tones are deliberately more saturated than they
look on screen to survive that.

## The mark

A geometric N inside a hairline ring, drawn inline in `index.html` (header
and footer) and as standalone files for the favicon and share card. It reads
at 20px and debosses onto the journal cover in `product-journal.svg` — if you
change the mark, change it in all four places.

## What's stubbed for the backend

| Piece | Now | Later |
| --- | --- | --- |
| Bag | `localStorage` key `neyora.bag.v2` | Cart API / Shopify / Stripe |
| Checkout button | Toast message | Real checkout session |
| Product data | `data-*` attributes on `.card` | Rendered from the catalogue |

There is no email capture anywhere on the site — the Sunday-letter section
that held it was removed. If you ever want one for Instagram traffic, it
needs building fresh.

## Prices

All prices are in rupees, formatted with `Intl.NumberFormat('en-IN')` so the
grouping is Indian — `₹1,199`, and `₹1,00,000` rather than `₹100,000`.

**Changing a price means touching two places, both in `shop.html`:**

1. `data-price` on the `.card` (digits only — this is what the bag charges)
2. the visible `.price` in that same card

A saved bag can outlive a price change, so the bag never trusts its own
stored copy: `add()` refreshes name and price from the card, and on load a
reconcile pass rewrites any stored item against the catalogue on the current
page. Because that pass needs the catalogue, it only runs on `shop.html` —
which is why `KEY` is versioned. **If you change prices in a way old bags
can't survive (another currency, say), bump `neyora.bag.v2` to `v3`** in
`main.js` and every stale bag is dropped rather than mispriced.

## Editing content

Products are three `<article class="card">` blocks in `shop.html`, and that
is the only place they are listed — the homepage links to the shop rather
than naming products, so adding a fourth product means editing one file.
