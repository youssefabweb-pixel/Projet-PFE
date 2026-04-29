import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { getHttpErrorMessage } from '../../shared/utils/http-error.util';

export interface ActionHistoryEntry {
  id: number;
  username: string;
  action: string;
  entity: string;
  projectId: number | null;
  details: string;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/history`;

  getAll(): Observable<ActionHistoryEntry[]> {
    return this.http.get<ActionHistoryEntry[]>(this.baseUrl).pipe(
      catchError((err) =>
        throwError(() => new Error(getHttpErrorMessage(err, "Impossible de charger l'historique."))),
      ),
    );
  }

  deleteOne(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      catchError((err) =>
        throwError(() => new Error(getHttpErrorMessage(err, "Impossible de supprimer l'entrée."))),
      ),
    );
  }

  deleteAll(): Observable<void> {
    return this.http.delete<void>(this.baseUrl).pipe(
      catchError((err) =>
        throwError(() => new Error(getHttpErrorMessage(err, "Impossible de supprimer l'historique."))),
      ),
    );
  }
}
