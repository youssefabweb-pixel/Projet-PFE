package com.wifakbank.project_management.service;

import com.wifakbank.project_management.dto.response.NotificationResponse;
import com.wifakbank.project_management.entity.Milestone;
import com.wifakbank.project_management.entity.Notification;
import com.wifakbank.project_management.entity.Project;
import com.wifakbank.project_management.entity.Role;
import com.wifakbank.project_management.entity.User;
import com.wifakbank.project_management.exception.AppException;
import com.wifakbank.project_management.repository.NotificationRepository;
import com.wifakbank.project_management.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    @Transactional
    public void notify(User recipient, Notification.Type type, String message, Project project) {
        if (recipient == null) {
            return;
        }
        createInAppNotification(recipient, type, message, project);
    }

    @Transactional
    public void notifyProjectCompleted(Project project) {
        if (project == null) {
            return;
        }
        log.info("notifyProjectCompleted triggered for project id={}, code={}", project.getId(), project.getCode());

        String subject = "Projet termine - " + safe(project.getCode());
        String content = wrapHtmlTemplate(
                "Projet termine",
                "<p>Le projet <strong>" + safe(project.getName()) + "</strong> est passe au statut <strong>TERMINE</strong>.</p>"
                        + "<p>Code projet: <strong>" + safe(project.getCode()) + "</strong></p>"
                        + "<p>Date de fin: <strong>" + LocalDate.now() + "</strong></p>"
        );

        for (User manager : loadPmoManagers()) {
            log.info("Sending project completed notification to manager id={}, email={}", manager.getId(), manager.getEmail());
            createInAppNotification(
                    manager,
                    Notification.Type.PROJECT_COMPLETED,
                    "Le projet " + project.getName() + " est termine.",
                    project
            );
            emailService.sendEmail(manager.getEmail(), subject, content);
        }
    }

    @Transactional
    public void notifyDelay(Project project, Milestone milestone) {
        log.info("notifyDelay triggered (projectId={}, milestoneId={})",
                project != null ? project.getId() : null,
                milestone != null ? milestone.getId() : null);
        Set<User> recipients = loadPmoManagers();
        if (recipients.isEmpty()) {
            return;
        }

        boolean projectDelay = project != null && project.getPlannedEndDate() != null
                && project.getPlannedEndDate().isBefore(LocalDate.now());

        if (projectDelay) {
            String subject = "Alerte retard projet - " + safe(project.getCode());
            String content = wrapHtmlTemplate(
                    "Alerte retard projet",
                    "<p>Le projet <strong>" + safe(project.getName()) + "</strong> est en retard.</p>"
                            + "<p>Date de fin prevue: <strong>" + project.getPlannedEndDate() + "</strong></p>"
            );
            for (User manager : recipients) {
                log.info("Sending project delay notification to manager id={}, email={}", manager.getId(), manager.getEmail());
                createInAppNotification(
                        manager,
                        Notification.Type.PROJECT_DELAYED,
                        "Le projet " + project.getName() + " est en retard.",
                        project
                );
                emailService.sendEmail(manager.getEmail(), subject, content);
            }
        }

        if (milestone != null && milestone.getProject() != null) {
            Project p = milestone.getProject();
            String subject = "Alerte retard jalon - " + safe(p.getCode());
            String content = wrapHtmlTemplate(
                    "Alerte retard jalon",
                    "<p>Le jalon <strong>" + safe(milestone.getTitle()) + "</strong> du projet <strong>"
                            + safe(p.getName()) + "</strong> est en retard.</p>"
                            + "<p>Echeance jalon: <strong>" + milestone.getDeadline() + "</strong></p>"
            );
            for (User manager : recipients) {
                log.info("Sending milestone delay notification to manager id={}, email={}", manager.getId(), manager.getEmail());
                createInAppNotification(
                        manager,
                        Notification.Type.MILESTONE_DELAYED,
                        "Le jalon " + milestone.getTitle() + " est en retard.",
                        p
                );
                emailService.sendEmail(manager.getEmail(), subject, content);
            }
        }
    }

    @Transactional
    public void notifyNewProject(Project project) {
        if (project == null) {
            return;
        }
        log.info("notifyNewProject triggered for project id={}, code={}", project.getId(), project.getCode());

        Set<User> recipients = new LinkedHashSet<>();
        recipients.addAll(loadPmoManagers());
        if (project.getChefProjet() != null) {
            recipients.add(project.getChefProjet());
        }

        String subject = "Nouveau projet cree - " + safe(project.getCode());
        String content = wrapHtmlTemplate(
                "Nouveau projet",
                "<p>Un nouveau projet a ete cree.</p>"
                        + "<p>Nom: <strong>" + safe(project.getName()) + "</strong></p>"
                        + "<p>Code: <strong>" + safe(project.getCode()) + "</strong></p>"
        );

        for (User recipient : recipients) {
            log.info("Sending new project notification to recipient id={}, email={}", recipient.getId(), recipient.getEmail());
            createInAppNotification(
                    recipient,
                    Notification.Type.NEW_PROJECT_CREATED,
                    "Nouveau projet cree : " + project.getName(),
                    project
            );
            emailService.sendEmail(recipient.getEmail(), subject, content);
        }
    }

    @Transactional
    public void notifyParticipants(Project project, Collection<User> participants, String assignmentScope, String assignmentLabel) {
        if (project == null || participants == null || participants.isEmpty()) {
            return;
        }

        log.info("notifyParticipants triggered for project id={}, scope={}, label={}",
                project.getId(), assignmentScope, assignmentLabel);
        Set<User> uniqueRecipients = participants.stream()
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        if (uniqueRecipients.isEmpty()) {
            return;
        }

        String scope = safe(assignmentScope);
        String label = safe(assignmentLabel);
        String subject = "Nouvelle affectation " + scope.toLowerCase() + " - " + safe(project.getCode());
        String content = wrapHtmlTemplate(
                "Notification d'affectation",
                "<p>Vous avez ete affecte a un(e) <strong>" + scope + "</strong>.</p>"
                        + "<p>Projet: <strong>" + safe(project.getName()) + "</strong></p>"
                        + "<p>Element: <strong>" + label + "</strong></p>"
        );

        for (User participant : uniqueRecipients) {
            log.info("Sending participant notification to user id={}, email={}", participant.getId(), participant.getEmail());
            Notification.Type type = switch (scope) {
                case "TASK" -> Notification.Type.TASK_ASSIGNED;
                case "PROJECT" -> Notification.Type.PROJECT_MEMBER_ADDED;
                default -> Notification.Type.PROJECT_MEMBER_ADDED;
            };
            createInAppNotification(
                    participant,
                    type,
                    "Vous avez ete assigne a " + scope.toLowerCase() + " : " + label,
                    project
            );
            emailService.sendEmail(participant.getEmail(), subject, content);
        }
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> listMine(String username) {
        User user = loadUser(username);
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(user.getId())
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public long unreadCount(String username) {
        User user = loadUser(username);
        return notificationRepository.countByRecipientIdAndReadFalse(user.getId());
    }

    @Transactional
    public NotificationResponse markRead(Long id, String username) {
        User user = loadUser(username);
        Notification n = notificationRepository.findById(id)
                .orElseThrow(() -> new AppException("NOTIFICATION_NOT_FOUND", "Notification introuvable", HttpStatus.NOT_FOUND));
        if (!n.getRecipient().getId().equals(user.getId())) {
            throw new AppException("ACCESS_DENIED", "Notification non accessible", HttpStatus.FORBIDDEN);
        }
        n.setRead(true);
        return toResponse(notificationRepository.save(n));
    }

    @Transactional
    public void markAllRead(String username) {
        User user = loadUser(username);
        notificationRepository.markAllReadForUser(user.getId());
    }

    @Transactional(readOnly = true)
    public boolean sendTestEmail(String username) {
        User user = loadUser(username);
        String subject = "Test email - Project Management";
        String content = wrapHtmlTemplate(
                "Test de configuration email",
                "<p>Cet email confirme que votre configuration SMTP est operationnelle.</p>"
                        + "<p>Utilisateur: <strong>" + safe(user.getUsername()) + "</strong></p>"
                        + "<p>Email cible: <strong>" + safe(user.getEmail()) + "</strong></p>"
        );
        return emailService.sendEmailSync(user.getEmail(), subject, content);
    }

    private User loadUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException("USER_NOT_FOUND", "Utilisateur introuvable", HttpStatus.UNAUTHORIZED));
    }

    private Set<User> loadPmoManagers() {
        return new LinkedHashSet<>(userRepository.findByRole(Role.MANAGER).stream()
                .filter(User::isEnabled)
                .filter(u -> u.getEmail() != null && !u.getEmail().isBlank())
                .toList());
    }

    private void createInAppNotification(User recipient, Notification.Type type, String message, Project project) {
        Notification n = new Notification();
        n.setRecipient(recipient);
        n.setType(type);
        n.setMessage(message);
        n.setProject(project);
        notificationRepository.save(n);
    }

    private String wrapHtmlTemplate(String title, String bodyHtml) {
        return "<html><body style='font-family:Arial,sans-serif;color:#1f2937;'>"
                + "<h2 style='color:#0f766e;'>" + safe(title) + "</h2>"
                + bodyHtml
                + "<hr/>"
                + "<p style='font-size:12px;color:#6b7280;'>Email automatique - Project Management Platform</p>"
                + "</body></html>";
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .type(n.getType().name())
                .message(n.getMessage())
                .projectId(n.getProject() != null ? n.getProject().getId() : null)
                .read(n.isRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
