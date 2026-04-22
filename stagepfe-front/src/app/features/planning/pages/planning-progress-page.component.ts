import { CommonModule } from '@angular/common';
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
import { PlanningProject, PlanningTask, PlanningTaskStatus, TaskPriority } from '../../../core/models/planning.models';
import { PlanningProgressService } from '../../../core/services/planning-progress.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { MilestoneTaskService } from '../../../core/services/milestone-task.service';
import { AuthService } from '../../../core/services/auth.service';
import { MilestoneDialogComponent } from '../dialogs/milestone-dialog.component';
import { TaskDialogComponent } from '../dialogs/task-dialog.component';
import { Milestone, MilestoneInput, TaskInput } from '../../../core/models/project.models';
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
  readonly focusedProjectId = signal<number | null>(null);

  readonly filteredProjects = computed(() => {
    let result = this.projects();
    const filter = this.statusFilter();
    const sort = this.sortBy();
    const search = this.searchFilter().toLowerCase().trim();

    // Text search (Name, Code, or ChefProjet)
    if (search) {
      result = result.filter((p) => 
        p.name.toLowerCase().includes(search) || 
        (p.code && p.code.toLowerCase().includes(search)) ||
        (p.chefProjet?.username.toLowerCase().includes(search))
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

    return [...result].sort((a, b) => {
      if (sort === 'PROGRESS') {
        return b.progress - a.progress;
      }
      if (sort === 'DATE') {
        const dateA = a.plannedEndDate ? new Date(a.plannedEndDate).getTime() : 0;
        const dateB = b.plannedEndDate ? new Date(b.plannedEndDate).getTime() : 0;
        return dateB - dateA; // Most recent first
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
      .filter((t) => t.status === 'EN_RETARD' || (t.delayDays ?? 0) > 0).length;
    const blockedTasks = projects
      .flatMap((p) => p.milestones)
      .flatMap((m) => m.tasks)
      .filter((t) => t.status === 'BLOQUE').length;
    const avgProgress =
      totalProjects > 0
        ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / totalProjects)
        : 0;

    return { totalProjects, inProgress, completed, delayedTasks, blockedTasks, avgProgress };
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const projectIdParam = params.get('projectId');
      const parsed = projectIdParam ? Number(projectIdParam) : NaN;
      this.focusedProjectId.set(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
    });
    this.loadProjects();
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value) => {
        this.searchFilter.set(value || '');
      });
  }

  priorityLabel(priority: TaskPriority): string {
    switch (priority) {
      case 'CRITIQUE': return 'Critique';
      case 'HAUTE': return 'Haute';
      case 'BASSE': return 'Basse';
      default: return 'Moyenne';
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

  taskStatusLabel(status: PlanningTaskStatus): string {
    switch (status) {
      case 'NOT_STARTED':
        return 'Non démarré';
      case 'IN_PROGRESS':
        return 'En cours';
      case 'DONE':
        return 'Terminé';
      case 'EN_RETARD':
        return 'En retard';
      case 'BLOQUE':
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

  updateTaskStatus(task: PlanningTask): void {
    const newStatus: PlanningTaskStatus = task.status === 'DONE' ? 'NOT_STARTED' : 'DONE';
    this.planningService.updateTaskStatus(task.id, newStatus).subscribe({
      next: () => {
        this.notifications.success('Avancement mis à jour.', 'Planification');
        const query = this.searchControl.value.trim();
        if (query) {
          this.searchProjects(query);
        } else {
          this.loadProjects();
        }
      },
      error: (err: Error) => this.notifications.error(err.message, 'Planification'),
    });
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

  // ── Milestone Management ─────────────────────────────────────

  addMilestone(project: PlanningProject): void {
    const dialogRef = this.dialog.open(MilestoneDialogComponent, {
      width: '800px',
      panelClass: 'wb-dialog-panel',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe((result: MilestoneInput) => {
      if (result) {
        this.milestoneTaskService.createMilestone(project.id, result).subscribe({
          next: () => {
            this.notifications.success(`Jalon "${result.title}" créé.`);
            this.refresh();
          },
          error: (err: Error) => this.notifications.error(err.message)
        });
      }
    });
  }

  editMilestone(project: PlanningProject, m: any): void {
    const dialogRef = this.dialog.open(MilestoneDialogComponent, {
      width: '800px',
      panelClass: 'wb-dialog-panel',
      data: { mode: 'edit', milestone: m }
    });

    dialogRef.afterClosed().subscribe((result: MilestoneInput) => {
      if (result) {
        this.milestoneTaskService.updateMilestone(m.id, result).subscribe({
          next: () => {
            this.notifications.success(`Jalon "${result.title}" mis à jour.`);
            this.refresh();
          },
          error: (err: Error) => this.notifications.error(err.message)
        });
      }
    });
  }

  deleteMilestone(m: any): void {
    if (confirm(`Supprimer le jalon "${m.name}" et toutes ses tâches ?`)) {
      this.milestoneTaskService.deleteMilestone(m.id).subscribe({
        next: () => {
          this.notifications.success('Jalon supprimé.');
          this.refresh();
        },
        error: (err: Error) => this.notifications.error(err.message)
      });
    }
  }

  // ── Task Management ──────────────────────────────────────────

  addTask(project: PlanningProject, milestoneId: number): void {
    this.projectService.getById(project.id).subscribe({
      next: (fullProject) => {
        const dialogRef = this.dialog.open(TaskDialogComponent, {
          width: '900px',
          panelClass: 'wb-dialog-panel',
          data: { mode: 'create', members: fullProject.members }
        });

        dialogRef.afterClosed().subscribe((result: any) => {
          if (result) {
            this.milestoneTaskService.createTask(milestoneId, result).subscribe({
              next: () => {
                this.notifications.success(`Tâche "${result.title}" ajoutée.`);
                this.refresh();
              },
              error: (err: Error) => this.notifications.error(err.message)
            });
          }
        });
      },
      error: (err: Error) => this.notifications.error(err.message || 'Impossible de charger les membres du projet.')
    });
  }

  editTask(project: PlanningProject, task: any): void {
    this.projectService.getById(project.id).subscribe({
      next: (fullProject) => {
        const dialogRef = this.dialog.open(TaskDialogComponent, {
          width: '900px',
          panelClass: 'wb-dialog-panel',
          data: { mode: 'edit', task: task, members: fullProject.members }
        });

        dialogRef.afterClosed().subscribe((result: any) => {
          if (result) {
            this.milestoneTaskService.updateTask(task.id, result).subscribe({
              next: () => {
                this.notifications.success(`Tâche "${result.title}" mise à jour.`);
                this.refresh();
              },
              error: (err: Error) => this.notifications.error(err.message)
            });
          }
        });
      },
      error: (err: Error) => this.notifications.error(err.message || 'Impossible de charger les membres du projet.')
    });
  }

  deleteTask(task: any): void {
    if (confirm(`Supprimer la tâche "${task.name}" ?`)) {
      this.milestoneTaskService.deleteTask(task.id).subscribe({
        next: () => {
          this.notifications.success('Tâche supprimée.');
          this.refresh();
        },
        error: (err: Error) => this.notifications.error(err.message)
      });
    }
  }

  onTaskProgressQuickChange(task: PlanningTask, event: any): void {
    const newProgress = parseInt(event.target.value, 10);
    // Determine new status based on progress
    let newStatus: PlanningTaskStatus = task.status;
    if (newProgress === 100) {
      newStatus = 'DONE';
    } else if (newProgress > 0 && task.status === 'NOT_STARTED') {
      newStatus = 'IN_PROGRESS';
    }

    this.milestoneTaskService.updateTask(task.id, {
      title: task.name,
      progressPercent: newProgress,
      status: newStatus
    }).subscribe({
      next: () => {
        this.notifications.success(`Avancement de "${task.name}" : ${newProgress}%`);
        this.refresh();
      },
      error: (err: Error) => this.notifications.error(err.message)
    });
  }

  projectRiskCount(project: PlanningProject): number {
    return project.milestones
      .flatMap((m) => m.tasks)
      .filter((t) => t.status === 'EN_RETARD' || t.status === 'BLOQUE' || (t.delayDays ?? 0) > 0).length;
  }

  blockedTasksCount(project: PlanningProject): number {
    return project.milestones.flatMap((m) => m.tasks).filter((t) => t.status === 'BLOQUE').length;
  }

  delayedTasksCount(project: PlanningProject): number {
    return project.milestones
      .flatMap((m) => m.tasks)
      .filter((t) => t.status === 'EN_RETARD' || (t.delayDays ?? 0) > 0).length;
  }

  isMilestoneLocked(project: PlanningProject, milestoneIndex: number): boolean {
    if (milestoneIndex === 0) {
      return false;
    }
    const previousMilestone = project.milestones[milestoneIndex - 1];
    return previousMilestone.progress < 100;
  }

  milestoneLockReason(project: PlanningProject, milestoneIndex: number): string {
    if (!this.isMilestoneLocked(project, milestoneIndex)) {
      return '';
    }
    const previousMilestone = project.milestones[milestoneIndex - 1];
    return `Le jalon précédent "${previousMilestone.name}" doit être terminé avant de modifier ce jalon.`;
  }

  goBackToProjects(): void {
    this.router.navigate(['/projects']);
  }

  // ── Permissions ──────────────────────────────────────────────
  
  isEditor(project: PlanningProject): boolean {
    const role = this.authService.getRole();
    const userId = this.authService.getUserId();
    
    // Managers and Admins see all
    if (role === 'MANAGER' || role === 'ADMINISTRATEUR') return true;
    
    // Project Lead (Chef de projet) can edit their own project
    return project.chefProjet?.id === userId;
  }

  private refresh(): void {
    const query = this.searchControl.value.trim();
    if (query) {
      this.searchProjects(query);
    } else {
      this.loadProjects();
    }
  }
}
