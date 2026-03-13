document.addEventListener("DOMContentLoaded", caricaProfessori);

async function caricaProfessori(){

const token = localStorage.getItem("accessToken");

if(!token){
window.location="/login.html";
return;
}

try{

const res = await fetch("/api/admin/professori",{
headers:{
"Authorization":"Bearer "+token
}
});

const professori = await res.json();

console.log("PROFESSORI:",professori);

const tbody = document.getElementById("tabellaProfessori");
tbody.innerHTML="";

professori.forEach(p=>{

const tr=document.createElement("tr");

tr.innerHTML = `
<td>${p.id}</td>

<td contenteditable="true">${p.nome}</td>

<td contenteditable="true">${p.email}</td>

<td contenteditable="true">${p.materia || ""}</td>

<td>

<button class="btn-primary" onclick="salvaProf(this,${p.id})">
Salva
</button>

<button class="btn-delete" onclick="eliminaProf(${p.id})">
Elimina
</button>

</td>
`;

tbody.appendChild(tr);

});

}catch(err){

console.error("Errore caricamento professori:",err);

}

}


async function aggiungiProf(){

const token = localStorage.getItem("accessToken");

const nome=document.getElementById("nomeProf").value;
const email=document.getElementById("emailProf").value;
const password=document.getElementById("passwordProf").value;
const materia=document.getElementById("materiaProf").value;

const res = await fetch("/api/admin/professori",{

method:"POST",

headers:{
"Content-Type":"application/json",
"Authorization":"Bearer "+token
},

body:JSON.stringify({
nome,
email,
password,
materia
})

});

await res.json();

caricaProfessori();

}

async function salvaProf(btn,id){

const tr = btn.closest("tr");

const nome = tr.children[1].innerText;
const email = tr.children[2].innerText;
const materia = tr.children[3].innerText;

const token = localStorage.getItem("accessToken");

await fetch(`/api/admin/professori/${id}`,{

method:"PUT",

headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+token
},

body:JSON.stringify({
nome,
email,
materia
})

});

alert("Professore aggiornato");

}


async function eliminaProf(id){

const token = localStorage.getItem("accessToken");

if(!confirm("Eliminare professore?")) return;

await fetch(`/api/admin/professori/${id}`,{

method:"DELETE",

headers:{
"Authorization":"Bearer "+token
}

});

caricaProfessori();

}