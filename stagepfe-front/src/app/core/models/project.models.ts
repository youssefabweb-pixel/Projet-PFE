export type ProjectStatus = 'BROUILLON' | 'EN_COURS' | 'EN_PAUSE' | 'TERMINE' | 'ANNULE';

export type MilestoneStatus = 'NON_DEMARRE' | 'EN_COURS' | 'TERMINE' | 'EN_RETARD' | 'BLOQUE';

export type ProjectDomain =
  | 'AUDIT_ET_INSPECTION'
  | 'BO_OPERATIONS'
  | 'CONFORMITE'
  | 'CONFORMITE_REGLEMENTAIRE'
  | 'DLMG'
  | 'DPO'
  | 'DRH'
  | 'DSI'
  | 'INTERNATIONALE'
  | 'MARKETING_ET_COMMUNICATION'
  | 'MONETIQUE'
  | 'PF';

export const PROJECT_DOMAINS: ProjectDomain[] = [
  'AUDIT_ET_INSPECTION',
  'BO_OPERATIONS',
  'CONFORMITE',
  'CONFORMITE_REGLEMENTAIRE',
  'DLMG',
  'DPO',
  'DRH',
  'DSI',
  'INTERNATIONALE',
  'MARKETING_ET_COMMUNICATION',
  'MONETIQUE',
  'PF',
];

export const DOMAIN_LABELS: Record<ProjectDomain, string> = {
  AUDIT_ET_INSPECTION: 'Audit et inspection',
  BO_OPERATIONS: 'BO Opérations',
  CONFORMITE: 'Conformité',
  CONFORMITE_REGLEMENTAIRE: 'Conformité Réglementaire',
  DLMG: 'DLMG',
  DPO: 'DPO',
  DRH: 'DRH',
  DSI: 'DSI',
  INTERNATIONALE: 'Internationale',
  MARKETING_ET_COMMUNICATION: 'Marketing & Communication',
  MONETIQUE: 'Monétique',
  PF: 'PF',
};

export interface UserSummary {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface DocumentMetadata {
  id: number;
  filename: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

export interface Deliverable {
  id?: number;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  done: boolean;
  createdAt?: string;
  documents?: DocumentMetadata[];
}

export interface DeliverableInput {
  id?: number;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  done: boolean;
}

export interface Task {
  id: number;
  title: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'EN_RETARD' | 'BLOQUE';
  description?: string;
  startDate?: string;
  endDate?: string;
  progressPercent: number;
  assignee?: UserSummary | null;
  dependencyTaskId?: number | null;
  justification?: string;
  actualEndDate?: string;
}

export interface TaskInput {
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  progressPercent: number;
  status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'EN_RETARD' | 'BLOQUE';
  assigneeId?: number | null;
  dependencyTaskId?: number | null;
  justification?: string;
  actualEndDate?: string;
}

export interface Milestone {
  id: number;
  title: string;
  description?: string;
  deadline: string;
  actualEndDate?: string | null;
  progressPercent: number;
  status: MilestoneStatus;
  justification?: string;
  actionPlan?: string;
  tasks?: Task[];
}

export interface MilestoneInput {
  title: string;
  description?: string;
  deadline: string;
  actualEndDate?: string | null;
  status?: MilestoneStatus;
  justification?: string;
  actionPlan?: string;
}

export interface Project {
  id: number;
  code: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  domain: ProjectDomain | null;
  progressPercent: number;
  plannedStartDate: string;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  chefProjet: UserSummary | null;
  createdBy: UserSummary;
  members: UserSummary[];
  deliverables: Deliverable[];
  cpEditingUnlocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCreatePayload {
  code: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  domain: ProjectDomain;
  progressPercent: number;
  plannedStartDate: string;
  plannedEndDate?: string | null;
  chefProjetId?: number | null;
  memberIds?: number[];
  deliverables?: DeliverableInput[];
}

export interface ProjectUpdatePayload {
  code?: string;
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
  domain?: ProjectDomain;
  progressPercent?: number;
  plannedStartDate?: string;
  plannedEndDate?: string | null;
  chefProjetId?: number | null;
  memberIds?: number[];
  cpEditingUnlocked?: boolean;
  deliverables?: DeliverableInput[];
}
