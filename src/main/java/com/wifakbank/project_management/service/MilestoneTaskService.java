package com.wifakbank.project_management.service;

import com.wifakbank.project_management.dto.request.MilestoneRequest;
import com.wifakbank.project_management.dto.request.TaskRequest;
import com.wifakbank.project_management.dto.response.MilestoneResponse;
import com.wifakbank.project_management.dto.response.TaskResponse;
import com.wifakbank.project_management.dto.response.UserSummaryResponse;
import com.wifakbank.project_management.entity.*;
import com.wifakbank.project_management.exception.AppException;
import com.wifakbank.project_management.repository.MilestoneRepository;
import com.wifakbank.project_management.repository.ProjectRepository;
import com.wifakbank.project_management.repository.TaskRepository;
import com.wifakbank.project_management.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MilestoneTaskService {

    private final ProjectRepository projectRepository;
    private final MilestoneRepository milestoneRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<MilestoneResponse> getMilestonesByProject(Long projectId) {
        return milestoneRepository.findByProjectId(projectId).stream()
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
        return toMilestoneResponse(saved);
    }

    @Transactional
    public MilestoneResponse updateMilestone(Long id, MilestoneRequest request) {
        Milestone milestone = milestoneRepository.findById(id)
                .orElseThrow(() -> new AppException("MILESTONE_NOT_FOUND", "Jalon introuvable", HttpStatus.NOT_FOUND));

        assertMilestoneSequenceUnlocked(milestone);
        assertUniqueMilestoneTitle(milestone.getProject().getId(), request.getTitle(), milestone.getId());
        updateMilestoneFields(milestone, request);
        Milestone saved = milestoneRepository.save(milestone);
        updateProjectProgress(milestone.getProject());
        return toMilestoneResponse(saved);
    }

    @Transactional
    public void deleteMilestone(Long id) {
        Milestone milestone = milestoneRepository.findById(id)
                .orElseThrow(() -> new AppException("MILESTONE_NOT_FOUND", "Jalon introuvable", HttpStatus.NOT_FOUND));
        Project project = milestone.getProject();
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
        updateTaskFields(task, request);

        Task saved = taskRepository.save(task);
        updateMilestoneProgress(milestone);
        return toTaskResponse(saved);
    }

    @Transactional
    public TaskResponse updateTask(Long id, TaskRequest request) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new AppException("TASK_NOT_FOUND", "Tâche introuvable", HttpStatus.NOT_FOUND));

        assertMilestoneSequenceUnlocked(task.getMilestone());
        updateTaskFields(task, request);
        Task saved = taskRepository.save(task);
        updateMilestoneProgress(task.getMilestone());
        return toTaskResponse(saved);
    }

    @Transactional
    public void deleteTask(Long id) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new AppException("TASK_NOT_FOUND", "Tâche introuvable", HttpStatus.NOT_FOUND));
        Milestone milestone = task.getMilestone();
        assertMilestoneSequenceUnlocked(milestone);
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
        } else if (milestone.getProgressPercent() > 0 && milestone.getStatus() == MilestoneStatus.NON_DEMARRE) {
            milestone.setStatus(MilestoneStatus.EN_COURS);
        } else if (milestone.getProgressPercent() == 0) {
           milestone.setStatus(MilestoneStatus.NON_DEMARRE);
        }

        // Check for delay
        if (milestone.getStatus() != MilestoneStatus.TERMINE && milestone.getDeadline() != null && milestone.getDeadline().isBefore(LocalDate.now())) {
            milestone.setStatus(MilestoneStatus.EN_RETARD);
        }

        milestoneRepository.save(milestone);
        updateProjectProgress(milestone.getProject());
    }

    private void updateProjectProgress(Project project) {
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
            }
        } else if (project.getProgressPercent() > 0 && project.getStatus() == ProjectStatus.BROUILLON) {
            project.setStatus(ProjectStatus.EN_COURS);
        }

        projectRepository.save(project);
    }

    // ── Helpers ──────────────────────────────────────────────────

    private void updateMilestoneFields(Milestone milestone, MilestoneRequest request) {
        milestone.setTitle(request.getTitle().trim());
        milestone.setDescription(request.getDescription());
        milestone.setDeadline(request.getDeadline());
        milestone.setActualEndDate(request.getActualEndDate());
        
        if (request.getStatus() != null) {
            MilestoneStatus newStatus;
            try {
                newStatus = MilestoneStatus.valueOf(request.getStatus().trim().toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw new AppException("INVALID_MILESTONE_STATUS", "Statut jalon invalide", HttpStatus.BAD_REQUEST);
            }
            // Mandatory Justification Check
            if ((newStatus == MilestoneStatus.BLOQUE || newStatus == MilestoneStatus.EN_RETARD) 
                && (request.getJustification() == null || request.getJustification().isBlank())) {
                throw new AppException("JUSTIFICATION_REQUIRED", "Une justification est obligatoire pour cet état", HttpStatus.BAD_REQUEST);
            }
            if ((newStatus == MilestoneStatus.BLOQUE || newStatus == MilestoneStatus.EN_RETARD)
                && (request.getActionPlan() == null || request.getActionPlan().isBlank())) {
                throw new AppException("ACTION_PLAN_REQUIRED", "Un plan d'action est obligatoire pour cet état", HttpStatus.BAD_REQUEST);
            }
            if (newStatus == MilestoneStatus.TERMINE && request.getActualEndDate() == null) {
                throw new AppException("ACTUAL_END_DATE_REQUIRED", "La date de fin réelle est obligatoire pour clôturer le jalon", HttpStatus.BAD_REQUEST);
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
        
        milestone.setJustification(request.getJustification());
        milestone.setActionPlan(request.getActionPlan());
    }

    private void updateTaskFields(Task task, TaskRequest request) {
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setStartDate(request.getStartDate());
        task.setEndDate(request.getEndDate());
        task.setActualEndDate(request.getActualEndDate());

        if (request.getStartDate() != null && request.getEndDate() != null && request.getEndDate().isBefore(request.getStartDate())) {
            throw new AppException("INVALID_TASK_DATES", "La date de fin prévue doit être postérieure ou égale à la date de début", HttpStatus.BAD_REQUEST);
        }
        
        int progress = Math.max(0, Math.min(100, request.getProgressPercent()));
        task.setProgressPercent(progress);
        
        if (request.getStatus() != null) {
            TaskStatus newStatus;
            try {
                newStatus = TaskStatus.valueOf(request.getStatus().trim().toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw new AppException("INVALID_TASK_STATUS", "Statut tâche invalide", HttpStatus.BAD_REQUEST);
            }
            // Mandatory Justification Check for Tasks
            if ((newStatus == TaskStatus.BLOQUE || newStatus == TaskStatus.EN_RETARD) 
                && (request.getJustification() == null || request.getJustification().isBlank())) {
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
        } else if (task.getStatus() == null) {
            task.setStatus(resolveStatusFromProgress(progress));
        }

        // Automatic completion logic if 100%
        if (progress == 100) {
            task.setStatus(TaskStatus.DONE);
            if (task.getActualEndDate() == null) {
                task.setActualEndDate(LocalDate.now());
            }
        }
        
        task.setJustification(request.getJustification());
        
        if (request.getPriority() != null) {
            try {
                task.setPriority(TaskPriority.valueOf(request.getPriority().trim().toUpperCase()));
            } catch (IllegalArgumentException ex) {
                throw new AppException("INVALID_TASK_PRIORITY", "Priorité tâche invalide", HttpStatus.BAD_REQUEST);
            }
        } else if (task.getPriority() == null) {
            task.setPriority(TaskPriority.MOYENNE);
        }

        if (request.getAssigneeId() != null) {
            User assignee = userRepository.findById(request.getAssigneeId())
                    .orElseThrow(() -> new AppException("USER_NOT_FOUND", "Assigné introuvable", HttpStatus.BAD_REQUEST));
            task.setAssignee(assignee);
        } else {
            task.setAssignee(null);
        }

        if (request.getDependencyTaskId() != null) {
            Task dep = taskRepository.findById(request.getDependencyTaskId())
                    .orElseThrow(() -> new AppException("TASK_NOT_FOUND", "Tâche de dépendance introuvable", HttpStatus.BAD_REQUEST));
            task.setDependencyTask(dep);
        } else {
            task.setDependencyTask(null);
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
                .build();
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
