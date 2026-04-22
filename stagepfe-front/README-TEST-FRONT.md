# StagePFE Front - Guide Test Integration Backend

Ce guide permet de tester rapidement l'integration entre le frontend Angular et le backend Spring Boot (auth + CRUD users).

## 1) Prerequis

- Node.js installe (LTS recommande)
- Backend Spring Boot demarre sur:
  - `http://localhost:8092/stage_pfe`
- Base de donnees backend operationnelle

## 2) Configuration API

Le frontend utilise:

- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`

Valeur attendue:

```ts
apiBaseUrl: 'http://localhost:8092/stage_pfe'
```

## 3) Installation et lancement frontend

Depuis `stagepfe-front`:

```bash
npm install
npm start
```

Puis ouvrir:

- `http://localhost:4200/login`

Build de verification:

```bash
npm run build
```

## 4) Mapping API backend -> frontend

- `POST /api/auth/login` -> login
- `GET /api/users` -> liste users
- `GET /api/users/{id}` -> detail user
- `GET /api/users/roles` -> roles disponibles
- `POST /api/users` -> creation user
- `PUT /api/users/{id}` -> modification user
- `DELETE /api/users/{id}` -> suppression user

## 5) Parcours de test recommande

1. Ouvrir `/login`
2. Se connecter avec un compte `MANAGER`
3. Verifier redirection vers `/users`
4. Cliquer `Create user` et creer un utilisateur
5. Modifier l'utilisateur via `Edit`
6. Supprimer via `Delete` (confirmation)
7. Verifier que la liste est rafraichie

## 6) Verification Auth/JWT

- Apres login, le token JWT est stocke en local storage.
- `AuthInterceptor` ajoute automatiquement:
  - `Authorization: Bearer <token>`
- Si token invalide/expire:
  - erreur `401`
  - logout automatique
  - redirection vers `/login`

## 7) Gestion globale des erreurs HTTP

- `401`: session invalide, retour login
- `403`: acces refuse (role insuffisant)
- `500+`: message erreur serveur

Les erreurs sont affichees via la banniere globale (`ErrorBannerComponent`).

## 8) CORS backend a verifier

Autoriser l'origine Angular:

- `http://localhost:4200`

Et autoriser:

- Methodes: `GET, POST, PUT, DELETE, PATCH, OPTIONS`
- Headers: `Authorization, Content-Type`

## 9) Checklist finale (OK/NOK)

- [ ] Login manager OK
- [ ] Liste users OK
- [ ] Create user OK
- [ ] Edit user OK
- [ ] Delete user OK
- [ ] 401 gere (redirect login)
- [ ] 403 gere (message acces refuse)
- [ ] Build Angular sans erreurs

