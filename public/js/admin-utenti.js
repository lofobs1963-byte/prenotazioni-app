checkAuth();

async function caricaUtenti(){

const token = localStorage.getItem("accessToken");

try{

const res = await fetch("/api/utenti",{
headers:{
Authorization:"Bearer "+token
}
});

if(!res.ok){

const text = await res.text();
console.log("ERRORE API:",text);

alert("Errore caricamento utenti");

return;

}

const utenti = await res.json();

const tbody = document.getElementById("listaUtenti");

tbody.innerHTML="";

utenti.forEach(u=>{

const tr = document.createElement("tr");

tr.innerHTML = `

<td>${u.id}</td>

<td>${u.nome}</td>

<td>${u.email}</td>

<td>${u.ruolo}</td>

<td>

<button class="btn-edit" onclick="modificaUtente(${u.id})">
Modifica
</button>

<button class="btn-delete" onclick="eliminaUtente(${u.id})">
Elimina
</button>

</td>

`;

tbody.appendChild(tr);

});

}catch(err){

console.error(err);
alert("Errore server");

}

}



async function eliminaUtente(id){

if(!confirm("Vuoi eliminare questo utente?")) return;

const token = localStorage.getItem("accessToken");

try{

const res = await fetch(`/api/utenti/${id}`,{

method:"DELETE",

headers:{
Authorization:"Bearer "+token
}

});

if(!res.ok){
alert("Errore eliminazione");
return;
}

caricaUtenti();

}catch(err){

console.error(err);
alert("Errore server");

}

}

async function aggiungiUtente(){

const nome = document.getElementById("nome").value;
const email = document.getElementById("email").value;
const ruolo = document.getElementById("ruolo").value;

if(!nome || !email){
alert("Inserisci nome ed email");
return;
}

const token = localStorage.getItem("accessToken");

try{

const res = await fetch("/api/utenti",{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+token
},

body:JSON.stringify({
nome,
email,
ruolo
})

});

if(!res.ok){
alert("Errore creazione utente");
return;
}

document.getElementById("nome").value="";
document.getElementById("email").value="";

caricaUtenti();

}catch(err){

console.error(err);
alert("Errore server");

}

}


async function modificaUtente(id){

const nuovoNome = prompt("Nuovo nome utente:");

if(!nuovoNome) return;

const token = localStorage.getItem("accessToken");

try{

const res = await fetch(`/api/utenti/${id}`,{

method:"PUT",

headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+token
},

body:JSON.stringify({
nome:nuovoNome
})

});

if(!res.ok){
alert("Errore modifica");
return;
}

caricaUtenti();

}catch(err){

console.error(err);
alert("Errore server");

}

}



caricaUtenti();
