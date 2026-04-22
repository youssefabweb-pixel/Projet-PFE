package com.wifakbank.project_management.dto.response;

import lombok.Builder;
import lombok.Getter;
import java.time.Instant;

@Getter
@Builder
public class DocumentResponse {
    private Long id;
    private String filename;
    private String contentType;
    private Long size;
    private Instant uploadedAt;
}
