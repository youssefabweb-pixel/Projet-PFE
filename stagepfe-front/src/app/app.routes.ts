import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';
import { ForbiddenPageComponent } from './shared/pages/forbidden-page.component';

/** Accès module fiches projets : tous les rôles (filtrage par visibilité côté API). */
const PROJECT_MODULE_ROLES = ['ADMINISTRATEUR', 'MANAGER', 'MOA', 'METIER', 'DEVELOPPEMENT'] as const;

export const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  { path: 'forbidden', component: ForbiddenPageComponent },
  {
    path: '',
    loadComponent: () =>
      import('./shared/layout/authenticated-shell/authenticated-shell.component').then(
        (m) => m.AuthenticatedShellComponent,
      ),
    canActivate: [authGuard],
    children: [
      /** MOA n’accède pas aux projets : accueil sur les tâches (voir login + garde `projects`). */
      { path: '', pathMatch: 'full', redirectTo: 'tasks' },
      {
        path: 'projects',
        canActivate: [roleGuard([...PROJECT_MODULE_ROLES])],
        loadComponent: () =>
          import('./features/projects/pages/projects-page.component').then((m) => m.ProjectsPageComponent),
      },
      {
        path: 'users',
        canActivate: [roleGuard(['ADMINISTRATEUR'])],
        loadComponent: () =>
          import('./features/users/pages/users-list-page.component').then((m) => m.UsersListPageComponent),
      },
      {
        path: 'tasks',
        loadComponent: () =>
          import('./features/planning/pages/planning-progress-page.component').then(
            (m) => m.PlanningProgressPageComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
