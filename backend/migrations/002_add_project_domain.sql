ALTER TABLE projects ADD COLUMN domain TEXT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_domain ON projects(domain);
