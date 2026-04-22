import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { DOMAIN_LABELS, Project, ProjectDomain, ProjectStatus } from '../../../core/models/project.models';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationCenterService } from '../../../core/notifications/notification-center.service';
import { ProjectService } from '../../../core/services/project.service';
import { ProjectSheetDialogComponent, ProjectSheetDialogData } from '../dialogs/project-sheet-dialog.component';

type StatusFilter = 'ALL' | ProjectStatus;

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, DatePipe],
  templateUrl: './projects-page.component.html',
  styleUrl: './projects-page.component.scss',
})
export class ProjectsPageComponent implements OnInit {
  private readonly projectService = inject(ProjectService);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationCenterService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly projects = signal<Project[]>([]);
  readonly search = signal('');
  readonly statusFilter = signal<StatusFilter>('ALL');

  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const st = this.statusFilter();
    return this.projects().filter((p) => {
      if (st !== 'ALL' && p.status !== st) return false;
      if (!q) return true;
      const blob = `${p.code} ${p.name} ${p.description ?? ''} ${p.chefProjet?.username ?? ''}`.toLowerCase();
      return blob.includes(q);
    });
  });

  get stats() {
    const all = this.projects();
    return {
      total: all.length,
      enCours: all.filter((p) => p.status === 'EN_COURS').length,
      termine: all.filter((p) => p.status === 'TERMINE').length,
      brouillon: all.filter((p) => p.status === 'BROUILLON').length,
      enPause: all.filter((p) => p.status === 'EN_PAUSE').length,
    };
  }

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.projectService
      .getAll()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (rows) => this.projects.set(rows),
        error: (e: Error) => this.loadError.set(e.message),
      });
  }

  isElevated(): boolean {
    const r = this.auth.getRole();
    return r === 'MANAGER' || r === 'ADMINISTRATEUR';
  }

  canCreate(): boolean {
    return this.isElevated();
  }

  /** Suppression autorisée pour MANAGER et ADMINISTRATEUR. */
  canDelete(): boolean {
    return this.isElevated();
  }

  canEdit(p: Project): boolean {
    const uid = this.auth.getUserId();
    if (uid == null) return false;
    if (this.isElevated()) return true;
    if (p.chefProjet?.id === uid && p.cpEditingUnlocked) return true;
    return false;
  }

  isParticipantOf(p: Project): boolean {
    const uid = this.auth.getUserId();
    if (!uid || this.isElevated()) return false;
    if (p.chefProjet?.id === uid) return false;
    return p.members.some((m) => m.id === uid);
  }

  isChefProjetOf(p: Project): boolean {
    const uid = this.auth.getUserId();
    return !!uid && p.chefProjet?.id === uid;
  }

  statusKey(status: ProjectStatus): string {
    switch (status) {
      case 'EN_COURS': return 'run';
      case 'EN_PAUSE': return 'pause';
      case 'TERMINE': return 'done';
      case 'ANNULE': return 'cancel';
      default: return 'draft';
    }
  }

  statusLabel(status: ProjectStatus): string {
    switch (status) {
      case 'BROUILLON': return 'Brouillon';
      case 'EN_COURS': return 'En cours';
      case 'EN_PAUSE': return 'En pause';
      case 'TERMINE': return 'Terminé';
      case 'ANNULE': return 'Annulé';
    }
  }

  domainLabel(d: ProjectDomain | null | undefined): string {
    if (!d) return '—';
    return DOMAIN_LABELS[d] ?? d;
  }

  roleLabel(role: string): string {
    const map: Record<string, string> = {
      ADMINISTRATEUR: 'Admin',
      MANAGER: 'PMO',
      MOA: 'MOA',
      METIER: 'Métier',
      DEVELOPPEMENT: 'Développement',
    };
    return map[role] ?? role;
  }

  initial(name: string): string {
    return name ? name[0].toUpperCase() : '?';
  }

  openCreate(): void {
    const ref = this.dialog.open(ProjectSheetDialogComponent, {
      width: 'min(860px, 100%)',
      maxWidth: '96vw',
      maxHeight: '94vh',
      autoFocus: 'dialog',
      panelClass: 'wb-dialog-panel',
      data: { mode: 'create' } satisfies ProjectSheetDialogData,
    });
    ref.afterClosed().subscribe((ok) => { if (ok) this.reload(); });
  }

  openView(p: Project, event?: Event): void {
    event?.stopPropagation();
    const ref = this.dialog.open(ProjectSheetDialogComponent, {
      width: 'min(860px, 100%)',
      maxWidth: '96vw',
      maxHeight: '94vh',
      panelClass: 'wb-dialog-panel',
      data: { mode: 'view', project: p } satisfies ProjectSheetDialogData,
    });
    ref.afterClosed().subscribe((ok) => { if (ok) this.reload(); });
  }

  openCard(p: Project): void {
    if (this.canEdit(p)) {
      this.openEdit(p);
    } else {
      this.openView(p);
    }
  }

  openEdit(p: Project, event?: Event): void {
    event?.stopPropagation();
    const ref = this.dialog.open(ProjectSheetDialogComponent, {
      width: 'min(860px, 100%)',
      maxWidth: '96vw',
      maxHeight: '94vh',
      panelClass: 'wb-dialog-panel',
      data: { mode: 'edit', project: p } satisfies ProjectSheetDialogData,
    });
    ref.afterClosed().subscribe((ok) => { if (ok) this.reload(); });
  }

  async confirmDelete(p: Project, event: Event): Promise<void> {
    event.stopPropagation();
    const res = await Swal.fire({
      title: 'Supprimer la fiche ?',
      html: `Le projet <strong>${p.code}</strong> — <em>${p.name}</em> sera supprimé définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#e30613',
      cancelButtonColor: '#6c757d',
    });
    if (!res.isConfirmed) return;
    this.projectService.delete(p.id).subscribe({
      next: () => {
        this.notifications.success(`Projet ${p.code} supprimé.`, 'Supprimé', 'task');
        this.reload();
      },
      error: (e: Error) => this.notifications.error(e.message),
    });
  }

  goToPlanning(p: Project, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/tasks'], { queryParams: { projectId: p.id } });
  }
}
