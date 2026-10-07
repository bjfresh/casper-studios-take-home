# components/ui/

Generic, domain-free primitives. This is the design-system DSL: treat public
styling and behaviour as a contract, and don't change them casually.

| Component            | Notes                                                                 |
| -------------------- | --------------------------------------------------------------------- |
| `Text`               | All copy. `variant` (size/leading/tracking/family) × `weight`.        |
| `Button`             | Content is props: `label`, `leftIcon`, `rightIcon`, `hideLabel`. No children. |
| `LinkButton`         | Router link with Button's props and identical shape.                   |
| `Field` / `Label`    | Label + control + description/error wiring. Pair with `useField`.     |
| `Input` / `TextArea` | Field-backed controls. `className` = wrapper, `controlClassName` = control. |
| `Switch`             | Immediate on/off (Radix). Saved-on-submit values are checkboxes. |
| `Modal`              | Native `<dialog>` shell. Compose it; never render a `<dialog>` elsewhere. |
| `Badge`              | Non-interactive status/attribute label. Intent variants; text carries meaning. |
| `Spinner`            | Decorative loading indicator.                                         |

Built on Radix primitives where one exists, with CVA variants and the tokens in
`app/globals.css`. Primitives live here, not in `packages/ui`, until a second
app renders UI. Conventions: `.agents/rules/web-components.md`.
