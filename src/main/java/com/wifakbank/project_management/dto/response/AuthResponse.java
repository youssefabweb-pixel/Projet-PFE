package com.wifakbank.project_management.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AuthResponse {
    private String accessToken;
    private String tokenType;
    private String role;
    private String username;
    private long expiresIn;
}
