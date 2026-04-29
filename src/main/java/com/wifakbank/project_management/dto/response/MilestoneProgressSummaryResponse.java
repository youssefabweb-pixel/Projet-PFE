package com.wifakbank.project_management.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MilestoneProgressSummaryResponse {
    private Long milestoneId;
    private String name;
    private String status;
    private int progressPercent;
    private boolean completed;
    private java.time.LocalDate deadline;
    private Long delayDays;
    private int taskCount;
    private int completedTaskCount;
}
