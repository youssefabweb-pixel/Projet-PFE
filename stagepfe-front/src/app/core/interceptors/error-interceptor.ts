import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { HttpErrorService } from '../../shared/services/http-error.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const errorService = inject(HttpErrorService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401) {
          authService.logout();
          errorService.setMessage('Session expirée. Veuillez vous reconnecter.');
          void router.navigate(['/login']);
        } else if (error.status === 403) {
          void router.navigate(['/forbidden']);
        } else if (error.status >= 500) {
          errorService.setMessage('Erreur serveur. Réessayez plus tard.');
        } else {
          const fallback = error.error?.message ?? error.message ?? 'Erreur HTTP inattendue';
          errorService.setMessage(fallback);
        }

        const message = error.error?.message ?? error.message ?? 'Unexpected HTTP error';
        return throwError(() => new Error(message));
      }

      return throwError(() => new Error('Unexpected application error'));
    }),
  );
};
