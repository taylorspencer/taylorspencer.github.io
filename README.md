# taylorspencer.github.io

Personal site for Taylor Spencer, styled as a faithful recreation of a
Fallout-series RobCo TERMLINK terminal. Live at
<https://taylorspencer.github.io>.

## Files

| File | Role |
| --- | --- |
| `index.html` | All markup — every screen is a `<section>`, shown/hidden by JS |
| `style.css` | The entire visual identity; all colors/spacing/timing are CSS custom properties in `:root` |
| `script.js` | Navigation only: one section-switching function, one wire-up loop |

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
   green/amber toggle, optional sound (off by default)
5. **Custom domain + real contact form destination**

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

## Credits

The "under construction" Vault Boy on the Projects screen is a pure-CSS
drawing adapted from Stephan Vermeire's "Vault-Boy in CSS"
([codepen.io/Verstroom/pen/xwaojj](https://codepen.io/Verstroom/pen/xwaojj)).
Its colors were remapped to the terminal palette and a hardhat + jackhammer
were added; see section 8 of `style.css`.
