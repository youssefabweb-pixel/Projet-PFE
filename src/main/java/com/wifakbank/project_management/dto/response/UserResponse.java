package com.wifakbank.project_management.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

@Getter
@Builder
public class UserResponse {
    private Long id;
    private String username;
    private String email;
    private String role;
    private boolean enabled;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant lastLoginAt;
    private Long createdByManagerId;
    private String createdByManagerUsername;
}
