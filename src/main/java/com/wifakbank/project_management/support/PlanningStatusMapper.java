package com.wifakbank.project_management.support;

import com.wifakbank.project_management.entity.MilestoneStatus;
import com.wifakbank.project_management.entity.TaskStatus;

/**
 * Maps persisted French / legacy task & milestone statuses to canonical planning API labels
 * (NOT_STARTED, IN_PROGRESS, COMPLETED, DELAYED, BLOCKED) and parses client aliases back.
 */
public final class PlanningStatusMapper {

    private PlanningStatusMapper() {}

    public static String taskToApi(TaskStatus status) {
        if (status == null) {
            return "NOT_STARTED";
        }
        return switch (status) {
            case NOT_STARTED -> "NOT_STARTED";
            case IN_PROGRESS -> "IN_PROGRESS";
            case DONE -> "COMPLETED";
            case EN_RETARD -> "DELAYED";
            case BLOQUE -> "BLOCKED";
        };
    }

    public static String milestoneToApi(MilestoneStatus status) {
        if (status == null) {
            return "NOT_STARTED";
        }
        return switch (status) {
            case NON_DEMARRE -> "NOT_STARTED";
            case EN_COURS -> "IN_PROGRESS";
            case TERMINE -> "COMPLETED";
            case EN_RETARD -> "DELAYED";
            case BLOQUE -> "BLOCKED";
        };
    }

    public static TaskStatus parseTaskStatus(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("empty");
        }
        String s = raw.trim().toUpperCase().replace('-', '_');
        return switch (s) {
            case "COMPLETED" -> TaskStatus.DONE;
            case "DELAYED" -> TaskStatus.EN_RETARD;
            case "BLOCKED" -> TaskStatus.BLOQUE;
            default -> TaskStatus.valueOf(s);
        };
    }

    public static MilestoneStatus parseMilestoneStatus(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("empty");
        }
        String s = raw.trim().toUpperCase().replace('-', '_');
        return switch (s) {
            case "NOT_STARTED" -> MilestoneStatus.NON_DEMARRE;
            case "IN_PROGRESS" -> MilestoneStatus.EN_COURS;
            case "COMPLETED" -> MilestoneStatus.TERMINE;
            case "DELAYED" -> MilestoneStatus.EN_RETARD;
            case "BLOCKED" -> MilestoneStatus.BLOQUE;
            default -> MilestoneStatus.valueOf(s);
        };
    }
}
