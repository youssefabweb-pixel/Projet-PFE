import { Routes } from '@angular/router';
import { FormateurLayoutsComponent } from './pages/formateur-layouts.component';

export const FORMATEUR_ROUTES: Routes = [
  { path: 'form-layouts', component: FormateurLayoutsComponent },
  { path: '', pathMatch: 'full', redirectTo: 'form-layouts' },
];
