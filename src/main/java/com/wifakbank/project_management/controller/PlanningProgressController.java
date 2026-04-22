package com.wifakbank.project_management.controller;

import com.wifakbank.project_management.dto.request.TaskStatusUpdateRequest;
import com.wifakbank.project_management.dto.response.PlanningProjectResponse;
import com.wifakbank.project_management.dto.response.PlanningTaskResponse;
import com.wifakbank.project_management.entity.TaskStatus;
import com.wifakbank.project_management.exception.AppException;
import com.wifakbank.project_management.service.PlanningProgressService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Planning", description = "Planification et avancement")
public class PlanningProgressController {

    private final PlanningProgressService planningProgressService;

    @Operation(summary = "Retourne tous les projets avec jalons, tâches et avancement calculé")
    @GetMapping("/projects/planning")
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR','MANAGER','MOA','METIER','DEVELOPPEMENT')")
    public List<PlanningProjectResponse> getProjects(Authentication authentication) {
        return planningProgressService.getProjectsForPlanning(authentication.getName());
    }

    @Operation(summary = "Recherche des projets par nom")
    @GetMapping("/projects/search")
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR','MANAGER','MOA','METIER','DEVELOPPEMENT')")
    public List<PlanningProjectResponse> searchProjects(
            @RequestParam(name = "name", required = false) String name,
            Authentication authentication) {
        return planningProgressService.searchProjectsByName(name, authentication.getName());
    }

    @Operation(summary = "Mettre à jour le statut d'une tâche")
    @PutMapping("/tasks/{id}/status")
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR','MANAGER','MOA','METIER','DEVELOPPEMENT')")
    public PlanningTaskResponse updateTaskStatus(@PathVariable Long id, @Valid @RequestBody TaskStatusUpdateRequest request) {
        TaskStatus status;
        try {
            status = TaskStatus.valueOf(request.getStatus().trim().toUpperCase());
        } catch (Exception ex) {
            throw new AppException("INVALID_TASK_STATUS", "Statut tâche invalide", HttpStatus.BAD_REQUEST);
        }
        return planningProgressService.updateTaskStatus(id, status);
    }
}
