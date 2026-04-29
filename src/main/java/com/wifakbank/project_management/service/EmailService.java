package com.wifakbank.project_management.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.notifications.email.enabled:false}")
    private boolean emailEnabled;

    @Value("${app.notifications.email.from:no-reply@project-management.local}")
    private String fromAddress;

    @Async
    public void sendEmail(String to, String subject, String content) {
        sendEmailInternal(to, subject, content);
    }

    public boolean sendEmailSync(String to, String subject, String content) {
        return sendEmailInternal(to, subject, content);
    }

    private boolean sendEmailInternal(String to, String subject, String content) {
        log.info("EmailService.sendEmail called (to='{}', subject='{}')", to, subject);
        if (!emailEnabled) {
            log.warn("Email sending skipped because app.notifications.email.enabled=false");
            return false;
        }
        if (to == null || to.isBlank()) {
            log.warn("Email sending skipped because recipient address is empty");
            return false;
        }

        try {
            String effectiveFrom = (fromAddress == null || fromAddress.isBlank()) ? null : fromAddress.trim();
            log.info("Preparing email to '{}' from '{}'", to, effectiveFrom);
            var message = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(message, true, "UTF-8");
            if (effectiveFrom != null) {
                helper.setFrom(effectiveFrom);
            }
            helper.setTo(to);
            helper.setSubject(subject == null ? "(no-subject)" : subject);
            helper.setText(content == null ? "" : content, true);
            log.info("Sending email to '{}'", to);
            mailSender.send(message);
            log.info("Email sent successfully to '{}'", to);
            return true;
        } catch (MailException | jakarta.mail.MessagingException ex) {
            log.error("Failed to send email to '{}': {}", to, ex.getMessage(), ex);
            return false;
        }
    }
}
