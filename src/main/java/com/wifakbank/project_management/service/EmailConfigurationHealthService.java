package com.wifakbank.project_management.service;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class EmailConfigurationHealthService {

    @Value("${app.notifications.email.enabled:false}")
    private boolean emailEnabled;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Value("${spring.mail.port:0}")
    private int mailPort;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.properties.mail.smtp.auth:false}")
    private boolean smtpAuth;

    @PostConstruct
    void validateEmailConfigurationAtStartup() {
        if (!emailEnabled) {
            log.warn("Email notifications are disabled (app.notifications.email.enabled=false).");
            return;
        }

        log.info("Email notifications enabled. SMTP host='{}', port={}, username='{}'",
                mailHost, mailPort, mask(mailUsername));

        if (mailHost == null || mailHost.isBlank()) {
            log.error("SMTP host is empty. Set MAIL_HOST or spring.mail.host.");
        } else if ("localhost".equalsIgnoreCase(mailHost.trim())) {
            log.warn("SMTP host is localhost. Unless a local SMTP server is running, no email will be delivered.");
        }

        if (mailPort <= 0) {
            log.error("SMTP port is invalid ({}). Set MAIL_PORT or spring.mail.port.", mailPort);
        }

        if (smtpAuth && (mailUsername == null || mailUsername.isBlank())) {
            log.error("SMTP auth is enabled but username is empty. Set MAIL_USERNAME or spring.mail.username.");
        }
    }

    private String mask(String value) {
        if (value == null || value.isBlank()) {
            return "(empty)";
        }
        int at = value.indexOf('@');
        if (at <= 1) {
            return "***";
        }
        return value.charAt(0) + "***" + value.substring(at);
    }
}
