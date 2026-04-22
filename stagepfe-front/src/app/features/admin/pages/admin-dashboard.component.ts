import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageShellComponent } from '../../../shared/ui/page-shell/page-shell.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, PageShellComponent],
  template: `
    <app-page-shell title="Tableau de bord" subtitle="Vue d’ensemble — style WIFAK BANK.">
      <div class="wb-stats-grid">
        <article class="wb-stat-card wb-card--interactive" *ngFor="let stat of stats">
          <h3>{{ stat.label }}</h3>
          <strong>{{ stat.value }}</strong>
        </article>
      </div>
    </app-page-shell>
  `,
  styles: [],
})
export class AdminDashboardComponent {
  protected readonly stats = [
    { label: 'Profit', value: '$12,628' },
    { label: 'Sales', value: '$4,679' },
    { label: 'Payments', value: '$2,468' },
    { label: 'Transactions', value: '$14,857' },
  ];
}
