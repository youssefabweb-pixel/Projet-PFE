package com.wifakbank.project_management.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
public class LoggingService {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Value("${app.logging.directory:logs}")
    private String logDirectory;

    @Value("${app.logging.global-file:project-tracking.log}")
    private String globalLogFile;

    /**
     * Log a generic action into the global tracking file.
     */
    public void logAction(String username, String action, String entity, String details) {
        String line = buildLogLine(username, action, entity, null, details);
        writeLine(resolveGlobalPath(), line);
        log.info("[AUDIT] {}", line);
    }

    /**
     * Log an action scoped to a specific project (global file + per-project file).
     */
    public void logAction(String username, String action, String entity, Long projectId, String details) {
        String line = buildLogLine(username, action, entity, projectId, details);
        writeLine(resolveGlobalPath(), line);
        if (projectId != null) {
            writeLine(resolveProjectPath(projectId), line);
        }
        log.info("[AUDIT] {}", line);
    }

    public Path resolveGlobalPath() {
        return resolvePath(globalLogFile);
    }

    public Path resolveProjectPath(Long projectId) {
        return resolvePath("project-" + projectId + ".log");
    }

    // ── private helpers ───────────────────────────────────────────

    private String buildLogLine(String username, String action, String entity, Long projectId, String details) {
        String timestamp = LocalDateTime.now().format(FORMATTER);
        String projectPart = (projectId != null) ? " | PROJECT_ID: " + projectId : "";
        return "[" + timestamp + "] USER: " + safe(username)
                + " | ACTION: " + safe(action)
                + " | ENTITY: " + safe(entity)
                + projectPart
                + " | DETAILS: " + safe(details);
    }

    private void writeLine(Path filePath, String line) {
        try {
            Files.createDirectories(filePath.getParent());
            try (BufferedWriter writer = new BufferedWriter(new FileWriter(filePath.toFile(), true))) {
                writer.write(line);
                writer.newLine();
            }
        } catch (IOException ex) {
            log.error("Failed to write audit log to '{}': {}", filePath, ex.getMessage());
        }
    }

    private Path resolvePath(String filename) {
        return Paths.get(logDirectory).resolve(filename).toAbsolutePath();
    }

    private String safe(String value) {
        return value == null ? "-" : value;
    }
}
