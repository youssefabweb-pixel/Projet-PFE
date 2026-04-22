package com.wifakbank.project_management.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Builder
public class MilestoneResponse {
    private Long id;
    private String title;
    private String description;
    private LocalDate deadline;
    private LocalDate actualEndDate;
    private int progressPercent;
    private String status;
    private String justification;
    private String actionPlan;
    private List<TaskResponse> tasks;
}
