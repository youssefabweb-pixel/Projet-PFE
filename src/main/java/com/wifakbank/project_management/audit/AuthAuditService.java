package com.wifakbank.project_management.audit;

import com.wifakbank.project_management.entity.AuthAuditLog;
import com.wifakbank.project_management.repository.AuthAuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthAuditService {

    private final AuthAuditLogRepository authAuditLogRepository;

    public void log(String usernameOrEmail, boolean success, String reason, String ipAddress) {
        AuthAuditLog entry = new AuthAuditLog();
        entry.setUsernameOrEmail(usernameOrEmail);
        entry.setSuccess(success);
        entry.setReason(reason);
        entry.setIpAddress(ipAddress);
        authAuditLogRepository.save(entry);
    }
}
