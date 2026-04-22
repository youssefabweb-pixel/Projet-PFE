# README projet — contexte pour un LLM

## Fichiers et sources consultés pour ce document

- `pom.xml`
- `src/main/resources/application.properties`, `application-flyway.properties`
- `src/test/resources/application-test.properties`
- `src/main/resources/db/migration/*.sql` (liste des migrations)
- `src/main/java/com/wifakbank/project_management/**/*.java` (inventaire des packages : sécurité, contrôleurs, services, entités, DTO)
- `stagepfe-front/package.json`, `angular.json`
- `stagepfe-front/src/app/app.routes.ts`, `app.config.ts`
- `stagepfe-front/src/environments/environment.ts`, `environment.prod.ts`
- `stagepfe-front/src/app/core/services/auth.service.ts`, `user.service.ts`, interceptors
- `stagepfe-front/README.md`
- `stagepfe-front/src/app/features/tasks/pages/tasks-board.component.ts` (aperçu front « tâches »)

---

## 1. Nom et objectif

Application **project-management** (`com.wifakbank:project-management`, version `0.0.1-SNAPSHOT`) : backend **Spring Boot** pour la gestion d’utilisateurs et l’**authentification JWT**, couplé à un front **Angular** (`stagepfe-front`) pour connexion, administration des utilisateurs (rôles MANAGER / ADMINISTRATEUR) et une **démo UX** de tableau de tâches (données mock côté front). Contexte métier apparent : stage PFE / banque (package `wifakbank`).

---

## 2. Stack technique

| Couche | Technologie | Versions / détails |
|--------|-------------|-------------------|
| Backend | Java **17**, Spring Boot **3.3.2** | Web, Data JPA, Security, Validation |
| Persistance | **MySQL** (`mysql-connector-j`), **Hibernate**, **Flyway** (optionnel selon profil) | Schéma auth via migrations SQL quand Flyway est activé |
| Sécurité | Spring Security, **JWT** (jjwt **0.12.6**), BCrypt | Session stateless |
| API docs | **springdoc-openapi** **2.6.0** | Swagger UI |
| Front | **Angular** **^21.2**, **TypeScript** ~5.9 | SSR configuré (`@angular/ssr`, Express) |
| UI front | **Angular Material**, **Bootstrap** 5, **ngx-bootstrap**, **ngx-toastr**, **SweetAlert2**, **Chart.js** | Styles SCSS |
| Tests front | **Vitest** (via `ng test`) | Voir `package.json` |
| Tests backend | `spring-boot-starter-test`, `spring-security-test`, **H2** en mémoire | Profil test : `application-test.properties` |

---

## 3. Structure des dossiers (synthèse)

- **Racine** : `pom.xml`, `mvnw` / `mvnw.cmd` — projet Maven unique (backend).
- **`src/main/java/com/wifakbank/project_management/`** : point d’entrée `ProjectManagementApplication.java` ; packages typiques `config`, `controller`, `dto`, `entity`, `exception`, `mapper`, `repository`, `security`, `service`, `audit`.
- **`src/main/resources/`** : `application.properties`, profil Flyway, migrations **`db/migration/`** (V1–V3 auth / users).
- **`src/test/`** : tests + `application-test.properties` (H2 + Flyway).
- **`stagepfe-front/`** : application Angular principale.
  - `src/app/core/` : guards, interceptors HTTP, services (`auth`, `user`, `api`), modèles, thème, notifications.
  - `src/app/features/` : `auth`, `users`, `tasks` (routes actives dans `app.routes.ts`) ; autres dossiers (`admin`, `manager`, `formateur`, `collaborateur`, `user`) : routes / pages souvent **hors chemin principal** — vérifier les imports dans `app.routes.ts` (actuellement seules `login`, shell authentifié, `users`, `tasks` sont câblées au flux principal).
  - `src/app/shared/` : layout (shell authentifié, topbar), pages (`forbidden`), composants UI.
  - `src/environments/` : URL de l’API.
- **`stagepfe-front/sneat-*/`** : copie de thème / template **Sneat** (hors build obligatoire du `package.json` racine du front) — à traiter comme référence ou dépendance locale, pas comme cœur applicatif.

---

## 4. Comment lancer

### Backend (Spring Boot)

Prérequis : **JDK 17**, **MySQL** accessible (base par défaut `wifak_local_db1` sur `localhost:3306` selon `application.properties`).

```bash
# À la racine du dépôt (Windows)
mvnw.cmd spring-boot:run
```

Ou : `mvn spring-boot:run` si Maven est installé.

- Port par défaut : **`8092`** (surchargeable via `SERVER_PORT`).
- Context path : **`/stage_pfe`** → URL de base API : `http://localhost:8092/stage_pfe`.

### Front (Angular)

```bash
cd stagepfe-front
npm install
npm start
```

- Dev server : **`http://localhost:4200/`** (cf. CORS backend).

### Build

- Front : `cd stagepfe-front && npm run build`
- Backend : `mvnw.cmd package -DskipTests` (ou avec tests)

### Tests

- Front : `cd stagepfe-front && npm test` (`ng test`, Vitest).
- Backend : `mvnw.cmd test` (comportement attendu : H2 + Flyway en test).

---

## 5. Configuration

### Variables d’environnement / propriétés Spring (principales)

Définies dans `application.properties` avec valeurs par défaut :

