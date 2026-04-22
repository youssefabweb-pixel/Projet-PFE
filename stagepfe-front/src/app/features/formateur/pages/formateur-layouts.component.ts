import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { PageShellComponent } from '../../../shared/ui/page-shell/page-shell.component';

@Component({
  selector: 'app-formateur-layouts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageShellComponent],
  template: `
    <app-page-shell title="Form Layouts" subtitle="Migration de la page Sneat form-layouts.">
      <div class="wb-card wb-card-pad">
        <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">
          <label>Nom <input class="wb-input" type="text" formControlName="name" /></label>
          <label>Email <input class="wb-input" type="email" formControlName="email" /></label>
          <label class="full">Message <textarea class="wb-input" rows="4" formControlName="message"></textarea></label>
          <button type="submit" class="btn btn--primary" [disabled]="form.invalid">Envoyer</button>
        </form>
      </div>
    </app-page-shell>
  `,
  styles: [
    `
      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }
      .full {
        grid-column: 1 / -1;
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        color: var(--text-muted);
        font-weight: 500;
        font-size: 0.875rem;
      }
      button {
        grid-column: 1 / -1;
        justify-self: start;
      }
    `,
  ],
})
export class FormateurLayoutsComponent {
  protected readonly form = new FormGroup({
    name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    message: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
  });

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    this.form.reset({ name: '', email: '', message: '' });
  }
}
