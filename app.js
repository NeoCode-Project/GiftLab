window.addEventListener("error", e=>{
  console.error("GiftLab runtime error:", e.error || e.message);
});
window.addEventListener("unhandledrejection", e=>{
  console.error("GiftLab promise error:", e.reason);
});

const DEMO_MARKET = [
  {id:"plush-pepe",name:"Plush Pepe",emoji:"🐸",rarity:"legendary",value:12800,demo:true},
  {id:"durov-cap",name:"Durov's Cap",emoji:"🧢",rarity:"legendary",value:9400,demo:true},
  {id:"jelly-bunny",name:"Jelly Bunny",emoji:"🐰",rarity:"epic",value:4200,demo:true},
  {id:"homemade-cake",name:"Homemade Cake",emoji:"🎂",rarity:"epic",value:3600,demo:true},
  {id:"santa-hat",name:"Santa Hat",emoji:"🎅",rarity:"rare",value:2400,demo:true},
  {id:"spiced-wine",name:"Spiced Wine",emoji:"🍷",rarity:"rare",value:1800,demo:true},
  {id:"party-sparkler",name:"Party Sparkler",emoji:"🎇",rarity:"uncommon",value:950,demo:true},
  {id:"star-badge",name:"Star Badge",emoji:"🌟",rarity:"uncommon",value:700,demo:true},
  {id:"blue-gem",name:"Blue Gem",emoji:"💎",rarity:"rare",value:2800,demo:true},
  {id:"lucky-clover",name:"Lucky Clover",emoji:"🍀",rarity:"common",value:420,demo:true}
];

const CASES = [
  {id:"starter",name:"Starter Gift Case",icon:"🎁",price:350,desc:"Дешёвый старт",pool:["lucky-clover","star-badge","party-sparkler","spiced-wine"]},
  {id:"neon",name:"Neon Case",icon:"🌌",price:900,desc:"Больше rare/epic",pool:["party-sparkler","spiced-wine","santa-hat","blue-gem","homemade-cake"]},
  {id:"collector",name:"Collector Case",icon:"🧰",price:1800,desc:"Шанс на легендарку",pool:["santa-hat","blue-gem","jelly-bunny","homemade-cake","durov-cap"]},
  {id:"prime",name:"Prime Case",icon:"👑",price:3200,desc:"Топовый пул",pool:["blue-gem","jelly-bunny","homemade-cake","durov-cap","plush-pepe"],prime:true}
];

const DEFAULT_STATE = {
  balance:5000, sandbox:false, inventory:[], xp:0, prime:false,
  usedPromos:[], freeCases:0, bestDrop:null,
  rewards:{hourly:0,daily:0,weekly:0,lastDailyClaim:0,streak:0},
  stats:{cases:0,upgrades:0,battles:0}
};

let state = loadState();
let market = [...DEMO_MARKET];
let selectedFrom = null, selectedTo = null, activeCase = null;

function loadState(){
  try { return {...DEFAULT_STATE,...JSON.parse(localStorage.getItem("giftlab-state")||"{}")}; }
  catch { return structuredClone(DEFAULT_STATE); }
}
function save(){
  localStorage.setItem("giftlab-state",JSON.stringify(state));
  syncUI();
  syncCloud();
}
function stars(n){ return Number(n||0).toLocaleString("ru-RU")+" ★"; }
function toast(msg){
  const el=document.querySelector("#toast"); el.textContent=msg; el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"),2200);
}
function getItem(id){ return market.find(x=>x.id===id) || DEMO_MARKET.find(x=>x.id===id) || {id,name:"Unknown Gift",emoji:"🎁",rarity:"common",value:0,demo:true}; }
function rarityLabel(r){return ({common:"COMMON",uncommon:"UNCOMMON",rare:"RARE",epic:"EPIC",legendary:"LEGENDARY"})[r]||r.toUpperCase();}
function pageTitle(id){return ({home:"Главная",market:"Маркет",cases:"Кейсы",upgrade:"Апгрейд NFT",battles:"Баттлы",pass:"Battle Pass",inventory:"Инвентарь",rewards:"Награды",promo:"Промокоды"})[id]}

