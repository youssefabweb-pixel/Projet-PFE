package com.wifakbank.project_management.service;

import com.wifakbank.project_management.dto.request.MilestonePlanningStatusRequest;
import com.wifakbank.project_management.dto.request.MilestoneRequest;
import com.wifakbank.project_management.dto.request.PlanningJustificationRequest;
import com.wifakbank.project_management.dto.request.TaskRequest;
import com.wifakbank.project_management.dto.response.MilestoneProgressSummaryResponse;
import com.wifakbank.project_management.dto.response.PlanningMilestoneResponse;
import com.wifakbank.project_management.dto.response.PlanningProgressSummaryResponse;
import com.wifakbank.project_management.dto.response.PlanningProjectResponse;
import com.wifakbank.project_management.dto.response.PlanningTaskResponse;
import com.wifakbank.project_management.dto.response.TaskDocumentResponse;
import com.wifakbank.project_management.dto.response.UserSummaryResponse;
import com.wifakbank.project_management.repository.TaskDocumentRepository;
import com.wifakbank.project_management.entity.Milestone;
import com.wifakbank.project_management.entity.MilestoneStatus;
import com.wifakbank.project_management.entity.Project;
import com.wifakbank.project_management.entity.ProjectStatus;
import com.wifakbank.project_management.entity.Role;
import com.wifakbank.project_management.entity.Task;
import com.wifakbank.project_management.entity.TaskPriority;
import com.wifakbank.project_management.entity.TaskStatus;
import com.wifakbank.project_management.entity.User;
import com.wifakbank.project_management.exception.AppException;
import com.wifakbank.project_management.repository.MilestoneRepository;
import com.wifakbank.project_management.repository.ProjectRepository;
import com.wifakbank.project_management.repository.TaskRepository;
import com.wifakbank.project_management.repository.UserRepository;
import com.wifakbank.project_management.support.PlanningStatusMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PlanningProgressService {

    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final TaskDocumentRepository taskDocumentRepository;
    private final MilestoneRepository milestoneRepository;
    private final UserRepository userRepository;
    private final MilestoneTaskService milestoneTaskService;
    private final PlanningProgressCalculationService calculationService;

    @Transactional(readOnly = true)
    public List<PlanningProjectResponse> getProjectsForPlanning(String username) {
        User actor = loadUser(username);
        LocalDate today = LocalDate.now();
        return resolveVisibleProjects(actor).stream()
                .map(p -> toProjectResponse(p, today))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PlanningProjectResponse> searchProjectsByName(String name, String username) {
        User actor = loadUser(username);
        LocalDate today = LocalDate.now();
        String query = name == null ? "" : name.trim();
        if (query.isEmpty()) {
            return getProjectsForPlanning(username);
        }
        String q = query.toLowerCase();
        return resolveVisibleProjects(actor).stream()
                .filter(project -> matchesSearch(project, q))
                .map(p -> toProjectResponse(p, today))
                .toList();
    }

    @Transactional(readOnly = true)
    public PlanningProgressSummaryResponse getProjectProgress(Long projectId, String username) {
        User actor = loadUser(username);
        Project project = projectRepository.findByIdWithPlanningTree(projectId)
                .orElseThrow(() -> new AppException("PROJECT_NOT_FOUND", "Projet introuvable", HttpStatus.NOT_FOUND));
        assertProjectAccessible(project, actor);
        LocalDate today = LocalDate.now();
        return buildProjectProgressSummary(project, today);
    }

    @Transactional(readOnly = true)
    public MilestoneProgressSummaryResponse getMilestoneProgress(Long milestoneId, String username) {
        User actor = loadUser(username);
        Milestone milestone = milestoneRepository.findByIdWithProject(milestoneId)
                .orElseThrow(() -> new AppException("MILESTONE_NOT_FOUND", "Jalon introuvable", HttpStatus.NOT_FOUND));
        assertProjectAccessible(milestone.getProject(), actor);
        List<Task> tasks = taskRepository.findByMilestoneId(milestoneId);
        LocalDate today = LocalDate.now();
        return buildMilestoneProgressSummary(milestone, tasks, today);
    }

    @Transactional
    public PlanningTaskResponse updateTaskProgress(Long taskId, int progressPercent, String justification, String username) {
        User actor = loadUser(username);
        Task task = taskRepository.findWithPlanningContextById(taskId)
                .orElseThrow(() -> new AppException("TASK_NOT_FOUND", "Tâche introuvable", HttpStatus.NOT_FOUND));
        assertProjectAccessible(task.getMilestone().getProject(), actor);

        TaskRequest request = new TaskRequest();
        request.setTitle(task.getTitle());
        request.setProgressPercent(progressPercent);
        if (justification != null && !justification.isBlank()) {
            request.setJustification(justification.trim());
        }
        milestoneTaskService.updateTask(taskId, request);

        Task saved = taskRepository.findWithPlanningContextById(taskId)
                .orElseThrow(() -> new AppException("TASK_NOT_FOUND", "Tâche introuvable", HttpStatus.NOT_FOUND));
        return buildPlanningTaskResponse(saved, LocalDate.now());
    }

    @Transactional
    public PlanningTaskResponse updateTaskStatus(Long taskId, TaskStatus status) {
        Task task = taskRepository.findWithPlanningContextById(taskId)
                .orElseThrow(() -> new AppException("TASK_NOT_FOUND", "Tâche introuvable", HttpStatus.NOT_FOUND));
        TaskRequest request = new TaskRequest();
        request.setTitle(task.getTitle());
        request.setStatus(status.name());
        milestoneTaskService.updateTask(taskId, request);
        Task saved = taskRepository.findWithPlanningContextById(taskId)
                .orElseThrow(() -> new AppException("TASK_NOT_FOUND", "Tâche introuvable", HttpStatus.NOT_FOUND));
        return buildPlanningTaskResponse(saved, LocalDate.now());
    }

    @Transactional
    public PlanningMilestoneResponse updateMilestonePlanningStatus(
            Long milestoneId,
            MilestonePlanningStatusRequest body,
            String username) {
        User actor = loadUser(username);
        Milestone milestone = milestoneRepository.findByIdWithProject(milestoneId)
                .orElseThrow(() -> new AppException("MILESTONE_NOT_FOUND", "Jalon introuvable", HttpStatus.NOT_FOUND));
        assertProjectAccessible(milestone.getProject(), actor);

        MilestoneStatus target;
        try {
            target = PlanningStatusMapper.parseMilestoneStatus(body.getStatus());
        } catch (IllegalArgumentException ex) {
            throw new AppException("INVALID_MILESTONE_STATUS", "Statut jalon invalide", HttpStatus.BAD_REQUEST);
        }

        MilestoneRequest request = new MilestoneRequest();
        request.setTitle(milestone.getTitle());
        request.setDescription(milestone.getDescription());
        request.setDeadline(milestone.getDeadline());
        request.setActualEndDate(milestone.getActualEndDate());
        request.setStatus(target.name());
        request.setJustification(body.getJustification());
        request.setActionPlan(milestone.getActionPlan());
        milestoneTaskService.updateMilestone(milestoneId, request);

        Milestone saved = milestoneRepository.findByIdWithProject(milestoneId)
                .orElseThrow(() -> new AppException("MILESTONE_NOT_FOUND", "Jalon introuvable", HttpStatus.NOT_FOUND));
        List<Task> tasks = taskRepository.findByMilestoneId(milestoneId);
        return toMilestoneResponse(saved, tasks, LocalDate.now());
    }

    @Transactional
    public PlanningTaskResponse addTaskJustification(Long taskId, PlanningJustificationRequest body, String username) {
        User actor = loadUser(username);
        Task task = taskRepository.findWithPlanningContextById(taskId)
                .orElseThrow(() -> new AppException("TASK_NOT_FOUND", "Tâche introuvable", HttpStatus.NOT_FOUND));
        assertProjectAccessible(task.getMilestone().getProject(), actor);

        TaskRequest request = new TaskRequest();
        request.setTitle(task.getTitle());
        request.setJustification(body.getJustification().trim());
        milestoneTaskService.updateTask(taskId, request);

        Task saved = taskRepository.findWithPlanningContextById(taskId)
                .orElseThrow(() -> new AppException("TASK_NOT_FOUND", "Tâche introuvable", HttpStatus.NOT_FOUND));
        return buildPlanningTaskResponse(saved, LocalDate.now());
    }

    @Transactional
    public PlanningMilestoneResponse addMilestoneJustification(Long milestoneId, PlanningJustificationRequest body, String username) {
        User actor = loadUser(username);
        Milestone milestone = milestoneRepository.findByIdWithProject(milestoneId)
                .orElseThrow(() -> new AppException("MILESTONE_NOT_FOUND", "Jalon introuvable", HttpStatus.NOT_FOUND));
        assertProjectAccessible(milestone.getProject(), actor);

        MilestoneRequest request = new MilestoneRequest();
        request.setTitle(milestone.getTitle());
        request.setDescription(milestone.getDescription());
        request.setDeadline(milestone.getDeadline());
        request.setActualEndDate(milestone.getActualEndDate());
        request.setStatus(milestone.getStatus() != null ? milestone.getStatus().name() : null);
        request.setJustification(body.getJustification().trim());
        request.setActionPlan(milestone.getActionPlan());
        milestoneTaskService.updateMilestone(milestoneId, request);

        Milestone saved = milestoneRepository.findByIdWithProject(milestoneId)
                .orElseThrow(() -> new AppException("MILESTONE_NOT_FOUND", "Jalon introuvable", HttpStatus.NOT_FOUND));
        List<Task> tasks = taskRepository.findByMilestoneId(milestoneId);
        return toMilestoneResponse(saved, tasks, LocalDate.now());
    }

    private PlanningProgressSummaryResponse buildProjectProgressSummary(Project project, LocalDate today) {
        List<Milestone> milestones = distinctMilestonesOrdered(project);
        int progress = milestones.isEmpty()
                ? 0
                : (int) Math.round(
                milestones.stream()
                        .mapToInt(m -> calculationService.milestoneProgressPercent(tasksOf(m)))
                        .average()
                        .orElse(0.0));
        boolean completed = !milestones.isEmpty()
                && milestones.stream().allMatch(m -> calculationService.allTasksCompleted(tasksOf(m)));

        int delayed = 0;
        int blocked = 0;
        for (Milestone m : milestones) {
            for (Task t : tasksOf(m)) {
                TaskStatus eff = calculationService.effectiveTaskStatus(t, today);
                if (eff == TaskStatus.EN_RETARD) {
                    delayed++;
                }
                if (eff == TaskStatus.BLOQUE) {
                    blocked++;
                }
            }
        }

        List<MilestoneProgressSummaryResponse> ms = milestones.stream()
                .sorted(Comparator.comparing(Milestone::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(m -> buildMilestoneProgressSummary(m, taskRepository.findByMilestoneId(m.getId()), today))
                .toList();

        return PlanningProgressSummaryResponse.builder()
                .projectId(project.getId())
                .code(project.getCode())
                .name(project.getName())
                .status(project.getStatus() != null ? project.getStatus().name() : ProjectStatus.BROUILLON.name())
                .progressPercent(progress)
                .completed(completed)
                .milestoneCount(milestones.size())
                .delayedTaskCount(delayed)
                .blockedTaskCount(blocked)
                .milestones(ms)
                .build();
    }

    private MilestoneProgressSummaryResponse buildMilestoneProgressSummary(Milestone milestone, List<Task> tasks, LocalDate today) {
        int progress = calculationService.milestoneProgressPercent(tasks);
        boolean completed = calculationService.allTasksCompleted(tasks);
        MilestoneStatus effective = calculationService.effectiveMilestoneStatus(milestone, tasks, today);
        long delayDays = calculationService.milestoneDelayDays(milestone, effective, today);
        long doneCount = tasks.stream().filter(t -> t.getStatus() == TaskStatus.DONE).count();

        return MilestoneProgressSummaryResponse.builder()
                .milestoneId(milestone.getId())
                .name(milestone.getTitle())
                .status(PlanningStatusMapper.milestoneToApi(effective))
                .progressPercent(progress)
                .completed(completed)
                .deadline(milestone.getDeadline())
                .delayDays(delayDays)
                .taskCount(tasks.size())
                .completedTaskCount((int) doneCount)
                .build();
    }

    private List<Task> tasksOf(Milestone m) {
        return m.getTasks() == null ? List.of() : m.getTasks();
    }

    /**
     * Évite les doublons de jalons renvoyés par Hibernate lorsque {@code members} et {@code milestones}
     * sont chargés dans le même {@link org.springframework.data.jpa.repository.EntityGraph} :
     * la jointure SQL produit un produit cartésien (chaque jalon répété une fois par membre).
     */
    private List<Milestone> distinctMilestonesOrdered(Project project) {
        List<Milestone> raw = project.getMilestones();
        if (raw == null || raw.isEmpty()) {
            return List.of();
        }
        return raw.stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(
                        Milestone::getId,
                        Function.identity(),
                        (a, b) -> a,
                        LinkedHashMap::new))
                .values()
                .stream()
                .sorted(Comparator.comparing(Milestone::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    private PlanningProjectResponse toProjectResponse(Project project, LocalDate today) {
        List<Milestone> milestones = distinctMilestonesOrdered(project);
        int projectProgress = milestones.isEmpty()
                ? 0
                : (int) Math.round(
                milestones.stream()
                        .mapToInt(m -> calculationService.milestoneProgressPercent(tasksOf(m)))
                        .average()
                        .orElse(0.0));
        boolean allMilestonesDone = !milestones.isEmpty()
                && milestones.stream().allMatch(m -> calculationService.allTasksCompleted(tasksOf(m)));

        return PlanningProjectResponse.builder()
                .id(project.getId())
                .code(project.getCode())
                .name(project.getName())
                .status(project.getStatus() != null ? project.getStatus().name() : ProjectStatus.BROUILLON.name())
                .progress(projectProgress)
                .completed(allMilestonesDone)
                .plannedStartDate(project.getPlannedStartDate())
                .plannedEndDate(project.getPlannedEndDate())
                .chefProjet(project.getChefProjet() != null ? UserSummaryResponse.builder()
                        .id(project.getChefProjet().getId())
                        .username(project.getChefProjet().getUsername())
                        .email(project.getChefProjet().getEmail())
                        .role(project.getChefProjet().getRole().name())
                        .build() : null)
                .milestones(milestones.stream()
                        .sorted(Comparator.comparing(Milestone::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                        .map(m -> toMilestoneResponse(m, tasksOf(m), today))
                        .toList())
                .macroPlanning(project.getMacroPlanning() != null ? project.getMacroPlanning().name() : null)
                .build();
    }

    private PlanningMilestoneResponse toMilestoneResponse(Milestone milestone, List<Task> tasks, LocalDate today) {
        int progress = calculationService.milestoneProgressPercent(tasks);
        boolean completed = calculationService.allTasksCompleted(tasks);
        MilestoneStatus effective = calculationService.effectiveMilestoneStatus(milestone, tasks, today);
        long delayDays = calculationService.milestoneDelayDays(milestone, effective, today);

        return PlanningMilestoneResponse.builder()
                .id(milestone.getId())
                .name(milestone.getTitle())
                .description(milestone.getDescription())
                .status(PlanningStatusMapper.milestoneToApi(effective))
                .progress(progress)
                .completed(completed)
                .deadline(milestone.getDeadline())
                .justification(milestone.getJustification())
                .delayDays(delayDays)
                .tasks(tasks.stream()
                        .sorted(Comparator.comparing(Task::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                        .map(t -> buildPlanningTaskResponse(t, today))
                        .toList())
                .build();
    }

    private PlanningTaskResponse buildPlanningTaskResponse(Task task, LocalDate today) {
        TaskStatus effective = calculationService.effectiveTaskStatus(task, today);
        long delayDays = calculationService.taskDelayDays(task, today);

        List<TaskDocumentResponse> docs = taskDocumentRepository.findByTaskIdOrderByUploadedAtDesc(task.getId())
                .stream()
                .map(d -> TaskDocumentResponse.builder()
                        .id(d.getId())
                        .taskId(task.getId())
                        .filename(d.getFilename())
                        .contentType(d.getContentType())
                        .size(d.getSize())
                        .uploadedAt(d.getUploadedAt())
                        .downloadUrl("/api/task-documents/" + d.getId() + "/download")
                        .build())
                .toList();

        return PlanningTaskResponse.builder()
                .id(task.getId())
                .name(task.getTitle())
                .dependsOnTaskIds(dependencyIds(task))
                .status(PlanningStatusMapper.taskToApi(effective))
                .priority(task.getPriority() != null ? task.getPriority().name() : TaskPriority.MOYENNE.name())
                .progress(task.getProgressPercent())
                .description(task.getDescription())
                .startDate(task.getStartDate())
                .deadline(task.getEndDate())
                .endDate(task.getEndDate())
                .justification(task.getJustification())
                .delayDays(delayDays)
                .actualEndDate(task.getActualEndDate())
                .deliverableUrl(task.getDeliverableUrl())
                .deliverableLabel(task.getDeliverableLabel())
                .taskDocuments(docs)
                .assignee(task.getAssignee() != null ? UserSummaryResponse.builder()
                        .id(task.getAssignee().getId())
                        .username(task.getAssignee().getUsername())
                        .email(task.getAssignee().getEmail())
                        .role(task.getAssignee().getRole().name())
                        .build() : null)
                .build();
    }

    private List<Long> dependencyIds(Task t) {
        if (t.getDependsOn() != null && !t.getDependsOn().isEmpty()) {
            return t.getDependsOn().stream().map(Task::getId).sorted().toList();
        }
        if (t.getDependencyTask() != null) {
            return List.of(t.getDependencyTask().getId());
        }
        return List.of();
    }

    private User loadUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException("USER_NOT_FOUND", "Utilisateur introuvable", HttpStatus.UNAUTHORIZED));
    }

    private List<Project> resolveVisibleProjects(User actor) {
        if (actor.getRole() == Role.MANAGER || actor.getRole() == Role.ADMINISTRATEUR) {
            return projectRepository.findAllWithPlanning();
        }
        if (projectRepository.existsByChefProjet_Id(actor.getId())) {
            return projectRepository.findAllWithPlanning().stream()
                    .filter(project -> project.getChefProjet() != null && actor.getId().equals(project.getChefProjet().getId()))
                    .toList();
        }
        Long userId = actor.getId();
        return projectRepository.findAllWithPlanning().stream()
                .filter(project -> isVisibleToUser(project, userId))
                .toList();
    }

    private void assertProjectAccessible(Project project, User actor) {
        if (actor.getRole() == Role.MANAGER || actor.getRole() == Role.ADMINISTRATEUR) {
            return;
        }
        if (project.getChefProjet() != null && actor.getId().equals(project.getChefProjet().getId())) {
            return;
        }
        if (isVisibleToUser(project, actor.getId())) {
            return;
        }
        throw new AppException("FORBIDDEN", "Accès refusé à ce projet", HttpStatus.FORBIDDEN);
    }

    private boolean isVisibleToUser(Project project, Long userId) {
        if (project.getChefProjet() != null && userId.equals(project.getChefProjet().getId())) {
            return true;
        }
        return project.getMembers() != null
                && project.getMembers().stream().anyMatch(user -> userId.equals(user.getId()));
    }

    private boolean matchesSearch(Project project, String queryLower) {
        if (project.getName() != null && project.getName().toLowerCase().contains(queryLower)) {
            return true;
        }
        if (project.getCode() != null && project.getCode().toLowerCase().contains(queryLower)) {
            return true;
        }
        return project.getChefProjet() != null
                && project.getChefProjet().getUsername() != null
                && project.getChefProjet().getUsername().toLowerCase().contains(queryLower);
    }
}
