let tuttiSlots = [];

/* =========================
CARICA PROFESSORI
========================= */

async function caricaProfessori(){

const token = localStorage.getItem("accessToken");

const res = await fetch("/api/professori",{
headers:{
Authorization:`Bearer ${token}`
}
});

const professori = await res.json();

const select = document.getElementById("filtroProf");

select.innerHTML = `<option value="">Tutti</option>`;

professori.forEach(p=>{

const option = document.createElement("option");

option.value = p.nome;
option.textContent = p.nome;

select.appendChild(option);

});

}


/* =========================
CARICA SLOT
========================= */

async function caricaSlots(){

const token = localStorage.getItem("accessToken");

const res = await fetch("/api/admin/disponibilita",{
headers:{
Authorization:`Bearer ${token}`
}
});

tuttiSlots = await res.json();

renderSlots(tuttiSlots);

}


/* =========================
MOSTRA SLOT
========================= */

function renderSlots(slots){

const tbody = document.getElementById("listaSlots");

tbody.innerHTML="";

slots.forEach(slot=>{

const tr=document.createElement("tr");

tr.innerHTML=`
<td>${slot.id}</td>
<td>${slot.professore}</td>
<td>${slot.giorno}</td>
<td>${slot.ora_inizio}</td>
<td>${slot.ora_fine}</td>

<td>
${slot.prenotato 
  ? `<span class="prenotato-nome">${slot.studente}</span>` 
  : "NO"}
</td>

<td>
${slot.prenotato
  ? `<span class="slot-bloccato">Prenotato</span>`
  : `<button class="btn-danger" onclick="eliminaSlot(${slot.id})">Elimina</button>`
}
</td>
`;

tbody.appendChild(tr);

});

}


/* =========================
ELIMINA SLOT
========================= */

async function eliminaSlot(id){

const token = localStorage.getItem("accessToken");

if(!confirm("Eliminare questo slot?")) return;

await fetch(`/api/admin/disponibilita/${id}`,{
method:"DELETE",
headers:{
Authorization:`Bearer ${token}`
}
});

caricaSlots();

}


/* =========================
CARICA PAGINA
========================= */

window.onload=()=>{

caricaProfessori();
caricaSlots();

};