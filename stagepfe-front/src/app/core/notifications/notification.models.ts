/** Type de notification in-app (historique + cloche). */
export type AppNotificationKind = 'success' | 'error' | 'warning' | 'info';

/** Catégorie métier pour filtres (push-like : retard, validation, commentaire…). */
export type AppNotificationCategory = 'system' | 'delay' | 'validation' | 'comment' | 'task' | 'other';

export interface AppNotification {
  id: string;
  kind: AppNotificationKind;
  category: AppNotificationCategory;
  title: string;
  message: string;
  createdAt: number;
  read: boolean;
  /** Données optionnelles (ex. id projet) pour navigation future */
  meta?: Record<string, string | number | boolean>;
}
