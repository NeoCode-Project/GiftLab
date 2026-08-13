(() => {
"use strict";

const GIFTS=[
 {id:"pepe1",name:"Plush Pepe #1",model:"Pumpkin",backdrop:"Onyx Black",image:"assets/plush-pepe-pumpkin.png",value:12500,rarity:"legendary"},
 {id:"pepe2624",name:"Plush Pepe #2624",model:"Midas Pepe",backdrop:"Steel Grey",image:"assets/plush-pepe-midas.webp",value:10800,rarity:"legendary"},
 {id:"cap23",name:"Durov's Cap #23",model:"Chicago Bulls",backdrop:"Copper",image:"assets/durov-cap-23.jpg",value:7200,rarity:"epic"},
 {id:"capsun",name:"Durov's Cap",model:"Sunrise",backdrop:"Collection",image:"assets/durov-cap-sunrise.webp",value:5800,rarity:"epic"}
];
const CASES=[
 {id:"starter",name:"Starter Gifts",price:500,pool:["cap23","capsun"],desc:"Durov's Cap collection"},
 {id:"pepe",name:"Plush Pepe Case",price:1800,pool:["pepe1","pepe2624","capsun"],desc:"Шанс на Plush Pepe"},
 {id:"collector",name:"Collector Vault",price:3000,pool:["pepe1","pepe2624","cap23","capsun"],desc:"Все collectible gifts"},
 {id:"prime",name:"Prime Case",price:4200,pool:["pepe1","pepe2624","cap23"],desc:"Топовый пул",prime:true}
];
const REWARDS=[
 {id:"hourly",name:"1 час",ms:3600000,min:100,max:250,xp:30},
 {id:"daily",name:"1 день",ms:86400000,min:600,max:1200,xp:180},
 {id:"weekly",name:"7 дней",ms:604800000,min:3500,max:6500,xp:900}
];
const DEFAULT={balance:5000,sandbox:false,inventory:[],xp:0,prime:false,best:null,freeCases:0,usedPromos:[],rewards:{hourly:0,daily:0,weekly:0}};
let state=load();
let activeCase=null,fromIndex=null,targetId=null;

function load(){try{return {...DEFAULT,...JSON.parse(localStorage.getItem("giftlab-v4")||"{}")}}catch{return structuredClone(DEFAULT)}}
function save(){localStorage.setItem("giftlab-v4",JSON.stringify(state));sync();window.dispatchEvent(new CustomEvent("giftlab-save",{detail:state}))}
function gift(id){return GIFTS.find(x=>x.id===id)}
function fmt(n){return Number(n).toLocaleString("ru-RU")+" ★"}
function toast(t){const e=document.querySelector("#toast");e.textContent=t;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),2200)}
function spend(n){if(state.sandbox)return true;if(state.balance<n){toast("Не хватает Stars");return false}state.balance-=n;return true}
function earn(n){if(!state.sandbox)state.balance+=n}
function addGift(id){state.inventory.push({id,at:Date.now()});const g=gift(id);if(!state.best||g.value>gift(state.best).value)state.best=id}
function sync(){
 const bal=state.sandbox?"∞":state.balance.toLocaleString("ru-RU");
 document.querySelector("#balance").textContent=bal;document.querySelector("#modeText").textContent=state.sandbox?"Sandbox":"Обычный";
 document.querySelector("#statBalance").textContent=state.sandbox?"∞ ★":fmt(state.balance);document.querySelector("#statItems").textContent=state.inventory.length;
 document.querySelector("#statBest").textContent=state.best?gift(state.best).name:"—";document.querySelector("#statXP").textContent=state.xp+" XP";
 const lvl=Math.floor(state.xp/500)+1;document.querySelector("#level").textContent=lvl;document.querySelector("#statLvl").textContent="уровень "+lvl;
}
function goto(id){
 document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));document.querySelector("#"+id).classList.add("active");
 document.querySelectorAll("nav button").forEach(x=>x.classList.toggle("active",x.dataset.page===id));
 document.querySelector("#title").textContent=({home:"Главная",market:"Маркет",cases:"Кейсы",upgrade:"Апгрейд",battles:"Баттлы",pass:"Battle Pass",inventory:"Инвентарь",rewards:"Награды",promo:"Промокоды"})[id];
 if(id==="market")renderMarket();if(id==="cases")renderCases();if(id==="upgrade")renderUpgrade();if(id==="pass")renderPass();if(id==="inventory")renderInventory();if(id==="rewards")renderRewards();
}
function giftCard(g,inventory=false,index=0){return `<article class="gift-card"><div class="gift-img"><img src="${g.image}" alt="${g.name}"></div><div class="gift-info"><b>${g.name}</b><small>${g.model} • ${g.backdrop}</small><div class="value">Virtual Value: ${fmt(g.value)}</div>${inventory?`<button class="secondary sell" data-i="${index}" style="width:100%;margin-top:10px">Продать за ${fmt(Math.floor(g.value*.72))}</button>`:""}</div></article>`}
function caseCard(c){const ims=c.pool.slice(0,2).map(id=>`<img src="${gift(id).image}">`).join("");return `<article class="case-card" data-case="${c.id}"><div class="case-art">${ims}</div><small>${c.prime?"PRIME":"CASE"}</small><b>${c.name}</b><div class="price">${fmt(c.price)}</div><small>${c.desc}</small></article>`}
function bindCases(sel){document.querySelectorAll(`${sel} [data-case]`).forEach(x=>x.onclick=()=>showCase(x.dataset.case))}
function renderHomeCases(){document.querySelector("#homeCases").innerHTML=CASES.map(caseCard).join("");bindCases("#homeCases")}
function renderCases(){document.querySelector("#caseGrid").innerHTML=CASES.map(caseCard).join("");bindCases("#caseGrid")}
function renderMarket(){const q=document.querySelector("#search").value.toLowerCase();document.querySelector("#marketGrid").innerHTML=GIFTS.filter(g=>(g.name+" "+g.model).toLowerCase().includes(q)).map(g=>giftCard(g)).join("")}
function renderInventory(){
 const grid=document.querySelector("#inventoryGrid");if(!state.inventory.length){grid.innerHTML='<div class="muted">Инвентарь пуст — открой кейс.</div>';return}
 grid.innerHTML=state.inventory.map((e,i)=>giftCard(gift(e.id),true,i)).join("");
 grid.querySelectorAll(".sell").forEach(b=>b.onclick=()=>{const i=+b.dataset.i,g=gift(state.inventory[i].id);earn(Math.floor(g.value*.72));state.inventory.splice(i,1);save();renderInventory();toast("Продано: "+g.name)})
}
function showCase(id){
 const c=CASES.find(x=>x.id===id);if(c.prime&&!state.prime){toast("Нужен Prime");return}activeCase=c;
 document.querySelector("#caseName").textContent=c.name;document.querySelector("#drop").classList.add("hidden");buildRoll(c);document.querySelector("#modal").classList.remove("hidden");
 document.querySelector("#openBtn").textContent=state.freeCases>0?"Открыть бесплатно":"Открыть за "+fmt(c.price);document.querySelector("#openBtn").disabled=false;
}
function buildRoll(c){
 const items=Array.from({length:20},(_,i)=>gift(c.pool[i%c.pool.length]));const r=document.querySelector("#roulette");r.style.transition="none";r.style.transform="translateX(0)";
 r.innerHTML=items.map(g=>`<div class="roll-item"><img src="${g.image}"><b>${g.name}</b></div>`).join("")
}
function randomDrop(c){return gift(c.pool[Math.floor(Math.random()*c.pool.length)])}
function openCase(){
 if(!activeCase)return;let ok=false;if(state.freeCases>0){state.freeCases--;ok=true}else ok=spend(activeCase.price);if(!ok)return;
 const d=randomDrop(activeCase),r=document.querySelector("#roulette");buildRoll(activeCase);const idx=13;r.children[idx].innerHTML=`<img src="${d.image}"><b>${d.name}</b>`;
 const viewport=document.querySelector(".roulette-viewport").clientWidth,offset=idx*152-(viewport/2-72.5);requestAnimationFrame(()=>{r.style.transition="transform 3.8s cubic-bezier(.08,.78,.1,1)";r.style.transform=`translateX(-${offset}px)`});
 document.querySelector("#openBtn").disabled=true;setTimeout(()=>{addGift(d.id);state.xp+=100;save();const box=document.querySelector("#drop");box.classList.remove("hidden");box.innerHTML=`<img src="${d.image}"><b>${d.name}</b><span>${d.model} • ${d.backdrop}</span><div class="value">${fmt(d.value)}</div>`;document.querySelector("#openBtn").disabled=false;document.querySelector("#openBtn").textContent="Открыть ещё"},3900)
}
function selRow(g,kind,index){const active=kind==="from"?fromIndex===index:targetId===g.id;return `<div class="select-item ${active?"active":""}" data-kind="${kind}" ${kind==="from"?`data-i="${index}"`:`data-id="${g.id}"`}><img src="${g.image}"><div><b>${g.name}</b><small>${g.model}</small></div><b>${fmt(g.value)}</b></div>`}
function renderUpgrade(){
 document.querySelector("#fromList").innerHTML=state.inventory.length?state.inventory.map((e,i)=>selRow(gift(e.id),"from",i)).join(""):'<span class="muted">Сначала получи предмет.</span>';
 document.querySelector("#toList").innerHTML=GIFTS.map(g=>selRow(g,"to",0)).join("");
 document.querySelectorAll('[data-kind="from"]').forEach(x=>x.onclick=()=>{fromIndex=+x.dataset.i;renderUpgrade()});
 document.querySelectorAll('[data-kind="to"]').forEach(x=>x.onclick=()=>{targetId=x.dataset.id;renderUpgrade()});updateChance()
}
function updateChance(){
 let ch=0;if(fromIndex!==null&&state.inventory[fromIndex]&&targetId){const a=gift(state.inventory[fromIndex].id),b=gift(targetId);if(b.value>a.value)ch=Math.min(95,a.value/b.value*95)}
 document.querySelector("#chance").textContent=ch.toFixed(1)+"%";document.querySelector("#ring").style.setProperty("--deg",(ch*3.6)+"deg");document.querySelector("#upgradeBtn").disabled=!ch;document.querySelector("#upgradeBtn").textContent=ch?"Апгрейд • "+ch.toFixed(1)+"%":"Выбери более дорогую цель";
}
function doUpgrade(){
 if(fromIndex===null||!targetId||!state.inventory[fromIndex])return;const a=gift(state.inventory[fromIndex].id),b=gift(targetId),ch=Math.min(95,a.value/b.value*95);state.inventory.splice(fromIndex,1);
 if(Math.random()*100<ch){addGift(b.id);toast("УСПЕХ: "+b.name)}else toast("Апгрейд не прошёл");state.xp+=150;fromIndex=null;targetId=null;save();renderUpgrade()
}
function battle(){
 const c=CASES.filter(x=>!x.prime||state.prime)[Math.floor(Math.random()*3)];if(!spend(c.price))return;const you=randomDrop(c),bot=randomDrop(c),win=you.value>=bot.value;if(win){addGift(you.id);addGift(bot.id)}state.xp+=200;save();
 document.querySelector("#battleArea").className="";document.querySelector("#battleArea").innerHTML=`<div class="battle-row"><div class="fighter ${win?"win":"lose"}"><h3>Ты</h3><img src="${you.image}"><b>${you.name}</b><div>${fmt(you.value)}</div></div><b>VS</b><div class="fighter ${win?"lose":"win"}"><h3>Бот</h3><img src="${bot.image}"><b>${bot.name}</b><div>${fmt(bot.value)}</div></div></div><h2 style="text-align:center" class="${win?"win":"lose"}">${win?"ПОБЕДА — оба дропа твои":"ПОРАЖЕНИЕ"}</h2>`
}
function renderPass(){const lvl=Math.floor(state.xp/500)+1,p=state.xp%500;document.querySelector("#xpText").textContent=p+" / 500 XP";document.querySelector("#xpBar").style.width=(p/5)+"%";document.querySelector("#primeText").textContent=state.prime?"Активирован":"Не активирован";document.querySelector("#primeBtn").disabled=state.prime;document.querySelector("#primeBtn").textContent=state.prime?"Prime активен":"Купить за 2 500 ★";document.querySelector("#tiers").innerHTML=Array.from({length:10},(_,i)=>`<div class="tier ${lvl>i+1?"done":""}"><small>LVL ${i+1}</small><b>${i%3===2?"CASE":(i+1)*100+" ★"}</b><small>${lvl>i+1?"готово":"locked"}</small></div>`).join("")}
function buyPrime(){if(state.prime)return;if(!spend(2500))return;state.prime=true;save();renderPass();toast("Prime активирован")}
function left(r){return Math.max(0,r.ms-(Date.now()-(state.rewards?.[r.id]||0)))}
function timer(ms){if(ms<=0)return"ГОТОВО";let s=Math.ceil(ms/1000),d=Math.floor(s/86400),h=Math.floor((s%86400)/3600),m=Math.floor((s%3600)/60),q=s%60;return d?`${d}д ${h}ч ${m}м`:h?`${h}ч ${m}м ${q}с`:`${m}м ${q}с`}
function renderRewards(){state.rewards={hourly:0,daily:0,weekly:0,...state.rewards};document.querySelector("#rewardGrid").innerHTML=REWARDS.map(r=>{const l=left(r);return `<article class="reward ${l<=0?"ready":""}"><div class="icon">★</div><h3>${r.name}</h3><p>${fmt(r.min)}–${fmt(r.max)} + ${r.xp} XP</p><div class="timer">${timer(l)}</div><button class="${l<=0?"primary":"secondary"} claim" data-id="${r.id}" ${l>0?"disabled":""}>${l<=0?"Забрать":"Ожидание"}</button></article>`}).join("");document.querySelectorAll(".claim").forEach(x=>x.onclick=()=>claim(x.dataset.id))}
function claim(id){const r=REWARDS.find(x=>x.id===id);if(left(r)>0)return;const n=Math.floor(r.min+Math.random()*(r.max-r.min+1));earn(n);state.xp+=r.xp;state.rewards[id]=Date.now();save();renderRewards();toast("Получено "+fmt(n)+" + "+r.xp+" XP")}
function promo(){const c=document.querySelector("#promoInput").value.trim().toUpperCase(),out=document.querySelector("#promoResult");if(state.usedPromos.includes(c)){out.textContent="Уже использован";return}if(c==="WELCOME"){earn(750)}else if(c==="PRIMEDEMO"){state.xp+=1000}else if(c==="LUCKYCASE"){state.freeCases++}else{out.textContent="Код не найден";return}state.usedPromos.push(c);save();out.textContent="Промокод активирован";toast("Готово")}
function sellAll(){if(!state.inventory.length)return;let n=0;state.inventory.forEach(e=>n+=Math.floor(gift(e.id).value*.72));state.inventory=[];earn(n);save();renderInventory();toast("Продано на "+fmt(n))}
function bind(){
 document.querySelectorAll("nav button").forEach(x=>x.onclick=()=>goto(x.dataset.page));document.querySelectorAll(".jump").forEach(x=>x.onclick=()=>goto(x.dataset.to));
 document.querySelector("#sandbox").checked=state.sandbox;document.querySelector("#sandbox").onchange=e=>{state.sandbox=e.target.checked;save();toast(state.sandbox?"Sandbox: ∞ ⭐":"Обычный режим")};
 document.querySelector("#search").oninput=renderMarket;document.querySelector("#closeModal").onclick=()=>document.querySelector("#modal").classList.add("hidden");document.querySelector("#modal").onclick=e=>{if(e.target.id==="modal")e.currentTarget.classList.add("hidden")};
 document.querySelector("#openBtn").onclick=openCase;document.querySelector("#upgradeBtn").onclick=doUpgrade;document.querySelector("#battleBtn").onclick=battle;document.querySelector("#primeBtn").onclick=buyPrime;document.querySelector("#promoBtn").onclick=promo;document.querySelector("#sellAll").onclick=sellAll;
 document.querySelector("#resetBtn").onclick=()=>{if(confirm("Сбросить прогресс?")){localStorage.removeItem("giftlab-v4");location.reload()}};
}
window.GiftLab={
 getState:()=>structuredClone(state),
 applyCloudState:s=>{if(s&&typeof s==="object"){state={...DEFAULT,...s};localStorage.setItem("giftlab-v4",JSON.stringify(state));sync()}},
 setCloudStatus:(ok,text)=>{const e=document.querySelector("#cloud");e.className="cloud "+(ok?"firebase":"local");e.textContent="● "+text}
};
document.addEventListener("DOMContentLoaded",()=>{bind();sync();renderHomeCases();renderMarket();renderCases();renderUpgrade();renderPass();renderInventory();renderRewards();setInterval(()=>{if(document.querySelector("#rewards").classList.contains("active"))renderRewards()},1000);console.log("GiftLab V4 core loaded")});
})();