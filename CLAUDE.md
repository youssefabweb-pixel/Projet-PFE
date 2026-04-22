# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**project-management** (`com.wifakbank:project-management`) — Spring Boot backend + Angular frontend for user management, JWT auth, and a task-board demo. Business context: PFE internship / banking (`wifakbank`).

A more detailed tour of the codebase lives in `README_PROJET_POUR_IA.md` (French) — consult it before deep dives.

## Stack

- **Backend**: Java 17, Spring Boot 3.3.2 (Web, Data JPA, Security, Validation), MySQL, Hibernate, Flyway (optional), JWT (jjwt 0.12.6), springdoc-openapi 2.6.0. Single Maven module at repo root.
- **Frontend**: Angular ^21.2 + TypeScript ~5.9 (SSR via `@angular/ssr`, Express), Angular Material, Bootstrap 5, ngx-bootstrap, ngx-toastr, SweetAlert2, Chart.js. Lives in `stagepfe-front/`.
- **Tests**: backend uses Spring Boot test + H2 (profile `application-test.properties`); frontend uses Vitest via `ng test`.

## Layout

- `src/main/java/com/wifakbank/project_management/` — `config`, `controller`, `dto/{request,response}`, `entity`, `exception`, `mapper`, `repository`, `security/{config,filter,jwt}`, `service`, `audit`, `utils`, `model`, `project`. Entry point: `ProjectManagementApplication.java`.
- `src/main/resources/` — `application.properties`, `application-flyway.properties`, Flyway migrations under `db/migration/`.
- `stagepfe-front/src/app/` — `core/` (guards, interceptors, services: auth/user/api), `features/` (auth, users, tasks wired in `app.routes.ts`; other folders may be stubs), `shared/` (layout, topbar, forbidden page).
- `stagepfe-front/sneat-*/` — Sneat theme template, reference only, not part of the build.

## Commands

Backend (run from repo root):

```bash
./mvnw spring-boot:run        # dev run (Windows: mvnw.cmd)
./mvnw test                    # backend tests (H2 + Flyway)
./mvnw package -DskipTests     # build jar
```

Frontend (run from `stagepfe-front/`):

```bash
npm install
npm start         # dev server at http://localhost:4200
npm run build
npm test          # Vitest via ng test
```

## URLs & ports

- API base: `http://localhost:8092/stage_pfe` (port `SERVER_PORT`, default 8092; context path `/stage_pfe`).
- Swagger UI: `http://localhost:8092/stage_pfe/swagger-ui.html`.
- Frontend dev: `http://localhost:4200` (must match backend CORS).
- Frontend API URL lives in `stagepfe-front/src/environments/environment.ts` (and `.prod.ts`) — same value in both, adapt for real deployments.

## Configuration (env vars / Spring properties)

Defined in `application.properties` with defaults:

- `SERVER_PORT` (8092), `DB_USERNAME` (root), `DB_PASSWORD` (empty).
- `JPA_DDL_AUTO` (`update`) — Hibernate auto-updates schema by default.
- `FLYWAY_ENABLED` (`false`) — enable via `flyway` profile or `true` + `JPA_DDL_AUTO=validate`. MySQL 5.5 is not supported by Flyway Community.
- `JWT_SECRET` (dev default baked into file — do not use in prod), `JWT_EXPIRATION_SECONDS` (3600).
- `ENABLE_MANAGER_INIT_ENDPOINT` (`true`) — toggles `/api/auth/register-manager-init`.

Default DB: `wifak_local_db7` on `localhost:3306` (auto-created). Check `application.properties` for the exact value if it drifts.

## Notes for changes

- Prefer editing existing files; the Maven layout is a single module, don't split it without discussion.
- Auth roles in play: `MANAGER`, `ADMINISTRATEUR`. Only `login`, authenticated shell, `users`, and `tasks` routes are wired in `app.routes.ts` — other feature folders may be dormant.
- Task board data is mocked on the frontend — backend task endpoints may not exist yet; verify before wiring UI to real APIs.
- When adding backend migrations, prefer Flyway versioned files under `src/main/resources/db/migration/` rather than relying on `ddl-auto=update`.
