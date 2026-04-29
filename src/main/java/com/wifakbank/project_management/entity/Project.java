package com.wifakbank.project_management.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "projects")
@Getter
@Setter
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String code;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(length = 8000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ProjectStatus status = ProjectStatus.BROUILLON;

    @Enumerated(EnumType.STRING)
    @Column(length = 40)
    private Domain domain;

    @Column(name = "progress_percent", nullable = false)
    private int progressPercent;

    @Column(name = "planned_start_date", nullable = false)
    private LocalDate plannedStartDate;

    @Column(name = "planned_end_date")
    private LocalDate plannedEndDate;

    @Column(name = "actual_start_date")
    private LocalDate actualStartDate;

    @Column(name = "actual_end_date")
    private LocalDate actualEndDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chef_projet_id")
    private User chefProjet;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    /**
     * Certaines bases MySQL locales ont une 2e colonne legacy (NOT NULL) en plus de {@code created_by_id}.
     * Elle est recopiée depuis {@link #createdBy} avant persistance pour satisfaire MySQL en mode strict.
     */
    @Column(name = "created_by_user_id")
    private Long createdByUserId;

    /**
     * Droit de saisie CP (PMO) — mappé pour coller au schéma MySQL existant (NOT NULL sans défaut côté DB).
     */
    @Column(name = "cp_editing_unlocked", nullable = false)
    private boolean cpEditingUnlocked = false;

    /**
     * Cycle de vie du macro-planning : DRAFT → SOUMIS → VALIDE.
     * null = projet legacy (comportement identique à DRAFT).
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "macro_planning", length = 16)
    private MacroPlanningStatus macroPlanning;

    /**
     * Archivage logique (soft delete) ; explicitement mappé pour éviter les insertions SQL
     * sans valeur sur les bases où la colonne archived existe en NOT NULL.
     */
    @Column(name = "archived", nullable = false)
    private boolean archived = false;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "project_members",
            joinColumns = @JoinColumn(name = "project_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id"))
    private Set<User> members = new HashSet<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<Deliverable> deliverables = new ArrayList<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<Milestone> milestones = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    @OneToMany(mappedBy = "project", cascade = CascadeType.REMOVE, orphanRemoval = true)
    private List<Notification> notifications;
    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
        syncCreatedByUserId();
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
        syncCreatedByUserId();
    }

    private void syncCreatedByUserId() {
        if (this.createdBy != null) {
            this.createdByUserId = this.createdBy.getId();
        }
    }
}
