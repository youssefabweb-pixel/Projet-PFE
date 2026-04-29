package com.wifakbank.project_management.controller;

import com.wifakbank.project_management.service.LoggingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Files;
import java.nio.file.Path;

@RestController
@RequestMapping("/api/logs")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Logs", description = "Téléchargement des logs de traçabilité (MANAGER uniquement)")
public class LogController {

    private final LoggingService loggingService;

    @Operation(summary = "Télécharger le log global de traçabilité")
    @GetMapping("/download")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMINISTRATEUR')")
    public ResponseEntity<Resource> downloadGlobalLog() {
        return buildLogResponse(loggingService.resolveGlobalPath(), "project-tracking.log");
    }

    @Operation(summary = "Télécharger le log de traçabilité d'un projet spécifique")
    @GetMapping("/download/project/{projectId}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMINISTRATEUR')")
    public ResponseEntity<Resource> downloadProjectLog(@PathVariable Long projectId) {
        return buildLogResponse(
                loggingService.resolveProjectPath(projectId),
                "project-" + projectId + ".log"
        );
    }

    private ResponseEntity<Resource> buildLogResponse(Path logPath, String filename) {
        if (!Files.exists(logPath)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Fichier log introuvable : " + filename);
        }

        Resource resource = new PathResource(logPath);
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_PLAIN)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filename + "\"")
                .body(resource);
    }
}
