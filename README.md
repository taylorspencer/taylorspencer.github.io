# taylorspencer.github.io

Personal site for Taylor Spencer, styled as a faithful recreation of a
Fallout-series RobCo TERMLINK terminal. Live at
<https://taylorspencer.github.io>.

## Files

| File | Role |
| --- | --- |
| `index.html` | All markup — every screen is a `<section>`, shown/hidden by JS |
| `style.css` | The entire visual identity; all colors/spacing/timing are CSS custom properties in `:root` |
| `script.js` | Typing engine, boot sequence, screen navigation, and the optional audio module |

No build tools, no frameworks, no external JS. The only external request is
the Google Fonts load for Share Tech Mono (the closest available match to
Monofonto, the face the in-game FO3/FNV terminals use).

## Phase roadmap

1. **Skeleton** ← current: four screens, terminal nav with selection
   inversion, full RobCo visual identity in static form, subtle scanlines
2. **Typing engine** — character-by-character rendering, boot sequence on
   load, click-anywhere-to-skip
3. **CRT polish** — phosphor glow, scanline intensity, flicker, vignette,
   curvature (tunable; heavy effects desktop-only)
4. **Interactivity** — whitelisted typeable commands, contact input,
   optional sound (off by default)
5. **Custom domain + real contact form destination**

## Audio (optional, off by default)

A `[ SPEAKER: OFF ]` toggle sits top-right. Sound is **off on every visit**
and resets on refresh: nothing is saved in cookies or storage, and no
`AudioContext` exists until the visitor presses the toggle (browsers
require that gesture anyway).

- **`playTick(character)`** runs for every printed character via one
  `document` listener on the typing engine's bubbling `charprinted`
  event. It skips whitespace and enforces a minimum gap between ticks
  (`TICK_MIN_GAP_MS`), so fast typing doesn't turn into a buzz. Skips and
  reduced-motion print instantly and never fire ticks.
- **`playClick()`** runs on menu selections and on the toggle itself.
- **Swap point:** both functions synthesize placeholder sounds today. To
  use real samples later, change only the inside of these two functions.
  No sound files or outside assets ship in this pass.
- The boot log's `AUDIO RELAY ....... STANDBY` line reads `ENGAGED` when
  the speaker is on, and flips if toggled while it's on screen.

## One-time manual setup

**Settings → Pages → "Enforce HTTPS"** — already enabled (verified 2026-06-12);
leave it checked.

## House rules

- This repo and its history are public: no API keys, tokens, secrets, or
  plain-text email addresses in any file, ever — including comments.
- When user input arrives in Phase 4: render visitor text with `textContent`
  only (never `innerHTML`), no `eval`/`Function`, and command parsing is an
  exact-match whitelist.
- No third-party scripts beyond the Google Fonts stylesheet.