| Variable / clé | Rôle |
|----------------|------|
| `SERVER_PORT` | Port serveur (défaut **8092**) |
| `DB_USERNAME`, `DB_PASSWORD` | Connexion MySQL (défaut user **root**, mot de passe vide) |
| `JPA_DDL_AUTO` | Défaut **`update`** (Hibernate met à jour le schéma) |
| `FLYWAY_ENABLED` | Défaut **`false`** (commentaires : MySQL 5.5 non supporté par Flyway Community ; sinon profil `flyway` ou `true` + `JPA_DDL_AUTO=validate`) |
| `JWT_SECRET` | Secret de signature JWT (**valeur de développement par défaut dans le fichier**) |
| `JWT_EXPIRATION_SECONDS` | Durée de vie du token (défaut **3600** s) |
| `ENABLE_MANAGER_INIT_ENDPOINT` | Active `/api/auth/register-manager-init` (défaut **true**) |

### Front

- Pas de fichier `.env` dans le dépôt.
- URL API dans `stagepfe-front/src/environments/environment.ts` et `environment.prod.ts` :  
  **`apiBaseUrl: 'http://localhost:8092/stage_pfe'`**  
  (prod et dev identiques dans le repo — à adapter pour un déploiement réel).

### OpenAPI / Swagger

- UI : chemin configuré `springdoc.swagger-ui.path=/swagger-ui.html` sous le context path →  
  **`http://localhost:8092/stage_pfe/swagger-ui.html`**

---

## 6. Architecture

### Flux principal

1. **Front** (`localhost:4200`) → HTTP(S) vers **API** `http://localhost:8092/stage_pfe`.
2. **Auth** : `POST /api/auth/login` → réponse JWT ; stockage **localStorage** (clés `token`, `role`, etc.) ; puis `GET /api/auth/me` pour synchroniser profil.
3. Requêtes suivantes : en-tête **`Authorization: Bearer <token>`** (intercepteur Angular).
4. **Base de données** : MySQL en dev ; schéma utilisateurs / audit selon entités JPA et/ou migrations Flyway.

### Endpoints backend repérés

- **`/api/auth/login`**, **`/api/auth/register-manager-init`** (bootstrap manager), **`/api/auth/me`** (JWT requis pour `me`).
- **`/api/users/**`** : CRUD / statut réservé aux rôles **`ADMINISTRATEUR`** ou **`MANAGER`** (`@PreAuthorize` sur le contrôleur).

### Front — routing actif (`app.routes.ts`)

- `/login` : module auth lazy-loadé.
- `/` : shell authentifié (`authGuard`) ; redirection vers `users`.
- `/users` : `roleGuard(['MANAGER','ADMINISTRATEUR'])` — liste utilisateurs.
- `/tasks` : tableau de tâches **mock** (pas d’API backend « tasks » dans le dépôt Java actuel).

### État applicatif

- Pas de NgRx signalé ; **services Angular** + **localStorage** pour la session ; **signals** utilisés dans certains composants (ex. board tâches).

---

## 7. Conventions

- **Packages Java** : `com.wifakbank.project_management`.
- **Rôles** (enum `Role`) : `ADMINISTRATEUR`, `MANAGER`, `CHEF_PROJET`, `MOA`, `METIER`, `DEVELOPPEMENT`.
- **Auth** : JWT stateless ; mots de passe hashés (BCrypt).
- **Front** : composants **standalone** ; routes **lazy-loaded** ; préfixe composants **`app`**.
- **HTTP** : intercepteurs `auth` puis `error` dans `app.config.ts`.

---

## 8. Points sensibles (sécurité, secrets, déploiement)

- **`JWT_SECRET`** : une valeur par défaut est **commitée** dans `application.properties` — **à remplacer impérativement** en production ; ne jamais réutiliser ce défaut exposé.
- **`/api/auth/register-manager-init`** : endpoint de bootstrap — désactiver ou protéger en prod (`ENABLE_MANAGER_INIT_ENDPOINT=false` ou retrait du `permitAll` si évolution du code).
- **CORS** : limité à **`http://localhost:4200`** dans `SecurityConfig` — ajuster pour d’autres origines en déploiement.
- **CSRF** : désactivé (API JWT classique) — cohérent pour SPA + Bearer.
- **Cookies session** : propriétés présentes dans `application.properties` ; filtre de sécurité en mode **STATELESS** — les cookies ne sont pas le mécanisme principal d’auth API.
- **Déploiement** : pas de **Dockerfile** dans ce dépôt à la racine du projet analysé ; procédure de déploiement **non documentée dans le dépôt**.

---

## 9. Fichiers clés pour un nouveau développeur

### Backend

- `pom.xml`
- `src/main/resources/application.properties`
- `src/main/java/.../ProjectManagementApplication.java`
- `src/main/java/.../security/SecurityConfig.java`
- `src/main/java/.../security/JwtAuthenticationFilter.java`, `JwtService.java`
- `src/main/java/.../controller/AuthController.java`, `UserAdminController.java`
- `src/main/java/.../entity/User.java`, `Role.java`
- `src/main/resources/db/migration/V1__init_auth_schema.sql` (et suivantes)

### Front

- `stagepfe-front/package.json`
- `stagepfe-front/src/main.ts`, `src/app/app.config.ts`, `src/app/app.routes.ts`
- `stagepfe-front/src/environments/environment.ts`
- `stagepfe-front/src/app/core/services/auth.service.ts`, `user.service.ts`
- `stagepfe-front/src/app/core/guards/auth-guard.ts`, `role-guard.ts`
- `stagepfe-front/src/app/core/interceptors/auth-interceptor.ts`

---

*Document généré à partir de l’état du dépôt ; toute information absente des fichiers est signalée explicitement ci-dessus.*
