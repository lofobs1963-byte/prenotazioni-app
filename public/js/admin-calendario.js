document.addEventListener("DOMContentLoaded", async function () {

const token = localStorage.getItem("accessToken");
let calendar;

/* =========================
CARICA PROFESSORI
========================= */

async function caricaProfessori(){

const res = await fetch("/api/professori",{
headers:{
Authorization:`Bearer ${token}`
}
});

const professori = await res.json();

const select = document.getElementById("filtroProf");

select.innerHTML = `<option value="">Tutti i professori</option>`;

professori.forEach(p=>{

const option = document.createElement("option");
option.value = p.id;
option.textContent = p.nome;

select.appendChild(option);

});

}

/* =========================
COLORE
========================= */

function coloreProf(nome){

const colori = {
Rossi: "#2E86DE",
Bianchi: "#27AE60",
Verdi: "#8E44AD",
Neri: "#E67E22",
Gialli: "#C0392B"
}

return colori[nome] || "#34495E"

}

/* =========================
CALENDARIO
========================= */

function initCalendario(){

const calendarEl = document.getElementById("calendar");

calendar = new FullCalendar.Calendar(calendarEl, {

editable:true,

initialView:"timeGridWeek",

nowIndicator:true,

initialDate:"2026-01-05",

locale:"it",

firstDay:1,

weekends:false,

allDaySlot:false,

expandRows:true,

height:"auto",

slotDuration:"00:15:00",

slotLabelInterval:"00:15:00",

slotMinTime:"12:00:00",

slotMaxTime:"19:00:00",

headerToolbar:false,

displayEventTime:false,

dayHeaderFormat:{
weekday:"short"
},

slotLabelFormat:{
hour:"2-digit",
minute:"2-digit",
hour12:false
},

eventDidMount: function(info){

const prof = info.event.extendedProps.professore

info.el.style.backgroundColor = coloreProf(prof)

},

events: async function(fetchInfo, successCallback){

try{

const professore = document.getElementById("filtroProf").value || ""

const res = await fetch(`/api/admin/calendario?professore=${professore}`,{
headers:{
Authorization:`Bearer ${token}`
}
})

const data = await res.json()

console.log("EVENTI:",data)

successCallback(data)

}catch(err){

console.error("Errore calendario:",err)

}

},



/* =========================
DRAG PRENOTAZIONE
========================= */

eventDrop: async function(info){

const id = info.event.id;

const start = info.event.start;
const end = info.event.end;

await fetch("/api/admin/sposta-prenotazione",{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},

body:JSON.stringify({
id,
start,
end
})

});

}

});

calendar.render();

}

/* =========================
FILTRO PROFESSORE
========================= */

document.getElementById("filtroProf").addEventListener("change",function(){

calendar.refetchEvents();

});

/* =========================
INIT
========================= */

await caricaProfessori();

initCalendario();

});