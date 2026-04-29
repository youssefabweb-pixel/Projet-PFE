import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActionHistoryEntry, HistoryService } from '../../../core/services/history.service';
import { NotificationCenterService } from '../../../core/notifications/notification-center.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-history-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    DatePipe,
  ],
  template: `
    <div class="history-container">
      <header class="history-header">
        <div class="header-icon">
          <mat-icon>history</mat-icon>
        </div>
        <div class="header-text">
          <h2 mat-dialog-title>Historique des actions</h2>
          <p class="header-subtitle">Traçabilité complète de toutes les opérations effectuées.</p>
        </div>
        <button mat-icon-button class="close-btn" (click)="close()" matTooltip="Fermer">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <div class="history-toolbar">
        <span class="entry-count" *ngIf="!loading()">
          {{ entries().length }} entrée{{ entries().length !== 1 ? 's' : '' }}
        </span>
        <div class="spacer"></div>
        <button
          mat-stroked-button
          color="warn"
          class="delete-all-btn"
          [disabled]="loading() || entries().length === 0"
          (click)="confirmDeleteAll()"
          matTooltip="Supprimer tout l'historique">
          <mat-icon>delete_sweep</mat-icon>
          Supprimer tout
        </button>
      </div>

      <mat-dialog-content class="history-content">
        @if (loading()) {
          <div class="loading-state">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Chargement de l'historique...</p>
          </div>
        } @else if (entries().length === 0) {
          <div class="empty-state">
            <mat-icon>inbox</mat-icon>
            <p>Aucune action enregistrée pour le moment.</p>
          </div>
        } @else {
          <div class="history-table-wrapper">
            <table class="history-table">
              <thead>
                <tr>
                  <th class="col-date">Date / Heure</th>
                  <th class="col-user">Utilisateur</th>
                  <th class="col-action">Action</th>
                  <th class="col-entity">Entité</th>
                  <th class="col-details">Détails</th>
                  <th class="col-actions"></th>
                </tr>
              </thead>
              <tbody>
                @for (entry of entries(); track entry.id) {
                  <tr class="history-row" [class]="rowClass(entry.action)">
                    <td class="col-date">
                      <span class="timestamp">{{ entry.timestamp | date:'dd/MM/yyyy HH:mm:ss' }}</span>
                    </td>
                    <td class="col-user">
                      <span class="user-badge">
                        <mat-icon class="user-icon">person</mat-icon>
                        {{ entry.username }}
                      </span>
                    </td>
                    <td class="col-action">
                      <span class="action-chip" [attr.data-action]="entry.action">
                        {{ actionLabel(entry.action) }}
                      </span>
                    </td>
                    <td class="col-entity">
                      <span class="entity-badge" [attr.data-entity]="entry.entity">
                        {{ entityLabel(entry.entity) }}
                      </span>
                    </td>
                    <td class="col-details">
                      <span class="details-text" [matTooltip]="entry.details">{{ entry.details }}</span>
                    </td>
                    <td class="col-actions">
                      <button
                        mat-icon-button
                        color="warn"
                        class="delete-btn"
                        [disabled]="deleting() === entry.id"
                        (click)="deleteOne(entry)"
                        matTooltip="Supprimer cette entrée">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="close()" class="btn-close">Fermer</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .history-container {
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      width: 100%;
      overflow: hidden;
    }

    .history-header {
      background: linear-gradient(135deg, var(--primary, #003087) 0%, var(--primary-light, #0055cc) 100%);
      color: white;
      padding: 24px 28px;
      display: flex;
      align-items: center;
      gap: 20px;
      border-bottom: 4px solid var(--accent, #e30613);
      flex-shrink: 0;
    }

    .header-icon {
      background: rgba(255, 255, 255, 0.2);
      width: 64px;
      height: 64px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      mat-icon { font-size: 36px; width: 36px; height: 36px; }
    }

    .header-text { flex: 1; }

    h2[mat-dialog-title] {
      margin: 0 !important;
      padding: 0 !important;
      font-size: 1.75rem;
      font-weight: 800;
      color: white;
    }

    .header-subtitle {
      margin: 6px 0 0;
      font-size: 1rem;
      opacity: 0.9;
    }

    .close-btn {
      color: white;
      opacity: 0.8;
      &:hover { opacity: 1; }
    }

    .history-toolbar {
      display: flex;
      align-items: center;
      padding: 12px 24px;
      background: var(--neutral-50, #f5f7fb);
      border-bottom: 1px solid var(--border, rgba(0, 48, 135, 0.1));
      gap: 12px;
      flex-shrink: 0;
    }

    .entry-count {
      font-size: 0.875rem;
      color: var(--text-muted, #6b7280);
      font-weight: 600;
    }

    .spacer { flex: 1; }

    .delete-all-btn {
      font-size: 0.85rem;
      font-weight: 700;
      mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }
    }

    mat-dialog-content.history-content {
      padding: 0 !important;
      margin: 0 !important;
      flex: 1;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      min-height: 200px;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      gap: 16px;
      color: var(--text-muted);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      gap: 12px;
      color: var(--text-muted);
      mat-icon { font-size: 48px; width: 48px; height: 48px; opacity: 0.4; }
      p { margin: 0; font-size: 1rem; }
    }

    .history-table-wrapper {
      overflow-x: auto;
    }

    .history-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;

      thead tr {
        background: var(--primary, #003087);
        color: white;
        position: sticky;
        top: 0;
        z-index: 10;
      }

      th {
        padding: 12px 14px;
        text-align: left;
        font-weight: 700;
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        white-space: nowrap;
      }

      tbody tr {
        border-bottom: 1px solid var(--border, rgba(0, 48, 135, 0.08));
        transition: background 0.15s;
        &:hover { background: rgba(0, 48, 135, 0.04); }
      }

      td {
        padding: 10px 14px;
        vertical-align: middle;
      }
    }

    .history-row {
      &.row--create { border-left: 3px solid #16a34a; }
      &.row--update { border-left: 3px solid #2563eb; }
      &.row--delete { border-left: 3px solid #dc2626; }
      &.row--validate { border-left: 3px solid #7c3aed; }
      &.row--complete { border-left: 3px solid #16a34a; }
    }

    .timestamp {
      font-family: monospace;
      font-size: 0.8rem;
      color: var(--text-muted, #6b7280);
      white-space: nowrap;
    }

    .user-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-weight: 600;
      color: var(--primary, #003087);
    }

    .user-icon {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
    }

    .action-chip {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;

      &[data-action="CREATE"] { background: #dcfce7; color: #166534; }
      &[data-action="UPDATE"] { background: #dbeafe; color: #1e40af; }
      &[data-action="DELETE"] { background: #fee2e2; color: #991b1b; }
      &[data-action="VALIDATE"] { background: #ede9fe; color: #5b21b6; }
      &[data-action="COMPLETE"] { background: #dcfce7; color: #166534; }
      &[data-action="LOGIN"] { background: #fef9c3; color: #713f12; }
    }

    .entity-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 600;
      background: var(--neutral-100, #e5e7eb);
      color: var(--text, #374151);

      &[data-entity="PROJECT"] { background: #e0f2fe; color: #0369a1; }
      &[data-entity="MILESTONE"] { background: #fef3c7; color: #92400e; }
      &[data-entity="TASK"] { background: #f3e8ff; color: #6b21a8; }
    }

    .details-text {
      display: block;
      max-width: 320px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--text-muted, #6b7280);
      font-size: 0.82rem;
      cursor: default;
    }

    .delete-btn {
      opacity: 0.6;
      transition: opacity 0.15s;
      &:hover { opacity: 1; }
    }

    mat-dialog-actions {
      padding: 14px 24px !important;
      background: var(--neutral-50, #f5f7fb);
      border-top: 1px solid var(--border, rgba(0, 48, 135, 0.1));
      flex-shrink: 0;
    }

    .btn-close {
      height: 44px;
      font-weight: 600;
    }

    @media (max-width: 900px) {
      .history-header {
        padding: 16px 18px;
        gap: 14px;
      }
      .header-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        mat-icon { font-size: 24px; width: 24px; height: 24px; }
      }
      h2[mat-dialog-title] { font-size: 1.25rem; }
    }
  `],
})
export class HistoryDialogComponent implements OnInit {
  private readonly historyService = inject(HistoryService);
  private readonly notifications = inject(NotificationCenterService);
  private readonly dialogRef = inject(MatDialogRef<HistoryDialogComponent>);