function gotoPage(id){
  document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
  document.querySelector(`#page-${id}`).classList.add("active");
  document.querySelectorAll(".nav-btn").forEach(x=>x.classList.toggle("active",x.dataset.page===id));
  document.querySelector("#pageTitle").textContent=pageTitle(id);
  if(id==="market") renderMarket();
  if(id==="cases") renderCases();
  if(id==="upgrade") renderUpgrade();
  if(id==="pass") renderPass();
  if(id==="inventory") renderInventory();
  if(id==="rewards") renderRewards();
  if(id==="rewards") renderRewards();
}
document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>gotoPage(b.dataset.page));
document.querySelectorAll("[data-jump]").forEach(b=>b.onclick=()=>gotoPage(b.dataset.jump));

document.querySelector("#sandboxToggle").checked=state.sandbox;
document.querySelector("#sandboxToggle").onchange=e=>{
  state.sandbox=e.target.checked; save();
  toast(state.sandbox?"Sandbox включён: ⭐ ∞":"Обычная экономика включена");
};

function syncUI(){
  const balance = state.sandbox ? "∞" : Number(state.balance).toLocaleString("ru-RU");
  document.querySelector("#balanceText").textContent=balance;
  document.querySelector("#modeLabel").textContent=state.sandbox?"Sandbox":"Обычный";
  document.querySelector("#homeBalance").textContent=state.sandbox?"∞ ★":stars(state.balance);
  document.querySelector("#homeItems").textContent=state.inventory.length;
  document.querySelector("#homeBest").textContent=state.bestDrop?getItem(state.bestDrop)?.name||"—":"—";
  document.querySelector("#homePass").textContent=state.xp+" XP";
  document.querySelector("#homePassSub").textContent="уровень "+(Math.floor(state.xp/500)+1);
  document.querySelector("#levelText").textContent=Math.floor(state.xp/500)+1;
}
function spend(amount){
  if(state.sandbox) return true;
  if(state.balance<amount){toast("Не хватает Stars"); return false;}
  state.balance-=amount; return true;
}
function earn(amount){ if(!state.sandbox) state.balance+=amount; }

function marketCard(x, inventory=false, idx=null){
  return `<div class="market-card rarity-${x.rarity}">
    <div class="market-art">${x.emoji}</div>
    <div class="market-info">
      <b>${x.name}</b>
      <span class="rarity">${rarityLabel(x.rarity)}</span>
      <div class="price">${x.demo?"DEMO • ":""}${stars(x.value)}</div>
      ${inventory?`<button class="ghost sell-one" data-index="${idx}" style="width:100%;margin-top:10px">Продать за ${stars(Math.floor(x.value*.72))}</button>`:""}
    </div>
  </div>`;
}
function renderMarket(){
  const q=document.querySelector("#marketSearch").value.toLowerCase().trim();
  const sort=document.querySelector("#marketSort").value;
  let data=market.filter(x=>x.name.toLowerCase().includes(q));
  data.sort((a,b)=>sort==="priceAsc"?a.value-b.value:sort==="name"?a.name.localeCompare(b.name):b.value-a.value);
  document.querySelector("#marketGrid").innerHTML=data.map(x=>marketCard(x)).join("");
}
document.querySelector("#marketSearch").oninput=renderMarket;
document.querySelector("#marketSort").onchange=renderMarket;

function caseCard(c){
  return `<div class="case-card" data-case="${c.id}">
    <div class="case-icon">${c.icon}</div>
    <small>${c.prime?"PRIME":"CASE"}</small>
    <b>${c.name}</b>
    <div class="price">${stars(c.price)}</div>
    <small>${c.desc}</small>
  </div>`;
}
function renderCases(){
  document.querySelector("#caseGrid").innerHTML=CASES.map(caseCard).join("");
  bindCaseCards("#caseGrid");
}
function renderHomeCases(){
  document.querySelector("#homeCases").innerHTML=CASES.map(caseCard).join("");
  bindCaseCards("#homeCases");
}
function bindCaseCards(selector){
  document.querySelectorAll(`${selector} [data-case]`).forEach(el=>el.onclick=()=>showCase(el.dataset.case));
}

