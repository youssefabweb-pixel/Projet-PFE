package com.wifakbank.project_management.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

@Getter
@Builder
public class NotificationResponse {
    private Long id;
    private String type;
    private String message;
    private Long projectId;
    private boolean read;
    private Instant createdAt;
}
