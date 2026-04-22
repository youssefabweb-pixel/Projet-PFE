package com.wifakbank.project_management.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.time.LocalDate;

@Getter
@Builder
public class DeliverableResponse {
    private Long id;
    private String title;
    private String description;
    private LocalDate dueDate;
    private boolean done;
    private Instant createdAt;
    private java.util.List<DocumentResponse> documents;
}
