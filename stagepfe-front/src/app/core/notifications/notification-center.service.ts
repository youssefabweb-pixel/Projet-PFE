import { Injectable, computed, inject, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AppNotification, AppNotificationCategory, AppNotificationKind } from './notification.models';

const MAX_STORED = 80;

/**
 * Centre de notifications : historique réactif (signals) + toasts ngx-toastr.
 * Les méthodes push* ajoutent une entrée et déclenchent un toast aligné sur le type.
 */
@Injectable({ providedIn: 'root' })
export class NotificationCenterService {
  private readonly toastr = inject(ToastrService);

  /** Historique le plus récent en tête */
  private readonly items = signal<AppNotification[]>([]);

  /** Filtre du panneau (toutes | kind | category) */
  readonly filterKind = signal<AppNotificationKind | 'all'>('all');
  readonly filterCategory = signal<AppNotificationCategory | 'all'>('all');

  readonly all = this.items.asReadonly();

  readonly unreadCount = computed(() => this.items().filter((n) => !n.read).length);

  readonly filtered = computed(() => {
    let list = this.items();
    const k = this.filterKind();
    const c = this.filterCategory();
    if (k !== 'all') {
      list = list.filter((n) => n.kind === k);
    }
    if (c !== 'all') {
      list = list.filter((n) => n.category === c);
    }
    return list;
  });

  success(
    message: string,
    title = 'Succès',
    category: AppNotificationCategory = 'system',
    meta?: AppNotification['meta'],
  ): void {
    this.push('success', category, title, message, meta);
    this.toastr.success(message, title);
  }

  error(
    message: string,
    title = 'Erreur',
    category: AppNotificationCategory = 'system',
    meta?: AppNotification['meta'],
  ): void {
    this.push('error', category, title, message, meta);
    this.toastr.error(message, title);
  }

  warning(
    message: string,
    title = 'Attention',
    category: AppNotificationCategory = 'delay',
    meta?: AppNotification['meta'],
  ): void {
    this.push('warning', category, title, message, meta);
    this.toastr.warning(message, title);
  }

  info(
    message: string,
    title = 'Information',
    category: AppNotificationCategory = 'system',
    meta?: AppNotification['meta'],
  ): void {
    this.push('info', category, title, message, meta);
    this.toastr.info(message, title);
  }

  /** Toast uniquement (sans historique) — ex. actions très fréquentes */
  toastOnly(kind: AppNotificationKind, message: string, title?: string): void {
    switch (kind) {
      case 'success':
        this.toastr.success(message, title);
        break;
      case 'error':
        this.toastr.error(message, title);
        break;
      case 'warning':
        this.toastr.warning(message, title);
        break;
      default:
        this.toastr.info(message, title);
    }
  }

  markRead(id: string): void {
    this.items.update((list) =>
      list.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }

  markAllRead(): void {
    this.items.update((list) => list.map((n) => ({ ...n, read: true })));
  }

  clearRead(): void {
    this.items.update((list) => list.filter((n) => !n.read));
  }

  clearAll(): void {
    this.items.set([]);
  }

  setFilterKind(v: AppNotificationKind | 'all'): void {
    this.filterKind.set(v);
  }

  setFilterCategory(v: AppNotificationCategory | 'all'): void {
    this.filterCategory.set(v);
  }

  private push(
    kind: AppNotificationKind,
    category: AppNotificationCategory,
    title: string,
    message: string,
    meta?: AppNotification['meta'],
  ): void {
    const n: AppNotification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      kind,
      category,
      title,
      message,
      createdAt: Date.now(),
      read: false,
      meta,
    };
    this.items.update((list) => {
      const next = [n, ...list];
      return next.length > MAX_STORED ? next.slice(0, MAX_STORED) : next;
    });
  }
}
