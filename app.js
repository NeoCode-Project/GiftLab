(() => {
"use strict";

const GIFTS=[
 {id:"pepe1",name:"Plush Pepe #1",model:"Pumpkin",backdrop:"Onyx Black",image:"assets/plush-pepe-pumpkin.png",value:12500,tier:4},
 {id:"pepe2624",name:"Plush Pepe #2624",model:"Midas Pepe",backdrop:"Steel Grey",image:"assets/plush-pepe-midas.webp",value:10800,tier:4},
 {id:"cap23",name:"Durov's Cap #23",model:"Chicago Bulls",backdrop:"Copper",image:"assets/durov-cap-23.jpg",value:7200,tier:3},
 {id:"capsun",name:"Durov's Cap",model:"Sunrise",backdrop:"Collection",image:"assets/durov-cap-sunrise.webp",value:5800,tier:3}
];

/* Weighted pools. Expected returns are intentionally generous because this is a virtual-only simulator. */
const CASES=[
 {id:"starter",name:"Starter Vault",price:3000,rtp:116,desc:"Все 4 NFT в пуле",pool:[["capsun",60],["cap23",25],["pepe2624",10],["pepe1",5]]},
 {id:"collector",name:"Collector Case",price:4700,rtp:121,desc:"Больше шанс на Pepe",pool:[["capsun",35],["cap23",30],["pepe2624",22],["pepe1",13]]},
 {id:"pepe",name:"Plush Pepe Case",price:7600,rtp:118,desc:"Высокий шанс Plush Pepe",pool:[["capsun",12],["cap23",18],["pepe2624",40],["pepe1",30]]},
 {id:"prime",name:"Prime Vault",price:9000,rtp:123,desc:"Топовый пул",prime:true,pool:[["cap23",15],["pepe2624",45],["pepe1",40]]}
];

const REWARDS=[
 {id:"hourly",name:"1 час",ms:3600000,min:180,max:400,xp:35},
 {id:"daily",name:"1 день",ms:86400000,min:1000,max:1800,xp:200},
 {id:"weekly",name:"7 дней",ms:604800000,min:6000,max:9500,xp:1000}
];

const MODE_DEFAULT=()=>({balance:5000,inventory:[],xp:0,prime:false,best:null,freeCases:0,usedPromos:[],rewards:{hourly:0,daily:0,weekly:0},stats:{cases:0,upgrades:0,battles:0}});
const ROOT_DEFAULT=()=>({mode:"normal",normal:MODE_DEFAULT(),sandbox:{...MODE_DEFAULT(),balance:999999999}});

let root=loadRoot(), activeCase=null, fromIndex=null, targetId=null, upgrading=false, battling=false;

function loadRoot(){
 try{
   const raw=JSON.parse(localStorage.getItem("giftlab-v5")||"null");
   if(raw?.normal&&raw?.sandbox)return raw;
 }catch{}
 return ROOT_DEFAULT();
}
function cur(){return root[root.mode]}
function save(){
 localStorage.setItem("giftlab-v5",JSON.stringify(root));
 sync();
 window.dispatchEvent(new CustomEvent("giftlab-save",{detail:root}));
}
function gift(id){return GIFTS.find(x=>x.id===id)}
function fmt(n){return Number(n||0).toLocaleString("ru-RU")+" ★"}
function toast(t){const e=document.querySelector("#toast");e.textContent=t;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),2200)}
function spend(n){if(root.mode==="sandbox")return true;if(cur().balance<n){toast("Не хватает Stars");return false}cur().balance-=n;return true}
function earn(n){if(root.mode!=="sandbox")cur().balance+=n}
function addGift(id){cur().inventory.push({id,at:Date.now()});const g=gift(id);if(!cur().best||g.value>gift(cur().best).value)cur().best=id}

