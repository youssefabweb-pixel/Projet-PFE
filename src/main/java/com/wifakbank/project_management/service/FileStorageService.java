package com.wifakbank.project_management.service;

import com.wifakbank.project_management.exception.AppException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageService {

    private final Path rootPath = Paths.get("uploads/documents");

    public FileStorageService() {
        try {
            Files.createDirectories(rootPath);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage", e);
        }
    }

    public String store(MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.contains("..")) {
            throw new AppException("INVALID_FILE", "Nom de fichier invalide", HttpStatus.BAD_REQUEST);
        }

        String extension = "";
        int i = originalFilename.lastIndexOf('.');
        if (i > 0) {
            extension = originalFilename.substring(i);
        }

        String storedName = UUID.randomUUID().toString() + extension;
        try {
            Files.copy(file.getInputStream(), this.rootPath.resolve(storedName), StandardCopyOption.REPLACE_EXISTING);
            return storedName;
        } catch (IOException e) {
            throw new AppException("STORAGE_ERROR", "Erreur lors de l'enregistrement du fichier", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    public Path load(String storedName) {
        return rootPath.resolve(storedName);
    }

    public void delete(String storedName) {
        try {
            Files.deleteIfExists(rootPath.resolve(storedName));
        } catch (IOException ignored) {
        }
    }
}
