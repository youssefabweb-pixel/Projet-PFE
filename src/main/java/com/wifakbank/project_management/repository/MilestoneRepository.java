package com.wifakbank.project_management.repository;

import com.wifakbank.project_management.entity.Milestone;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.time.LocalDate;

@Repository
public interface MilestoneRepository extends JpaRepository<Milestone, Long> {
    List<Milestone> findByProjectId(Long projectId);

    @EntityGraph(attributePaths = {"project", "tasks", "tasks.dependsOn", "tasks.assignee"})
    @Query("SELECT m FROM Milestone m WHERE m.id = :id")
    Optional<Milestone> findByIdWithProject(@Param("id") Long id);

    boolean existsByProjectIdAndTitleIgnoreCase(Long projectId, String title);

    boolean existsByProjectIdAndTitleIgnoreCaseAndIdNot(Long projectId, String title, Long id);

    @EntityGraph(attributePaths = {"project", "project.chefProjet"})
    List<Milestone> findByDeadline(LocalDate deadline);
}
