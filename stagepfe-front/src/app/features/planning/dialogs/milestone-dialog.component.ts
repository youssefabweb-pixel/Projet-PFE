import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { Milestone, MilestoneInput } from '../../../core/models/project.models';

export interface MilestoneDialogData {
  mode: 'create' | 'edit';
  milestone?: Milestone;
  /** Quand true (planning validé par PMO), les champs date début et date fin sont verrouillés. */
  datesLocked?: boolean;
}

@Component({
  selector: 'app-milestone-dialog',
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
    MatDatepickerModule
  ],
  providers: [provideNativeDateAdapter(), { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' }],
  template: `
    <div class="dialog-container">
      <header class="dialog-header">
        <div class="header-icon">
          <mat-icon>flag</mat-icon>
        </div>
        <div class="header-text">
          <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Nouveau Jalon' : 'Modifier le Jalon' }}</h2>
          <p class="header-subtitle">
            {{ data.datesLocked ? 'Dates figées — planning validé par le PMO.' : "Définissez les objectifs et l'échéance de cette étape clé." }}
          </p>
        </div>
      </header>
      
      <mat-dialog-content>
        <form [formGroup]="form" class="milestone-form">
          <section class="form-section">
            <h3 class="section-title">Informations de base</h3>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Titre du jalon</mat-label>
              <input matInput formControlName="title" placeholder="Ex: Analyse des besoins" />
              <mat-error *ngIf="form.get('title')?.hasError('required')">Le titre est obligatoire</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description / Livrables attendus</mat-label>
              <textarea matInput formControlName="description" rows="3" placeholder="Décrivez les livrables de ce jalon..."></textarea>
            </mat-form-field>
          </section>

          <section class="form-section">
            <h3 class="section-title">Planification & Suivi</h3>

            <div class="alert-box info" *ngIf="data.datesLocked">
              <mat-icon>lock</mat-icon>
              <span>Les dates ont été figées lors de la validation PMO. Seuls le statut, la justification et le plan d'action sont modifiables.</span>
            </div>

            <div class="grid-row grid-row--planning">
              <mat-form-field appearance="outline" class="date-field">
                <mat-label>Date début {{ data.datesLocked ? '(figée)' : '' }}</mat-label>
                <input matInput [matDatepicker]="startPicker" formControlName="startDate" placeholder="jj/mm/aaaa" autocomplete="off" [readonly]="data.datesLocked" />
                <mat-datepicker-toggle matIconSuffix [for]="startPicker" [disabled]="!!data.datesLocked" />
                <mat-error *ngIf="form.get('startDate')?.hasError('matDatepickerParse')">Date invalide</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="date-field">
                <mat-label>Date fin {{ data.datesLocked ? '(figée)' : '' }}</mat-label>
                <input matInput [matDatepicker]="endPicker" formControlName="endDate" placeholder="jj/mm/aaaa" autocomplete="off" [readonly]="data.datesLocked" />
                <mat-datepicker-toggle matIconSuffix [for]="endPicker" [disabled]="!!data.datesLocked" />
                <mat-error *ngIf="form.get('endDate')?.hasError('required')">Requis</mat-error>
                <mat-error *ngIf="form.get('endDate')?.hasError('matDatepickerParse')">Date invalide</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Statut</mat-label>
                <mat-select formControlName="status">
                  <mat-option value="NON_DEMARRE">⚪ Non démarré</mat-option>
                  <mat-option value="EN_COURS">🔵 En cours</mat-option>
                  <mat-option value="TERMINE">🟢 Terminé</mat-option>
                  <mat-option value="EN_RETARD">🟠 En retard</mat-option>
                  <mat-option value="BLOQUE">🔴 Bloqué</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width date-field" *ngIf="form.get('status')?.value === 'TERMINE'">
              <mat-label>Date de fin réelle</mat-label>
              <input matInput [matDatepicker]="actualPicker" formControlName="actualEndDate" placeholder="jj/mm/aaaa" autocomplete="off" />
              <mat-datepicker-toggle matIconSuffix [for]="actualPicker" />
              <mat-error *ngIf="form.get('actualEndDate')?.hasError('required')">La date de fin réelle est obligatoire</mat-error>
              <mat-error *ngIf="form.get('actualEndDate')?.hasError('matDatepickerParse')">Date invalide</mat-error>
            </mat-form-field>

            <!-- Pickers en dehors des mat-form-field : overlay CDK + pas de layout inline dans la modale -->
            <mat-datepicker #startPicker panelClass="wb-datepicker-panel" />
            <mat-datepicker #endPicker panelClass="wb-datepicker-panel" />
            <mat-datepicker #actualPicker panelClass="wb-datepicker-panel" />
          </section>

          <section class="form-section tracking-section" *ngIf="showJustification()">
            <div class="alert-box warning">
              <mat-icon>warning</mat-icon>
              <span>Ce statut nécessite une justification et un plan d'action immédiat.</span>
            </div>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Justification du retard/blocage</mat-label>
              <textarea matInput formControlName="justification" rows="2" placeholder="Cause racine de l'incident..."></textarea>
              <mat-error *ngIf="form.get('justification')?.hasError('required')">La justification est obligatoire</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Plan d'action correctif</mat-label>
              <textarea matInput formControlName="actionPlan" rows="2" placeholder="Mesures prises pour débloquer la situation..."></textarea>
              <mat-error *ngIf="form.get('actionPlan')?.hasError('required')">Le plan d'action est obligatoire</mat-error>
            </mat-form-field>
          </section>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <span class="validation-hint" *ngIf="submitAttempted && form.invalid">
          Vérifiez les champs obligatoires (titre, date fin, et justification/plan d'action si statut En retard ou Bloqué).
        </span>
        <button mat-button (click)="onCancel()" class="btn-cancel">Annuler</button>
        <button mat-raised-button color="primary" (click)="onSave()" class="btn-save">
          {{ data.mode === 'create' ? 'Créer le jalon' : 'Enregistrer les modifications' }}
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
    mat-dialog-content {
      padding: 20px 24px !important;
      margin: 0;
      max-height: 60vh;
      overflow-y: auto !important;
      overflow-x: hidden !important;
    }
    ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      font-size: 0.75rem;
    }
    .milestone-form {
      display: flex;
      flex-direction: column;
      gap: 32px;
      width: 100%;
    }
    .form-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .section-title {
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-weight: 800;
      color: var(--primary);
      margin: 0 0 8px 0;
      display: flex;
      align-items: center;
      gap: 8px;
      &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--border);
      }
    }
    .grid-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    .grid-row--planning {
      grid-template-columns: 1fr 1fr 1fr;
    }
    .date-field input {
      letter-spacing: 0.02em;
      font-weight: 600;
    }
    .full-width { width: 100%; }
    .alert-box {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      border-radius: 12px;
      font-size: 0.95rem;
      margin-bottom: 16px;
      &.warning {
        background: var(--warning-muted, rgba(212, 160, 23, 0.1));
        color: #856404;
        border: 1px solid rgba(212, 160, 23, 0.3);
        mat-icon { color: var(--warning); }
      }
      &.info {
        background: #eff6ff;
        color: #1e40af;
        border: 1px solid #bfdbfe;
        mat-icon { color: #1e40af; }
      }
    }
    mat-dialog-actions {
      padding: 16px 24px !important;
      background: var(--neutral-50, #f5f7fb);
      border-top: 1px solid var(--border, rgba(0, 48, 135, 0.1));
      gap: 8px;
      flex-wrap: wrap;
    }
    .validation-hint {
      margin-right: auto;
      color: #b45309;
      font-size: 0.78rem;
      font-weight: 600;
      max-width: 480px;
    }
    .btn-save {
      border-radius: 10px;
      padding: 0 32px;
      font-weight: 700;
      height: 48px;
    }
    .btn-cancel {
       height: 48px;
       font-weight: 600;
    }

    @media (max-width: 900px) {
      .dialog-header {
        padding: 18px 20px;
        gap: 14px;
      }

      .header-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        mat-icon { font-size: 24px; width: 24px; height: 24px; }
      }

      h2[mat-dialog-title] {
        font-size: 1.25rem;
      }

      .header-subtitle {
        font-size: 0.9rem;
      }

      mat-dialog-content {
        padding: 16px 18px !important;
      }

      .grid-row {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      mat-dialog-actions {
        padding: 14px 18px !important;
      }
    }
  `]
})
export class MilestoneDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<MilestoneDialogComponent>);

  form: FormGroup;
  submitAttempted = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: MilestoneDialogData) {
    this.form = this.fb.group({
      title: [data.milestone?.title || '', [Validators.required]],
      description: [data.milestone?.description || ''],
      startDate: [{ value: null, disabled: !!data.datesLocked }],
      endDate: [{ value: this.parseDateOnly(data.milestone?.deadline), disabled: !!data.datesLocked }, [Validators.required]],
      status: [data.milestone?.status || 'NON_DEMARRE'],
      justification: [data.milestone?.justification || ''],
      actionPlan: [data.milestone?.actionPlan || ''],
      actualEndDate: [this.parseDateOnly(data.milestone?.actualEndDate)]
    });

    // Conditional validators for governance workflow
    this.form.get('status')?.valueChanges.subscribe(status => {
      const justificationControl = this.form.get('justification');
      const actionPlanControl = this.form.get('actionPlan');
      const actualEndDateControl = this.form.get('actualEndDate');
      if (status === 'EN_RETARD' || status === 'BLOQUE') {
        justificationControl?.setValidators([Validators.required]);
        actionPlanControl?.setValidators([Validators.required]);
      } else {
        justificationControl?.clearValidators();
        actionPlanControl?.clearValidators();
      }

      if (status === 'TERMINE') {
        actualEndDateControl?.setValidators([Validators.required]);
      } else {
        actualEndDateControl?.clearValidators();
      }

      justificationControl?.updateValueAndValidity();
      actionPlanControl?.updateValueAndValidity();
      actualEndDateControl?.updateValueAndValidity();
    });

    this.form.get('status')?.updateValueAndValidity({ emitEvent: true });
  }

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
    const result: MilestoneInput = {
      title: rawValue.title,
      description: rawValue.description,
      deadline: this.toIsoDate(rawValue.endDate) ?? '',
      status: rawValue.status,
      justification: rawValue.justification,
      actionPlan: rawValue.actionPlan,
      actualEndDate: this.toIsoDate(rawValue.actualEndDate)
    };
    this.dialogRef.close(result);
  }

  /** Parse API / HTML date string to local calendar date (no UTC shift). */
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
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
