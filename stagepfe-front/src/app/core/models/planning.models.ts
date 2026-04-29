/** Canonical planning statuses returned by `/api/projects/planning` (alignés backend). */
export type PlanningTaskStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DELAYED'
  | 'BLOCKED';

export type PlanningMilestoneStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DELAYED'
  | 'BLOCKED';

export type TaskPriority = 'BASSE' | 'MOYENNE' | 'HAUTE' | 'CRITIQUE';

export interface UserSummary {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface TaskDocument {
  id: number;
  taskId: number;
  filename: string;
  contentType: string;
  size: number;
  uploadedAt: string;
  downloadUrl: string;
}

export interface PlanningTask {
  id: number;
  name: string;
  status: PlanningTaskStatus;
  priority: TaskPriority;
  progress: number;
  description?: string;
  startDate?: string;
  endDate?: string;
  dependsOnTaskIds?: number[];
  assignee?: UserSummary | null;
  justification?: string;
  delayDays?: number;
  deliverableUrl?: string | null;
  deliverableLabel?: string | null;
  taskDocuments?: TaskDocument[];
}

export interface PlanningMilestone {
  id: number;
  name: string;
  status: PlanningMilestoneStatus;
  progress: number;
  completed: boolean;
  deadline: string;
  description?: string;
  justification?: string;
  delayDays?: number;
  tasks: PlanningTask[];
}

export interface PlanningProject {
  id: number;
  code: string;
  name: string;
  status: 'BROUILLON' | 'EN_COURS' | 'EN_PAUSE' | 'TERMINE' | 'ANNULE';
  progress: number;
  completed: boolean;
  plannedStartDate: string;
  plannedEndDate: string;
  chefProjet?: UserSummary | null;
  milestones: PlanningMilestone[];
  /** Statut du cycle de validation du macro-planning. null = projet legacy (traité comme VALIDE). */
  macroPlanning?: 'DRAFT' | 'SOUMIS' | 'VALIDE' | null;
}

export interface MilestoneProgressSummary {
  milestoneId: number;
  name: string;
  status: PlanningMilestoneStatus;
  progressPercent: number;
  completed: boolean;
  deadline: string;
  delayDays: number;
  taskCount: number;
  completedTaskCount: number;
}

export interface ProjectProgressSummary {
  projectId: number;
  code: string;
  name: string;
  status: string;
  progressPercent: number;
  completed: boolean;
  milestoneCount: number;
  delayedTaskCount: number;
  blockedTaskCount: number;
  milestones: MilestoneProgressSummary[];
}
