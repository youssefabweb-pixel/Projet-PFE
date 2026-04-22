import { Routes } from '@angular/router';
import { ManagerTypographyComponent } from './pages/manager-typography.component';
import { ManagerIconsComponent } from './pages/manager-icons.component';

export const MANAGER_ROUTES: Routes = [
  { path: 'typography', component: ManagerTypographyComponent },
  { path: 'icons', component: ManagerIconsComponent },
  { path: '', pathMatch: 'full', redirectTo: 'typography' },
];
