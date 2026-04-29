package com.wifakbank.project_management.service;

import com.wifakbank.project_management.dto.response.ActionHistoryResponse;
import com.wifakbank.project_management.entity.ActionHistory;
import com.wifakbank.project_management.exception.AppException;
import com.wifakbank.project_management.repository.ActionHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ActionHistoryService {

    private final ActionHistoryRepository repository;

    public void record(String username, String action, String entity, Long projectId, String details) {
        ActionHistory h = new ActionHistory();
        h.setUsername(username != null ? username : "system");
        h.setAction(action);
        h.setEntity(entity);
        h.setProjectId(projectId);
        h.setDetails(details);
        repository.save(h);
    }

    /** Resolves caller from Spring Security context, then records the action. */
    public void recordFromContext(String action, String entity, Long projectId, String details) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = (auth != null && auth.isAuthenticated()) ? auth.getName() : "system";
        record(username, action, entity, projectId, details);
    }

    @Transactional(readOnly = true)
    public List<ActionHistoryResponse> getAll() {
        return repository.findAllByOrderByTimestampDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void deleteById(Long id) {
        if (!repository.existsById(id)) {
            throw new AppException("HISTORY_NOT_FOUND", "Entrée d'historique introuvable", HttpStatus.NOT_FOUND);
        }
        repository.deleteById(id);
    }

    @Transactional
    public void deleteAll() {
        repository.deleteAll();
    }

    private ActionHistoryResponse toResponse(ActionHistory h) {
        return ActionHistoryResponse.builder()
                .id(h.getId())
                .username(h.getUsername())
                .action(h.getAction())
                .entity(h.getEntity())
                .projectId(h.getProjectId())
                .details(h.getDetails())
                .timestamp(h.getTimestamp())
                .build();
    }
}
