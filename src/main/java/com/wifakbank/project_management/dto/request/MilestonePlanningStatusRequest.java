package com.wifakbank.project_management.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MilestonePlanningStatusRequest {

    /**
     * Canonical (NOT_STARTED, IN_PROGRESS, COMPLETED, DELAYED, BLOCKED) or legacy French enum names.
     */
    @NotBlank
    private String status;

    @Size(max = 2000)
    private String justification;
}
