package com.wifakbank.project_management.controller;

import com.wifakbank.project_management.dto.response.ActionHistoryResponse;
import com.wifakbank.project_management.service.ActionHistoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/history")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Historique", description = "Traçabilité de toutes les actions utilisateurs (MANAGER / ADMINISTRATEUR uniquement)")
public class HistoryController {

    private final ActionHistoryService actionHistoryService;

    @Operation(summary = "Récupérer tout l'historique des actions")
    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMINISTRATEUR')")
    public ResponseEntity<List<ActionHistoryResponse>> getAll() {
        return ResponseEntity.ok(actionHistoryService.getAll());
    }

    @Operation(summary = "Supprimer une entrée d'historique")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMINISTRATEUR')")
    public ResponseEntity<Void> deleteOne(@PathVariable Long id) {
        actionHistoryService.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Supprimer tout l'historique")
    @DeleteMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMINISTRATEUR')")
    public ResponseEntity<Void> deleteAll() {
        actionHistoryService.deleteAll();
        return ResponseEntity.noContent().build();
    }
}
