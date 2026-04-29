package com.wifakbank.project_management.service;

import com.wifakbank.project_management.entity.Milestone;
import com.wifakbank.project_management.entity.MilestoneStatus;
import com.wifakbank.project_management.entity.Notification;
import com.wifakbank.project_management.entity.Project;
import com.wifakbank.project_management.entity.Role;
import com.wifakbank.project_management.entity.User;
import com.wifakbank.project_management.repository.MilestoneRepository;
import com.wifakbank.project_management.repository.NotificationRepository;
import com.wifakbank.project_management.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class MilestoneReminderSchedulerService {

    private static final ZoneId DEFAULT_ZONE = ZoneId.of("Africa/Tunis");
    private final MilestoneRepository milestoneRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;

    @Scheduled(cron = "${app.notifications.milestone-reminders.cron:0 0 8 * * *}",
            zone = "${app.notifications.milestone-reminders.zone:Africa/Tunis}")
    @Transactional
    public void sendDailyMilestoneReminders() {
        LocalDate today = LocalDate.now(DEFAULT_ZONE);
        processJMinus1(today.plusDays(1));
        processJPlus1(today.minusDays(1));
    }

    private void processJMinus1(LocalDate deadline) {
        List<Milestone> milestones = milestoneRepository.findByDeadline(deadline);
        for (Milestone milestone : milestones) {
            if (milestone.getProject() == null) {
                continue;
            }
            sendReminder(
                    milestone,
                    Notification.Type.MILESTONE_REMINDER_J_MINUS_1,
                    "Rappel jalon J-1 - " + safe(milestone.getProject().getCode()),
                    "Le jalon \"" + safe(milestone.getTitle()) + "\" du projet \"" + safe(milestone.getProject().getName())
                            + "\" arrive a echeance demain (" + milestone.getDeadline() + ")."
            );
        }
    }

    private void processJPlus1(LocalDate deadline) {
        List<Milestone> milestones = milestoneRepository.findByDeadline(deadline);
        for (Milestone milestone : milestones) {
            if (milestone.getProject() == null || isCompleted(milestone)) {
                continue;
            }
            sendReminder(
                    milestone,
                    Notification.Type.MILESTONE_REMINDER_J_PLUS_1,
                    "Rappel jalon J+1 - " + safe(milestone.getProject().getCode()),
                    "Le jalon \"" + safe(milestone.getTitle()) + "\" du projet \"" + safe(milestone.getProject().getName())
                            + "\" a depasse sa date de fin (" + milestone.getDeadline() + ")."
            );
        }
    }

    private void sendReminder(Milestone milestone,
                              Notification.Type notificationType,
                              String emailSubject,
                              String notificationText) {
        Project project = milestone.getProject();
        Set<User> recipients = buildRecipients(project);
        if (recipients.isEmpty()) {
            return;
        }

        String message = notificationText;
        String emailContent = wrapHtmlTemplate(
                "Rappel automatique jalon",
                "<p>" + escapeHtml(notificationText) + "</p>"
                        + "<p>Projet: <strong>" + escapeHtml(safe(project.getName())) + "</strong></p>"
                        + "<p>Code projet: <strong>" + escapeHtml(safe(project.getCode())) + "</strong></p>"
                        + "<p>Jalon: <strong>" + escapeHtml(safe(milestone.getTitle())) + "</strong></p>"
        );

        Instant dayStart = LocalDate.now(DEFAULT_ZONE).atStartOfDay(DEFAULT_ZONE).toInstant();
        Instant dayEnd = LocalDate.now(DEFAULT_ZONE).plusDays(1).atStartOfDay(DEFAULT_ZONE).toInstant();

        for (User recipient : recipients) {
            if (alreadySentToday(recipient, notificationType, project.getId(), message, dayStart, dayEnd)) {
                continue;
            }
            notificationService.notify(recipient, notificationType, message, project);
            emailService.sendEmail(recipient.getEmail(), emailSubject, emailContent);
        }
    }

    private boolean alreadySentToday(User recipient,
                                     Notification.Type type,
                                     Long projectId,
                                     String message,
                                     Instant dayStart,
                                     Instant dayEnd) {
        return notificationRepository.existsByRecipientIdAndTypeAndProjectIdAndMessageAndCreatedAtBetween(
                recipient.getId(),
                type,
                projectId,
                message,
                dayStart,
                dayEnd
        );
    }

    private Set<User> buildRecipients(Project project) {
        Set<User> recipients = new LinkedHashSet<>();
        if (project.getChefProjet() != null && project.getChefProjet().isEnabled() && hasEmail(project.getChefProjet())) {
            recipients.add(project.getChefProjet());
        }
        recipients.addAll(userRepository.findByRole(Role.MANAGER).stream()
                .filter(User::isEnabled)
                .filter(this::hasEmail)
                .toList());
        return recipients;
    }

    private boolean isCompleted(Milestone milestone) {
        return milestone.getStatus() == MilestoneStatus.TERMINE || milestone.getActualEndDate() != null;
    }

    private boolean hasEmail(User user) {
        return user.getEmail() != null && !user.getEmail().isBlank();
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }

    private String wrapHtmlTemplate(String title, String bodyHtml) {
        return "<html><body style='font-family:Arial,sans-serif;color:#1f2937;'>"
                + "<h2 style='color:#0f766e;'>" + escapeHtml(title) + "</h2>"
                + bodyHtml
                + "<hr/>"
                + "<p style='font-size:12px;color:#6b7280;'>Email automatique - Project Management Platform</p>"
                + "</body></html>";
    }

    private String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }
}
