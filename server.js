require("dotenv").config();

const express = require("express");
const db = require("./db");
const bcrypt = require("bcrypt");
const path = require("path");
const jwt = require("jsonwebtoken");

const bookingRoutes = require("./routes/bookingRoutes");

const app = express();


app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/api", bookingRoutes);

// Creazione tabelle
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      email TEXT UNIQUE,
      password TEXT,
      ruolo TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS disponibilita (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      giorno TEXT,
      ora_inizio TEXT,
      ora_fine TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      professore_id INTEGER,
      giorno TEXT,
      ora_inizio TEXT,
      ora_fine TEXT,
      prenotato INTEGER DEFAULT 0,
      studente_id INTEGER
    )
  `);
  
  db.run(`
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    token TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
});

// Creazione utenti demo
async function creaUtentiDemo() {
  const utenti = [
    { nome: "Admin", email: "admin@admin.com", password: "admin123", ruolo: "admin" },
    { nome: "Studente Test", email: "studente@test.com", password: "studente123", ruolo: "studente" },
    { nome: "Studente Due", email: "studente2@test.com", password: "studente456", ruolo: "studente" }
  ];

  const professori = ["Rossi", "Bianchi", "Verdi", "Neri", "Gialli"];

  for (let utente of utenti) {
    db.get("SELECT * FROM users WHERE email = ?", [utente.email], async (err, row) => {
      if (!row) {
        const hash = await bcrypt.hash(utente.password, 10);
        db.run(
          "INSERT INTO users (nome, email, password, ruolo) VALUES (?, ?, ?, ?)",
          [utente.nome, utente.email, hash, utente.ruolo]
        );
        console.log("Creato:", utente.email);
      }
    });
  }

  for (let nome of professori) {
    db.get("SELECT * FROM users WHERE nome = ?", [nome], async (err, row) => {
      if (!row) {
        const hash = await bcrypt.hash("prof123", 10);
        db.run(
          "INSERT INTO users (nome, email, password, ruolo) VALUES (?, ?, ?, ?)",
          [nome, nome.toLowerCase() + "@prof.com", hash, "professore"]
        );
        console.log("Professore creato:", nome);
      }
    });
  }
}

creaUtentiDemo();

// LOGIN con access + refresh token
app.post("/login", (req, res) => {

  const { email, password } = req.body;

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {

    if (err) {
      return res.status(500).json({ error: "Errore database" });
    }

    if (!user) {
      return res.status(401).json({ error: "Utente non trovato" });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ error: "Password errata" });
    }

    // 🔹 Access token (breve durata)
    const accessToken = jwt.sign(
      { id: user.id, ruolo: user.ruolo },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // 🔹 Refresh token (lunga durata)
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 🔹 Salvataggio refresh token nel DB
 const hashedRefresh = await bcrypt.hash(refreshToken, 10);

db.run(
  "INSERT INTO refresh_tokens (user_id, token) VALUES (?, ?)",
  [user.id, hashedRefresh]
);

    res.json({
      accessToken,
      refreshToken,
      ruolo: user.ruolo
    });

  });

});
app.post("/refresh", async (req, res) => {

  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token mancante" });
  }

  jwt.verify(refreshToken, process.env.JWT_SECRET, (err, user) => {

    if (err) {
      return res.status(403).json({ error: "Refresh token non valido o scaduto" });
    }

    db.all(
      "SELECT * FROM refresh_tokens WHERE user_id = ?",
      [user.id],
      async (err, rows) => {

        if (err || !rows.length) {
          return res.status(403).json({ error: "Refresh token non valido" });
        }

        let tokenTrovato = null;

        for (let row of rows) {
          const match = await bcrypt.compare(refreshToken, row.token);
          if (match) {
            tokenTrovato = row;
            break;
          }
        }

        if (!tokenTrovato) {
          return res.status(403).json({ error: "Refresh token non valido" });
        }

        // 🔹 Cancella vecchio refresh token
        db.run(
          "DELETE FROM refresh_tokens WHERE id = ?",
          [tokenTrovato.id]
        );

        // 🔹 Nuovo access token
        const newAccessToken = jwt.sign(
          { id: user.id },
          process.env.JWT_SECRET,
          { expiresIn: "15m" }
        );

        // 🔹 Nuovo refresh token
        const newRefreshToken = jwt.sign(
          { id: user.id },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        const newHashedRefresh = await bcrypt.hash(newRefreshToken, 10);

        db.run(
          "INSERT INTO refresh_tokens (user_id, token) VALUES (?, ?)",
          [user.id, newHashedRefresh]
        );

        res.json({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        });

      }
    );

  });

});


app.post("/logout", async (req, res) => {

  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token mancante" });
  }

  jwt.verify(refreshToken, process.env.JWT_SECRET, (err, user) => {

    if (err) {
      return res.status(403).json({ error: "Refresh token non valido" });
    }

    db.all(
      "SELECT * FROM refresh_tokens WHERE user_id = ?",
      [user.id],
      async (err, rows) => {

        if (err || !rows.length) {
          return res.status(400).json({ error: "Token non trovato" });
        }

        for (let row of rows) {
          const match = await bcrypt.compare(refreshToken, row.token);
          if (match) {
            db.run(
              "DELETE FROM refresh_tokens WHERE id = ?",
              [row.id]
            );
            return res.json({ message: "Logout completato" });
          }
        }

        res.status(400).json({ error: "Token non valido" });

      }
    );

  });

});