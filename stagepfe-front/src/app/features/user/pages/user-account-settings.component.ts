import { Component, computed, inject } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { PageShellComponent } from '../../../shared/ui/page-shell/page-shell.component';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-user-account-settings',
  standalone: true,
  imports: [ReactiveFormsModule, PageShellComponent],
  template: `
    <app-page-shell title="Account Settings" subtitle="Migration de la page Sneat account-settings.">
      <div class="wb-card wb-card-pad account-card">
        <form [formGroup]="form" (ngSubmit)="submit()">
          <label>Full Name <input class="wb-input" formControlName="fullName" type="text" /></label>
          <label>Email <input class="wb-input" formControlName="email" type="email" /></label>
          <label class="toggle-row">
            <input
              type="checkbox"
              [checked]="emailNotificationsEnabled()"
              (change)="toggleEmailNotifications($event)"
            />
            Enable email notifications
          </label>
          <button type="submit" class="btn btn--primary" [disabled]="form.invalid">Save Changes</button>
        </form>
      </div>
    </app-page-shell>
  `,
  styles: [
    `
      .account-card {
        max-width: 540px;
      }
      form {
        display: grid;
        gap: 0.85rem;
      }
      label {
        display: grid;
        gap: 0.35rem;
        color: var(--text-muted);
        font-weight: 500;
        font-size: 0.875rem;
      }
      .toggle-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
    `,
  ],
})
export class UserAccountSettingsComponent {
  private readonly notificationService = inject(NotificationService);

  protected readonly emailNotificationsEnabled = computed(() =>
    this.notificationService.emailNotificationsEnabled(),
  );

  protected readonly form = new FormGroup({
    fullName: new FormControl<string>('John Doe', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl<string>('johndoe@email.com', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  submit(): void {
    if (this.form.invalid) {
      return;
    }
  }

  toggleEmailNotifications(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.notificationService.setEmailNotificationsEnabled(checked);
  }
}
