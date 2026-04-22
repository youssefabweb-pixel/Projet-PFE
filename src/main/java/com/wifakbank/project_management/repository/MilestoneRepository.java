package com.wifakbank.project_management.repository;

import com.wifakbank.project_management.entity.Milestone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MilestoneRepository extends JpaRepository<Milestone, Long> {
    List<Milestone> findByProjectId(Long projectId);

    boolean existsByProjectIdAndTitleIgnoreCase(Long projectId, String title);

    boolean existsByProjectIdAndTitleIgnoreCaseAndIdNot(Long projectId, String title, Long id);
}
