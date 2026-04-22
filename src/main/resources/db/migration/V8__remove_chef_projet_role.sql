-- Remap any existing CHEF_PROJET users to METIER since CHEF_PROJET
-- is no longer a user role. Chef de projet is now purely a project-level
-- assignment (projects.chef_projet_user_id) done by MANAGER / ADMINISTRATEUR.
UPDATE users SET role = 'METIER' WHERE role = 'CHEF_PROJET';
