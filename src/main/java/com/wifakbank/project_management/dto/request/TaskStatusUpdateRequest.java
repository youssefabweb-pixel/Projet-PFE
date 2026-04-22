package com.wifakbank.project_management.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TaskStatusUpdateRequest {

    @NotBlank(message = "Le statut est obligatoire")
    private String status;
}
