package com.wifakbank.project_management.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class PlanningTaskResponse {
    private Long id;
    private String name;
    private List<Long> dependsOnTaskIds;
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
    private String deliverableUrl;
    private String deliverableLabel;
    private List<TaskDocumentResponse> taskDocuments;
}
