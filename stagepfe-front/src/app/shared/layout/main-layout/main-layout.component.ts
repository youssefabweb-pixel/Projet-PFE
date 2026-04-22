import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { UserAuth } from '../../../core/services/user-auth';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  private readonly authService = inject(UserAuth);
  private readonly router = inject(Router);

  sidebarOpen = true;
  currentYear = new Date().getFullYear();

  protected readonly navItems = [
    { label: 'Dashboard Admin', route: '/admin' },
    { label: 'Manager - Typography', route: '/manager/typography' },
    { label: 'Manager - Icons', route: '/manager/icons' },
    { label: 'Collaborateur - Cards', route: '/collaborateur/cards' },
    { label: 'Collaborateur - Tables', route: '/collaborateur/tables' },
    { label: 'Formateur - Forms', route: '/formateur/form-layouts' },
    { label: 'User - Account', route: '/user/account-settings' },
  ];

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
