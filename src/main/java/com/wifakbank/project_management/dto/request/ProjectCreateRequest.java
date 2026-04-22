package com.wifakbank.project_management.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class ProjectCreateRequest {

    @NotBlank(message = "Le code projet est obligatoire")
    @Size(max = 64)
    private String code;

    @NotBlank(message = "Le nom est obligatoire")
    @Size(max = 255)
    private String name;

    @Size(max = 8000)
    private String description;

    @NotNull(message = "Le statut est obligatoire")
    private String status;

    @NotBlank(message = "Le domaine est obligatoire")
    private String domain;

    @Min(0)
    @Max(100)
    private int progressPercent;

    @NotNull(message = "La date de début prévue est obligatoire")
    private LocalDate plannedStartDate;

    private LocalDate plannedEndDate;

    /** Réservé PMO / Admin — ignoré pour les autres rôles à la création */
    private Long chefProjetId;

    /** IDs utilisateurs participants — réservé PMO / Admin */
    private List<Long> memberIds = new ArrayList<>();

    /** Espace de livrable — liste des livrables attachés à la fiche */
    @Valid
    private List<DeliverableRequest> deliverables = new ArrayList<>();
}
