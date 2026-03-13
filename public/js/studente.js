async function caricaCalendario(){

const professore = document.getElementById("professore").value;

if(!professore) return;

const token = localStorage.getItem("accessToken");

const res = await fetch(`/api/slots?professore_id=${professore}`,{
headers:{
Authorization:`Bearer ${token}`
}
});

const slots = await res.json();

const userId = localStorage.getItem("userId");

const giorni=["LUN","MAR","MER","GIO","VEN"];

const tbody=document.getElementById("calendario");

const orari=[];

/* ORARI 12:00 → 19:00 */

for(let h=12;h<19;h++){
for(let m=0;m<60;m+=15){

const ora =
String(h).padStart(2,"0")+":"+String(m).padStart(2,"0");

orari.push(ora);

}
}

tbody.innerHTML="";

orari.forEach(ora=>{

let row=`<tr><td class="ora">${ora}</td>`;

giorni.forEach(g=>{

const slot = slots.find(s=>s.giorno===g && s.ora_inizio===ora);

if(!slot){
row+=`<td></td>`;
return;
}

/* BLOCCA SLOT PASSATI */



if(!slot.prenotato){

row+=`<td class="slot libero" onclick="prenota(${slot.id})">🟢</td>`;

}
else if(slot.studente_id == userId){

row+=`<td class="slot mio" onclick="annulla(${slot.id})">🔵</td>`;

}
else{

row+=`<td class="slot occupato">🔴</td>`;

}

});

row+="</tr>";

tbody.innerHTML+=row;

});

/* evidenzia slot selezionato */

document.querySelectorAll(".slot").forEach(slot => {

slot.addEventListener("click", () => {

document.querySelectorAll(".slot")
.forEach(s => s.classList.remove("selected"));

slot.classList.add("selected");

});

});

}


/* =========================
PRENOTA
========================= */

async function prenota(id){

const token = localStorage.getItem("accessToken");

await fetch("/api/prenota",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},
body:JSON.stringify({
slotId:id
})
});

caricaCalendario();

}


/* =========================
ANNULLA
========================= */

async function annulla(id){

const token = localStorage.getItem("accessToken");

if(!confirm("Vuoi annullare la prenotazione?")) return;

await fetch("/api/annulla",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},
body:JSON.stringify({
slotId:id
})
});

caricaCalendario();

}


/* =========================
PROFESSORI
========================= */

async function caricaProfessori(){

const token = localStorage.getItem("accessToken");

const res = await fetch("/api/professori",{
headers:{
Authorization:`Bearer ${token}`
}
});

const professori = await res.json();

const select = document.getElementById("professore");

select.innerHTML = `<option value="">Seleziona professore</option>`;

professori.forEach(p=>{

const option = document.createElement("option");

option.value = p.id;
option.textContent = p.nome;

select.appendChild(option);

});

}