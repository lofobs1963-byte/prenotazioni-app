document.addEventListener("DOMContentLoaded", async () => {

const token = localStorage.getItem("accessToken");

try{

const res = await fetch("/api/admin/statistiche",{
headers:{
Authorization:`Bearer ${token}`
}
});

const data = await res.json();

document.getElementById("statStudenti").innerText = data.studenti || 0;
document.getElementById("statProfessori").innerText = data.professori || 0;
document.getElementById("statPrenotazioni").innerText = data.prenotazioni || 0;
document.getElementById("statSlot").innerText = data.slot || 0;

}catch(err){

console.error("Errore statistiche:",err);

}

});