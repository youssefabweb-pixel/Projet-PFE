package com.wifakbank.project_management.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class PlanningProjectResponse {
    private Long id;
    private String code;
    private String name;
    private String status;
    private int progress;
    private boolean completed;
    private java.time.LocalDate plannedStartDate;
    private java.time.LocalDate plannedEndDate;
    private List<PlanningMilestoneResponse> milestones;
    private UserSummaryResponse chefProjet;
    /** Statut du cycle de validation du macro-planning. null = projet legacy (traité comme DRAFT). */
    private String macroPlanning;
}
