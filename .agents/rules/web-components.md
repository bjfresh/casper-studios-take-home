---
paths: ["apps/web/src/components/**"]
---
# Components

## Structure
- `ui/` is the design-system contract: domain-free, Radix primitives where one
  exists, CVA variants, theme tokens from `app/globals.css`. Don't change
  public styling or behaviour casually; add a variant instead of special-casing.
- Domain UI goes in `features/<feature>/` with its own `__tests__/`. Never add a
  top-level sibling for a feature that exists under `features/`.
- `modals/` composes `ui/Modal`; `layout/` is shell chrome.
- `icons/generated/` is machine-written. Never hand-edit it.

## Props
- Extend `ComponentPropsWithRef/WithoutRef<…>` so native attributes pass
  through; `className` always reaches the root.
- Wrap composed exported prop types in `Prettify`.
- Derive booleans and display values above the JSX; name them is/has/show/can.
- Components that use hooks or attach handlers start with `'use client'`.

## Text
- All human-readable copy renders through `<Text>`. Pick a `variant`
  (size/leading/tracking/family) and, separately, a `weight`.
- Call-site `className` is for layout, spacing and color only. Size, leading,
  tracking, family and weight overrides are discarded by design.
- Add a step to the scale in `TEXT_VARIANTS` (one edit), with px comments for
  mobile and `md:`.
- Families are roles, not fonts: `font-display`/`font-body` (Poppins),
  `font-headline`/`font-accent` (Quicksand), `font-mono` (Space Mono). Fonts
  load in `constants/fonts.ts`; a new weight must be declared there first.

## Buttons
- `Button` for actions; `LinkButton` for navigation. Both take their content as
  props, never children: `label` (the visible text and the accessible name),
  `leftIcon`, `rightIcon`. Pass `aria-label` only to say more than the label.
- Icon-only: `label` + `leftIcon` + `hideLabel`. The label becomes the
  accessible name and the button is a square at its size's height, so it lines
  up with labelled buttons of the same `size`. There's no separate icon size.
- Icons fill the box the button gives them (`size-full` on the SVG).
- `loading` (not `disabled`) while an action is pending: stays focusable, keeps
  its width, blocks activation.
- Variants/sizes are enumerable via `BUTTON_VARIANTS` / `BUTTON_SIZES`.
- `primary` is the brand accent (`--control`, brand-5-500) with white text (a deliberate ~2.4:1, under AA; see globals.css).

## Badges
- Non-interactive labels. Clickable or dismissible? That's a different
  component; don't add onClick. The one exception is a link via `asChild`.
- Variants name intent (`success`, `danger`), never colours.
- The text carries the meaning. When it's ambiguous out of context, pass
  `aria-label` with the full meaning (it becomes visually-hidden text).
- Live changes (counts) need `aria-live` at the call site.
- A new tinted variant needs a `-strong` text token and must pass the contrast
  test in both themes.

## Fields
- Every labelled control composes `useField` + `<Field>` and spreads
  `controlProps`. Never hand-roll label/description/error ARIA.
- `className` styles the field wrapper; `controlClassName` styles the control.
- Share `controlBaseClasses` / `controlStateClasses(hasError)` for new text-like controls.
- Share `focusRingClasses` for focus rings; colour comes from the state.
- Reflect `hasError` visually as well as through `aria-invalid`.
- `Switch` is for changes that take effect immediately. A value saved on
  submit is a checkbox, whatever it looks like.
- `TextArea` grows with CSS `field-sizing: content` (no JS); size it with
  `minRows`/`maxRows`, never `rows`/`height`.
