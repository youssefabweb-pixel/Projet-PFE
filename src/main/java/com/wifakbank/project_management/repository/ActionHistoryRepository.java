package com.wifakbank.project_management.repository;

import com.wifakbank.project_management.entity.ActionHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ActionHistoryRepository extends JpaRepository<ActionHistory, Long> {

    List<ActionHistory> findAllByOrderByTimestampDesc();
}