function showCase(id){
  const c=CASES.find(x=>x.id===id);
  if(c.prime&&!state.prime){toast("Нужен Prime Battle Pass");return;}
  activeCase=c;
  document.querySelector("#modalCaseName").textContent=c.name;
  document.querySelector("#modalCaseTag").textContent=`CASE • ${stars(c.price)}`;
  document.querySelector("#dropResult").classList.add("hidden");
  buildRoulette(c);
  document.querySelector("#caseModal").classList.remove("hidden");
  document.querySelector("#openCaseBtn").disabled=false;
  document.querySelector("#openCaseBtn").textContent=state.freeCases>0?"Открыть бесплатно":`Открыть за ${stars(c.price)}`;
}
function buildRoulette(c){
  const arr=Array.from({length:18},(_,i)=>getItem(c.pool[i%c.pool.length]));
  document.querySelector("#roulette").style.transition="none";
  document.querySelector("#roulette").style.transform="translateX(0)";
  document.querySelector("#roulette").innerHTML=arr.map(x=>`<div class="roulette-item rarity-${x.rarity}"><div><div class="em">${x.emoji}</div><b>${x.name}</b><small>${rarityLabel(x.rarity)}</small></div></div>`).join("");
}
document.querySelector("#modalClose").onclick=()=>document.querySelector("#caseModal").classList.add("hidden");
document.querySelector("#caseModal").onclick=e=>{if(e.target.id==="caseModal")e.currentTarget.classList.add("hidden")};

function weightedDrop(c){
  const pool=c.pool.map(getItem);
  const weights={common:50,uncommon:32,rare:15,epic:6,legendary:2};
  const bag=[];
  pool.forEach(x=>{for(let i=0;i<(weights[x.rarity]||5);i++)bag.push(x)});
  return bag[Math.floor(Math.random()*bag.length)];
}
document.querySelector("#openCaseBtn").onclick=()=>{
  if(!activeCase)return;
  let paid=false;
  if(state.freeCases>0){state.freeCases--;paid=true;}
  else paid=spend(activeCase.price);
  if(!paid)return;
  const drop=weightedDrop(activeCase);
  const roulette=document.querySelector("#roulette");
  buildRoulette(activeCase);
  const cards=[...roulette.children];
  const targetIndex=12;
  cards[targetIndex].innerHTML=`<div><div class="em">${drop.emoji}</div><b>${drop.name}</b><small>${rarityLabel(drop.rarity)}</small></div>`;
  const offset=(targetIndex*138)-((document.querySelector(".roulette-wrap").clientWidth/2)-65);
  requestAnimationFrame(()=>{roulette.style.transition="transform 4.1s cubic-bezier(.08,.75,.12,1)";roulette.style.transform=`translateX(-${offset}px)`});
  document.querySelector("#openCaseBtn").disabled=true;
  setTimeout(()=>{
    state.inventory.push({id:drop.id,obtainedAt:Date.now()});
    state.xp+=100; state.stats.cases++;
    if(!state.bestDrop || drop.value>(getItem(state.bestDrop)?.value||0))state.bestDrop=drop.id;
    save();
    const r=document.querySelector("#dropResult");r.classList.remove("hidden");
    r.innerHTML=`<div class="big">${drop.emoji}</div><strong>${drop.name}</strong><span class="rarity">${rarityLabel(drop.rarity)}</span><div class="price">${stars(drop.value)}</div>`;
    document.querySelector("#openCaseBtn").disabled=false;
    document.querySelector("#openCaseBtn").textContent=state.freeCases>0?"Открыть ещё бесплатно":`Открыть ещё за ${stars(activeCase.price)}`;
  },4200);
};

function renderInventory(){
  if(!state.inventory.length){document.querySelector("#inventoryGrid").innerHTML=`<div class="muted">Инвентарь пуст. Открой кейс.</div>`;return;}
  document.querySelector("#inventoryGrid").innerHTML=state.inventory.map((entry,i)=>marketCard(getItem(entry.id),true,i)).join("");
  document.querySelectorAll(".sell-one").forEach(b=>b.onclick=()=>{
    const i=Number(b.dataset.index), item=getItem(state.inventory[i].id);
    earn(Math.floor(item.value*.72)); state.inventory.splice(i,1);save();renderInventory();toast(`Продано: ${item.name}`);
  });
}
document.querySelector("#sellAllBtn").onclick=()=>{
  if(!state.inventory.length)return toast("Инвентарь пуст");
  const total=state.inventory.reduce((s,e)=>s+Math.floor(getItem(e.id).value*.72),0);
  state.inventory=[];earn(total);save();renderInventory();toast(`Продано на ${stars(total)}`);
};

