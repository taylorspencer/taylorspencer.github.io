# Sound file sources

All files in this folder come from
[smiley/hyper-robco](https://github.com/smiley/hyper-robco), commit
`5858abc5347dbc029e95fe2e14b5e4aaa0c9ddc0`, folder `sounds/`.

- **Clicks** (`ui_hacking_charenter_01` to `_03`): copied unmodified.
- **Ticks** (`ui_hacking_charsingle_01` to `_06`): trimmed (Oct 14, 2026) to
  their first 30 ms with a 4 ms linear fade-out at the end so the cut doesn't
  click (ffmpeg `atrim=0:0.030,afade=t=out:st=0.026:d=0.004`, 16-bit PCM,
  original sample rate and mono kept). The untrimmed originals ran 117 to
  154 ms and blurred together at typing speed.

| File | Bytes | Status |
|---|---|---|
| `ui_hacking_charsingle_01.wav` | 2,690 | trimmed (was 10,528) |
| `ui_hacking_charsingle_02.wav` | 2,018 | trimmed (was 8,234) |
| `ui_hacking_charsingle_03.wav` | 2,690 | trimmed (was 11,084) |
| `ui_hacking_charsingle_04.wav` | 2,018 | trimmed (was 8,944) |
| `ui_hacking_charsingle_05.wav` | 2,690 | trimmed (was 13,590) |
| `ui_hacking_charsingle_06.wav` | 2,018 | trimmed (was 7,616) |
| `ui_hacking_charenter_01.wav` | 12,960 | unmodified |
| `ui_hacking_charenter_02.wav` | 8,704 | unmodified |
| `ui_hacking_charenter_03.wav` | 7,232 | unmodified |
| **Total** | **43,020** | |

## Rights note

These are Bethesda's Fallout 3 / Fallout: New Vegas terminal sounds. The
hyper-robco repo's GPL license covers only its code, not these sound files;
Bethesda retains its rights to them.
