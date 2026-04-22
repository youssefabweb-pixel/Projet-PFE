import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  afterNextRender,
  inject,
} from '@angular/core';
import { finalize } from 'rxjs/operators';
import { User } from '../../../core/models/user.models';
import { UserService } from '../../../core/services/user.service';
import { getHttpErrorMessage } from '../../../shared/utils/http-error.util';

@Component({
  selector: 'app-user-view-sheet',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="overlay" role="presentation" (click)="onBackdropClick($event)">
      <div
        class="panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-view-title"
        (click)="$event.stopPropagation()"
      >
        <header class="panel__head">
          <h2 id="user-view-title">Fiche utilisateur</h2>
          <button type="button" class="icon-btn" (click)="close()" aria-label="Fermer">×</button>
        </header>

        <div class="panel__body">
          <div *ngIf="loading" class="state state--load">
            <span class="wb-spinner" aria-hidden="true"></span>
            Chargement…
          </div>
          <p *ngIf="error" class="state state--error">{{ error }}</p>

          <dl *ngIf="user as u" class="fields">
            <div><dt>ID</dt><dd>{{ u.id }}</dd></div>
            <div><dt>Identifiant</dt><dd>{{ u.username }}</dd></div>
            <div><dt>E-mail</dt><dd>{{ u.email }}</dd></div>
            <div>
              <dt>Rôle</dt>
              <dd><span class="badge" [ngClass]="roleBadgeClass(u.role)">{{ u.role }}</span></dd>
            </div>
            <div>
              <dt>Statut</dt>
              <dd>
                <span class="badge" [class.badge--active]="u.enabled" [class.badge--inactive]="!u.enabled">
                  {{ u.enabled ? 'Actif' : 'Inactif' }}
                </span>
              </dd>
            </div>
            <div><dt>Créé le</dt><dd>{{ u.createdAt | date : 'short' }}</dd></div>
            <div><dt>Modifié le</dt><dd>{{ u.updatedAt | date : 'short' }}</dd></div>
            <div><dt>Dernière connexion</dt><dd>{{ u.lastLoginAt ? (u.lastLoginAt | date : 'short') : '—' }}</dd></div>
            <div><dt>Créé par (manager)</dt><dd>{{ u.createdByManagerId ?? '—' }}</dd></div>
          </dl>
        </div>

        <footer class="panel__foot">
          <button type="button" class="btn btn--primary" (click)="close()">Fermer</button>
        </footer>
      </div>
    </div>
  `,
  styles: [
    `
      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(10, 22, 40, 0.5);
        backdrop-filter: blur(4px);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
      }
      .panel {
        background: var(--surface);
        border-radius: var(--radius-3xl);
        border: 1px solid var(--border);
        max-width: 440px;
        width: 100%;
        max-height: 90vh;
        overflow: auto;
        box-shadow: var(--shadow-overlay);
      }
      .panel__head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.35rem;
        border-bottom: 1px solid var(--border);
        background: linear-gradient(180deg, var(--neutral-50) 0%, var(--surface) 100%);
      }
      .panel__head h2 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--neutral-900);
      }
      .panel__body {
        padding: 1rem 1.35rem;
      }
      .panel__foot {
        padding: 0.85rem 1.35rem 1.35rem;
        display: flex;
        justify-content: flex-end;
      }
      .icon-btn {
        border: none;
        background: transparent;
        font-size: 1.5rem;
        line-height: 1;
        cursor: pointer;
        color: var(--text-muted);
        border-radius: var(--radius-sm);
        transition: color 0.15s ease, background 0.15s ease;
      }
      .icon-btn:hover {
        color: var(--accent);
        background: var(--accent-muted);
      }
      .fields {
        margin: 0;
        display: grid;
        gap: 0.75rem;
      }
      .fields > div {
        display: grid;
        grid-template-columns: minmax(120px, 140px) 1fr;
        gap: 0.5rem;
        font-size: 0.9rem;
      }
      dt {
        margin: 0;
        color: var(--text-muted);
        font-weight: 600;
      }
      dd {
        margin: 0;
        color: var(--neutral-900);
      }
      .badge {
        display: inline-block;
        padding: 0.2rem 0.5rem;
        border-radius: var(--radius-sm);
        font-size: 0.72rem;
        font-weight: 700;
      }
      .badge--active {
        background: var(--success-muted);
        color: #007a3d;
      }
      .badge--inactive {
        background: var(--danger-muted);
        color: var(--danger);
      }
      .role--administrateur {
        background: rgba(0, 48, 135, 0.12);
        color: var(--primary);
      }
      .role--manager {
        background: rgba(0, 85, 204, 0.14);
        color: var(--primary-light);
      }
      .role--chef_de_projet {
        background: rgba(0, 166, 81, 0.12);
        color: #007a3d;
      }
      .role--moa {
        background: var(--warning-muted);
        color: #8a6500;
      }
      .role--metier {
        background: rgba(212, 160, 23, 0.15);
        color: #7a5600;
      }
      .role--developpeur {
        background: var(--metal-light);
        color: var(--neutral-700);
      }
      .role--default {
        background: var(--neutral-100);
        color: var(--neutral-600);
      }
      .state {
        text-align: center;
        color: var(--text-muted);
      }
      .state--load {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem 0;
      }
      .state--error {
        color: var(--accent);
        font-weight: 500;
      }
    `,
  ],
})
export class UserViewSheetComponent {
  private readonly userService = inject(UserService);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) userId!: number;
  @Output() closed = new EventEmitter<void>();

  protected user: User | null = null;
  protected loading = true;
  protected error: string | null = null;

  constructor() {
    afterNextRender(() => this.loadDetail());
  }

  private loadDetail(): void {
    this.loading = true;
    this.error = null;
    this.user = null;
    this.cdr.markForCheck();

    this.userService
      .getById(this.userId)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (u) => {
          this.user = u;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error =
            err instanceof Error ? err.message : getHttpErrorMessage(err, 'Impossible de charger cet utilisateur.');
          this.cdr.markForCheck();
        },
      });
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

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) {
      this.close();
    }
  }
}
