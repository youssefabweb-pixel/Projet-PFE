package com.wifakbank.project_management.controller;

import com.wifakbank.project_management.dto.response.NotificationResponse;
import com.wifakbank.project_management.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Notifications", description = "Notifications de l'utilisateur connecté")
public class NotificationController {

    private final NotificationService notificationService;

    @Operation(summary = "Liste des notifications de l'utilisateur connecté")
    @GetMapping
    public List<NotificationResponse> list(Authentication authentication) {
        return notificationService.listMine(authentication.getName());
    }

    @Operation(summary = "Nombre de notifications non lues")
    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(Authentication authentication) {
        return Map.of("count", notificationService.unreadCount(authentication.getName()));
    }

    @Operation(summary = "Marquer une notification comme lue")
    @PatchMapping("/{id}/read")
    public NotificationResponse markRead(@PathVariable Long id, Authentication authentication) {
        return notificationService.markRead(id, authentication.getName());
    }

    @Operation(summary = "Marquer toutes les notifications comme lues")
    @PatchMapping("/read-all")
    public Map<String, String> markAllRead(Authentication authentication) {
        notificationService.markAllRead(authentication.getName());
        return Map.of("status", "ok");
    }
}
