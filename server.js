require("dotenv").config();

const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const db = require("./db");

db.all("SELECT COUNT(*) as tot FROM slots",[],(err,row)=>{
console.log("SLOT TOTALI DB:",row);
});

/* ROUTES */
const bookingRoutes = require("./routes/bookingRoutes");

const app = express();

/* =========================
MIDDLEWARE
========================= */

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* =========================
ROUTES
========================= */

app.use("/api", bookingRoutes);

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

transporter.verify(function (error) {
  if (error) {
    console.log("Errore SMTP:", error);
  } else {
    console.log("SMTP pronto per inviare email");
  }
});

/* =========================
CREAZIONE TABELLE
========================= */

db.serialize(() => {

  db.run(`
  CREATE TABLE IF NOT EXISTS password_resets(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    token TEXT,
    expires_at DATETIME
  )
  `);

  db.run(`
  CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT,
    email TEXT UNIQUE,
    password TEXT,
    ruolo TEXT,
    verificato INTEGER DEFAULT 1
  )
  `);

  db.run(`
  CREATE TABLE IF NOT EXISTS slots(
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
  CREATE TABLE IF NOT EXISTS refresh_tokens(
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

  const admin = {
    nome: "Admin",
    email: "admin@admin.com",
    password: "admin123",
    ruolo: "admin"
  };

  const professori = ["Rossi", "Bianchi", "Verdi", "Neri", "Gialli"];

  /* ADMIN */

  db.get("SELECT * FROM users WHERE email=?", [admin.email], async (err, row) => {

    if (!row) {

      const hash = await bcrypt.hash(admin.password, 10);

      db.run(
        "INSERT INTO users(nome,email,password,ruolo,verificato) VALUES(?,?,?,?,1)",
        [admin.nome, admin.email, hash, admin.ruolo]
      );

    }

  });

  /* PROFESSORI */

  for (const nome of professori) {

    db.get("SELECT * FROM users WHERE nome=?", [nome], async (err, row) => {

      if (!row) {

        const hash = await bcrypt.hash("prof123", 10);

        db.run(
          "INSERT INTO users(nome,email,password,ruolo,verificato) VALUES(?,?,?,?,1)",
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

app.post("/login", async (req,res)=>{

const {email,password} = req.body;

if(!email || !password){
return res.status(400).json({error:"Inserisci email e password"});
}

const emailPulita = email.toLowerCase().trim();

db.get(
"SELECT * FROM users WHERE email=?",
[emailPulita],
async (err,user)=>{

if(err){
return res.status(500).json({error:"Errore database"});
}

if(!user){
return res.status(401).json({error:"Email o password non validi"});
}

let valid=false;

try{
valid = await bcrypt.compare(password,user.password);
}catch(e){
return res.status(500).json({error:"Errore autenticazione"});
}

if(!valid){
return res.status(401).json({error:"Email o password non validi"});
}

/* TOKEN */

const accessToken = jwt.sign(
{id:user.id,ruolo:user.ruolo},
process.env.JWT_SECRET,
{expiresIn:"15m"}
);

const refreshToken = jwt.sign(
{id:user.id},
process.env.JWT_SECRET,
{expiresIn:"7d"}
);

res.json({
accessToken,
refreshToken,
userId:user.id,
ruolo:user.ruolo,
nome:user.nome
});

});

});

/* =========================
REGISTRAZIONE
========================= */

app.post("/register", async (req,res)=>{

const {nome, telefono, email, password} = req.body;

if(!nome || !email || !password){
return res.status(400).json({error:"Dati mancanti"});
}

const emailPulita = email.toLowerCase().trim();

db.get(
"SELECT id FROM users WHERE email=?",
[emailPulita],
async (err,row)=>{

if(err){
return res.status(500).json({error:"Errore database"});
}

if(row){
return res.status(400).json({
error:"Email già registrata"
});
}

const hash = await bcrypt.hash(password,10);

db.run(
`INSERT INTO users(nome,email,password,ruolo,verificato)
VALUES(?,?,?,?,1)`,
[nome,emailPulita,hash,"studente"],
function(err){

if(err){
return res.status(500).json({
error:"Errore creazione utente"
});
}

res.json({
message:"Registrazione completata"
});

}
);

});

});

/*==========================
CREA UTENTE DA ADMIN
============================*/

app.post("/api/utenti", (req,res)=>{

const {nome,email,ruolo} = req.body;

if(!nome || !email){
return res.status(400).json({errore:"Dati mancanti"});
}

bcrypt.hash("password123",10,(err,hash)=>{

db.run(
"INSERT INTO users(nome,email,password,ruolo,verificato) VALUES(?,?,?,?,1)",
[nome,email,hash,ruolo],
function(err){

if(err){
console.log(err);
return res.status(500).json({errore:"Errore database"});
}

res.json({success:true});

}

);

});

});

/* =========================
prenotazioni
========================= */


app.post("/api/admin/prenotazioni",(req,res)=>{

const {studente_id,professore_id,giorno,ora} = req.body;

db.run(
`INSERT INTO slots(professore_id,giorno,ora_inizio,prenotato,studente_id)
VALUES(?,?,?,?,?)`,
[professore_id,giorno,ora,1,studente_id],
function(err){

if(err){
console.log(err);
return res.status(500).json({errore:"Errore DB"});
}

res.json({success:true});

}

);

});


/* =========================
FORGOT PASSWORD
========================= */

app.post("/forgot-password", (req, res) => {

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Inserisci email" });
  }

  const emailPulita = email.toLowerCase().trim();

  db.get("SELECT * FROM users WHERE email=?", [emailPulita], async (err, user) => {

    if (!user) {
      return res.json({
        message: "Se l'email esiste riceverai un messaggio"
      });
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const expires = new Date(Date.now() + 3600000);

    db.run(
      "INSERT INTO password_resets(user_id,token,expires_at) VALUES(?,?,?)",
      [user.id, token, expires]
    );

    const resetLink = `${process.env.BASE_URL}/reset-password.html?token=${token}`;

    try {

      await transporter.sendMail({
        from: `"${process.env.EMAIL_FROM}" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "Reset password",
        html: `
        <h2>Reset password</h2>
        <p>Clicca il link per impostare una nuova password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>Il link scade tra 1 ora.</p>
        `
      });

    } catch (e) {
      console.log("Errore email:", e);
    }

    res.json({
      message: "Se l'email esiste riceverai un messaggio"
    });

  });

});

