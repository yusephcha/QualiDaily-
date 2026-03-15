import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("farm_data.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS workers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    UNIQUE(name)
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    worker_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY(worker_id) REFERENCES workers(id),
    UNIQUE(date, worker_id)
  );

  CREATE TABLE IF NOT EXISTS daily_pointage (
    date TEXT PRIMARY KEY,
    md_marocain INTEGER DEFAULT 0,
    md_subsaharienne INTEGER DEFAULT 0,
    post_fixe INTEGER DEFAULT 0,
    post_faux_fixe INTEGER DEFAULT 0,
    gardiens INTEGER DEFAULT 0,
    controleur INTEGER DEFAULT 0,
    total_manual INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS extra_hours (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    worker_id INTEGER NOT NULL,
    hours REAL NOT NULL,
    FOREIGN KEY(worker_id) REFERENCES workers(id)
  );

  CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    license_plate TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS voyages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    voyage_no INTEGER NOT NULL,
    driver_id INTEGER NOT NULL,
    departure_time TEXT NOT NULL,
    variety TEXT NOT NULL,
    export_kg REAL NOT NULL,
    ecart_kg REAL NOT NULL,
    total_kg REAL NOT NULL,
    FOREIGN KEY(driver_id) REFERENCES drivers(id),
    UNIQUE(date, voyage_no)
  );

  CREATE TABLE IF NOT EXISTS suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    value TEXT NOT NULL,
    UNIQUE(type, value)
  );

  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    leader_name TEXT NOT NULL,
    rec INTEGER DEFAULT 0,
    deg INTEGER DEFAULT 0,
    cap INTEGER DEFAULT 0,
    nationality TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS fuel_inventory (
    date TEXT PRIMARY KEY,
    in_essence REAL DEFAULT 0,
    in_gasoil REAL DEFAULT 0,
    out_essence REAL DEFAULT 0,
    out_gasoil REAL DEFAULT 0,
    stock_essence REAL DEFAULT 0,
    stock_gasoil REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS daily_operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    operation_name TEXT NOT NULL,
    value REAL DEFAULT 0
  );
