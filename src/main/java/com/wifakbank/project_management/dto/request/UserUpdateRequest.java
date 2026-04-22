package com.wifakbank.project_management.dto.request;

import com.wifakbank.project_management.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserUpdateRequest {

    @Email
    @NotBlank
    @Size(max = 150)
    private String email;

    /**
     * Si null ou vide, le mot de passe n'est pas modifié.
     */
    @Size(min = 8, max = 100)
    private String password;

    @NotNull
    private Role role;

    private boolean enabled;
}
