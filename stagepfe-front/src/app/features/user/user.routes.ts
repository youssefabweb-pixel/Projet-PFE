import { Routes } from '@angular/router';
import { UserAccountSettingsComponent } from './pages/user-account-settings.component';
import { LoginComponent } from './pages/login.component';
import { RegisterComponent } from './pages/register.component';
import { ForgotPasswordComponent } from './pages/forgot-password.component';

export const USER_ROUTES: Routes = [
  { path: 'account-settings', component: UserAccountSettingsComponent },
];

export const PUBLIC_AUTH_ROUTES: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
];
