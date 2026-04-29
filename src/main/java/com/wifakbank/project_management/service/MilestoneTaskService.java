package com.wifakbank.project_management.service;

import com.wifakbank.project_management.service.LoggingService;
import com.wifakbank.project_management.service.ActionHistoryService;
import com.wifakbank.project_management.dto.request.MilestoneRequest;
import com.wifakbank.project_management.dto.response.TaskDocumentResponse;
import com.wifakbank.project_management.repository.TaskDocumentRepository;
import com.wifakbank.project_management.dto.request.TaskRequest;
import com.wifakbank.project_management.dto.response.MilestoneResponse;
import com.wifakbank.project_management.dto.response.TaskResponse;
import com.wifakbank.project_management.dto.response.UserSummaryResponse;
import com.wifakbank.project_management.entity.*;
import com.wifakbank.project_management.exception.AppException;
import com.wifakbank.project_management.repository.MilestoneRepository;
import com.wifakbank.project_management.support.PlanningStatusMapper;
import com.wifakbank.project_management.repository.ProjectRepository;
import com.wifakbank.project_management.repository.TaskRepository;
import com.wifakbank.project_management.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MilestoneTaskService {

    private final ProjectRepository projectRepository;
    private final MilestoneRepository milestoneRepository;
    private final TaskRepository taskRepository;
    private final TaskDocumentRepository taskDocumentRepository;
    private final UserRepository userRepository;
    private final LoggingService loggingService;
    private final ActionHistoryService actionHistoryService;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<MilestoneResponse> getMilestonesByProject(Long projectId) {
        return milestoneRepository.findByProjectId(projectId).stream()
                .collect(Collectors.toMap(Milestone::getId, m -> m, (a, b) -> a, LinkedHashMap::new))
                .values()
                .stream()
                .map(this::toMilestoneResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public MilestoneResponse createMilestone(Long projectId, MilestoneRequest request) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new AppException("PROJECT_NOT_FOUND", "Projet introuvable", HttpStatus.NOT_FOUND));

        assertUniqueMilestoneTitle(project.getId(), request.getTitle(), null);
        Milestone milestone = new Milestone();
        milestone.setProject(project);
        updateMilestoneFields(milestone, request);
        
        Milestone saved = milestoneRepository.save(milestone);
        updateProjectProgress(project);
        String createMilestoneDetails = "Jalon cree : " + saved.getTitle() + " (id=" + saved.getId() + ")";
        loggingService.logAction("system", "CREATE", "MILESTONE", project.getId(), createMilestoneDetails);
        actionHistoryService.recordFromContext("CREATE", "MILESTONE", project.getId(), createMilestoneDetails);
        return toMilestoneResponse(saved);
    }

    @Transactional
    public MilestoneResponse updateMilestone(Long id, MilestoneRequest request) {
        Milestone milestone = milestoneRepository.findById(id)
                .orElseThrow(() -> new AppException("MILESTONE_NOT_FOUND", "Jalon introuvable", HttpStatus.NOT_FOUND));
        MilestoneStatus previousStatus = milestone.getStatus();

        assertMilestoneSequenceUnlocked(milestone);
        assertUniqueMilestoneTitle(milestone.getProject().getId(), request.getTitle(), milestone.getId());
        updateMilestoneFields(milestone, request);
        Milestone saved = milestoneRepository.save(milestone);
        if (previousStatus != MilestoneStatus.EN_RETARD && saved.getStatus() == MilestoneStatus.EN_RETARD) {
            notificationService.notifyDelay(saved.getProject(), saved);
        }
        updateProjectProgress(milestone.getProject());
        String milestoneAction = saved.getStatus() == MilestoneStatus.TERMINE ? "VALIDATE" : "UPDATE";
        String updateMilestoneDetails = "Jalon " + milestoneAction.toLowerCase() + " : " + saved.getTitle()
                + " | statut=" + saved.getStatus()
                + (previousStatus != saved.getStatus() ? " (ancien=" + previousStatus + ")" : "");
        loggingService.logAction("system", milestoneAction, "MILESTONE", saved.getProject().getId(), updateMilestoneDetails);
        actionHistoryService.recordFromContext(milestoneAction, "MILESTONE", saved.getProject().getId(), updateMilestoneDetails);
        return toMilestoneResponse(saved);
    }

    @Transactional
    public void deleteMilestone(Long id) {
        Milestone milestone = milestoneRepository.findById(id)
                .orElseThrow(() -> new AppException("MILESTONE_NOT_FOUND", "Jalon introuvable", HttpStatus.NOT_FOUND));
        Project project = milestone.getProject();
        String deleteMilestoneDetails = "Jalon supprime : " + milestone.getTitle() + " (id=" + milestone.getId() + ")";
        loggingService.logAction("system", "DELETE", "MILESTONE", project.getId(), deleteMilestoneDetails);
        actionHistoryService.recordFromContext("DELETE", "MILESTONE", project.getId(), deleteMilestoneDetails);
        milestoneRepository.delete(milestone);
        updateProjectProgress(project);
    }

    @Transactional
    public TaskResponse createTask(Long milestoneId, TaskRequest request) {
        Milestone milestone = milestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new AppException("MILESTONE_NOT_FOUND", "Jalon introuvable", HttpStatus.NOT_FOUND));

        assertMilestoneSequenceUnlocked(milestone);
        Task task = new Task();
        task.setMilestone(milestone);
        task.setDependsOn(new HashSet<>());
        updateTaskFields(task, request);

        Task saved = taskRepository.save(task);
        notifyTaskAssignment(saved, null);
        updateMilestoneProgress(milestone);
        String createTaskDetails = "Tache creee : " + saved.getTitle() + " (id=" + saved.getId()
                + ", jalon=" + milestone.getTitle() + ")";
        loggingService.logAction("system", "CREATE", "TASK", milestone.getProject().getId(), createTaskDetails);
        actionHistoryService.recordFromContext("CREATE", "TASK", milestone.getProject().getId(), createTaskDetails);
        return toTaskResponse(saved);
    }

    @Transactional
    public TaskResponse updateTask(Long id, TaskRequest request) {
        Task task = taskRepository.findWithPlanningContextById(id)
                .orElseThrow(() -> new AppException("TASK_NOT_FOUND", "Tâche introuvable", HttpStatus.NOT_FOUND));
        Long previousAssigneeId = task.getAssignee() != null ? task.getAssignee().getId() : null;

        assertMilestoneSequenceUnlocked(task.getMilestone());
        updateTaskFields(task, request);
        Task saved = taskRepository.save(task);
        notifyTaskAssignment(saved, previousAssigneeId);
        updateMilestoneProgress(task.getMilestone());
        String taskAction = "DONE".equalsIgnoreCase(saved.getStatus() != null ? saved.getStatus().name() : "") ? "COMPLETE" : "UPDATE";
        String updateTaskDetails = "Tache " + taskAction.toLowerCase() + " : " + saved.getTitle()
                + " | statut=" + saved.getStatus()
                + " | avancement=" + saved.getProgressPercent() + "%";
        loggingService.logAction("system", taskAction, "TASK", saved.getMilestone().getProject().getId(), updateTaskDetails);
        actionHistoryService.recordFromContext(taskAction, "TASK", saved.getMilestone().getProject().getId(), updateTaskDetails);
        return toTaskResponse(saved);
    }

    @Transactional
    public void deleteTask(Long id) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new AppException("TASK_NOT_FOUND", "Tâche introuvable", HttpStatus.NOT_FOUND));
        Milestone milestone = task.getMilestone();
        assertMilestoneSequenceUnlocked(milestone);
        String deleteTaskDetails = "Tache supprimee : " + task.getTitle() + " (id=" + task.getId()
                + ", jalon=" + milestone.getTitle() + ")";
        loggingService.logAction("system", "DELETE", "TASK", milestone.getProject().getId(), deleteTaskDetails);
        actionHistoryService.recordFromContext("DELETE", "TASK", milestone.getProject().getId(), deleteTaskDetails);
        taskRepository.delete(task);
        updateMilestoneProgress(milestone);
    }

    // ── Rollup Logic ─────────────────────────────────────────────

    private void updateMilestoneProgress(Milestone milestone) {
        List<Task> tasks = taskRepository.findByMilestoneId(milestone.getId());
        if (tasks.isEmpty()) {
            milestone.setProgressPercent(0);
        } else {
            double average = tasks.stream()
                    .mapToInt(Task::getProgressPercent)
                    .average()
                    .orElse(0.0);
            milestone.setProgressPercent((int) Math.round(average));
        }

        // Strict Completion Logic: All tasks must be DONE
        boolean allTasksDone = !tasks.isEmpty() && tasks.stream().allMatch(t -> t.getStatus() == TaskStatus.DONE);

        if (allTasksDone) {
            milestone.setStatus(MilestoneStatus.TERMINE);
            milestone.setProgressPercent(100);
            if (milestone.getActualEndDate() == null) {
                milestone.setActualEndDate(LocalDate.now());
            }
        } else {
            // Reopening logic: if milestone was DONE but now some tasks are incomplete
            if (milestone.getStatus() == MilestoneStatus.TERMINE) {
                milestone.setStatus(MilestoneStatus.EN_COURS);
                milestone.setActualEndDate(null);
            }
            
            if (milestone.getProgressPercent() > 0 && milestone.getStatus() == MilestoneStatus.NON_DEMARRE) {
                milestone.setStatus(MilestoneStatus.EN_COURS);
            } else if (milestone.getProgressPercent() == 0 && milestone.getStatus() != MilestoneStatus.BLOQUE && milestone.getStatus() != MilestoneStatus.EN_RETARD) {
                milestone.setStatus(MilestoneStatus.NON_DEMARRE);
            }
        }

        // Automatic delay — never override completed or blocked
        if (milestone.getStatus() != MilestoneStatus.TERMINE
                && milestone.getStatus() != MilestoneStatus.BLOQUE
                && milestone.getDeadline() != null
                && milestone.getDeadline().isBefore(LocalDate.now())) {
            milestone.setStatus(MilestoneStatus.EN_RETARD);
        }

        milestoneRepository.save(milestone);
        updateProjectProgress(milestone.getProject());
    }

    private void updateProjectProgress(Project project) {
        ProjectStatus previousStatus = project.getStatus();
        List<Milestone> milestones = milestoneRepository.findByProjectId(project.getId());
        if (milestones.isEmpty()) {
            project.setProgressPercent(0);
        } else {
            double avg = milestones.stream().mapToInt(Milestone::getProgressPercent).average().orElse(0.0);
            project.setProgressPercent((int) avg);
        }

        // Project Status Chain
        if (project.getProgressPercent() == 100) {
            boolean allDone = milestones.stream().allMatch(m -> m.getStatus() == MilestoneStatus.TERMINE);
            if (allDone) {
                project.setStatus(ProjectStatus.TERMINE);
                if (project.getActualEndDate() == null) {
                    project.setActualEndDate(LocalDate.now());
                }
            } else if (project.getStatus() == ProjectStatus.TERMINE) {
                project.setStatus(ProjectStatus.EN_COURS);
                project.setActualEndDate(null);
            }
        } else {
            if (project.getStatus() == ProjectStatus.TERMINE) {
                project.setStatus(ProjectStatus.EN_COURS);
                project.setActualEndDate(null);
            }
            if (project.getProgressPercent() > 0 && project.getStatus() == ProjectStatus.BROUILLON) {
                project.setStatus(ProjectStatus.EN_COURS);
            }
        }

        projectRepository.save(project);
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

    private void notifyTaskAssignment(Task task, Long previousAssigneeId) {
        if (task == null || task.getAssignee() == null || task.getMilestone() == null || task.getMilestone().getProject() == null) {
            return;
        }
        Long currentId = task.getAssignee().getId();
        if (currentId == null || java.util.Objects.equals(currentId, previousAssigneeId)) {
            return;
        }
        notificationService.notifyParticipants(
                task.getMilestone().getProject(),
                List.of(task.getAssignee()),
                "TASK",
                task.getTitle()
        );
    }

    // ── Helpers ──────────────────────────────────────────────────

    private void updateMilestoneFields(Milestone milestone, MilestoneRequest request) {
        if (request.getTitle() != null) milestone.setTitle(request.getTitle().trim());
        if (request.getDescription() != null) milestone.setDescription(request.getDescription());
        if (request.getDeadline() != null) milestone.setDeadline(request.getDeadline());
        if (request.getActualEndDate() != null) milestone.setActualEndDate(request.getActualEndDate());
        
        if (request.getStatus() != null) {
            MilestoneStatus newStatus;
            try {
                newStatus = PlanningStatusMapper.parseMilestoneStatus(request.getStatus());
            } catch (IllegalArgumentException ex) {
                throw new AppException("INVALID_MILESTONE_STATUS", "Statut jalon invalide", HttpStatus.BAD_REQUEST);
            }
            // Mandatory Justification Check
            if ((newStatus == MilestoneStatus.BLOQUE || newStatus == MilestoneStatus.EN_RETARD) 
                && (request.getJustification() == null || request.getJustification().isBlank())
                && milestone.getJustification() == null) {
                throw new AppException("JUSTIFICATION_REQUIRED", "Une justification est obligatoire pour cet état", HttpStatus.BAD_REQUEST);
            }
            if (newStatus == MilestoneStatus.TERMINE) {
                boolean allTasksDone = milestone.getTasks() != null
                        && !milestone.getTasks().isEmpty()
                        && milestone.getTasks().stream().allMatch(t -> t.getStatus() == TaskStatus.DONE);
                if (!allTasksDone) {
                    throw new AppException("MILESTONE_INCOMPLETE", "Toutes les tâches du jalon doivent être terminées", HttpStatus.BAD_REQUEST);
                }
            }
            milestone.setStatus(newStatus);
        }
        
        if (request.getJustification() != null) milestone.setJustification(request.getJustification());
        if (request.getActionPlan() != null) milestone.setActionPlan(request.getActionPlan());
    }

    private void updateTaskFields(Task task, TaskRequest request) {
        if (request.getTitle() != null) task.setTitle(request.getTitle());
        if (request.getDescription() != null) task.setDescription(request.getDescription());
        if (request.getStartDate() != null) task.setStartDate(request.getStartDate());
        if (request.getEndDate() != null) task.setEndDate(request.getEndDate());
        if (request.getActualEndDate() != null) task.setActualEndDate(request.getActualEndDate());

        if (task.getStartDate() != null && task.getEndDate() != null && task.getEndDate().isBefore(task.getStartDate())) {
            throw new AppException("INVALID_TASK_DATES", "La date de fin prévue doit être postérieure ou égale à la date de début", HttpStatus.BAD_REQUEST);
        }
        
        if (request.getProgressPercent() != null) {
            int progress = Math.max(0, Math.min(100, request.getProgressPercent()));
            task.setProgressPercent(progress);
            
            // Automatic completion logic if 100%
            if (progress == 100) {
                task.setStatus(TaskStatus.DONE);
                if (task.getActualEndDate() == null) {
                    task.setActualEndDate(LocalDate.now());
                }
            } else if (task.getStatus() == TaskStatus.DONE) {
                task.setStatus(TaskStatus.IN_PROGRESS);
                task.setActualEndDate(null);
            }
        }
        
        if (request.getStatus() != null) {
            TaskStatus newStatus;
            try {
                newStatus = PlanningStatusMapper.parseTaskStatus(request.getStatus());
            } catch (IllegalArgumentException ex) {
                throw new AppException("INVALID_TASK_STATUS", "Statut tâche invalide", HttpStatus.BAD_REQUEST);
            }
            // Mandatory Justification Check for Tasks
            if ((newStatus == TaskStatus.BLOQUE || newStatus == TaskStatus.EN_RETARD) 
                && (request.getJustification() == null || request.getJustification().isBlank())
                && task.getJustification() == null) {
                throw new AppException("JUSTIFICATION_REQUIRED", "Une justification est obligatoire pour cet état", HttpStatus.BAD_REQUEST);
            }
            
            if (newStatus == TaskStatus.DONE) {
                task.setStatus(TaskStatus.DONE);
                task.setProgressPercent(100);
                if (task.getActualEndDate() == null) {
                    task.setActualEndDate(LocalDate.now());
                }
            } else if (newStatus == TaskStatus.NOT_STARTED) {
                task.setStatus(TaskStatus.NOT_STARTED);
                task.setProgressPercent(0);
                task.setActualEndDate(null);
            } else {
                task.setStatus(newStatus);
            }
        }
        
        if (request.getJustification() != null) task.setJustification(request.getJustification());
        
        if (request.getPriority() != null) {
            try {
                task.setPriority(TaskPriority.valueOf(request.getPriority().trim().toUpperCase()));
            } catch (IllegalArgumentException ex) {
                throw new AppException("INVALID_TASK_PRIORITY", "Priorité tâche invalide", HttpStatus.BAD_REQUEST);
            }
        }

        if (request.getAssigneeId() != null) {
            User assignee = userRepository.findById(request.getAssigneeId())
                    .orElseThrow(() -> new AppException("USER_NOT_FOUND", "Assigné introuvable", HttpStatus.BAD_REQUEST));
            task.setAssignee(assignee);
        }

        if (request.getDependencyTaskIds() != null) {
            if (task.getDependsOn() == null) {
                task.setDependsOn(new HashSet<>());
            }
            task.getDependsOn().clear();
            for (Long depId : request.getDependencyTaskIds()) {
                if (depId == null || depId.equals(task.getId())) {
                    continue;
                }
                Task dep = taskRepository.findById(depId)
                        .orElseThrow(() -> new AppException("TASK_NOT_FOUND", "Tâche de dépendance introuvable", HttpStatus.BAD_REQUEST));
                assertDependencySameMilestone(task, dep);
                task.getDependsOn().add(dep);
            }
            syncLegacyDependencyFromSet(task);
        } else if (request.getDependencyTaskId() != null) {
            Task dep = taskRepository.findById(request.getDependencyTaskId())
                    .orElseThrow(() -> new AppException("TASK_NOT_FOUND", "Tâche de dépendance introuvable", HttpStatus.BAD_REQUEST));
            assertDependencySameMilestone(task, dep);
            if (task.getDependsOn() == null) {
                task.setDependsOn(new HashSet<>());
            }
            task.getDependsOn().clear();
            task.getDependsOn().add(dep);
            task.setDependencyTask(dep);
        }

        if (request.getDeliverableUrl() != null) {
            String url = request.getDeliverableUrl().trim();
            task.setDeliverableUrl(url.isEmpty() ? null : url);
        }
        if (request.getDeliverableLabel() != null) {
            String label = request.getDeliverableLabel().trim();
            task.setDeliverableLabel(label.isEmpty() ? null : label);
        }
    }

    private void syncLegacyDependencyFromSet(Task task) {
        if (task.getDependsOn() == null || task.getDependsOn().isEmpty()) {
            task.setDependencyTask(null);
        } else {
            task.setDependencyTask(task.getDependsOn().iterator().next());
        }
    }

    private void assertDependencySameMilestone(Task task, Task dependency) {
        if (task.getMilestone() == null || dependency.getMilestone() == null) {
            return;
        }
        if (!task.getMilestone().getId().equals(dependency.getMilestone().getId())) {
            throw new AppException(
                    "INVALID_TASK_DEPENDENCY",
                    "Les dépendances doivent être des tâches du même jalon",
                    HttpStatus.BAD_REQUEST
            );
        }
    }

    private MilestoneResponse toMilestoneResponse(Milestone m) {
        return MilestoneResponse.builder()
                .id(m.getId())
                .title(m.getTitle())
                .description(m.getDescription())
                .deadline(m.getDeadline())
                .actualEndDate(m.getActualEndDate())
                .progressPercent(m.getProgressPercent())
                .status(m.getStatus().name())
                .justification(m.getJustification())
                .actionPlan(m.getActionPlan())
                .tasks(taskRepository.findByMilestoneId(m.getId()).stream()
                        .map(this::toTaskResponse).collect(Collectors.toList()))
                .build();
    }

    private TaskResponse toTaskResponse(Task t) {
        List<TaskDocumentResponse> docs = taskDocumentRepository.findByTaskIdOrderByUploadedAtDesc(t.getId())
                .stream()
                .map(d -> TaskDocumentResponse.builder()
                        .id(d.getId())
                        .taskId(t.getId())
                        .filename(d.getFilename())
                        .contentType(d.getContentType())
                        .size(d.getSize())
                        .uploadedAt(d.getUploadedAt())
                        .downloadUrl("/api/task-documents/" + d.getId() + "/download")
                        .build())
                .toList();

        return TaskResponse.builder()
                .id(t.getId())
                .title(t.getTitle())
                .description(t.getDescription())
                .startDate(t.getStartDate())
                .endDate(t.getEndDate())
                .status(resolveStatus(t).name())
                .progressPercent(t.getProgressPercent())
                .assignee(t.getAssignee() != null ? toSummary(t.getAssignee()) : null)
                .priority(t.getPriority() != null ? t.getPriority().name() : null)
                .dependencyTaskId(t.getDependencyTask() != null ? t.getDependencyTask().getId() : null)
                .dependencyTaskIds(dependencyIds(t))
                .deliverableUrl(t.getDeliverableUrl())
                .deliverableLabel(t.getDeliverableLabel())
                .justification(t.getJustification())
                .taskDocuments(docs)
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

    private TaskStatus resolveStatus(Task task) {
        if (task.getStatus() != null) {
            return task.getStatus();
        }
        return resolveStatusFromProgress(task.getProgressPercent());
    }

    private TaskStatus resolveStatusFromProgress(int progress) {
        if (progress >= 100) {
            return TaskStatus.DONE;
        }
        if (progress <= 0) {
            return TaskStatus.NOT_STARTED;
        }
        return TaskStatus.IN_PROGRESS;
    }

    private UserSummaryResponse toSummary(User u) {
        return UserSummaryResponse.builder()
                .id(u.getId())
                .username(u.getUsername())
                .email(u.getEmail())
                .role(u.getRole().name())
                .build();
    }

    private void assertMilestoneSequenceUnlocked(Milestone milestone) {
        List<Milestone> orderedMilestones = milestoneRepository.findByProjectId(milestone.getProject().getId()).stream()
                .sorted(
                        Comparator
                                .comparing(Milestone::getDeadline, Comparator.nullsLast(Comparator.naturalOrder()))
                                .thenComparing(Milestone::getId, Comparator.nullsLast(Comparator.naturalOrder()))
                )
                .toList();

        int currentIndex = -1;
        for (int i = 0; i < orderedMilestones.size(); i++) {
            if (orderedMilestones.get(i).getId().equals(milestone.getId())) {
                currentIndex = i;
                break;
            }
        }
        if (currentIndex <= 0) {
            return;
        }

        Milestone previousMilestone = orderedMilestones.get(currentIndex - 1);
        if (previousMilestone.getStatus() != MilestoneStatus.TERMINE) {
            throw new AppException(
                    "MILESTONE_SEQUENCE_LOCKED",
                    "Le jalon précédent doit être terminé avant de modifier ce jalon",
                    HttpStatus.BAD_REQUEST
            );
        }
    }

    private void assertUniqueMilestoneTitle(Long projectId, String title, Long currentMilestoneId) {
        String normalized = title == null ? "" : title.trim();
        if (normalized.isEmpty()) {
            return;
        }

        boolean exists = currentMilestoneId == null
                ? milestoneRepository.existsByProjectIdAndTitleIgnoreCase(projectId, normalized)
                : milestoneRepository.existsByProjectIdAndTitleIgnoreCaseAndIdNot(projectId, normalized, currentMilestoneId);

        if (exists) {
            throw new AppException(
                    "MILESTONE_TITLE_EXISTS",
                    "Un jalon avec ce nom existe déjà dans ce projet",
                    HttpStatus.CONFLICT
            );
        }
    }
}
