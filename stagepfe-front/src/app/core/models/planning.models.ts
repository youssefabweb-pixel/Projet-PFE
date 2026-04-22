export type PlanningTaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'EN_RETARD' | 'BLOQUE';
export type TaskPriority = 'BASSE' | 'MOYENNE' | 'HAUTE' | 'CRITIQUE';

export interface UserSummary {
  id: number;
  username: string;
  email: string;
  role: string;
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
  actualEndDate?: string;
  assignee?: UserSummary | null;
  justification?: string;
  delayDays?: number;
}

export interface PlanningMilestone {
  id: number;
  name: string;
  progress: number;
  completed: boolean;
  deadline: string; // ISO date
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
  plannedStartDate: string; // ISO date
  plannedEndDate: string;   // ISO date
  chefProjet?: UserSummary | null;
  milestones: PlanningMilestone[];
}
