package com.wifakbank.project_management.controller;

import com.wifakbank.project_management.dto.request.LoginRequest;
import com.wifakbank.project_management.dto.request.ManagerInitRequest;
import com.wifakbank.project_management.dto.response.AuthResponse;
import com.wifakbank.project_management.dto.response.UserMeResponse;
import com.wifakbank.project_management.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @SecurityRequirements
    @Operation(
            summary = "Authenticate user and get JWT token",
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(
                            schema = @Schema(implementation = LoginRequest.class),
                            examples = @ExampleObject(
                                    value = "{\"usernameOrEmail\":\"manager@wifakbank.tn\",\"password\":\"Password@123\"}"
                            )
                    )
            ),
            responses = {
                    @ApiResponse(responseCode = "200", description = "Login success"),
                    @ApiResponse(responseCode = "401", description = "Login failed")
            }
    )
    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @SecurityRequirements
    @Operation(summary = "Bootstrap manager account once (optional endpoint)")
    @PostMapping("/register-manager-init")
    public AuthResponse registerManagerInit(@Valid @RequestBody ManagerInitRequest request) {
        return authService.registerManagerInit(request);
    }

    @Operation(summary = "Get authenticated user info", security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping("/me")
    public UserMeResponse me(Authentication authentication) {
        return authService.getCurrentUser(authentication.getName());
    }
}