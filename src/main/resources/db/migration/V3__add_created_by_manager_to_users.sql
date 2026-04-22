ALTER TABLE users
    ADD COLUMN created_by_manager_id BIGINT NULL;

CREATE INDEX idx_users_created_by_manager_id ON users(created_by_manager_id);
