# features/lessons/

- `LessonGrid` + `LessonCard`: the home page. Every lesson ordered by
  `sortOrder`, with its number, name, a last-played badge and Play.
- `LessonPage`: `/lesson/<slug>`. One item at a time with its diagram, then
  Skip or Got it. Finishes the lesson after the last item.

Progress (guest or account) goes through `hooks/use-lesson-progress.ts`.
See `.agents/rules/lessons.md`.
