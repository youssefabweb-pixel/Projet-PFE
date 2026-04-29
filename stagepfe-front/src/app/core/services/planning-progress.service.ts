import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { getHttpErrorMessage } from '../../shared/utils/http-error.util';
import {
  MilestoneProgressSummary,
  PlanningMilestone,
  PlanningProject,
  PlanningTask,
  PlanningTaskStatus,
  ProjectProgressSummary,
} from '../models/planning.models';

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

  getProjectProgress(projectId: number): Observable<ProjectProgressSummary> {
    return this.http
      .get<ProjectProgressSummary>(`${this.baseUrl}/projects/${projectId}/planning/progress`)
      .pipe(
        catchError((err) =>
          throwError(() => new Error(getHttpErrorMessage(err, 'Impossible de charger l’avancement du projet.'))),
        ),
      );
  }

  getMilestoneProgress(milestoneId: number): Observable<MilestoneProgressSummary> {
    return this.http
      .get<MilestoneProgressSummary>(`${this.baseUrl}/milestones/${milestoneId}/planning/progress`)
      .pipe(
        catchError((err) =>
          throwError(() => new Error(getHttpErrorMessage(err, 'Impossible de charger l’avancement du jalon.'))),
        ),
      );
  }

  updateTaskProgress(taskId: number, progressPercent: number, justification?: string): Observable<PlanningTask> {
    return this.http
      .put<PlanningTask>(`${this.baseUrl}/tasks/${taskId}/progress`, { progressPercent, justification })
      .pipe(
        catchError((err) =>
          throwError(() => new Error(getHttpErrorMessage(err, 'Mise à jour de l’avancement impossible.'))),
        ),
      );
  }

  updateTaskStatus(taskId: number, status: PlanningTaskStatus): Observable<PlanningTask> {
    return this.http.put<PlanningTask>(`${this.baseUrl}/tasks/${taskId}/status`, { status }).pipe(
      catchError((err) =>
        throwError(() => new Error(getHttpErrorMessage(err, 'Mise à jour du statut impossible.'))),
      ),
    );
  }

  updateMilestonePlanningStatus(
    milestoneId: number,
    body: { status: PlanningMilestone['status']; justification?: string },
  ): Observable<PlanningMilestone> {
    return this.http
      .put<PlanningMilestone>(`${this.baseUrl}/milestones/${milestoneId}/planning/status`, body)
      .pipe(
        catchError((err) =>
          throwError(() => new Error(getHttpErrorMessage(err, 'Mise à jour du statut du jalon impossible.'))),
        ),
      );
  }

  addTaskJustification(taskId: number, justification: string): Observable<PlanningTask> {
    return this.http.post<PlanningTask>(`${this.baseUrl}/tasks/${taskId}/justification`, { justification }).pipe(
      catchError((err) =>
        throwError(() => new Error(getHttpErrorMessage(err, 'Enregistrement de la justification impossible.'))),
      ),
    );
  }

  addMilestoneJustification(milestoneId: number, justification: string): Observable<PlanningMilestone> {
    return this.http
      .post<PlanningMilestone>(`${this.baseUrl}/milestones/${milestoneId}/justification`, { justification })
      .pipe(
        catchError((err) =>
          throwError(() => new Error(getHttpErrorMessage(err, 'Enregistrement de la justification impossible.'))),
        ),
      );
  }
}
