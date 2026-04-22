package com.wifakbank.project_management.service;

import com.wifakbank.project_management.dto.response.PlanningMilestoneResponse;
import com.wifakbank.project_management.dto.response.PlanningProjectResponse;
import com.wifakbank.project_management.dto.response.PlanningTaskResponse;
import com.wifakbank.project_management.dto.response.UserSummaryResponse;
import com.wifakbank.project_management.entity.Milestone;
import com.wifakbank.project_management.entity.MilestoneStatus;
import com.wifakbank.project_management.entity.Project;
import com.wifakbank.project_management.entity.ProjectStatus;
import com.wifakbank.project_management.entity.Role;
import com.wifakbank.project_management.entity.Task;
import com.wifakbank.project_management.entity.TaskStatus;
import com.wifakbank.project_management.entity.TaskPriority;
import com.wifakbank.project_management.entity.User;
import com.wifakbank.project_management.exception.AppException;
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

@Service
@RequiredArgsConstructor
public class PlanningProgressService {

    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<PlanningProjectResponse> getProjectsForPlanning(String username) {
        User actor = loadUser(username);
        return resolveVisibleProjects(actor).stream()
                .map(this::toProjectResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PlanningProjectResponse> searchProjectsByName(String name, String username) {
        User actor = loadUser(username);
        String query = name == null ? "" : name.trim();
        if (query.isEmpty()) {
            return getProjectsForPlanning(username);
        }
        String q = query.toLowerCase();
        return resolveVisibleProjects(actor).stream()
                .filter(project -> matchesSearch(project, q))
                .map(this::toProjectResponse)
                .toList();
    }

    @Transactional
    public PlanningTaskResponse updateTaskStatus(Long taskId, TaskStatus status) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new AppException("TASK_NOT_FOUND", "Tâche introuvable", HttpStatus.NOT_FOUND));

        task.setStatus(status);
        task.setProgressPercent(progressFromStatus(status));
        Task saved = taskRepository.save(task);

        recalculateProgress(saved.getMilestone().getProject());

        return PlanningTaskResponse.builder()
                .id(saved.getId())
                .name(saved.getTitle())
                .status(saved.getStatus().name())
                .build();
    }

