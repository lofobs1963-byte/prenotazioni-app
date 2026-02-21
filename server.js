const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const path = require("path");

const app = express();
const db = new sqlite3.Database("./database.db");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

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


});

// Creazione admin se non esiste
db.get("SELECT * FROM users WHERE email = ?", ["admin@admin.com"], async (err, row) => {
  if (!row) {
    const passwordHash = await bcrypt.hash("admin123", 10);

    db.run(
      "INSERT INTO users (nome, email, password, ruolo) VALUES (?, ?, ?, ?)",
      ["Admin", "admin@admin.com", passwordHash, "admin"]
    );

    console.log("Admin creato: email admin@admin.com password admin123");
  }
});

// Creazione studente di test
db.get("SELECT * FROM users WHERE email = ?", ["studente@test.com"], async (err, row) => {
  if (!row) {
    const passwordHash = await bcrypt.hash("studente123", 10);

    db.run(
      "INSERT INTO users (nome, email, password, ruolo) VALUES (?, ?, ?, ?)",
      ["Studente Test", "studente@test.com", passwordHash, "studente"]
    );

    console.log("Studente creato: email studente@test.com password studente123");
  }
});

// Secondo studente di test
db.get("SELECT * FROM users WHERE email = ?", ["studente2@test.com"], async (err, row) => {
  if (!row) {
    const passwordHash = await bcrypt.hash("studente456", 10);

    db.run(
      "INSERT INTO users (nome, email, password, ruolo) VALUES (?, ?, ?, ?)",
      ["Studente Due", "studente2@test.com", passwordHash, "studente"]
    );

    console.log("Studente2 creato: email studente2@test.com password studente456");
  }
});

// Creazione professori di esempio
const professori = [
  "Rossi",
  "Bianchi",
  "Verdi",
  "Neri",
  "Gialli"
];

professori.forEach(nome => {
  db.get("SELECT * FROM users WHERE nome = ?", [nome], async (err, row) => {
    if (!row) {
      const passwordHash = await bcrypt.hash("prof123", 10);

      db.run(
        "INSERT INTO users (nome, email, password, ruolo) VALUES (?, ?, ?, ?)",
        [nome, nome.toLowerCase() + "@prof.com", passwordHash, "professore"]
      );

      console.log("Professore creato:", nome);
   }
  });
});;

const jwt = require("jsonwebtoken");

function verificaToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Token mancante" });

  jwt.verify(token, "supersegreto", (err, user) => {
    if (err) return res.status(403).json({ error: "Token non valido" });

    req.user = user;
    next();
  });
}

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (!user) {
      return res.status(401).json({ error: "Utente non trovato" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Password errata" });
    }

    const token = jwt.sign(
      { id: user.id, ruolo: user.ruolo },
      "supersegreto",
      { expiresIn: "2h" }
    );

    res.json({ token, ruolo: user.ruolo });
  });
});

app.post("/crea-disponibilita", verificaToken, (req, res) => {

  if (req.user.ruolo !== "admin") {
    return res.status(403).json({ error: "Non autorizzato" });
  }

const { professore_id, giorno, ora_inizio, ora_fine } = req.body;

  if (!giorno || !ora_inizio || !ora_fine) {
    return res.status(400).json({ error: "Dati mancanti" });
  }

  db.run(
    "INSERT INTO disponibilita (giorno, ora_inizio, ora_fine) VALUES (?, ?, ?)",
    [giorno, ora_inizio, ora_fine],
    function(err) {

      if (err) {
        return res.status(500).json({ error: "Errore database" });
      }

      // GENERAZIONE SLOT
      let current = new Date("1970-01-01T" + ora_inizio);
      let end = new Date("1970-01-01T" + ora_fine);

      while (current < end) {
        let next = new Date(current.getTime() + 15 * 60000);

        const start = current.toTimeString().slice(0,5);
        const finish = next.toTimeString().slice(0,5);

db.run(
  "INSERT INTO slots (professore_id, giorno, ora_inizio, ora_fine) VALUES (?, ?, ?, ?)",
  [professore_id, giorno, start, finish]
);

        current = next;
      }

      res.json({ message: "Disponibilità e slot creati!" });
    }
  );

});

app.get("/slots", verificaToken, (req, res) => {

  const professore_id = req.query.professore_id;

  if (!professore_id) {
    return res.json([]);
  }

  db.all(
    "SELECT * FROM slots WHERE professore_id = ? ORDER BY giorno, ora_inizio",
    [professore_id],
    (err, rows) => {

      if (err) {
        return res.status(500).json({ error: "Errore database" });
      }

      const risultato = rows.map(slot => ({
        ...slot,
        mio: slot.studente_id === req.user.id
      }));

      res.json(risultato);
    }
  );

});;

app.post("/prenota", verificaToken, (req, res) => {

  if (req.user.ruolo !== "studente") {
    return res.status(403).json({ error: "Solo studenti possono prenotare" });
  }

  const { slotId } = req.body;

  db.get("SELECT * FROM slots WHERE id = ?", [slotId], (err, slot) => {

    if (!slot) {
      return res.status(404).json({ error: "Slot non trovato" });
    }

    if (slot.prenotato == 1) {
      return res.status(400).json({ error: "Slot già prenotato" });
    }

    // 🔹 Controllo limite 1 ora (4 slot) per professore
    db.get(
      "SELECT COUNT(*) as totale FROM slots WHERE studente_id = ? AND professore_id = ?",
      [req.user.id, slot.professore_id],
      (err, result) => {

        if (result.totale >= 4) {
          return res.status(400).json({
            error: "Hai già prenotato 1 ora per questo professore"
          });
        }

        // 🔹 Aggiornamento slot
        db.run(
          "UPDATE slots SET prenotato = 1, studente_id = ? WHERE id = ?",
          [req.user.id, slotId],
          function(err) {
            if (err) {
              return res.status(500).json({ error: "Errore database" });
            }

            res.json({ message: "Prenotazione completata" });
          }
        );

      }
    );

  });

});

app.get("/professori", verificaToken, (req, res) => {

  if (req.user.ruolo !== "admin") {
    return res.status(403).json({ error: "Non autorizzato" });
  }

  db.all("SELECT id, nome FROM users WHERE ruolo = 'professore'", [], (err, rows) => {
    res.json(rows);
  });

});

app.get("/professori-studente", verificaToken, (req, res) => {

  db.all("SELECT id, nome FROM users WHERE ruolo = 'professore'", [], (err, rows) => {
    res.json(rows);
  });

});

app.post("/annulla", verificaToken, (req, res) => {

  if (req.user.ruolo !== "studente") {
    return res.status(403).json({ error: "Solo studenti" });
  }

  const { slotId } = req.body;

  db.get("SELECT * FROM slots WHERE id = ?", [slotId], (err, slot) => {

    if (!slot) {
      return res.status(404).json({ error: "Slot non trovato" });
    }

    if (slot.studente_id !== req.user.id) {
      return res.status(403).json({ error: "Non puoi annullare questo slot" });
    }

    db.run(
      "UPDATE slots SET prenotato = 0, studente_id = NULL WHERE id = ?",
      [slotId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: "Errore database" });
        }

        res.json({ message: "Prenotazione annullata" });
      }
    );

  });

});

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.redirect("/login.html");
});

app.get("/test", (req, res) => {
  res.send("SERVER FUNZIONA");
});

app.listen(PORT, () => {
  console.log("Server avviato sulla porta " + PORT);
});