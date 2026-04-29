import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { getHttpErrorMessage } from '../../shared/utils/http-error.util';

export interface TaskDocumentEntry {
  id: number;
  taskId: number;
  filename: string;
  contentType: string;
  size: number;
  uploadedAt: string;
  downloadUrl: string;
}

@Injectable({ providedIn: 'root' })
export class TaskDocumentService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = `${environment.apiBaseUrl}`;

  upload(taskId: number, file: File): Observable<TaskDocumentEntry> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<TaskDocumentEntry>(`${this.apiBase}/api/tasks/${taskId}/documents`, form).pipe(
      catchError((err) =>
        throwError(() => new Error(getHttpErrorMessage(err, 'Impossible de téléverser le fichier.'))),
      ),
    );
  }

  list(taskId: number): Observable<TaskDocumentEntry[]> {
    return this.http.get<TaskDocumentEntry[]>(`${this.apiBase}/api/tasks/${taskId}/documents`).pipe(
      catchError((err) =>
        throwError(() => new Error(getHttpErrorMessage(err, 'Impossible de charger les documents.'))),
      ),
    );
  }

  delete(docId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/api/task-documents/${docId}`).pipe(
      catchError((err) =>
        throwError(() => new Error(getHttpErrorMessage(err, 'Impossible de supprimer le document.'))),
      ),
    );
  }

  /** Returns the full download URL for a document (includes the context path). */
  downloadUrl(doc: TaskDocumentEntry): string {
    return `${this.apiBase}${doc.downloadUrl}`;
  }

  isImage(doc: TaskDocumentEntry): boolean {
    return doc.contentType?.startsWith('image/') ?? false;
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  fileIcon(contentType: string): string {
    if (contentType?.startsWith('image/')) return 'image';
    if (contentType === 'application/pdf') return 'picture_as_pdf';
    if (contentType?.includes('word')) return 'description';
    if (contentType?.includes('sheet') || contentType?.includes('excel')) return 'table_chart';
    if (contentType?.includes('presentation') || contentType?.includes('powerpoint')) return 'slideshow';
    if (contentType?.startsWith('text/')) return 'article';
    return 'attach_file';
  }
}
