const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

const ranks = ["F","E","D","C","B","A","AA","S","SS","SSS"];
const classData = {
  assassin:{name:"Ассасин",icon:"☠️",atk:34,def:14,hp:260,mana:80,skillCost:25,stats:{strength:12,health:22,defense:8,stamina:12,critDamage:30,critChance:8,agility:16,dodge:4},skill:"Смертельный удар",evo:[["Теневой убийца","Критический урон и шанс уклонения."],["Призрачный клинок","Высокая скорость атак и усиленный крит."]]},
  mage:{name:"Чародей",icon:"🔮",atk:42,def:9,hp:220,mana:180,skillCost:45,stats:{strength:16,health:18,defense:5,stamina:10,critDamage:35,critChance:5,agility:10,dodge:2},skill:"Разрыв маны",evo:[["Архимаг","Мощные заклинания и пробитие защиты."],["Повелитель Бездны","Тёмная магия с огромным уроном по площади."]]},
  paladin:{name:"Паладин",icon:"🛡️",atk:25,def:30,hp:390,mana:120,skillCost:30,stats:{strength:9,health:34,defense:18,stamina:18,critDamage:25,critChance:3,agility:7,dodge:1},skill:"Кара Света",evo:[["Святой страж","Щиты, защита и усиленное лечение."],["Рыцарь Апокалипсиса","Высокая защита превращается в силу атаки."]]},
  archer:{name:"Лучник",icon:"🏹",atk:31,def:16,hp:270,mana:100,skillCost:28,stats:{strength:11,health:23,defense:9,stamina:13,critDamage:28,critChance:7,agility:18,dodge:4},skill:"Залп стрел",evo:[["Охотник","Дальний критический урон и скорость."],["Небесный стрелок","Усиленные залпы и шанс двойной атаки."]]}
};

const dungeonTemplates = [
  ["Тёмный лес","🌲","F",1,120,400,12,24,200,350],
  ["Забытый склеп","💀","F",2,180,520,18,32,240,420],
  ["Башня испытаний","🏰","F",3,240,680,24,42,280,500],
  ["Пещеры Эха","🕳️","E",1,420,900,38,60,450,700],
  ["Гнездо пауков","🕷️","E",2,520,1100,45,72,500,800],
  ["Руины магов","🔮","E",3,650,1350,52,86,600,950],
  ["Чёрная шахта","⛏️","D",1,900,1800,75,115,900,1350],
  ["Проклятый храм","🏛️","D",2,1100,2200,88,130,1050,1550],
  ["Кладбище титанов","💀","D",3,1350,2700,100,150,1200,1800]
];


// Additional 3 dungeons for every higher rank.
const extraDungeonSets = {
  C:[["Лабиринт крови","🩸"],["Огненная крепость","🔥"],["Лес проклятых","🌲"]],
  B:[["Город мёртвых","🏚️"],["Пасть вулкана","🌋"],["Храм бездны","🗿"]],
  A:[["Небесная цитадель","🏯"],["Драконий некрополь","🐉"],["Зал титанов","⚔️"]],
  AA:[["Земля великанов","🗻"],["Сердце бездны","🕳️"],["Трон демона","😈"]],
  S:[["Небесный разлом","☁️"],["Башня вечности","🗼"],["Проклятие драконов","🐲"]],
  SS:[["Предел хаоса","🌀"],["Мир разрушения","💥"],["Архив древних","📚"]],
  SSS:[["Врата апокалипсиса","☄️"],["Божественный дворец","👑"],["Последняя бездна","🌌"]]
};
for(const [rank,names] of Object.entries(extraDungeonSets)){
  const ri=ranks.indexOf(rank), hpBase=Math.floor(3200*Math.pow(2.15,ri-3));
  names.forEach(([name,icon],slot)=>{
    const hpMin=Math.floor(hpBase*(1+slot*.18)), hpMax=Math.floor(hpMin*1.8);
    const atkMin=Math.floor(190*Math.pow(1.72,ri-3)+slot*25), atkMax=Math.floor(atkMin*1.45);
    const goldMin=Math.floor(2200*Math.pow(1.85,ri-3)+slot*350), goldMax=Math.floor(goldMin*1.5);
    dungeonTemplates.push([name,icon,rank,slot+1,hpMin,hpMax,atkMin,atkMax,goldMin,goldMax]);
  });
}

const SAVE_KEY="rebirth_begin_save_v21";
const BACKUP_SAVE_KEY="rebirth_begin_save_backup";
const SAVE_VERSION=27;
const OLD_SAVE_KEY="rebirth_begin_save";
let saveReady=false;
const defaultStats = () => ({strength:0,health:0,defense:0,stamina:0,critDamage:0,critChance:0,agility:0,dodge:0});
let state = {
  playerClass:null,evolution:null,level:1,xp:0,coins:1500,shadowCoins:0,rank:0,energy:100,maxEnergy:100,lastEnergyTick:Date.now(),premium:false,premiumLastDaily:"",playerName:"Пробуждённый",
  hp:0,maxHp:0,atk:0,def:0,crit:0,critDamage:0,agility:0,dodge:0,stamina:0,maxMana:0,mana:null,
  statPoints:0,spentStats:defaultStats(),battle:null,inventory:[],equipped:{weapon:null,armor:null,amulet:null},bazaarLots:[],questCycleStart:0,questClaimed:false,quests:null,energyRestoreDay:"",energyRestoreCount:0,shards:0,arenaDay:"",arenaAttempts:0,arenaRating:1000,mail:[],farmKills:0,inventoryDismantleRarities:[],notices:{inventory:false,equipment:false,quests:false,mail:false}
};
const $ = id => document.getElementById(id);
const ONLINE_API = "api.php";
let onlineTimer = null;
let onlineData = {rating:[], arena:[], bazaar:[], chat:[]};
let onlineSaveTimer = null;
function telegramInitData(){ return window.Telegram?.WebApp?.initData || ""; }
async function apiRequest(action, extra={}){
  if(!ONLINE_API || !telegramInitData()) return null;
  try{
    const r=await fetch(ONLINE_API,{method:"POST",headers:{"Content-Type":"application/json","X-Telegram-Init-Data":telegramInitData()},body:JSON.stringify({action,initData:telegramInitData(),...extra}),cache:"no-store"});
    const j=await r.json(); return j?.ok?j:null;
  }catch(e){ return null; }
}
function queueOnlineSave(){
  if(!telegramInitData()) return;
  clearTimeout(onlineSaveTimer);
  onlineSaveTimer=setTimeout(()=>apiRequest("save",{state:{...state,_saveVersion:SAVE_VERSION,_savedAt:Date.now()}}),700);
}
async function onlineBootstrap(){
  const r=await apiRequest("load");
  if(r?.state && Number(r.state._savedAt||0)>Number(state._savedAt||0)){
    state={...state,...r.state,spentStats:{...defaultStats(),...(r.state.spentStats||{})}};
    ensureCollections(); ensureNotices(); recalc(); render(); save();
  }
}
async function refreshOnlineSection(type){
  if(type==="rating"){const r=await apiRequest("rating");if(r)onlineData.rating=r.players||[];}
  if(type==="arena"||type==="arenaRank"){const r=await apiRequest("arena");if(r)onlineData.arena=r.opponents||[];}
  if(type==="bazaar"){const r=await apiRequest("bazaar");if(r)onlineData.bazaar=r.lots||[];}
  if(type==="chat"){const r=await apiRequest("chat_list",{limit:60});if(r)onlineData.chat=r.messages||[];}
  if(type!=="chat") render();
  if(type==="chat"){
    const c=$("subscreenContent"); if(c) c.innerHTML=renderChat();
    clearInterval(onlineTimer);
    onlineTimer=setInterval(async()=>{const r=await apiRequest("chat_list",{limit:60});if(r){onlineData.chat=r.messages||[];const c=$("subscreenContent");if(c)c.innerHTML=renderChat();}},5000);
  }
}
async function sendChatMessage(){
  const input=$("chatInput"); if(!input)return;
  const message=input.value.trim(); if(!message)return;
  const r=await apiRequest("chat_send",{message});
  if(!r){modal("ЧАТ","Не удалось отправить сообщение. Проверь подключение онлайн-сервера.");return;}
  input.value=""; await refreshOnlineSection("chat");
}
function renderChat(){
  const rows=onlineData.chat||[];
  const list=rows.length?rows.map(m=>`<div class="chat-message"><b>${escapeHtml(m.display_name||"Игрок")}</b><small>${escapeHtml(m.created_at||"")}</small><p>${escapeHtml(m.message||"")}</p></div>`).join(""):`<div class="empty-state">Пока сообщений нет. Напиши первым.</div>`;
  return `<div class="chat-box"><div class="chat-status">🟢 Онлайн-чат · сообщения видны всем игрокам</div><div class="chat-list">${list}</div><div class="chat-compose"><input id="chatInput" maxlength="300" placeholder="Написать сообщение…" onkeydown="if(event.key==='Enter')sendChatMessage()"><button class="primary-btn" onclick="sendChatMessage()">ОТПРАВИТЬ</button></div></div>`;
}
const save = () => {
  if(!saveReady) return false;
  try {
    const payload={...state,_saveVersion:SAVE_VERSION,_savedAt:Date.now()};
    const json=JSON.stringify(payload);
    localStorage.setItem(SAVE_KEY,json);
    localStorage.setItem(BACKUP_SAVE_KEY,json);
    if(localStorage.getItem(SAVE_KEY)!==json){
      localStorage.setItem(BACKUP_SAVE_KEY,json);
      return false;
    }
    queueOnlineSave();
    return true;
  } catch(e) {
    try {
      const json=JSON.stringify({...state,_saveVersion:SAVE_VERSION,_savedAt:Date.now()});
      localStorage.setItem(BACKUP_SAVE_KEY,json);
    } catch(_) {}
    return false;
  }
};
const load = () => {
  try {
    let raw=localStorage.getItem(SAVE_KEY);
    if(!raw) raw=localStorage.getItem(BACKUP_SAVE_KEY);
    if(!raw) raw=localStorage.getItem(OLD_SAVE_KEY);
    const s=raw?JSON.parse(raw):null;
    if(s){
      const hadNewStats=s.statPoints!==undefined || s.spentStats!==undefined;
      state={...state,...s,spentStats:{...defaultStats(),...(s.spentStats||{})}};
      if(!hadNewStats) state.statPoints=Math.max(0,(state.level-1)*3);
      migrateOldSave();
      migrateEquipmentSystem();
      ensureNotices();
    }
  } catch(e) {}
};
function ensureNotices(){ state.notices={inventory:false,equipment:false,quests:false,mail:false,...(state.notices||{})}; }
function markNotice(key,value){ ensureNotices(); if(key in state.notices) state.notices[key]=value; save(); updateNoticeDots(); }
function updateNoticeDots(){ ensureNotices(); const map={inventory:"notice-inventory",equipment:"notice-equipment",quests:"notice-quests",mail:"notice-mail"}; const any=Object.values(state.notices).some(Boolean); Object.entries(map).forEach(([k,id])=>{const el=$(id);if(el)el.classList.toggle("show",!!state.notices[k]);}); const more=$("notice-more"); if(more)more.classList.toggle("show",any); }
function showLevelUpToast(level,points){ const box=$("levelUpToast"); if(!box)return; $("levelUpTitle").textContent=`УРОВЕНЬ ${level}`; $("levelUpReward").textContent=`+${points} очка улучшения характеристик зачислено`; box.classList.remove("hidden"); setTimeout(()=>box.classList.add("hidden"),2600); }

