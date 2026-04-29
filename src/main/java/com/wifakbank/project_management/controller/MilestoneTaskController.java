package com.wifakbank.project_management.controller;

import com.wifakbank.project_management.dto.request.MilestoneRequest;
import com.wifakbank.project_management.dto.request.TaskRequest;
import com.wifakbank.project_management.dto.response.MilestoneResponse;
import com.wifakbank.project_management.dto.response.TaskResponse;
import com.wifakbank.project_management.service.MilestoneTaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class MilestoneTaskController {

    private final MilestoneTaskService service;

    @GetMapping("/{projectId}/milestones")
    public ResponseEntity<List<MilestoneResponse>> getMilestones(@PathVariable Long projectId) {
        return ResponseEntity.ok(service.getMilestonesByProject(projectId));
    }

    @PostMapping("/{projectId}/milestones")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMINISTRATEUR', 'DEVELOPPEMENT', 'MOA', 'METIER')")
    public ResponseEntity<MilestoneResponse> createMilestone(
            @PathVariable Long projectId,
            @Valid @RequestBody MilestoneRequest request) {
        return ResponseEntity.ok(service.createMilestone(projectId, request));
    }

    @PutMapping("/milestones/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMINISTRATEUR', 'DEVELOPPEMENT', 'MOA', 'METIER')")
    public ResponseEntity<MilestoneResponse> updateMilestone(
            @PathVariable Long id,
            @Valid @RequestBody MilestoneRequest request) {
        return ResponseEntity.ok(service.updateMilestone(id, request));
    }

    @DeleteMapping("/milestones/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMINISTRATEUR', 'DEVELOPPEMENT', 'MOA', 'METIER')")
    public ResponseEntity<Void> deleteMilestone(@PathVariable Long id) {
        service.deleteMilestone(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/milestones/{milestoneId}/tasks")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMINISTRATEUR', 'DEVELOPPEMENT', 'MOA', 'METIER')")
    public ResponseEntity<TaskResponse> createTask(
            @PathVariable Long milestoneId,
            @Valid @RequestBody TaskRequest request) {
        return ResponseEntity.ok(service.createTask(milestoneId, request));
    }

    @PutMapping("/tasks/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMINISTRATEUR', 'DEVELOPPEMENT', 'MOA', 'METIER')")
    public ResponseEntity<TaskResponse> updateTask(
            @PathVariable Long id,
            @Valid @RequestBody TaskRequest request) {
        return ResponseEntity.ok(service.updateTask(id, request));
    }

    @DeleteMapping("/tasks/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMINISTRATEUR', 'DEVELOPPEMENT', 'MOA', 'METIER')")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        service.deleteTask(id);
        return ResponseEntity.noContent().build();
    }
}
