import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs/operators';
import {
  DOMAIN_LABELS,
  DeliverableInput,
  PROJECT_DOMAINS,
  Project,
  ProjectCreatePayload,
  ProjectDomain,
  ProjectStatus,
  ProjectUpdatePayload,
} from '../../../core/models/project.models';
import { AuthService } from '../../../core/services/auth.service';
import { ProjectService } from '../../../core/services/project.service';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models/user.models';
import { NotificationCenterService } from '../../../core/notifications/notification-center.service';

export type ProjectSheetMode = 'create' | 'edit' | 'view';

export interface ProjectSheetDialogData {
  mode: ProjectSheetMode;
  project?: Project;
}

const STATUS_OPTIONS: ProjectStatus[] = [
  'BROUILLON',
  'EN_COURS',
  'EN_PAUSE',
  'TERMINE',
  'ANNULE',
];

/** Rôles exclus de l'affectation comme chef de projet. */
const EXCLUDED_CHEF_ROLES = new Set<string>(['MANAGER', 'ADMINISTRATEUR']);

@Component({
  selector: 'app-project-sheet-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, DatePipe],
  templateUrl: './project-sheet-dialog.component.html',
  styleUrl: './project-sheet-dialog.component.scss',
})
export class ProjectSheetDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ProjectSheetDialogComponent, boolean>);
  readonly dialogData = inject<ProjectSheetDialogData>(MAT_DIALOG_DATA);
  private readonly projectService = inject(ProjectService);
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationCenterService);

  readonly saving = signal(false);
  readonly usersLoading = signal(false);
  readonly allUsers = signal<User[]>([]);
  readonly searchChef = signal('');
  readonly searchMembers = signal('');
  readonly chefLookupExpanded = signal(false);
  readonly membersLookupExpanded = signal(false);
  private hasChanges = false;

  readonly statusOptions = STATUS_OPTIONS;
  readonly domainOptions = PROJECT_DOMAINS;
  readonly domainLabels = DOMAIN_LABELS;

  readonly form = this.fb.nonNullable.group({
    code:             ['', [Validators.required, Validators.maxLength(64)]],
    name:             ['', [Validators.required, Validators.maxLength(255)]],
    description:      [''],
    status:           ['BROUILLON' as ProjectStatus, Validators.required],
    domain:           ['DSI' as ProjectDomain, Validators.required],
    progressPercent:  [0, [Validators.min(0), Validators.max(100)]],
    plannedStartDate: ['', Validators.required],
    plannedEndDate:   [''],
    chefProjetId:     [null as number | null],
    memberIds:        [[] as number[]],
    cpEditingUnlocked:[false],
    deliverables:     this.fb.array<FormGroup>([]),
  });

  get deliverables(): FormArray<FormGroup> {
    return this.form.controls.deliverables;
  }

  // ── Computed helpers ─────────────────────────────────────────

  /** MANAGER ou ADMINISTRATEUR : gestion complète du projet. */
  get isPortfolioManager(): boolean {
    const r = this.auth.getRole();
    return r === 'MANAGER' || r === 'ADMINISTRATEUR';
  }

  /** Chef assigné à CE projet et dont la saisie est débloquée en mode edit. */
  get isChefActive(): boolean {
    return this.dialogData.mode === 'edit'
      && this.isAssignedChefSelf
      && this.dialogData.project?.cpEditingUnlocked === true;
  }

  get isAssignedChefSelf(): boolean {
    const uid = this.auth.getUserId();
    return !!uid && this.dialogData.project?.chefProjet?.id === uid;
  }

  get canEditCode(): boolean {
    return this.isPortfolioManager;
  }

  /** PMO peut gérer le chef et le toggle de déblocage. */
  get canEditTeam(): boolean {
    return this.isPortfolioManager && this.dialogData.mode !== 'view';
  }

  /** Chef actif et PMO peuvent gérer les participants. */
  get canEditParticipants(): boolean {
    return this.dialogData.mode !== 'view' && (this.isPortfolioManager || this.isChefActive);
  }

  /**
   * Seul le Chef actif peut éditer les livrables.
   * Le PMO n'y touche pas.
   */
  get canEditDeliverables(): boolean {
    if (this.dialogData.mode === 'view') return false;
    // Le PMO et le Chef de projet assigné peuvent gérer les livrables
    return this.isPortfolioManager || this.isAssignedChefSelf;
  }

  // ── Sections grisées ────────────────────────────────────────

  /** Section IDENTIFICATION grisée pour le Chef actif. */
  get identificationLocked(): boolean {
    return !this.isReadOnly && this.isChefActive;
  }

  /** Section PLANIFICATION grisée pour le PMO. */
  get planificationLocked(): boolean {
    return !this.isReadOnly && this.isPortfolioManager;
  }

  /** Section LIVRABLES grisée par défaut en lecture seule. */
  get livrableLocked(): boolean {
    return this.dialogData.mode === 'view';
  }

  /**
   * Lecture seule :
   * - mode view
   * - Chef assigné dont la saisie est verrouillée
   * - Autre utilisateur (participant) — lecture seule
   */
  get isReadOnly(): boolean {
    if (this.dialogData.mode === 'view') return true;
    if (this.dialogData.mode === 'create') return false;
    if (this.isPortfolioManager) return false;
    if (this.isAssignedChefSelf) {
      return !this.dialogData.project?.cpEditingUnlocked;
    }
    return true;
  }

  get showLockedNotice(): boolean {
    return this.dialogData.mode === 'view'
      && this.isAssignedChefSelf
      && !!this.dialogData.project
      && !this.dialogData.project.cpEditingUnlocked;
  }

  get showUnlockedBadge(): boolean {
    return this.dialogData.mode === 'edit'
      && this.isAssignedChefSelf
      && this.dialogData.project?.cpEditingUnlocked === true;
  }

  get showParticipantNotice(): boolean {
    if (this.isPortfolioManager || this.isAssignedChefSelf) return false;
    return !!this.dialogData.project;
  }

  get title(): string {
    switch (this.dialogData.mode) {
      case 'create': return 'Nouvelle fiche projet';
      case 'edit':   return 'Modifier la fiche projet';
      default:       return 'Fiche projet';
    }
  }

  get progressValue(): number {
    return this.form.controls.progressPercent.value;
  }

  get selectedChefId(): number | null {
    return this.form.controls.chefProjetId.value;
  }

  // ── Lifecycle ────────────────────────────────────────────────

  ngOnInit(): void {
    // Charger les utilisateurs pour PMO et Chef actif
    if (this.isPortfolioManager || this.isChefActive) {
      this.loadUsers();
    }

    if (this.dialogData.mode === 'create') {
      this.form.patchValue({
        plannedStartDate: this.todayIso(),
        status: 'BROUILLON',
        progressPercent: 0,
        domain: 'DSI',
      });
    } else if (this.dialogData.project) {
      this.patchFromProject(this.dialogData.project);
    }

    // Appliquer les restrictions par rôle
    this.applyRoleDisabling();
  }

  /**
   * Désactive les champs de formulaire selon le rôle :
   * - Lecture seule totale → tout désactivé
   * - PMO → PLANIFICATION + LIVRABLES désactivés
   * - Chef actif → IDENTIFICATION + dates + chef/toggle désactivés
   */
  private applyRoleDisabling(): void {
    if (this.isReadOnly) {
      this.form.disable();
      return;
    }

    // Réactiver tout avant d'appliquer les nouvelles restrictions (évite l'état figé après save)
    this.form.enable({ emitEvent: false });

    const r = this.auth.getRole();

    if (r === 'MANAGER' || r === 'ADMINISTRATEUR') {
      // PMO : Peut tout éditer sauf si on veut restreindre spécifiquement certaines choses
      // On retire les désactivations qui empêchaient d'enregistrer le statut ou les livrables
      this.form.controls.status.enable();
      this.form.controls.progressPercent.enable();
      this.form.controls.deliverables.enable();
    } else if (this.isAssignedChefSelf && this.dialogData.project?.cpEditingUnlocked) {
      // Chef actif : section IDENTIFICATION inaccessible
      this.form.controls.code.disable();
      this.form.controls.name.disable();
      this.form.controls.description.disable();
      this.form.controls.domain.disable();
      // Date de début fixée par le PMO
      this.form.controls.plannedStartDate.disable();
      // Fin prévue OPTIONNELLE : Le chef peut la modifier si débloqué
      this.form.controls.plannedEndDate.enable();
      // Chef ne gère pas l'affectation ni le toggle CP
      this.form.controls.chefProjetId.disable();
      this.form.controls.cpEditingUnlocked.disable();
      // Mais il gère statut, avancement et livrables
      this.form.controls.status.enable();
      this.form.controls.progressPercent.enable();
      this.form.controls.deliverables.enable();
    }
  }

  // ── Deliverables ─────────────────────────────────────────────

  private buildDeliverableGroup(initial?: Partial<DeliverableInput> & { id?: number }): FormGroup {
    return this.fb.nonNullable.group({
      id:          [initial?.id ?? null as number | null],
      title:       [initial?.title ?? '', [Validators.required, Validators.maxLength(255)]],
      description: [initial?.description ?? ''],
      dueDate:     [initial?.dueDate ?? ''],
      done:        [initial?.done ?? false],
    });
  }

  addDeliverable(): void {
    if (!this.canEditDeliverables) return;
    this.deliverables.push(this.buildDeliverableGroup());
  }

  removeDeliverable(index: number): void {
    if (!this.canEditDeliverables) return;
    this.deliverables.removeAt(index);
  }

  // ── Documents ──────────────────────────────────────────────

  onFileSelected(event: Event, deliverableId: number | undefined): void {
    if (!deliverableId) {
      this.notifications.warning('Veuillez d\'abord enregistrer le livrable (ou la fiche) pour uploader des documents.');
      return;
    }

    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    this.projectService.uploadDocument(deliverableId, file).subscribe({
      next: (doc) => {
        this.notifications.success('Document importé avec succès.');
        // Recharger le projet pour rafraîchir la liste des documents
        if (this.dialogData.project) {
          this.projectService.getById(this.dialogData.project.id).subscribe(p => {
            this.dialogData.project = p;
            this.patchFromProject(p);
          });
        }
      },
      error: (err) => this.notifications.error(err.message)
    });
  }

  downloadDocument(docId: number, filename: string): void {
    this.projectService.downloadDocument(docId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      },
      error: (err) => this.notifications.error(err.message)
    });
  }

  deleteDocument(docId: number): void {
    if (!confirm('Supprimer ce document ?')) return;
    this.projectService.deleteDocument(docId).subscribe({
      next: () => {
        this.notifications.success('Document supprimé.');
        // Recharger
        if (this.dialogData.project) {
          this.projectService.getById(this.dialogData.project.id).subscribe(p => {
            this.dialogData.project = p;
            this.patchFromProject(p);
          });
        }
      },
      error: (err) => this.notifications.error(err.message)
    });
  }

  // ── Méthodes liste utilisateurs ──────────────────────────────

  readonly filteredChefOptions = computed(() => {
    const term = this.searchChef().toLowerCase().trim();
    const users = this.allUsers().filter((u) => u.enabled && !EXCLUDED_CHEF_ROLES.has(u.role));
    if (!term) return users;
    return users.filter(u => 
      u.username.toLowerCase().includes(term) || 
      u.email.toLowerCase().includes(term)
    );
  });

  readonly filteredMemberOptions = computed(() => {
    const term = this.searchMembers().toLowerCase().trim();
    const users = this.allUsers().filter((u) => u.enabled);
    if (!term) return users;
    return users.filter(u => 
      u.username.toLowerCase().includes(term) || 
      u.email.toLowerCase().includes(term)
    );
  });

  selectChef(id: number): void {
    if (this.isReadOnly) return;
    this.form.controls.chefProjetId.setValue(id);
  }

  isMemberChecked(id: number): boolean {
    return this.form.controls.memberIds.value.includes(id);
  }

  get selectedChefName(): string {
    const id = this.form.controls.chefProjetId.value;
    if (!id || id <= 0) return 'Aucun chef affecté';
    const u = this.allUsers().find(user => user.id === id);
    return u ? u.username : 'Utilisateur inconnu';
  }

  get selectedChefEmail(): string {
    const id = this.form.controls.chefProjetId.value;
    if (id === null) return '';
    const u = this.allUsers().find(user => user.id === id);
    return u ? u.email : '';
  }

  get selectedMembersCount(): number {
    return this.form.controls.memberIds.value.length;
  }

  /** Mise à jour via le <select multiple> participants. */
  onMembersChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const ids = Array.from(select.selectedOptions).map(o => Number(o.value));
    this.form.controls.memberIds.setValue(ids);
  }

  /** Toggle d'un participant dans la nouvelle checklist. */
  toggleMember(id: number): void {
    if (this.isReadOnly) return;
    const current = [...this.form.controls.memberIds.value];
    const idx = current.indexOf(id);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(id);
    }
    this.form.controls.memberIds.setValue(current);
  }

  // ── Labels ───────────────────────────────────────────────────

  statusLabel(s: ProjectStatus): string {
    switch (s) {
      case 'BROUILLON': return 'Brouillon';
      case 'EN_COURS':  return 'En cours';
      case 'EN_PAUSE':  return 'En pause';
      case 'TERMINE':   return 'Terminé';
      case 'ANNULE':    return 'Annulé';
    }
  }

  statusKey(status: ProjectStatus): string {
    switch (status) {
      case 'EN_COURS': return 'run';
      case 'EN_PAUSE': return 'pause';
      case 'TERMINE':  return 'done';
      case 'ANNULE':   return 'cancel';
      default:         return 'draft';
    }
  }

  domainLabel(d: ProjectDomain): string {
    return DOMAIN_LABELS[d] ?? d;
  }

  roleLabel(role: string): string {
    const map: Record<string, string> = {
      ADMINISTRATEUR: 'Administrateur',
      MANAGER:        'Manager (PMO)',
      CHEF_PROJET:    'Chef de projet',
      MOA:            'MOA',
      METIER:         'Métier',
      DEVELOPPEMENT:  'Développement',
    };
    return map[role] ?? role;
  }

  initial(name: string): string {
    return name ? name[0].toUpperCase() : '?';
  }

  /** Trouve un livrable existant par son ID dans les données du projet. */
  findProjectDeliverable(delivId: number | null | undefined): any {
    if (!delivId || !this.dialogData.project?.deliverables) return undefined;
    return this.dialogData.project.deliverables.find(d => d.id === delivId);
  }

  // ── Actions ──────────────────────────────────────────────────

  close(ok?: boolean): void {
    this.dialogRef.close(ok ?? this.hasChanges);
  }

  submit(): void {
    if (this.form.invalid || this.isReadOnly) {
      this.form.markAllAsTouched();
      if (!this.isReadOnly && this.form.invalid) {
        this.notifications.warning(
          'Renseignez les champs obligatoires du formulaire puis enregistrez la fiche pour activer le depot des documents.',
        );
      }
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const deliverables = this.collectDeliverables(
      v.deliverables as Array<{ id: number | null; title: string; description: string; dueDate: string; done: boolean }>,
    );

    // ── CREATE (PMO uniquement) ────────────────────────────────
    if (this.dialogData.mode === 'create') {
      const payload: ProjectCreatePayload = {
        code:             v.code.trim(),
        name:             v.name.trim(),
        description:      v.description?.trim() || null,
        status:           'BROUILLON',
        domain:           v.domain,
        progressPercent:  0,
        plannedStartDate: v.plannedStartDate || this.todayIso(),
        plannedEndDate:   v.plannedEndDate || null,
        deliverables, // Ajout des livrables dès la création
      };
      if (this.isPortfolioManager) {
        if (v.chefProjetId != null) payload.chefProjetId = v.chefProjetId;
        if (v.memberIds.length > 0) payload.memberIds = v.memberIds;
      }
      this.projectService.create(payload)
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe({
          next: (res) => {
            this.notifications.success(`Fiche ${payload.code} créée.`, 'Projet créé', 'task');
            this.hasChanges = true;
            if (res) {
              this.dialogData.mode = 'edit';
              this.dialogData.project = res;
              this.patchFromProject(res);
              this.applyRoleDisabling();
            }
          },
          error: (e: Error) => this.notifications.error(e.message),
        });
      return;
    }

    // ── EDIT ──────────────────────────────────────────────────
    if (this.dialogData.mode === 'edit' && this.dialogData.project) {
      let payload: ProjectUpdatePayload;

      if (this.isPortfolioManager) {
        // PMO : Identification + Équipe + Livrables (pas planification)
        payload = {
          code:              v.code.trim(),
          name:              v.name.trim(),
          description:       v.description?.trim() || null,
          status:            v.status,
          domain:            v.domain,
          progressPercent:   v.progressPercent,
          plannedStartDate:  v.plannedStartDate,
          plannedEndDate:    v.plannedEndDate || null,
          chefProjetId:      v.chefProjetId,
          memberIds:         v.memberIds,
          cpEditingUnlocked: v.cpEditingUnlocked,
          deliverables,
        };
      } else if (this.isAssignedChefSelf) {
        // Chef actif : Planification + Livrables
        // IMPORTANT : On n'envoie PAS memberIds pour le chef pour éviter l'erreur de sécurité backend
        payload = {
          description:     v.description?.trim() || null,
          status:          v.status,
          progressPercent: v.progressPercent,
          plannedEndDate:  v.plannedEndDate || null,
          deliverables,
        };
      } else {
        this.saving.set(false);
        return;
      }

      this.projectService.update(this.dialogData.project.id, payload)
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe({
          next: (res) => {
            this.notifications.success(
              `Fiche ${this.dialogData.project!.code} mise à jour.`,
              'Projet modifié', 'task'
            );
            this.hasChanges = true;
            if (res) {
              this.dialogData.project = res;
              this.patchFromProject(res);
              this.applyRoleDisabling();
            }
          },
          error: (e: Error) => this.notifications.error(e.message),
        });
    }
  }

  saveForDocumentUpload(): void {
    if (this.saving() || this.isReadOnly) {
      return;
    }
    this.submit();
  }

  // ── Privé ────────────────────────────────────────────────────

  private collectDeliverables(rows: Array<{ id: number | null; title: string; description: string; dueDate: string; done: boolean }>): DeliverableInput[] {
    return rows
      .filter((r) => (r.title ?? '').trim().length > 0)
      .map((r) => ({
        id: r.id ?? undefined,
        title: r.title.trim(),
        description: r.description?.trim() || null,
        dueDate: r.dueDate || null,
        done: r.done,
      }));
  }

  private loadUsers(): void {
    this.usersLoading.set(true);
    this.userService.getAll()
      .pipe(finalize(() => this.usersLoading.set(false)))
      .subscribe({
        next: (users) => this.allUsers.set(users),
        error: ()      => this.allUsers.set([]),
      });
  }

  private patchFromProject(p: Project): void {
    this.form.patchValue({
      code:             p.code,
      name:             p.name,
      description:      p.description ?? '',
      status:           p.status,
      domain:           p.domain ?? 'DSI',
      progressPercent:  p.progressPercent,
      plannedStartDate: p.plannedStartDate,
      plannedEndDate:   p.plannedEndDate ?? '',
      chefProjetId:     p.chefProjet?.id ?? null,
      memberIds:        p.members.map((m) => m.id),
      cpEditingUnlocked:p.cpEditingUnlocked,
    });
    this.deliverables.clear();
    for (const d of p.deliverables ?? []) {
      this.deliverables.push(this.buildDeliverableGroup({
        id: d.id,
        title: d.title,
        description: d.description ?? '',
        dueDate: d.dueDate ?? '',
        done: d.done,
      }));
    }
  }

  private todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
