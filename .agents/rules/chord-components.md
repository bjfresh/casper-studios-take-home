---
paths: ["apps/web/src/components/features/chords/**"]
---
# Chord components

## ChordDiagram
- Strings are numbered 1 = highest-pitched, matching `chord_shapes` in the
  curriculum. `tuning` is low → high; its length is the string count. Never
  hard-code 6 strings or a tuning; pass `DEFAULT_TUNING[instrument]` until
  tuning becomes a user setting.
- Pass the player's `handedness` (left = mirrored, low string on the right).
- Notes are FLAT brand green (`--note`, `--note-ring`, `--note-foreground` in
  globals.css): the brand-2-500 swatch, no gradients, with a dark label (white
  on it is too faint). Never black or a raw brand step in the
  component. The label must clear 4.5:1 on the orb
  (ChordDiagram.colors.test.tsx).
- Markers are an orb inside a floating 4px ring. Every ring is faint (~18%);
  a root's is at full strength. That's the one root treatment: no
  colour-coding of roots, and no new marker encodings without a design
  decision.
- The grid is a stable stage: always `FRET_ROWS` rows, with the open/muted row
  and the fret-label column ("7fr") always reserved. Nothing about its size
  or position may depend on the chord. A high chord shifts the window of
  frets, never the grid.
- Notes ripple in string by string (CSS, `.chord-note-enter` in globals.css)
  whenever `revealKey` changes. Pass a key per displayed chord. Entrance
  transforms live on the outer group, hover/press on the inner `.chord-note`,
  so they compose. Reduced motion shows notes immediately.
- One label overlay at a time (`labels="notes" | "fingers"`). Default is none:
  the beginner view.
- Fret window logic lives in `computeFretWindow` (unit-tested). Change the rule
  there, not in the SVG.
- Labels inside markers use the rounded accent face (`font-accent`, Quicksand).
- Interval labels use the `interval` token (brand-4, a text-safe step per
  theme), never a raw brand step, and sit clear of the marker's ring.
- Unplayed strings show nothing. Only `mutedStrings` show ×. Bass patterns rely
  on that.

## ChordButton
- `selected` (aria-pressed) and `status` are independent. Don't add a status
  for "selected".
- Each status has a glyph and announced text, as well as colour. Keep it that
  way when adding one.
- Label: the chord symbol from `chordSymbol()`. Size steps down by length
  automatically.
- `locked` disables the button. If a locked chord must explain itself, wrap it
  in a tooltip rather than re-enabling it.
