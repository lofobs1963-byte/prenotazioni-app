const db = require("../db");

/* =========================
CREA DISPONIBILITÀ
========================= */

exports.creaDisponibilita = (req, res) => {

  if (req.user.ruolo !== "admin") {
    return res.status(403).json({ error: "Non autorizzato" });
  }

  const { professore_id, giorno, ora_inizio, ora_fine } = req.body;

  if (!professore_id || !giorno || !ora_inizio || !ora_fine) {
    return res.status(400).json({ error: "Dati mancanti" });
  }

  if (ora_inizio >= ora_fine) {
    return res.status(400).json({
      error: "Orario non valido"
    });
  }

  db.get(
    `SELECT 1 FROM slots 
     WHERE professore_id=? 
     AND giorno=? 
     AND (ora_inizio < ? AND ora_fine > ?)`,
    [professore_id, giorno, ora_fine, ora_inizio],
    (err, row) => {

      if (row) {
        return res.status(400).json({
          error: "Disponibilità sovrapposta"
        });
      }

      db.serialize(() => {

        db.run("BEGIN TRANSACTION");

        let current = new Date("1970-01-01T" + ora_inizio);
        const end = new Date("1970-01-01T" + ora_fine);

        while (current < end) {

          const next = new Date(current.getTime() + 15 * 60000);

          const start = current.toTimeString().slice(0,5);
          const finish = next.toTimeString().slice(0,5);

          db.run(
            "INSERT INTO slots (professore_id,giorno,ora_inizio,ora_fine) VALUES (?,?,?,?)",
            [professore_id, giorno, start, finish]
          );

          current = next;

        }

        db.run("COMMIT");

        res.json({
          message: "Disponibilità creata"
        });

      });

    }
  );

};


/* =========================
DISPONIBILITÀ ADMIN
========================= */

exports.getDisponibilita = (req, res) => {

  if (req.user.ruolo !== "admin") {
    return res.status(403).json({ error: "Non autorizzato" });
  }

  db.all(`
    SELECT 
      slots.*,
      prof.nome AS professore,
      stud.nome AS studente
    FROM slots
    JOIN users prof ON prof.id = slots.professore_id
    LEFT JOIN users stud ON stud.id = slots.studente_id
    ORDER BY giorno, ora_inizio
  `,
  [],
  (err, rows) => {

    if (err) {
      return res.status(500).json({ error: "Errore database" });
    }

    res.json(rows);

  });

};



/* =========================
ELIMINA SLOT
========================= */

exports.deleteSlot = (req, res) => {

  if (req.user.ruolo !== "admin") {
    return res.status(403).json({ error: "Non autorizzato" });
  }

  const id = req.params.id;

  db.get(
    "SELECT prenotato FROM slots WHERE id=?",
    [id],
    (err, slot) => {

      if (err) {
        return res.status(500).json({ error: "Errore database" });
      }

      if (!slot) {
        return res.status(404).json({ error: "Slot non trovato" });
      }

      if (slot.prenotato === 1) {
        return res.status(400).json({
          error: "Impossibile eliminare uno slot prenotato"
        });
      }

      db.run(
        "DELETE FROM slots WHERE id=?",
        [id],
        function(err) {

          if (err) {
            return res.status(500).json({ error: "Errore eliminazione" });
          }

          res.json({
            message: "Slot eliminato"
          });

        }
      );

    }
  );

};


/* =========================
SLOT PRENOTATI
========================= */

exports.getPrenotati = (req, res) => {

  if (req.user.ruolo !== "admin") {
    return res.status(403).json({ error: "Non autorizzato" });
  }

  db.all(`
    SELECT slots.*,
           prof.nome AS professore,
           stud.nome AS studente
    FROM slots
    JOIN users prof ON slots.professore_id = prof.id
    JOIN users stud ON slots.studente_id = stud.id
    WHERE prenotato = 1
    ORDER BY giorno, ora_inizio
  `,
  [],
  (err, rows) => {

    if (err) {
      return res.status(500).json({ error: "Errore database" });
    }

    res.json(rows);

  });

};

/* =========================
OTTENI UTENTI
========================= */

exports.getUtenti = (req, res) => {

  if (req.user.ruolo !== "admin") {
    return res.status(403).json({ error: "Non autorizzato" });
  }

  db.all(
    "SELECT id, nome, email, ruolo FROM users ORDER BY nome",
    [],
    (err, rows) => {

      if (err) {
        return res.status(500).json({ error: "Errore database" });
      }

      res.json(rows);

    }
  );

};

function giornoNumero(g){

const map={
LUN:5,
MAR:6,
MER:7,
GIO:8,
VEN:9
}

return map[g] || 5

}

exports.getCalendario = (req,res)=>{

const professore = req.query.professore || ""

db.all(`
SELECT
slots.id,
slots.ora_inizio,
slots.ora_fine,
slots.giorno,
stud.nome as studente,
prof.nome as professore
FROM slots
JOIN users prof ON prof.id=slots.professore_id
JOIN users stud ON stud.id=slots.studente_id
WHERE prenotato=1
AND (? = "" OR slots.professore_id = ?)
`,
[professore,professore],
(err,rows)=>{

const eventi = rows.map(r=>{

const giorno = String(giornoNumero(r.giorno)).padStart(2,"0")

return {

id: r.id,

title: `${r.studente}`,



start: `2026-01-${giorno}T${r.ora_inizio}:00`,

end: `2026-01-${giorno}T${r.ora_fine}:00`

}

})

res.json(eventi)

})

}

exports.spostaPrenotazione = (req,res)=>{

const {id,start,end} = req.body;

const s = new Date(start);
const e = new Date(end);

const ora_inizio = s.toTimeString().slice(0,5);
const ora_fine = e.toTimeString().slice(0,5);

const giorno = giornoFromDate(s);

db.run(
`UPDATE slots
SET giorno=?, ora_inizio=?, ora_fine=?
WHERE id=?`,
[giorno,ora_inizio,ora_fine,id],
(err)=>{

if(err){
return res.status(500).json({error:"Errore update"});
}

res.json({message:"Prenotazione spostata"});

});

};

function giornoFromDate(date){

const giorni=["DOM","LUN","MAR","MER","GIO","VEN","SAB"];

return giorni[date.getDay()];

}