function sync(){
 const s=cur(), sandbox=root.mode==="sandbox";
 document.querySelector("#sandbox").checked=sandbox;
 document.querySelector("#modeText").textContent=sandbox?"Sandbox":"Обычный";
 document.querySelector("#balance").textContent=sandbox?"∞":s.balance.toLocaleString("ru-RU");
 document.querySelector("#statBalance").textContent=sandbox?"∞ ★":fmt(s.balance);
 document.querySelector("#statMode").textContent=sandbox?"отдельный Sandbox":"обычный режим";
 document.querySelector("#statItems").textContent=s.inventory.length;
 document.querySelector("#statBest").textContent=s.best?gift(s.best).name:"—";
 document.querySelector("#statXP").textContent=s.xp+" XP";
 const lvl=Math.floor(s.xp/500)+1;
 document.querySelector("#level").textContent=lvl;
 document.querySelector("#statLvl").textContent="уровень "+lvl;
}

function goto(id){
 document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
 document.querySelector("#"+id).classList.add("active");
 document.querySelectorAll("nav button").forEach(x=>x.classList.toggle("active",x.dataset.page===id));
 document.querySelector("#title").textContent=({home:"Главная",market:"Маркет",cases:"Кейсы",upgrade:"Апгрейд",battles:"Баттлы",pass:"Battle Pass",inventory:"Инвентарь",rewards:"Награды",promo:"Промокоды",admin:"Админ"})[id];
 if(id==="market")renderMarket();
 if(id==="cases")renderCases();
 if(id==="upgrade")renderUpgrade();
 if(id==="battles")renderBattleConfig();
 if(id==="pass")renderPass();
 if(id==="inventory")renderInventory();
 if(id==="rewards")renderRewards();
 if(id==="admin")window.dispatchEvent(new Event("giftlab-admin-open"));
}

function giftCard(g,inventory=false,index=0){
 return `<article class="gift-card"><div class="gift-img"><img src="${g.image}" alt="${g.name}"></div><div class="gift-info"><b>${g.name}</b><small>${g.model} • ${g.backdrop}</small><div class="value">Virtual Value: ${fmt(g.value)}</div>${inventory?`<button class="secondary sell" data-i="${index}" style="width:100%;margin-top:10px">Продать за ${fmt(Math.floor(g.value*.78))}</button>`:""}</div></article>`
}
function poolIds(c){return c.pool.map(x=>x[0])}
function caseCard(c){
 const imgs=poolIds(c).slice(-2).map(id=>`<img src="${gift(id).image}">`).join("");
 return `<article class="case-card" data-case="${c.id}"><div class="case-art">${imgs}</div><small>${c.prime?"PRIME":"CASE"}</small><b>${c.name}</b><div class="price">${fmt(c.price)}</div><small>${c.desc}</small><span class="rtp">RTP ~${c.rtp}%</span></article>`
}
function bindCases(sel){document.querySelectorAll(`${sel} [data-case]`).forEach(x=>x.onclick=()=>showCase(x.dataset.case))}
function renderHomeCases(){document.querySelector("#homeCases").innerHTML=CASES.map(caseCard).join("");bindCases("#homeCases")}
function renderCases(){document.querySelector("#caseGrid").innerHTML=CASES.map(caseCard).join("");bindCases("#caseGrid")}
function renderMarket(){const q=document.querySelector("#search").value.toLowerCase();document.querySelector("#marketGrid").innerHTML=GIFTS.filter(g=>(g.name+" "+g.model+" "+g.backdrop).toLowerCase().includes(q)).map(g=>giftCard(g)).join("")}
function renderInventory(){
 const s=cur(),grid=document.querySelector("#inventoryGrid");
 if(!s.inventory.length){grid.innerHTML='<div class="muted">Инвентарь пуст — открой кейс.</div>';return}
 grid.innerHTML=s.inventory.map((e,i)=>giftCard(gift(e.id),true,i)).join("");
 grid.querySelectorAll(".sell").forEach(b=>b.onclick=()=>{const i=+b.dataset.i,g=gift(s.inventory[i].id);earn(Math.floor(g.value*.78));s.inventory.splice(i,1);save();renderInventory();toast("Продано: "+g.name)})
}

