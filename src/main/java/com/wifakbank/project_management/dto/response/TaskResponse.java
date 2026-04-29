package com.wifakbank.project_management.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Builder
public class TaskResponse {
    private Long id;
    private String title;
    private String description;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
    private int progressPercent;
    private UserSummaryResponse assignee;
    private String priority;
    private Long dependencyTaskId;
    private List<Long> dependencyTaskIds;
    private String deliverableUrl;
    private String deliverableLabel;
    private String justification;
    private List<TaskDocumentResponse> taskDocuments;
}
