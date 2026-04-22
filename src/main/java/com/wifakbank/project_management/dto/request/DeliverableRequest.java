package com.wifakbank.project_management.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class DeliverableRequest {

    /** Optional: when present, update the existing deliverable with this id. */
    private Long id;

    @NotBlank(message = "Le titre du livrable est obligatoire")
    @Size(max = 255)
    private String title;

    @Size(max = 2000)
    private String description;

    private LocalDate dueDate;

    private boolean done;
}
