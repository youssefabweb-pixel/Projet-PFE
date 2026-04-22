package com.wifakbank.project_management.service;

import com.wifakbank.project_management.dto.request.UserCreateRequest;
import com.wifakbank.project_management.dto.request.UserUpdateRequest;
import com.wifakbank.project_management.entity.Role;
import com.wifakbank.project_management.dto.response.UserResponse;
import com.wifakbank.project_management.entity.User;
import com.wifakbank.project_management.exception.AppException;
import com.wifakbank.project_management.mapper.UserMapper;
import com.wifakbank.project_management.repository.ProjectRepository;
import com.wifakbank.project_management.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Arrays;

@Service
@RequiredArgsConstructor
public class UserAdminService {

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;

    @Transactional(readOnly = true)
    public List<UserResponse> findAll() {
        return userRepository.findAll().stream()
                .map(userMapper::toResponse)
                .sorted((a, b) -> Long.compare(a.getId(), b.getId()))
                .toList();
    }

    @Transactional(readOnly = true)
    public UserResponse findById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException("USER_NOT_FOUND", "User not found", HttpStatus.NOT_FOUND));
        return userMapper.toResponse(user);
    }

    @Transactional(readOnly = true)
    public List<String> getAvailableRoles() {
        return Arrays.stream(Role.values())
                .map(Enum::name)
                .toList();
    }

    @Transactional
    public UserResponse create(UserCreateRequest request, String managerUsername) {
        User manager = userRepository.findByUsername(managerUsername).orElse(null);
        userRepository.findByUsername(request.getUsername()).ifPresent(u -> {
            throw new AppException("USERNAME_EXISTS", "Username already exists", HttpStatus.CONFLICT);
        });
        userRepository.findByEmail(request.getEmail()).ifPresent(u -> {
            throw new AppException("EMAIL_EXISTS", "Email already exists", HttpStatus.CONFLICT);
        });
        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole());
        user.setEnabled(request.isEnabled());
        if (manager != null && manager.getRole() == Role.MANAGER) {
            user.setCreatedByManagerId(manager.getId());
        }
        return userMapper.toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse update(Long id, UserUpdateRequest request, String actorUsername) {
        User actor = userRepository.findByUsername(actorUsername)
                .orElseThrow(() -> new AppException("USER_NOT_FOUND", "Actor not found", HttpStatus.NOT_FOUND));
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException("USER_NOT_FOUND", "User not found", HttpStatus.NOT_FOUND));
        assertActorCanModifyUser(actor, user, true);
        userRepository.findByEmail(request.getEmail()).ifPresent(other -> {
            if (!other.getId().equals(id)) {
                throw new AppException("EMAIL_EXISTS", "Email already in use", HttpStatus.CONFLICT);
            }
        });
        user.setEmail(request.getEmail());
        user.setRole(request.getRole());
        user.setEnabled(request.isEnabled());
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }
        return userMapper.toResponse(userRepository.save(user));
    }

    @Transactional
    public void delete(Long id, String actorUsername) {
        User actor = userRepository.findByUsername(actorUsername)
                .orElseThrow(() -> new AppException("USER_NOT_FOUND", "Actor not found", HttpStatus.NOT_FOUND));
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException("USER_NOT_FOUND", "User not found", HttpStatus.NOT_FOUND));
        assertActorCanModifyUser(actor, user, false);
        if (isLinkedToAnyProject(id)) {
            throw new AppException(
                    "USER_LINKED_TO_PROJECT",
                    "Suppression impossible : l'utilisateur est lié à un ou plusieurs projets.",
                    HttpStatus.CONFLICT
            );
        }
        userRepository.deleteById(id);
    }

    @Transactional
    public UserResponse setEnabled(Long id, boolean enabled, String actorUsername) {
        User actor = userRepository.findByUsername(actorUsername)
                .orElseThrow(() -> new AppException("USER_NOT_FOUND", "Actor not found", HttpStatus.NOT_FOUND));
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException("USER_NOT_FOUND", "User not found", HttpStatus.NOT_FOUND));
        if (actor.getRole() == Role.ADMINISTRATEUR) {
            user.setEnabled(enabled);
            return userMapper.toResponse(userRepository.save(user));
        }
        if (actor.getRole() != Role.MANAGER) {
            throw new AppException("FORBIDDEN", "Insufficient role to change user status", HttpStatus.FORBIDDEN);
        }
        if (user.getCreatedByManagerId() == null || !user.getCreatedByManagerId().equals(actor.getId())) {
            throw new AppException("FORBIDDEN", "You can only activate/deactivate users you created", HttpStatus.FORBIDDEN);
        }
        user.setEnabled(enabled);
        return userMapper.toResponse(userRepository.save(user));
    }

    /**
     * @param allowSelfForManager when true, a MANAGER may update their own account (email, password, etc.)
     */
    private void assertActorCanModifyUser(User actor, User target, boolean allowSelfForManager) {
        if (actor.getRole() == Role.ADMINISTRATEUR) {
            return;
        }
        if (actor.getRole() != Role.MANAGER) {
            throw new AppException("FORBIDDEN", "Insufficient role to modify this user", HttpStatus.FORBIDDEN);
        }
        if (allowSelfForManager && actor.getId().equals(target.getId())) {
            return;
        }
        if (target.getCreatedByManagerId() != null && target.getCreatedByManagerId().equals(actor.getId())) {
            return;
        }
        throw new AppException("FORBIDDEN", "You can only manage users you created", HttpStatus.FORBIDDEN);
    }

    private boolean isLinkedToAnyProject(Long userId) {
        return projectRepository.existsByCreatedBy_Id(userId)
                || projectRepository.existsByChefProjet_Id(userId)
                || projectRepository.existsByMembers_Id(userId);
    }
}