    private PlanningProjectResponse toProjectResponse(Project project) {
        ProjectComputed computed = recalculateProgress(project);
        return PlanningProjectResponse.builder()
                .id(project.getId())
                .code(project.getCode())
                .name(project.getName())
                .status(project.getStatus() != null ? project.getStatus().name() : ProjectStatus.BROUILLON.name())
                .progress(computed.progress())
                .completed(computed.completed())
                .plannedStartDate(project.getPlannedStartDate())
                .plannedEndDate(project.getPlannedEndDate())
                .chefProjet(project.getChefProjet() != null ? UserSummaryResponse.builder()
                        .id(project.getChefProjet().getId())
                        .username(project.getChefProjet().getUsername())
                        .email(project.getChefProjet().getEmail())
                        .role(project.getChefProjet().getRole().name())
                        .build() : null)
                .milestones(project.getMilestones().stream()
                        .sorted(Comparator.comparing(Milestone::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                        .map(this::toMilestoneResponse)
                        .toList())
                .build();
    }

    private PlanningMilestoneResponse toMilestoneResponse(Milestone milestone) {
        MilestoneComputed computed = computeMilestone(milestone);
        Long delay = calculateDelay(milestone.getDeadline(), milestone.getStatus());
        
        return PlanningMilestoneResponse.builder()
                .id(milestone.getId())
                .name(milestone.getTitle())
                .description(milestone.getDescription())
                .progress(computed.progress())
                .completed(computed.completed())
                .deadline(milestone.getDeadline())
                .justification(milestone.getJustification())
                .delayDays(delay)
                .tasks(milestone.getTasks().stream()
                        .sorted(Comparator.comparing(Task::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                        .map(task -> PlanningTaskResponse.builder()
                                .id(task.getId())
                                .name(task.getTitle())
                                .description(task.getDescription())
                                .status(resolveTaskStatus(task).name())
                                .priority(task.getPriority() != null ? task.getPriority().name() : TaskPriority.MOYENNE.name())
                                .progress(task.getProgressPercent())
                                .startDate(task.getStartDate())
                                .endDate(task.getEndDate())
                                .justification(task.getJustification())
                                .delayDays(calculateDelay(task.getEndDate(), task.getStatus()))
                                .actualEndDate(task.getActualEndDate())
                                .assignee(task.getAssignee() != null ? UserSummaryResponse.builder()
                                        .id(task.getAssignee().getId())
                                        .username(task.getAssignee().getUsername())
                                        .email(task.getAssignee().getEmail())
                                        .role(task.getAssignee().getRole().name())
                                        .build() : null)
                                .build())
                        .toList())
                .build();
    }

    private ProjectComputed recalculateProgress(Project project) {
        List<Milestone> milestones = project.getMilestones();
        for (Milestone m : milestones) {
            // Self-update status based on time (Automatic Delay)
            if (m.getStatus() != MilestoneStatus.TERMINE && m.getStatus() != MilestoneStatus.BLOQUE) {
                if (m.getDeadline() != null && m.getDeadline().isBefore(LocalDate.now())) {
                    m.setStatus(MilestoneStatus.EN_RETARD);
                }
            }

            MilestoneComputed computed = computeMilestone(m);
            m.setProgressPercent(computed.progress());
            
            if (computed.progress() == 100) {
                m.setStatus(MilestoneStatus.TERMINE);
                if (m.getActualEndDate() == null) {
                    m.setActualEndDate(LocalDate.now());
                }
            } else if (m.getStatus() == MilestoneStatus.TERMINE) {
                m.setStatus(MilestoneStatus.EN_COURS);
                m.setActualEndDate(null);
            }
        }

        int projectProgress = milestones.isEmpty()
                ? 0
                : (int) Math.round(milestones.stream().mapToInt(Milestone::getProgressPercent).average().orElse(0.0));
        
        boolean allMilestonesDone = !milestones.isEmpty() && milestones.stream().allMatch(m -> m.getStatus() == MilestoneStatus.TERMINE);

        project.setProgressPercent(projectProgress);
        if (allMilestonesDone) {
            project.setStatus(ProjectStatus.TERMINE);
            if (project.getActualEndDate() == null) {
                project.setActualEndDate(LocalDate.now());
            }
        } else if (projectProgress > 0 && project.getStatus() == ProjectStatus.BROUILLON) {
            project.setStatus(ProjectStatus.EN_COURS);
        } else if (projectProgress < 100 && project.getStatus() == ProjectStatus.TERMINE) {
            project.setStatus(ProjectStatus.EN_COURS);
            project.setActualEndDate(null);
        }

        projectRepository.save(project);
        return new ProjectComputed(projectProgress, allMilestonesDone);
    }

    private MilestoneComputed computeMilestone(Milestone milestone) {
        List<Task> tasks = milestone.getTasks();
        if (tasks == null || tasks.isEmpty()) {
            return new MilestoneComputed(0, false);
        }
        
        // Manual Progress Rollup (Average of task percentages)
        double averageProgress = tasks.stream()
                .mapToInt(Task::getProgressPercent)
                .average()
                .orElse(0.0);
        
        int progress = (int) Math.round(averageProgress);
        return new MilestoneComputed(progress, progress == 100);
    }

    private Long calculateDelay(LocalDate deadline, Object status) {
        if (deadline == null) return 0L;
        String statusStr = status.toString();
        if (statusStr.equals("DONE") || statusStr.equals("TERMINE")) return 0L;
        
        if (deadline.isBefore(LocalDate.now())) {
            return java.time.temporal.ChronoUnit.DAYS.between(deadline, LocalDate.now());
        }
        return 0L;
    }

    private TaskStatus resolveTaskStatus(Task task) {
        if (task.getStatus() != null) {
            // Automatic delay check
            if (task.getStatus() != TaskStatus.DONE && task.getStatus() != TaskStatus.BLOQUE) {
                if (task.getEndDate() != null && task.getEndDate().isBefore(LocalDate.now())) {
                    return TaskStatus.EN_RETARD;
                }
            }
            return task.getStatus();
        }
        return TaskStatus.NOT_STARTED;
    }

    private int progressFromStatus(TaskStatus status) {
        return switch (status) {
            case DONE -> 100;
            case NOT_STARTED, IN_PROGRESS, EN_RETARD, BLOQUE -> 0;
        };
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

    private record MilestoneComputed(int progress, boolean completed) {}
    private record ProjectComputed(int progress, boolean completed) {}
}
