# Inline Account Setup

Decision:
- Keep the `/create-account` route as a fallback, but make the normal post-OTP flow stay on `/login` and expand into username plus profile-picture setup when the authenticated session has no profile yet.

Why:
- This keeps the login journey visually continuous and avoids a separate handoff screen after OTP verification.

Tradeoffs:
- The login page now has two authenticated states: OTP verification and profile completion.
- `UnguardedRoute` must allow authenticated users without a profile to remain on `/login` long enough for the setup form to render.

Notes:
- The shared setup form is reused by both `/login` and `/create-account` so the copy and upload behavior stay aligned.
