package com.wifakbank.project_management.controller;

import com.wifakbank.project_management.dto.response.TaskDocumentResponse;
import com.wifakbank.project_management.entity.Task;
import com.wifakbank.project_management.entity.TaskDocument;
import com.wifakbank.project_management.exception.AppException;
import com.wifakbank.project_management.repository.TaskDocumentRepository;
import com.wifakbank.project_management.repository.TaskRepository;
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
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.MalformedURLException;
import java.nio.file.Path;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Documents de tâche", description = "Gestion des fichiers livrables des tâches")
public class TaskDocumentController {

    private final TaskRepository taskRepository;
    private final TaskDocumentRepository taskDocumentRepository;
    private final FileStorageService fileStorageService;

    @Operation(summary = "Lister les documents d'une tâche")
    @GetMapping("/tasks/{taskId}/documents")
    public List<TaskDocumentResponse> list(@PathVariable Long taskId) {
        taskRepository.findById(taskId)
                .orElseThrow(() -> new AppException("TASK_NOT_FOUND", "Tâche introuvable", HttpStatus.NOT_FOUND));
        return taskDocumentRepository.findByTaskIdOrderByUploadedAtDesc(taskId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Operation(summary = "Uploader un document pour une tâche")
    @PostMapping("/tasks/{taskId}/documents")
    public ResponseEntity<TaskDocumentResponse> upload(
            @PathVariable Long taskId,
            @RequestParam("file") MultipartFile file) {

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new AppException("TASK_NOT_FOUND", "Tâche introuvable", HttpStatus.NOT_FOUND));

        String storedName = fileStorageService.store(file);

        TaskDocument doc = new TaskDocument();
        doc.setTask(task);
        doc.setFilename(file.getOriginalFilename());
        doc.setContentType(file.getContentType() != null ? file.getContentType() : "application/octet-stream");
        doc.setSize(file.getSize());
        doc.setStoragePath(storedName);

        TaskDocument saved = taskDocumentRepository.save(doc);
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(saved));
    }

    @Operation(summary = "Télécharger un document de tâche")
    @GetMapping("/task-documents/{docId}/download")
    public ResponseEntity<Resource> download(@PathVariable Long docId) {
        TaskDocument doc = taskDocumentRepository.findById(docId)
                .orElseThrow(() -> new AppException("NOT_FOUND", "Document introuvable", HttpStatus.NOT_FOUND));

        try {
            Path filePath = fileStorageService.load(doc.getStoragePath());
            Resource resource = new UrlResource(filePath.toUri());

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(doc.getContentType()))
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=\"" + doc.getFilename() + "\"")
                    .body(resource);
        } catch (MalformedURLException e) {
            throw new AppException("DOWNLOAD_ERROR", "Erreur lors du téléchargement", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Operation(summary = "Supprimer un document de tâche")
    @DeleteMapping("/task-documents/{docId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long docId) {
        TaskDocument doc = taskDocumentRepository.findById(docId)
                .orElseThrow(() -> new AppException("NOT_FOUND", "Document introuvable", HttpStatus.NOT_FOUND));
        fileStorageService.delete(doc.getStoragePath());
        taskDocumentRepository.delete(doc);
    }

    private TaskDocumentResponse toResponse(TaskDocument doc) {
        return TaskDocumentResponse.builder()
                .id(doc.getId())
                .taskId(doc.getTask().getId())
                .filename(doc.getFilename())
                .contentType(doc.getContentType())
                .size(doc.getSize())
                .uploadedAt(doc.getUploadedAt())
                .downloadUrl("/api/task-documents/" + doc.getId() + "/download")
                .build();
    }
}
