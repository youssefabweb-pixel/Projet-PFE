import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Milestone, MilestoneInput, Task, TaskInput } from '../models/project.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MilestoneTaskService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/projects`;

  /** Récupérer tous les jalons d'un projet (inclut les tâches). */
  getMilestones(projectId: number): Observable<Milestone[]> {
    return this.http.get<Milestone[]>(`${this.baseUrl}/${projectId}/milestones`);
  }

  /** Créer un nouveau jalon. */
  createMilestone(projectId: number, jalon: MilestoneInput): Observable<Milestone> {
    return this.http.post<Milestone>(`${this.baseUrl}/${projectId}/milestones`, jalon);
  }

  /** Mettre à jour un jalon existant. */
  updateMilestone(id: number, jalon: MilestoneInput): Observable<Milestone> {
    return this.http.put<Milestone>(`${this.baseUrl}/milestones/${id}`, jalon);
  }

  /** Supprimer un jalon. */
  deleteMilestone(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/milestones/${id}`);
  }

  /** Ajouter une tâche à un jalon. */
  createTask(milestoneId: number, task: TaskInput): Observable<Task> {
    return this.http.post<Task>(`${this.baseUrl}/milestones/${milestoneId}/tasks`, task);
  }

  /** Mettre à jour une tâche. */
  updateTask(id: number, task: TaskInput): Observable<Task> {
    return this.http.put<Task>(`${this.baseUrl}/tasks/${id}`, task);
  }

  /** Supprimer une tâche. */
  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/tasks/${id}`);
  }
}
