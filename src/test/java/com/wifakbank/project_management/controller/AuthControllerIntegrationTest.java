package com.wifakbank.project_management.controller;

import com.wifakbank.project_management.entity.Role;
import com.wifakbank.project_management.entity.User;
import com.wifakbank.project_management.repository.AuthAuditLogRepository;
import com.wifakbank.project_management.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuthAuditLogRepository authAuditLogRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setup() {
        authAuditLogRepository.deleteAll();
        userRepository.deleteAll();

        User enabledUser = new User();
        enabledUser.setUsername("manager");
        enabledUser.setEmail("manager@wifakbank.tn");
        enabledUser.setPasswordHash(passwordEncoder.encode("Password@123"));
        enabledUser.setEnabled(true);
        enabledUser.setRole(Role.MANAGER);
        userRepository.save(enabledUser);

        User disabledUser = new User();
        disabledUser.setUsername("disabled");
        disabledUser.setEmail("disabled@wifakbank.tn");
        disabledUser.setPasswordHash(passwordEncoder.encode("Password@123"));
        disabledUser.setEnabled(false);
        disabledUser.setRole(Role.MOA);
        userRepository.save(disabledUser);
    }

    @Test
    void loginSuccess_shouldReturnToken_andInsertAuditLog() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "usernameOrEmail", "manager@wifakbank.tn",
                                "password", "Password@123"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.role").value("MANAGER"))
                .andExpect(jsonPath("$.username").value("manager"));

        assertThat(authAuditLogRepository.count()).isEqualTo(1);
        assertThat(authAuditLogRepository.findAll().get(0).getReason()).isEqualTo("SUCCESS");
    }

    @Test
    void loginDisabledUser_shouldBeRejected_andInsertAuditLog() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "usernameOrEmail", "disabled@wifakbank.tn",
                                "password", "Password@123"
                        ))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("ACCOUNT_DISABLED"));

        assertThat(authAuditLogRepository.count()).isEqualTo(1);
        assertThat(authAuditLogRepository.findAll().get(0).getReason()).isEqualTo("ACCOUNT_DISABLED");
    }

    @Test
    void loginWrongPassword_shouldBeRejected_andInsertAuditLog() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "usernameOrEmail", "manager",
                                "password", "bad-password"
                        ))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("AUTH_FAILED"));

        assertThat(authAuditLogRepository.count()).isEqualTo(1);
        assertThat(authAuditLogRepository.findAll().get(0).getReason()).isEqualTo("BAD_CREDENTIALS");
    }
}
