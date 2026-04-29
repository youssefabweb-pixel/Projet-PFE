-- Compatibility bootstrap: some environments missed task/milestone DDL before this migration.
CREATE TABLE IF NOT EXISTS milestones (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(2000),
    deadline DATE NOT NULL,
    actual_end_date DATE,
    progress_percent INT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL,
    justification VARCHAR(2000),
    action_plan VARCHAR(2000),
    project_id BIGINT NOT NULL,
    CONSTRAINT fk_milestone_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(2000),
    start_date DATE,
    end_date DATE,
    progress_percent INT NOT NULL DEFAULT 0,
    status VARCHAR(24) NOT NULL,
    milestone_id BIGINT NOT NULL,
    assignee_id BIGINT,
    priority VARCHAR(20),
    dependency_task_id BIGINT,
    deliverable_url VARCHAR(2000),
    deliverable_label VARCHAR(500),
    justification VARCHAR(2000),
    actual_end_date DATE,
    CONSTRAINT fk_task_milestone FOREIGN KEY (milestone_id) REFERENCES milestones (id) ON DELETE CASCADE,
    CONSTRAINT fk_task_assignee FOREIGN KEY (assignee_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_task_dependency FOREIGN KEY (dependency_task_id) REFERENCES tasks (id) ON DELETE SET NULL
);

-- Optional multi-predecessors per task (legacy dependency_task_id kept for compatibility).
CREATE TABLE IF NOT EXISTS task_dependencies (
    task_id BIGINT NOT NULL,
    depends_on_task_id BIGINT NOT NULL,
    PRIMARY KEY (task_id, depends_on_task_id),
    CONSTRAINT fk_task_dep_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
    CONSTRAINT fk_task_dep_pred FOREIGN KEY (depends_on_task_id) REFERENCES tasks (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_dep_pred ON task_dependencies (depends_on_task_id);

-- Backfill from legacy single FK when join rows are missing.
INSERT INTO task_dependencies (task_id, depends_on_task_id)
SELECT t.id, t.dependency_task_id
FROM tasks t
WHERE t.dependency_task_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM task_dependencies td
      WHERE td.task_id = t.id
        AND td.depends_on_task_id = t.dependency_task_id
  );

-- Livrables optionnels sur la tâche (safe re-run).
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deliverable_url VARCHAR(2000);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deliverable_label VARCHAR(500);
