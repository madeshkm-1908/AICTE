const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const Database = require('better-sqlite3');
const { Pool } = require('pg');
const fs = require('fs');

const DATABASE_URL = process.env.DATABASE_URL;
const isPostgres = Boolean(DATABASE_URL && (DATABASE_URL.startsWith('postgres://') || DATABASE_URL.startsWith('postgresql://')));

let dbInstance = null;
let pgPool = null;
let initPromise = null;

async function ensureReady() {
  if (initPromise) {
    await initPromise;
  }
}

/**
 * Translates SQLite-specific SQL syntax to PostgreSQL syntax.
 */
function translateToPostgres(sql) {
  let s = sql;
  // Date and timestamp replacements
  s = s.replace(/date\('now'\)/gi, 'CURRENT_DATE');
  s = s.replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP');
  s = s.replace(/date\('now',\s*'\+([0-9]+)\s*days'\)/gi, "(CURRENT_DATE + INTERVAL '$1 days')");
  s = s.replace(/date\('now',\s*'-([0-9]+)\s*days'\)/gi, "(CURRENT_DATE - INTERVAL '$1 days')");
  s = s.replace(/strftime\('%Y-%m',\s*([^)]+)\)/gi, "to_char($1::date, 'YYYY-MM')");
  s = s.replace(/julianday\('now'\)\s*-\s*julianday\(([^)]+)\)/gi, "(CURRENT_DATE - $1::date)");
  s = s.replace(/julianday\(([^)]+)\)\s*-\s*julianday\(([^)]+)\)/gi, "($1::date - $2::date)");

  // Translate case-insensitive LIKE to PostgreSQL ILIKE
  s = s.replace(/\bLIKE\b/gi, 'ILIKE');

  // Translate CAST AS FLOAT to NUMERIC for round compatibility in PostgreSQL
  s = s.replace(/\bAS\s+FLOAT\b/gi, 'AS NUMERIC');

  // Replace ? parameter placeholders with $1, $2, ...
  let paramIdx = 1;
  s = s.replace(/\?/g, () => `$${paramIdx++}`);
  return s;
}

