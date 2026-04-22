import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageShellComponent } from '../../../shared/ui/page-shell/page-shell.component';

interface UserRow {
  name: string;
  role: string;
  status: 'Active' | 'Pending' | 'Blocked';
}

@Component({
  selector: 'app-collaborateur-tables',
  standalone: true,
  imports: [CommonModule, PageShellComponent],
  template: `
    <app-page-shell title="Tables" subtitle="Migration de la page Sneat tables.">
      <div class="wb-card wb-card-pad">
        <div class="wb-table-wrap">
          <table class="wb-data-table">
            <thead>
              <tr><th>Nom</th><th>R�le</th><th>Statut</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of rows">
                <td>{{ row.name }}</td>
                <td>{{ row.role }}</td>
                <td>{{ row.status }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </app-page-shell>
  `,
  styles: [],
})
export class CollaborateurTablesComponent {
  protected readonly rows: UserRow[] = [
    { name: 'Mohamed', role: 'Admin', status: 'Active' },
    { name: 'Sarra', role: 'Manager', status: 'Pending' },
    { name: 'Yassine', role: 'Collaborateur', status: 'Blocked' },
  ];
}
