import { Routes } from '@angular/router';
import { CollaborateurCardsComponent } from './pages/collaborateur-cards.component';
import { CollaborateurTablesComponent } from './pages/collaborateur-tables.component';

export const COLLABORATEUR_ROUTES: Routes = [
  { path: 'cards', component: CollaborateurCardsComponent },
  { path: 'tables', component: CollaborateurTablesComponent },
  { path: '', pathMatch: 'full', redirectTo: 'cards' },
];
