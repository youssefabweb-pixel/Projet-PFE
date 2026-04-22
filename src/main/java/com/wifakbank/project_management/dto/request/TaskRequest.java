package com.wifakbank.project_management.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class TaskRequest {

    @NotBlank(message = "Le titre est obligatoire")
    @Size(max = 255)
    private String title;

    @Size(max = 2000)
    private String description;

    private LocalDate startDate;

    private LocalDate endDate;

    @Min(0)
    @Max(100)
    private int progressPercent;

    private Long assigneeId;

    private String priority;

    private Long dependencyTaskId;

    private String status;

    @Size(max = 2000)
    private String justification;

    private LocalDate actualEndDate;
}
