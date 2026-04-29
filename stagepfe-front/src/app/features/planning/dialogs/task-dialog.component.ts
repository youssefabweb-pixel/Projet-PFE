import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { Task, TaskDocumentEntry, TaskInput, UserSummary } from '../../../core/models/project.models';
import { TaskDocumentService } from '../../../core/services/task-document.service';

export interface SiblingTaskOption {
  id: number;
  title: string;
}

export interface TaskDialogData {
  mode: 'create' | 'edit';
  task?: Task;
  members: UserSummary[];
  /** Autres tâches du même jalon (exclure la tâche courante en édition) pour dépendances multiples. */
  siblingTasks?: SiblingTaskOption[];
  /** Existing documents for edit mode. */
  existingDocuments?: TaskDocumentEntry[];
}

@Component({
  selector: 'app-task-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatDatepickerModule,
    MatTooltipModule,
  ],
  providers: [provideNativeDateAdapter(), { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' }],
  template: `
    <div class="dialog-container">
      <header class="dialog-header">
        <div class="header-icon">
          <mat-icon>assignment</mat-icon>
        </div>
        <div class="header-text">
          <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Nouvelle Tâche' : 'Modifier la Tâche' }}</h2>
          <p class="header-subtitle">Définissez les responsabilités et le suivi de cette action.</p>
        </div>
      </header>

      <mat-dialog-content>
        <form [formGroup]="form" class="task-form">

          <!-- Section 1 : Informations de base -->
          <section class="form-section">
            <h3 class="section-title">Informations de base</h3>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Titre de la tâche *</mat-label>
              <input matInput formControlName="title" placeholder="Ex: Conception de l'architecture" />
              <mat-error *ngIf="form.get('title')?.hasError('required')">Le titre est obligatoire</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description détaillée</mat-label>
              <textarea matInput formControlName="description" rows="3" placeholder="Précisez le périmètre de cette action..."></textarea>
            </mat-form-field>
          </section>

          <!-- Section 2 : Planification -->
          <section class="form-section">
            <h3 class="section-title">Planification</h3>
            <div class="grid-row grid-row--4">
              <mat-form-field appearance="outline" class="date-field">
                <mat-label>Date de début</mat-label>
                <input matInput [matDatepicker]="taskStartPicker" formControlName="startDate" placeholder="jj/mm/aaaa" autocomplete="off" />
                <mat-datepicker-toggle matIconSuffix [for]="taskStartPicker" />
                <mat-error *ngIf="form.get('startDate')?.hasError('matDatepickerParse')">Date invalide</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="date-field">
                <mat-label>Date de fin prévue</mat-label>
                <input matInput [matDatepicker]="taskEndPicker" formControlName="endDate" placeholder="jj/mm/aaaa" autocomplete="off" />
                <mat-datepicker-toggle matIconSuffix [for]="taskEndPicker" />
                <mat-error *ngIf="form.get('endDate')?.hasError('matDatepickerParse')">Date invalide</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Assigné à</mat-label>
                <mat-select formControlName="assigneeId">
                  <mat-option [value]="null">Non assigné</mat-option>
                  <mat-option *ngFor="let member of data.members" [value]="member.id">
                    {{ member.username }}
                  </mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Priorité</mat-label>
                <mat-select formControlName="priority">
                  <mat-option value="BASSE">⬇ Basse</mat-option>
                  <mat-option value="MOYENNE">➡ Moyenne</mat-option>
                  <mat-option value="HAUTE">⬆ Haute</mat-option>
                  <mat-option value="CRITIQUE">🔴 Critique</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <mat-datepicker #taskStartPicker panelClass="wb-datepicker-panel" />
            <mat-datepicker #taskEndPicker panelClass="wb-datepicker-panel" />
          </section>

          <!-- Section 3 : Suivi opérationnel -->
          <section class="form-section">
            <h3 class="section-title">Suivi opérationnel</h3>
            <div class="grid-row grid-row--3">
              <mat-form-field appearance="outline">
                <mat-label>Statut actuel</mat-label>
                <mat-select formControlName="status">
                  <mat-option value="NOT_STARTED">⚪ Non démarré</mat-option>
                  <mat-option value="IN_PROGRESS">🔵 En cours</mat-option>
                  <mat-option value="DONE">🟢 Terminé</mat-option>
                  <mat-option value="EN_RETARD">🟠 En retard</mat-option>
                  <mat-option value="BLOQUE">🔴 Bloqué</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" *ngIf="data.siblingTasks?.length" class="span-2">
                <mat-label>Dépend de (tâches du même jalon)</mat-label>
                <mat-select formControlName="dependencyTaskIds" multiple>
                  <mat-option *ngFor="let s of data.siblingTasks" [value]="s.id">{{ s.title }}</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="progress-container">
              <div class="progress-header">
                <div class="progress-info">
                  <mat-icon class="progress-icon">speed</mat-icon>
                  <span class="progress-label">Avancement de la tâche</span>
                </div>
                <span class="progress-value">{{ form.get('progressPercent')?.value }}%</span>
              </div>
              <div class="progress-track">
                <input type="range" formControlName="progressPercent" min="0" max="100" step="5" class="wb-range-input">
                <div class="progress-fill-bar">
                  <div class="progress-fill" [style.width.%]="form.get('progressPercent')?.value"></div>
                </div>
              </div>
              <div class="progress-ticks">
                <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
              </div>
            </div>
          </section>

          <!-- Section 4 : Livrable -->
          <section class="form-section">
            <h3 class="section-title">Livrable</h3>

            <!-- Zone d'upload fichier -->
            <div class="upload-zone"
                 [class.upload-zone--dragover]="isDragOver"
                 (click)="triggerFileInput()"
                 (dragover)="onDragOver($event)"
                 (dragleave)="onDragLeave()"
                 (drop)="onDrop($event)">
              <input #fileInput type="file" class="hidden-input"
                     accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
                     (change)="onFileSelected($event)" />
              <mat-icon class="upload-icon">cloud_upload</mat-icon>
              <span class="upload-primary">Cliquez ou glissez un fichier ici</span>
              <span class="upload-hint">Images, PDF, Word, Excel, PowerPoint — max 20 Mo</span>
            </div>

            <!-- Fichier sélectionné (nouveau — pas encore uploadé) -->
            <div class="pending-file" *ngIf="pendingFile()">
              <div class="pending-file__icon">
                <mat-icon>{{ docService.fileIcon(pendingFile()!.type) }}</mat-icon>
              </div>
              <div class="pending-file__info">
                <span class="pending-file__name">{{ pendingFile()!.name }}</span>
                <span class="pending-file__size">{{ docService.formatSize(pendingFile()!.size) }}</span>
              </div>
              <span class="pending-badge">Prêt à envoyer</span>
              <button mat-icon-button color="warn" (click)="removePendingFile()" matTooltip="Retirer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <!-- Fichiers déjà uploadés (mode édition) -->
            <div class="existing-docs" *ngIf="existingDocs().length > 0">
              <p class="existing-docs__title">Fichiers attachés</p>
              <div class="doc-item" *ngFor="let doc of existingDocs()">
                <div class="doc-item__icon" [class.doc-item__icon--image]="docService.isImage(doc)">
                  <mat-icon>{{ docService.fileIcon(doc.contentType) }}</mat-icon>
                </div>
                <div class="doc-item__info">
                  <span class="doc-item__name">{{ doc.filename }}</span>
                  <span class="doc-item__meta">{{ docService.formatSize(doc.size) }}</span>
                </div>
                <a [href]="docService.downloadUrl(doc)" target="_blank" rel="noopener"
                   mat-icon-button matTooltip="Télécharger / Voir" (click)="$event.stopPropagation()">
                  <mat-icon>open_in_new</mat-icon>
                </a>
                <button mat-icon-button color="warn" matTooltip="Supprimer"
                        (click)="removeExistingDoc(doc); $event.stopPropagation()">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>

            <!-- Lien externe (optionnel) -->
            <div class="external-link-toggle">
              <button mat-button type="button" (click)="showExternalLink.set(!showExternalLink())">
                <mat-icon>{{ showExternalLink() ? 'expand_less' : 'add_link' }}</mat-icon>
                {{ showExternalLink() ? 'Masquer le lien externe' : 'Ajouter un lien externe' }}
              </button>
            </div>
            <div class="grid-row grid-row--2" *ngIf="showExternalLink()">
              <mat-form-field appearance="outline">
                <mat-label>URL externe</mat-label>
                <mat-icon matPrefix class="field-prefix-icon">link</mat-icon>
                <input matInput formControlName="deliverableUrl" placeholder="https://…" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Libellé du lien</mat-label>
                <mat-icon matPrefix class="field-prefix-icon">label</mat-icon>
                <input matInput formControlName="deliverableLabel" placeholder="Document SharePoint, Confluence…" />
              </mat-form-field>
            </div>
          </section>

          <!-- Section 5 : Justification (conditionnelle) -->
          <section class="form-section" *ngIf="showJustification()">
            <div class="alert-box warning">
              <mat-icon>warning</mat-icon>
              <span>Ce statut nécessite une justification obligatoire (cause racine du retard ou blocage).</span>
            </div>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Justification détaillée</mat-label>
              <textarea matInput formControlName="justification" rows="3" placeholder="Décrivez la cause racine du retard ou du blocage..."></textarea>
              <mat-error *ngIf="form.get('justification')?.hasError('required')">La justification est obligatoire</mat-error>
            </mat-form-field>
          </section>

        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <span class="validation-hint" *ngIf="submitAttempted && form.invalid">
          {{ validationHint() }}
        </span>
        <button mat-button (click)="onCancel()" class="btn-cancel">Annuler</button>
        <button mat-raised-button color="primary" (click)="onSave()" class="btn-save">
          <mat-icon>{{ data.mode === 'create' ? 'add_task' : 'save' }}</mat-icon>
          {{ data.mode === 'create' ? 'Créer la tâche' : 'Enregistrer les modifications' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container {
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      width: 100%;
      overflow: hidden;
    }

    /* ── Header ────────────────────────────────────── */
    .dialog-header {
      background: linear-gradient(135deg, var(--primary, #003087) 0%, var(--primary-light, #0055cc) 100%);
      color: white;
      padding: 24px 28px;
      display: flex;
      align-items: center;
      gap: 24px;
      border-bottom: 4px solid var(--accent, #e30613);
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

    /* ── Content ───────────────────────────────────── */
    mat-dialog-content {
      padding: 20px 24px !important;
      margin: 0;
      max-height: 62vh;
      overflow-y: auto !important;
      overflow-x: hidden !important;
    }

    ::ng-deep .mat-mdc-form-field-subscript-wrapper { font-size: 0.75rem; }

    .task-form {
      display: flex;
      flex-direction: column;
      gap: 28px;
      width: 100%;
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* ── Section title ─────────────────────────────── */
    .section-title {
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-weight: 800;
      color: var(--primary, #003087);
      margin: 0 0 8px 0;
      display: flex;
      align-items: center;
      gap: 8px;
      &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--border, rgba(0,48,135,0.15));
      }
    }

    /* ── Grids ─────────────────────────────────────── */
    .grid-row {
      display: grid;
      gap: 16px;
    }
    .grid-row--2 { grid-template-columns: 1fr 1fr; }
    .grid-row--3 { grid-template-columns: 1fr 1fr 1fr; }
    .grid-row--4 { grid-template-columns: 1fr 1fr 1fr 1fr; }

    .span-2 { grid-column: span 2; }

    .full-width { width: 100%; }
    .date-field input { letter-spacing: 0.02em; font-weight: 600; }

    .field-prefix-icon {
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
      color: var(--primary, #003087);
      opacity: 0.6;
      margin-right: 4px;
    }

    /* ── Progress bar ──────────────────────────────── */
    .progress-container {
      background: var(--neutral-50, #f5f7fb);
      padding: 18px 20px;
      border-radius: 12px;
      border: 1px solid var(--border, rgba(0,48,135,0.12));
    }
    .progress-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .progress-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .progress-icon {
      font-size: 20px !important;
      width: 20px !important;
      height: 20px !important;
      color: var(--primary, #003087);
    }
    .progress-label {
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--primary, #003087);
    }
    .progress-value {
      font-size: 1.3rem;
      font-weight: 900;
      color: var(--primary, #003087);
      min-width: 52px;
      text-align: right;
    }
    .progress-track {
      position: relative;
      height: 24px;
      margin-bottom: 8px;
    }
    .wb-range-input {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 24px;
      opacity: 0;
      cursor: pointer;
      z-index: 2;
      margin: 0;
    }
    .progress-fill-bar {
      position: absolute;
      inset: 6px 0;
      height: 12px;
      background: var(--border, rgba(0,48,135,0.12));
      border-radius: 99px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--primary, #003087), var(--primary-light, #0055cc));
      border-radius: 99px;
      transition: width 0.2s ease;
    }
    .progress-ticks {
      display: flex;
      justify-content: space-between;
      font-size: 0.72rem;
      color: var(--text-muted, #6b7280);
      font-weight: 600;
    }

    /* ── File upload zone ──────────────────────────── */
    .hidden-input { display: none; }

    .upload-zone {
      border: 2px dashed var(--border, rgba(0,48,135,0.25));
      border-radius: 14px;
      padding: 28px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
      background: var(--neutral-50, #f5f7fb);
      &:hover, &--dragover {
        border-color: var(--primary, #003087);
        background: rgba(0, 48, 135, 0.04);
      }
    }
    .upload-icon {
      font-size: 40px !important;
      width: 40px !important;
      height: 40px !important;
      color: var(--primary, #003087);
      opacity: 0.6;
    }
    .upload-primary { font-size: 0.95rem; font-weight: 700; color: var(--primary, #003087); }
    .upload-hint { font-size: 0.78rem; color: var(--text-muted, #6b7280); }

    .pending-file {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 12px;
      border: 1.5px solid #16a34a;
      background: #f0fdf4;
    }
    .pending-file__icon mat-icon { color: #16a34a; font-size: 28px !important; width: 28px !important; height: 28px !important; }
    .pending-file__info { flex: 1; display: flex; flex-direction: column; }
    .pending-file__name { font-weight: 700; font-size: 0.9rem; color: #166534; }
    .pending-file__size { font-size: 0.78rem; color: #4b7c59; }
    .pending-badge {
      background: #dcfce7; color: #166534; font-size: 0.72rem; font-weight: 700;
      padding: 2px 10px; border-radius: 20px; white-space: nowrap;
    }

    .existing-docs { border: 1px solid var(--border, rgba(0,48,135,0.1)); border-radius: 12px; overflow: hidden; }
    .existing-docs__title {
      margin: 0; padding: 10px 16px;
      background: var(--neutral-100, #e5e7eb);
      font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
      color: var(--primary, #003087);
    }
    .doc-item {
      display: flex; align-items: center; gap: 12px; padding: 10px 16px;
      border-top: 1px solid var(--border, rgba(0,48,135,0.08));
      transition: background 0.15s;
      &:hover { background: rgba(0,48,135,0.03); }
    }
    .doc-item__icon {
      width: 36px; height: 36px; border-radius: 8px; background: rgba(0,48,135,0.08);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      mat-icon { font-size: 20px !important; width: 20px !important; height: 20px !important; color: var(--primary, #003087); }
      &--image { background: rgba(16,185,129,0.1); mat-icon { color: #059669; } }
    }
    .doc-item__info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .doc-item__name { font-weight: 600; font-size: 0.88rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .doc-item__meta { font-size: 0.75rem; color: var(--text-muted, #6b7280); }

    .external-link-toggle {
      display: flex;
      justify-content: flex-start;
      mat-icon { font-size: 18px !important; width: 18px !important; height: 18px !important; margin-right: 4px; }
    }

    /* ── Alert box ─────────────────────────────────── */
    .alert-box {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      border-radius: 12px;
      font-size: 0.95rem;
      &.warning {
        background: rgba(212, 160, 23, 0.1);
        color: #856404;
        border: 1px solid rgba(212, 160, 23, 0.3);
        mat-icon { color: #ca8a04; }
      }
    }

    /* ── Actions bar ───────────────────────────────── */
    mat-dialog-actions {
      padding: 16px 24px !important;
      background: var(--neutral-50, #f5f7fb);
      border-top: 1px solid var(--border, rgba(0,48,135,0.1));
      gap: 8px;
      flex-wrap: wrap;
    }
    .validation-hint {
      margin-right: auto;
      color: #b45309;
      font-size: 0.78rem;
      font-weight: 600;
      max-width: 400px;
    }
    .btn-save {
      border-radius: 10px;
      padding: 0 28px;
      font-weight: 700;
      height: 48px;
      display: flex;
      align-items: center;
      gap: 6px;
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
    }
    .btn-cancel {
      height: 48px;
      font-weight: 600;
    }

    /* ── Responsive ────────────────────────────────── */
    @media (max-width: 900px) {
      .dialog-header { padding: 18px 20px; gap: 14px; }
      .header-icon { width: 44px; height: 44px; border-radius: 12px;
        mat-icon { font-size: 24px; width: 24px; height: 24px; }
      }
      h2[mat-dialog-title] { font-size: 1.25rem; }
      mat-dialog-content { padding: 16px 18px !important; }
      .grid-row--4 { grid-template-columns: 1fr 1fr; }
      .grid-row--3 { grid-template-columns: 1fr 1fr; }
      .grid-row--2 { grid-template-columns: 1fr; }
      .span-2 { grid-column: span 1; }
      mat-dialog-actions { padding: 14px 18px !important; }
    }

    @media (max-width: 600px) {
      .grid-row--4, .grid-row--3, .grid-row--2 { grid-template-columns: 1fr; }
    }
  `]
})
export class TaskDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<TaskDialogComponent>);
  readonly docService = inject(TaskDocumentService);

  form: FormGroup;
  submitAttempted = false;
  isDragOver = false;

  readonly pendingFile = signal<File | null>(null);
  readonly existingDocs = signal<TaskDocumentEntry[]>([]);
  readonly showExternalLink = signal(false);
  readonly docsToDelete = signal<number[]>([]);

  constructor(@Inject(MAT_DIALOG_DATA) public data: TaskDialogData) {
    if (data.existingDocuments?.length) {
      this.existingDocs.set([...data.existingDocuments]);
    }
    if (data.task?.deliverableUrl) {
      this.showExternalLink.set(true);
    }

    const depIds =
      data.task?.dependencyTaskIds?.length
        ? data.task.dependencyTaskIds
        : data.task?.dependencyTaskId != null
          ? [data.task.dependencyTaskId]
          : ([] as number[]);

    this.form = this.fb.group({
      title: [data.task?.title || '', [Validators.required]],
      description: [data.task?.description || ''],
      priority: [this.mapPriorityForForm(data.task) || 'MOYENNE'],
      status: [data.task?.status || 'NOT_STARTED'],
      assigneeId: [data.task?.assignee?.id || null],
      startDate: [this.parseDateOnly(data.task?.startDate)],
      endDate: [this.parseDateOnly(data.task?.endDate)],
      progressPercent: [data.task?.progressPercent || 0],
      justification: [data.task?.justification || ''],
      dependencyTaskIds: [depIds as number[]],
      deliverableUrl: [data.task?.deliverableUrl || ''],
      deliverableLabel: [data.task?.deliverableLabel || ''],
    });

    // Conditional Validator for justification
    this.form.get('status')?.valueChanges.subscribe(status => {
      const justificationControl = this.form.get('justification');
      if (status === 'EN_RETARD' || status === 'BLOQUE') {
        justificationControl?.setValidators([Validators.required]);
      } else {
        justificationControl?.clearValidators();
      }
      justificationControl?.updateValueAndValidity();

      if (status === 'DONE') {
        this.form.patchValue({ progressPercent: 100 }, { emitEvent: false });
      }
      if (status === 'NOT_STARTED') {
        this.form.patchValue({ progressPercent: 0 }, { emitEvent: false });
      }
    });

    this.form.get('progressPercent')?.valueChanges.subscribe((progress: number) => {
      if (progress === 100 && this.form.get('status')?.value !== 'DONE') {
        this.form.patchValue({ status: 'DONE' }, { emitEvent: false });
      } else if (progress > 0 && progress < 100 && this.form.get('status')?.value === 'NOT_STARTED') {
        this.form.patchValue({ status: 'IN_PROGRESS' }, { emitEvent: false });
      }
    });

    this.form.get('status')?.updateValueAndValidity({ emitEvent: true });
  }

  ngOnInit(): void {}

  showJustification(): boolean {
    const status = this.form.get('status')?.value;
    return status === 'EN_RETARD' || status === 'BLOQUE';
  }

  triggerFileInput(): void {
    const input = document.querySelector('.hidden-input') as HTMLInputElement;
    input?.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.pendingFile.set(file);
    }
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(): void {
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    const file = event.dataTransfer?.files[0];
    if (file) {
      this.pendingFile.set(file);
    }
  }

  removePendingFile(): void {
    this.pendingFile.set(null);
  }

  removeExistingDoc(doc: TaskDocumentEntry): void {
    this.existingDocs.update((list) => list.filter((d) => d.id !== doc.id));
    this.docsToDelete.update((ids) => [...ids, doc.id]);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    this.submitAttempted = true;
    this.normalizeOptionalDateControls();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const rawValue = this.form.getRawValue();
    const depMulti: number[] = Array.isArray(rawValue.dependencyTaskIds)
      ? (rawValue.dependencyTaskIds as number[]).filter((id) => id != null)
      : [];

    const result: TaskInput & { priority: string; docsToDelete: number[] } = {
      title: rawValue.title,
      description: rawValue.description,
      priority: rawValue.priority,
      status: rawValue.status,
      assigneeId: rawValue.assigneeId,
      startDate: this.toIsoDate(rawValue.startDate) ?? undefined,
      endDate: this.toIsoDate(rawValue.endDate) ?? undefined,
      progressPercent: Number(rawValue.progressPercent),
      justification: rawValue.justification,
      deliverableUrl: rawValue.deliverableUrl?.trim() || undefined,
      deliverableLabel: rawValue.deliverableLabel?.trim() || undefined,
      pendingFile: this.pendingFile() ?? undefined,
      docsToDelete: this.docsToDelete(),
    };
    if (this.data.siblingTasks?.length) {
      result.dependencyTaskIds = depMulti;
    } else if (depMulti.length === 1) {
      result.dependencyTaskId = depMulti[0];
    }
    this.dialogRef.close(result);
  }

  /**
   * Les dates de tâche sont optionnelles.
   * Si l'utilisateur tape une date invalide, on la vide au submit
   * pour ne pas bloquer la création avec un message trompeur sur le titre.
   */
  private normalizeOptionalDateControls(): void {
    for (const key of ['startDate', 'endDate'] as const) {
      const control = this.form.get(key);
      if (control?.hasError('matDatepickerParse')) {
        control.setValue(null);
        control.updateValueAndValidity({ emitEvent: false });
      }
    }
  }

  validationHint(): string {
    const errors: string[] = [];
    if (this.form.get('title')?.hasError('required')) {
      errors.push('titre');
    }
    if (this.showJustification() && this.form.get('justification')?.hasError('required')) {
      errors.push('justification');
    }
    if (this.form.get('startDate')?.hasError('matDatepickerParse') || this.form.get('endDate')?.hasError('matDatepickerParse')) {
      errors.push('date invalide');
    }
    return errors.length ? `Vérifiez les champs: ${errors.join(', ')}.` : 'Vérifiez les champs obligatoires.';
  }

  private mapPriorityForForm(task?: Task): string {
    // Dans le modèle Task, priority n'est peut-être pas encore exposé directement 
    // s'il n'est pas dans l'interface Task. Je vais tricher un peu pour l'instant
    // ou vérifier l'interface.
    return (task as any)?.priority || 'MOYENNE';
  }

  /** Parse API / saisie date → date locale (évite le décalage UTC). */
  private parseDateOnly(value: string | Date | null | undefined): Date | null {
    if (value == null || value === '') {
      return null;
    }
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }
    const part = value.split('T')[0];
    const [y, m, d] = part.split('-').map((n) => parseInt(n, 10));
    if (!y || !m || !d) {
      return null;
    }
    return new Date(y, m - 1, d);
  }

  private toIsoDate(value: Date | string | null | undefined): string | null {
    if (value == null || value === '') {
      return null;
    }
    const d = value instanceof Date ? value : this.parseDateOnly(value);
    if (!d || isNaN(d.getTime())) {
      return null;
    }
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${day}`;
  }
}
