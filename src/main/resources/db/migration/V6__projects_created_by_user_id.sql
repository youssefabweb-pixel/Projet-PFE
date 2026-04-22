-- Colonne alignée avec Project.createdByUserId (certaines bases MySQL l’avaient déjà à la main).
-- Si la colonne existe déjà : ignorer cette migration ou la retirer de l’historique Flyway pour cet environnement.

ALTER TABLE projects ADD COLUMN created_by_user_id BIGINT;

UPDATE projects SET created_by_user_id = created_by_id WHERE created_by_user_id IS NULL;
