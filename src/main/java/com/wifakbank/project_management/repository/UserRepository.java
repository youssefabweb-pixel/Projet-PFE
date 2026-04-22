package com.wifakbank.project_management.repository;

import com.wifakbank.project_management.entity.Role;
import com.wifakbank.project_management.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Optional<User> findByUsernameOrEmail(String username, String email);

    boolean existsByRole(Role role);
    java.util.List<User> findByRole(Role role);
}