function migrateOldSave(){
  if(!state.spentStats) state.spentStats=defaultStats();
  ensureNotices();
  if(state.playerClass && state.statPoints===undefined){ state.statPoints=Math.max(0,(state.level-1)*3); }
  if(state.playerClass && state.statPoints===0 && Object.values(state.spentStats).every(v=>!v)){
    // Old saves keep their class/level but receive the level-up points for the new system.
    state.statPoints=Math.max(0,(state.level-1)*3);
  }
}
const RARITIES = [
  {name:"Обычное", chance:30, mult:1.00, shards:1, cls:"common"},
  {name:"Необычное", chance:30, mult:1.15, shards:2, cls:"uncommon"},
  {name:"Редкое", chance:20, mult:1.35, shards:4, cls:"rare"},
  {name:"Эпическое", chance:10, mult:1.70, shards:8, cls:"epic"},
  {name:"Легендарное", chance:6, mult:2.10, shards:14, cls:"legendary"},
  // Реликтовое оставлено редчайшим промежуточным тиром между легендарным и мифическим.
  {name:"Реликтовое", chance:0.5, mult:2.70, shards:22, cls:"relic"},
  {name:"Мифическое", chance:2.5, mult:3.20, shards:32, cls:"mythic"},
  {name:"Адское", chance:0.5, mult:8.00, shards:55, cls:"hell"},
  {name:"Божественное", chance:0.5, mult:12.80, shards:80, cls:"divine"}
];
// The supplied probabilities total 99.5% once a 0.5% Relic tier is included.
// The remaining 0.5% is assigned to Divine so every drop always resolves to a rarity.
RARITIES[8].chance=1.0;
function rarityByName(name){return RARITIES.find(r=>r.name===name)||RARITIES[0];}
function rollRarity(){
  let n=Math.random()*100;
  for(const r of RARITIES){ if(n<r.chance)return r; n-=r.chance; }
  return RARITIES[RARITIES.length-1];
}
function migrateEquipmentSystem(){
  const savedVersion=Number(state._saveVersion||0);
  const normalizeItem=(item)=>{
    if(!item || item.type==="material") return;
    item.itemLevel=Math.max(1,Math.min(40,Number(item.itemLevel)||Number(state.level)||1));
    if(!["assassin","mage","paladin","archer"].includes(item.classKey)) item.classKey=["assassin","mage","paladin","archer"][Math.floor(Math.random()*4)];
    if(!rarityByName(item.rarity)) item.rarity="Обычное";
    item.upgradeLevel=Math.max(0,Number(item.upgradeLevel)||0);
    if(savedVersion<23 || !item.stats) item.stats=generateEquipmentStats(item.type,item.itemLevel,item.rarity,item.upgradeLevel);
    item.price=Math.max(10,Math.floor(item.itemLevel*item.itemLevel*1.8*rarityByName(item.rarity).mult*(1+item.upgradeLevel*.12)));
  };
  (state.inventory||[]).forEach(normalizeItem);
  Object.values(state.equipped||{}).forEach(normalizeItem);
  (state.bazaarLots||[]).forEach(l=>normalizeItem(l.item));
  if(savedVersion<22){ state.xp=Math.floor((Number(state.xp)||0)/3); }
  if(!Number.isFinite(state.shards)) state.shards=0;
}
function generateEquipmentStats(type,itemLevel,rarity="Обычное",upgradeLevel=0){
  const lvl=Math.max(1,Number(itemLevel)||1);
  const rm=rarityByName(rarity).mult;
  const um=1+Math.max(0,Number(upgradeLevel)||0)*0.08;
  const r=(n)=>Math.max(1,Math.floor(n*rm*um));
  if(type==="weapon") return {strength:r(2+lvl*1.15),critChance:Math.max(1,Math.floor((lvl/8)+1)*Math.max(1,rm>=3.2?2:1))};
  if(type==="armor") return {health:r(5+lvl*2.25),defense:r(1+lvl*.85),stamina:Math.max(1,Math.floor((lvl/10)+1)*Math.max(1,rm>=3.2?2:1))};
  if(type==="amulet") return {critDamage:r(3+lvl*.55),critChance:Math.max(1,Math.floor((lvl/10)+1)*Math.max(1,rm>=3.2?2:1)),dodge:Math.max(1,Math.floor((lvl/12)+1)*Math.max(1,rm>=3.2?2:1))};
  return {};
}
function upgradeCost(item){
  const u=Number(item?.upgradeLevel)||0;
  const r=rarityByName(item?.rarity);
  return {shards:Math.max(2,Math.floor((u+1)*r.shards*.75)),gold:Math.max(30,Math.floor((item.itemLevel||1)*(u+1)*18*r.mult))};
}
function dismantleReward(item){
  const r=rarityByName(item?.rarity);
  return Math.max(1,Math.floor(r.shards*(1+(Number(item?.upgradeLevel)||0)*.25)+(Number(item?.itemLevel)||1)/10));
}
function itemRarityClass(item){return rarityByName(item?.rarity).cls;}

function ensureCollections(){
  if(!Array.isArray(state.inventory)) state.inventory=[];
  if(!state.equipped || typeof state.equipped!=="object") state.equipped={weapon:null,armor:null};
  if(!("weapon" in state.equipped)) state.equipped.weapon=null;
  if(!("armor" in state.equipped)) state.equipped.armor=null;
  if(!("amulet" in state.equipped)) state.equipped.amulet=null;
  state.inventory.forEach(item=>{
    if(item.type!=="material") {
      item.itemLevel=Math.max(1,Number(item.itemLevel)||Number(state.level)||1);
      if(!["assassin","mage","paladin","archer"].includes(item.classKey)) item.classKey=["assassin","mage","paladin","archer"][Math.floor(Math.random()*4)];
      if(!rarityByName(item.rarity)) item.rarity="Обычное";
      item.upgradeLevel=Math.max(0,Number(item.upgradeLevel)||0);
      if(!item.stats) item.stats=generateEquipmentStats(item.type,item.itemLevel,item.rarity,item.upgradeLevel);
      item.price=Math.max(10,Math.floor(item.itemLevel*item.itemLevel*1.8*rarityByName(item.rarity).mult*(1+item.upgradeLevel*.12)));
    } else item.classKey="all";
  });
  if(!Array.isArray(state.bazaarLots)) state.bazaarLots=[];
  if(!Array.isArray(state.quests)) state.quests=null;
  refreshQuestCycle(false);
}
function newQuestCycle(){
  ensureNotices(); state.notices.quests=false;
  state.questCycleStart=Date.now();
  state.questClaimed=false;
  state.quests=[
    {id:"dungeons",name:"Пройти подземелья",icon:"⚔️",target:3,progress:0},
    {id:"kills",name:"Победить монстров",icon:"👹",target:5,progress:0},
    {id:"xp",name:"Получить опыт",icon:"✨",target:5000,progress:0}
  ];
}
function refreshQuestCycle(saveIt=true){
  const now=Date.now();
  if(!state.questCycleStart || !Array.isArray(state.quests)) newQuestCycle();
  else if(now-state.questCycleStart>=5*60*60*1000) newQuestCycle();
  if(saveIt) save();
}
function questTimeLeft(){
  const left=Math.max(0,5*60*60*1000-(Date.now()-state.questCycleStart));
  const h=Math.floor(left/3600000),m=Math.floor((left%3600000)/60000),sec=Math.floor((left%60000)/1000);
  return `${h}ч ${String(m).padStart(2,"0")}м ${String(sec).padStart(2,"0")}с`;
}
function updateQuestProgress(id,amount=1){
  refreshQuestCycle(false);
  const q=state.quests?.find(x=>x.id===id);
  if(!q)return;
  q.progress=Math.min(q.target,q.progress+amount);
  if(allQuestsDone() && !state.questClaimed){ ensureNotices(); state.notices.quests=true; }
  save(); updateNoticeDots();
}
function allQuestsDone(){return Array.isArray(state.quests)&&state.quests.length>0&&state.quests.every(q=>q.progress>=q.target);}
function claimQuestReward(){
  refreshQuestCycle(false);
  if(state.questClaimed){modal("ЗАДАНИЯ","Награда за этот цикл уже получена.");return;}
  if(!allQuestsDone()){modal("ЗАДАНИЯ", "Сначала выполни все задания.");return;}
  state.questClaimed=true;
  state.coins+=2000;
  state.shadowCoins+=20;
  addXP(10000);
  save(); render();
  modal("ЗАДАНИЯ ВЫПОЛНЕНЫ","Получено: 2 000 золота · 20 теневых монет · 10 000 XP.");
}
function itemStatLines(item){
  if(!item?.stats) return [];
  const labels={strength:"Сила",health:"Здоровье",defense:"Защита",stamina:"Выносливость",critDamage:"Крит. урон",critChance:"Шанс крита",agility:"Ловкость",dodge:"Уклонение"};
  return Object.entries(item.stats).filter(([,v])=>v).map(([k,v])=>`${labels[k]||k} +${v}${["critDamage","critChance","dodge"].includes(k)?"%":""}`);
}
function itemStatsText(item){return itemStatLines(item).join(" · ")||"Без характеристик";}
function itemStatChips(item){return itemStatLines(item).map(x=>`<span>${x}</span>`).join("");}
function equipmentBonusStats(){
  const out=defaultStats();
  for(const item of Object.values(state.equipped||{})) if(item?.stats) for(const [k,v] of Object.entries(item.stats)) out[k]=(out[k]||0)+v;
  return out;
}
function makeLoot(){
  const typeRoll=Math.random();
  const type=typeRoll<0.38?"weapon":typeRoll<0.76?"armor":typeRoll<0.94?"amulet":"material";
  const classes=["assassin","mage","paladin","archer"];
  const c=classes[rand(0,classes.length-1)];
  const lvl=Math.max(1,Math.min(40,state.level));
  const rarity=rollRarity();
  const names={
    weapon:{assassin:["Кинжал тени","Клинок убийцы","Призрачный нож"],mage:["Посох маны","Жезл бездны","Кристальный посох"],paladin:["Молот света","Меч стража","Священный клинок"],archer:["Лук охотника","Лук ветра","Небесный лук"]},
    armor:{assassin:["Теневая броня","Плащ убийцы","Доспех призрака"],mage:["Мантия мага","Одеяние бездны","Арканная мантия"],paladin:["Броня стража","Святая кираса","Доспех паладина"],archer:["Кожаная броня","Броня охотника","Доспех следопыта"]},
    amulet:{assassin:["Амулет тени","Клык убийцы","Око убийцы"],mage:["Амулет маны","Кристалл архимага","Око бездны"],paladin:["Амулет света","Знак стража","Сердце храма"],archer:["Амулет ветра","Клык охотника","Око сокола"]},
    material:["Кристалл маны","Тёмный камень","Ядро монстра"]
  };
  const icons={weapon:{assassin:"🗡️",mage:"🪄",paladin:"⚔️",archer:"🏹"},armor:{assassin:"🥷",mage:"🧙",paladin:"🛡️",archer:"🏹"},amulet:{assassin:"🔻",mage:"🔮",paladin:"✝️",archer:"🪶"}};
  const stats=type==="material"?{}:generateEquipmentStats(type,lvl,rarity.name,0);
  const name=type==="material"?names.material[rand(0,2)]:names[type][c][rand(0,2)];
  const icon=type==="material"?"💎":icons[type][c];
  return {id:`loot_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,name,type,icon,rarity:rarity.name,rarityClass:rarity.cls,stats,itemLevel:lvl,upgradeLevel:0,price:Math.max(10,Math.floor(lvl*lvl*1.8*rarity.mult)),classKey:type==="material"?"all":c};
}
function addLootFromMob(){
  // 70% chance for a loot drop. The rarity table is rolled only when a drop happens.
  if(Math.random()>0.70) return null;
  const loot=makeLoot();
  state.inventory.push(loot);
  if(state.inventory.length>60) state.inventory.shift();
  return loot;
}
function removeInventoryItem(id){const i=state.inventory.findIndex(x=>x.id===id);if(i<0)return null;return state.inventory.splice(i,1)[0];}
function createBazaarLot(itemId,price){
  if(state.bazaarLots.length>=5){modal("БАЗАР","Можно одновременно выставлять максимум 5 лотов.");return;}
  const item=removeInventoryItem(itemId); if(!item)return;
  const p=Math.max(1,Math.floor(Number(price)||0));
  state.bazaarLots.push({id:`lot_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,item,price:p,createdAt:Date.now()});
  save(); openSubscreen("bazaar"); render();
}
function cancelBazaarLot(lotId){const i=state.bazaarLots.findIndex(x=>x.id===lotId);if(i<0)return;const lot=state.bazaarLots.splice(i,1)[0];state.inventory.push(lot.item);save();openSubscreen("bazaar");render();}

