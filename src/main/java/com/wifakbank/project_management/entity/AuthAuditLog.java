package com.wifakbank.project_management.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "auth_audit_logs")
@Getter
@Setter
public class AuthAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "username_or_email", nullable = false, length = 150)
    private String usernameOrEmail;

    @Column(nullable = false)
    private boolean success;

    @Column(nullable = false, length = 50)
    private String reason;

    @Column(name = "ip_address", nullable = false, length = 50)
    private String ipAddress;

    @Column(nullable = false)
    private Instant timestamp;

    @PrePersist
    void onCreate() {
        this.timestamp = Instant.now();
    }
}
