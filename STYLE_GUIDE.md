# RobCo TERMLINK — Style Guide

The visual + code conventions for this site (a Fallout-series RobCo terminal
recreation). Drawn from the live `style.css`. Keep this in sync when tokens
change. Intended as the reference for future and separate work sessions.

---

## Colors

All colors are CSS custom properties in the `:root` block of `style.css`.
**Never hard-code a hex value** — reference the token, so the palette stays
consistent across every screen and changes propagate from one place.

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#0a0f0a` | Page background — near-black with a green cast, never pure `#000` |
| `--color-green` | `#1aff80` | Primary phosphor green — body text, nav, Vault Boy fill |
| `--color-green-dim` | `#12b35a` | Secondary text — flavor lines (e.g. `Directory rebuild...`) |
| `--color-green-bright` | `#8cffc0` | Highlights — reserved for later phases |
| `--color-scanline` | `rgba(4, 8, 4, 0.35)` | Dark stripe in the scanline overlay |

---

## Typography

- **Font:** `"Share Tech Mono", monospace` — loaded from Google Fonts, the only
  permitted external request. (Stands in for Monofonto, the in-game FO3/FNV
  face, which isn't on Google Fonts.)
- **Body size:** `--font-size-body: 1.25rem` (20px) → `1.125rem` (18px) at
  ≤480px. Never drop below the 16px mobile floor.
- **Letter-spacing:** `0.09em` desktop → `0.06em` mobile (CRT text is widely tracked).
- **Line-height:** `1.6`

### Casing rules
| Element | Casing | Notes |
|---|---|---|
| Header chrome lines | UPPERCASE | `ROBCO INDUSTRIES UNIFIED OPERATING SYSTEM` etc. |
| Nav entries | Title case | prefixed with `> ` |
| Screen headings | Title case | underlined to text width |
| `figcaption` (e.g. UNDER CONSTRUCTION) | UPPERCASE | via `text-transform`, `letter-spacing: 0.2em` |
| Body copy | Sentence case | |

---

## Spacing & layout

- **Scale:** `--space-xs .25rem` · `--space-sm .5rem` · `--space-md 1rem` · `--space-lg 2rem`
- **Content column:** `--content-width: 52rem`, centered
- **Tap target:** `--tap-target: 44px` minimum nav-row height
- **Structure:** single centered column; exactly one `<section>` visible at a
  time (JS toggles the `hidden` attribute); single-column responsive to ~375px

---

## Components & signature patterns

- **Header chrome** — centered, uppercase, 3 lines: OS title / copyright /
  `-Taylor Spencer Terminal-`.
- **Nav (`.menu-item`)** — full-width rows, `> ` prefix, **inverted selection**
  on hover/focus (green background, dark text). This inversion *is* the keyboard
  focus indicator — the signature interaction; spend polish here.
- **Screen headings (`.screen-heading`)** — Title case, underlined via
  `border-bottom: 1px solid currentColor`, `width: fit-content`.
- **Resting prompt** — `>█` with a blinking block cursor.
- **Boot skip hint** — dim, pinned bottom-center, visible only while the
  boot plays. Two phrasings in the HTML, one shown per device via
  `@media (hover: none) and (pointer: coarse)`: keyboard devices get
  `[ PRESS ENTER TO BYPASS TERMINAL INITIALIZATION ]`, touch devices
  `[ TOUCH ANYWHERE TO BYPASS TERMINAL INITIALIZATION ]`. NOT aria-hidden
  (unlike the boot log): screen readers hear the visible variant.
  Enter, click/tap, and Escape all skip.
- **Speaker toggle (`.speaker-toggle`)**: a real `<button>` with
  `aria-pressed` and `aria-label="Speaker"`, whose face is a vintage
  cabinet speaker drawn as inline SVG in `currentColor` (`.speaker-icon`,
  sized `--space-lg`). On shows sound waves; off shows an X. CSS picks the
  shape from `aria-pressed` alone, so the picture and the screen-reader
  state can't disagree. The grille slots use the `.vb-cut` trick
  (`--color-bg` stroke) and flip to `--color-green` when inverted.
  Built from menu-row parts: `min-width`/`min-height: var(--tap-target)`,
  `padding: var(--space-xs) var(--space-sm)`, `--color-bg` behind it.
  States: OFF in `--color-green-dim`, ON in `--color-green`, and the same
  inverted hover/focus as `.menu-item`.
  **Placement:** inside `.speaker-bar`, which is never pinned to the
  screen, so it scrolls away with the page and can't cover text after
  scrolling. Wider than 600px: absolute in the page's top-right corner,
  clear of the centered header and the left-aligned boot log. At 600px
  and narrower: a static, right-aligned row at the top of the page that
  reserves its own tap-target height (the old `body` padding is gone).
  Starts OFF on every visit; nothing is stored. Clicking it and pressing
  Enter on it are exempt from boot skipping. No new tokens.
- **Vault Boy (`.vault-boy-anim`)** — a traced SVG driven entirely from CSS in
  two layers: `.vb-body { fill: var(--color-green) }` for the figure and
  `.vb-cut { fill: var(--color-bg) }` for the dark detail lines. Sized 240px
  with a phosphor `drop-shadow` glow. Recolors automatically with the palette.

---

## Effects layer

Kept in a clearly separated section of `style.css` so the heavy CRT effects
(Phase 3) can be added/gated to desktop without touching layout rules.

- **Phosphor bleed:** `text-shadow: 0 0 1px currentColor` on text;
  `drop-shadow(0 0 3px var(--color-green))` on the Vault Boy.
- **Scanlines:** fixed full-viewport `repeating-linear-gradient`
  (2px transparent / 1px dark), `pointer-events: none`, `z-index: 1000`.
  Keep opacity low — readability beats authenticity.
- **Boot cut:** the finished boot log exits with a hard single-frame cut
  (no roll, no fade — a terminal clears its screen instantly), a beat of
  bare glow, then the header types at boot speed and the menu pops in.
  The finished log holds for 600 ms (`BOOT_HOLD_MS`) before the cut. A possible
  screen-glow effect on the cut is an open Phase 3 question.
- **Cursor blink:** `steps(1)` 1.1s — hard on/off, not a fade.
- **Reduced motion:** `prefers-reduced-motion: reduce` stops the cursor.

---

## Sound

- **Off by default**, every visit; nothing is stored.
- **Typing speeds and ticks** (Taylor's call, Oct 14, 2026: faster boot,
  slower menus, ticks paced to the game's ~13-16 ticks a second): the boot
  log and the boot header type at 18 ms a character (`BOOT_TYPE_SPEED_MS`), home and menu text
  at 40 ms (`TYPE_SPEED_MS`). Ticks follow the text: one chance per printed
  non-space character, re-drawn every character, with a separate share for
  each speed. Boot ticks on a random 28-35% (`BOOT_TICK_CHANCE_MIN` /
  `BOOT_TICK_CHANCE_MAX`, about 16-17 ticks a second; raised ~15% on Taylor's Oct 15 call), home and menu text
  on a random 46-64% (`TICK_CHANCE_MIN` / `TICK_CHANCE_MAX`, about 13-14 a
  second). Per-tick pitch, volume and length jitter, and no fixed minimum
  gap, so the rhythm never repeats. Tick files are trimmed to 30 ms so
  neighbouring ticks don't blur. Skipping the boot plays one select click.
- **Sound files** (approved by Taylor, Oct 14, 2026; 200 KB total cap):
  sound files live in `audio/` (always linked with relative paths so the
  staging copy loads its own files), load only after the speaker is
  turned on, and come from the site's own address. Only these recordings
  ever play: there are no synthesized sounds, and a file that is missing
  or not yet loaded is silent with no errors (Taylor, Oct 14, 2026).

---

## Code conventions (carry into every session)

- **Vanilla only** — no frameworks, no build tools, no external JS libraries.
  Google Fonts CSS is the single permitted external request.
- **Public repo discipline** — no secrets, API keys, or plain-text email
  addresses in any file, ever, including comments.
- **User input (Phase 4+)** — render visitor text with `textContent` only,
  never `innerHTML`; no `eval`/`Function`; command parsing is an exact-match
  whitelist.
- **Comments teach** — explain *why* and what role a block plays, not what the
  syntax does. (The author reads this code to learn.)
- **Tokens first** — every color, spacing unit, and timing value lives in the
  `:root` block.
