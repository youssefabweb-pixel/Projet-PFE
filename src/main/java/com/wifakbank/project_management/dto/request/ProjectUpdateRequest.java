package com.wifakbank.project_management.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class ProjectUpdateRequest {

    @Size(max = 64)
    private String code;

    @Size(max = 255)
    private String name;

    @Size(max = 8000)
    private String description;

    private String status;

    private String domain;

    @Min(0)
    @Max(100)
    private Integer progressPercent;

    private LocalDate plannedStartDate;

    private LocalDate plannedEndDate;

    /** PMO / Admin uniquement */
    private Long chefProjetId;

    /** PMO / Admin uniquement — remplace la liste des participants */
    private List<Long> memberIds;

    /** PMO / Admin uniquement — débloque ou verrouille la saisie CP */
    private Boolean cpEditingUnlocked;

    /** Si non null, remplace intégralement l'espace de livrable */
    @Valid
    private List<DeliverableRequest> deliverables;
}
