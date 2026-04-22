package com.wifakbank.project_management.mapper;

import com.wifakbank.project_management.dto.response.UserMeResponse;
import com.wifakbank.project_management.dto.response.UserResponse;
import com.wifakbank.project_management.entity.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {
    public UserMeResponse toMeResponse(User user) {
        return UserMeResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole().name())
                .enabled(user.isEnabled())
                .build();
    }

    public UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole().name())
                .enabled(user.isEnabled())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .createdByManagerId(user.getCreatedByManagerId())
                .build();
    }
}
