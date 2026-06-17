# Frontend Agent Notes

Frontend-specific notes. Follow root instructions first.

## Scope

React + Vite app. Most work belongs in `src/`, with shared rendering components and page-level data/flow logic.

## Commands

- `npm install`
- `npm run dev`
- `npm run build`
- `npm test`
- `npm run lint`

## Shared Components

Prefer existing shared components before adding page-specific copies:

- `src/components/FeedTimeline.jsx`
- `src/components/PostCard.jsx`
- `src/components/CommentThread.jsx`
- `src/components/CommentComposer.jsx`
- `src/components/RatingComposer.jsx`
- `src/components/StarRating.jsx`
- `src/components/UserAvatar.jsx`
- `src/components/Modal.jsx`
- `src/components/Notification.jsx`
- `src/components/AdminDataGrid.jsx`
- `src/components/AdminSelectionToolbar.jsx`

## Frontend Conventions

- Reuse shared components for repeated feed, post, comment, composer, avatar, modal, notification, and admin table UI.
- Use `sx` for MUI layout styling unless a component explicitly needs a different pattern.
- Keep the home feed and profile feed visually aligned.
- Preserve existing click targets and navigation behavior when refactoring feed cards.

## Testing Notes

- Update or add `node --test` coverage alongside service and utility changes.
- Keep frontend tests focused on data shaping, API wrappers, and component behavior that is hard to reason about by inspection.
