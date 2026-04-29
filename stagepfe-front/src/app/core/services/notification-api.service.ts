import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { getHttpErrorMessage } from '../../shared/utils/http-error.util';
import { API_REQUEST_TIMEOUT_MS } from '../constants/api-timeout';

export type ServerNotificationType =
  | 'PROJECT_ASSIGNED_AS_CHEF'
  | 'PROJECT_MEMBER_ADDED'
  | 'PROJECT_PROGRESS_UPDATED'
  | 'PROJECT_COMPLETED'
  | 'PROJECT_DELAYED'
  | 'MILESTONE_DELAYED'
  | 'NEW_PROJECT_CREATED'
  | 'TASK_ASSIGNED';

export interface ServerNotification {
  id: number;
  type: ServerNotificationType | string;
  message: string;
  projectId: number | null;
  read: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/notifications`;

  list(): Observable<ServerNotification[]> {
    return this.http.get<ServerNotification[]>(this.baseUrl).pipe(
      timeout(API_REQUEST_TIMEOUT_MS),
      catchError((err) =>
        throwError(() => new Error(getHttpErrorMessage(err, 'Impossible de charger les notifications.'))),
      ),
    );
  }

  unreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/unread-count`).pipe(
      timeout(API_REQUEST_TIMEOUT_MS),
      catchError(() => throwError(() => new Error('Impossible de charger le nombre de notifications.'))),
    );
  }

  markRead(id: number): Observable<ServerNotification> {
    return this.http.patch<ServerNotification>(`${this.baseUrl}/${id}/read`, {}).pipe(
      catchError((err) =>
        throwError(() => new Error(getHttpErrorMessage(err, 'Marquage impossible.'))),
      ),
    );
  }

  markAllRead(): Observable<unknown> {
    return this.http.patch(`${this.baseUrl}/read-all`, {}).pipe(
      catchError((err) =>
        throwError(() => new Error(getHttpErrorMessage(err, 'Marquage impossible.'))),
      ),
    );
  }
}
