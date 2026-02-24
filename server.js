require("dotenv").config();

const express = require("express");
const db = require("./db");
const bcrypt = require("bcrypt");
const path = require("path");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const bookingRoutes = require("./routes/bookingRoutes");

const app = express();

/* =========================
   CONFIG EMAIL
========================= */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/* =========================
   MIDDLEWARE
========================= */
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/api", bookingRoutes);

/* =========================
   CREAZIONE TABELLE
========================= */
db.serialize(() => {

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      email TEXT UNIQUE,
      password TEXT,
      ruolo TEXT,
      verificato INTEGER DEFAULT 0
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

/* =========================
   CREAZIONE UTENTI DEMO
========================= */
async function creaUtentiDemo() {

  const utenti = [
    { nome: "Admin", email: "admin@admin.com", password: "admin123", ruolo: "admin" },
  ];

  const professori = ["Rossi", "Bianchi", "Verdi", "Neri", "Gialli"];

  for (let utente of utenti) {
    db.get("SELECT * FROM users WHERE email = ?", [utente.email], async (err, row) => {
      if (!row) {
        const hash = await bcrypt.hash(utente.password, 10);
        db.run(
          "INSERT INTO users (nome, email, password, ruolo, verificato) VALUES (?, ?, ?, ?, 1)",
          [utente.nome, utente.email, hash, utente.ruolo]
        );
      }
    });
  }

  for (let nome of professori) {
    db.get("SELECT * FROM users WHERE nome = ?", [nome], async (err, row) => {
      if (!row) {
        const hash = await bcrypt.hash("prof123", 10);
        db.run(
          "INSERT INTO users (nome, email, password, ruolo, verificato) VALUES (?, ?, ?, ?, 1)",
          [nome, nome.toLowerCase() + "@prof.com", hash, "professore"]
        );
      }
    });
  }

}

creaUtentiDemo();

/* =========================
   LOGIN
========================= */
app.post("/login", (req, res) => {

  const { email, password } = req.body;

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {

    if (err) return res.status(500).json({ error: "Errore database" });
    if (!user) return res.status(401).json({ error: "Utente non trovato" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Password errata" });

    if (user.verificato === 0) {
      return res.status(403).json({
        error: "Devi verificare la tua email prima di accedere"
      });
    }

    const accessToken = jwt.sign(
      { id: user.id, ruolo: user.ruolo },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const hashedRefresh = await bcrypt.hash(refreshToken, 10);

    db.run(
      "INSERT INTO refresh_tokens (user_id, token) VALUES (?, ?)",
      [user.id, hashedRefresh]
    );

    res.json({ accessToken, refreshToken, ruolo: user.ruolo });

  });

});

/* =========================
   REGISTRAZIONE STUDENTE
========================= */
app.post("/register", async (req, res) => {

  const { nome, email, password } = req.body;

  if (!nome || !email || !password) {
    return res.status(400).json({ error: "Compila tutti i campi" });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: "La password deve contenere almeno 8 caratteri"
    });
  }

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, row) => {

    if (row) {
      return res.status(400).json({ error: "Email già registrata" });
    }

    const hash = await bcrypt.hash(password, 10);

    const verificationToken = jwt.sign(
      { email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    const verificationLink = `${baseUrl}/verify?token=${verificationToken}`;

    db.run(
      "INSERT INTO users (nome, email, password, ruolo, verificato) VALUES (?, ?, ?, ?, 0)",
      [nome, email, hash, "studente"],
      async function(err) {

        if (err) {
          return res.status(500).json({ error: "Errore registrazione" });
        }

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Conferma il tuo account",
          html: `
            <h3>Ciao ${nome}</h3>
            <p>Clicca qui per attivare il tuo account:</p>
            <a href="${verificationLink}">Verifica Account</a>
          `
        });

        res.json({
          message: "Registrazione completata. Controlla la tua email."
        });

      }
    );

  });

});

/* =========================
   VERIFICA EMAIL
========================= */
app.get("/verify", (req, res) => {

  const { token } = req.query;

  if (!token) return res.send("Token mancante");

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {

    if (err) return res.send("Token non valido o scaduto");

    db.run(
      "UPDATE users SET verificato = 1 WHERE email = ?",
      [decoded.email],
      function(err) {
        if (err) return res.send("Errore verifica");

        res.send("Account verificato! Ora puoi fare login.");
      }
    );

  });

});

/* =========================
   SERVER
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server avviato sulla porta", PORT);
});