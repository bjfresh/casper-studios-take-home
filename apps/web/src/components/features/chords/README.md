# features/chords/

- `ChordDiagram`: chord or fingering diagram (SVG). Adapts to tuning (any
  string count), handedness, and position: draws the nut near the headstock,
  a fret number further up. Optional `labels` overlay (notes or fingers, one
  at a time) and `showTuning`.
- `chord-diagram-layout.ts`: the pure logic, unit-tested: fret window,
  string order per hand, string thickness, accessible description.
- `ChordButton`: round chord-selection control. `status` (default, learning,
  completed, locked) and `selected` are independent.
- `examples.ts`: example fingerings (design page and tests).

Development-only gallery: `/design` (404 in production).
