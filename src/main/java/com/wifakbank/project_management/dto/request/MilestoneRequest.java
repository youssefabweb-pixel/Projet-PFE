package com.wifakbank.project_management.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class MilestoneRequest {

    @NotBlank(message = "Le titre est obligatoire")
    @Size(max = 255)
    private String title;

    @Size(max = 2000)
    private String description;

    @NotNull(message = "La deadline est obligatoire")
    private LocalDate deadline;

    private LocalDate actualEndDate;

    private String status;

    @Size(max = 2000)
    private String justification;

    @Size(max = 2000)
    private String actionPlan;
}
