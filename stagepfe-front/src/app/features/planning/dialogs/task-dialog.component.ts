import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { Task, TaskInput, UserSummary } from '../../../core/models/project.models';

export interface TaskDialogData {
  mode: 'create' | 'edit';
  task?: Task;
  members: UserSummary[];
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
    MatIconModule
  ],
  template: `
    <div class="dialog-container">
      <header class="dialog-header">
        <div class="header-icon">
          <span>🗂</span>
        </div>
        <div class="header-text">
          <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Nouvelle Tâche' : 'Modifier la Tâche' }}</h2>
          <p class="header-subtitle">Détaillez les actions et responsabilités pour ce jalon.</p>
        </div>
      </header>

      <mat-dialog-content>
        <form [formGroup]="form" class="task-form">
          <section class="form-section">
            <h3 class="section-title">Informations de base</h3>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Titre de la tâche</mat-label>
              <input matInput formControlName="title" placeholder="Ex: Conception de l'architecture" />
              <mat-error *ngIf="form.get('title')?.hasError('required')">Le titre est obligatoire</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description détaillée</mat-label>
              <textarea matInput formControlName="description" rows="2" placeholder="Précisez le périmètre de cette action..."></textarea>
            </mat-form-field>
          </section>

          <section class="form-section row-split">
            <div class="split-col">
              <h3 class="section-title">Planification</h3>
              <div class="grid-row">
                <mat-form-field appearance="outline">
                  <mat-label>Date de début</mat-label>
                  <input matInput type="date" formControlName="startDate" />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Date de fin prévue</mat-label>
                  <input matInput type="date" formControlName="endDate" />
                </mat-form-field>
              </div>

              <div class="grid-row">
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
                    <mat-option value="BASSE">Basse</mat-option>
                    <mat-option value="MOYENNE">Moyenne</mat-option>
                    <mat-option value="HAUTE">Haute</mat-option>
                    <mat-option value="CRITIQUE">Critique</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
            </div>

            <div class="split-col tracking-col">
              <h3 class="section-title">Suivi opérationnel</h3>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Statut actuel</mat-label>
                <mat-select formControlName="status">
                  <mat-option value="NOT_STARTED">Non démarré</mat-option>
                  <mat-option value="IN_PROGRESS">En cours</mat-option>
                  <mat-option value="DONE">Terminé</mat-option>
                  <mat-option value="EN_RETARD">En retard</mat-option>
                  <mat-option value="BLOQUE">Bloqué</mat-option>
                </mat-select>
              </mat-form-field>

              <div class="progress-container">
                <div class="progress-labels">
                  <span class="label">Avancement</span>
                  <span class="value">{{ form.get('progressPercent')?.value }}%</span>
                </div>
                <input type="range" formControlName="progressPercent" min="0" max="100" step="5" class="wb-range-input">
              </div>
            </div>
          </section>

          <section class="form-section alert-section" *ngIf="showJustification()">
            <div class="alert-box danger">
              <mat-icon>report_problem</mat-icon>
              <span>Justification opérationnelle requise pour retards/blocages.</span>
            </div>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Justification détaillée (Cause racine)</mat-label>
              <textarea matInput formControlName="justification" rows="2" placeholder="Expliquez la nature du blocage..."></textarea>
              <mat-error *ngIf="form.get('justification')?.hasError('required')">La justification est obligatoire</mat-error>
            </mat-form-field>
          </section>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <div class="validation-hint" *ngIf="submitAttempted && form.invalid">
          Veuillez corriger les champs obligatoires avant d'enregistrer.
        </div>
        <button mat-button (click)="onCancel()" class="btn-cancel">Annuler</button>
        <button mat-raised-button color="primary" (click)="onSave()" class="btn-save">
          {{ data.mode === 'create' ? 'Ajouter la tâche' : 'Enregistrer' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container { display: flex; flex-direction: column; max-height: 95vh; width: 100%; overflow: hidden; }
    .dialog-header {
      background: linear-gradient(135deg, #1e3a5f 0%, #3d5a80 100%);
      color: white; padding: 32px; display: flex; align-items: center; gap: 24px; border-bottom: 4px solid var(--primary);
    }
    .header-icon {
      background: rgba(255,255,255,0.2); width: 64px; height: 64px; border-radius: 16px;
      display: flex; align-items: center; justify-content: center;
      span { font-size: 30px; }
    }
    h2[mat-dialog-title] { margin: 0 !important; padding: 0 !important; font-size: 1.75rem; font-weight: 800; color: white; }
    .header-subtitle { margin: 6px 0 0; font-size: 1rem; opacity: 0.9; }
    mat-dialog-content { 
      padding: 24px 32px !important; 
      margin: 0; 
      max-height: 65vh;
      overflow-y: auto !important;
      overflow-x: hidden !important; 
    }
    ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      font-size: 0.75rem;
    }
    .task-form { display: flex; flex-direction: column; gap: 32px; width: 100%; }
    .form-section { display: flex; flex-direction: column; gap: 16px; }
    .section-title { 
      font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 800; color: var(--neutral-600); 
      margin-bottom: 8px; display: flex; align-items: center; gap: 12px;
      &::after { content: ''; flex: 1; height: 1px; background: var(--border); }
    }
    .row-split { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 32px; }
    .grid-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .full-width { width: 100%; }
    input[type='date'] { letter-spacing: 0.02em; font-weight: 600; }
    .progress-container {
      background: var(--neutral-50); padding: 20px; border-radius: 12px; border: 1px solid var(--border);
      .progress-labels { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 0.9rem; font-weight: 700; color: var(--primary); }
      .wb-range-input { width: 100%; cursor: pointer; accent-color: var(--primary); height: 8px; border-radius: 4px; }
    }
    .alert-box {
      display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-radius: 10px; font-size: 0.9rem; margin-bottom: 12px;
      &.danger { background: var(--danger-muted); color: #721c24; border: 1px solid rgba(196,30,30,0.25); }
    }
    mat-dialog-actions { 
      padding: 20px 32px !important; background: var(--neutral-100); border-top: 1px solid var(--border); display: flex; align-items: center; gap: 12px;
    }
    .validation-hint { margin-inline-end: auto; color: var(--danger); font-weight: 600; font-size: 0.82rem; }
    .btn-save { height: 48px; border-radius: 10px; padding: 0 32px; font-weight: 700; }
    .btn-cancel { height: 48px; font-weight: 600; }
  `]
})
export class TaskDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<TaskDialogComponent>);

  form: FormGroup;
  submitAttempted = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: TaskDialogData) {
    this.form = this.fb.group({
      title: [data.task?.title || '', [Validators.required]],
      description: [data.task?.description || ''],
      priority: [this.mapPriorityForForm(data.task) || 'MOYENNE'],
      status: [data.task?.status || 'NOT_STARTED'],
      assigneeId: [data.task?.assignee?.id || null],
      startDate: [data.task?.startDate || null],
      endDate: [data.task?.endDate || null],
      progressPercent: [data.task?.progressPercent || 0],
      justification: [data.task?.justification || '']
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

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    this.submitAttempted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const rawValue = this.form.getRawValue();
    const result: TaskInput & { priority: string } = {
      title: rawValue.title,
      description: rawValue.description,
      priority: rawValue.priority,
      status: rawValue.status,
      assigneeId: rawValue.assigneeId,
      startDate: rawValue.startDate || undefined,
      endDate: rawValue.endDate || undefined,
      progressPercent: Number(rawValue.progressPercent),
      justification: rawValue.justification
    };
    this.dialogRef.close(result);
  }

  private mapPriorityForForm(task?: Task): string {
    // Dans le modèle Task, priority n'est peut-être pas encore exposé directement 
    // s'il n'est pas dans l'interface Task. Je vais tricher un peu pour l'instant
    // ou vérifier l'interface.
    return (task as any)?.priority || 'MOYENNE';
  }
}
