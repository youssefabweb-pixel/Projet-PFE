import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import { NotificationCenterService } from '../../../core/notifications/notification-center.service';
import {
  PlanningMilestone,
  PlanningMilestoneStatus,
  PlanningProject,
  PlanningTask,
  PlanningTaskStatus,
  TaskPriority,
} from '../../../core/models/planning.models';
import { PlanningProgressService } from '../../../core/services/planning-progress.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { MilestoneTaskService } from '../../../core/services/milestone-task.service';
import { AuthService } from '../../../core/services/auth.service';
import { TaskDocumentService } from '../../../core/services/task-document.service';
import { NotificationService as EmailNotificationSettingsService } from '../../../core/services/notification.service';
import { MilestoneDialogComponent } from '../dialogs/milestone-dialog.component';
import { HistoryDialogComponent } from '../dialogs/history-dialog.component';
import {
  PlanningJustificationDialogComponent,
  PlanningJustificationDialogData,
} from '../dialogs/planning-justification-dialog.component';
import { TaskDialogComponent } from '../dialogs/task-dialog.component';
import { Milestone, MilestoneInput, MilestoneStatus, Task, TaskInput } from '../../../core/models/project.models';
import { ProjectService } from '../../../core/services/project.service';

type PlanningStatusFilter = 'ALL' | 'EN_COURS' | 'EN_PAUSE' | 'TERMINE' | 'BROUILLON' | 'ANNULE';
type SortCriteria = 'NAME' | 'PROGRESS' | 'DATE';

