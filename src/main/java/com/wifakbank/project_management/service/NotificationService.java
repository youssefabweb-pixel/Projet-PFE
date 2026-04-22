package com.wifakbank.project_management.service;

import com.wifakbank.project_management.dto.response.NotificationResponse;
import com.wifakbank.project_management.entity.Notification;
import com.wifakbank.project_management.entity.Project;
import com.wifakbank.project_management.entity.User;
import com.wifakbank.project_management.exception.AppException;
import com.wifakbank.project_management.repository.NotificationRepository;
import com.wifakbank.project_management.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Transactional
    public void notify(User recipient, Notification.Type type, String message, Project project) {
        if (recipient == null) {
            return;
        }
        Notification n = new Notification();
        n.setRecipient(recipient);
        n.setType(type);
        n.setMessage(message);
        n.setProject(project);
        notificationRepository.save(n);
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

    private User loadUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException("USER_NOT_FOUND", "Utilisateur introuvable", HttpStatus.UNAUTHORIZED));
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
