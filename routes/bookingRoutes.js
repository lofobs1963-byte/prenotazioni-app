const express = require("express");
const router = express.Router();
const db = require("../db");

const bookingController = require("../controllers/bookingController");
const adminController = require("../controllers/adminController");

const authenticateToken = require("../middleware/authMiddleware");

const bcrypt = require("bcrypt");


/* STUDENTE */

router.get("/slots", authenticateToken, bookingController.getSlots);
router.post("/prenota", authenticateToken, bookingController.prenota);
router.post("/annulla", authenticateToken, bookingController.annulla);
router.get("/professori", authenticateToken, bookingController.getProfessori);
router.get("/admin/utenti", authenticateToken, adminController.getUtenti);

/* ADMIN */

router.post("/crea-disponibilita", authenticateToken, adminController.creaDisponibilita);
router.get("/admin/disponibilita", authenticateToken, adminController.getDisponibilita);
router.delete("/admin/disponibilita/:id", authenticateToken, adminController.deleteSlot);
router.get("/admin/prenotati", authenticateToken, adminController.getPrenotati);
router.get("/admin/calendario", adminController.getCalendario)
router.post("/admin/sposta-prenotazione", adminController.spostaPrenotazione)


/* LISTA PROFESSORI*/
router.get("/admin/professori", authenticateToken, (req,res)=>{

if(req.user.ruolo!=="admin"){
return res.status(403).json({error:"Non autorizzato"});
}

db.all(
"SELECT id,nome,email FROM users WHERE ruolo='professore'",
[],
(err,rows)=>{

res.json(rows);

});

});

/* MODFICA PROFESSORE*/

router.put("/admin/professori/:id", authenticateToken, (req,res)=>{

if(req.user.ruolo!=="admin"){
return res.status(403).json({error:"Non autorizzato"});
}

const id = req.params.id;

const {nome,email,materia} = req.body;

db.run(
`UPDATE users
SET nome=?, email=?, materia=?
WHERE id=?`,
[nome,email,materia,id],
function(err){

if(err){
return res.status(500).json({error:"Errore modifica"});
}

res.json({message:"Professore aggiornato"});

});

});

/* AGGIUNGI PROFESSORE */

router.post("/admin/professori", authenticateToken, async (req,res)=>{

if(req.user.ruolo!=="admin"){
return res.status(403).json({error:"Non autorizzato"});
}

const {nome,email,password,materia}=req.body;

const hash = await bcrypt.hash(password,10);

db.run(
"INSERT INTO users(nome,email,password,ruolo,materia,verificato) VALUES(?,?,?,?,?,1)",
[nome,email,hash,"professore",materia],
function(err){

res.json({message:"Professore creato"});

});

});

/*ELIMINA PROFESSORE*/
router.delete("/admin/professori/:id", authenticateToken, (req,res)=>{

if(req.user.ruolo!=="admin"){
return res.status(403).json({error:"Non autorizzato"});
}

const id=req.params.id;

db.run(
"DELETE FROM users WHERE id=? AND ruolo='professore'",
[id],
function(err){

res.json({message:"Professore eliminato"});

});

});

/* =========================
STATISTICHE ADMIN
========================= */

router.get("/admin/statistiche", authenticateToken, (req, res) => {

  if (req.user.ruolo !== "admin") {
    return res.status(403).json({ error: "Non autorizzato" });
  }

  const stats = {};

  db.get("SELECT COUNT(*) as tot FROM users WHERE ruolo='studente'", [], (err, row1) => {

    if (err) return res.status(500).json({ error: "Errore DB studenti" });

    stats.studenti = row1.tot;

    db.get("SELECT COUNT(*) as tot FROM users WHERE ruolo='professore'", [], (err, row2) => {

      if (err) return res.status(500).json({ error: "Errore DB professori" });

      stats.professori = row2.tot;

      db.get("SELECT COUNT(*) as tot FROM slots WHERE prenotato=1", [], (err, row3) => {

        if (err) return res.status(500).json({ error: "Errore DB prenotazioni" });

        stats.prenotazioni = row3.tot;

        db.get("SELECT COUNT(*) as tot FROM slots", [], (err, row4) => {

          if (err) return res.status(500).json({ error: "Errore DB slots" });

          stats.slot = row4.tot;

          res.json(stats);

        });

      });

    });

  });

});
module.exports = router;

