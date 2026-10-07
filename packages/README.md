# packages/

```
apps/web  ──┐
            ├──> packages/shared        (types, schemas, pure utils)
apps/api  ──┘
    │
    └──────> packages/db                (API only)
```

Dependencies point one way. `packages/ui` is intentionally absent until a second
app renders UI; primitives live in `apps/web/src/components/ui/` until then.
