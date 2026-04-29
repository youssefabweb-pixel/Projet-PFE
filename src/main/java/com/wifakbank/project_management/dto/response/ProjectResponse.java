package com.wifakbank.project_management.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Getter
@Builder
public class ProjectResponse {
    private Long id;
    private String code;
    private String name;
    private String description;
    private String status;
    private String domain;
    private int progressPercent;
    private LocalDate plannedStartDate;
    private LocalDate plannedEndDate;
    private UserSummaryResponse chefProjet;
    private UserSummaryResponse createdBy;
    private List<UserSummaryResponse> members;
    private List<DeliverableResponse> deliverables;
    private boolean cpEditingUnlocked;
    /** Statut du cycle de validation du macro-planning. null = projet legacy (traité comme DRAFT). */
    private String macroPlanning;
    private Instant createdAt;
    private Instant updatedAt;
}