function renderUpgrade(){
  const inv=state.inventory.map((e,i)=>({...getItem(e.id),invIndex:i}));
  const targets=market.filter(x=>!x.demo||true);
  document.querySelector("#upgradeFrom").innerHTML=inv.length?inv.map(x=>selectItem(x,"from")).join(""):`<span class="muted">Нет предметов</span>`;
  document.querySelector("#upgradeTo").innerHTML=targets.map(x=>selectItem(x,"to")).join("");
  document.querySelectorAll('[data-sel="from"]').forEach(x=>x.onclick=()=>{selectedFrom={...getItem(state.inventory[Number(x.dataset.index)].id),invIndex:Number(x.dataset.index)};renderUpgrade();updateChance()});
  document.querySelectorAll('[data-sel="to"]').forEach(x=>x.onclick=()=>{selectedTo=getItem(x.dataset.id);renderUpgrade();updateChance()});
  updateChance();
}
function selectItem(x,type){
  const active=(type==="from"&&selectedFrom?.invIndex===x.invIndex)||(type==="to"&&selectedTo?.id===x.id);
  return `<div class="select-item ${active?"active":""}" data-sel="${type}" ${type==="from"?`data-index="${x.invIndex}"`:`data-id="${x.id}"`}>
    <div class="emoji">${x.emoji}</div><div><b>${x.name}</b><small>${rarityLabel(x.rarity)}</small></div><strong>${stars(x.value)}</strong>
  </div>`;
}
function updateChance(){
  let chance=0;
  if(selectedFrom&&selectedTo&&selectedTo.value>selectedFrom.value) chance=Math.min(95,(selectedFrom.value/selectedTo.value)*95);
  document.querySelector("#chanceText").textContent=chance.toFixed(1)+"%";
  document.querySelector("#chanceRing").style.setProperty("--chance",(chance/100*360)+"deg");
  document.querySelector("#upgradeBtn").textContent=chance>0?`Апгрейд • ${chance.toFixed(1)}%`:"Выберите более дорогую цель";
  document.querySelector("#upgradeBtn").disabled=chance<=0;
}
document.querySelector("#upgradeBtn").onclick=()=>{
  if(!selectedFrom||!selectedTo)return;
  const chance=Math.min(95,(selectedFrom.value/selectedTo.value)*95);
  const ok=Math.random()*100<chance;
  state.inventory.splice(selectedFrom.invIndex,1);
  if(ok){state.inventory.push({id:selectedTo.id,obtainedAt:Date.now()});toast(`УСПЕХ! ${selectedTo.name}`)}
  else toast("Апгрейд не прошёл");
  state.xp+=150;state.stats.upgrades++;selectedFrom=null;selectedTo=null;save();renderUpgrade();
};

document.querySelector("#createBattleBtn").onclick=()=>{
  const c=CASES.filter(x=>!x.prime||state.prime)[Math.floor(Math.random()*CASES.filter(x=>!x.prime||state.prime).length)];
  if(!spend(c.price))return;
  const you=weightedDrop(c), bot=weightedDrop(c);
  const win=you.value>=bot.value;
  if(win)state.inventory.push({id:you.id,obtainedAt:Date.now()},{id:bot.id,obtainedAt:Date.now()});
  state.xp+=200;state.stats.battles++;save();
  document.querySelector("#battleArea").className="battle-area";
  document.querySelector("#battleArea").innerHTML=`<div class="battle-columns">
    <div class="fighter ${win?"winner":"loser"}"><h3>Ты</h3><div class="drop-big">${you.emoji}</div><b>${you.name}</b><div>${stars(you.value)}</div></div>
    <div class="vs"><div>${c.icon}</div>VS</div>
    <div class="fighter ${win?"loser":"winner"}"><h3>Бот</h3><div class="drop-big">${bot.emoji}</div><b>${bot.name}</b><div>${stars(bot.value)}</div></div>
  </div><div style="text-align:center;margin-top:20px"><strong class="${win?"winner":"loser"}">${win?"ПОБЕДА — оба дропа твои":"ПОРАЖЕНИЕ"}</strong></div>`;
};

