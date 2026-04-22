import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectorRef,
  Component,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { NotificationCenterService } from '../../../core/notifications/notification-center.service';
import { User } from '../../../core/models/user.models';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { KeyboardShortcutsService } from '../../../core/ux/keyboard-shortcuts.service';
import { getHttpErrorMessage } from '../../../shared/utils/http-error.util';
import { UserFormSheetComponent } from '../components/user-form-sheet.component';
import { UserViewSheetComponent } from '../components/user-view-sheet.component';

export type FormSheetState = null | { mode: 'create' } | { mode: 'edit'; userId: number };

interface RowPerms {
  canEdit: boolean;
  canToggle: boolean;
  canDelete: boolean;
}

export type ColKey = 'id' | 'username' | 'email' | 'role' | 'status' | 'lastLogin' | 'actions';

type SortKey = 'id' | 'username' | 'email' | 'role' | 'enabled' | 'lastLoginAt';

@Component({
  selector: 'app-users-list-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    UserViewSheetComponent,
    UserFormSheetComponent,
  ],
  templateUrl: './users-list-page.component.html',
  styleUrl: './users-list-page.component.scss',
})
export class UsersListPageComponent {
  readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationCenterService);
  private readonly shortcuts = inject(KeyboardShortcutsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly platformId = inject(PLATFORM_ID);

  readonly searchInputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  readonly skeletonRows = [1, 2, 3, 4, 5, 6];

  readonly columnDefs: { key: ColKey; label: string }[] = [
    { key: 'id', label: 'ID' },
    { key: 'username', label: 'User' },
    { key: 'email', label: 'Mail' },
    { key: 'role', label: 'Rôle' },
    { key: 'status', label: 'Statut' },
    { key: 'lastLogin', label: 'Connexion' },
    { key: 'actions', label: 'Actions' },
  ];

  readonly users = signal<User[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly searchRaw = signal('');
  readonly searchDebounced = signal('');

  readonly selectedRoles = signal<Set<string>>(new Set());

  readonly sortKey = signal<SortKey>('id');
  readonly sortDir = signal<'asc' | 'desc'>('asc');

  readonly pageSize = signal(10);
  readonly pageIndex = signal(0);

  readonly colVisible = signal<Record<ColKey, boolean>>({
    id: true,
    username: true,
    email: true,
    role: true,
    status: true,
    lastLogin: true,
    actions: true,
  });

  protected viewUserId: number | null = null;
  protected formSheet: FormSheetState = null;
  protected rowPerms = new Map<number, RowPerms>();

  readonly roleOptions = computed(() => {
    const set = new Set<string>();
    for (const u of this.users()) {
      set.add(u.role);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  });

  readonly filteredSorted = computed(() => {
    let list = [...this.users()];
    const q = this.searchDebounced().trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q),
      );
    }
    const roles = this.selectedRoles();
    if (roles.size > 0) {
      list = list.filter((u) => roles.has(u.role));
    }
    const key = this.sortKey();
    const dir = this.sortDir();
    list.sort((a, b) => {
      const c = this.compareUsers(a, b, key);
      return dir === 'asc' ? c : -c;
    });
    return list;
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredSorted().length / this.pageSize())),
  );

  readonly pagedUsers = computed(() => {
    const all = this.filteredSorted();
    const start = this.pageIndex() * this.pageSize();
    return all.slice(start, start + this.pageSize());
  });

  constructor() {
    effect((onCleanup) => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      const raw = this.searchRaw();
      const id = window.setTimeout(() => this.searchDebounced.set(raw), 300);
      onCleanup(() => clearTimeout(id));
    });

    effect(() => {
      this.searchDebounced();
      this.selectedRoles();
      untracked(() => this.pageIndex.set(0));
    });

    effect(() => {
      const t = this.shortcuts.usersSearchFocusTick();
      if (t === 0) {
        return;
      }
      untracked(() => {
        queueMicrotask(() => this.searchInputRef()?.nativeElement?.focus());
      });
    });

    effect(() => {
      const t = this.shortcuts.openUserCreateTick();
      if (t === 0) {
        return;
      }
      untracked(() => {
        if (this.canCreateUser()) {
          this.openCreate();
        }
      });
    });

    afterNextRender(() => this.fetchUsersPage());
  }

  protected canCreateUser(): boolean {
    const r = this.authService.getRole();
    return r === 'MANAGER' || r === 'ADMINISTRATEUR';
  }

  toggleSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
  }

  sortIcon(key: SortKey): string {
    if (this.sortKey() !== key) {
      return '';
    }
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  toggleRoleChip(role: string): void {
    this.selectedRoles.update((s) => {
      const n = new Set(s);
      if (n.has(role)) {
        n.delete(role);
      } else {
        n.add(role);
      }
      return n;
    });
  }

  clearRoleFilters(): void {
    this.selectedRoles.set(new Set());
  }

  toggleCol(key: ColKey): void {
    this.colVisible.update((v) => ({ ...v, [key]: !v[key] }));
  }

  prevPage(): void {
    this.pageIndex.update((p) => Math.max(0, p - 1));
  }

  nextPage(): void {
    this.pageIndex.update((p) => Math.min(this.totalPages() - 1, p + 1));
  }

  exportCsv(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const rows = this.filteredSorted();
    const headers = ['id', 'username', 'email', 'role', 'enabled', 'lastLoginAt'];
    const lines = [
      headers.join(';'),
      ...rows.map((u) =>
        [
          u.id,
          u.username,
          u.email,
          u.role,
          u.enabled ? 'actif' : 'inactif',
          u.lastLoginAt ?? '',
        ].join(';'),
      ),
    ];
    const csv = '\ufeff' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `utilisateurs-wifak-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.notifications.success('Export CSV généré.', 'Export', 'system');
  }

  private compareUsers(a: User, b: User, key: SortKey): number {
    switch (key) {
      case 'id':
        return a.id - b.id;
      case 'username':
        return a.username.localeCompare(b.username, 'fr');
      case 'email':
        return a.email.localeCompare(b.email, 'fr');
      case 'role':
        return a.role.localeCompare(b.role, 'fr');
      case 'enabled': {
        if (a.enabled === b.enabled) {
          return 0;
        }
        return a.enabled ? -1 : 1;
      }
      case 'lastLoginAt': {
        const ta = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
        const tb = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
        return ta - tb;
      }
      default:
        return 0;
    }
  }

  private fetchUsersPage(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.cdr.markForCheck();

    this.authService
      .syncProfile()
      .pipe(catchError(() => of(null)))
      .subscribe({
        complete: () => this.cdr.markForCheck(),
      });

    this.userService
      .getAll()
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (list) => {
          this.users.set(list);
          this.rebuildRowPerms();
          this.maybeWelcomeNotification();
          this.seedDemoNotifications(list.length);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loadError.set(
            getHttpErrorMessage(
              err,
              'Impossible de charger les utilisateurs. Vérifiez le serveur et votre rôle (MANAGER ou ADMINISTRATEUR).',
            ),
          );
          this.users.set([]);
          this.rowPerms.clear();
          this.notifications.error(this.loadError() ?? 'Erreur chargement utilisateurs', 'Utilisateurs', 'system');
          this.cdr.markForCheck();
        },
      });
  }

  /** Notification de bienvenue une fois par session navigateur. */
  private maybeWelcomeNotification(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const key = 'wifak-welcome-notif';
    if (sessionStorage.getItem(key)) {
      return;
    }
    sessionStorage.setItem(key, '1');
    const u = this.authService.getUsername();
    this.notifications.info(
      u ? `Bonjour ${u}. Votre espace est prêt.` : 'Bienvenue sur la plateforme de gestion de projets WIFAK BANK.',
      'Espace connecté',
      'system',
    );
  }

  /** Exemples de notifications « push-like » (retard / validation) — démo UX. */
  private seedDemoNotifications(userCount: number): void {
    if (userCount === 0 || !isPlatformBrowser(this.platformId)) {
      return;
    }
    const key = 'wifak-demo-push';
    if (sessionStorage.getItem(key)) {
      return;
    }
    sessionStorage.setItem(key, '1');
    this.notifications.warning(
      'Jalon « Recette MOA » approche de la date cible — vérifier les livrables.',
      'Risque de retard',
      'delay',
    );
    this.notifications.info(
      'Une étape du workflow est en attente de validation PMO.',
      'Validation',
      'validation',
    );
  }

  retryLoad(): void {
    this.fetchUsersPage();
  }

  protected roleBadgeClass(role: string): string {
    let slug = role.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    if (slug === 'developpement') {
      slug = 'developpeur';
    }
    const known = [
      'administrateur',
      'manager',
      'chef_de_projet',
      'moa',
      'metier',
      'developpeur',
    ];
    const key = known.includes(slug) ? slug : 'default';
    return 'role--' + key;
  }

  private rebuildRowPerms(): void {
    this.rowPerms.clear();
    const role = this.authService.getRole();
    const myId = this.authService.getUserId();
    for (const u of this.users()) {
      this.rowPerms.set(u.id, {
        canEdit: this.computeCanEdit(role, myId, u),
        canToggle: this.computeCanToggle(role, myId, u),
        canDelete: this.computeCanDelete(role, myId, u),
      });
    }
  }

  private computeCanEdit(role: string | null, myId: number | null, user: User): boolean {
    if (role === 'ADMINISTRATEUR') {
      return true;
    }
    if (role === 'MANAGER' && myId !== null) {
      return user.id === myId || (user.createdByManagerId != null && user.createdByManagerId === myId);
    }
    return false;
  }

  private computeCanDelete(role: string | null, myId: number | null, user: User): boolean {
    if (role === 'ADMINISTRATEUR') {
      return true;
    }
    if (role === 'MANAGER' && myId !== null) {
      return (
        user.id !== myId && user.createdByManagerId != null && user.createdByManagerId === myId
      );
    }
    return false;
  }

  private computeCanToggle(role: string | null, myId: number | null, user: User): boolean {
    if (role === 'ADMINISTRATEUR') {
      return true;
    }
    if (role === 'MANAGER' && myId !== null) {
      return (
        user.id !== myId &&
        user.createdByManagerId != null &&
        user.createdByManagerId === myId
      );
    }
    return false;
  }

  openView(id: number): void {
    this.formSheet = null;
    this.viewUserId = id;
  }

  openCreate(): void {
    this.viewUserId = null;
    this.formSheet = { mode: 'create' };
  }

  openEdit(userId: number): void {
    this.viewUserId = null;
    this.formSheet = { mode: 'edit', userId };
  }

  onUserSaved(user: User): void {
    this.formSheet = null;
    const list = this.users();
    const idx = list.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      const next = [...list];
      next[idx] = user;
      this.users.set(next);
    } else {
      this.users.set([...list, user]);
    }
    this.rebuildRowPerms();
    this.cdr.markForCheck();
  }

  async confirmToggle(user: User): Promise<void> {
    const next = !user.enabled;
    const action = next ? 'activer' : 'désactiver';
    const r = await Swal.fire({
      title: 'Confirmer',
      text: `Voulez-vous ${action} ${user.username} ?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Oui',
      cancelButtonText: 'Annuler',
    });
    if (!r.isConfirmed) {
      return;
    }

    const list = [...this.users()];
    const idx = list.findIndex((u) => u.id === user.id);
    if (idx < 0) {
      return;
    }
    const prev = list[idx].enabled;
    list[idx] = { ...list[idx], enabled: next };
    this.users.set(list);
    this.cdr.markForCheck();

    this.userService.toggleStatus(user.id, next).subscribe({
      next: () => {
        this.notifications.success(next ? 'Compte activé.' : 'Compte désactivé.', 'Utilisateurs', 'validation');
      },
      error: (err) => {
        const rollback = [...this.users()];
        const i = rollback.findIndex((u) => u.id === user.id);
        if (i >= 0) {
          rollback[i] = { ...rollback[i], enabled: prev };
          this.users.set(rollback);
        }
        this.notifications.error(
          err instanceof Error ? err.message : getHttpErrorMessage(err, 'Erreur.'),
          'Utilisateurs',
          'system',
        );
        this.cdr.markForCheck();
      },
    });
  }

  async confirmDelete(user: User): Promise<void> {
    const r = await Swal.fire({
      title: 'Supprimer',
      text: `Êtes-vous sûr de vouloir supprimer ${user.username} ? Cette action est irréversible.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#E30613',
    });
    if (!r.isConfirmed) {
      return;
    }
    this.userService.delete(user.id).subscribe({
      next: () => {
        this.users.set(this.users().filter((u) => u.id !== user.id));
        this.rebuildRowPerms();
        this.notifications.success('Utilisateur supprimé.', 'Utilisateurs', 'system');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.notifications.error(
          err instanceof Error ? err.message : getHttpErrorMessage(err, 'Erreur.'),
          'Utilisateurs',
          'system',
        );
      },
    });
  }
}
