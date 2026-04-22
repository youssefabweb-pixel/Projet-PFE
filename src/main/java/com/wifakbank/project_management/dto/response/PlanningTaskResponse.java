package com.wifakbank.project_management.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PlanningTaskResponse {
    private Long id;
    private String name;
    private String status;
    private String priority;
    private int progress;
    private String description;
    private java.time.LocalDate startDate;
    private java.time.LocalDate deadline;
    private java.time.LocalDate endDate;
    private UserSummaryResponse assignee;
    private String justification;
    private Long delayDays;
    private java.time.LocalDate actualEndDate;
}
