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

A speaker-icon toggle (waves when on, an X when off; `aria-label`
"Speaker" with `aria-pressed`) sits at the top-right of the page. It
scrolls with the page instead of staying pinned, so it never covers text. Sound is **off on every visit**
and resets on refresh: nothing is saved in cookies or storage, and no
`AudioContext` exists until the visitor presses the toggle (browsers
require that gesture anyway).

- **`playTick(character, speedMs)`** runs for every printed character via one
  `document` listener on the typing engine's bubbling `charprinted`
  event. It skips whitespace, then ticks on a random share of characters
  that depends on the typing speed: 30–39% for the boot log and boot header at 18 ms a
  character (`BOOT_TICK_CHANCE_MIN` / `_MAX`) and 46–64% for home and menu
  text at 40 ms (`TICK_CHANCE_MIN` / `_MAX`), so both run at roughly the
  game's 13–16 ticks a second or a touch above (raised ~15%, Oct 15).
  Pitch, volume and length vary per tick (`*_JITTER` constants), so the
  pattern never repeats. Skips and
  reduced-motion print instantly and never fire ticks; skipping the boot
  plays a single `playClick()` instead.
- **`playClick()`** runs on menu selections and on the toggle itself.
- **Swap point / recorded sounds:** both functions play a recorded sample
  when one is loaded and are silent otherwise (no synthesized sounds). Recordings are
  listed in `SAMPLE_TICK_FILES` / `SAMPLE_CLICK_FILES` in `script.js` and
  live in `audio/` on this site (relative paths). Nothing is fetched until the speaker is
  first turned on; each play picks a random variant at a slightly random
  `playbackRate`. A file that fails to load is skipped and that sound
  stays silent.
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
