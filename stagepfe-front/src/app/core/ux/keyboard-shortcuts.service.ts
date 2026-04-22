import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Raccourcis globaux (évite de capturer si l’utilisateur est dans un input sauf Ctrl+K).
 * Ctrl+K : demande focus recherche utilisateurs (via tick consommé par la page).
 * Ctrl+Shift+N : navigation création utilisateur (route + flag).
 */
@Injectable({ providedIn: 'root' })
export class KeyboardShortcutsService {
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  /** Incrémenté pour que UsersListPage focus la barre de recherche */
  readonly usersSearchFocusTick = signal(0);

  /** Incrémenté pour ouvrir le formulaire création utilisateur */
  readonly openUserCreateTick = signal(0);

  init(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.addEventListener('keydown', (ev: KeyboardEvent) => {
      const target = ev.target as HTMLElement | null;
      const tag = target?.tagName;
      const inField =
        tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable === true;

      if (ev.ctrlKey && ev.key.toLowerCase() === 'k') {
        ev.preventDefault();
        this.usersSearchFocusTick.update((n) => n + 1);
        return;
      }

      if (ev.ctrlKey && ev.shiftKey && ev.key.toLowerCase() === 'n') {
        ev.preventDefault();
        void this.router.navigate(['/users']);
        this.openUserCreateTick.update((n) => n + 1);
        return;
      }

      if (inField) {
        return;
      }
    });
  }
}
