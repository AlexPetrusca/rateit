# Backend Agent Notes

This file applies to `backend/` and its subtree. Follow the root `AGENTS.md` first, then use this file for backend-specific guidance.

## Scope

The backend is a Spring Boot service with JPA entities, REST controllers, background job processing, security, and S3 integration.

## Commands

- `./mvnw -q test`
- `./mvnw -q -DskipTests compile`
- `./mvnw spring-boot:run`

## Where The Backend Lives

- application entry: `src/main/java/com/rateit/backend/BackendApplication.java`
- controllers: `src/main/java/com/rateit/backend/controller/`
- services: `src/main/java/com/rateit/backend/service/`
- entities and DTOs: `src/main/java/com/rateit/backend/entity/`
- repositories: `src/main/java/com/rateit/backend/repository/`
- security: `src/main/java/com/rateit/backend/security/`
- config: `src/main/java/com/rateit/backend/config/`

## Current Backend Areas

- auth and OTP login
- user/profile APIs
- feed and post actions
- admin user/post management
- admin automation queue
- S3 upload presigning
- JWT/session refresh behavior

## Backend Conventions

- Keep controllers thin and push policy into services.
- Reuse shared DTOs and enums instead of raw strings when possible.
- Treat `ROLE_ADMIN` as the backend admin guard and `ROLE_TEST_USER` as synthetic-account behavior.
- Keep job payload/result JSON backward-compatible when extending automation job types.
- When a custom `ObjectMapper` is needed, register modules so Java time types serialize and deserialize correctly.
- Preserve the current delete semantics for admin versus user flows unless the feature explicitly changes them.

## Security And Roles

- `ROLE_ADMIN` protects `/api/admin/**`.
- `ROLE_TEST_USER` is used only for synthetic accounts and test-user auth bypass behavior.
- User role state lives on the `users` row and is reflected in JWT/session handling.

## Testing Notes

- Update or add backend tests when changing controller/service behavior, job processing, schema enforcement, or auth policy.
- Prefer service-layer tests for queue logic and auth policy.
- Add regression tests when changing deserialization, payload parsing, or older-row compatibility.

## When Editing

- If you add a new admin job type, update the enum, schema constraint, service dispatch, controller, UI, and docs together.
- If you add a new API surface, document the route and the relevant request/response shape in the appropriate subsystem docs.
- If you touch the database model, check whether the admin job detail and automation paths need compatibility updates.