/* =========================
HOME
========================= */

app.get("/api/utenti", (req, res) => {

db.all(
`
SELECT id,
       nome,
       email,
       ruolo
FROM users
ORDER BY id
`,
[],
(err, rows) => {

if(err){
console.error("ERRORE API UTENTI:", err);
return res.status(500).json({errore:"Errore database"});
}

res.json(rows);

}

);

});

/* =========================
SLOT PROFESSORE ADMIN
========================= */

app.get("/api/admin/slots/:prof",(req,res)=>{

db.all(
`SELECT slots.*, users.nome as studente
FROM slots
LEFT JOIN users ON users.id = slots.studente_id
WHERE professore_id=?
ORDER BY giorno, ora_inizio`,
[req.params.prof],
(err,rows)=>{

if(err){
console.log(err);
return res.status(500).json(err);
}

res.json(rows);

});

});
/* =========================
PRENOTA SLOT (ADMIN)
========================= */

app.post("/api/admin/prenota-slot",(req,res)=>{

const {slot_id, studente_id} = req.body;

db.run(
"UPDATE slots SET prenotato=1, studente_id=? WHERE id=?",
[studente_id, slot_id],
function(err){

if(err){
console.log(err);
return res.status(500).json({errore:"Errore DB"});
}

res.json({success:true});

}

);

});


/* =========================
ANNULLA SLOT (ADMIN)
========================= */

app.post("/api/admin/annulla-slot",(req,res)=>{

const {slot_id} = req.body;

db.run(
"UPDATE slots SET prenotato=0, studente_id=NULL WHERE id=?",
[slot_id],
function(err){

if(err){
console.log(err);
return res.status(500).json({errore:"Errore DB"});
}

res.json({success:true});

}

);

});



/* =========================
SERVER
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server avviato sulla porta", PORT);
});