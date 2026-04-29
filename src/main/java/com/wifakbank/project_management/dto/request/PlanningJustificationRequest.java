package com.wifakbank.project_management.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PlanningJustificationRequest {

    @NotBlank
    @Size(max = 2000)
    private String justification;
}
