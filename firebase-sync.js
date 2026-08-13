import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

async function start(){
  try{
    const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
    const cred=await signInAnonymously(auth),uid=cred.user.uid,ref=doc(db,"users",uid);
    const snap=await getDoc(ref);
    if(snap.exists()) window.GiftLab?.applyCloudState(snap.data());
    window.GiftLab?.setCloudStatus(true,"Firebase");
    window.addEventListener("giftlab-save",async e=>{
      try{await setDoc(ref,e.detail,{merge:false})}catch(err){console.warn("save failed",err)}
    });
    // ensure first state exists
    await setDoc(ref,window.GiftLab.getState(),{merge:true});
  }catch(err){
    console.error("Firebase optional sync failed:",err);
    window.GiftLab?.setCloudStatus(false,"Local");
  }
}
window.addEventListener("load",start);