function weightedDrop(c){
 const total=c.pool.reduce((a,x)=>a+x[1],0);
 let r=Math.random()*total;
 for(const [id,w] of c.pool){r-=w;if(r<=0)return gift(id)}
 return gift(c.pool[c.pool.length-1][0])
}

function showCase(id){
 const c=CASES.find(x=>x.id===id);
 if(c.prime&&!cur().prime){toast("Нужен Prime");return}
 activeCase=c;document.querySelector("#caseName").textContent=c.name;
 document.querySelector("#drop").classList.add("hidden");buildRoll(c);
 document.querySelector("#caseModal").classList.remove("hidden");
 document.querySelector("#openBtn").textContent=cur().freeCases>0?"Открыть бесплатно":"Открыть за "+fmt(c.price);
 document.querySelector("#openBtn").disabled=false;
}
function randomFromPool(c){return weightedDrop(c)}
function buildRoll(c){
 const items=Array.from({length:24},()=>randomFromPool(c));
 const r=document.querySelector("#roulette");r.style.transition="none";r.style.transform="translateX(0)";
 r.innerHTML=items.map(g=>`<div class="roll-item"><img src="${g.image}"><b>${g.name}</b></div>`).join("")
}
function openCase(){
 if(!activeCase)return;
 let ok=false;if(cur().freeCases>0){cur().freeCases--;ok=true}else ok=spend(activeCase.price);if(!ok)return;
 const d=weightedDrop(activeCase),r=document.querySelector("#roulette");buildRoll(activeCase);
 const idx=16;r.children[idx].innerHTML=`<img src="${d.image}"><b>${d.name}</b>`;
 const viewport=document.querySelector(".roulette-viewport").clientWidth,offset=idx*152-(viewport/2-72.5);
 requestAnimationFrame(()=>{r.style.transition="transform 3.8s cubic-bezier(.08,.78,.1,1)";r.style.transform=`translateX(-${offset}px)`});
 document.querySelector("#openBtn").disabled=true;
 setTimeout(()=>{addGift(d.id);cur().xp+=100;cur().stats.cases++;save();const box=document.querySelector("#drop");box.classList.remove("hidden");box.innerHTML=`<img src="${d.image}"><b>${d.name}</b><span>${d.model} • ${d.backdrop}</span><div class="value">${fmt(d.value)}</div>`;document.querySelector("#openBtn").disabled=false;document.querySelector("#openBtn").textContent="Открыть ещё"},3900)
}

