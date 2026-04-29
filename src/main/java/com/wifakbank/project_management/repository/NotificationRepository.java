package com.wifakbank.project_management.repository;

import com.wifakbank.project_management.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.time.Instant;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId);

    long countByRecipientIdAndReadFalse(Long recipientId);

    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.recipient.id = :userId AND n.read = false")
    int markAllReadForUser(@Param("userId") Long userId);

    boolean existsByRecipientIdAndTypeAndProjectIdAndMessageAndCreatedAtBetween(
            Long recipientId,
            Notification.Type type,
            Long projectId,
            String message,
            Instant start,
            Instant end
    );
}
