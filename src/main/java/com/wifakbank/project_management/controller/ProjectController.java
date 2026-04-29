package com.wifakbank.project_management.controller;

import com.wifakbank.project_management.dto.request.ProjectCreateRequest;
import com.wifakbank.project_management.dto.request.ProjectUpdateRequest;
import com.wifakbank.project_management.dto.response.ProjectResponse;
import com.wifakbank.project_management.service.ProjectService;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Projects", description = "Fiches projets — visibilité selon rôle et rattachement")
public class ProjectController {

    private final ProjectService projectService;

    @Operation(summary = "Liste des projets accessibles à l’utilisateur connecté")
    @GetMapping
    public List<ProjectResponse> list(Authentication authentication) {
        return projectService.list(authentication);
    }

    @Operation(summary = "Détail d’une fiche projet")
    @GetMapping("/{id}")
    public ProjectResponse get(@PathVariable Long id, Authentication authentication) {
        return projectService.getById(id, authentication);
    }

    @Operation(summary = "Créer une fiche projet (PMO ou administrateur)")
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR','MANAGER')")
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectResponse create(@Valid @RequestBody ProjectCreateRequest request, Authentication authentication) {
        return projectService.create(request, authentication);
    }

    @Operation(summary = "Mettre à jour une fiche projet")
    @PutMapping("/{id}")
    public ProjectResponse update(
            @PathVariable Long id,
            @Valid @RequestBody ProjectUpdateRequest request,
            Authentication authentication) {
        return projectService.update(id, request, authentication);
    }

    @Operation(summary = "Chef de projet : soumettre le macro-planning pour validation PMO (DRAFT → SOUMIS)")
    @PutMapping("/{id}/planning/submit")
    public ProjectResponse submitPlanning(@PathVariable Long id, Authentication authentication) {
        return projectService.submitPlanning(id, authentication);
    }

    @Operation(summary = "PMO : valider le macro-planning soumis (SOUMIS → VALIDE)")
    @PutMapping("/{id}/planning/validate")
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR','MANAGER')")
    public ProjectResponse validatePlanning(@PathVariable Long id, Authentication authentication) {
        return projectService.validatePlanning(id, authentication);
    }

    @Operation(summary = "Supprimer une fiche projet (MANAGER ou ADMINISTRATEUR)")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR','MANAGER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Authentication authentication) {
        projectService.delete(id, authentication);
    }
}
