document.addEventListener("DOMContentLoaded", () => {

caricaProfessori();

});

async function caricaProfessori(){

try{

const token = getToken();

const res = await fetch("/api/professori",{
headers:{
Authorization:`Bearer ${token}`
}
});

const professori = await res.json();

const select=document.getElementById("professore");

select.innerHTML="";

professori.forEach(p=>{

const option=document.createElement("option");

option.value=p.id;
option.textContent=p.nome;

select.appendChild(option);

});

}catch(err){

console.error(err);
document.getElementById("msg").innerText="Errore caricamento professori";

}

}


async function creaSlot(){

try{

const token = getToken();

const professore_id=document.getElementById("professore").value;
const giorno=document.getElementById("giorno").value;
const ora_inizio=document.getElementById("inizio").value;
const ora_fine=document.getElementById("fine").value;

if(!professore_id || !ora_inizio || !ora_fine){

document.getElementById("msg").innerText="Compila tutti i campi";
return;

}

const res = await fetch("/api/crea-disponibilita",{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},

body:JSON.stringify({
professore_id,
giorno,
ora_inizio,
ora_fine
})

});

const data = await res.json();

document.getElementById("msg").innerText =
data.message || data.error;

}catch(err){

console.error(err);
document.getElementById("msg").innerText="Errore creazione slot";

}

}