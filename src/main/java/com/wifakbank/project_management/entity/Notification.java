package com.wifakbank.project_management.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "notifications")
@Getter
@Setter
public class Notification {

    public enum Type {
        PROJECT_ASSIGNED_AS_CHEF,
        PROJECT_MEMBER_ADDED,
        PROJECT_PROGRESS_UPDATED,
        PROJECT_COMPLETED,
        PROJECT_DELAYED,
        MILESTONE_DELAYED,
        MILESTONE_REMINDER_J_MINUS_1,
        MILESTONE_REMINDER_J_PLUS_1,
        NEW_PROJECT_CREATED,
        TASK_ASSIGNED,
        /** Chef de projet a soumis le macro-planning pour validation PMO. */
        PLANNING_SUBMITTED,
        /** PMO a validé le macro-planning — tâches débloquées pour le chef de projet. */
        PLANNING_VALIDATED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User recipient;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private Type type;

    @Column(nullable = false, length = 500)
    private String message;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @Column(name = "is_read", nullable = false)
    private boolean read = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }
}
