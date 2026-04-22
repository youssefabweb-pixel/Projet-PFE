CREATE TABLE projects (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(8000),
    status VARCHAR(32) NOT NULL,
    progress_percent INT NOT NULL,
    planned_start_date DATE NOT NULL,
    planned_end_date DATE,
    chef_projet_id BIGINT,
    created_by_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_projects_chef FOREIGN KEY (chef_projet_id) REFERENCES users (id),
    CONSTRAINT fk_projects_created_by FOREIGN KEY (created_by_id) REFERENCES users (id)
);

CREATE TABLE project_members (
    project_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    PRIMARY KEY (project_id, user_id),
    CONSTRAINT fk_pm_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
    CONSTRAINT fk_pm_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX idx_projects_updated_at ON projects (updated_at);
CREATE INDEX idx_pm_user ON project_members (user_id);