function renderPass(){
  const level=Math.floor(state.xp/500)+1, progress=state.xp%500;
  document.querySelector("#passProgressText").textContent=`${progress} / 500 XP`;
  document.querySelector("#passProgressBar").style.width=(progress/5)+"%";
  document.querySelector("#primeStatus").textContent=state.prime?"Активирован":"Не активирован";
  document.querySelector("#primeBtn").textContent=state.prime?"Prime активен":"Активировать за 2 500 ★";
  document.querySelector("#primeBtn").disabled=state.prime;
  document.querySelector("#passTrack").innerHTML=Array.from({length:10},(_,i)=>{
    const lvl=i+1, done=level>lvl;
    return `<div class="pass-tier ${done?"done":""}"><small>LVL ${lvl}</small><div class="reward">${i%3===2?"🎁":i%2?"★":"✦"}</div><b>${i%3===2?"Case":(i+1)*100+" ★"}</b><small>${done?"получено":"locked"}</small></div>`
  }).join("");
}
document.querySelector("#primeBtn").onclick=()=>{
  if(state.prime)return;
  if(!spend(2500))return;
  state.prime=true;save();renderPass();toast("Prime Battle Pass активирован");
};


const REWARDS = [
  {id:"hourly",name:"Часовой кейс",icon:"⏱️",cooldown:60*60*1000,stars:[120,260],xp:40,freeCaseChance:.08,desc:"Можно забирать каждый час."},
  {id:"daily",name:"Дневной кейс",icon:"☀️",cooldown:24*60*60*1000,stars:[650,1200],xp:180,freeCaseChance:.20,desc:"Большая ежедневная награда."},
  {id:"weekly",name:"7-дневный кейс",icon:"👑",cooldown:7*24*60*60*1000,stars:[3500,6500],xp:900,freeCaseChance:.65,desc:"Самая крупная бесплатная награда."}
];

function timeLeft(ms){
  if(ms<=0)return "ГОТОВО";
  const s=Math.ceil(ms/1000), d=Math.floor(s/86400), h=Math.floor((s%86400)/3600), m=Math.floor((s%3600)/60), sec=s%60;
  if(d>0)return `${d}д ${h}ч ${m}м`;
  if(h>0)return `${h}ч ${m}м ${sec}с`;
  return `${m}м ${sec}с`;
}
function rewardReady(r){
  const last=Number(state.rewardClaims?.[r.id]||0);
  return Date.now()-last>=r.cooldown;
}
function renderRewards(){
  state.rewardClaims = state.rewardClaims || {hourly:0,daily:0,weekly:0};
  const grid=document.querySelector("#rewardGrid");
  if(!grid)return;
  grid.innerHTML=REWARDS.map(r=>{
    const last=Number(state.rewardClaims[r.id]||0), remain=Math.max(0,r.cooldown-(Date.now()-last)), ready=remain<=0;
    return `<div class="reward-card ${ready?"ready":""}">
      <small>${r.id.toUpperCase()} REWARD</small>
      <div class="reward-icon">${r.icon}</div>
      <h3>${r.name}</h3>
      <div class="reward-desc">${r.desc}</div>
      <div class="reward-prize">★ ${r.stars[0].toLocaleString("ru-RU")}–${r.stars[1].toLocaleString("ru-RU")} + ${r.xp} XP</div>
      <div class="reward-time" data-reward-timer="${r.id}">${ready?"ГОТОВО":timeLeft(remain)}</div>
      <button class="${ready?"primary":"ghost"}" data-claim-reward="${r.id}" ${ready?"":"disabled"}>${ready?"Забрать награду":"Жди таймер"}</button>
    </div>`;
  }).join("");
  document.querySelector("#rewardClaimedCount").textContent=state.rewardClaimedCount||0;
  document.querySelectorAll("[data-claim-reward]").forEach(b=>b.onclick=()=>claimReward(b.dataset.claimReward));
}
function claimReward(id){
  const r=REWARDS.find(x=>x.id===id);
  if(!r||!rewardReady(r))return;
  const amount=Math.floor(r.stars[0]+Math.random()*(r.stars[1]-r.stars[0]+1));
  earn(amount);
  state.xp+=r.xp;
  let extra="";
  if(Math.random()<r.freeCaseChance){state.freeCases=(state.freeCases||0)+1;extra=" + бесплатный кейс";}
  state.rewardClaims[id]=Date.now();
  state.rewardClaimedCount=(state.rewardClaimedCount||0)+1;
  save();renderRewards();
  toast(`Получено ${stars(amount)} + ${r.xp} XP${extra}`);
}
setInterval(()=>{
  if(document.querySelector("#page-rewards")?.classList.contains("active"))renderRewards();
},1000);


