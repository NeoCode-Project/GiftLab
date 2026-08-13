import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

let db=null, uid=null, isAdmin=false;

async function start(){
  try{
    const app=initializeApp(firebaseConfig);
    const auth=getAuth(app); db=getFirestore(app);
    const cred=await signInAnonymously(auth); uid=cred.user.uid;
    const userRef=doc(db,"users",uid), snap=await getDoc(userRef);
    if(snap.exists()) window.GiftLab?.applyCloudRoot(snap.data());

    await setDoc(userRef,window.GiftLab.getRoot(),{merge:true});
    window.GiftLab?.setCloudStatus(true,"Firebase");

    window.addEventListener("giftlab-save",async e=>{
      try{await setDoc(userRef,e.detail,{merge:false})}catch(err){console.warn("save failed",err)}
    });

    await checkAdmin();
  }catch(err){
    console.error("Firebase sync failed:",err);
    window.GiftLab?.setCloudStatus(false,"Local");
  }
}

async function checkAdmin(){
  document.querySelector("#adminUid").textContent=uid||"Firebase не подключён";
  if(!db||!uid)return;
  try{
    const snap=await getDoc(doc(db,"admins",uid));
    isAdmin=snap.exists()&&snap.data()?.enabled===true;
  }catch{isAdmin=false}
  const status=document.querySelector("#adminStatus"),btn=document.querySelector("#adminCreatePromo");
  status.textContent=isAdmin?"Админ-доступ подтверждён. Можно создавать промокоды.":"Админ-доступа пока нет.";
  btn.disabled=!isAdmin;
}

async function createPromo(){
  if(!isAdmin||!db)return;
  const code=document.querySelector("#adminPromoCode").value.trim().toUpperCase();
  const type=document.querySelector("#adminPromoType").value;
  const amount=Math.max(1,+document.querySelector("#adminPromoAmount").value||1);
  const out=document.querySelector("#adminPromoResult");
  if(!/^[A-Z0-9_-]{3,24}$/.test(code)){out.textContent="Код: 3–24 символа, A-Z, 0-9, _ или -";return}
  try{
    await setDoc(doc(db,"promos",code),{type,amount,enabled:true,createdAt:Date.now(),createdBy:uid});
    out.textContent=`Создан ${code}: ${type} × ${amount}`;
  }catch(err){console.error(err);out.textContent="Ошибка Firestore Rules или соединения."}
}

async function redeemPromo(code){
  if(!db)return null;
  try{
    const snap=await getDoc(doc(db,"promos",code));
    if(!snap.exists())return null;
    const data=snap.data();if(data.enabled===false)return null;
    return {type:data.type,amount:data.amount};
  }catch{return null}
}

window.GiftLabFirebase={redeemPromo};
window.addEventListener("load",start);
window.addEventListener("giftlab-admin-open",checkAdmin);
document.addEventListener("DOMContentLoaded",()=>document.querySelector("#adminCreatePromo")?.addEventListener("click",createPromo));