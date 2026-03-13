document.addEventListener("DOMContentLoaded", async ()=>{

const token = localStorage.getItem("accessToken");

/* =========================
CARICA UTENTI
========================= */

const res = await fetch("/api/utenti",{
headers:{Authorization:`Bearer ${token}`}
});

const utenti = await res.json();

const studenti = utenti.filter(u=>u.ruolo==="studente");
const professori = utenti.filter(u=>u.ruolo==="professore");

const studSel = document.getElementById("studenteSelect");
const profSel = document.getElementById("professoreSelect");

studenti.forEach(s=>{
studSel.innerHTML += `<option value="${s.id}">${s.nome}</option>`;
});

professori.forEach(p=>{
profSel.innerHTML += `<option value="${p.id}">${p.nome}</option>`;
});


/* =========================
CARICA SLOT PROFESSORE
========================= */

document.getElementById("caricaCalendario").onclick = async ()=>{

const prof = profSel.value;

const res = await fetch(`/api/admin/slots/${prof}`,{
headers:{Authorization:`Bearer ${token}`}
});

const slots = await res.json();

renderSlots(slots);

};


/* =========================
RENDER SLOT
========================= */

function renderSlots(slots){

const tbody = document.getElementById("tabellaSlot");
tbody.innerHTML="";

slots.forEach(s=>{

const tr = document.createElement("tr");

const nomeStudente = s.studente || "-";

tr.innerHTML = `
<td>${s.giorno}</td>
<td>${s.ora_inizio} - ${s.ora_fine}</td>
<td>${nomeStudente}</td>
<td>
<button class="${s.prenotato?'btn-delete':'btn-add'}"
data-id="${s.id}"
data-pren="${s.prenotato}">
${s.prenotato?'Annulla':'Prenota'}
</button>
</td>
`;

tbody.appendChild(tr);

});

}


/* =========================
CLICK SLOT
========================= */

document.addEventListener("click", async (e)=>{

if(!e.target.dataset.id) return;

const slot = e.target.dataset.id;
const pren = e.target.dataset.pren;
const studente = studSel.value;

if(pren=="0"){

await fetch("/api/admin/prenota-slot",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},
body:JSON.stringify({
slot_id:slot,
studente_id:studente
})
});

}else{

await fetch("/api/admin/annulla-slot",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},
body:JSON.stringify({
slot_id:slot
})
});

}

document.getElementById("caricaCalendario").click();

});

});