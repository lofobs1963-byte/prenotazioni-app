const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./database.db");

db.all("SELECT id,email,ruolo,password FROM users", [], (err, rows) => {
  if (err) {
    console.error(err);
    return;
  }

  console.log(rows);
});