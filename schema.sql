-- Tabla de leads capturados desde los formularios de recursos por libro
-- (independiente de tus suscriptores de MailerLite del newsletter general)
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  book TEXT NOT NULL,              -- id interno del libro (ej: "book01", "book_en_04")
  resource_key TEXT NOT NULL,      -- nombre del archivo dentro del bucket R2
  token TEXT NOT NULL UNIQUE,      -- token único para el link de descarga personal
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  email_sent INTEGER NOT NULL DEFAULT 0,
  downloaded_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_token ON leads(token);