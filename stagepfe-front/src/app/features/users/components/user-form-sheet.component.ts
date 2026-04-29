import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { NotificationCenterService } from '../../../core/notifications/notification-center.service';
import { merge } from 'rxjs';
import { CreateUserPayload, UpdateUserPayload, User } from '../../../core/models/user.models';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { getHttpErrorMessage } from '../../../shared/utils/http-error.util';

export function generateUsername(firstName: string, lastName: string): string {
  return `${firstName.trim().toLowerCase()}.${lastName.trim().toLowerCase()}`
    .replace(/\s+/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function optionalPasswordMin8(): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null => {
    const v = (c.value ?? '').toString().trim();
    if (!v) {
      return null;
    }
    return v.length >= 8 ? null : { passwordShort: true };
  };
}

@Component({
  selector: 'app-user-form-sheet',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="overlay" role="presentation" (click)="onBackdropClick($event)">
      <div
        class="panel"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="titleId"
        (click)="$event.stopPropagation()"
      >
        <header class="panel__head">
          <h2 [id]="titleId">{{ mode === 'create' ? 'Nouvel utilisateur' : 'Modifier l’utilisateur' }}</h2>
          <button type="button" class="icon-btn" (click)="close()" aria-label="Fermer">×</button>
        </header>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="panel__body">
            <ng-container *ngIf="mode === 'create'">
              <label class="field">
                <span>Prénom *</span>
                <input type="text" formControlName="firstName" autocomplete="given-name" />
                <small *ngIf="form.controls.firstName.touched && form.controls.firstName.errors?.['required']"
                  >Requis</small
                >
              </label>
              <label class="field">
                <span>Nom *</span>
                <input type="text" formControlName="lastName" autocomplete="family-name" />
                <small *ngIf="form.controls.lastName.touched && form.controls.lastName.errors?.['required']"
                  >Requis</small
                >
              </label>
              <label class="field">
                <span>Username</span>
                <input
                  type="text"
                  formControlName="username"
                  autocomplete="username"
                  (input)="onUsernameManualInput()"
                />
                <small class="hint">Généré à partir du prénom et du nom ; vous pouvez le modifier.</small>
              </label>
            </ng-container>

            <label *ngIf="mode === 'edit'" class="field">
              <span>Username</span>
              <input type="text" [value]="editUsername" readonly class="readonly" />
            </label>

            <label class="field">
              <span>E-mail *</span>
              <input type="email" formControlName="email" autocomplete="email" />
              <small *ngIf="form.controls.email.touched && form.controls.email.errors?.['required']">Requis</small>
              <small *ngIf="form.controls.email.touched && form.controls.email.errors?.['email']">E-mail invalide</small>
            </label>

            <label class="field">
              <span>Mot de passe {{ mode === 'edit' ? '(optionnel)' : '*' }}</span>
              <input type="password" formControlName="password" autocomplete="new-password" />
              <small *ngIf="form.controls.password.touched && form.controls.password.errors?.['required']"
                >Requis à la création (min. 8 caractères).</small
              >
              <small *ngIf="form.controls.password.touched && form.controls.password.errors?.['minlength']"
                >Minimum 8 caractères.</small
              >
              <small *ngIf="form.controls.password.touched && form.controls.password.errors?.['passwordShort']"
                >Si renseigné : minimum 8 caractères.</small
              >
            </label>

            <label class="field">
              <span>Rôle *</span>
              <select formControlName="role">
                <option *ngFor="let r of roles" [value]="r">{{ displayRole(r) }}</option>
              </select>
            </label>

            <label class="field checkbox">
              <input type="checkbox" formControlName="enabled" />
              <span>Compte actif</span>
            </label>

            <p *ngIf="formError" class="form-error">{{ formError }}</p>
          </div>

          <footer class="panel__foot">
            <button type="button" class="btn btn--secondary" (click)="close()" [disabled]="saving">Annuler</button>
            <button type="submit" class="btn btn--primary" [disabled]="saving || roles.length === 0">
              {{ saving ? 'Enregistrement…' : mode === 'create' ? 'Créer' : 'Enregistrer' }}
            </button>
          </footer>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(10, 22, 40, 0.5);
        backdrop-filter: blur(4px);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
      }
      .panel {
        background: var(--surface);
        border-radius: var(--radius-3xl);
        border: 1px solid var(--border);
        width: 100%;
        max-width: 480px;
        max-height: 90vh;
        overflow: auto;
        box-shadow: var(--shadow-overlay);
      }
      .panel__head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.35rem;
        border-bottom: 1px solid var(--border);
        background: linear-gradient(180deg, var(--neutral-50) 0%, var(--surface) 100%);
      }
      .panel__head h2 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--neutral-900);
      }
      .panel__body {
        padding: 1rem 1.35rem;
        display: grid;
        gap: 0.9rem;
      }
      .panel__foot {
        padding: 0.85rem 1.35rem 1.35rem;
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .icon-btn {
        border: none;
        background: transparent;
        font-size: 1.5rem;
        line-height: 1;
        cursor: pointer;
        color: var(--text-muted);
        border-radius: var(--radius-sm);
        transition: color 0.15s ease, background 0.15s ease;
      }
      .icon-btn:hover {
        color: var(--accent);
        background: var(--accent-muted);
      }
      .field {
        display: grid;
        gap: 0.35rem;
        font-size: 0.9rem;
      }
      .field > span {
        font-weight: 600;
        color: var(--neutral-700);
      }
      .field input,
      .field select {
        padding: 0.55rem 0.75rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        font: inherit;
        color: var(--neutral-900);
        background: var(--surface);
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .field input:focus,
      .field select:focus {
        outline: none;
        border-color: var(--primary-light);
        box-shadow: 0 0 0 3px var(--primary-muted);
      }
      .readonly {
        background: var(--neutral-100);
        color: var(--neutral-600);
      }
      .checkbox {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-direction: row;
      }
      small {
        color: var(--accent);
        font-size: 0.75rem;
      }
      small.hint {
        color: var(--text-muted);
      }
      .form-error {
        color: var(--accent);
        margin: 0;
        font-size: 0.85rem;
        font-weight: 500;
      }
    `,
  ],
})
export class UserFormSheetComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly notify = inject(NotificationCenterService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) mode!: 'create' | 'edit';
  @Input() userId: number | null = null;
  @Output() saved = new EventEmitter<User>();
  @Output() closed = new EventEmitter<void>();

  protected readonly titleId = 'user-form-title-' + Math.random().toString(36).slice(2, 9);

  protected roles: string[] = [];
  protected editUsername = '';
  protected saving = false;
  protected formError: string | null = null;
  private usernameManuallyOverridden = false;

  protected displayRole(role: string): string {
    return role.toUpperCase() === 'MANAGER' ? 'PMO' : role;
  }

  protected readonly form = new FormGroup({
    firstName: new FormControl('', { nonNullable: true }),
    lastName: new FormControl('', { nonNullable: true }),
    username: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true }),
    role: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    enabled: new FormControl(true, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.userService.getRoles().subscribe({
      next: (roles) => {
        this.roles = roles;
        const fallback = roles.find((r) => r === 'METIER') ?? roles[0] ?? '';
        if (!this.form.controls.role.value && fallback) {
          this.form.patchValue({ role: fallback });
        }
        if (this.mode === 'create') {
          this.usernameManuallyOverridden = false;
          this.form.controls.firstName.setValidators([Validators.required]);
          this.form.controls.lastName.setValidators([Validators.required]);
          this.form.controls.firstName.updateValueAndValidity();
          this.form.controls.lastName.updateValueAndValidity();
          this.form.controls.password.setValidators([Validators.required, Validators.minLength(8)]);
          this.form.controls.password.updateValueAndValidity();
          merge(this.form.controls.firstName.valueChanges, this.form.controls.lastName.valueChanges)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              if (!this.usernameManuallyOverridden) {
                const gen = generateUsername(
                  this.form.controls.firstName.value,
                  this.form.controls.lastName.value,
                );
                this.form.controls.username.patchValue(gen, { emitEvent: false });
              }
            });
        } else if (this.mode === 'edit' && this.userId !== null) {
          this.form.controls.firstName.clearValidators();
          this.form.controls.lastName.clearValidators();
          this.form.controls.username.clearValidators();
          this.form.controls.firstName.updateValueAndValidity();
          this.form.controls.lastName.updateValueAndValidity();
          this.form.controls.password.setValidators([optionalPasswordMin8()]);
          this.form.controls.password.updateValueAndValidity();
          this.loadUser(this.userId);
        }
      },
      error: (err) => {
        this.formError =
          err instanceof Error ? err.message : getHttpErrorMessage(err, 'Impossible de charger les rôles.');
      },
    });
  }

  onUsernameManualInput(): void {
    this.usernameManuallyOverridden = true;
  }

  private loadUser(id: number): void {
    this.userService.getById(id).subscribe({
      next: (user) => {
        if (!this.canEditUser(user)) {
          void this.router.navigate(['/forbidden']);
          this.close();
          return;
        }
        this.editUsername = user.username;
        this.form.patchValue({
          email: user.email,
          role: user.role,
          enabled: user.enabled,
          password: '',
        });
      },
      error: (err) => {
        this.formError =
          err instanceof Error ? err.message : getHttpErrorMessage(err, 'Impossible de charger l’utilisateur.');
      },
    });
  }

  private canEditUser(user: User): boolean {
    const role = this.authService.getRole();
    const myId = this.authService.getUserId();
    if (role === 'ADMINISTRATEUR') {
      return true;
    }
    if (role === 'MANAGER' && myId !== null) {
      return user.id === myId || (user.createdByManagerId != null && user.createdByManagerId === myId);
    }
    return false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.saving) {
      this.close();
    }
  }

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(ev: MouseEvent): void {
    if (this.saving) {
      return;
    }
    if (ev.target === ev.currentTarget) {
      this.close();
    }
  }

  submit(): void {
    this.formError = null;
    if (this.mode === 'edit' && this.userId === null) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.mode === 'create') {
      const raw = this.form.getRawValue();
      const username = raw.username.trim();
      if (!username) {
        this.formError = 'Le username est requis (généré à partir du prénom et du nom ou saisi manuellement).';
        return;
      }
      const payload: CreateUserPayload = {
        username,
        email: raw.email.trim(),
        password: raw.password,
        role: raw.role,
        enabled: raw.enabled,
      };
      this.saving = true;
      this.userService.create(payload).subscribe({
        next: (created) => {
          this.saving = false;
          this.notify.success('Utilisateur créé avec succès.', 'Utilisateurs', 'validation');
          this.saved.emit(created);
          this.close();
        },
        error: (err) => {
          this.saving = false;
          this.formError =
            err instanceof Error ? err.message : getHttpErrorMessage(err, 'Échec de la création.');
        },
      });
      return;
    }

    const raw = this.form.getRawValue();
    const payload: UpdateUserPayload = {
      email: raw.email.trim(),
      role: raw.role,
      enabled: raw.enabled,
      ...(raw.password && raw.password.trim().length > 0 ? { password: raw.password.trim() } : {}),
    };
    this.saving = true;
    this.userService.update(this.userId!, payload).subscribe({
      next: (updated) => {
        this.saving = false;
        this.notify.success('Utilisateur mis à jour.', 'Utilisateurs', 'validation');
        this.saved.emit(updated);
        this.close();
      },
      error: (err) => {
        this.saving = false;
        this.formError =
          err instanceof Error ? err.message : getHttpErrorMessage(err, 'Échec de la mise à jour.');
      },
    });
  }
}
