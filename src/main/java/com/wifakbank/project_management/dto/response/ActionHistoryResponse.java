package com.wifakbank.project_management.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class ActionHistoryResponse {
    private Long id;
    private String username;
    private String action;
    private String entity;
    private Long projectId;
    private String details;
    private Instant timestamp;
}
