import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MilestoneTaskService } from '../../../core/services/milestone-task.service';
import { ProjectService } from '../../../core/services/project.service';
import { NotificationCenterService } from '../../../core/notifications/notification-center.service';
import { AuthService } from '../../../core/services/auth.service';
import { Milestone, Project, ProjectStatus, Task, MilestoneStatus, ProjectUpdatePayload } from '../../../core/models/project.models';
import { MilestoneDialogComponent } from '../dialogs/milestone-dialog.component';
import { TaskDialogComponent } from '../dialogs/task-dialog.component';

@Component({
  selector: 'app-tasks-board',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './tasks-board.component.html',
  styleUrl: './tasks-board.component.scss'
})
export class TasksBoardComponent implements OnInit {
  private readonly projectService = inject(ProjectService);
  private readonly milestoneTaskService = inject(MilestoneTaskService);
  private readonly notify = inject(NotificationCenterService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  readonly projects = signal<Project[]>([]);
  readonly selectedProjectId = signal<number | null>(null);
  readonly selectedProject = computed(() => 
    this.projects().find(p => p.id === this.selectedProjectId()) || null
  );

  readonly milestones = signal<Milestone[]>([]);
  readonly loading = signal(false);
  readonly planningSaving = signal(false);
  readonly projectStatusOptions: ProjectStatus[] = ['BROUILLON', 'EN_COURS', 'EN_PAUSE', 'TERMINE', 'ANNULE'];
  readonly planningDraft = signal<{
    status: ProjectStatus;
    progressPercent: number;
    plannedStartDate: string;
    plannedEndDate: string | null;
  } | null>(null);

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    this.projectService.getAll().subscribe({
      next: (data) => {
        this.projects.set(data);
        if (data.length > 0) {
          // Auto-select first project for demo
          this.onProjectChange(data[0].id);
        }
      },
      error: (err) => this.notify.error('Erreur lors du chargement des projets', 'Erreur')
    });
  }

  onProjectChange(id: number) {
    this.selectedProjectId.set(id);
    const p = this.projects().find((it) => it.id === id) ?? null;
    this.resetPlanningDraft(p);
    this.loadMilestones(id);
  }

  loadMilestones(projectId: number) {
    this.loading.set(true);
    this.milestoneTaskService.getMilestones(projectId).subscribe({
      next: (data) => {
        this.milestones.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.notify.error('Erreur lors du chargement des jalons', 'Erreur');
        this.loading.set(false);
      }
    });
  }

  connectedIds(): string[] {
    return this.milestones().map((m) => `milestone-${m.id}`);
  }

