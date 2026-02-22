const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Errore DB:', err.message);
    } else {
        console.log('Connesso al database SQLite');
    }
});

module.exports = db;