const express = require("express");
const router = express.Router();
const db = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

// CREA DISPONIBILITÀ
router.post("/crea-disponibilita", authenticateToken, (req, res) => {

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

// OTTIENI SLOT


router.get("/slots", authenticateToken, (req, res) => {

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
});

// PRENOTA
router.post("/prenota", authenticateToken, (req, res) => {

  if (req.user.ruolo !== "studente") {
    return res.status(403).json({ error: "Solo studenti possono prenotare" });
  }

  const { slotId } = req.body;

  db.serialize(() => {

    db.run("BEGIN TRANSACTION");

   db.get("SELECT * FROM slots WHERE id = ?", [slotId], (err, slot) => {

  if (err) {
    db.run("ROLLBACK");
    return res.status(500).json({ error: "Errore database" });
  }

  if (!slot) {
    db.run("ROLLBACK");
    return res.status(404).json({ error: "Slot non trovato" });
  }

      db.get(
        "SELECT COUNT(*) as totale FROM slots WHERE studente_id = ? AND professore_id = ?",
        [req.user.id, slot.professore_id],
        (err, result) => {

          if (err) {
  db.run("ROLLBACK");
  return res.status(500).json({ error: "Errore database" });
}

if (result.totale >= 4) {
  db.run("ROLLBACK");
  return res.status(400).json({
    error: "Hai già prenotato 1 ora per questo professore"
  });
}

          db.run(
            "UPDATE slots SET prenotato = 1, studente_id = ? WHERE id = ? AND prenotato = 0",
            [req.user.id, slotId],
            function(err) {

              if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: "Errore database" });
              }

              if (this.changes === 0) {
                db.run("ROLLBACK");
                return res.status(400).json({
                  error: "Slot già prenotato da un altro utente"
                });
              }

              db.run("COMMIT");
              res.json({ message: "Prenotazione completata" });
            }
          );

        }
      );

    });

  });

});

// ANNULLA
router.post("/annulla", authenticateToken, (req, res) => {

  if (req.user.ruolo !== "studente") {
    return res.status(403).json({ error: "Solo studenti" });
  }

  const { slotId } = req.body;

  db.get("SELECT * FROM slots WHERE id = ?", [slotId], (err, slot) => {

  if (err) {
    return res.status(500).json({ error: "Errore database" });
  }

  if (!slot) {
    return res.status(404).json({ error: "Slot non trovato" });
  }

    if (slot.studente_id !== req.user.id) {
      return res.status(403).json({ error: "Non puoi annullare questo slot" });
    }

    // 🔥 CONTROLLO 24 ORE
    const dataSlot = new Date(`${slot.giorno}T${slot.ora_inizio}`);
    const adesso = new Date();

    const differenzaOre = (dataSlot - adesso) / (1000 * 60 * 60);

    if (differenzaOre < 24) {
      return res.status(400).json({
        error: "Non puoi annullare una prenotazione nelle 24 ore precedenti"
      });
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

// OTTIENI PROFESSORI
router.get("/professori", authenticateToken, (req, res) => {

  db.all(
    "SELECT id, nome FROM users WHERE ruolo = 'professore'",
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: "Errore database" });
      }
      res.json(rows);
    }
  );

});





module.exports = router;