function selRow(g,kind,index){
 const active=kind==="from"?fromIndex===index:targetId===g.id;
 return `<div class="select-item ${active?"active":""}" data-kind="${kind}" ${kind==="from"?`data-i="${index}"`:`data-id="${g.id}"`}><img src="${g.image}"><div><b>${g.name}</b><small>${g.model}</small></div><b>${fmt(g.value)}</b></div>`
}
function renderUpgrade(){
 const s=cur();
 if(fromIndex!==null&&!s.inventory[fromIndex])fromIndex=null;
 document.querySelector("#fromList").innerHTML=s.inventory.length?s.inventory.map((e,i)=>selRow(gift(e.id),"from",i)).join(""):'<span class="muted">Сначала получи предмет.</span>';
 document.querySelector("#toList").innerHTML=GIFTS.map(g=>selRow(g,"to",0)).join("");
 document.querySelectorAll('[data-kind="from"]').forEach(x=>x.onclick=()=>{if(upgrading)return;fromIndex=+x.dataset.i;renderUpgrade()});
 document.querySelectorAll('[data-kind="to"]').forEach(x=>x.onclick=()=>{if(upgrading)return;targetId=x.dataset.id;renderUpgrade()});
 updateUpgrade()
}
function getChance(){
 if(fromIndex===null||!cur().inventory[fromIndex]||!targetId)return 0;
 const a=gift(cur().inventory[fromIndex].id),b=gift(targetId);
 if(!a||!b||b.value<=a.value)return 0;
 return Math.min(90,(a.value/b.value)*95);
}
function updateUpgrade(){
 const ch=getChance(),wheel=document.querySelector("#upgradeWheel");
 document.querySelector("#chance").textContent=ch.toFixed(1)+"%";
 wheel.style.setProperty("--success",(ch*3.6)+"deg");
 document.querySelector("#upgradeBtn").disabled=!ch||upgrading;
 document.querySelector("#upgradeStatus").textContent=ch?`Зелёная зона: ${ch.toFixed(1)}%`:"Выбери более дорогую цель";
}
function doUpgrade(){
 const ch=getChance();if(!ch||upgrading)return;
 upgrading=true;document.querySelector("#upgradeBtn").disabled=true;
 const wheel=document.querySelector("#upgradeWheel"),status=document.querySelector("#upgradeStatus");
 const success=Math.random()*100<ch;
 const successDeg=ch*3.6;
 let landing;
 if(success) landing=Math.max(2,Math.random()*Math.max(2,successDeg-4));
 else landing=successDeg+2+Math.random()*Math.max(2,356-successDeg);
 const spins=5+Math.floor(Math.random()*3);
 const rotation=spins*360+(360-landing);
 wheel.style.transition="none";wheel.style.transform="rotate(0deg)";
 requestAnimationFrame(()=>requestAnimationFrame(()=>{wheel.style.transition="transform 4.2s cubic-bezier(.08,.78,.1,1)";wheel.style.transform=`rotate(${rotation}deg)`}));
 status.className="upgrade-status";status.textContent="Крутим...";
 setTimeout(()=>{
   const s=cur(),a=gift(s.inventory[fromIndex].id),b=gift(targetId);
   s.inventory.splice(fromIndex,1);
   if(success){addGift(b.id);status.className="upgrade-status win";status.textContent="УСПЕХ • "+b.name;toast("Апгрейд успешен")}
   else{status.className="upgrade-status lose";status.textContent="НЕУДАЧА • "+a.name+" потерян";toast("Апгрейд не прошёл")}
   s.xp+=150;s.stats.upgrades++;fromIndex=null;targetId=null;upgrading=false;save();
   setTimeout(()=>{wheel.style.transition="none";wheel.style.transform="rotate(0deg)";renderUpgrade()},800)
 },4300)
}

