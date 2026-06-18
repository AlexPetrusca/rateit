# Backend Agent Notes

Backend-specific notes. Follow root instructions first.

## Scope

Spring Boot service with JPA entities, REST controllers, background jobs, security, and S3 integration.

## Commands

- `./mvnw -q test`
- `./mvnw -q -DskipTests compile`
- `./mvnw spring-boot:run`
- `./scripts/dev.sh` for local backend auto-refresh; it runs Spring Boot and recompiles when `src/main/java` or `src/main/resources` changes so devtools can restart the app.

## Backend Conventions

- Keep controllers thin and push policy into services.
- Reuse shared DTOs and enums instead of raw strings when possible.
- Treat `ROLE_ADMIN` as the backend admin guard and `ROLE_TEST_USER` as synthetic-account behavior.
- Keep job payload/result JSON backward-compatible when extending automation job types.
- When a custom `ObjectMapper` is needed, register modules so Java time types serialize and deserialize correctly.
- Preserve the current delete semantics for admin versus user flows unless the feature explicitly changes them.

## Testing Notes

- Update or add backend tests when changing controller/service behavior, job processing, schema enforcement, or auth policy.
- Prefer service-layer tests for queue logic and auth policy.
- Add regression tests when changing deserialization, payload parsing, or older-row compatibility.

## When Editing

- If you add a new admin job type, update the enum, schema constraint, service dispatch, controller, UI, and docs together.
- If you add a new API surface, document the route and the relevant request/response shape in the appropriate subsystem docs.
- If you touch the database model, check whether the admin job detail and automation paths need compatibility updates.
