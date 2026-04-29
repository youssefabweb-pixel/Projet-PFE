import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { getHttpErrorMessage } from '../../shared/utils/http-error.util';
import { API_REQUEST_TIMEOUT_MS } from '../constants/api-timeout';
import {
  Project,
  ProjectCreatePayload,
  ProjectUpdatePayload,
  DocumentMetadata,
} from '../models/project.models';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/projects`;

  getAll(): Observable<Project[]> {
    return this.http.get<Project[]>(this.baseUrl).pipe(
      timeout(API_REQUEST_TIMEOUT_MS),
      catchError((err) =>
        throwError(
          () => new Error(getHttpErrorMessage(err, 'Impossible de charger les projets.')),
        ),
      ),
    );
  }

  getById(id: number): Observable<Project> {
    return this.http.get<Project>(`${this.baseUrl}/${id}`).pipe(
      timeout(API_REQUEST_TIMEOUT_MS),
      catchError((err) =>
        throwError(
          () => new Error(getHttpErrorMessage(err, 'Impossible de charger le projet.')),
        ),
      ),
    );
  }

  create(payload: ProjectCreatePayload): Observable<Project> {
    return this.http.post<Project>(this.baseUrl, payload).pipe(
      catchError((err) =>
        throwError(() => new Error(getHttpErrorMessage(err, 'Création impossible.'))),
      ),
    );
  }

  update(id: number, payload: ProjectUpdatePayload): Observable<Project> {
    return this.http.put<Project>(`${this.baseUrl}/${id}`, payload).pipe(
      catchError((err) =>
        throwError(() => new Error(getHttpErrorMessage(err, 'Mise à jour impossible.'))),
      ),
    );
  }

  /** Chef de projet : soumet la planification pour validation PMO (DRAFT → SOUMIS). */
  submitPlanning(id: number): Observable<Project> {
    return this.http.put<Project>(`${this.baseUrl}/${id}/planning/submit`, {}).pipe(
      catchError((err) =>
        throwError(() => new Error(getHttpErrorMessage(err, 'Soumission du planning impossible.'))),
      ),
    );
  }

  /** PMO : valide la planification soumise (SOUMIS → VALIDE). */
  validatePlanning(id: number): Observable<Project> {
    return this.http.put<Project>(`${this.baseUrl}/${id}/planning/validate`, {}).pipe(
      catchError((err) =>
        throwError(() => new Error(getHttpErrorMessage(err, 'Validation du planning impossible.'))),
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

  // ── Documents ──────────────────────────────────────────────

  uploadDocument(deliverableId: number, file: File): Observable<DocumentMetadata> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<DocumentMetadata>(`${environment.apiBaseUrl}/api/deliverables/${deliverableId}/documents`, formData).pipe(
      catchError((err) =>
        throwError(() => new Error(getHttpErrorMessage(err, "Échec de l'upload."))),
      ),
    );
  }

  downloadDocument(docId: number): Observable<Blob> {
    return this.http.get(`${environment.apiBaseUrl}/api/documents/${docId}/download`, {
      responseType: 'blob'
    }).pipe(
      catchError((err) =>
        throwError(() => new Error(getHttpErrorMessage(err, 'Échec du téléchargement.'))),
      ),
    );
  }

  deleteDocument(docId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/api/documents/${docId}`).pipe(
      catchError((err) =>
        throwError(() => new Error(getHttpErrorMessage(err, 'Échec de la suppression du document.'))),
      ),
    );
  }
}
