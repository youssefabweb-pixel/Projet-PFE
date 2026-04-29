package com.wifakbank.project_management.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class PlanningProgressSummaryResponse {
    private Long projectId;
    private String code;
    private String name;
    private String status;
    private int progressPercent;
    private boolean completed;
    private int milestoneCount;
    private int delayedTaskCount;
    private int blockedTaskCount;
    private List<MilestoneProgressSummaryResponse> milestones;
}
