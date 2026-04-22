import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { NotificationApiService, ServerNotification } from '../services/notification-api.service';

const POLL_INTERVAL_MS = 30_000;

/**
 * Source de vérité pour les notifications côté serveur (cloche topbar).
 * - Polling léger quand l'utilisateur est authentifié.
 * - Expose un signal `items` et `unreadCount` réactifs.
 */
@Injectable({ providedIn: 'root' })
export class ServerNotificationsService {
  private readonly api = inject(NotificationApiService);
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly itemsSig = signal<ServerNotification[]>([]);
  readonly items = this.itemsSig.asReadonly();
  readonly unreadCount = computed(() => this.itemsSig().filter((n) => !n.read).length);

  private pollHandle: ReturnType<typeof setInterval> | null = null;
  private fetching = false;

  /** Démarre le polling (idempotent). Appelé après login et au bootstrap de l'application. */
  start(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.pollHandle) return;
    this.refresh();
    this.pollHandle = setInterval(() => this.refresh(), POLL_INTERVAL_MS);
  }

  stop(): void {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
    this.itemsSig.set([]);
  }

  refresh(): void {
    if (!this.auth.isAuthenticated() || this.fetching) return;
    this.fetching = true;
    this.api.list().subscribe({
      next: (list) => {
        this.itemsSig.set(list);
        this.fetching = false;
      },
      error: () => {
        this.fetching = false;
      },
    });
  }

  markRead(id: number): void {
    this.itemsSig.update((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
    this.api.markRead(id).subscribe({ error: () => this.refresh() });
  }

  markAllRead(): void {
    this.itemsSig.update((list) => list.map((n) => ({ ...n, read: true })));
    this.api.markAllRead().subscribe({ error: () => this.refresh() });
  }
}
