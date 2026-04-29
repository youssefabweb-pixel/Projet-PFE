import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

export interface PlanningJustificationDialogData {
  title: string;
  message: string;
  initialValue?: string;
}

@Component({
  selector: 'app-planning-justification-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p class="hint">{{ data.message }}</p>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Justification</mat-label>
          <textarea matInput rows="4" formControlName="text" placeholder="Décrivez la cause et le plan d'action…"></textarea>
          <mat-error *ngIf="form.controls.text.hasError('required')">Champ obligatoire</mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="form.invalid">
        Enregistrer
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .hint {
        margin: 0 0 1rem;
        color: var(--text-muted);
        font-size: 0.9rem;
      }
      .full {
        width: 100%;
      }
    `,
  ],
})
export class PlanningJustificationDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly ref = inject(MatDialogRef<PlanningJustificationDialogComponent, string | undefined>);
  readonly data = inject(MAT_DIALOG_DATA) as PlanningJustificationDialogData;

  readonly form = this.fb.nonNullable.group({
    text: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  constructor() {
    this.form.controls.text.setValue(this.data.initialValue?.trim() ?? '');
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.ref.close(this.form.controls.text.value.trim());
  }
}
