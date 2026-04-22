import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { getHttpErrorMessage } from '../../shared/utils/http-error.util';
import { API_REQUEST_TIMEOUT_MS } from '../constants/api-timeout';
import {
  CreateUserPayload,
  UpdateUserPayload,
  User,
} from '../models/user.models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/users`;

  getAll(): Observable<User[]> {
    return this.http.get<User[]>(this.baseUrl).pipe(
      timeout(API_REQUEST_TIMEOUT_MS),
      catchError((err) =>
        throwError(
          () =>
            new Error(
              getHttpErrorMessage(err, 'Impossible de charger les utilisateurs.'),
            ),
        ),
      ),
    );
  }

  getById(id: number): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/${id}`).pipe(
      timeout(API_REQUEST_TIMEOUT_MS),
      catchError((err) =>
        throwError(
          () => new Error(getHttpErrorMessage(err, 'Impossible de charger l’utilisateur.')),
        ),
      ),
    );
  }

  getRoles(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/roles`).pipe(
      timeout(API_REQUEST_TIMEOUT_MS),
      catchError((err) =>
        throwError(
          () => new Error(getHttpErrorMessage(err, 'Impossible de charger les rôles.')),
        ),
      ),
    );
  }

  create(payload: CreateUserPayload): Observable<User> {
    return this.http.post<User>(this.baseUrl, payload).pipe(
      catchError((err) =>
        throwError(() => new Error(getHttpErrorMessage(err, 'Échec de la création.'))),
      ),
    );
  }

  update(id: number, payload: UpdateUserPayload): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/${id}`, payload).pipe(
      catchError((err) =>
        throwError(() => new Error(getHttpErrorMessage(err, 'Échec de la mise à jour.'))),
      ),
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      catchError((err) =>
        throwError(() => new Error(getHttpErrorMessage(err, 'Suppression impossible.'))),
      ),
    );
  }

  /**
   * PATCH /api/users/{id}/status — contrat Spring : query param `enabled` (voir backend).
   */
  toggleStatus(id: number, enabled: boolean): Observable<void> {
    return this.http
      .patch<User>(`${this.baseUrl}/${id}/status`, {}, { params: { enabled: String(enabled) } })
      .pipe(
        map(() => undefined),
        catchError((err) =>
          throwError(
            () => new Error(getHttpErrorMessage(err, 'Impossible de modifier le statut.')),
          ),
        ),
      );
  }
}