function renderBattleConfig(){
 const sel=document.querySelector("#battleCase");
 const current=sel.value;
 sel.innerHTML=CASES.filter(c=>!c.prime||cur().prime).map(c=>`<option value="${c.id}">${c.name} — ${fmt(c.price)}</option>`).join("");
 if(current&&[...sel.options].some(o=>o.value===current))sel.value=current;
}
function battle(){
 if(battling)return;
 const c=CASES.find(x=>x.id===document.querySelector("#battleCase").value),rounds=+document.querySelector("#battleRounds").value,mode=document.querySelector("#battleMode").value;
 const cost=c.price*rounds;if(!spend(cost))return;
 battling=true;document.querySelector("#battleBtn").disabled=true;
 const area=document.querySelector("#battleArea");area.className="";area.innerHTML="";
 let youTotal=0,botTotal=0,youDrops=[],botDrops=[],r=0;
 document.querySelector("#youScore").textContent="0 ★";document.querySelector("#botScore").textContent="0 ★";

 const next=()=>{
   if(r>=rounds){
     const youWin=mode==="classic"?youTotal>=botTotal:youTotal<=botTotal;
     if(youWin){[...youDrops,...botDrops].forEach(g=>addGift(g.id))}
     cur().xp+=250+rounds*60;cur().stats.battles++;save();
     area.insertAdjacentHTML("beforeend",`<div class="battle-final ${youWin?"win":"lose"}">${youWin?"ПОБЕДА — все дропы твои":"ПОРАЖЕНИЕ"}<br><small>${mode==="crazy"?"Crazy mode: меньшая сумма выигрывает":"Classic mode: большая сумма выигрывает"}</small></div>`);
     battling=false;document.querySelector("#battleBtn").disabled=false;return;
   }
   r++;
   const you=weightedDrop(c),bot=weightedDrop(c);youDrops.push(you);botDrops.push(bot);youTotal+=you.value;botTotal+=bot.value;
   document.querySelector("#youScore").textContent=fmt(youTotal);document.querySelector("#botScore").textContent=fmt(botTotal);
   const roundWinner=mode==="classic"?(you.value>=bot.value?"you":"bot"):(you.value<=bot.value?"you":"bot");
   area.insertAdjacentHTML("beforeend",`<div class="battle-round">
     <div class="battle-player ${roundWinner==="you"?"round-win":""}"><img src="${you.image}"><div><small>ТЫ • ROUND ${r}</small><b>${you.name}</b><span>${fmt(you.value)}</span></div></div>
     <div class="round-center"><small>ROUND</small><b>${r}/${rounds}</b></div>
     <div class="battle-player right ${roundWinner==="bot"?"round-win":""}"><div><small>БОТ • ROUND ${r}</small><b>${bot.name}</b><span>${fmt(bot.value)}</span></div><img src="${bot.image}"></div>
   </div>`);
   area.lastElementChild?.scrollIntoView({behavior:"smooth",block:"nearest"});
   setTimeout(next,700);
 };
 next();
}

function renderPass(){
 const s=cur(),lvl=Math.floor(s.xp/500)+1,p=s.xp%500;
 document.querySelector("#xpText").textContent=p+" / 500 XP";document.querySelector("#xpBar").style.width=(p/5)+"%";
 document.querySelector("#primeText").textContent=s.prime?"Активирован":"Не активирован";
 document.querySelector("#primeBtn").disabled=s.prime;document.querySelector("#primeBtn").textContent=s.prime?"Prime активен":"Купить за 2 500 ★";
 document.querySelector("#tiers").innerHTML=Array.from({length:10},(_,i)=>`<div class="tier ${lvl>i+1?"done":""}"><small>LVL ${i+1}</small><b>${i%3===2?"CASE":(i+1)*150+" ★"}</b><small>${lvl>i+1?"готово":"locked"}</small></div>`).join("")
}
function buyPrime(){if(cur().prime)return;if(!spend(2500))return;cur().prime=true;save();renderPass();renderBattleConfig();toast("Prime активирован")}
function left(r){return Math.max(0,r.ms-(Date.now()-(cur().rewards?.[r.id]||0)))}
function timer(ms){if(ms<=0)return"ГОТОВО";let s=Math.ceil(ms/1000),d=Math.floor(s/86400),h=Math.floor((s%86400)/3600),m=Math.floor((s%3600)/60),q=s%60;return d?`${d}д ${h}ч ${m}м`:h?`${h}ч ${m}м ${q}с`:`${m}м ${q}с`}
function renderRewards(){
 cur().rewards={hourly:0,daily:0,weekly:0,...cur().rewards};
 document.querySelector("#rewardGrid").innerHTML=REWARDS.map(r=>{const l=left(r);return `<article class="reward ${l<=0?"ready":""}"><div class="icon">★</div><h3>${r.name}</h3><p>${fmt(r.min)}–${fmt(r.max)} + ${r.xp} XP</p><div class="timer">${timer(l)}</div><button class="${l<=0?"primary":"secondary"} claim" data-id="${r.id}" ${l>0?"disabled":""}>${l<=0?"Забрать":"Ожидание"}</button></article>`}).join("");
 document.querySelectorAll(".claim").forEach(x=>x.onclick=()=>claim(x.dataset.id))
}
function claim(id){const r=REWARDS.find(x=>x.id===id);if(left(r)>0)return;const n=Math.floor(r.min+Math.random()*(r.max-r.min+1));earn(n);cur().xp+=r.xp;cur().rewards[id]=Date.now();save();renderRewards();toast("Получено "+fmt(n)+" + "+r.xp+" XP")}

