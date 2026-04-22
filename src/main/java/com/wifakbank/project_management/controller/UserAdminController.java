package com.wifakbank.project_management.controller;

import com.wifakbank.project_management.dto.request.UserCreateRequest;
import com.wifakbank.project_management.dto.request.UserUpdateRequest;
import com.wifakbank.project_management.dto.response.UserResponse;
import com.wifakbank.project_management.service.UserAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Users", description = "CRUD utilisateurs — ADMINISTRATEUR ou MANAGER (règles métier sur les actions)")
public class UserAdminController {

    private final UserAdminService userAdminService;

    @Operation(summary = "Liste des utilisateurs")
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR','MANAGER','MOA','METIER','DEVELOPPEMENT')")
    public List<UserResponse> list() {
        return userAdminService.findAll();
    }

    @Operation(summary = "Liste des rôles (acteurs système)")
    @GetMapping("/roles")
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR','MANAGER','MOA','METIER','DEVELOPPEMENT')")
    public List<String> roles() {
        return userAdminService.getAvailableRoles();
    }

    @Operation(summary = "Détail utilisateur par id")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR','MANAGER','MOA','METIER','DEVELOPPEMENT')")
    public UserResponse get(@PathVariable Long id) {
        return userAdminService.findById(id);
    }

    @Operation(summary = "Créer un utilisateur")
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR','MANAGER')")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@Valid @RequestBody UserCreateRequest request, Authentication authentication) {
        return userAdminService.create(request, authentication.getName());
    }

    @Operation(summary = "Mettre à jour un utilisateur (mot de passe optionnel)")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR','MANAGER')")
    public UserResponse update(
            @PathVariable Long id,
            @Valid @RequestBody UserUpdateRequest request,
            Authentication authentication) {
        return userAdminService.update(id, request, authentication.getName());
    }

    @Operation(summary = "Supprimer un utilisateur")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR','MANAGER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Authentication authentication) {
        userAdminService.delete(id, authentication.getName());
    }

    @Operation(summary = "Activer/Désactiver un utilisateur")
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR','MANAGER')")
    public UserResponse setEnabled(@PathVariable Long id, @RequestParam boolean enabled, Authentication authentication) {
        return userAdminService.setEnabled(id, enabled, authentication.getName());
    }
}
