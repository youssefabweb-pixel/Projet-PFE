import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';

/** Message lisible pour l’utilisateur (évite d’afficher du JSON brut). */
export function getHttpErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof TimeoutError) {
    return 'La requête a pris trop de temps.';
  }
  if (error instanceof HttpErrorResponse) {
    const body = error.error;
    if (body && typeof body === 'object' && 'message' in body) {
      const m = (body as { message?: unknown }).message;
      if (typeof m === 'string' && m.trim()) {
        return m;
      }
    }
    if (typeof body === 'string' && body.trim() && !body.trim().startsWith('{')) {
      return body;
    }
    if (error.status === 0) {
      return 'Erreur réseau. Vérifiez votre connexion.';
    }
    if (error.status === 404 && error.url?.includes('/api/users')) {
      return 'Utilisateur introuvable.';
    }
    if (error.status === 409) {
      return 'Un utilisateur avec cet email/username existe déjà.';
    }
    if (error.status >= 500) {
      return 'Erreur serveur. Réessayez plus tard.';
    }
    return fallback;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
