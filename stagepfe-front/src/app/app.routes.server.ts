import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Pages qui ont besoin du navigateur (JWT dans localStorage, appels API vers localhost).
 * En SSR pur, elles restaient souvent coincées sur « Chargement… » après hydratation.
 */
export const serverRoutes: ServerRoute[] = [
  { path: 'login', renderMode: RenderMode.Client },
  { path: 'users', renderMode: RenderMode.Client },
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
