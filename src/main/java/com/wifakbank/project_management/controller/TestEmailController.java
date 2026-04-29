package com.wifakbank.project_management.controller;

import com.wifakbank.project_management.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TestEmailController {

    private final EmailService emailService;

    @PostMapping("/test-email")
    public ResponseEntity<Map<String, String>> sendTestEmail(
            @RequestParam String to,
            @RequestParam(defaultValue = "Test email from Project Management") String subject,
            @RequestParam(defaultValue = "<p>Email test OK</p><p>If you receive this, SMTP is working.</p>") String content
    ) {
        boolean sent = emailService.sendEmailSync(to, subject, content);
        return ResponseEntity.ok(Map.of(
                "message", sent ? "Test email sent successfully" : "Email not sent - check backend logs/config",
                "to", to
        ));
    }
}
