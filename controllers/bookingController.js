const db = require("../db");

/* =========================
   OTTIENI SLOT
========================= */
exports.getSlots = (req, res) => {

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
};


/* =========================
   PRENOTA
========================= */
exports.prenota = (req, res) => {

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

      if (Number(slot.prenotato) === 1) {
        db.run("ROLLBACK");
        return res.status(400).json({ error: "Slot già prenotato" });
      }

      db.all(
        "SELECT * FROM slots WHERE studente_id = ? AND professore_id = ? ORDER BY giorno, ora_inizio",
        [req.user.id, slot.professore_id],
        (err, slotsPrenotati) => {

          if (err) {
            db.run("ROLLBACK");
            return res.status(500).json({ error: "Errore database" });
          }

          const tutti = [...slotsPrenotati, slot];

          // max 4 slot
          if (tutti.length > 4) {
            db.run("ROLLBACK");
            return res.status(400).json({
              error: "Puoi prenotare massimo 4 slot per questo professore"
            });
          }

          // stesso giorno
          const giorniDiversi = new Set(tutti.map(s => s.giorno));

          if (giorniDiversi.size > 1) {
            db.run("ROLLBACK");
            return res.status(400).json({
              error: "I 4 slot devono essere tutti nello stesso giorno"
            });
          }

          // consecutivi
          tutti.sort((a, b) => a.ora_inizio.localeCompare(b.ora_inizio));

          for (let i = 1; i < tutti.length; i++) {
            if (tutti[i - 1].ora_fine !== tutti[i].ora_inizio) {
              db.run("ROLLBACK");
              return res.status(400).json({
                error: "Gli slot devono essere consecutivi"
              });
            }
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

};


/* =========================
   ANNULLA
========================= */
exports.annulla = (req, res) => {

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

    const dataSlot = new Date(`${slot.giorno}T${slot.ora_inizio}`);
    const adesso = new Date();

    const diff = (dataSlot - adesso) / (1000 * 60);

    if (diff < 60) {
      return res.status(400).json({
        error: "Non puoi annullare meno di 60 minuti prima"
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

};


/* =========================
   OTTIENI PROFESSORI
========================= */
exports.getProfessori = (req, res) => {

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

};