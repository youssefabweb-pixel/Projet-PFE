package com.wifakbank.project_management.controller;

import com.wifakbank.project_management.dto.request.MilestonePlanningStatusRequest;
import com.wifakbank.project_management.dto.request.PlanningJustificationRequest;
import com.wifakbank.project_management.dto.request.TaskProgressUpdateRequest;
import com.wifakbank.project_management.dto.request.TaskStatusUpdateRequest;
import com.wifakbank.project_management.dto.response.MilestoneProgressSummaryResponse;
import com.wifakbank.project_management.dto.response.PlanningMilestoneResponse;
import com.wifakbank.project_management.dto.response.PlanningProgressSummaryResponse;
import com.wifakbank.project_management.dto.response.PlanningProjectResponse;
import com.wifakbank.project_management.dto.response.PlanningTaskResponse;
import com.wifakbank.project_management.entity.TaskStatus;
import com.wifakbank.project_management.exception.AppException;
import com.wifakbank.project_management.service.PlanningProgressService;
import com.wifakbank.project_management.support.PlanningStatusMapper;
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
import org.springframework.web.bind.annotation.PostMapping;
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

    @Operation(summary = "Synthèse d'avancement pour un projet")
    @GetMapping("/projects/{projectId}/planning/progress")
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR','MANAGER','MOA','METIER','DEVELOPPEMENT')")
    public PlanningProgressSummaryResponse getProjectProgress(
            @PathVariable Long projectId,
            Authentication authentication) {
        return planningProgressService.getProjectProgress(projectId, authentication.getName());
    }

    @Operation(summary = "Synthèse d'avancement pour un jalon")
    @GetMapping("/milestones/{milestoneId}/planning/progress")
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR','MANAGER','MOA','METIER','DEVELOPPEMENT')")
    public MilestoneProgressSummaryResponse getMilestoneProgress(
            @PathVariable Long milestoneId,
            Authentication authentication) {
        return planningProgressService.getMilestoneProgress(milestoneId, authentication.getName());
    }

    @Operation(summary = "Mettre à jour le pourcentage d'avancement d'une tâche (recalcul jalon / projet côté serveur)")
    @PutMapping("/tasks/{id}/progress")
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR','MANAGER','MOA','METIER','DEVELOPPEMENT')")
    public PlanningTaskResponse updateTaskProgress(
            @PathVariable Long id,
            @Valid @RequestBody TaskProgressUpdateRequest request,
            Authentication authentication) {
        return planningProgressService.updateTaskProgress(
                id,
                request.getProgressPercent(),
                request.getJustification(),
                authentication.getName());
    }

    @Operation(summary = "Mettre à jour le statut d'une tâche")
    @PutMapping("/tasks/{id}/status")
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR','MANAGER','MOA','METIER','DEVELOPPEMENT')")
    public PlanningTaskResponse updateTaskStatus(@PathVariable Long id, @Valid @RequestBody TaskStatusUpdateRequest request) {
        TaskStatus status;
        try {
            status = PlanningStatusMapper.parseTaskStatus(request.getStatus());
        } catch (Exception ex) {
            throw new AppException("INVALID_TASK_STATUS", "Statut tâche invalide", HttpStatus.BAD_REQUEST);
        }
        return planningProgressService.updateTaskStatus(id, status);
    }

    @Operation(summary = "Mettre à jour le statut d'un jalon (justification obligatoire si retard ou blocage)")
    @PutMapping("/milestones/{id}/planning/status")
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR','MANAGER','MOA','METIER','DEVELOPPEMENT')")
    public PlanningMilestoneResponse updateMilestonePlanningStatus(
            @PathVariable Long id,
            @Valid @RequestBody MilestonePlanningStatusRequest request,
            Authentication authentication) {
        return planningProgressService.updateMilestonePlanningStatus(id, request, authentication.getName());
    }

    @Operation(summary = "Ajouter ou mettre à jour la justification d'une tâche")
    @PostMapping("/tasks/{id}/justification")
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR','MANAGER','MOA','METIER','DEVELOPPEMENT')")
    public PlanningTaskResponse addTaskJustification(
            @PathVariable Long id,
            @Valid @RequestBody PlanningJustificationRequest request,
            Authentication authentication) {
        return planningProgressService.addTaskJustification(id, request, authentication.getName());
    }

    @Operation(summary = "Ajouter ou mettre à jour la justification d'un jalon")
    @PostMapping("/milestones/{id}/justification")
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR','MANAGER','MOA','METIER','DEVELOPPEMENT')")
    public PlanningMilestoneResponse addMilestoneJustification(
            @PathVariable Long id,
            @Valid @RequestBody PlanningJustificationRequest request,
            Authentication authentication) {
        return planningProgressService.addMilestoneJustification(id, request, authentication.getName());
    }
}
