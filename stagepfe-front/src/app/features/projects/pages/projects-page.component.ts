import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { DOMAIN_LABELS, Project, ProjectDomain, ProjectStatus } from '../../../core/models/project.models';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationCenterService } from '../../../core/notifications/notification-center.service';
import { PlanningProject } from '../../../core/models/planning.models';
import { PlanningProgressService } from '../../../core/services/planning-progress.service';
import { ProjectService } from '../../../core/services/project.service';
import { ProjectSheetDialogComponent, ProjectSheetDialogData } from '../dialogs/project-sheet-dialog.component';

type StatusFilter = 'ALL' | ProjectStatus;
type ExportCategory = 'ALL' | 'DELAYED' | 'TERMINE' | 'EN_COURS' | 'BROUILLON';
type ViewMode = 'grid' | 'list';

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, DatePipe],
  templateUrl: './projects-page.component.html',
  styleUrl: './projects-page.component.scss',
})
export class ProjectsPageComponent implements OnInit {
  private readonly projectService = inject(ProjectService);
  private readonly planningService = inject(PlanningProgressService);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationCenterService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly projects = signal<Project[]>([]);
  readonly delayedProjectIds = signal<Set<number>>(new Set<number>());
  readonly search = signal('');
  readonly statusFilter = signal<StatusFilter>('ALL');
  readonly delayedOnly = signal(false);
  readonly viewMode = signal<ViewMode>('grid');

  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const st = this.statusFilter();
    return this.projects().filter((p) => {
      if (this.delayedOnly() && !this.isProjectDelayed(p.id)) return false;
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
      enRetard: all.filter((p) => this.isProjectDelayed(p.id)).length,
    };
  }

  ngOnInit(): void {
    const saved = localStorage.getItem('pp-view-mode') as ViewMode | null;
    if (saved === 'grid' || saved === 'list') this.viewMode.set(saved);
    this.reload();
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
    localStorage.setItem('pp-view-mode', mode);
  }

  setStatusFilter(filter: StatusFilter): void {
    this.statusFilter.set(filter);
    this.delayedOnly.set(false);
  }

  showDelayedOnly(): void {
    this.statusFilter.set('ALL');
    this.delayedOnly.set(true);
  }

  reload(): void {
    this.loading.set(true);
    this.loadError.set(null);
    forkJoin({
      projects: this.projectService.getAll(),
      planning: this.planningService.getProjects().pipe(catchError(() => of([] as PlanningProject[]))),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ projects, planning }) => {
          this.projects.set(projects);
          this.delayedProjectIds.set(this.computeDelayedProjectIds(planning));
        },
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
      width: 'min(1040px, 100%)',
      maxWidth: '98vw',
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
      width: 'min(1040px, 100%)',
      maxWidth: '98vw',
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
      width: 'min(1040px, 100%)',
      maxWidth: '98vw',
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

  exportPmoExcel(): void {
    if (!this.isElevated()) {
      this.notifications.error('Export réservé au PMO / administrateur.', 'Export');
      return;
    }

    // Export basé sur les icônes/statistiques du header (portefeuille complet),
    // et non sur le filtre de vue courant.
    const source = this.projects();
    const delayed = source.filter((p) => this.isProjectDelayed(p.id));
    const completed = source.filter((p) => p.status === 'TERMINE');
    const inProgress = source.filter((p) => p.status === 'EN_COURS');
    const draft = source.filter((p) => p.status === 'BROUILLON');

    const workbook = XLSX.utils.book_new();
    this.appendSheet(workbook, 'Tous les projets', source);
    this.appendSheet(workbook, 'Projets en retard', delayed);
    this.appendSheet(workbook, 'Projets terminés', completed);
    this.appendSheet(workbook, 'Projets en cours', inProgress);
    this.appendSheet(workbook, 'Projets brouillons', draft);

    const stamp = new Date();
    const y = stamp.getFullYear();
    const m = String(stamp.getMonth() + 1).padStart(2, '0');
    const d = String(stamp.getDate()).padStart(2, '0');
    XLSX.writeFile(workbook, `export-projets-pmo-${y}${m}${d}.xlsx`);
    this.notifications.success('Export Excel généré avec succès.', 'Export');
  }

  exportCategoryExcel(category: ExportCategory): void {
    if (!this.isElevated()) {
      this.notifications.error('Export réservé au PMO / administrateur.', 'Export');
      return;
    }

    const source = this.projects();
    const { label, rows } = this.getExportCategoryData(source, category);
    const workbook = XLSX.utils.book_new();
    this.appendSheet(workbook, label, rows);

    const stamp = new Date();
    const y = stamp.getFullYear();
    const m = String(stamp.getMonth() + 1).padStart(2, '0');
    const d = String(stamp.getDate()).padStart(2, '0');
    XLSX.writeFile(workbook, `export-${label.toLowerCase().replaceAll(' ', '-')}-${y}${m}${d}.xlsx`);
    this.notifications.success(`Export "${label}" généré.`, 'Export');
  }

  private appendSheet(workbook: XLSX.WorkBook, sheetName: string, projects: Project[]): void {
    const rows = projects.map((p) => this.toExportRow(p));
    const data = rows.length > 0 ? rows : [{ Info: 'Aucun projet dans cette catégorie' }];
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }

  private toExportRow(p: Project): Record<string, string | number | boolean> {
    return {
      Code: p.code,
      Intitule: p.name,
      Statut: this.statusLabel(p.status),
      Domaine: this.domainLabel(p.domain),
      Description: p.description ?? '',
      'Chef de projet': p.chefProjet?.username ?? 'Non affecté',
      "Email chef de projet": p.chefProjet?.email ?? '',
      Avancement: p.progressPercent,
      'Date début prévue': p.plannedStartDate ?? '',
      'Date fin prévue': p.plannedEndDate ?? '',
      'CP editing unlocked': p.cpEditingUnlocked,
      'Macro planning': p.macroPlanning ?? '',
      'Nombre membres': p.members.length,
      'Membres (usernames)': p.members.map((m) => m.username).join(', '),
      'Créé le': p.createdAt ?? '',
      'Mis à jour le': p.updatedAt ?? '',
    };
  }

  private isProjectDelayed(projectId: number): boolean {
    return this.delayedProjectIds().has(projectId);
  }

  private getExportCategoryData(
    source: Project[],
    category: ExportCategory,
  ): { label: string; rows: Project[] } {
    switch (category) {
      case 'DELAYED':
        return { label: 'Projets en retard', rows: source.filter((p) => this.isProjectDelayed(p.id)) };
      case 'TERMINE':
        return { label: 'Projets terminés', rows: source.filter((p) => p.status === 'TERMINE') };
      case 'EN_COURS':
        return { label: 'Projets en cours', rows: source.filter((p) => p.status === 'EN_COURS') };
      case 'BROUILLON':
        return { label: 'Projets brouillons', rows: source.filter((p) => p.status === 'BROUILLON') };
      default:
        return { label: 'Tous les projets', rows: source };
    }
  }

  /**
   * Projet en retard = au moins un jalon non terminé dont la date deadline est dépassée.
   */
  private computeDelayedProjectIds(planningProjects: PlanningProject[]): Set<number> {
    const today = new Date();
    const ids = new Set<number>();
    for (const project of planningProjects) {
      const hasDelayedMilestone = project.milestones.some((m) => {
        if (!m.deadline || m.completed) {
          return false;
        }
        const deadline = new Date(m.deadline);
        return !Number.isNaN(deadline.getTime()) && deadline < today;
      });
      if (hasDelayedMilestone) {
        ids.add(project.id);
      }
    }
    return ids;
  }
}
