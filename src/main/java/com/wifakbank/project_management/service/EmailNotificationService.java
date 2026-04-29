package com.wifakbank.project_management.service;
 
import com.wifakbank.project_management.entity.Notification;
import com.wifakbank.project_management.entity.Project;
import com.wifakbank.project_management.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailNotificationService {

    private final JavaMailSender mailSender;

    @Value("${app.notifications.email.enabled:false}")
    private boolean emailEnabled;

    @Value("${app.notifications.email.from:no-reply@project-management.local}")
    private String fromAddress;

    @Value("${app.notifications.frontend-base-url:http://localhost:4200}")
    private String frontendBaseUrl;

    public void sendNotificationEmail(User recipient, Notification.Type type, String message, Project project) {
        if (!emailEnabled || recipient == null || recipient.getEmail() == null || recipient.getEmail().isBlank()) {
            return;
        }

        String subject = buildSubject(type, project);
        String body = buildBody(message, project);

        try {
            SimpleMailMessage email = new SimpleMailMessage();
            email.setFrom(fromAddress);
            email.setTo(recipient.getEmail());
            email.setSubject(subject);
            email.setText(body);
            mailSender.send(email);
        } catch (MailException ex) {
            // Do not block business flow if mail transport fails.
            log.warn("Failed to send notification email to '{}': {}", recipient.getEmail(), ex.getMessage());
        }
    }

    private String buildSubject(Notification.Type type, Project project) {
        String projectCode = project != null ? project.getCode() : null;
        String suffix = (projectCode != null && !projectCode.isBlank()) ? " [" + projectCode + "]" : "";

        return switch (type) {
            case PROJECT_ASSIGNED_AS_CHEF -> "Nouvelle affectation chef de projet" + suffix;
            case PROJECT_MEMBER_ADDED -> "Affectation au projet" + suffix;
            case PROJECT_PROGRESS_UPDATED -> "Mise a jour d'avancement projet" + suffix;
            case PROJECT_COMPLETED -> "Projet termine" + suffix;
            case PROJECT_DELAYED -> "Alerte retard projet" + suffix;
            case MILESTONE_DELAYED -> "Alerte retard jalon" + suffix;
            case MILESTONE_REMINDER_J_MINUS_1 -> "Rappel jalon J-1" + suffix;
            case MILESTONE_REMINDER_J_PLUS_1 -> "Rappel jalon J+1" + suffix;
            case NEW_PROJECT_CREATED -> "Nouveau projet" + suffix;
            case TASK_ASSIGNED -> "Affectation tache" + suffix;
            case PLANNING_SUBMITTED -> "Planning soumis pour validation" + suffix;
            case PLANNING_VALIDATED -> "Planning valide - taches debloquees" + suffix;
        };
    }

    private String buildBody(String message, Project project) {
        StringBuilder body = new StringBuilder();
        body.append("Bonjour,\n\n");
        body.append(message).append("\n\n");

        if (project != null && project.getId() != null) {
            body.append("Projet: ").append(nullSafe(project.getName())).append("\n");
            body.append("Code: ").append(nullSafe(project.getCode())).append("\n");
            body.append("Lien: ").append(buildProjectLink(project.getId())).append("\n\n");
        }

        body.append("Ceci est un email automatique du systeme de gestion de projet.");
        return body.toString();
    }

    private String buildProjectLink(Long projectId) {
        String base = frontendBaseUrl.endsWith("/") ? frontendBaseUrl.substring(0, frontendBaseUrl.length() - 1) : frontendBaseUrl;
        return base + "/tasks?projectId=" + projectId;
    }

    private String nullSafe(String value) {
        return value == null ? "-" : value;
    }
}
