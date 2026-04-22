import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { HttpErrorService } from '../../services/http-error.service';

@Component({
  selector: 'app-error-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="error-banner" *ngIf="errorService.message$ | async as message">
      <span>{{ message }}</span>
      <button type="button" (click)="errorService.clear()">x</button>
    </div>
  `,
  styles: [
    `
      .error-banner {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        background: var(--accent-muted);
        border: 1px solid rgba(227, 6, 19, 0.28);
        color: var(--accent);
        padding: 0.75rem 1.15rem;
        border-radius: var(--radius-md);
        font-weight: 500;
      }
      button {
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--accent);
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-weight: 600;
        padding: 0.25rem 0.55rem;
      }
    `,
  ],
})
export class ErrorBannerComponent {
  readonly errorService = inject(HttpErrorService);
}
