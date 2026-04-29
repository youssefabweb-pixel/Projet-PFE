package com.wifakbank.project_management.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

@Getter
@Builder
public class TaskDocumentResponse {
    private Long id;
    private Long taskId;
    private String filename;
    private String contentType;
    private Long size;
    private Instant uploadedAt;
    private String downloadUrl;
}