document.querySelector("#promoBtn").onclick=()=>{
  const code=document.querySelector("#promoInput").value.trim().toUpperCase();
  const out=document.querySelector("#promoResult");
  if(!code)return;
  if(state.usedPromos.includes(code)){out.textContent="Этот код уже использован.";return}
  let text="";
  if(code==="WELCOME"){earn(750);text="+750 ★";}
  else if(code==="PRIMEDEMO"){state.xp+=1000;text="+1000 XP";}
  else if(code==="LUCKYCASE"){state.freeCases+=1;text="+1 бесплатный кейс";}
  else {out.textContent="Промокод не найден.";return}
  state.usedPromos.push(code);save();out.textContent="Активировано: "+text;
};


const REWARD_CONFIG = {
  hourly:{cooldown:60*60*1000,minStars:100,maxStars:250,freeCases:0,caseChance:.20,xp:25,label:"Hourly Case"},
  daily:{cooldown:24*60*60*1000,minStars:500,maxStars:1000,freeCases:1,caseChance:0,xp:150,label:"Daily Case"},
  weekly:{cooldown:7*24*60*60*1000,minStars:2500,maxStars:5000,freeCases:2,caseChance:0,xp:750,label:"Weekly Vault"}
};
function ensureRewards(){
  state.rewards={hourly:0,daily:0,weekly:0,lastDailyClaim:0,streak:0,...(state.rewards||{})};
}
function timeLeft(ms){
  if(ms<=0)return "Готово";
  const s=Math.ceil(ms/1000), d=Math.floor(s/86400), h=Math.floor((s%86400)/3600), m=Math.floor((s%3600)/60), sec=s%60;
  if(d>0)return `${d}д ${h}ч ${m}м`;
  if(h>0)return `${h}ч ${m}м ${sec}с`;
  return `${m}м ${sec}с`;
}
function rewardReady(type){
  ensureRewards();
  const cfg=REWARD_CONFIG[type];
  return Date.now()-(state.rewards[type]||0)>=cfg.cooldown;
}
function renderRewards(){
  ensureRewards();
  document.querySelector("#rewardBalance").textContent=state.sandbox?"∞ ★":stars(state.balance);
  ["hourly","daily","weekly"].forEach(type=>{
    const cfg=REWARD_CONFIG[type], last=state.rewards[type]||0;
    const left=Math.max(0,cfg.cooldown-(Date.now()-last));
    const timer=document.querySelector(`#${type}Timer`);
    const btn=document.querySelector(`.reward-claim[data-reward="${type}"]`);
    if(timer)timer.textContent=timeLeft(left);
    if(btn){btn.disabled=left>0;btn.textContent=left>0?"Ожидание":"Забрать";}
  });
  renderStreak();
}
function renderStreak(){
  ensureRewards();
  document.querySelector("#streakText").textContent=`${state.rewards.streak||0} дней`;
  document.querySelector("#streakTrack").innerHTML=Array.from({length:7},(_,i)=>{
    const day=i+1, done=(state.rewards.streak||0)>=day;
    const reward=day===7?"🎁":day%3===0?"✦":"★";
    return `<div class="streak-day ${done?"done":""}"><small>ДЕНЬ ${day}</small><div>${reward}</div><b>${day===7?"Weekly bonus":day*100+" ★"}</b></div>`;
  }).join("");
}
function updateDailyStreak(now){
  const day=24*60*60*1000, last=state.rewards.lastDailyClaim||0;
  if(!last) state.rewards.streak=1;
  else {
    const diff=now-last;
    if(diff<48*60*60*1000) state.rewards.streak=Math.min(7,(state.rewards.streak||0)+1);
    else state.rewards.streak=1;
  }
  state.rewards.lastDailyClaim=now;
}
function claimReward(type){
  ensureRewards();
  const cfg=REWARD_CONFIG[type];
  if(!cfg||!rewardReady(type))return;
  const now=Date.now();
  const starsWon=Math.floor(cfg.minStars+Math.random()*(cfg.maxStars-cfg.minStars+1));
  earn(starsWon);
  state.xp+=cfg.xp;
  state.freeCases+=cfg.freeCases;
  let bonusCase=false;
  if(cfg.caseChance && Math.random()<cfg.caseChance){state.freeCases++;bonusCase=true;}
  if(type==="daily"){
    updateDailyStreak(now);
    const streakBonus=Math.min(700,(state.rewards.streak||1)*100);
    earn(streakBonus);
  }
  state.rewards[type]=now;
  save(); renderRewards();
  let msg=`${cfg.label}: +${starsWon} ★, +${cfg.xp} XP`;
  if(cfg.freeCases)msg+=`, +${cfg.freeCases} кейс`;
  if(bonusCase)msg+=", БОНУСНЫЙ КЕЙС!";
  toast(msg);
}
document.querySelectorAll(".reward-claim").forEach(b=>b.onclick=()=>claimReward(b.dataset.reward));
setInterval(()=>{
  if(document.querySelector("#page-rewards")?.classList.contains("active"))renderRewards();
},1000);


