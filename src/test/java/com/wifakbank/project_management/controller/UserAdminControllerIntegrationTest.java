package com.wifakbank.project_management.controller;

import com.wifakbank.project_management.entity.Role;
import com.wifakbank.project_management.entity.User;
import com.wifakbank.project_management.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserAdminControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setup() {
        userRepository.deleteAll();
        User manager = new User();
        manager.setUsername("mgr");
        manager.setEmail("mgr@test.tn");
        manager.setPasswordHash(passwordEncoder.encode("Password@123"));
        manager.setRole(Role.MANAGER);
        manager.setEnabled(true);
        userRepository.save(manager);

        User admin = new User();
        admin.setUsername("adm");
        admin.setEmail("adm@test.tn");
        admin.setPasswordHash(passwordEncoder.encode("Password@123"));
        admin.setRole(Role.ADMINISTRATEUR);
        admin.setEnabled(true);
        userRepository.save(admin);
    }

    @Test
    @WithMockUser(username = "mgr", roles = "MANAGER")
    void list_asManager_returnsUsers() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").value("mgr"));
    }

    @Test
    @WithMockUser(roles = "MOA")
    void list_asMoa_forbidden() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "adm", roles = "ADMINISTRATEUR")
    void list_asAdministrator_returnsUsers() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").exists());
    }

    @Test
    @WithMockUser(username = "mgr", roles = "MANAGER")
    void crud_flow() throws Exception {
        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "username", "alice",
                                "email", "alice@test.tn",
                                "password", "Password@999",
                                "role", "METIER",
                                "enabled", true
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("alice"));

        User saved = userRepository.findByUsername("alice").orElseThrow();
        assertThat(saved.getId()).isNotNull();

        mockMvc.perform(get("/api/users/" + saved.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("alice@test.tn"));

        mockMvc.perform(put("/api/users/" + saved.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "alice2@test.tn",
                                "role", "DEVELOPPEMENT",
                                "enabled", false
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false));

        mockMvc.perform(delete("/api/users/" + saved.getId()))
                .andExpect(status().isNoContent());

        assertThat(userRepository.findById(saved.getId())).isEmpty();
    }

    @Test
    @WithMockUser(username = "mgr", roles = "MANAGER")
    void update_foreignUser_forbidden() throws Exception {
        User stranger = new User();
        stranger.setUsername("stranger");
        stranger.setEmail("s@test.tn");
        stranger.setPasswordHash(passwordEncoder.encode("Password@123"));
        stranger.setRole(Role.MOA);
        stranger.setEnabled(true);
        stranger = userRepository.save(stranger);

        mockMvc.perform(put("/api/users/" + stranger.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "s2@test.tn",
                                "role", "MOA",
                                "enabled", true
                        ))))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "adm", roles = "ADMINISTRATEUR")
    void patch_status_asAdmin_ok() throws Exception {
        User u = new User();
        u.setUsername("u1");
        u.setEmail("u1@test.tn");
        u.setPasswordHash(passwordEncoder.encode("Password@123"));
        u.setRole(Role.METIER);
        u.setEnabled(true);
        u = userRepository.save(u);

        mockMvc.perform(patch("/api/users/" + u.getId() + "/status").param("enabled", "false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false));
    }
}
