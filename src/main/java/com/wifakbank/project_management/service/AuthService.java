package com.wifakbank.project_management.service;

import com.wifakbank.project_management.audit.AuthAuditService;
import com.wifakbank.project_management.config.SecurityProperties;
import com.wifakbank.project_management.dto.request.LoginRequest;
import com.wifakbank.project_management.dto.request.ManagerInitRequest;
import com.wifakbank.project_management.dto.response.AuthResponse;
import com.wifakbank.project_management.dto.response.UserMeResponse;
import com.wifakbank.project_management.entity.Role;
import com.wifakbank.project_management.entity.User;
import com.wifakbank.project_management.exception.AppException;
import com.wifakbank.project_management.mapper.UserMapper;
import com.wifakbank.project_management.repository.UserRepository;
import com.wifakbank.project_management.security.JwtService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final SecurityProperties securityProperties;
    private final AuthAuditService authAuditService;
    private final HttpServletRequest httpServletRequest;
    private final UserMapper userMapper;

    public AuthResponse login(LoginRequest request) {
        String usernameOrEmail = request.getUsernameOrEmail();
        String ipAddress = resolveClientIp();

        User user = userRepository.findByUsernameOrEmail(usernameOrEmail, usernameOrEmail)
                .orElseThrow(() -> {
                    authAuditService.log(usernameOrEmail, false, "USER_NOT_FOUND", ipAddress);
                    return new AppException("AUTH_FAILED", "User not found", HttpStatus.UNAUTHORIZED);
                });

        if (!user.isEnabled()) {
            authAuditService.log(usernameOrEmail, false, "ACCOUNT_DISABLED", ipAddress);
            throw new AppException("ACCOUNT_DISABLED", "Account is disabled", HttpStatus.UNAUTHORIZED);
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            authAuditService.log(usernameOrEmail, false, "BAD_CREDENTIALS", ipAddress);
            throw new AppException("AUTH_FAILED", "Bad credentials", HttpStatus.UNAUTHORIZED);
        }

        user.setLastLoginAt(Instant.now());
        userRepository.save(user);
        authAuditService.log(usernameOrEmail, true, "SUCCESS", ipAddress);
        String token = jwtService.generateToken(user.getUsername(), user.getRole().name());
        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .role(user.getRole().name())
                .username(user.getUsername())
                .expiresIn(securityProperties.getJwtExpirationSeconds())
                .build();
    }

    public AuthResponse registerManagerInit(ManagerInitRequest request) {
        if (!securityProperties.isEnableManagerInitEndpoint()) {
            throw new AppException("ENDPOINT_DISABLED", "Manager init endpoint is disabled", HttpStatus.FORBIDDEN);
        }
        if (userRepository.existsByRole(Role.MANAGER)) {
            throw new AppException("MANAGER_ALREADY_EXISTS", "A manager account already exists", HttpStatus.CONFLICT);
        }
        userRepository.findByUsername(request.getUsername()).ifPresent(existing -> {
            throw new AppException("USERNAME_EXISTS", "Username already exists", HttpStatus.CONFLICT);
        });
        userRepository.findByEmail(request.getEmail()).ifPresent(existing -> {
            throw new AppException("EMAIL_EXISTS", "Email already exists", HttpStatus.CONFLICT);
        });

        User manager = new User();
        manager.setUsername(request.getUsername());
        manager.setEmail(request.getEmail());
        manager.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        manager.setRole(Role.MANAGER);
        manager.setEnabled(true);
        userRepository.save(manager);

        String token = jwtService.generateToken(manager.getUsername(), manager.getRole().name());
        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .role(manager.getRole().name())
                .username(manager.getUsername())
                .expiresIn(securityProperties.getJwtExpirationSeconds())
                .build();
    }

    public UserMeResponse getCurrentUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException("USER_NOT_FOUND", "User not found", HttpStatus.NOT_FOUND));
        return userMapper.toMeResponse(user);
    }

    private String resolveClientIp() {
        String xff = httpServletRequest.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return httpServletRequest.getRemoteAddr() == null ? "unknown" : httpServletRequest.getRemoteAddr();
    }
}
