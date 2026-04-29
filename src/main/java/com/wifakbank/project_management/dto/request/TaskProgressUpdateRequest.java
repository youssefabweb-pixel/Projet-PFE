package com.wifakbank.project_management.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TaskProgressUpdateRequest {

    @Min(0)
    @Max(100)
    private int progressPercent;

    @Size(max = 2000)
    private String justification;
}