load();
ensureCollections();
saveReady=true;
ensureNotices();
save();

function xpNeed(level=state.level){ const raw=level<=3?Math.floor(12000*Math.pow(1.4,level-1)):Math.floor(12000*Math.pow(1.4,2)*Math.pow(2.5,level-3)); return Math.max(1000,Math.floor(raw/3)); }
function rankCost(rank=state.rank){ return Math.floor(1500*Math.pow(1.65,rank)); }
function requiredLevel(rank=state.rank){ return 1+rank*3; }
function maxEnergy(){ return 100+(state.level-1)*2+(state.premium?100:0); }
function regenEnergy(){
  if(!state.lastEnergyTick) state.lastEnergyTick=Date.now();
  const now=Date.now();
  const gain=Math.floor((now-state.lastEnergyTick)/120000);
  if(gain>0){ state.energy=Math.min(state.energy+gain,maxEnergy()); state.lastEnergyTick+=gain*120000; save(); }
}
function premiumDaily(){
  if(!state.premium) return;
  const day=new Date().toISOString().slice(0,10);
  if(state.premiumLastDaily!==day){ state.shadowCoins+=20; state.premiumLastDaily=day; save(); }
}
function energyCostDungeon(){ return 5; }
function energyCostRank(){ return 50; }
function totalSpent(){ return Object.values(state.spentStats).reduce((a,b)=>a+b,0); }
function getStats(){
  if(!state.playerClass)return defaultStats();
  const base=classData[state.playerClass].stats;
  const s={}; for(const k of Object.keys(base)) s[k]=base[k]+(state.spentStats[k]||0);
  return s;
}
function recalc(){
  if(!state.playerClass)return;
  const c=classData[state.playerClass], s=getStats();
  const levelBonus=state.level-1, rankBonus=state.rank;
  const eqBonus=equipmentBonusStats();
  const fs={}; for(const k of Object.keys(s)) fs[k]=(s[k]||0)+(eqBonus[k]||0);
  state.atk=Math.floor(c.atk + fs.strength*1.9 + fs.agility*.35 + levelBonus*2 + rankBonus*4);
  state.maxHp=Math.floor(c.hp + fs.health*10 + fs.stamina*8 + levelBonus*8 + rankBonus*35);
  state.def=Math.floor(c.def + fs.defense*1.7 + fs.stamina*.35 + rankBonus*3);
  state.stamina=fs.stamina;
  state.critDamage=Math.min(250,fs.critDamage + rankBonus*1.5 + (state.evolution?8:0));
  state.crit=Math.min(60,fs.critChance + rankBonus*.5 + (state.evolution?4:0));
  state.agility=fs.agility;
  state.dodge=Math.min(35,fs.dodge + fs.agility*.12 + rankBonus*.25 + (state.evolution?2:0));
  state.maxMana=Math.floor(c.mana + fs.stamina*8 + levelBonus*2 + rankBonus*5);
  if(state.mana===null || !Number.isFinite(state.mana)) state.mana=state.maxMana;
  if(state.mana>state.maxMana) state.mana=state.maxMana;
  if(state.hp<=0||state.hp>state.maxHp)state.hp=state.maxHp;
  regenEnergy(); state.maxEnergy=maxEnergy(); state.energy=Math.min(state.energy ?? maxEnergy(),maxEnergy()); premiumDaily();
}
function statRow(key,label,value,step,percent=false){
  const can=state.statPoints>0;
  return `<div class="stat-row"><div class="stat-row-info"><span>${label}</span><b>${value}${percent?"%":""}</b><small>+${step}${percent?"%":""} за очко</small></div><button class="stat-plus" ${can?"":"disabled"} onclick="upgradeStat('${key}')">+</button></div>`;
}
function renderStats(){
  if(!state.playerClass)return;
  const s=getStats();
  $("statPoints").textContent=state.statPoints;
  $("statAtk").textContent=state.atk;
  $("statHp").textContent=state.maxHp;
  $("statDef").textContent=state.def;
  $("statStamina").textContent=s.stamina;
  $("flatStats").innerHTML=[
    statRow("strength","Сила",s.strength,1),statRow("health","Здоровье",s.health,1),statRow("defense","Защита",s.defense,1),statRow("stamina","Выносливость",s.stamina,1),statRow("agility","Ловкость",s.agility,1)
  ].join("");
  $("percentStats").innerHTML=[
    statRow("critDamage","Крит. урон",state.critDamage,1,true),statRow("critChance","Шанс крита",state.crit,0.5,true),statRow("dodge","Уклонение",state.dodge,0.25,true)
  ].join("");
}
function toggleAllocation(){
  const panel=$("allocationPanel");
  const collapsed=panel.classList.toggle("collapsed");
  const arrow=$("allocationArrow");
  if(arrow) arrow.textContent=collapsed?"⌄":"⌃";
  const head=panel.querySelector(".allocation-head");
  if(head) head.setAttribute("aria-expanded",collapsed?"false":"true");
}
function upgradeStat(key){
  if(state.statPoints<=0)return;
  state.spentStats[key]=(state.spentStats[key]||0)+1; state.statPoints--; recalc(); save(); render();
}
function render(){
  recalc();
  if($("coins"))$("coins").textContent=state.coins.toLocaleString("ru-RU");
  if($("energy"))$("energy").textContent=Math.floor(state.energy);
  if($("energyMax"))$("energyMax").textContent=maxEnergy();
  if($("heroEnergy"))$("heroEnergy").textContent=Math.floor(state.energy);
  if($("heroEnergyMax"))$("heroEnergyMax").textContent=maxEnergy();
  if($("manaText"))$("manaText").textContent=Math.floor(state.mana);
  if($("manaMax"))$("manaMax").textContent=Math.floor(state.maxMana);
  if($("manaBar"))$("manaBar").style.width=(state.maxMana?Math.max(0,state.mana/state.maxMana*100):0)+"%";
  if($("heroGold"))$("heroGold").textContent=state.coins.toLocaleString("ru-RU");
  if($("shadowCoins"))$("shadowCoins").textContent=state.shadowCoins.toLocaleString("ru-RU");
    if($("moreGold"))$("moreGold").textContent=state.coins.toLocaleString("ru-RU");
  if($("moreShadowCoins"))$("moreShadowCoins").textContent=state.shadowCoins.toLocaleString("ru-RU");
  $("level").textContent=state.level; $("rankName").textContent=ranks[state.rank]; $("associationRank").textContent=ranks[state.rank];
  $("xpText").textContent=state.xp.toLocaleString("ru-RU"); $("xpNeed").textContent=xpNeed().toLocaleString("ru-RU"); $("xpBar").style.width=Math.min(100,state.xp/xpNeed()*100)+"%";
  $("playerName").textContent=(state.premium?"👑 ":"")+(state.playerName||"Пробуждённый");
  if(state.playerClass){
    const c=classData[state.playerClass]; $("className").textContent=c.name+(state.evolution?" · "+state.evolution:""); $("avatar").textContent=c.icon;
    $("statsPanel").classList.remove("hidden"); $("allocationPanel").classList.remove("hidden"); $("currencyPanel").classList.remove("hidden"); $("classSelection").classList.add("hidden"); renderStats();
    $("battlePlayerSprite").textContent=c.icon;
    if(state.level>=20&&!state.evolution){$("evolutionPanel").classList.remove("hidden");renderEvos();} else $("evolutionPanel").classList.add("hidden");
  }
  renderDungeons();renderAssociation();updateNoticeDots();save();
}
function addXP(amount){
  state.xp+=amount;
  if(typeof updateQuestProgress==="function") updateQuestProgress("xp",amount);
  while(state.level<40&&state.xp>=xpNeed()){
    state.xp-=xpNeed();state.level++;state.statPoints+=state.premium?3:2;recalc();
    showLevelUpToast(state.level,state.premium?3:2);
  }
  if(state.level===40)state.xp=Math.min(state.xp,xpNeed()); render();
}
function selectClass(key){
  state.playerClass=key; state.evolution=null; state.spentStats=defaultStats(); state.statPoints=0; state.energy=maxEnergy(); state.lastEnergyTick=Date.now(); recalc(); state.hp=state.maxHp; state.mana=state.maxMana;
  save(); modal("ПРОБУЖДЕНИЕ",`Выбран путь: ${classData[key].name}. Стартовые характеристики отличаются у каждого класса.`);render();
}
function renderEvos(){const c=classData[state.playerClass];$("evolutionChoices").innerHTML=c.evo.map(e=>`<div class="evo"><b>${e[0]}</b><small>${e[1]}</small><button onclick="evolve('${e[0].replaceAll("'","")}')">ВЫБРАТЬ</button></div>`).join("");}
function evolve(name){state.evolution=name;recalc();state.hp=state.maxHp;save();modal("ЭВОЛЮЦИЯ",`Класс эволюционировал в «${name}». Бонусы класса усилены.`);render();}
function rand(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
let selectedDungeonRank=null;
function renderDungeons(){
  if(selectedDungeonRank===null || selectedDungeonRank>state.rank) selectedDungeonRank=state.rank;
  const rankTabs=ranks.map((r,i)=>{const locked=i>state.rank;return `<button class="dungeon-rank-tab ${i===selectedDungeonRank?"active":""} ${locked?"locked":""}" ${locked?"disabled":""} onclick="selectDungeonRank(${i})">${locked?"🔒 ":""}${r}</button>`;}).join("");
  $("dungeonRanks").innerHTML=rankTabs;
  const selected=ranks[selectedDungeonRank];
  const items=dungeonTemplates.map((d,i)=>({d,i})).filter(x=>x.d[2]===selected);
  if(!items.length){
    $("dungeonList").innerHTML=`<div class="panel dungeon-empty"><div>🗺️</div><b>Подземелья ранга ${selected}</b><small>Контент этого ранга будет доступен после его открытия.</small></div>`;
    return;
  }
  $("dungeonList").innerHTML=items.map(({d,i})=>{
    const energyOk=state.energy>=energyCostDungeon();
    const previewHpMin=Math.max(1,Math.floor(d[4]*1.74));
    const previewHpMax=Math.max(previewHpMin,Math.floor(d[5]*1.74));
    const previewAtkMin=Math.max(1,Math.floor(d[6]*1.82)+state.rank*7);
    const previewAtkMax=Math.max(previewAtkMin,Math.floor(d[7]*1.82)+state.rank*7);
    const previewGoldMin=Math.max(1,Math.floor(d[8]/6));
    const previewGoldMax=Math.max(previewGoldMin,Math.floor(d[9]/6));
    const previewXpMin=previewHpMin;
    const previewXpMax=previewHpMax*2;
    return `<div class="dungeon"><div class="dungeon-row"><span class="dungeon-icon-emoji">${d[1]}</span><div class="dungeon-info"><h3>${d[0]}</h3><p>HP: ${previewHpMin}–${previewHpMax} · ⚔️ АТК: ${previewAtkMin}–${previewAtkMax}</p><p>🪙 ${previewGoldMin}–${previewGoldMax} золота · ✨ XP: ${previewXpMin}–${previewXpMax}</p></div><div class="dungeon-rank">${d[2]} · ${d[3]}</div></div><button ${energyOk?"":"disabled"} onclick="startDungeon(${i})">${energyOk?"ВОЙТИ · ⚡ 5":"НЕТ ЭНЕРГИИ"}</button></div>`;
  }).join("");
}
function selectDungeonRank(index){if(index>state.rank)return;selectedDungeonRank=index;renderDungeons();}
function renderAssociation(){if(state.rank>=ranks.length-1){$("nextRankTitle").textContent="Достигнут максимальный ранг";$("rankRequirements").innerHTML=`<div class="req ok">SSS — максимальный ранг</div>`;$("rankUpBtn").disabled=true;return;}const next=ranks[state.rank+1],cost=rankCost(),lvlOk=state.level>=requiredLevel(state.rank+1),coinOk=state.coins>=cost,energyOk=state.energy>=energyCostRank();$("nextRankTitle").textContent="Следующий ранг: "+next;$("rankRequirements").innerHTML=`<div class="req"><span>Уровень</span><b class="${lvlOk?"ok":"bad"}">${state.level} / ${requiredLevel(state.rank+1)}</b></div><div class="req"><span>Монеты</span><b class="${coinOk?"ok":"bad"}">${state.coins.toLocaleString()} / ${cost.toLocaleString()}</b></div><div class="req"><span>Энергия</span><b class="${energyOk?"ok":"bad"}">${Math.floor(state.energy)} / ${energyCostRank()}</b></div><div class="req"><span>Испытание босса</span><b>Нужно победить</b></div>`;$("rankUpBtn").disabled=!(lvlOk&&coinOk&&energyOk);}
function rankUp(){const cost=rankCost(),need=requiredLevel(state.rank+1);if(state.level<need||state.coins<cost||state.energy<energyCostRank())return;state.coins-=cost;state.energy-=energyCostRank();save();startBossTrial();}
function startBossTrial(){state.battle={boss:true,name:"Страж "+ranks[state.rank]+" ранга",icon:"👹",maxHp:Math.floor(state.maxHp*1.7+state.rank*800),hp:Math.floor(state.maxHp*1.7+state.rank*800),atk:Math.floor(state.atk*.58+state.def*.18),xp:xpNeed()*1.2,reward:0};save();showBattle("ИСПЫТАНИЕ АССОЦИАЦИИ");}
function startDungeon(i){const d=dungeonTemplates[i];if(state.energy<energyCostDungeon()){modal("НЕТ ЭНЕРГИИ",`Для входа нужно ${energyCostDungeon()} энергии. Сейчас: ${Math.floor(state.energy)}.`);return;}state.energy-=energyCostDungeon();const enemyHp=Math.floor(rand(d[4],d[5])*1.74),enemyAtk=Math.floor(rand(d[6],d[7])*1.82)+state.rank*7,gold=Math.max(1,Math.floor(rand(d[8],d[9])*(1/6))),xp=Math.max(5,Math.floor(enemyHp*rand(1,2)));state.battle={boss:false,name:d[0],icon:d[1],maxHp:enemyHp,hp:enemyHp,atk:enemyAtk,xp,reward:gold};save();showBattle(d[0]);}
function startFarmZone(){
  state.battle={boss:false,farm:true,name:"Фарм-монстр #"+(Number(state.farmKills||0)+1),icon:"👹",maxHp:Math.floor(((state.maxHp*0.62)+state.atk*3)*1.2),hp:Math.floor(((state.maxHp*0.62)+state.atk*3)*1.2),atk:Math.max(1,Math.floor((state.def*0.95+state.atk*0.16)*1.3)),xp:500,reward:0};
  save();
  showBattle("ФАРМ-ЗОНА");
  updateFarmBattleUI();
}
function updateFarmBattleUI(){
  const isFarm=!!state.battle?.farm;
  const auto=document.querySelector('.actions .secondary-btn');
  if(auto){auto.disabled=isFarm;auto.classList.toggle('disabled',isFarm);auto.textContent=isFarm?'⚡ АВТО-БОЙ НЕДОСТУПЕН':'⚡ АВТО-БОЙ';}
}
function resetArenaDay(){const day=new Date().toISOString().slice(0,10);if(state.arenaDay!==day){state.arenaDay=day;state.arenaAttempts=0;save();}}
function arenaOpponents(){
  const base=Math.max(1,state.level);
  return [
    {id:'p1',name:'ТёмныйКлинок',level:Math.max(1,base-1),classKey:'assassin',rating:1120},
    {id:'p2',name:'ArcaneFox',level:base+1,classKey:'mage',rating:1185},
    {id:'p3',name:'СвятойСтраж',level:base+2,classKey:'paladin',rating:1240},
    {id:'p4',name:'SkyHunter',level:base,classKey:'archer',rating:1065},
    {id:'p5',name:'NightCore',level:base+3,classKey:'assassin',rating:1320}
  ];
}
function arenaBattle(id){
  resetArenaDay();
  if(state.arenaAttempts>=5){modal('АРЕНА','Сегодня осталось 0 из 5 попыток.');return;}
  const onlineOpp=onlineData.arena?.find(x=>String(x.telegram_id)===String(id));
  const opp=onlineOpp?{id:String(onlineOpp.telegram_id),name:onlineOpp.display_name||"Игрок",level:Number(onlineOpp.level||1),classKey:onlineOpp.classKey||"assassin",rating:Number(onlineOpp.arena_rating||1000)}:arenaOpponents().find(x=>x.id===id);if(!opp)return;
  state.arenaAttempts++;
  const c=classData[opp.classKey];
  const enemyMax=Math.floor(c.hp+opp.level*22+opp.rating*.35);
  const enemyAtk=Math.floor(c.atk+opp.level*2.2+opp.rating*.05);
  state.battle={arena:true,opponent:opp,boss:false,name:opp.name,icon:c.icon,maxHp:enemyMax,hp:enemyMax,atk:enemyAtk,xp:0,reward:0};
  save();
  showBattle('АРЕНА');
  updateFarmBattleUI();
}
function arenaWin(){state.arenaRating+=18;save();modal('ПОБЕДА НА АРЕНЕ',`Рейтинг +18. Теперь: ${state.arenaRating}.`);}
function arenaLose(){state.arenaRating=Math.max(0,state.arenaRating-12);save();modal('ПОРАЖЕНИЕ НА АРЕНЕ',`Рейтинг -12. Теперь: ${state.arenaRating}.`);}
function renderMail(){
  if(!Array.isArray(state.mail)||!state.mail.length) state.mail=[{id:'sys1',from:'Система',text:'Добро пожаловать! Здесь будут системные уведомления и сообщения игроков.',time:Date.now(),read:false,type:'system'}];
  return `<div class="mail-list">${state.mail.slice().reverse().map(m=>`<div class="mail-item ${m.read?'read':''}" onclick="readMail('${m.id}')"><div class="mail-icon">${m.type==='system'?'🔔':'💬'}</div><div><b>${escapeHtml(m.from)}</b><small>${new Date(m.time||Date.now()).toLocaleString('ru-RU')}</small><p>${escapeHtml(m.text)}</p></div></div>`).join('')}</div><div class="mail-note">📨 Системные письма сохраняются локально. Реальные сообщения от других игроков в офлайн-режиме потребуют серверной базы/Telegram backend.</div>`;
}
function readMail(id){const m=(state.mail||[]).find(x=>x.id===id);if(!m)return;m.read=true;save();render();openSubscreen('mail');}
function farmExit(){state.battle=null;save();showScreen('more');render();}
function syntheticPlayerStats(p){
  const c=classData[p.classKey];
  const lvl=Math.max(1,Number(p.level)||1);
  const spent=Math.max(0,(lvl-1)*2);
  const strength=Math.floor(c.stats.strength+spent*0.72+lvl*1.15);
  const health=Math.floor(c.stats.health+spent*0.5+lvl*.7);
  const defense=Math.floor(c.stats.defense+spent*.35+lvl*.35);
  const critChance=Math.min(60,Math.floor(c.stats.critChance+lvl*.25));
  const atk=Math.floor(c.atk+strength*1.9+(lvl-1)*2);
  const hp=Math.floor(c.hp+health*10+lvl*8);
  const def=Math.floor(c.def+defense*1.7+lvl*.8);
  const power=Math.floor(atk+hp*.22+def*2+strength*2.2+critChance*2);
  return {strength,health,defense,critChance,atk,hp,def,power};
}
function currentPlayerRatingStats(){
  return {strength:getStats().strength+(equipmentBonusStats().strength||0),health:getStats().health+(equipmentBonusStats().health||0),defense:getStats().defense+(equipmentBonusStats().defense||0),critChance:state.crit,atk:state.atk,hp:state.maxHp,def:state.def,power:Math.floor(state.atk+state.maxHp*.22+state.def*2+(getStats().strength+(equipmentBonusStats().strength||0))*2.2+state.crit*2)};
}
function playerProfile(id,from='rating'){
  if(id==='me'){openSubscreen('settings');return;}
  const p=arenaOpponents().find(x=>x.id===id);if(!p)return;
  const c=classData[p.classKey], st=syntheticPlayerStats(p);
  const gear=`<div class="profile-gear"><div>⚔️ Оружие: ${c.name==='Ассасин'?'Кинжал тени':c.name==='Чародей'?'Посох маны':c.name==='Паладин'?'Меч света':'Лук охотника'}</div><div>🛡️ Броня: ${c.name} комплект</div><div>🔮 Амулет: ${c.name} амулет</div></div>`;
  $('subscreenTitle').textContent='ПРОФИЛЬ ИГРОКА';
  $('subscreenContent').innerHTML=`<div class="player-profile"><div class="profile-avatar">${c.icon}</div><h2>${escapeHtml(p.name)}</h2><div class="profile-class">${c.name} · Ур. ${p.level} · Боевая сила ${st.power}</div><div class="derived-grid"><div><span>💪 СИЛА</span><b>${st.strength}</b></div><div><span>⚔ АТАКА</span><b>${st.atk}</b></div><div><span>❤ HP</span><b>${st.hp}</b></div><div><span>🛡 ЗАЩИТА</span><b>${st.def}</b></div><div><span>💥 КРИТ</span><b>${st.critChance}%</b></div></div><h3>ЭКИПИРОВКА</h3>${gear}<button class="primary-btn" onclick="openSubscreen('${from}')">← НАЗАД</button></div>`;
  showScreen('sub');
}
function renderRating(){
  if(onlineData.rating?.length){
    const myId=window.Telegram?.WebApp?.initDataUnsafe?.user?.id?String(window.Telegram.WebApp.initDataUnsafe.user.id):"";
    return `<div class="rating-head"><div><b>🏆 ОНЛАЙН-РЕЙТИНГ</b><span>Игроки с сервера · по боевой силе</span></div></div><div class="rating-list">${onlineData.rating.map((p,i)=>`<div class="rating-row ${String(p.telegram_id)===myId?"self":""}"><span>#${i+1}</span><span class="rating-avatar">👤</span><span class="rating-name"><b>${escapeHtml(p.display_name||"Игрок")}</b><small>Ур. ${Number(p.level||1)}</small></span><strong>⚡ ${Number(p.power||0)}</strong></div>`).join("")}</div>`;
  }
  const me={id:'me',name:state.playerName||'Пробуждённый',level:state.level,classKey:state.playerClass||'mage',self:true,stats:currentPlayerRatingStats()};
  const players=[me,...arenaOpponents().map(p=>({...p,stats:syntheticPlayerStats(p)}))];
  players.sort((a,b)=>b.stats.power-a.stats.power);
  return `<div class="rating-head"><div><b>🏆 РЕЙТИНГ ПО БОЕВОЙ СИЛЕ</b><span>Сила и экипировка учитываются</span></div><span>Твоя сила: ${me.stats.power}</span></div><div class="rating-list">${players.map((p,i)=>`<button class="rating-row ${p.self?'self':''}" onclick="${p.self?'openSubscreen(\'settings\')':`playerProfile('`+p.id+`','rating')`}"><span>#${i+1}</span><span class="rating-avatar">${classData[p.classKey].icon}</span><span class="rating-name"><b>${escapeHtml(p.name)}</b><small>${classData[p.classKey].name} · Ур. ${p.level} · 💪 ${p.stats.strength}</small></span><strong>⚡ ${p.stats.power}</strong></button>`).join('')}</div>`;
}

function renderArena(){
  if(onlineData.arena?.length){
    return `<div class="arena-head"><div><b>⚔️ ОНЛАЙН-АРЕНА</b><small>Попытки сегодня: ${state.arenaAttempts}/5 · Рейтинг: ${state.arenaRating}</small></div></div><div class="arena-list">${onlineData.arena.map(p=>`<div class="arena-row"><span class="rating-avatar">👤</span><div class="rating-name"><b>${escapeHtml(p.display_name||"Игрок")}</b><small>Ур. ${Number(p.level||1)} · ${Number(p.arena_rating||1000)}</small></div><button class="primary-btn arena-fight-btn" onclick="arenaBattle('${String(p.telegram_id)}')" ${state.arenaAttempts>=5?"disabled":""}>БИТЬСЯ</button></div>`).join("")}</div>`;
  }
  resetArenaDay();
  const opponents=arenaOpponents();
  return `<div class="arena-head"><div><b>⚔️ АРЕНА</b><small>Попытки сегодня: ${state.arenaAttempts}/5 · Рейтинг: ${state.arenaRating}</small></div><button class="ghost-btn" onclick="openSubscreen('arenaRank')">🏆 РЕЙТИНГ</button></div><div class="arena-list">${opponents.map(p=>`<div class="arena-row"><span class="rating-avatar">${classData[p.classKey].icon}</span><div class="rating-name"><b>${escapeHtml(p.name)}</b><small>${classData[p.classKey].name} · Ур. ${p.level} · ${p.rating}</small></div><button class="primary-btn arena-fight-btn" onclick="arenaBattle('${p.id}')" ${state.arenaAttempts>=5?'disabled':''}>БИТЬСЯ</button></div>`).join('')}</div>`;
}
function renderArenaRank(){
  const list=[{name:state.playerName||'Пробуждённый',rating:state.arenaRating,self:true},...arenaOpponents().map(x=>({name:x.name,rating:x.rating}))].sort((a,b)=>b.rating-a.rating);
  return `<div class="rating-head"><b>🏆 РЕЙТИНГ АРЕНЫ</b><span>Попытки: ${state.arenaAttempts}/5</span></div><div class="rating-list">${list.map((p,i)=>`<div class="rating-row ${p.self?'self':''}"><span>#${i+1}</span><span>⚔️</span><span class="rating-name"><b>${escapeHtml(p.name)}</b></span><strong>${p.rating}</strong></div>`).join('')}</div><button class="primary-btn" onclick="openSubscreen('arena')">← В АРЕНУ</button>`;
}

function showBattle(title){$("battleDungeonName").textContent=title;$("screen-character").classList.remove("active");$("screen-dungeons").classList.remove("active");$("screen-association").classList.remove("active");$("screen-more").classList.remove("active");$("screen-sub").classList.remove("active");$("screen-battle").classList.add("active");document.querySelectorAll(".nav-btn").forEach(x=>x.classList.remove("active"));state.hp=state.maxHp;state.mana=state.maxMana;save();$("enemyName").textContent=state.battle.name;$("enemySprite").textContent=state.battle.icon;$("skillName").textContent=classData[state.playerClass].skill+" · "+classData[state.playerClass].skillCost+" МАНЫ";$("battleLog").innerHTML="";log("Бой начался. "+state.battle.name+" появился!","system");updateBattle();updateFarmBattleUI();}
function updateBattle(){const b=state.battle;if(!b)return;$("battlePlayerHp").textContent=Math.max(0,Math.floor(state.hp));$("battlePlayerMaxHp").textContent=state.maxHp;$("playerHpBar").style.width=Math.max(0,state.hp/state.maxHp*100)+"%";$("battlePlayerMana").textContent=Math.max(0,Math.floor(state.mana));$("battlePlayerMaxMana").textContent=Math.floor(state.maxMana);$("battlePlayerManaBar").style.width=(state.maxMana?Math.max(0,state.mana/state.maxMana*100):0)+"%";$("enemyHp").textContent=Math.max(0,Math.floor(b.hp));$("enemyMaxHp").textContent=Math.floor(b.maxHp);$("enemyHpBar").style.width=Math.max(0,b.hp/b.maxHp*100)+"%";if($("manaText"))$("manaText").textContent=Math.floor(state.mana);if($("manaMax"))$("manaMax").textContent=Math.floor(state.maxMana);if($("manaBar"))$("manaBar").style.width=(state.maxMana?Math.max(0,state.mana/state.maxMana*100):0)+"%";}
function log(t,type="hit"){const el=document.createElement("div");el.className="log-"+type;el.textContent=t;$("battleLog").appendChild(el);$("battleLog").scrollTop=$("battleLog").scrollHeight;}
function enemyTurn(){if(!state.battle||state.battle.hp<=0)return;const dodge=Math.random()<state.dodge/100;if(dodge){log("Ты уклонился от атаки!","system");save();return;}const raw=state.battle.atk*(.85+Math.random()*.3);const dmg=Math.max(1,Math.floor(raw-state.def*.38));state.hp=Math.max(0,state.hp-dmg);log(`${state.battle.name} наносит ${dmg} урона.`,"dmg");$("battlePlayerSprite").classList.remove("shake");void $("battlePlayerSprite").offsetWidth;$("battlePlayerSprite").classList.add("shake");if(state.hp<=0){log("Ты пал в бою.","dmg");setTimeout(()=>defeatBattle(),650);}save();}
function playerAttack(mult=1){if(!state.battle||state.hp<=0)return;const crit=Math.random()*100<state.crit;let dmg=Math.floor(state.atk*(.9+Math.random()*.2)*mult);if(crit)dmg=Math.floor(dmg*(1+state.critDamage/100));state.battle.hp=Math.max(0,state.battle.hp-dmg);log(`Ты наносишь ${dmg}${crit?" КРИТИЧЕСКИЙ УДАР!":""} урона.`,"hit");$("enemySprite").classList.remove("hit");void $("enemySprite").offsetWidth;$("enemySprite").classList.add("hit");if(state.battle.hp<=0)winBattle();else setTimeout(enemyTurn,250);updateBattle();save();}
function skill(){if(!state.battle||state.hp<=0)return;const c=classData[state.playerClass];if(state.mana<c.skillCost){log(`Недостаточно маны. Нужно ${c.skillCost}, доступно ${Math.floor(state.mana)}.`,"system");return;}state.mana-=c.skillCost;save();const mult=state.playerClass==="mage"?2.2:state.playerClass==="assassin"?2.0:state.playerClass==="archer"?1.85:1.65;playerAttack(mult);}
function heal(){if(!state.battle||state.hp<=0)return;const amount=Math.floor(state.maxHp*(.24+state.stamina*.003));state.hp=Math.min(state.maxHp,state.hp+amount);log(`Восстановлено ${amount} HP.`,`heal`);updateBattle();save();setTimeout(enemyTurn,250);}
function winBattle(){
  const b=state.battle;if(!b)return;
  if(b.arena){ state.hp=state.maxHp; state.mana=state.maxMana; state.battle=null; arenaWin(); showScreen('more'); render(); openSubscreen('arena'); return; }
  if(b.farm){
    const earnedXp=500, gold=rand(100,300);
    addXP(earnedXp); state.coins+=gold; state.farmKills=(state.farmKills||0)+1;
    updateQuestProgress('kills',1);
    const n=Number(state.farmKills||0)+1;
    state.battle={boss:false,farm:true,name:'Фарм-монстр #'+n,icon:'👹',maxHp:Math.floor(((state.maxHp*.62)+state.atk*3)*1.2),hp:Math.floor(((state.maxHp*.62)+state.atk*3)*1.2),atk:Math.max(1,Math.floor((state.def*.95+state.atk*.16)*1.3)),xp:500,reward:0};
    showBattle('ФАРМ-ЗОНА'); updateFarmBattleUI();
    save();
    modal('ФАРМ ЗАВЕРШЁН',`+500 XP · +${gold} золота. Лут здесь не выпадает. Следующий моб уже ждёт.`);
    return;
  }
  if(b.boss){const old=ranks[state.rank];state.rank=Math.min(ranks.length-1,state.rank+1);selectedDungeonRank=state.rank;state.battle=null;save();modal('РАНГ ПОВЫШЕН',`Ты победил испытание. Ранг ${old} → ${ranks[state.rank]}. Новые подземелья открыты.`);}else{const earnedXp=Math.floor(b.xp);addXP(earnedXp);state.coins+=b.reward;updateQuestProgress('dungeons',1);updateQuestProgress('kills',1);const loot=addLootFromMob(); if(loot){ensureNotices();state.notices.inventory=true;} state.battle=null;save();modal('ПОДЗЕМЕЛЬЕ ПРОЙДЕНО',loot?`Получено ${earnedXp.toLocaleString()} XP, ${b.reward.toLocaleString()} золота и добыча: ${loot.icon} ${loot.name} · ${loot.rarity}.`:`Получено ${earnedXp.toLocaleString()} XP и ${b.reward.toLocaleString()} золота. Лут не выпал.`);}showScreen('dungeons');render();
}
function defeatBattle(){const wasArena=!!state.battle?.arena;const wasFarm=!!state.battle?.farm;state.battle=null;save();if(wasArena){arenaLose();showScreen("more");render();openSubscreen("arena");}else if(wasFarm){farmExit();modal("ФАРМ-ЗОНА","Ты остановил фарм. Награды за проигранный бой нет.");}else{showScreen("dungeons");render();modal("ПОРАЖЕНИЕ","Ты проиграл бой. Награда за это прохождение не получена.");}}
function leaveBattle(){const wasFarm=!!state.battle?.farm;const wasArena=!!state.battle?.arena;state.battle=null;save();if(wasFarm||wasArena){showScreen("more");render();openSubscreen(wasFarm?"farm":"arena");}else{showScreen("dungeons");render();}}
const subScreens={
  inventory:["🎒 ИНВЕНТАРЬ","Предметы, снаряжение и добыча с мобов."],
  equipment:["⚔️ ЭКИПИРОВКА","Оружие, броня и аксессуары персонажа."],
  quests:["📜 ЗАДАНИЯ","Новый цикл заданий каждые 5 часов."],
  shop:["🛒 МАГАЗИН","Теневые монеты и Премиум."],
  bazaar:["🏪 БАЗАР","Выставляй свои предметы. Максимум 5 лотов."],
  mail:["📨 ПОЧТА","Системные уведомления и сообщения игроков."],
  chat:["💬 ОБЩИЙ ЧАТ","Общий чат игроков в реальном времени."],
  farm:["🌾 ФАРМ-ЗОНА","Бесконечные мобы: 500 XP и 100–300 золота. Лут не выпадает."],
  rating:["🏆 РЕЙТИНГ","Игроки и рейтинг по уровню."],
  arena:["⚔️ АРЕНА","5 попыток в день против других игроков."],
  arenaRank:["🏆 РЕЙТИНГ АРЕНЫ","Рейтинг игроков на арене."],
  settings:["⚙️ НАСТРОЙКИ","Настройки интерфейса, звука и аккаунта."]
};
function equipmentSlotHtml(type,label,icon){
  const item=state.equipped?.[type];
  if(!item) return `<div class="equipment-slot empty"><div class="slot-icon">${icon}</div><div class="slot-info"><b>${label}</b><small>Слот свободен</small></div></div>`;
  return `<div class="equipment-slot filled"><div class="slot-icon">${item.icon}</div><div class="slot-info"><div class="slot-top"><b>${item.name}</b><span class="item-rarity">${item.rarity}</span></div><small>${classData[item.classKey]?.name||"Общее"} · Ур. ${item.itemLevel||1}</small><div class="item-stats">${itemStatChips(item)}</div></div><button class="item-action secondary-btn" onclick="unequipItem('${type}')">СНЯТЬ</button></div>`;
}
function renderEquipment(){
  const bonus=equipmentBonusStats();
  return `<div class="equipment-head"><div><b>⚔️ ЭКИПИРОВКА</b><small>${classData[state.playerClass]?.name||"Персонаж"} · только совместимое снаряжение</small></div><div class="eq-power">+${Object.values(bonus).reduce((a,b)=>a+b,0)} статов</div></div>
  <div class="equipment-slots">${equipmentSlotHtml("weapon","Оружие","⚔️")}${equipmentSlotHtml("armor","Броня","🛡️")}${equipmentSlotHtml("amulet","Амулет","🔮")}</div>
  <div class="equipment-tip">💡 Оружие не даёт прямую атаку — оно даёт свои характеристики, например <b>Сила +7 · Шанс крита +2%</b>. Броня даёт HP/Защиту/Выносливость, амулеты — крит, уклонение и другие бонусы.</div>`;
}
function equipItem(itemId){
  const item=state.inventory.find(x=>x.id===itemId);
  if(!item || !["weapon","armor","amulet"].includes(item.type)) return;
  if(item.classKey!=="all" && item.classKey!==state.playerClass){modal("ЭКИПИРОВКА",`Этот предмет предназначен для класса «${classData[item.classKey]?.name||"другого класса"}.`);return;}
  if(Number(item.itemLevel||1)>Number(state.level)){modal("ЭКИПИРОВКА",`Предмет требует ${item.itemLevel} уровня. Твой уровень: ${state.level}.`);return;}
  const old=state.equipped[item.type];
  state.inventory=state.inventory.filter(x=>x.id!==itemId);
  if(old) state.inventory.push(old);
  state.equipped[item.type]=item;
  recalc(); save(); render(); openSubscreen("equipment");
}
function unequipItem(type){
  const item=state.equipped?.[type]; if(!item)return;
  state.inventory.push(item); state.equipped[type]=null; recalc(); save(); render(); openSubscreen("equipment");
}
function renderInventoryItem(item){
  const equipable=["weapon","armor","amulet"].includes(item.type);
  const r=itemRarityClass(item);
  const action=equipable?`<button class="item-action primary-btn" onclick="equipItem('${item.id}')">НАДЕТЬ</button>`:`<span class="material-tag">МАТЕРИАЛ</span>`;
  const up=upgradeCost(item), shards=dismantleReward(item);
  return `<div class="loot-card rarity-${r}"><div class="loot-card-top"><span class="loot-icon">${item.icon}</span><div><b>${item.name}</b><small><span class="rarity-text">${item.rarity}</span> · Ур. ${item.itemLevel||1} · Ул. ${item.upgradeLevel||0} · ${classData[item.classKey]?.name||"Общее"}</small></div></div><div class="item-stats">${itemStatChips(item)}</div><div class="item-actions">${action}<button class="item-action secondary-btn" onclick="upgradeItem('${item.id}')">УЛУЧШИТЬ</button><button class="item-action ghost-btn" onclick="dismantleItem('${item.id}')">РАЗОБРАТЬ · 🔹${shards}</button><button class="item-action danger-btn" onclick="sellInventoryItem('${item.id}')">ПРОДАТЬ 🪙 ${Math.max(5,Math.floor((item.price||10)*.5))}</button></div></div>`;
}
function toggleDismantleRarity(name){
  const arr=Array.isArray(state.inventoryDismantleRarities)?state.inventoryDismantleRarities:[];
  const i=arr.indexOf(name);
  if(i>=0) arr.splice(i,1); else arr.push(name);
  state.inventoryDismantleRarities=arr; save(); render(); openSubscreen("inventory");
}
function sellAllInventory(){
  const items=(state.inventory||[]).slice();
  if(!items.length){modal("ИНВЕНТАРЬ","Нечего продавать.");return;}
  if(!window.confirm(`Продать все ${items.length} предметов из инвентаря?`))return;
  const saleMult=state.premium?1.10:1;
  let total=0;
  items.forEach(item=>{ total+=Math.max(5,Math.floor((item.price||item.itemLevel*item.itemLevel*2)*0.5*saleMult)); });
  state.inventory=[]; state.coins+=total; save(); render(); openSubscreen("inventory");
  modal("ВСЁ ПРОДАНО",`Продано предметов: ${items.length}. Получено 🪙 ${total.toLocaleString("ru-RU")}.`);
}
function dismantleSelectedRarities(){
  const selected=Array.isArray(state.inventoryDismantleRarities)?state.inventoryDismantleRarities:[];
  if(!selected.length){modal("РАЗБОР","Сначала выбери одну или несколько редкостей ниже.");return;}
  const items=(state.inventory||[]).filter(item=>selected.includes(item.rarity));
  if(!items.length){modal("РАЗБОР","Предметов выбранных редкостей нет.");return;}
  if(!window.confirm(`Разобрать ${items.length} предметов выбранных редкостей?`))return;
  let gain=0;
  items.forEach(item=>gain+=dismantleReward(item));
  state.inventory=(state.inventory||[]).filter(item=>!selected.includes(item.rarity));
  state.shards+=gain; save(); render(); openSubscreen("inventory");
  modal("РАЗБОР ЗАВЕРШЁН",`Разобрано: ${items.length}. Получено 🔹 ${gain} осколков.`);
}
function renderInventory(){
  const items=state.inventory||[];
  const selected=Array.isArray(state.inventoryDismantleRarities)?state.inventoryDismantleRarities:[];
  const rarityControls=RARITIES.map(r=>`<button class="rarity-filter ${selected.includes(r.name)?"selected":""} rarity-${r.cls}" onclick="toggleDismantleRarity('${r.name.replaceAll("'","\\'")}')">${r.name}</button>`).join("");
  const bulk=`<div class="inventory-bulk"><div class="bulk-top"><div><b>МАССОВЫЕ ДЕЙСТВИЯ</b><small>Выбери редкости для разбора</small></div><span>Выбрано: ${selected.length}</span></div><div class="rarity-filters">${rarityControls}</div><div class="bulk-actions"><button class="item-action danger-btn" onclick="sellAllInventory()">💰 ПРОДАТЬ ВСЁ</button><button class="item-action secondary-btn" onclick="dismantleSelectedRarities()">🔨 РАЗОБРАТЬ ВЫБРАННОЕ</button></div></div>`;
  if(!items.length) return `<div class="inventory-empty"><div>🎒</div><h2>Инвентарь пуст</h2><p>Снаряжение выпадает после побед над монстрами.</p>${bulk}</div>`;
  return `<div class="inventory-head"><div><b>🎒 ИНВЕНТАРЬ</b><small>${items.length}/60 предметов</small></div><span>🔹 ${state.shards||0} осколков</span></div>${bulk}<div class="loot-grid">${items.slice().reverse().map(renderInventoryItem).join("")}</div>`;
}

function upgradeItem(itemId){
  const item=state.inventory.find(x=>x.id===itemId) || Object.values(state.equipped||{}).find(x=>x?.id===itemId);
  if(!item || item.type==="material"){modal("УЛУЧШЕНИЕ","Этот предмет нельзя улучшить.");return;}
  const cost=upgradeCost(item);
  if(state.shards<cost.shards || state.coins<cost.gold){modal("НЕДОСТАТОЧНО РЕСУРСОВ",`Нужно 🔹 ${cost.shards} осколков и 🪙 ${cost.gold.toLocaleString("ru-RU")} золота.`);return;}
  state.shards-=cost.shards;state.coins-=cost.gold;item.upgradeLevel=(Number(item.upgradeLevel)||0)+1;item.stats=generateEquipmentStats(item.type,item.itemLevel,item.rarity,item.upgradeLevel);item.price=Math.max(10,Math.floor(item.itemLevel*item.itemLevel*1.8*rarityByName(item.rarity).mult*(1+item.upgradeLevel*.12)));recalc();save();render();openSubscreen("inventory");
}
function dismantleItem(itemId){
  const i=state.inventory.findIndex(x=>x.id===itemId);if(i<0)return;
  const item=state.inventory[i];const gain=dismantleReward(item);state.inventory.splice(i,1);state.shards+=gain;save();render();openSubscreen("inventory");modal("ПРЕДМЕТ РАЗОБРАН",`${item.icon} ${item.name} разобран. Получено 🔹 ${gain} осколков.`);
}
function sellInventoryItem(itemId){
  const item=state.inventory.find(x=>x.id===itemId);
  if(!item) return;
  const saleMult=state.premium?1.10:1;
  const value=Math.max(5,Math.floor((item.price||item.itemLevel*item.itemLevel*2)*0.5*saleMult));
  state.inventory=state.inventory.filter(x=>x.id!==itemId);
  state.coins+=value;
  save(); render(); openSubscreen("inventory");
  modal("ПРЕДМЕТ ПРОДАН",`${item.icon} ${item.name} продан за 🪙 ${value.toLocaleString("ru-RU")}.`);
}
function promptBazaarPrice(itemId){
  if(state.bazaarLots.length>=5){modal("БАЗАР","Лимит 5 лотов уже достигнут.");return;}
  const item=state.inventory.find(x=>x.id===itemId);if(!item)return;
  const price=window.prompt(`Цена за «${item.name}» в золоте:`,String(item.price));
  if(price===null)return;
  if(!Number.isFinite(Number(price))||Number(price)<=0){modal("БАЗАР","Укажи положительную цену в золоте.");return;}
  createBazaarLot(itemId,Number(price));
}
function renderBazaar(){
  const lots=onlineData.bazaar?.length?onlineData.bazaar.map(x=>({id:x.id,item:x.item,price:Number(x.price||0),mine:!!x.mine,sellerName:x.seller_name})):state.bazaarLots||[];
  const myLots=lots.filter(x=>x.mine||!x.sellerName);
  const publicLots=lots.filter(x=>!x.mine&&x.sellerName);
  const available=(state.inventory||[]).filter(x=>x.type!=="material");
  const lotHtml=(lot,buy)=>`<div class="loot-item rarity-${itemRarityClass(lot.item)}"><span class="loot-icon">${lot.item.icon}</span><div class="loot-info"><b>${escapeHtml(lot.item.name)}</b><small>${lot.item.rarity} · Ур. ${lot.item.itemLevel} · ${classData[lot.item.classKey]?.name||"Общее"}${lot.sellerName?` · ${escapeHtml(lot.sellerName)}`:""}</small></div><strong class="lot-price">🪙 ${lot.price.toLocaleString("ru-RU")}</strong>${buy?`<button class="primary-btn bazaar-add" onclick="buyBazaarLot('${lot.id}')">КУПИТЬ</button>`:`<button class="ghost-btn loot-sell" onclick="cancelBazaarLot('${lot.id}')">СНЯТЬ</button>`}</div>`;
  return `<div class="sub-balance">🏪 <b>${lots.length}</b> лотов на сервере · 🪙 ${state.coins.toLocaleString("ru-RU")}</div>
    <div class="bazaar-note">🌐 Общий базар: выставленные предметы видны всем игрокам.</div>
    <h3 class="bazaar-section-title">МОИ ЛОТЫ</h3>${myLots.length?`<div class="loot-list">${myLots.map(x=>lotHtml(x,false)).join("")}</div>`:`<div class="bazaar-empty">Пока ничего не выставлено.</div>`}
    <h3 class="bazaar-section-title">ВСЕ ЛОТЫ</h3>${publicLots.length?`<div class="loot-list">${publicLots.map(x=>lotHtml(x,true)).join("")}</div>`:`<div class="bazaar-empty">Другие игроки пока ничего не продают.</div>`}
    <h3 class="bazaar-section-title">ВЫСТАВИТЬ СНАРЯЖЕНИЕ</h3>${available.length?`<div class="loot-list bazaar-pick">${available.map(item=>`<div class="loot-item rarity-${itemRarityClass(item)}"><span class="loot-icon">${item.icon}</span><div class="loot-info"><b>${item.name}</b><small>${item.rarity} · Ур. ${item.itemLevel} · ${classData[item.classKey]?.name||"Общее"}</small></div><button class="primary-btn bazaar-add" onclick="promptBazaarPrice('${item.id}')">ВЫСТАВИТЬ</button></div>`).join("")}</div>`:`<div class="bazaar-empty">В инвентаре нет снаряжения для выставления.</div>`}`;
}
async function buyBazaarLot(lotId){
  const r=await apiRequest("bazaar_buy",{lotId});
  if(!r){modal("БАЗАР","Не удалось купить предмет. Проверь онлайн-сервер.");return;}
  if(r.error){modal("БАЗАР",r.error);return;}
  if(r.state){state={...state,...r.state,spentStats:{...defaultStats(),...(r.state.spentStats||{})}};recalc();save();}
  await refreshOnlineSection("bazaar"); modal("БАЗАР","Предмет куплен и добавлен в инвентарь.");
}
function renderQuests(){
  ensureNotices();
  refreshQuestCycle(false);
  const done=allQuestsDone();
  const claimed=!!state.questClaimed;
  return `<div class="quest-cycle"><span>⏱️ Обновление через</span><b>${questTimeLeft()}</b></div>
    <div class="quest-list">${state.quests.map(q=>{const pct=Math.min(100,q.progress/q.target*100);const qDone=q.progress>=q.target;return `<div class="quest-item ${claimed?"claimed":""}"><div class="quest-row"><span>${q.icon}</span><div><b>${q.name}</b><small>${Math.floor(q.progress).toLocaleString("ru-RU")} / ${q.target.toLocaleString("ru-RU")}${qDone?" · ВЫПОЛНЕНО":""}</small></div></div><div class="quest-bar"><div style="width:${pct}%"></div></div></div>`}).join("")}</div>
    <div class="quest-reward ${claimed?"claimed":""}"><b>🏆 НАГРАДА ЗА ВСЕ ЗАДАНИЯ</b><span>🪙 2 000 · 🌑 20 · ✨ 10 000 XP</span></div>
    <button class="primary-btn quest-claim-btn ${claimed?"claimed-btn":""}" onclick="claimQuestReward()" ${done&&!claimed?"":"disabled"}>${claimed?"✓ НАГРАДА УЖЕ ПОЛУЧЕНА":done?"ЗАБРАТЬ НАГРАДУ":"ВЫПОЛНИ ВСЕ ЗАДАНИЯ"}</button>`;
}
function renderSettings(){
  const current=state.playerClass?classData[state.playerClass].name:"Не выбран";
  const classes=Object.entries(classData).map(([key,c])=>`<option value="${key}" ${key===state.playerClass?"selected":""}>${c.icon} ${c.name}</option>`).join("");
  return `<div class="settings-list">
    <div class="settings-card"><div><b>👤 Имя персонажа</b><small>${escapeHtml(state.playerName||"Пробуждённый")}</small></div><button class="ghost-btn" onclick="changePlayerName()">ИЗМЕНИТЬ</button></div>
    <div class="settings-card"><div><b>🧬 Класс персонажа</b><small>${current} · смена стоит 100 🌑</small></div><div class="settings-class-controls"><select id="classChangeSelect">${classes}</select><button class="ghost-btn" onclick="changeCharacterClass()">СМЕНИТЬ</button></div></div>
    <div class="settings-note">Смена класса сохраняет уровень, ранг и опыт. Вложенные очки возвращаются в запас для повторного распределения. Несовместимая экипировка снимается.</div>
  </div>`;
}
function escapeHtml(value){return String(value??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));}
function changePlayerName(){
  const next=window.prompt("Новое имя персонажа:",state.playerName||"Пробуждённый");
  if(next===null)return;
  const name=next.trim().slice(0,24);
  if(!name){modal("ИМЯ","Имя не может быть пустым.");return;}
  state.playerName=name;save();render();openSubscreen("settings");
}
function changeCharacterClass(){
  const key=$("classChangeSelect")?.value;
  if(!key||key===state.playerClass){modal("КЛАСС","Выбери другой класс.");return;}
  if(state.shadowCoins<100){modal("НЕДОСТАТОЧНО","Для смены класса нужно 100 теневых монет.");return;}
  state.shadowCoins-=100;
  state.statPoints += totalSpent();
  state.spentStats=defaultStats();
  if(state.equipped?.weapon && state.equipped.weapon.classKey!==key){ state.inventory.push(state.equipped.weapon); state.equipped.weapon=null; }
  if(state.equipped?.armor && state.equipped.armor.classKey!==key){ state.inventory.push(state.equipped.armor); state.equipped.armor=null; }
  if(state.equipped?.amulet && state.equipped.amulet.classKey!==key){ state.inventory.push(state.equipped.amulet); state.equipped.amulet=null; }
  state.playerClass=key;
  state.evolution=null;
  state.inventory.forEach(item=>{if(item.classKey===undefined) item.classKey=item.type==="material"?"all":key;});
  recalc();
  state.hp=state.maxHp;
  state.mana=state.maxMana;
  save();render();openSubscreen("settings");
  modal("КЛАСС ИЗМЕНЁН",`Теперь твой персонаж — ${classData[key].name}. Потрачено 100 🌑.`);
}

