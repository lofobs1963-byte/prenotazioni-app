const calendar = document.getElementById("calendar");

async function caricaCalendario() {

  const token = localStorage.getItem("accessToken");

  if (!token) {
    alert("Non autenticato");
    return;
  }

  const professore_id = 1; // per ora fisso

  const response = await fetch(`/api/slots?professore_id=${professore_id}`, {
    headers: {
      "Authorization": "Bearer " + token
    }
  });

  const slots = await response.json();

  disegnaCalendario(slots);
}

function disegnaCalendario(slots) {

  calendar.innerHTML = "";

  if (!slots.length) {
    calendar.innerHTML = "<p>Nessuna disponibilità trovata</p>";
    return;
  }

  // Giorni unici dal DB
  const giorniDB = [...new Set(slots.map(s => s.giorno))].sort();

  // Orari unici dal DB
  const orariDB = [...new Set(slots.map(s => s.ora_inizio))].sort();

  // Header
  calendar.innerHTML += `<div class="cell header"></div>`;
  giorniDB.forEach(g => {
    calendar.innerHTML += `<div class="cell header">${g}</div>`;
  });

  // Righe
  orariDB.forEach(ora => {

    calendar.innerHTML += `<div class="cell header">${ora}</div>`;

    giorniDB.forEach(giorno => {

      const slot = slots.find(s =>
        s.giorno === giorno && s.ora_inizio === ora
      );

      if (!slot) {
        calendar.innerHTML += `<div class="cell vuoto"></div>`;
      } else {

        let classe = "libero";
        let testo = "Libero";

        if (slot.prenotato === 1) {
          classe = slot.mio ? "mio" : "prenotato";
          testo = slot.mio ? "Mio" : "Prenotato";
        }

        calendar.innerHTML += `
          <div class="cell ${classe}" data-id="${slot.id}">
            ${testo}
          </div>
        `;
      }

    });

  });
}

caricaCalendario();