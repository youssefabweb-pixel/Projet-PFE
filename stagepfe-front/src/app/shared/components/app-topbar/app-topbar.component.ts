import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ServerNotificationsService } from '../../../core/notifications/server-notifications.service';
import { ThemeService } from '../../../core/theme/theme.service';

/** Même liste que `PROJECT_MODULE_ROLES` dans `app.routes.ts`. */
const PROJECT_NAV_ROLES = new Set(['MANAGER', 'ADMINISTRATEUR', 'MOA', 'METIER', 'DEVELOPPEMENT']);

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, OverlayModule],
  templateUrl: './app-topbar.component.html',
  styleUrl: './app-topbar.component.scss',
})
export class AppTopbarComponent implements OnInit {
  readonly notifications = inject(ServerNotificationsService);
  readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly panelOpen = signal(false);

  readonly overlayPositions = [
    { originX: 'end' as const, originY: 'bottom' as const, overlayX: 'end' as const, overlayY: 'top' as const, offsetY: 8 },
  ];

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.notifications.start();
    }
  }

  togglePanel(): void {
    this.panelOpen.update((v) => !v);
    if (this.panelOpen()) {
      this.notifications.refresh();
    }
  }

  closePanel(): void {
    this.panelOpen.set(false);
  }

  markRead(id: number): void {
    this.notifications.markRead(id);
  }

  markAllRead(): void {
    this.notifications.markAllRead();
  }

  logout(): void {
    this.notifications.stop();
    this.auth.logout();
    void this.router.navigate(['/login']);
  }

  /** Lien accueil : tous les rôles accèdent à la liste projets. */
  homeLink(): string {
    return this.auth.getRole() === 'ADMINISTRATEUR' ? '/users' : '/projects';
  }

  canSeeProjectsNav(): boolean {
    const r = this.auth.getRole();
    return r !== null && r !== 'ADMINISTRATEUR' && PROJECT_NAV_ROLES.has(r);
  }

  canSeeUsersNav(): boolean {
    const r = this.auth.getRole();
    return r === 'ADMINISTRATEUR';
  }

  canSeePlanningNav(): boolean {
    const r = this.auth.getRole();
    return r !== null && r !== 'ADMINISTRATEUR';
  }

  notifIcon(type: string): string {
    switch (type) {
      case 'PROJECT_ASSIGNED_AS_CHEF':
        return '★';
      case 'PROJECT_MEMBER_ADDED':
        return '👥';
      case 'PROJECT_COMPLETED':
        return '✅';
      case 'PROJECT_DELAYED':
      case 'MILESTONE_DELAYED':
        return '⏰';
      case 'NEW_PROJECT_CREATED':
        return '🆕';
      case 'TASK_ASSIGNED':
        return '📌';
      default:
        return '🔔';
    }
  }

  notifLabel(type: string): string {
    switch (type) {
      case 'PROJECT_ASSIGNED_AS_CHEF':
        return 'Chef de projet';
      case 'PROJECT_MEMBER_ADDED':
        return 'Équipe projet';
      case 'PROJECT_COMPLETED':
        return 'Projet terminé';
      case 'PROJECT_DELAYED':
        return 'Projet en retard';
      case 'MILESTONE_DELAYED':
        return 'Jalon en retard';
      case 'NEW_PROJECT_CREATED':
        return 'Nouveau projet';
      case 'TASK_ASSIGNED':
        return 'Affectation tâche';
      default:
        return 'Notification';
    }
  }

  formatTime(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