@Component({
  selector: 'app-planning-progress-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatDialogModule,
  ],
  templateUrl: './planning-progress-page.component.html',
  styleUrl: './planning-progress-page.component.scss',
})
export class PlanningProgressPageComponent implements OnInit {
  private readonly planningService = inject(PlanningProgressService);
  private readonly milestoneTaskService = inject(MilestoneTaskService);
  private readonly projectService = inject(ProjectService);
  private readonly authService = inject(AuthService);
  readonly taskDocumentService = inject(TaskDocumentService);
  private readonly emailSettings = inject(EmailNotificationSettingsService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationCenterService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly projects = signal<PlanningProject[]>([]);
  readonly statusFilter = signal<PlanningStatusFilter>('ALL');
  readonly sortBy = signal<SortCriteria>('NAME');
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly searchFilter = signal('');
  readonly riskOnly = signal(false);
  readonly pendingValidationOnly = signal(false);
  readonly focusedProjectId = signal<number | null>(null);
  readonly submittingPlanningId = signal<number | null>(null);
  readonly validatingPlanningId = signal<number | null>(null);

  readonly filteredProjects = computed(() => {
    let result = this.projects();
    const filter = this.statusFilter();
    const sort = this.sortBy();
    const search = this.searchFilter().toLowerCase().trim();

    if (search) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          (p.code && p.code.toLowerCase().includes(search)) ||
          p.chefProjet?.username.toLowerCase().includes(search),
      );
    }

    if (filter !== 'ALL') {
      result = result.filter((p) => p.status === filter);
    }

    const focusedProjectId = this.focusedProjectId();
    if (focusedProjectId) {
      const focusedOnly = result.filter((p) => p.id === focusedProjectId);
      if (focusedOnly.length > 0) {
        result = focusedOnly;
      }
    }

    if (this.riskOnly()) {
      result = result.filter((p) => this.projectRiskCount(p) > 0);
    }

    if (this.pendingValidationOnly()) {
      result = result.filter((p) => this.isPlanningSubmitted(p));
    }

    return [...result].sort((a, b) => {
      if (sort === 'PROGRESS') {
        return b.progress - a.progress;
      }
      if (sort === 'DATE') {
        const dateA = a.plannedEndDate ? new Date(a.plannedEndDate).getTime() : 0;
        const dateB = b.plannedEndDate ? new Date(b.plannedEndDate).getTime() : 0;
        return dateB - dateA;
      }
      return a.name.localeCompare(b.name);
    });
  });

  readonly dashboardStats = computed(() => {
    const projects = this.filteredProjects();
    const totalProjects = projects.length;
    const inProgress = projects.filter((p) => p.status === 'EN_COURS').length;
    const completed = projects.filter((p) => p.status === 'TERMINE').length;
    const delayedTasks = projects
      .flatMap((p) => p.milestones)
      .flatMap((m) => m.tasks)
      .filter((t) => t.status === 'DELAYED' || (t.delayDays ?? 0) > 0).length;
    const pendingValidation = projects.filter((p) => this.isPlanningSubmitted(p)).length;
    const avgProgress =
      totalProjects > 0 ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / totalProjects) : 0;

    return { totalProjects, inProgress, completed, delayedTasks, pendingValidation, avgProgress };
  });

  togglePendingValidationFilter(): void {
    this.pendingValidationOnly.set(!this.pendingValidationOnly());
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const projectIdParam = params.get('projectId');
      const parsed = projectIdParam ? Number(projectIdParam) : NaN;
      this.focusedProjectId.set(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
    });
    this.loadProjects();
    this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe((value) => {
      this.searchFilter.set(value || '');
    });
  }

  priorityLabel(priority: TaskPriority): string {
    switch (priority) {
      case 'CRITIQUE':
        return 'Critique';
      case 'HAUTE':
        return 'Haute';
      case 'BASSE':
        return 'Basse';
      default:
        return 'Moyenne';
    }
  }

  projectStatusLabel(status: PlanningProject['status']): string {
    switch (status) {
      case 'EN_COURS':
        return 'En cours';
      case 'EN_PAUSE':
        return 'En pause';
      case 'TERMINE':
        return 'Terminé';
      case 'ANNULE':
        return 'Annulé';
      default:
        return 'Brouillon';
    }
  }

  milestoneStatusLabel(status: PlanningMilestoneStatus): string {
    switch (status) {
      case 'NOT_STARTED':
        return 'Non démarré';
      case 'IN_PROGRESS':
        return 'En cours';
      case 'COMPLETED':
        return 'Terminé';
      case 'DELAYED':
        return 'En retard';
      case 'BLOCKED':
        return 'Bloqué';
      default:
        return status;
    }
  }

  taskStatusLabel(status: PlanningTaskStatus): string {
    switch (status) {
      case 'NOT_STARTED':
        return 'Non démarré';
      case 'IN_PROGRESS':
        return 'En cours';
      case 'COMPLETED':
        return 'Terminé';
      case 'DELAYED':
        return 'En retard';
      case 'BLOCKED':
        return 'Bloqué';
      default:
        return status;
    }
  }

  priorityClass(priority: TaskPriority): string {
    return `priority-badge--${priority.toLowerCase()}`;
  }

  progressColorClass(progress: number): string {
    if (progress === 100) return 'progress--success';
    if (progress > 50) return 'progress--info';
    return 'progress--warning';
  }

  /** Highlight row when API marks delay or computed delay days. */
  isTaskDelayed(task: PlanningTask): boolean {
    return task.status === 'DELAYED' || (task.delayDays ?? 0) > 0;
  }

  dependencyNames(milestone: PlanningMilestone, task: PlanningTask): string[] {
    const ids = task.dependsOnTaskIds ?? [];
    if (ids.length === 0) {
      return [];
    }
    const idSet = new Set(ids);
    return milestone.tasks.filter((t) => idSet.has(t.id)).map((t) => t.name);
  }

  updateTaskStatus(task: PlanningTask): void {
    const newStatus: PlanningTaskStatus = task.status === 'COMPLETED' ? 'NOT_STARTED' : 'COMPLETED';
    this.planningService.updateTaskStatus(task.id, newStatus).subscribe({
      next: () => {
        this.notifications.success('Avancement mis à jour.', 'Planification');
        this.refreshAfterMutation();
      },
      error: (err: unknown) => {
        if (this.isJustificationRequiredError(err)) {
          this.openJustificationDialog('Statut de la tâche', task.name, task.justification).subscribe((text) => {
            if (!text) {
              return;
            }
            this.planningService.addTaskJustification(task.id, text).subscribe({
              next: () =>
                this.planningService.updateTaskStatus(task.id, newStatus).subscribe({
                  next: () => {
                    this.notifications.success('Statut mis à jour.', 'Planification');
                    this.refreshAfterMutation();
                  },
                  error: (e: Error) => this.notifications.error(e.message, 'Planification'),
                }),
              error: (e: Error) => this.notifications.error(e.message, 'Planification'),
            });
          });
          return;
        }
        this.notifications.error(err instanceof Error ? err.message : 'Erreur', 'Planification');
      },
    });
  }

  openTaskJustification(task: PlanningTask): void {
    this.openJustificationDialog('Justification — tâche', task.name, task.justification).subscribe((text) => {
      if (!text) {
        return;
      }
      this.planningService.addTaskJustification(task.id, text).subscribe({
        next: () => {
          this.notifications.success('Justification enregistrée.', 'Planification');
          this.refreshAfterMutation();
        },
        error: (e: Error) => this.notifications.error(e.message, 'Planification'),
      });
    });
  }

  openMilestoneJustification(milestone: PlanningMilestone): void {
    this.openJustificationDialog('Justification — jalon', milestone.name, milestone.justification).subscribe((text) => {
      if (!text) {
        return;
      }
      this.planningService.addMilestoneJustification(milestone.id, text).subscribe({
        next: () => {
          this.notifications.success('Justification enregistrée.', 'Planification');
          this.refreshAfterMutation();
        },
        error: (e: Error) => this.notifications.error(e.message, 'Planification'),
      });
    });
  }

  private openJustificationDialog(title: string, contextName: string, initial?: string) {
    return this.dialog
      .open(PlanningJustificationDialogComponent, {
        width: '520px',
        panelClass: 'wb-dialog-panel',
        data: {
          title,
          message: `Tâche / jalon : ${contextName}`,
          initialValue: initial,
        } satisfies PlanningJustificationDialogData,
      })
      .afterClosed();
  }

  private isJustificationRequiredError(err: unknown): boolean {
    if (err instanceof HttpErrorResponse && err.error && typeof err.error === 'object') {
      const code = (err.error as { errorCode?: string }).errorCode;
      return code === 'JUSTIFICATION_REQUIRED';
    }
    return false;
  }

  private loadProjects(): void {
    this.loading.set(true);
    this.planningService
      .getProjects()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.projects.set(items),
        error: (err: Error) => this.notifications.error(err.message, 'Planification'),
      });
  }

  private searchProjects(name: string): void {
    const query = name.trim();
    if (!query) {
      this.loadProjects();
      return;
    }
    this.loading.set(true);
    this.planningService
      .searchProjects(query)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.projects.set(items),
        error: (err: Error) => this.notifications.error(err.message, 'Planification'),
      });
  }

  addMilestone(project: PlanningProject): void {
    if (!this.canAddMilestone(project)) {
      this.notifications.info("Le rôle PMO ne peut pas ajouter de jalon.", 'Planification');
      return;
    }
    const dialogRef = this.dialog.open(MilestoneDialogComponent, {
      width: '800px',
      panelClass: 'wb-dialog-panel',
      data: { mode: 'create' },
    });

    dialogRef.afterClosed().subscribe((result: MilestoneInput) => {
      if (result) {
        this.milestoneTaskService.createMilestone(project.id, result).subscribe({
          next: () => {
            this.notifications.success(`Jalon "${result.title}" créé.`);
            this.showEmailNotificationConfirmation();
            this.refresh();
          },
          error: (err: Error) => this.notifications.error(err.message),
        });
      }
    });
  }

  editMilestone(project: PlanningProject, m: PlanningMilestone): void {
    const dialogRef = this.dialog.open(MilestoneDialogComponent, {
      width: '800px',
      panelClass: 'wb-dialog-panel',
      data: { mode: 'edit', milestone: this.planningMilestoneToMilestone(m), datesLocked: this.areMilestoneDatesLocked(project) },
    });

    dialogRef.afterClosed().subscribe((result: MilestoneInput) => {
      if (result) {
        this.milestoneTaskService.updateMilestone(m.id, result).subscribe({
          next: () => {
            this.notifications.success(`Jalon "${result.title}" mis à jour.`);
            this.refresh();
          },
          error: (err: Error) => this.notifications.error(err.message),
        });
      }
    });
  }

  deleteMilestone(m: PlanningMilestone): void {
    if (confirm(`Supprimer le jalon "${m.name}" et toutes ses tâches ?`)) {
      this.milestoneTaskService.deleteMilestone(m.id).subscribe({
        next: () => {
          this.notifications.success('Jalon supprimé.');
          this.refresh();
        },
        error: (err: Error) => this.notifications.error(err.message),
      });
    }
  }

  addTask(project: PlanningProject, milestone: PlanningMilestone): void {
    this.projectService.getById(project.id).subscribe({
      next: (fullProject) => {
        const dialogRef = this.dialog.open(TaskDialogComponent, {
          width: '900px',
          panelClass: 'wb-dialog-panel',
          data: {
            mode: 'create',
            members: fullProject.members,
            siblingTasks: milestone.tasks.map((t) => ({ id: t.id, title: t.name })),
          },
        });

        dialogRef.afterClosed().subscribe((result: TaskInput & { docsToDelete?: number[] }) => {
          if (result) {
            const pendingFile = result.pendingFile;
            this.milestoneTaskService.createTask(milestone.id, result).subscribe({
              next: (created) => {
                this.notifications.success(`Tâche "${result.title}" ajoutée.`);
                this.showEmailNotificationConfirmation();
                if (pendingFile && created?.id) {
                  this.taskDocumentService.upload(created.id, pendingFile).subscribe({
                    next: () => this.refresh(),
                    error: () => {
                      this.notifications.error('Tâche créée mais l\'upload du fichier a échoué.', 'Livrable');
                      this.refresh();
                    },
                  });
                } else {
                  this.refresh();
                }
              },
              error: (err: Error) => this.notifications.error(err.message),
            });
          }
        });
      },
      error: (err: Error) => this.notifications.error(err.message || 'Impossible de charger les membres du projet.'),
    });
  }

  editTask(project: PlanningProject, milestone: PlanningMilestone, task: PlanningTask): void {
    this.projectService.getById(project.id).subscribe({
      next: (fullProject) => {
        const dialogRef = this.dialog.open(TaskDialogComponent, {
          width: '900px',
          panelClass: 'wb-dialog-panel',
          data: {
            mode: 'edit',
            task: this.planningTaskToTask(task),
            members: fullProject.members,
            siblingTasks: milestone.tasks.filter((t) => t.id !== task.id).map((t) => ({ id: t.id, title: t.name })),
            existingDocuments: task.taskDocuments ?? [],
          },
        });

        dialogRef.afterClosed().subscribe((result: TaskInput & { docsToDelete?: number[] }) => {
          if (result) {
            const pendingFile = result.pendingFile;
            const docsToDelete = result.docsToDelete ?? [];

            this.milestoneTaskService.updateTask(task.id, result).subscribe({
              next: () => {
                this.notifications.success(`Tâche "${result.title}" mise à jour.`);
                const uploads: Promise<void>[] = [];
                if (pendingFile) {
                  uploads.push(
                    new Promise<void>((resolve) => {
                      this.taskDocumentService.upload(task.id, pendingFile).subscribe({
                        next: () => resolve(),
                        error: () => {
                          this.notifications.error('Upload du fichier livrable échoué.', 'Livrable');
                          resolve();
                        },
                      });
                    }),
                  );
                }
                for (const docId of docsToDelete) {
                  uploads.push(
                    new Promise<void>((resolve) => {
                      this.taskDocumentService.delete(docId).subscribe({ next: () => resolve(), error: () => resolve() });
                    }),
                  );
                }
                Promise.all(uploads).then(() => this.refresh());
              },
              error: (err: Error) => this.notifications.error(err.message),
            });
          }
        });
      },
      error: (err: Error) => this.notifications.error(err.message || 'Impossible de charger les membres du projet.'),
    });
  }

  deleteTask(task: PlanningTask): void {
    if (confirm(`Supprimer la tâche "${task.name}" ?`)) {
      this.milestoneTaskService.deleteTask(task.id).subscribe({
        next: () => {
          this.notifications.success('Tâche supprimée.');
          this.refresh();
        },
        error: (err: Error) => this.notifications.error(err.message),
      });
    }
  }

  onTaskProgressQuickChange(task: PlanningTask, event: Event): void {
    const target = event.target as HTMLInputElement;
    const newProgress = parseInt(target.value, 10);
    this.tryUpdateTaskProgress(task, newProgress);
  }

  private tryUpdateTaskProgress(task: PlanningTask, newProgress: number, justification?: string): void {
    this.planningService.updateTaskProgress(task.id, newProgress, justification).subscribe({
      next: () => {
        this.notifications.success(`Avancement de "${task.name}" : ${newProgress}%`);
        this.refresh();
      },
      error: (err: unknown) => {
        if (this.isJustificationRequiredError(err)) {
          this.openJustificationDialog('Justification requise', task.name, task.justification).subscribe((text) => {
            if (!text) {
              this.refresh();
              return;
            }
            this.tryUpdateTaskProgress(task, newProgress, text);
          });
          return;
        }
        this.notifications.error(err instanceof Error ? err.message : 'Mise à jour impossible');
      },
    });
  }

  projectRiskCount(project: PlanningProject): number {
    return project.milestones
      .flatMap((m) => m.tasks)
      .filter((t) => t.status === 'DELAYED' || t.status === 'BLOCKED' || (t.delayDays ?? 0) > 0).length;
  }

  blockedTasksCount(project: PlanningProject): number {
    return project.milestones.flatMap((m) => m.tasks).filter((t) => t.status === 'BLOCKED').length;
  }

  delayedTasksCount(project: PlanningProject): number {
    return project.milestones
      .flatMap((m) => m.tasks)
      .filter((t) => t.status === 'DELAYED' || (t.delayDays ?? 0) > 0).length;
  }

  isMilestoneLocked(project: PlanningProject, milestoneIndex: number): boolean {
    return false;
  }

  milestoneLockReason(project: PlanningProject, milestoneIndex: number): string {
    return '';
  }

  goBackToProjects(): void {
    this.router.navigate(['/projects']);
  }

  isManagerOrAdmin(): boolean {
    const role = this.authService.getRole();
    return role === 'MANAGER' || role === 'ADMINISTRATEUR';
  }

  // ── Macro-planning workflow helpers ──────────────────────────────────────

  /** Chef crée ses jalons, planning non encore soumis. null = backend pas encore migré → traité comme DRAFT. */
  isPlanningDraft(project: PlanningProject): boolean {
    return project.macroPlanning === 'DRAFT' || project.macroPlanning == null;
  }

  /** Chef a soumis pour validation PMO, tout est en attente. */
  isPlanningSubmitted(project: PlanningProject): boolean {
    return project.macroPlanning === 'SOUMIS';
  }

  /** PMO a validé, dates figées mais tâches modifiables. */
  isPlanningValidated(project: PlanningProject): boolean {
    return project.macroPlanning === 'VALIDE';
  }

  isChefDeProjet(project: PlanningProject): boolean {
    return project.chefProjet?.id === this.authService.getUserId();
  }

  /** Chef peut cliquer "Terminer la planification" : éditeur + DRAFT + au moins 1 jalon. */
  canSubmitPlanning(project: PlanningProject): boolean {
    return this.isChefDeProjet(project) && this.isPlanningDraft(project) && project.milestones.length > 0;
  }

  /** PMO peut valider : manager/admin + planning pas encore validé + au moins 1 jalon. */
  canValidatePlanning(project: PlanningProject): boolean {
    return this.isManagerOrAdmin() && this.isPlanningSubmitted(project) && !this.isPlanningValidated(project) && project.milestones.length > 0;
  }

  /** Peut ajouter/supprimer des jalons : uniquement en DRAFT. */
  canManageMilestoneStructure(project: PlanningProject): boolean {
    return this.isEditor(project) && this.isPlanningDraft(project);
  }

  /** Peut éditer les détails d'un jalon (statut/description) : DRAFT ou VALIDE, pas SOUMIS. */
  canEditMilestone(project: PlanningProject): boolean {
    return this.isEditor(project) && !this.isPlanningSubmitted(project);
  }

  /** Peut ajouter/modifier/supprimer des tâches : en SOUMIS ou VALIDE.
   *  En DRAFT le chef structure d'abord les jalons. */
  canManageTasks(project: PlanningProject): boolean {
    return this.isEditor(project) && (this.isPlanningSubmitted(project) || this.isPlanningValidated(project));
  }

  /** Les dates du jalon sont figées pendant SOUMIS et après VALIDE. */
  areMilestoneDatesLocked(project: PlanningProject): boolean {
    return this.isPlanningSubmitted(project) || this.isPlanningValidated(project);
  }

  // ── Macro-planning actions ────────────────────────────────────────────────

  submitPlanning(project: PlanningProject): void {
    if (!confirm(`Terminer la planification et soumettre "${project.name}" à la validation PMO ?\n\nVous ne pourrez plus modifier les jalons jusqu'à la validation.`)) {
      return;
    }
    this.submittingPlanningId.set(project.id);
    this.projectService
      .submitPlanning(project.id)
      .pipe(finalize(() => this.submittingPlanningId.set(null)))
      .subscribe({
        next: () => {
          this.notifications.success(`Planification soumise. En attente de validation PMO.`, 'Planification');
          this.refresh();
        },
        error: (err: Error) => this.notifications.error(err.message, 'Planification'),
      });
  }

  validatePlanning(project: PlanningProject): void {
    if (!confirm(`Valider la planification du projet "${project.name}" ?\n\nLe chef de projet pourra ajouter des tâches mais les dates seront figées.`)) {
      return;
    }
    this.validatingPlanningId.set(project.id);
    this.projectService
      .validatePlanning(project.id)
      .pipe(finalize(() => this.validatingPlanningId.set(null)))
      .subscribe({
        next: () => {
          this.notifications.success(`Planning validé. Le chef de projet peut maintenant ajouter des tâches.`, 'Planification');
          this.refresh();
        },
        error: (err: Error) => this.notifications.error(err.message, 'Planification'),
      });
  }

  openHistory(): void {
    this.dialog.open(HistoryDialogComponent, {
      width: '1100px',
      maxWidth: '95vw',
      panelClass: 'wb-dialog-panel',
    });
  }

  isEditor(project: PlanningProject): boolean {
    const role = this.authService.getRole();
    const userId = this.authService.getUserId();
    // PMO (MANAGER) is read-only on planning: consultation uniquement.
    if (role === 'ADMINISTRATEUR') {
      return true;
    }
    return project.chefProjet?.id === userId;
  }

  /** PMO et Admin voient les tâches en lecture seule, quelle que soit l'étape. */
  canViewTasks(project: PlanningProject): boolean {
    if (this.isManagerOrAdmin()) return true;
    return this.canManageTasks(project);
  }

  canAddMilestone(project: PlanningProject): boolean {
    if (!this.isEditor(project)) return false;
    if (this.authService.getRole() === 'MANAGER') return false;
    return this.isPlanningDraft(project);
  }

  private refreshAfterMutation(): void {
    const query = this.searchControl.value.trim();
    if (query) {
      this.searchProjects(query);
    } else {
      this.loadProjects();
    }
  }

  private refresh(): void {
    this.refreshAfterMutation();
  }

  private planningMilestoneToMilestone(m: PlanningMilestone): Milestone {
    return {
      id: m.id,
      title: m.name,
      description: m.description,
      deadline: m.deadline,
      actualEndDate: undefined,
      progressPercent: m.progress,
      status: this.mapApiMilestoneStatusToFrench(m.status),
      justification: m.justification,
      actionPlan: undefined,
      tasks: [],
    };
  }

  private mapApiMilestoneStatusToFrench(s: PlanningMilestoneStatus): MilestoneStatus {
    const map: Record<PlanningMilestoneStatus, MilestoneStatus> = {
      NOT_STARTED: 'NON_DEMARRE',
      IN_PROGRESS: 'EN_COURS',
      COMPLETED: 'TERMINE',
      DELAYED: 'EN_RETARD',
      BLOCKED: 'BLOQUE',
    };
    return map[s] ?? 'NON_DEMARRE';
  }

  private planningTaskToTask(t: PlanningTask): Task {
    const st = this.mapApiTaskStatusToFrench(t.status);
    return {
      id: t.id,
      title: t.name,
      description: t.description,
      startDate: t.startDate,
      endDate: t.endDate,
      status: st,
      progressPercent: t.progress,
      assignee: t.assignee ?? undefined,
      dependencyTaskId: t.dependsOnTaskIds?.length ? t.dependsOnTaskIds[0] : undefined,
      dependencyTaskIds: t.dependsOnTaskIds,
      justification: t.justification,
      actualEndDate: undefined,
      priority: t.priority,
      deliverableUrl: t.deliverableUrl ?? undefined,
      deliverableLabel: t.deliverableLabel ?? undefined,
      taskDocuments: t.taskDocuments ?? [],
    };
  }

  private mapApiTaskStatusToFrench(s: PlanningTaskStatus): Task['status'] {
    const map: Record<PlanningTaskStatus, Task['status']> = {
      NOT_STARTED: 'NOT_STARTED',
      IN_PROGRESS: 'IN_PROGRESS',
      COMPLETED: 'DONE',
      DELAYED: 'EN_RETARD',
      BLOCKED: 'BLOQUE',
    };
    return map[s] ?? 'NOT_STARTED';
  }

  private showEmailNotificationConfirmation(): void {
    if (this.emailSettings.isEmailNotificationsEnabled()) {
      this.notifications.info('Email notification sent', 'Notifications');
    }
  }
}
