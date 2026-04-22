import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Task, UserSummary } from '../../../core/models/project.models';
import { UserService } from '../../../core/services/user.service';
import { MilestoneTaskService } from '../../../core/services/milestone-task.service';

export interface TaskDialogData {
  mode: 'create' | 'edit';
  milestoneId: number;
  task?: Task;
  allTasks?: Task[]; // For dependencies
  members?: UserSummary[]; // Project members
}

@Component({
  selector: 'app-task-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  template: `
    <div class="dlg">
      <header class="dlg__header">
        <h2>{{ data.mode === 'create' ? 'Nouvelle Action' : "Modifier l'action" }}</h2>
        <button class="dlg__close" (click)="dialogRef.close()">×</button>
      </header>

      <form [formGroup]="form" (ngSubmit)="submit()" class="dlg__body">
        <div class="field">
          <label>Titre de l'action *</label>
          <input type="text" formControlName="title" placeholder="Ex: Rédiger SFD" />
        </div>

        <div class="row">
          <div class="field">
            <label>Date de début</label>
            <input type="date" formControlName="startDate" />
          </div>
          <div class="field">
            <label>Date de fin</label>
            <input type="date" formControlName="endDate" />
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label>Avancement (%)</label>
            <input type="number" formControlName="progressPercent" min="0" max="100" />
          </div>
          <div class="field">
            <label>Responsable</label>
            <select formControlName="assigneeId">
              <option [ngValue]="null">Non assigné</option>
              @for (m of data.members; track m.id) {
                <option [ngValue]="m.id">{{ m.username }}</option>
              }
            </select>
          </div>
        </div>

        <div class="field">
          <label>Dépendance (Action précédente)</label>
          <select formControlName="dependencyTaskId">
            <option [ngValue]="null">Aucune</option>
            @for (t of otherTasks(); track t.id) {
              <option [ngValue]="t.id">{{ t.title }}</option>
            }
          </select>
        </div>

        <div class="field">
          <label>Description / Détails</label>
          <textarea formControlName="description" rows="3"></textarea>
        </div>

        <footer class="dlg__footer">
          <button type="button" class="btn btn--ghost" (click)="dialogRef.close()">Annuler</button>
          <button type="submit" class="btn btn--primary" [disabled]="form.invalid">Enregistrer</button>
        </footer>
      </form>
    </div>
  `,
  styles: [`
    .dlg { width: 550px; max-width: 95vw; }
    .dlg__header { 
      padding: 1.25rem 1.5rem; 
      border-bottom: 1px solid var(--border);
      display: flex; justify-content: space-between; align-items: center;
      background: var(--neutral-50);
    }
    h2 { margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--primary-dark); }
    .dlg__close { border: none; background: none; font-size: 1.5rem; cursor: pointer; color: var(--neutral-400); }
    .dlg__body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .field { display: flex; flex-direction: column; gap: 0.4rem; }
    label { font-weight: 700; font-size: 0.85rem; color: var(--neutral-600); }
    input, select, textarea {
      padding: 0.65rem; border: 1px solid var(--border); border-radius: var(--radius-md);
      font-size: 0.9rem; transition: border-color 0.2s;
    }
    input:focus, select:focus, textarea:focus { border-color: var(--primary); outline: none; }
    .dlg__footer { 
      margin-top: 0.5rem; padding-top: 1rem; border-top: 1px solid var(--border);
      display: flex; justify-content: flex-end; gap: 0.75rem;
    }
  `]
})
export class TaskDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject(MatDialogRef<TaskDialogComponent>);
  readonly data = inject<TaskDialogData>(MAT_DIALOG_DATA);

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: [''],
    startDate: [''],
    endDate: [''],
    progressPercent: [0, [Validators.min(0), Validators.max(100)]],
    assigneeId: [null as number | null],
    dependencyTaskId: [null as number | null]
  });

  ngOnInit() {
    if (this.data.mode === 'edit' && this.data.task) {
      this.form.patchValue({
        ...this.data.task,
        assigneeId: this.data.task.assignee?.id || null,
        dependencyTaskId: this.data.task.dependencyTaskId || null
      } as any);
    }
  }

  otherTasks(): Task[] {
    return (this.data.allTasks || []).filter(t => t.id !== this.data.task?.id);
  }

  submit() {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}
