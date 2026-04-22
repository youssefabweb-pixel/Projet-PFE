package com.wifakbank.project_management.repository;

import com.wifakbank.project_management.entity.Deliverable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeliverableRepository extends JpaRepository<Deliverable, Long> {
    List<Deliverable> findByProjectIdOrderByIdAsc(Long projectId);
}
