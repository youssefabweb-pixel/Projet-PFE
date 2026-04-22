-- Alignement avec l’entité Project.cpEditingUnlocked (MySQL / H2).
-- Si la colonne existe déjà en MySQL sans DEFAULT, exécuter manuellement avant Flyway :
-- ALTER TABLE projects MODIFY cp_editing_unlocked TINYINT(1) NOT NULL DEFAULT 0;
-- puis marquer cette migration comme appliquée ou ignorer l’erreur « duplicate column ».

ALTER TABLE projects ADD COLUMN cp_editing_unlocked BOOLEAN NOT NULL DEFAULT FALSE;
