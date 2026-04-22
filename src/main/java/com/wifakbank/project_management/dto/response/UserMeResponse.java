package com.wifakbank.project_management.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserMeResponse {
    private Long id;
    private String username;
    private String email;
    private String role;
    private boolean enabled;
}
