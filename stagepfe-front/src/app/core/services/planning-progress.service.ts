import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { getHttpErrorMessage } from '../../shared/utils/http-error.util';
import { PlanningProject, PlanningTaskStatus } from '../models/planning.models';

@Injectable({ providedIn: 'root' })
export class PlanningProgressService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api`;

  getProjects(): Observable<PlanningProject[]> {
    return this.http.get<PlanningProject[]>(`${this.baseUrl}/projects/planning`).pipe(
      catchError((err) =>
        throwError(() => new Error(getHttpErrorMessage(err, 'Impossible de charger les projets.'))),
      ),
    );
  }

  searchProjects(name: string): Observable<PlanningProject[]> {
    return this.http
      .get<PlanningProject[]>(`${this.baseUrl}/projects/search`, { params: { name } })
      .pipe(
        catchError((err) =>
          throwError(() => new Error(getHttpErrorMessage(err, 'Recherche impossible.'))),
        ),
      );
  }

  updateTaskStatus(taskId: number, status: PlanningTaskStatus): Observable<{ id: number; name: string; status: string }> {
    return this.http.put<{ id: number; name: string; status: string }>(`${this.baseUrl}/tasks/${taskId}/status`, { status }).pipe(
      catchError((err) =>
        throwError(() => new Error(getHttpErrorMessage(err, 'Mise à jour du statut impossible.'))),
      ),
    );
  }
}
