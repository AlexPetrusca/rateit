# Frontend Agent Notes

This file applies to `frontend/` and its subtree. Follow the root `AGENTS.md` first, then use this file for frontend-specific guidance.

## Scope

The frontend is a React + Vite app. Most work is in `src/` and the code is organized around shared components plus page-level composition.

## Commands

- `npm install`
- `npm run dev`
- `npm run build`
- `npm test`
- `npm run lint`

## Where The App Lives

- routing and app shell: `src/App.jsx`
- entry point: `src/main.jsx`
- global styles: `src/App.css`
- auth/session state: `src/contexts/AuthContext.jsx`
- notifications: `src/contexts/NotificationContext.jsx`
- API wrapper: `src/services/BackendApiService.js`

## Shared Components

Prefer existing shared components before adding page-specific copies:

- `src/components/FeedTimeline.jsx`
- `src/components/PostCard.jsx`
- `src/components/CommentThread.jsx`
- `src/components/StarRating.jsx`
- `src/components/UserAvatar.jsx`
- `src/components/Modal.jsx`
- `src/components/Notification.jsx`
- `src/components/AdminDataGrid.jsx`

## Frontend Conventions

- Reuse shared components for any repeated post/comment/feed UI.
- Use `sx` for MUI layout styling unless a component explicitly needs a different pattern.
- Keep the home feed and profile feed visually aligned.
- Use the shared admin grid wrapper for table-like admin views.
- Keep page-specific logic in page files and reuse shared components for rendering.
- Preserve existing click targets and navigation behavior when refactoring feed cards.

## Testing Notes

- Update or add `node --test` coverage alongside service and utility changes.
- Keep frontend tests focused on data shaping, API wrappers, and component behavior that is hard to reason about by inspection.

## When Editing

- If you add a new reusable UI pattern, prefer extracting it once and reusing it across pages.
- If a change affects the feed, post detail, profile, or admin pages, check whether an existing shared component already covers the need.