function openSubscreen(type,refreshOnly=false){
  ensureNotices();
  if(["inventory","equipment","quests","mail"].includes(type)) state.notices[type]=false;
  const data=subScreens[type];
  $("subscreenTitle").textContent=data[0];
  if(type==="shop") {
    $("subscreenContent").innerHTML=`<div class="sub-shop-balance">🌑 <b>${state.shadowCoins.toLocaleString("ru-RU")}</b></div><div class="shop-items">
      <div class="shop-item"><div class="shop-item-icon">🌑</div><div class="shop-item-info"><b>100 теневых монет</b><small>Премиальная валюта · ⭐ Stars</small></div><button onclick="buyShadowCoins(100,10)">⭐ 10</button></div>
      <div class="shop-item"><div class="shop-item-icon">🌑</div><div class="shop-item-info"><b>550 теневых монет</b><small>Бонусный пакет · ⭐ Stars</small></div><button onclick="buyShadowCoins(550,50)">⭐ 50</button></div>
      <div class="shop-item"><div class="shop-item-icon">🌑</div><div class="shop-item-info"><b>1200 теневых монет</b><small>Большой пакет · ⭐ Stars</small></div><button onclick="buyShadowCoins(1200,100)">⭐ 100</button></div>
      <div class="shop-item energy-buy"><div class="shop-item-icon">⚡</div><div class="shop-item-info"><b>Восстановить 100 энергии</b><small>80 🌑 · максимум 10 раз в день</small></div><button onclick="restoreEnergyForShadow()">🌑 80</button></div>
      <div class="premium-card compact-premium"><b>👑 ПРЕМИУМ · ⭐100</b><small>👑 корона · ⚡ +100 энергии · 🤖 авто-бой · 🌑 20/день · ⬆️ +1 очко/уровень · 💰 продажа лута +10%</small><div class="premium-actions"><button class="primary-btn" onclick="buyPremium()">КУПИТЬ ЗА ⭐100</button></div><small class="shop-note">Оплата — только через Telegram Stars после подключения серверного invoice.</small></div>
    </div>`;
  } else if(type==="quests") {
    $("subscreenContent").innerHTML=renderQuests();
  } else if(type==="inventory") {
    $("subscreenContent").innerHTML=renderInventory();
  } else if(type==="equipment") {
    $("subscreenContent").innerHTML=renderEquipment();
  } else if(type==="bazaar") {
    $("subscreenContent").innerHTML=renderBazaar();
  } else if(type==="mail") {
    $("subscreenContent").innerHTML=renderMail();
  } else if(type==="farm") {
    $("subscreenContent").innerHTML=`<div class="farm-panel"><div class="farm-icon">🌾</div><h2>БЕСКОНЕЧНАЯ ФАРМ-ЗОНА</h2><p>Каждый моб даёт ровно <b>500 XP</b> и случайно <b>100–300 золота</b>. Лут не выпадает.</p><div class="farm-rule">⚠️ Авто-бой здесь недоступен.</div><button class="primary-btn" onclick="startFarmZone()">НАЧАТЬ ФАРМ</button></div>`;
  } else if(type==="rating") {
    $("subscreenContent").innerHTML=renderRating();
  } else if(type==="arena") {
    $("subscreenContent").innerHTML=renderArena();
  } else if(type==="arenaRank") {
    $("subscreenContent").innerHTML=renderArenaRank();
  } else if(type==="chat") {
    $("subscreenContent").innerHTML=renderChat();
    refreshOnlineSection("chat");
  } else if(type==="settings") {
    $("subscreenContent").innerHTML=renderSettings();
  } else {
    $("subscreenContent").innerHTML=`<div class="sub-big-icon">${data[0].slice(0,2)}</div><h2>${data[0].replace(/^\S+ /,"")}</h2><p>${data[1]}</p>`;
  }
  showScreen("sub");
  if(!refreshOnly && ["rating","arena","arenaRank","bazaar"].includes(type)) refreshOnlineSection(type);
}
function closeSubscreen(){showScreen("more");render();}
function openShop(){openSubscreen("shop");}
function restoreEnergyForShadow(){
  const day=new Date().toISOString().slice(0,10);
  if(state.energyRestoreDay!==day){state.energyRestoreDay=day;state.energyRestoreCount=0;}
  if((state.energyRestoreCount||0)>=10){modal("МАГАЗИН","Сегодня уже использовано 10 восстановлений энергии.");return;}
  if(state.shadowCoins<80){modal("НЕДОСТАТОЧНО","Нужно 80 теневых монет.");return;}
  state.shadowCoins-=80;state.energy=Math.min(state.energy+100,maxEnergy());state.energyRestoreCount=(state.energyRestoreCount||0)+1;save();render();openSubscreen("shop");
  modal("ЭНЕРГИЯ ВОССТАНОВЛЕНА","+100 энергии. Использовано сегодня: "+state.energyRestoreCount+"/10.");
}
function buyShadowCoins(amount,stars){modal("ПОКУПКА",`Пакет: ${amount.toLocaleString()} теневых монет за ⭐ ${stars}. Реальная оплата Stars подключается через серверный Telegram invoice.`);}

