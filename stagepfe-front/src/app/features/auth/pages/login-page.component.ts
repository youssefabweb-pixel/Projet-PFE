import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HttpErrorService } from '../../../shared/services/http-error.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly errorService = inject(HttpErrorService);

  protected loading = false;
  protected readonly form = new FormGroup({
    usernameOrEmail: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
  });

  submit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.errorService.clear();
    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading = false;
        const r = this.authService.getRole();
        if (r === 'ADMINISTRATEUR') {
          void this.router.navigate(['/users']);
        } else if (r === 'MOA') {
          void this.router.navigate(['/tasks']);
        } else {
          void this.router.navigate(['/projects']);
        }
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
