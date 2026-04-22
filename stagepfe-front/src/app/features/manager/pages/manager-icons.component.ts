import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageShellComponent } from '../../../shared/ui/page-shell/page-shell.component';

@Component({
  selector: 'app-manager-icons',
  standalone: true,
  imports: [CommonModule, PageShellComponent],
  template: `
    <app-page-shell title="Icons" subtitle="Migration de la page Sneat icons.">
      <div class="icon-grid">
        <div class="wb-card wb-card-pad" *ngFor="let icon of icons">{{ icon }}</div>
      </div>
    </app-page-shell>
  `,
  styles: [
    `
      .icon-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 1rem;
      }
      .wb-card {
        text-align: center;
        font-weight: 600;
        color: var(--primary);
      }
    `,
  ],
})
export class ManagerIconsComponent {
  protected readonly icons = ['bx-home', 'bx-user', 'bx-cog', 'bx-grid-alt', 'bx-file'];
}
