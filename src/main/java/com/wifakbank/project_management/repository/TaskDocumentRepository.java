package com.wifakbank.project_management.repository;

import com.wifakbank.project_management.entity.TaskDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskDocumentRepository extends JpaRepository<TaskDocument, Long> {

    List<TaskDocument> findByTaskIdOrderByUploadedAtDesc(Long taskId);

    void deleteAllByTaskId(Long taskId);
}
