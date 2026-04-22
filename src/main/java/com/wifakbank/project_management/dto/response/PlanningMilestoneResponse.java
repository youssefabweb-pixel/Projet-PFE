package com.wifakbank.project_management.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class PlanningMilestoneResponse {
    private Long id;
    private String name;
    private int progress;
    private boolean completed;
    private java.time.LocalDate deadline;
    private String description;
    private String justification;
    private Long delayDays;
    private List<PlanningTaskResponse> tasks;
}
