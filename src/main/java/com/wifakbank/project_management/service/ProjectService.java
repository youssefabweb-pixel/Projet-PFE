package com.wifakbank.project_management.service;

import com.wifakbank.project_management.service.LoggingService;
import com.wifakbank.project_management.service.ActionHistoryService;
import com.wifakbank.project_management.dto.request.DeliverableRequest;
import com.wifakbank.project_management.dto.request.ProjectCreateRequest;
import com.wifakbank.project_management.dto.request.ProjectUpdateRequest;
import com.wifakbank.project_management.dto.response.DeliverableResponse;
import com.wifakbank.project_management.dto.response.DocumentResponse;
import com.wifakbank.project_management.dto.response.ProjectResponse;
import com.wifakbank.project_management.dto.response.UserSummaryResponse;
import com.wifakbank.project_management.entity.Deliverable;
import com.wifakbank.project_management.entity.Domain;
import com.wifakbank.project_management.entity.MacroPlanningStatus;
import com.wifakbank.project_management.entity.Notification;
import com.wifakbank.project_management.entity.Project;
import com.wifakbank.project_management.entity.ProjectStatus;
import com.wifakbank.project_management.entity.Role;
import com.wifakbank.project_management.entity.User;
import com.wifakbank.project_management.exception.AppException;
import com.wifakbank.project_management.repository.ProjectRepository;
import com.wifakbank.project_management.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final LoggingService loggingService;
    private final ActionHistoryService actionHistoryService;

    @Transactional(readOnly = true)
    public List<ProjectResponse> list(Authentication authentication) {
        User actor = loadUser(authentication.getName());
        List<Long> ids = resolveVisibleProjectIds(actor);
        if (ids.isEmpty()) {
            return List.of();
        }
        List<Project> loaded = projectRepository.findByIdInWithAssociations(ids);
        Map<Long, Project> byId = loaded.stream().collect(Collectors.toMap(Project::getId, Function.identity()));
        return ids.stream()
                .map(byId::get)
                .filter(Objects::nonNull)
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProjectResponse getById(Long id, Authentication authentication) {
        User actor = loadUser(authentication.getName());
        Project project = projectRepository.findByIdWithAssociations(id)
                .orElseThrow(() -> new AppException("PROJECT_NOT_FOUND", "Projet introuvable", HttpStatus.NOT_FOUND));
        if (!canView(actor, project)) {
            throw new AppException("ACCESS_DENIED", "Accès refusé à ce projet", HttpStatus.FORBIDDEN);
        }
        return toResponse(project);
    }

    @Transactional
    public ProjectResponse create(ProjectCreateRequest request, Authentication authentication) {
        User actor = loadUser(authentication.getName());
        if (!canCreateProject(actor.getRole())) {
            throw new AppException("ACCESS_DENIED", "Création de projet réservée au MANAGER ou ADMINISTRATEUR", HttpStatus.FORBIDDEN);
        }

        String code = request.getCode().trim();
        if (projectRepository.existsByCodeIgnoreCase(code)) {
            throw new AppException("PROJECT_CODE_EXISTS", "Ce code projet existe déjà", HttpStatus.CONFLICT);
        }

        validateDateRange(request.getPlannedStartDate(), request.getPlannedEndDate());

        Project project = new Project();
        project.setCode(code);
        project.setName(request.getName().trim());
        project.setDescription(trimToNull(request.getDescription()));
        project.setStatus(parseStatus(request.getStatus()));
        project.setDomain(parseDomain(request.getDomain()));
        project.setProgressPercent(clampProgress(request.getProgressPercent()));
        project.setPlannedStartDate(request.getPlannedStartDate());
        project.setPlannedEndDate(request.getPlannedEndDate());
        project.setCreatedBy(actor);
        project.getMembers().add(actor);

        User chef = null;
        if (isValidUserId(request.getChefProjetId())) {
            chef = applyChef(project, request.getChefProjetId());
        }
        if (request.getMemberIds() != null && !request.getMemberIds().isEmpty()) {
            addParticipantIds(project, request.getMemberIds());
        }
        if (request.getDeliverables() != null) {
            for (DeliverableRequest d : request.getDeliverables()) {
                Deliverable entity = new Deliverable();
                entity.setProject(project);
                applyDeliverableFields(entity, d);
                project.getDeliverables().add(entity);
            }
        }

        Project saved = projectRepository.save(project);
        notificationService.notifyNewProject(saved);
        String createProjectDetails = "Projet cree : " + saved.getName() + " [" + saved.getCode() + "]";
        loggingService.logAction(actor.getUsername(), "CREATE", "PROJECT", saved.getId(), createProjectDetails);
        actionHistoryService.record(actor.getUsername(), "CREATE", "PROJECT", saved.getId(), createProjectDetails);

        if (chef != null) {
            notificationService.notify(
                    chef,
                    Notification.Type.PROJECT_ASSIGNED_AS_CHEF,
                    "Vous avez été désigné chef de projet sur : " + saved.getName(),
                    saved);
        }
        notifyNewMembers(saved, Set.of(), saved.getMembers(), chef);

        return toResponse(projectRepository.findByIdWithAssociations(saved.getId()).orElse(saved));
    }

    @Transactional
    public ProjectResponse update(Long id, ProjectUpdateRequest request, Authentication authentication) {
        User actor = loadUser(authentication.getName());
        Project project = projectRepository.findByIdWithAssociations(id)
                .orElseThrow(() -> new AppException("PROJECT_NOT_FOUND", "Projet introuvable", HttpStatus.NOT_FOUND));

        if (!canView(actor, project)) {
            throw new AppException("ACCESS_DENIED", "Accès refusé à ce projet", HttpStatus.FORBIDDEN);
        }
        if (!canEdit(actor, project)) {
            throw new AppException("ACCESS_DENIED", "Modification non autorisée", HttpStatus.FORBIDDEN);
        }

        Long previousChefId = project.getChefProjet() != null ? project.getChefProjet().getId() : null;
        Set<Long> previousMemberIds = project.getMembers().stream().map(User::getId).collect(Collectors.toSet());
        ProjectStatus previousStatus = project.getStatus();

        boolean elevated = isElevated(actor.getRole());

        if (elevated) {
            applyElevatedUpdate(project, request);
        } else if (isAssignedChef(actor, project) && project.isCpEditingUnlocked()) {
            assertNoCpForbiddenFields(project, request, actor);
            applyChefProjetLimitedUpdate(project, request);
        } else {
            throw new AppException("ACCESS_DENIED", "Modification non autorisée", HttpStatus.FORBIDDEN);
        }

        Project saved = projectRepository.save(project);
        String updateProjectDetails = "Projet modifie : " + saved.getName() + " [" + saved.getCode() + "]";
        loggingService.logAction(actor.getUsername(), "UPDATE", "PROJECT", saved.getId(), updateProjectDetails);
        actionHistoryService.record(actor.getUsername(), "UPDATE", "PROJECT", saved.getId(), updateProjectDetails);

        if (!elevated && isAssignedChef(actor, saved)) {
            notifyManagersOfProgressUpdate(saved, actor);
        }

        Long newChefId = saved.getChefProjet() != null ? saved.getChefProjet().getId() : null;
        if (newChefId != null && !Objects.equals(previousChefId, newChefId)) {
            notificationService.notify(
                    saved.getChefProjet(),
                    Notification.Type.PROJECT_ASSIGNED_AS_CHEF,
                    "Vous avez été désigné chef de projet sur : " + saved.getName(),
                    saved);
        }
        notifyNewMembers(saved, previousMemberIds, saved.getMembers(), saved.getChefProjet());
        notifyProjectStatusTransitions(saved, previousStatus);

        return toResponse(projectRepository.findByIdWithAssociations(saved.getId()).orElse(saved));
    }

    /**
     * Chef de projet : soumet la planification pour validation PMO (DRAFT → SOUMIS).
     */
    @Transactional
    public ProjectResponse submitPlanning(Long id, Authentication authentication) {
        User actor = loadUser(authentication.getName());
        Project project = projectRepository.findByIdWithAssociations(id)
                .orElseThrow(() -> new AppException("PROJECT_NOT_FOUND", "Projet introuvable", HttpStatus.NOT_FOUND));

        if (!isAssignedChef(actor, project)) {
            throw new AppException("ACCESS_DENIED", "Seul le chef de projet peut soumettre la planification", HttpStatus.FORBIDDEN);
        }

        MacroPlanningStatus current = project.getMacroPlanning();
        if (current == MacroPlanningStatus.SOUMIS || current == MacroPlanningStatus.VALIDE) {
            throw new AppException("INVALID_STATE",
                    "Le planning a déjà été soumis ou validé (statut actuel : " + current + ")",
                    HttpStatus.CONFLICT);
        }

        project.setMacroPlanning(MacroPlanningStatus.SOUMIS);
        Project saved = projectRepository.save(project);

        loggingService.logAction(actor.getUsername(), "SUBMIT_PLANNING", "PROJECT", saved.getId(),
                "Planning soumis pour validation PMO : " + saved.getName());
        actionHistoryService.record(actor.getUsername(), "SUBMIT_PLANNING", "PROJECT", saved.getId(),
                "Planning soumis pour validation PMO : " + saved.getName());

        // Notifier tous les managers
        List<User> managers = userRepository.findByRole(Role.MANAGER);
        for (User manager : managers) {
            notificationService.notify(manager, Notification.Type.PLANNING_SUBMITTED,
                    "Le chef " + actor.getUsername() + " a soumis le planning du projet : " + saved.getName(), saved);
        }

        return toResponse(projectRepository.findByIdWithAssociations(saved.getId()).orElse(saved));
    }

    /**
     * PMO / Administrateur : valide la planification soumise (SOUMIS → VALIDE).
     */
    @Transactional
    public ProjectResponse validatePlanning(Long id, Authentication authentication) {
        User actor = loadUser(authentication.getName());
        if (!isElevated(actor.getRole())) {
            throw new AppException("ACCESS_DENIED", "Seul le PMO ou un administrateur peut valider la planification", HttpStatus.FORBIDDEN);
        }

        Project project = projectRepository.findByIdWithAssociations(id)
                .orElseThrow(() -> new AppException("PROJECT_NOT_FOUND", "Projet introuvable", HttpStatus.NOT_FOUND));

        if (project.getMacroPlanning() == MacroPlanningStatus.VALIDE) {
            throw new AppException("INVALID_STATE", "Le planning est déjà validé", HttpStatus.CONFLICT);
        }

        project.setMacroPlanning(MacroPlanningStatus.VALIDE);
        Project saved = projectRepository.save(project);

        loggingService.logAction(actor.getUsername(), "VALIDATE_PLANNING", "PROJECT", saved.getId(),
                "Planning validé par PMO : " + saved.getName());
        actionHistoryService.record(actor.getUsername(), "VALIDATE_PLANNING", "PROJECT", saved.getId(),
                "Planning validé par PMO : " + saved.getName());

        // Notifier le chef de projet
        if (saved.getChefProjet() != null) {
            notificationService.notify(saved.getChefProjet(), Notification.Type.PLANNING_VALIDATED,
                    "Votre planning du projet \"" + saved.getName() + "\" a été validé par le PMO. Vous pouvez maintenant planifier les tâches.", saved);
        }

        return toResponse(projectRepository.findByIdWithAssociations(saved.getId()).orElse(saved));
    }

    @Transactional
    public void delete(Long id, Authentication authentication) {
        User actor = loadUser(authentication.getName());
        if (actor.getRole() != Role.MANAGER && actor.getRole() != Role.ADMINISTRATEUR) {
            throw new AppException("ACCESS_DENIED", "Suppression réservée au MANAGER ou ADMINISTRATEUR", HttpStatus.FORBIDDEN);
        }
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new AppException("PROJECT_NOT_FOUND", "Projet introuvable", HttpStatus.NOT_FOUND));
        String deleteProjectDetails = "Projet supprime : " + project.getName() + " [" + project.getCode() + "]";
        loggingService.logAction(actor.getUsername(), "DELETE", "PROJECT", project.getId(), deleteProjectDetails);
        actionHistoryService.record(actor.getUsername(), "DELETE", "PROJECT", project.getId(), deleteProjectDetails);
        projectRepository.delete(project);
    }

    private List<Long> resolveVisibleProjectIds(User actor) {
        if (isElevated(actor.getRole())) {
            return projectRepository.findAllProjectIdsOrdered();
        }
        if (projectRepository.existsByChefProjet_Id(actor.getId())) {
            // Chef de projet: accès strict à ses propres projets affectés.
            return projectRepository.findProjectIdsByChef(actor.getId());
        }
        return projectRepository.findAccessibleProjectIds(actor.getId());
    }

    private void applyElevatedUpdate(Project project, ProjectUpdateRequest request) {
        if (request.getCode() != null && !request.getCode().isBlank()) {
            String newCode = request.getCode().trim();
            if (!newCode.equalsIgnoreCase(project.getCode())
                    && projectRepository.existsByCodeIgnoreCaseAndIdNot(newCode, project.getId())) {
                throw new AppException("PROJECT_CODE_EXISTS", "Ce code projet existe déjà", HttpStatus.CONFLICT);
            }
            project.setCode(newCode);
        }

        if (request.getName() != null && !request.getName().isBlank()) {
            project.setName(request.getName().trim());
        }

        if (request.getDescription() != null) {
            project.setDescription(trimToNull(request.getDescription()));
        }

        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            project.setStatus(parseStatus(request.getStatus()));
        }

        if (request.getDomain() != null && !request.getDomain().isBlank()) {
            project.setDomain(parseDomain(request.getDomain()));
        }

        if (request.getProgressPercent() != null) {
            project.setProgressPercent(clampProgress(request.getProgressPercent()));
        }

        if (request.getPlannedStartDate() != null) {
            project.setPlannedStartDate(request.getPlannedStartDate());
        }
        if (request.getPlannedEndDate() != null) {
            project.setPlannedEndDate(request.getPlannedEndDate());
        }

        validateDateRange(project.getPlannedStartDate(), project.getPlannedEndDate());

        if (request.getChefProjetId() != null) {
            if (request.getChefProjetId() > 0) {
                applyChef(project, request.getChefProjetId());
            } else {
                project.setChefProjet(null);
            }
        }
        if (request.getMemberIds() != null) {
            syncMembersFromIds(project, request.getMemberIds());
        }
        if (request.getCpEditingUnlocked() != null) {
            project.setCpEditingUnlocked(request.getCpEditingUnlocked());
        }
        if (request.getDeliverables() != null) {
            syncDeliverables(project, request.getDeliverables());
        }
    }

    private void assertNoCpForbiddenFields(Project project, ProjectUpdateRequest request, User actor) {
        if (request.getCode() != null && !request.getCode().isBlank() && !request.getCode().equals(project.getCode())) {
            throw new AppException("ACCESS_DENIED", "Le chef de projet ne peut pas modifier le code", HttpStatus.FORBIDDEN);
        }
        if (request.getName() != null && !request.getName().isBlank() && !request.getName().equals(project.getName())) {
            throw new AppException("ACCESS_DENIED", "Le chef de projet ne peut pas modifier l’intitulé", HttpStatus.FORBIDDEN);
        }
        if (request.getDomain() != null && !request.getDomain().isBlank() && !request.getDomain().equals(project.getDomain().name())) {
            throw new AppException("ACCESS_DENIED", "Le chef de projet ne peut pas modifier le domaine", HttpStatus.FORBIDDEN);
        }
        if (request.getPlannedStartDate() != null && !request.getPlannedStartDate().equals(project.getPlannedStartDate())) {
            throw new AppException("ACCESS_DENIED", "Le chef de projet ne peut pas modifier la date de début", HttpStatus.FORBIDDEN);
        }
        // Date de fin : le CP peut la modifier si débloqué
        if (request.getPlannedEndDate() != null && !isAssignedChef(actor, project)) {
             if (!Objects.equals(request.getPlannedEndDate(), project.getPlannedEndDate())) {
                throw new AppException("ACCESS_DENIED", "La modification de la date de fin par un non-CP est restreinte", HttpStatus.FORBIDDEN);
             }
        }
        if (isValidUserId(request.getChefProjetId()) && !request.getChefProjetId().equals(project.getChefProjet().getId())) {
            throw new AppException("ACCESS_DENIED", "L’affectation du CP est réservée au PMO", HttpStatus.FORBIDDEN);
        }
        if (request.getMemberIds() != null) {
            Set<Long> currentIds = project.getMembers().stream().map(User::getId).collect(Collectors.toSet());
            Set<Long> requestedIds = request.getMemberIds().stream().collect(Collectors.toSet());
            if (!currentIds.equals(requestedIds)) {
                throw new AppException("ACCESS_DENIED", "L’équipe est gérée par le PMO", HttpStatus.FORBIDDEN);
            }
        }
        if (request.getCpEditingUnlocked() != null && request.getCpEditingUnlocked() != project.isCpEditingUnlocked()) {
            throw new AppException("ACCESS_DENIED", "Le déblocage saisie CP est réservé au PMO", HttpStatus.FORBIDDEN);
        }
    }

    private void applyChefProjetLimitedUpdate(Project project, ProjectUpdateRequest request) {
        if (request.getDescription() != null) {
            project.setDescription(trimToNull(request.getDescription()));
        }
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            project.setStatus(parseStatus(request.getStatus()));
        }
        if (request.getProgressPercent() != null) {
            project.setProgressPercent(clampProgress(request.getProgressPercent()));
        }
        if (request.getDeliverables() != null) {
            syncDeliverables(project, request.getDeliverables());
        }
        if (request.getPlannedEndDate() != null) {
            project.setPlannedEndDate(request.getPlannedEndDate());
        }
    }

    private boolean isAssignedChef(User actor, Project project) {
        return project.getChefProjet() != null
                && project.getChefProjet().getId().equals(actor.getId());
    }

    /**
     * Affecte un chef de projet. Peut être n'importe quel utilisateur, sauf un MANAGER ou un ADMINISTRATEUR.
     */
    private User applyChef(Project project, Long chefProjetId) {
        User chef = userRepository.findById(chefProjetId)
                .orElseThrow(() -> new AppException("USER_NOT_FOUND", "Chef de projet introuvable", HttpStatus.BAD_REQUEST));
        if (chef.getRole() == Role.MANAGER || chef.getRole() == Role.ADMINISTRATEUR) {
            throw new AppException(
                    "INVALID_CHEF_ROLE",
                    "Le chef de projet ne peut pas être un MANAGER ou un ADMINISTRATEUR",
                    HttpStatus.BAD_REQUEST);
        }
        project.setChefProjet(chef);
        project.getMembers().add(chef);
        return chef;
    }

    private void addParticipantIds(Project project, List<Long> memberIds) {
        for (Long uid : memberIds) {
            if (!isValidUserId(uid)) {
                continue;
            }
            User u = userRepository.findById(uid)
                    .orElseThrow(() -> new AppException("USER_NOT_FOUND", "Utilisateur introuvable: " + uid, HttpStatus.BAD_REQUEST));
            project.getMembers().add(u);
        }
    }

    private void syncMembersFromIds(Project project, List<Long> memberIds) {
        Set<Long> ids = memberIds.stream().filter(ProjectService::isValidUserId).collect(Collectors.toSet());
        ids.add(project.getCreatedBy().getId());
        if (project.getChefProjet() != null) {
            ids.add(project.getChefProjet().getId());
        }
        Set<User> next = ids.stream()
                .map(uid -> userRepository.findById(uid)
                        .orElseThrow(() -> new AppException("USER_NOT_FOUND", "Utilisateur introuvable: " + uid, HttpStatus.BAD_REQUEST)))
                .collect(Collectors.toSet());
        project.getMembers().clear();
        project.getMembers().addAll(next);
    }

    private void syncDeliverables(Project project, List<DeliverableRequest> requested) {
        Map<Long, Deliverable> existingById = new HashMap<>();
        for (Deliverable d : project.getDeliverables()) {
            if (d.getId() != null) {
                existingById.put(d.getId(), d);
            }
        }

        List<Deliverable> next = new ArrayList<>();
        for (DeliverableRequest req : requested) {
            Deliverable target;
            if (req.getId() != null && existingById.containsKey(req.getId())) {
                target = existingById.get(req.getId());
            } else {
                target = new Deliverable();
                target.setProject(project);
            }
            applyDeliverableFields(target, req);
            next.add(target);
        }

        project.getDeliverables().clear();
        project.getDeliverables().addAll(next);
    }

    private void applyDeliverableFields(Deliverable entity, DeliverableRequest req) {
        if (req.getTitle() == null || req.getTitle().isBlank()) {
            throw new AppException("INVALID_DELIVERABLE", "Le titre du livrable est obligatoire", HttpStatus.BAD_REQUEST);
        }
        entity.setTitle(req.getTitle().trim());
        entity.setDescription(trimToNull(req.getDescription()));
        entity.setDueDate(req.getDueDate());
        entity.setDone(req.isDone());
    }

    private void notifyNewMembers(Project project, Set<Long> previousMemberIds, Set<User> currentMembers, User chef) {
        Long chefId = chef != null ? chef.getId() : null;
        Long creatorId = project.getCreatedBy() != null ? project.getCreatedBy().getId() : null;
        for (User u : currentMembers) {
            if (previousMemberIds.contains(u.getId())) {
                continue;
            }
            if (Objects.equals(u.getId(), chefId)) {
                continue;
            }
            if (Objects.equals(u.getId(), creatorId)) {
                continue;
            }
            notificationService.notifyParticipants(project, List.of(u), "PROJECT", project.getName());
        }
    }

    private void notifyProjectStatusTransitions(Project project, ProjectStatus previousStatus) {
        if (project == null || previousStatus == null) {
            return;
        }
        if (previousStatus != ProjectStatus.TERMINE && project.getStatus() == ProjectStatus.TERMINE) {
            notificationService.notifyProjectCompleted(project);
        }
        boolean delayedNow = project.getPlannedEndDate() != null
                && project.getPlannedEndDate().isBefore(LocalDate.now())
                && project.getStatus() != ProjectStatus.TERMINE
                && project.getStatus() != ProjectStatus.ANNULE;
        if (delayedNow) {
            notificationService.notifyDelay(project, null);
        }
    }

    private static boolean isValidUserId(Long id) {
        return id != null && id > 0;
    }

    /** Création réservée au MANAGER (PMO) ou à l'ADMINISTRATEUR. */
    private boolean canCreateProject(Role role) {
        return role == Role.MANAGER || role == Role.ADMINISTRATEUR;
    }

    private boolean isElevated(Role role) {
        return role == Role.MANAGER || role == Role.ADMINISTRATEUR;
    }

    private boolean canView(User actor, Project project) {
        if (isElevated(actor.getRole())) {
            return true;
        }
        if (project.getChefProjet() != null && project.getChefProjet().getId().equals(actor.getId())) {
            return true;
        }
        return project.getMembers().stream().anyMatch(u -> u.getId().equals(actor.getId()));
    }

    private boolean canEdit(User actor, Project project) {
        if (isElevated(actor.getRole())) {
            return true;
        }
        return isAssignedChef(actor, project) && project.isCpEditingUnlocked();
    }

    private User loadUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException("USER_NOT_FOUND", "Utilisateur introuvable", HttpStatus.UNAUTHORIZED));
    }

    private ProjectStatus parseStatus(String raw) {
        try {
            return ProjectStatus.valueOf(raw.trim().toUpperCase());
        } catch (Exception e) {
            throw new AppException("INVALID_STATUS", "Statut projet invalide", HttpStatus.BAD_REQUEST);
        }
    }

    private Domain parseDomain(String raw) {
        try {
            return Domain.valueOf(raw.trim().toUpperCase());
        } catch (Exception e) {
            throw new AppException("INVALID_DOMAIN", "Domaine projet invalide", HttpStatus.BAD_REQUEST);
        }
    }

    private void validateDateRange(LocalDate start, LocalDate end) {
        if (start != null && end != null && end.isBefore(start)) {
            throw new AppException("INVALID_DATES", "La date de fin doit être postérieure ou égale à la date de début", HttpStatus.BAD_REQUEST);
        }
    }

    private int clampProgress(Integer p) {
        if (p == null) return 0;
        return Math.max(0, Math.min(100, p));
    }

    private String trimToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private void notifyManagersOfProgressUpdate(Project project, User chef) {
        String message = String.format("Mise à jour d'avancement par %s sur %s : %d%%",
                chef.getUsername(), project.getCode(), project.getProgressPercent());

        // 1. Notifier le créateur (si c'est un PMO/MANAGER/ADMIN)
        User creator = project.getCreatedBy();
        if (creator != null && isElevated(creator.getRole())) {
            notificationService.notify(creator, Notification.Type.PROJECT_PROGRESS_UPDATED, message, project);
        }

        // 2. Notifier TOUS les managers
        List<User> managers = userRepository.findByRole(Role.MANAGER);
        for (User m : managers) {
            if (creator == null || !m.getId().equals(creator.getId())) {
                notificationService.notify(m, Notification.Type.PROJECT_PROGRESS_UPDATED, message, project);
            }
        }
    }

    private ProjectResponse toResponse(Project p) {
        List<UserSummaryResponse> members = p.getMembers().stream()
                .map(this::toSummary)
                .sorted(Comparator.comparing(UserSummaryResponse::getUsername, String.CASE_INSENSITIVE_ORDER))
                .toList();

        List<DeliverableResponse> deliverables = p.getDeliverables().stream()
                .sorted(Comparator.comparing(Deliverable::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(this::toDeliverableResponse)
                .toList();

        return ProjectResponse.builder()
                .id(p.getId())
                .code(p.getCode())
                .name(p.getName())
                .description(p.getDescription())
                .status(p.getStatus().name())
                .domain(p.getDomain() != null ? p.getDomain().name() : null)
                .progressPercent(p.getProgressPercent())
                .plannedStartDate(p.getPlannedStartDate())
                .plannedEndDate(p.getPlannedEndDate())
                .chefProjet(p.getChefProjet() != null ? toSummary(p.getChefProjet()) : null)
                .createdBy(toSummary(p.getCreatedBy()))
                .members(members)
                .deliverables(deliverables)
                .cpEditingUnlocked(p.isCpEditingUnlocked())
                .macroPlanning(p.getMacroPlanning() != null ? p.getMacroPlanning().name() : null)
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }

    private DeliverableResponse toDeliverableResponse(Deliverable d) {
        return DeliverableResponse.builder()
                .id(d.getId())
                .title(d.getTitle())
                .description(d.getDescription())
                .dueDate(d.getDueDate())
                .done(d.isDone())
                .createdAt(d.getCreatedAt())
                .documents(d.getDocuments().stream()
                        .map(doc -> DocumentResponse.builder()
                                .id(doc.getId())
                                .filename(doc.getFilename())
                                .contentType(doc.getContentType())
                                .size(doc.getSize())
                                .uploadedAt(doc.getUploadedAt())
                                .build())
                        .toList())
                .build();
    }

    private UserSummaryResponse toSummary(User u) {
        return UserSummaryResponse.builder()
                .id(u.getId())
                .username(u.getUsername())
                .email(u.getEmail())
                .role(u.getRole().name())
                .build();
    }
}
