package com.wifakbank.project_management.service;

import com.wifakbank.project_management.entity.Milestone;
import com.wifakbank.project_management.entity.MilestoneStatus;
import com.wifakbank.project_management.entity.Task;
import com.wifakbank.project_management.entity.TaskStatus;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Pure planning / progress rules (no persistence). Used by planning APIs and kept aligned
 * with {@link MilestoneTaskService} rollups.
 */
@Component
public class PlanningProgressCalculationService {

    public int averageProgress(List<Integer> percents) {
        if (percents == null || percents.isEmpty()) {
            return 0;
        }
        return (int) Math.round(percents.stream().mapToInt(Integer::intValue).average().orElse(0.0));
    }

    public int milestoneProgressPercent(List<Task> tasks) {
        if (tasks == null || tasks.isEmpty()) {
            return 0;
        }
        return (int) Math.round(tasks.stream().mapToInt(Task::getProgressPercent).average().orElse(0.0));
    }

    public boolean allTasksCompleted(List<Task> tasks) {
        return tasks != null && !tasks.isEmpty() && tasks.stream().allMatch(t -> t.getStatus() == TaskStatus.DONE);
    }

    /**
     * Effective status for API display: applies automatic delay when end date passed and work not finished.
     */
    public TaskStatus effectiveTaskStatus(Task task, LocalDate today) {
        if (task.getStatus() == null) {
            return TaskStatus.NOT_STARTED;
        }
        if (task.getStatus() == TaskStatus.BLOQUE) {
            return TaskStatus.BLOQUE;
        }
        if (task.getStatus() == TaskStatus.DONE) {
            return TaskStatus.DONE;
        }
        if (task.getEndDate() != null && task.getEndDate().isBefore(today)) {
            return TaskStatus.EN_RETARD;
        }
        return task.getStatus();
    }

    public long taskDelayDays(Task task, LocalDate today) {
        TaskStatus effective = effectiveTaskStatus(task, today);
        if (task.getEndDate() == null || effective == TaskStatus.DONE) {
            return 0L;
        }
        if (task.getEndDate().isBefore(today)) {
            return ChronoUnit.DAYS.between(task.getEndDate(), today);
        }
        return 0L;
    }

    public MilestoneStatus effectiveMilestoneStatus(Milestone milestone, List<Task> tasks, LocalDate today) {
        if (tasks == null || tasks.isEmpty()) {
            if (milestone.getStatus() == MilestoneStatus.BLOQUE) {
                return MilestoneStatus.BLOQUE;
            }
            if (milestone.getDeadline() != null && milestone.getDeadline().isBefore(today)) {
                return MilestoneStatus.EN_RETARD;
            }
            return milestone.getStatus() != null ? milestone.getStatus() : MilestoneStatus.NON_DEMARRE;
        }
        if (allTasksCompleted(tasks)) {
            return MilestoneStatus.TERMINE;
        }
        if (milestone.getStatus() == MilestoneStatus.BLOQUE) {
            return MilestoneStatus.BLOQUE;
        }
        if (milestone.getDeadline() != null && milestone.getDeadline().isBefore(today)) {
            return MilestoneStatus.EN_RETARD;
        }
        if (milestone.getStatus() == MilestoneStatus.TERMINE) {
            return MilestoneStatus.EN_COURS;
        }
        return milestone.getStatus() != null ? milestone.getStatus() : MilestoneStatus.NON_DEMARRE;
    }

    public long milestoneDelayDays(Milestone milestone, MilestoneStatus effective, LocalDate today) {
        if (milestone.getDeadline() == null || effective == MilestoneStatus.TERMINE) {
            return 0L;
        }
        if (milestone.getDeadline().isBefore(today)) {
            return ChronoUnit.DAYS.between(milestone.getDeadline(), today);
        }
        return 0L;
    }
}
