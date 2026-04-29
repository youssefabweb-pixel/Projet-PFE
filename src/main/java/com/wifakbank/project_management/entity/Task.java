package com.wifakbank.project_management.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "tasks")
@Getter
@Setter
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(length = 2000)
    private String description;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "progress_percent", nullable = false)
    private int progressPercent = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private TaskStatus status = TaskStatus.NOT_STARTED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "milestone_id", nullable = false)
    private Milestone milestone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private User assignee;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private TaskPriority priority = TaskPriority.MOYENNE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dependency_task_id")
    private Task dependencyTask;

    /**
     * Optional multiple predecessors (see {@code task_dependencies}). Legacy {@link #dependencyTask} remains
     * for backward compatibility and is kept in sync when possible.
     */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "task_dependencies",
            joinColumns = @JoinColumn(name = "task_id"),
            inverseJoinColumns = @JoinColumn(name = "depends_on_task_id"))
    private Set<Task> dependsOn = new HashSet<>();

    @Column(name = "deliverable_url", length = 2000)
    private String deliverableUrl;

    @Column(name = "deliverable_label", length = 500)
    private String deliverableLabel;

    @Column(length = 2000)
    private String justification;

    @Column(name = "actual_end_date")
    private LocalDate actualEndDate;
}