async function buyPremium(){
  if(state.premium){ modal("ПРЕМИУМ","Премиум уже активирован."); return; }
  if(!telegramInitData()){ modal("ПРЕМИУМ","Открой игру через Telegram, чтобы оплатить Premium Stars."); return; }
  const r=await apiRequest("create_premium_invoice");
  if(!r?.invoiceLink){ modal("ПРЕМИУМ","Сервер оплаты пока не подключён. Добавь config.php и webhook по инструкции в README."); return; }
  const tgApp=window.Telegram?.WebApp;
  if(!tgApp?.openInvoice){ modal("ПРЕМИУМ","Текущая версия Telegram не предоставила окно оплаты."); return; }
  tgApp.openInvoice(r.invoiceLink, async(status)=>{
    if(status==="paid"){
      const loaded=await apiRequest("load");
      if(loaded?.state){state={...state,...loaded.state,spentStats:{...defaultStats(),...(loaded.state.spentStats||{})}};recalc();save();render();}
      modal("ПРЕМИУМ","Оплата прошла. Premium активирован.");
    } else if(status==="cancelled") modal("ПРЕМИУМ","Покупка отменена.");
    else if(status==="failed") modal("ПРЕМИУМ","Не удалось завершить оплату.");
  });
}
function autoBattle(){
  if(!state.premium){ modal("НУЖЕН ПРЕМИУМ","Авто-бой доступен только после покупки Премиума ⭐100."); return; }
  if(!state.battle) return;
  if(state.battle.farm){modal("ФАРМ-ЗОНА","Авто-бой здесь недоступен.");return;}
  const b=state.battle;
  let hp=state.maxHp, mana=state.maxMana, enemyHp=b.maxHp, turns=0;
  const skillCost=classData[state.playerClass].skillCost;
  const skillMult=state.playerClass==="mage"?2.2:state.playerClass==="assassin"?2.0:state.playerClass==="archer"?1.85:1.65;
  log("🤖 Авто-бой начал сражение по тактике игрока.","system");
  while(hp>0 && enemyHp>0 && turns<250){
    turns++;
    const healAmount=Math.floor(state.maxHp*(.24+state.stamina*.003));
    if(hp/state.maxHp<0.42 && hp<state.maxHp){
      hp=Math.min(state.maxHp,hp+healAmount);
    } else if(mana>=skillCost && enemyHp>state.atk*1.15){
      mana-=skillCost;
      let dmg=Math.floor(state.atk*(.9+Math.random()*.2)*skillMult);
      if(Math.random()*100<state.crit)dmg=Math.floor(dmg*(1+state.critDamage/100));
      enemyHp=Math.max(0,enemyHp-dmg);
    } else {
      let dmg=Math.floor(state.atk*(.9+Math.random()*.2));
      if(Math.random()*100<state.crit)dmg=Math.floor(dmg*(1+state.critDamage/100));
      enemyHp=Math.max(0,enemyHp-dmg);
    }
    if(enemyHp<=0) break;
    if(Math.random()>=state.dodge/100){
      const raw=b.atk*(.85+Math.random()*.3);
      hp=Math.max(0,hp-Math.max(1,Math.floor(raw-state.def*.38)));
    }
  }
  state.hp=hp; state.mana=mana; updateBattle();
  if(enemyHp<=0){ b.hp=0; winBattle(); } else { defeatBattle(); }
}


