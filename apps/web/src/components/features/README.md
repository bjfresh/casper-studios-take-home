# components/features/

Domain UI, one directory per feature (e.g. `auth/`, `billing/`, `onboarding/`):

```
features/
  <feature>/
    SomeComponent.tsx
    __tests__/
      SomeComponent.test.tsx
```

Every domain component lives here. Don't create a sibling top-level directory
for a feature that already has one under `features/`.