  readonly loading = signal(false);
  readonly entries = signal<ActionHistoryEntry[]>([]);
  readonly deleting = signal<number | null>(null);

  ngOnInit(): void {
    this.load();
  }

  close(): void {
    this.dialogRef.close();
  }

  deleteOne(entry: ActionHistoryEntry): void {
    if (!confirm(`Supprimer cette entrée d'historique ?`)) return;
    this.deleting.set(entry.id);
    this.historyService.deleteOne(entry.id).pipe(
      finalize(() => this.deleting.set(null)),
    ).subscribe({
      next: () => {
        this.entries.update((list) => list.filter((e) => e.id !== entry.id));
        this.notifications.success('Entrée supprimée.', 'Historique');
      },
      error: (err: Error) => this.notifications.error(err.message, 'Historique'),
    });
  }

  confirmDeleteAll(): void {
    if (!confirm('Supprimer TOUT l\'historique ? Cette action est irréversible.')) return;
    this.loading.set(true);
    this.historyService.deleteAll().pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: () => {
        this.entries.set([]);
        this.notifications.success('Historique effacé.', 'Historique');
      },
      error: (err: Error) => this.notifications.error(err.message, 'Historique'),
    });
  }

  rowClass(action: string): string {
    return `row--${action.toLowerCase()}`;
  }

  actionLabel(action: string): string {
    const labels: Record<string, string> = {
      CREATE: 'Créer',
      UPDATE: 'Modifier',
      DELETE: 'Supprimer',
      VALIDATE: 'Valider',
      COMPLETE: 'Terminer',
      LOGIN: 'Connexion',
    };
    return labels[action] ?? action;
  }

  entityLabel(entity: string): string {
    const labels: Record<string, string> = {
      PROJECT: 'Projet',
      MILESTONE: 'Jalon',
      TASK: 'Tâche',
    };
    return labels[entity] ?? entity;
  }

  private load(): void {
    this.loading.set(true);
    this.historyService.getAll().pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (data) => this.entries.set(data),
      error: (err: Error) => this.notifications.error(err.message, 'Historique'),
    });
  }
}