function init(){
  ensureRewards();
  syncUI(); renderHomeCases(); renderMarket(); renderCases(); renderUpgrade(); renderPass(); renderInventory(); renderRewards(); renderRewards();
  initFirebase();
}
init();

/* ---------------- FIREBASE ----------------
   1) Скопируй firebase-config.example.js -> firebase-config.js
   2) Вставь config своего Firebase-проекта.
   3) Firestore:
      market/{id}  -> {name,emoji,rarity,value,demo:false}
      users/{uid}  -> state
   Если конфиг отсутствует, сайт полностью работает в Local Mode.
*/
async function initFirebase(){
  const pill=document.querySelector("#syncStatus");
  try{
    const cfg=await import("./firebase-config.js");
    if(!cfg.firebaseConfig?.projectId) throw new Error("firebase-config.js найден, но projectId пустой");

    const [{initializeApp},{getFirestore,collection,getDocs,doc,setDoc,getDoc},{getAuth,signInAnonymously,onAuthStateChanged}]
      = await Promise.all([
        import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js"),
        import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js")
      ]);

    const app=initializeApp(cfg.firebaseConfig);
    const db=getFirestore(app);
    const auth=getAuth(app);
    await signInAnonymously(auth);

    onAuthStateChanged(auth, async user=>{
      if(!user)return;
      window.__giftlabCloud={db,user,setDoc,doc,getDoc};

      try{
        const userSnap=await getDoc(doc(db,"users",user.uid));
        if(userSnap.exists()){
          state={...DEFAULT_STATE,...userSnap.data()};
          localStorage.setItem("giftlab-state",JSON.stringify(state));
          syncUI(); renderHomeCases(); renderMarket(); renderCases(); renderUpgrade(); renderPass(); renderInventory(); renderRewards();
        }
      }catch(err){
        console.warn("GiftLab: не удалось загрузить сохранение из Firestore",err);
      }

      try{
        const snap=await getDocs(collection(db,"market"));
        if(!snap.empty){
          market=snap.docs.map(d=>({id:d.id,...d.data(),demo:false}));
          renderMarket(); renderUpgrade();
        }
      }catch(err){
        console.warn("GiftLab: market недоступен, оставляю локальный каталог",err);
      }

      pill.classList.add("online");
      pill.innerHTML="<i></i> Firebase";
      pill.title="Облачное сохранение подключено";
    });
  }catch(e){
    console.error("GiftLab Firebase init failed:",e);
    pill.classList.remove("online");
    pill.innerHTML="<i></i> Local mode";
    pill.title="Firebase не подключён. Игра всё равно работает локально.";
  }
}

let cloudTimer;
function syncCloud(){
  if(!window.__giftlabCloud)return;
  clearTimeout(cloudTimer);
  cloudTimer=setTimeout(async()=>{
    const {db,user,setDoc,doc}=window.__giftlabCloud;
    try{await setDoc(doc(db,"users",user.uid),state,{merge:true})}catch{}
  },500);
}

document.querySelector("#resetSaveBtn")?.addEventListener("click",()=>{
  if(!confirm("Сбросить локальный прогресс GiftLab на этом устройстве?")) return;
  localStorage.removeItem("giftlab-state");
  location.reload();
});

console.log("GiftLab V3 FIXED loaded");