  drop(event: CdkDragDrop<Task[]>, toMilestoneId: number): void {
    if (event.previousContainer === event.container) {
      // Reordering within the same milestone (locally)
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Transfer to another milestone
      const task = event.previousContainer.data[event.previousIndex];
      
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );

      // Persistence logic
      this.notify.info(`Tâche "${task.title}" déplacée.`, 'Mise à jour');
      
      this.milestoneTaskService.updateTask(task.id, {
        title: task.title,
        progressPercent: task.progressPercent,
      }).subscribe({
        next: () => this.loadMilestones(this.selectedProjectId()!),
        error: () => this.notify.error('Échec de la mise à jour persistante')
      });
    }
  }

  getStatusClass(status: MilestoneStatus): string {
    switch (status) {
      case 'TERMINE': return 'status--success';
      case 'EN_RETARD': return 'status--danger';
      case 'BLOQUE': return 'status--warning';
      case 'EN_COURS': return 'status--primary';
      default: return 'status--neutral';
    }
  }

  getStatusLabel(status: MilestoneStatus): string {
    switch (status) {
      case 'TERMINE': return 'Terminé';
      case 'EN_RETARD': return 'En retard';
      case 'BLOQUE': return 'Bloqué';
      case 'EN_COURS': return 'En cours';
      case 'NON_DEMARRE': return 'Non démarré';
      default: return status;
    }
  }

  statusLabel(status: ProjectStatus): string {
    switch (status) {
      case 'BROUILLON': return 'Brouillon';
      case 'EN_COURS': return 'En cours';
      case 'EN_PAUSE': return 'En pause';
      case 'TERMINE': return 'Terminé';
      case 'ANNULE': return 'Annulé';
      default: return status;
    }
  }

  canManagePlanning(): boolean {
    const role = this.auth.getRole();
    if (role === 'MANAGER' || role === 'ADMINISTRATEUR') {
      return true;
    }
    const p = this.selectedProject();
    const myId = this.auth.getUserId();
    return !!p && !!myId && p.chefProjet?.id === myId;
  }

  canEditPlanningStartDate(): boolean {
    const role = this.auth.getRole();
    return role === 'MANAGER' || role === 'ADMINISTRATEUR';
  }

  savePlanning(): void {
    const project = this.selectedProject();
    const draft = this.planningDraft();
    if (!project || !draft || !this.canManagePlanning() || this.planningSaving()) {
      return;
    }

    const payload: ProjectUpdatePayload = {
      status: draft.status,
      progressPercent: Number(draft.progressPercent),
      plannedEndDate: draft.plannedEndDate || null,
    };

    if (this.canEditPlanningStartDate()) {
      payload.plannedStartDate = draft.plannedStartDate;
    }

    this.planningSaving.set(true);
    this.projectService.update(project.id, payload).subscribe({
      next: (updated) => {
        this.projects.update((list) => list.map((p) => (p.id === updated.id ? updated : p)));
        this.resetPlanningDraft(updated);
        this.notify.success('Planification du projet mise à jour.', 'Planification & Avancement');
        this.loadMilestones(updated.id);
      },
      error: (err) => {
        this.notify.error(err?.message || 'Mise à jour de planification impossible.', 'Planification & Avancement');
      },
      complete: () => this.planningSaving.set(false),
    });
  }

  updateTaskProgress(task: Task, progressValue: string | number) {
    const newProgress = typeof progressValue === 'string' ? parseInt(progressValue, 10) : progressValue;
    if (isNaN(newProgress)) return;

    this.milestoneTaskService.updateTask(task.id, {
      title: task.title,
      progressPercent: newProgress
    }).subscribe({
      next: () => {
        this.loadMilestones(this.selectedProjectId()!);
      }
    });
  }

  // ── Dialogs ──────────────────────────────────────────────────

  openMilestoneDialog(milestone?: Milestone) {
    const dialogRef = this.dialog.open(MilestoneDialogComponent, {
      data: {
        mode: milestone ? 'edit' : 'create',
        projectId: this.selectedProjectId(),
        milestone
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;
      
      const obs = milestone 
        ? this.milestoneTaskService.updateMilestone(milestone.id, result)
        : this.milestoneTaskService.createMilestone(this.selectedProjectId()!, result);

      obs.subscribe({
        next: () => {
          this.loadMilestones(this.selectedProjectId()!);
          this.notify.success(milestone ? 'Jalon mis à jour' : 'Jalon créé');
          this.loadProjects();
        },
        error: (err) => this.notify.error(err.message || "Échec de l'opération")
      });
    });
  }

  deleteMilestone(milestone: Milestone, event: Event) {
    event.stopPropagation();
    if (!confirm(`Supprimer le jalon "${milestone.title}" et toutes ses actions ?`)) return;
    
    this.milestoneTaskService.deleteMilestone(milestone.id).subscribe({
      next: () => {
        this.loadMilestones(this.selectedProjectId()!);
        this.notify.info('Jalon supprimé');
        this.loadProjects();
      }
    });
  }

  openTaskDialog(milestoneId: number, task?: Task) {
    const dialogRef = this.dialog.open(TaskDialogComponent, {
      data: {
        mode: task ? 'edit' : 'create',
        milestoneId,
        task,
        allTasks: this.milestones().flatMap(m => m.tasks || []),
        members: this.selectedProject()?.members || []
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;

      const obs = task
        ? this.milestoneTaskService.updateTask(task.id, result)
        : this.milestoneTaskService.createTask(milestoneId, result);

      obs.subscribe({
        next: () => {
          this.loadMilestones(this.selectedProjectId()!);
          this.notify.success(task ? 'Action mise à jour' : 'Action ajoutée');
          this.loadProjects();
        },
        error: (err) => this.notify.error(err.message || "Échec de l'opération")
      });
    });
  }

  deleteTask(task: Task, event: Event) {
    event.stopPropagation();
    if (!confirm('Supprimer cette action ?')) return;
    
    this.milestoneTaskService.deleteTask(task.id).subscribe({
      next: () => {
        this.loadMilestones(this.selectedProjectId()!);
        this.notify.info('Action supprimée');
        this.loadProjects();
      }
    });
  }

  private resetPlanningDraft(project: Project | null): void {
    if (!project) {
      this.planningDraft.set(null);
      return;
    }
    this.planningDraft.set({
      status: project.status,
      progressPercent: project.progressPercent,
      plannedStartDate: project.plannedStartDate,
      plannedEndDate: project.plannedEndDate,
    });
  }
}
