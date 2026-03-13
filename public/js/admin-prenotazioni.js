console.log("ADMIN PRENOTAZIONI JS CARICATO");
document.addEventListener("DOMContentLoaded", async () => {

const token = localStorage.getItem("accessToken");

let datiOriginali = [];
let dati = [];

let pagina = 1;
const perPagina = 8;

let direzione = 1;

/* =========================
CARICA DATI
========================= */

const res = await fetch("/api/admin/prenotati",{
headers:{
Authorization:`Bearer ${token}`
}
});

datiOriginali = await res.json();
dati = [...datiOriginali];

/* =========================
CARICA STUDENTI E PROFESSORI
========================= */

const utentiRes = await fetch("/api/utenti",{
headers:{ Authorization:`Bearer ${token}` }
});

const utenti = await utentiRes.json();

const studenti = utenti.filter(u=>u.ruolo==="studente");
const professori = utenti.filter(u=>u.ruolo==="professore");

const studSelect = document.getElementById("studenteSelect");
const profSelect = document.getElementById("professoreSelect");

studenti.forEach(s=>{
studSelect.innerHTML += `<option value="${s.id}">${s.nome}</option>`;
});

professori.forEach(p=>{
profSelect.innerHTML += `<option value="${p.id}">${p.nome}</option>`;
});

render();


/* =========================
RENDER
========================= */

function render(){

const tbody = document.getElementById("tabellaPrenotazioni");
tbody.innerHTML="";

const start = (pagina-1)*perPagina;
const end = start+perPagina;

const slice = dati.slice(start,end);

slice.forEach(p=>{

const tr=document.createElement("tr");

tr.innerHTML=`
<td>${p.id}</td>
<td>${p.studente}</td>
<td><span class="badge-prof badge-${p.professore.toLowerCase()}">${p.professore}</span></td>
<td>${p.giorno}</td>
<td>${p.ora_inizio} - ${p.ora_fine}</td>
`;

tbody.appendChild(tr);

});

document.getElementById("pageInfo").innerText =
`Pagina ${pagina} / ${Math.ceil(dati.length/perPagina)}`;

}


/* =========================
RICERCA LIVE
========================= */

document.getElementById("search").addEventListener("input",(e)=>{

const valore = e.target.value.toLowerCase();

dati = datiOriginali.filter(p =>
p.studente.toLowerCase().includes(valore)
);

pagina=1;

render();

});


/* =========================
ORDINAMENTO
========================= */

document.querySelectorAll("th[data-col]").forEach(th=>{

th.addEventListener("click",()=>{

const col = th.dataset.col;

direzione *= -1;

dati.sort((a,b)=>{

if(a[col] < b[col]) return -1 * direzione;
if(a[col] > b[col]) return 1 * direzione;

return 0;

});

render();

});

});


/* =========================
PAGINAZIONE
========================= */

document.getElementById("nextPage").onclick=()=>{

if(pagina < Math.ceil(dati.length/perPagina)){
pagina++;
render();
}

};

document.getElementById("prevPage").onclick=()=>{

if(pagina>1){
pagina--;
render();
}

};

/* =========================
NUOVA PRENOTAZIONE
========================= */

const btnAddPren = document.getElementById("btnAddPren");

if(btnAddPren){

btnAddPren.onclick = async ()=>{

const studente = document.getElementById("studenteSelect").value;
const professore = document.getElementById("professoreSelect").value;
const giorno = document.getElementById("giorno").value;
const ora = document.getElementById("ora").value;

const res = await fetch("/api/admin/prenotazioni",{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},

body:JSON.stringify({
studente_id:studente,
professore_id:professore,
giorno,
ora
})

});

if(!res.ok){
alert("Errore creazione prenotazione");
return;
}

location.reload();

};

}