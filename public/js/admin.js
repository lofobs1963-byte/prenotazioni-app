async function caricaSlots(){

const token = localStorage.getItem("accessToken");

const res = await fetch("/api/admin/disponibilita",{
headers:{
Authorization:`Bearer ${token}`
}
});

const slots = await res.json();

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
<td>${slot.prenotato ? "SI" : "NO"}</td>
<td>
<button onclick="eliminaSlot(${slot.id})">Elimina</button>
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

caricaSlots();

};