`);

// Seed Operations into suggestions
const opsCount = db.prepare("SELECT COUNT(*) as count FROM suggestions WHERE type = 'operation'").get() as { count: number };
if (opsCount.count === 0) {
  const operations = [
    "Activité Tractoriste", "Arcage", "Arrosage", "Bobinage", "Brumisation", "Cecidomyie", 
    "Charge & décharge", "Conditionnement ferme", "Contrôle", "Couture", "Débobinage", 
    "Découpage bloc coco", "Découpe de ficelle", "Dégagement (Myrtille)", "Désehrbage", 
    "Désinstallation isonet et adhésif", "Divers", "Eclaircissage (Taille)", "Emballage (Myrtille)", 
    "Encadrement", "Encadrement administratif", "Encadrement support", "Encadrement technique", 
    "Entretien Filet", "Evacuation coco", "Finition de l'évacuation des résidus", "Finition général", 
    "Fixation rampe sur pot", "Gardiennage", "Hygienne", "Installation - Ajustement briques", 
    "Installation adhésif", "Installation cornères", "Installation ficelle (Myrtille)", 
    "Installation gouttières", "Installation piquet", "Irrigation & Fertilisation", 
    "Lavage & Chaulage", "Lessivage", "Nettoyage + Evacuation", "Nettoyage gouttières", 
    "Nivellement substrat", "Ouverture des apexes", "Palissage (Myrtille)", "Pépinière", 
    "Pincement", "Plantation", "Pointage ou Magasin", "Pose coco", "Pots (Myrtille)", 
    "Ramassage des supports des tiges", "Récolte", "Repmlissage pot avec substrat", 
    "Séparation palissage", "Surveillance", "Surveillance cultures", "Taille", "Traitement", 
    "Travaux du sol (MR)", "Triporteur (Myrtille)", "Tubing (Myrtille)", "z_Chômé"
  ];
  const insert = db.prepare("INSERT OR IGNORE INTO suggestions (type, value) VALUES ('operation', ?)");
  operations.forEach(op => insert.run(op));
}

// Seed Initial Workers
const initialWorkers = [
  { category: 'Sans transport & Douar', names: ['LAARJ Hicham', 'EL GOUYA Salah', 'DAOUDI Boujamaa', 'SALEM Hassan', 'ELMOUADDENE HAMID', 'OUHAMMOU Mohamed', 'EL AALY ABDELOUAHED', 'ATIK ALI', 'Tahiri brahim'] },
  { category: 'Transport personnel', names: ['ELLAHYA ABDELKABIR', 'Moussafia Lahcen', 'ELmsaady Sidi Ahmed', 'CHNIGUER Mohamed', 'EL HANTIT EL HASSAN', 'BOUTKARIT KASSOU', 'Elmarbouhy Abdelhadi'] },
  { category: 'Ouvrier de secteur', names: ['Ahmed EL HATRAF', 'Mohammed MOUSSAID'] },
  { category: 'Post Fixe', names: ['Moussafia Lahcen', 'Badri Mohammed', 'BOUMRIT MOHAMED', 'ELmsaady Sidi Ahmed', 'LAAZROUDI AMARA', 'EL KHAYYAT MOUHA', 'EL YAMANY LHOUSSAINE', 'ELmarbouhy Abdelhadi', 'EL HANTIT EL HASSAN', 'BOUTKARIT KASSOU', 'Elouichoany abdelkader', 'ELLAHYA ABDELKABIR'] },
  { category: 'Post Faux Fixe', names: ['AMHAL Mohamed', 'MAKKOU Yassine', 'BITTOS Ahmed', 'OIHMAN Samir', 'KAMEL Ayoub', 'CHNIGUER Mohamed', 'Laarj Hicham'] }
];

const checkWorker = db.prepare("SELECT id FROM workers WHERE name = ? AND category = ?");
const insertWorker = db.prepare("INSERT INTO workers (name, category) VALUES (?, ?)");

for (const group of initialWorkers) {
  for (const name of group.names) {
    const exists = checkWorker.get(name, group.category);
    if (!exists) {
      insertWorker.run(name, group.category);
    }
  }
}

// Seed Initial Suggestions for Leaders
const leaderCount = db.prepare("SELECT COUNT(*) as count FROM suggestions WHERE type = 'leader'").get() as { count: number };
if (leaderCount.count === 0) {
  const initialLeaders = [
    'AMHAL Mohamed', 'MAKKOU Yassine', 'Hamada', 'Samba', 
    'Brou Yannik', 'Barry Alpha', 'Bah mamado', 'Abdul aziz'
  ];
  const insertSuggestion = db.prepare("INSERT OR IGNORE INTO suggestions (type, value) VALUES (?, ?)");
  for (const name of initialLeaders) {
    insertSuggestion.run('leader', name);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  
  // Workers & Suggestions
  app.get("/api/suggestions", (req, res) => {
    const type = req.query.type;
    let results: string[] = [];
    
    if (type === 'worker_name') {
      const workerNames = db.prepare("SELECT DISTINCT name FROM workers").all() as { name: string }[];
      results = workerNames.map(w => w.name);
    } else if (type === 'driver_name') {
      const driverNames = db.prepare("SELECT DISTINCT name FROM drivers").all() as { name: string }[];
      results = driverNames.map(d => d.name);
    }
    
    const stmt = db.prepare("SELECT value FROM suggestions WHERE type = ?");
    const suggResults = stmt.all(type) as { value: string }[];
    
    // Combine and unique
    const combined = Array.from(new Set([...results, ...suggResults.map(r => r.value)]));
    res.json(combined);
  });

  app.post("/api/suggestions", (req, res) => {
    const { type, value } = req.body;
    try {
      const stmt = db.prepare("INSERT OR IGNORE INTO suggestions (type, value) VALUES (?, ?)");
      stmt.run(type, value);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.get("/api/workers", (req, res) => {
    const category = req.query.category;
    const stmt = category 
      ? db.prepare("SELECT * FROM workers WHERE category = ?")
      : db.prepare("SELECT * FROM workers");
    res.json(category ? stmt.all(category) : stmt.all());
  });

  app.post("/api/workers", (req, res) => {
    const { name, category } = req.body;
    try {
      // Check if worker already exists by name
      const existing = db.prepare("SELECT id FROM workers WHERE name = ?").get(name) as { id: number } | undefined;
      if (existing) {
        return res.json({ id: existing.id });
      }
      
      const stmt = db.prepare("INSERT INTO workers (name, category) VALUES (?, ?)");
      const info = stmt.run(name, category);
      
      // Also add to suggestions
      const suggStmt = db.prepare("INSERT OR IGNORE INTO suggestions (type, value) VALUES (?, ?)");
      suggStmt.run('worker_name', name);
      
      res.json({ id: info.lastInsertRowid });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Attendance
  app.get("/api/attendance", (req, res) => {
    const { date, category } = req.query;
    if (category) {
      const stmt = db.prepare(`
        SELECT w.id as worker_id, w.name, w.category, a.status 
        FROM workers w
        LEFT JOIN attendance a ON w.id = a.worker_id AND a.date = ?
        WHERE w.category = ?
      `);
      return res.json(stmt.all(date, category));
    } else {
      const stmt = db.prepare(`
        SELECT w.id as worker_id, w.name, w.category, a.status 
        FROM workers w
        LEFT JOIN attendance a ON w.id = a.worker_id AND a.date = ?
      `);
      return res.json(stmt.all(date));
    }
  });

  app.post("/api/attendance", (req, res) => {
    const { date, worker_id, status } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO attendance (date, worker_id, status) 
        VALUES (?, ?, ?)
        ON CONFLICT(date, worker_id) DO UPDATE SET status = excluded.status
      `);
      stmt.run(date, worker_id, status);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Daily Pointage
  app.get("/api/pointage", (req, res) => {
    const { date } = req.query;
    const stmt = db.prepare("SELECT * FROM daily_pointage WHERE date = ?");
    res.json(stmt.get(date) || { date, md_marocain: 0, md_subsaharienne: 0, post_fixe: 0, post_faux_fixe: 0, gardiens: 0, controleur: 0, total_manual: 0 });
  });

  app.post("/api/pointage", (req, res) => {
    const { date, md_marocain, md_subsaharienne, post_fixe, post_faux_fixe, gardiens, controleur, total_manual } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO daily_pointage (date, md_marocain, md_subsaharienne, post_fixe, post_faux_fixe, gardiens, controleur, total_manual)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(date) DO UPDATE SET 
          md_marocain = excluded.md_marocain,
          md_subsaharienne = excluded.md_subsaharienne,
          post_fixe = excluded.post_fixe,
          post_faux_fixe = excluded.post_faux_fixe,
          gardiens = excluded.gardiens,
          controleur = excluded.controleur,
          total_manual = excluded.total_manual
      `);
      stmt.run(date, md_marocain, md_subsaharienne, post_fixe, post_faux_fixe, gardiens, controleur, total_manual);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Extra Hours
  app.get("/api/extra-hours", (req, res) => {
    const { date } = req.query;
    const stmt = db.prepare(`
      SELECT eh.*, w.name, w.category 
      FROM extra_hours eh
      JOIN workers w ON eh.worker_id = w.id
      WHERE eh.date = ?
    `);
    res.json(stmt.all(date));
  });

  app.post("/api/extra-hours", (req, res) => {
    const { date, worker_id, hours } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO extra_hours (date, worker_id, hours) VALUES (?, ?, ?)");
      stmt.run(date, worker_id, hours);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.delete("/api/extra-hours/:id", (req, res) => {
    const { id } = req.params;
    try {
      const stmt = db.prepare("DELETE FROM extra_hours WHERE id = ?");
      stmt.run(id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Drivers
  app.get("/api/drivers", (req, res) => {
    const stmt = db.prepare("SELECT * FROM drivers");
    res.json(stmt.all());
  });

  app.post("/api/drivers", (req, res) => {
    const { name, license_plate } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO drivers (name, license_plate) 
        VALUES (?, ?)
        ON CONFLICT(name) DO UPDATE SET license_plate = excluded.license_plate
      `);
      const info = stmt.run(name, license_plate);
      res.json({ id: info.lastInsertRowid });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Voyages
  app.get("/api/voyages", (req, res) => {
    const { date } = req.query;
    const stmt = db.prepare(`
      SELECT v.*, d.name as driver_name, d.license_plate
      FROM voyages v
      JOIN drivers d ON v.driver_id = d.id
      WHERE v.date = ?
      ORDER BY v.voyage_no ASC
    `);
    res.json(stmt.all(date));
  });

  app.post("/api/voyages", (req, res) => {
    const { date, voyage_no, driver_name, license_plate, departure_time, variety, export_kg, ecart_kg } = req.body;
    try {
      // First, ensure driver exists
      const driverStmt = db.prepare(`
        INSERT INTO drivers (name, license_plate) 
        VALUES (?, ?)
        ON CONFLICT(name) DO UPDATE SET license_plate = excluded.license_plate
      `);
      driverStmt.run(driver_name, license_plate);
      const driver = db.prepare("SELECT id FROM drivers WHERE name = ?").get(driver_name) as { id: number };
      
      const total_kg = Number(export_kg) + Number(ecart_kg);
      
      const stmt = db.prepare(`
        INSERT INTO voyages (date, voyage_no, driver_id, departure_time, variety, export_kg, ecart_kg, total_kg)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(date, voyage_no) DO UPDATE SET 
          driver_id = excluded.driver_id,
          departure_time = excluded.departure_time,
          variety = excluded.variety,
          export_kg = excluded.export_kg,
          ecart_kg = excluded.ecart_kg,
          total_kg = excluded.total_kg
      `);
      stmt.run(date, voyage_no, driver.id, departure_time, variety, export_kg, ecart_kg, total_kg);
      
      // Also add variety to suggestions
      const suggStmt = db.prepare("INSERT OR IGNORE INTO suggestions (type, value) VALUES (?, ?)");
      suggStmt.run('variety', variety);
      
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Operations
  app.get("/api/operations", (req, res) => {
    const { date } = req.query;
    let rows = db.prepare("SELECT * FROM daily_operations WHERE date = ?").all(date);
    
    if (rows.length === 0) {
      // Try to get from previous day
      const prevDate = new Date(new Date(date as string).getTime() - 86400000).toISOString().split('T')[0];
      const prevRows = db.prepare("SELECT * FROM daily_operations WHERE date = ?").all(prevDate) as any[];
      
      if (prevRows.length > 0) {
        const insert = db.prepare("INSERT INTO daily_operations (date, operation_name, value) VALUES (?, ?, ?)");
        prevRows.forEach(r => insert.run(date, r.operation_name, 0));
        rows = db.prepare("SELECT * FROM daily_operations WHERE date = ?").all(date);
      }
    }
    
    res.json(rows.map((r: any) => ({
      id: r.id,
      name: r.operation_name,
      value: r.value
    })));
  });

  app.post("/api/operations", (req, res) => {
    const { date, operations } = req.body;
    try {
      db.transaction(() => {
        // Delete existing for this date
        db.prepare("DELETE FROM daily_operations WHERE date = ?").run(date);
        const insert = db.prepare("INSERT INTO daily_operations (date, operation_name, value) VALUES (?, ?, ?)");
        operations.forEach((op: any) => {
          insert.run(date, op.name, op.value || 0);
        });
      })();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Teams
  app.get("/api/teams", (req, res) => {
    const { date } = req.query;
    const rows = db.prepare("SELECT * FROM teams WHERE date = ?").all(date);
    res.json(rows.map((r: any) => ({
      id: r.id,
      leaderName: r.leader_name,
      rec: r.rec,
      deg: r.deg,
      cap: r.cap,
      nationality: r.nationality,
      date: r.date
    })));
  });

  app.post("/api/teams", (req, res) => {
    const teams = req.body; // Array of teams
    const { date } = req.query;
    
    try {
      db.transaction(() => {
        db.prepare("DELETE FROM teams WHERE date = ?").run(date);
        const insert = db.prepare(`
          INSERT INTO teams (date, leader_name, rec, deg, cap, nationality)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const team of teams) {
          insert.run(date, team.leaderName, team.rec, team.deg, team.cap, team.nationality);
        }
      })();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Fuel Inventory
  app.get("/api/fuel", (req, res) => {
    const { date } = req.query;
    const row = db.prepare("SELECT * FROM fuel_inventory WHERE date = ?").get(date) as any;
    res.json(row ? {
      date: row.date,
      inEssence: row.in_essence,
      inGasoil: row.in_gasoil,
      outEssence: row.out_essence,
      outGasoil: row.out_gasoil,
      stockEssence: row.stock_essence,
      stockGasoil: row.stock_gasoil
    } : { date, inEssence: 0, inGasoil: 0, outEssence: 0, outGasoil: 0, stockEssence: 0, stockGasoil: 0 });
  });

  app.post("/api/fuel", (req, res) => {
    const { date, inEssence, inGasoil, outEssence, outGasoil, stockEssence, stockGasoil } = req.body;
    try {
      db.prepare(`
        INSERT INTO fuel_inventory (date, in_essence, in_gasoil, out_essence, out_gasoil, stock_essence, stock_gasoil)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(date) DO UPDATE SET
          in_essence = excluded.in_essence,
          in_gasoil = excluded.in_gasoil,
          out_essence = excluded.out_essence,
          out_gasoil = excluded.out_gasoil,
          stock_essence = excluded.stock_essence,
          stock_gasoil = excluded.stock_gasoil
      `).run(date, inEssence, inGasoil, outEssence, outGasoil, stockEssence, stockGasoil);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.delete("/api/voyages/:id", (req, res) => {
    const { id } = req.params;
    try {
      const stmt = db.prepare("DELETE FROM voyages WHERE id = ?");
      stmt.run(id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Backup & Restore
  app.get("/api/backup", (req, res) => {
    const tables = ["workers", "attendance", "daily_pointage", "extra_hours", "suggestions", "drivers", "voyages"];
    const backup: any = {};
    for (const table of tables) {
      backup[table] = db.prepare(`SELECT * FROM ${table}`).all();
    }
    res.json(backup);
  });

  app.post("/api/restore", (req, res) => {
    const backup = req.body;
    try {
      const transaction = db.transaction((data) => {
        for (const table in data) {
          db.prepare(`DELETE FROM ${table}`).run();
          const columns = Object.keys(data[table][0] || {});
          if (columns.length === 0) continue;
          const placeholders = columns.map(() => "?").join(",");
          const stmt = db.prepare(`INSERT INTO ${table} (${columns.join(",")}) VALUES (${placeholders})`);
          for (const row of data[table]) {
            stmt.run(Object.values(row));
          }
        }
      });
      transaction(backup);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