// HARD SAVE: persist after every user action and before the WebView is hidden/closed.
document.addEventListener("click",()=>queueMicrotask(()=>save()));
document.addEventListener("change",()=>queueMicrotask(()=>save()));
document.addEventListener("input",()=>queueMicrotask(()=>save()));
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")save();});
window.addEventListener("pagehide",()=>save());
window.addEventListener("beforeunload",()=>save());
if(tg?.onEvent){ try { tg.onEvent("viewportChanged",()=>save()); } catch(e) {} }
function showScreen(name){document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));$("screen-"+name).classList.add("active");document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.screen===name));}
function modal(title,text){$("modalTitle").textContent=title;$("modalText").textContent=text;$("modal").classList.remove("hidden");}
$("modalClose").onclick=()=>{$("modal").classList.add("hidden");render();};
document.querySelectorAll(".class-card").forEach(b=>b.onclick=()=>selectClass(b.dataset.class));
document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>showScreen(b.dataset.screen));
$("rankUpBtn").onclick=rankUp;$("attackBtn").onclick=()=>playerAttack(1);$("skillBtn").onclick=skill;$("healBtn").onclick=heal;$("leaveBattle").onclick=leaveBattle;
recalc();render();

setInterval(()=>{save();},500);
setInterval(()=>{regenEnergy();premiumDaily();resetArenaDay();render();},15000);
