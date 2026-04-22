package com.wifakbank.project_management.controller;

import com.wifakbank.project_management.dto.response.DocumentResponse;
import com.wifakbank.project_management.entity.*;
import com.wifakbank.project_management.exception.AppException;
import com.wifakbank.project_management.repository.*;
import com.wifakbank.project_management.service.FileStorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.MalformedURLException;
import java.nio.file.Path;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Documents", description = "Gestion des documents livrables")
public class DocumentController {

    private final DeliverableRepository deliverableRepository;
    private final DeliverableDocumentRepository documentRepository;
    private final FileStorageService storageService;
    private final UserRepository userRepository;

    @Operation(summary = "Uploader un document pour un livrable")
    @PostMapping("/deliverables/{id}/documents")
    public DocumentResponse upload(@PathVariable Long id, @RequestParam("file") MultipartFile file, Authentication authentication) {
        User actor = loadUser(authentication.getName());
        Deliverable deliverable = deliverableRepository.findById(id)
                .orElseThrow(() -> new AppException("NOT_FOUND", "Livrable introuvable", HttpStatus.NOT_FOUND));

        // Seul le Chef de projet assigné ou le PMO peut uploader
        if (!isAssignedChefOrElevated(actor, deliverable.getProject())) {
            throw new AppException("ACCESS_DENIED", "Seul le chef de projet ou le PMO peut uploader des documents", HttpStatus.FORBIDDEN);
        }

        String storedName = storageService.store(file);

        DeliverableDocument doc = new DeliverableDocument();
        doc.setDeliverable(deliverable);
        doc.setFilename(file.getOriginalFilename());
        doc.setContentType(file.getContentType());
        doc.setSize(file.getSize());
        doc.setStoragePath(storedName);

        DeliverableDocument saved = documentRepository.save(doc);

        return toResponse(saved);
    }

    @Operation(summary = "Télécharger un document")
    @GetMapping("/documents/{docId}/download")
    public ResponseEntity<Resource> download(@PathVariable Long docId, Authentication authentication) {
        DeliverableDocument doc = documentRepository.findById(docId)
                .orElseThrow(() -> new AppException("NOT_FOUND", "Document introuvable", HttpStatus.NOT_FOUND));

        // Vérifier si l'utilisateur a accès au projet (PMO ou membre du projet)
        // Pour simplifier ici on autorise tout utilisateur authentifié (à affiner si nécessaire)

        try {
            Path file = storageService.load(doc.getStoragePath());
            Resource resource = new UrlResource(file.toUri());

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(doc.getContentType()))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.getFilename() + "\"")
                    .body(resource);
        } catch (MalformedURLException e) {
            throw new AppException("DOWNLOAD_ERROR", "Erreur lors du téléchargement", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Operation(summary = "Supprimer un document")
    @DeleteMapping("/documents/{docId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long docId, Authentication authentication) {
        User actor = loadUser(authentication.getName());
        DeliverableDocument doc = documentRepository.findById(docId)
                .orElseThrow(() -> new AppException("NOT_FOUND", "Document introuvable", HttpStatus.NOT_FOUND));

        // Seul le Chef de projet assigné ou le PMO peut supprimer
        if (!isAssignedChefOrElevated(actor, doc.getDeliverable().getProject())) {
            throw new AppException("ACCESS_DENIED", "Seul le chef de projet ou le PMO peut supprimer des documents", HttpStatus.FORBIDDEN);
        }

        storageService.delete(doc.getStoragePath());
        documentRepository.delete(doc);
    }

    private User loadUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException("AUTH_ERROR", "Utilisateur non trouvé", HttpStatus.UNAUTHORIZED));
    }

    private boolean isAssignedChefOrElevated(User u, Project p) {
        if (u.getRole() == Role.MANAGER || u.getRole() == Role.ADMINISTRATEUR) return true;
        return p.getChefProjet() != null && p.getChefProjet().getId().equals(u.getId());
    }

    private DocumentResponse toResponse(DeliverableDocument doc) {
        return DocumentResponse.builder()
                .id(doc.getId())
                .filename(doc.getFilename())
                .contentType(doc.getContentType())
                .size(doc.getSize())
                .uploadedAt(doc.getUploadedAt())
                .build();
    }
}