async function promo(){
 const code=document.querySelector("#promoInput").value.trim().toUpperCase(),out=document.querySelector("#promoResult");
 if(!code)return;
 if(cur().usedPromos.includes(code)){out.textContent="Этот код уже использован.";return}
 let reward=null;
 if(window.GiftLabFirebase?.redeemPromo){reward=await window.GiftLabFirebase.redeemPromo(code)}
 if(!reward){
   const local={WELCOME:{type:"stars",amount:750},PRIMEDEMO:{type:"xp",amount:1000},LUCKYCASE:{type:"case",amount:1}};
   reward=local[code]||null;
 }
 if(!reward){out.textContent="Промокод не найден.";return}
 applyPromoReward(reward);cur().usedPromos.push(code);save();
 out.textContent=`Активирован: ${code}`;toast("Промокод активирован")
}
function applyPromoReward(r){if(r.type==="stars")earn(+r.amount||0);else if(r.type==="xp")cur().xp+=(+r.amount||0);else if(r.type==="case")cur().freeCases+=(+r.amount||1)}
function sellAll(){if(!cur().inventory.length)return;let n=0;cur().inventory.forEach(e=>n+=Math.floor(gift(e.id).value*.78));cur().inventory=[];earn(n);save();renderInventory();toast("Продано на "+fmt(n))}

function bind(){
 document.querySelectorAll("nav button").forEach(x=>x.onclick=()=>goto(x.dataset.page));
 document.querySelectorAll(".jump").forEach(x=>x.onclick=()=>goto(x.dataset.to));
 document.querySelector("#sandbox").onchange=e=>{root.mode=e.target.checked?"sandbox":"normal";fromIndex=null;targetId=null;save();renderHomeCases();goto("home");toast(root.mode==="sandbox"?"Sandbox включён — отдельный прогресс":"Обычный режим — отдельный прогресс")};
 document.querySelector("#search").oninput=renderMarket;
 document.querySelector("#closeModal").onclick=()=>document.querySelector("#caseModal").classList.add("hidden");
 document.querySelector("#caseModal").onclick=e=>{if(e.target.id==="caseModal")e.currentTarget.classList.add("hidden")};
 document.querySelector("#openBtn").onclick=openCase;document.querySelector("#upgradeBtn").onclick=doUpgrade;document.querySelector("#battleBtn").onclick=battle;
 document.querySelector("#primeBtn").onclick=buyPrime;document.querySelector("#promoBtn").onclick=promo;document.querySelector("#sellAll").onclick=sellAll;
 document.querySelector("#resetBtn").onclick=()=>{if(confirm("Сбросить прогресс ТОЛЬКО текущего режима?")){root[root.mode]=root.mode==="sandbox"?{...MODE_DEFAULT(),balance:999999999}:MODE_DEFAULT();save();goto("home")}};
}

window.GiftLab={
 getRoot:()=>structuredClone(root),
 applyCloudRoot:r=>{if(r?.normal&&r?.sandbox){root=r;localStorage.setItem("giftlab-v5",JSON.stringify(root));sync()}},
 setCloudStatus:(ok,text)=>{const e=document.querySelector("#cloud");e.className="cloud "+(ok?"firebase":"local");e.textContent="● "+text},
 currentState:()=>cur()
};

document.addEventListener("DOMContentLoaded",()=>{
 bind();sync();renderHomeCases();renderMarket();renderCases();renderUpgrade();renderBattleConfig();renderPass();renderInventory();renderRewards();
 setInterval(()=>{if(document.querySelector("#rewards").classList.contains("active"))renderRewards()},1000);
 console.log("GiftLab V5 core loaded");
});
})();