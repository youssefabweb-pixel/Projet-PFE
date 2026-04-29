package com.wifakbank.project_management.repository;

import com.wifakbank.project_management.entity.Task;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    @EntityGraph(attributePaths = {"dependsOn", "dependencyTask", "assignee"})
    List<Task> findByMilestoneId(Long milestoneId);

    @EntityGraph(attributePaths = {"dependsOn", "dependencyTask", "assignee", "milestone", "milestone.project"})
    @Query("SELECT t FROM Task t WHERE t.id = :id")
    Optional<Task> findWithPlanningContextById(@Param("id") Long id);
}
