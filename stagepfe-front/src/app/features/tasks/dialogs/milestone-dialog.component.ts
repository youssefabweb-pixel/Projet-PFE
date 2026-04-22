import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Milestone, MilestoneStatus } from '../../../core/models/project.models';

export interface MilestoneDialogData {
  mode: 'create' | 'edit';
  projectId: number;
  milestone?: Milestone;
}

@Component({
  selector: 'app-milestone-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  template: `
    <div class="dlg">
      <header class="dlg__header">
        <h2>{{ data.mode === 'create' ? 'Nouveau Jalon' : 'Modifier le jalon' }}</h2>
        <button class="dlg__close" (click)="dialogRef.close()">×</button>
      </header>

      <form [formGroup]="form" (ngSubmit)="submit()" class="dlg__body">
        <div class="row">
          <div class="field">
            <label>Titre *</label>
            <input type="text" formControlName="title" placeholder="Ex: Cadrage technique" />
          </div>
          <div class="field">
            <label>Deadline *</label>
            <input type="date" formControlName="deadline" />
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label>État</label>
            <select formControlName="status">
              <option value="NON_DEMARRE">Non démarré</option>
              <option value="EN_COURS">En cours</option>
              <option value="TERMINE">Terminé</option>
              <option value="EN_RETARD">En retard</option>
              <option value="BLOQUE">Bloqué</option>
            </select>
          </div>
          <div class="field">
            <label>Date de fin réelle</label>
            <input type="date" formControlName="actualEndDate" />
          </div>
        </div>

        <div class="field">
          <label>Description</label>
          <textarea formControlName="description" rows="2"></textarea>
        </div>

        @if (isAnomaly()) {
          <div class="anomaly-section">
            <div class="field">
              <label class="text-danger">Justification du retard/blocage *</label>
              <textarea formControlName="justification" rows="2" placeholder="Pourquoi ce retard ?"></textarea>
            </div>
            <div class="field">
              <label class="text-danger">Plan d'action correctif *</label>
              <textarea formControlName="actionPlan" rows="2" placeholder="Quelles actions pour corriger ?"></textarea>
            </div>
          </div>
        }

        <footer class="dlg__footer">
          <button type="button" class="btn btn--ghost" (click)="dialogRef.close()">Annuler</button>
          <button type="submit" class="btn btn--primary" [disabled]="form.invalid">Enregistrer</button>
        </footer>
      </form>
    </div>
  `,
  styles: [`
    .dlg { width: 500px; max-width: 95vw; }
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
    .anomaly-section {
      padding: 1rem; background: rgba(239, 68, 68, 0.04); border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: var(--radius-lg); display: flex; flex-direction: column; gap: 1rem;
    }
    .text-danger { color: #b91c1c; }
    .dlg__footer { 
      margin-top: 0.5rem; padding-top: 1rem; border-top: 1px solid var(--border);
      display: flex; justify-content: flex-end; gap: 0.75rem;
    }
  `]
})
export class MilestoneDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject(MatDialogRef<MilestoneDialogComponent>);
  readonly data = inject<MilestoneDialogData>(MAT_DIALOG_DATA);

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    deadline: ['', Validators.required],
    actualEndDate: [''],
    status: ['NON_DEMARRE' as MilestoneStatus],
    description: [''],
    justification: [''],
    actionPlan: ['']
  });

  ngOnInit() {
    if (this.data.mode === 'edit' && this.data.milestone) {
      this.form.patchValue({
        ...this.data.milestone,
        status: this.data.milestone.status as any
      });
    }

    // React to status changes for mandatory justification
    this.form.get('status')?.valueChanges.subscribe(() => this.updateValidators());
  }

  isAnomaly(): boolean {
    const s = this.form.get('status')?.value;
    return s === 'EN_RETARD' || s === 'BLOQUE';
  }

  private updateValidators() {
    const justification = this.form.get('justification');
    const actionPlan = this.form.get('actionPlan');
    
    if (this.isAnomaly()) {
      justification?.setValidators([Validators.required]);
      actionPlan?.setValidators([Validators.required]);
    } else {
      justification?.clearValidators();
      actionPlan?.clearValidators();
    }
    justification?.updateValueAndValidity();
    actionPlan?.updateValueAndValidity();
  }

  submit() {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}