if (isPostgres) {
  console.log('Connecting to PostgreSQL database via DATABASE_URL...');
  pgPool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' || 
         DATABASE_URL.includes('render.com') || 
         DATABASE_URL.includes('neon.tech') || 
         DATABASE_URL.includes('supabase')
      ? { rejectUnauthorized: false }
      : false
  });

  dbInstance = {
    isPostgres: true,
    type: 'postgres',
    pool: pgPool,

    prepare(sql) {
      const pgSql = translateToPostgres(sql);
      return {
        async all(...params) {
          await ensureReady();
          const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          const res = await pgPool.query(pgSql, flatParams);
          return res.rows;
        },
        async get(...params) {
          await ensureReady();
          const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          const res = await pgPool.query(pgSql, flatParams);
          return res.rows[0] || null;
        },
        async run(...params) {
          await ensureReady();
          const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          const res = await pgPool.query(pgSql, flatParams);
          return { changes: res.rowCount };
        }
      };
    },

    async exec(sql) {
      await ensureReady();
      return await pgPool.query(translateToPostgres(sql));
    },

    async transaction(fn) {
      await ensureReady();
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        const res = await fn();
        await client.query('COMMIT');
        return res;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
  };

  // Initialize PostgreSQL Schema
  async function initPostgres() {
    try {
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          full_name TEXT NOT NULL,
          role TEXT NOT NULL,
          bureau TEXT NOT NULL,
          designation TEXT,
          email TEXT,
          mobile VARCHAR(20),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS institutions (
          aicte_permanent_id VARCHAR(100) PRIMARY KEY,
          name TEXT NOT NULL,
          address TEXT NOT NULL,
          state TEXT NOT NULL,
          region TEXT NOT NULL,
          type TEXT NOT NULL,
          contact_email TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS cases (
          case_id VARCHAR(100) PRIMARY KEY,
          aicte_permanent_id VARCHAR(100) NOT NULL REFERENCES institutions(aicte_permanent_id),
          category TEXT NOT NULL,
          description TEXT NOT NULL,
          received_date DATE NOT NULL,
          status VARCHAR(50) NOT NULL,
          bureau TEXT NOT NULL,
          assigned_officer TEXT NOT NULL,
          last_action TEXT,
          next_action TEXT,
          last_action_date DATE,
          expected_disposal_date DATE NOT NULL,
          priority VARCHAR(20) NOT NULL,
          complainant_type TEXT DEFAULT 'Public',
          source VARCHAR(50) DEFAULT 'Official',
          complainant_id INTEGER,
          incident_date DATE,
          attachment_name TEXT,
          attachment_data TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS case_actions (
          id SERIAL PRIMARY KEY,
          case_id VARCHAR(100) NOT NULL REFERENCES cases(case_id),
          action TEXT NOT NULL,
          by_officer TEXT NOT NULL,
          bureau TEXT NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          remarks TEXT
        );

        CREATE TABLE IF NOT EXISTS case_links (
          id SERIAL PRIMARY KEY,
          case_id_1 VARCHAR(100) NOT NULL REFERENCES cases(case_id),
          case_id_2 VARCHAR(100) NOT NULL REFERENCES cases(case_id),
          link_type TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by TEXT NOT NULL,
          remarks TEXT
        );

        CREATE TABLE IF NOT EXISTS alerts (
          id SERIAL PRIMARY KEY,
          alert_type TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          severity VARCHAR(20) NOT NULL,
          aicte_permanent_id VARCHAR(100) REFERENCES institutions(aicte_permanent_id),
          case_id VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_resolved INT DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS overlap_resolutions (
          id SERIAL PRIMARY KEY,
          institution_key VARCHAR(255) UNIQUE NOT NULL,
          status VARCHAR(50) NOT NULL,
          resolved_by TEXT,
          resolved_at TIMESTAMP,
          remarks TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_pg_cases_inst ON cases(aicte_permanent_id);
        CREATE INDEX IF NOT EXISTS idx_pg_cases_status ON cases(status);
        CREATE INDEX IF NOT EXISTS idx_pg_cases_bureau ON cases(bureau);
        CREATE INDEX IF NOT EXISTS idx_pg_cases_received ON cases(received_date);
        CREATE INDEX IF NOT EXISTS idx_pg_actions_case ON case_actions(case_id);

        -- Safe column migrations for existing Postgres tables
        ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile VARCHAR(20);
        ALTER TABLE cases ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'Official';
        ALTER TABLE cases ADD COLUMN IF NOT EXISTS complainant_id INTEGER;
        ALTER TABLE cases ADD COLUMN IF NOT EXISTS incident_date DATE;
        ALTER TABLE cases ADD COLUMN IF NOT EXISTS attachment_name TEXT;
        ALTER TABLE cases ADD COLUMN IF NOT EXISTS attachment_data TEXT;
      `);
      console.log('PostgreSQL schema initialized successfully.');
    } catch (err) {
      console.error('PostgreSQL schema initialization error:', err);
    }
  }

  initPromise = initPostgres();

} else {
  // SQLite Mode (Offline / Local demo)
  const dbDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'aicte_cms.db');
  const sqliteDb = new Database(dbPath);

  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL,
      bureau TEXT NOT NULL,
      designation TEXT,
      email TEXT,
      mobile TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS institutions (
      aicte_permanent_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      state TEXT NOT NULL,
      region TEXT NOT NULL,
      type TEXT NOT NULL,
      contact_email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cases (
      case_id TEXT PRIMARY KEY,
      aicte_permanent_id TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      received_date DATE NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Pending', 'Under Process', 'Disposed', 'Transferred', 'Escalated')),
      bureau TEXT NOT NULL,
      assigned_officer TEXT NOT NULL,
      last_action TEXT,
      next_action TEXT,
      last_action_date DATE,
      expected_disposal_date DATE NOT NULL,
      priority TEXT NOT NULL CHECK(priority IN ('High', 'Medium', 'Low', 'Urgent')),
      complainant_type TEXT DEFAULT 'Public',
      source TEXT DEFAULT 'Official',
      complainant_id INTEGER,
      incident_date DATE,
      attachment_name TEXT,
      attachment_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (aicte_permanent_id) REFERENCES institutions (aicte_permanent_id)
    );

    CREATE TABLE IF NOT EXISTS case_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id TEXT NOT NULL,
      action TEXT NOT NULL,
      by_officer TEXT NOT NULL,
      bureau TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      remarks TEXT,
      FOREIGN KEY (case_id) REFERENCES cases (case_id)
    );

    CREATE TABLE IF NOT EXISTS case_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id_1 TEXT NOT NULL,
      case_id_2 TEXT NOT NULL,
      link_type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT NOT NULL,
      remarks TEXT,
      FOREIGN KEY (case_id_1) REFERENCES cases (case_id),
      FOREIGN KEY (case_id_2) REFERENCES cases (case_id)
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('Critical', 'Warning', 'Info')),
      aicte_permanent_id TEXT,
      case_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_resolved INTEGER DEFAULT 0,
      FOREIGN KEY (aicte_permanent_id) REFERENCES institutions (aicte_permanent_id)
    );

    CREATE TABLE IF NOT EXISTS overlap_resolutions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      institution_key TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      resolved_by TEXT,
      resolved_at DATETIME,
      remarks TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_cases_inst ON cases(aicte_permanent_id);
    CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
    CREATE INDEX IF NOT EXISTS idx_cases_bureau ON cases(bureau);
    CREATE INDEX IF NOT EXISTS idx_cases_received ON cases(received_date);
    CREATE INDEX IF NOT EXISTS idx_actions_case ON case_actions(case_id);
    CREATE INDEX IF NOT EXISTS idx_overlap_key ON overlap_resolutions(institution_key);
  `);

  // Safe migrations for SQLite
  try { sqliteDb.exec("ALTER TABLE users ADD COLUMN mobile TEXT"); } catch (e) {}
  try { sqliteDb.exec("ALTER TABLE cases ADD COLUMN source TEXT DEFAULT 'Official'"); } catch (e) {}
  try { sqliteDb.exec("ALTER TABLE cases ADD COLUMN complainant_id INTEGER"); } catch (e) {}
  try { sqliteDb.exec("ALTER TABLE cases ADD COLUMN incident_date DATE"); } catch (e) {}
  try { sqliteDb.exec("ALTER TABLE cases ADD COLUMN attachment_name TEXT"); } catch (e) {}
  try { sqliteDb.exec("ALTER TABLE cases ADD COLUMN attachment_data TEXT"); } catch (e) {}

  dbInstance = {
    isPostgres: false,
    type: 'sqlite',
    sqlite: sqliteDb,

    prepare(sql) {
      const stmt = sqliteDb.prepare(sql);
      return {
        all(...params) {
          const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          return stmt.all(...flatParams);
        },
        get(...params) {
          const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          return stmt.get(...flatParams);
        },
        run(...params) {
          const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          return stmt.run(...flatParams);
        }
      };
    },

    exec(sql) {
      return sqliteDb.exec(sql);
    },

    transaction(fn) {
      return sqliteDb.transaction(fn)();
    }
  };
}

module.exports = dbInstance;
