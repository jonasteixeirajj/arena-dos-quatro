(() => {
'use strict';
const $ = id => document.getElementById(id);
const BASE = [
 {id:'squire',name:'Escudeiro',type:'unit',cost:1,atk:1,hp:2,text:'Criatura simples.'},
 {id:'wolf',name:'Lobo Selvagem',type:'unit',cost:2,atk:3,hp:2,text:'Ataque forte.'},
 {id:'guard',name:'Guardião',type:'unit',cost:3,atk:2,hp:5,taunt:true,text:'🛡️ Provocar: protege seu herói.'},
 {id:'archer',name:'Arqueira',type:'unit',cost:3,atk:3,hp:3,text:'Criatura equilibrada.'},
 {id:'charger',name:'Corredor',type:'unit',cost:3,atk:3,hp:1,rush:true,text:'⚡ Investida: ataca criaturas ao entrar.'},
 {id:'brute',name:'Brutamontes',type:'unit',cost:4,atk:5,hp:4,text:'Criatura de ataque elevado.'},
 {id:'healer',name:'Curandeira',type:'unit',cost:4,atk:2,hp:4,battle:'heal',text:'✨ Grito de batalha: cura 3 do seu herói.'},
 {id:'giant',name:'Gigante',type:'unit',cost:6,atk:6,hp:7,text:'Criatura resistente.'},
 {id:'bolt',name:'Raio',type:'spell',cost:2,damage:3,target:'enemy',text:'Causa 3 de dano a uma criatura ou herói inimigo.'},
 {id:'fireball',name:'Bola de Fogo',type:'spell',cost:4,damage:5,target:'enemy',text:'Causa 5 de dano a uma criatura ou herói inimigo.'},
 {id:'mend',name:'Restaurar',type:'spell',cost:2,heal:4,target:'friendly',text:'Cura 4 de vida de um herói ou criatura aliada.'},
 {id:'insight',name:'Conhecimento',type:'spell',cost:3,draw:2,text:'Compre 2 cartas.'}
];
const seatNames=['Você','Bot Rubro','Bot Violeta','Bot Verde'];
let game,seq=0,timer=null;let drag=null,suppressClick=false;let handDrag=null;
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const uid=()=>++seq;
const live=p=>p.hp>0;
const log=s=>{game.events.unshift(s);game.events=game.events.slice(0,70);};
function makeDeck(){const cards=[];for(const card of BASE)for(let i=0;i<2;i++)cards.push({...card,uid:uid()});for(const id of ['squire','wolf','guard','archer','bolt','brute']){const card=BASE.find(c=>c.id===id);cards.push({...card,uid:uid()});}return shuffle(cards);}
function makePlayer(i){return {id:i,name:seatNames[i],hp:30,maxHp:30,manaMax:0,mana:0,deck:makeDeck(),hand:[],board:[],fatigue:0,powerUsed:false,coin:i>0};}
function draw(p,count=1){for(let n=0;n<count;n++){if(!live(p))break;if(!p.deck.length){p.fatigue++;damageHero(p,p.fatigue);log(`${p.name} sofre ${p.fatigue} de fadiga.`);continue;}const c=p.deck.pop();if(p.hand.length>=10){log(`${p.name} queimou ${c.name} (mão cheia).`);}else p.hand.push(c);}}
function start(){if(timer)clearTimeout(timer);seq=0;game={players:Array.from({length:4},(_,i)=>makePlayer(i)),turn:0,round:0,phase:'human',selected:null,pending:null,events:[],over:false};for(const p of game.players)draw(p,4);log('A partida começou! Quatro heróis entram na arena.');beginTurn(0);}
function cur(){return game.players[game.turn];}
function beginTurn(id){if(game.over)return;game.turn=id;game.selected=null;game.pending=null;const p=cur();if(!live(p)){nextTurn();return;}if(id===0)game.round++;p.manaMax=Math.min(10,p.manaMax+1);p.mana=p.manaMax;p.powerUsed=false;for(const m of p.board){m.ready=true;m.sleeping=false;m.attacks=0;}draw(p);if(game.over)return;log(`Turno de ${p.name} — ${p.mana} mana.`);game.phase=id===0?'human':'bot';render();if(id!==0)timer=setTimeout(botTurn,550);}
function nextTurn(){if(game.over)return;let n=game.turn;for(let i=0;i<4;i++){n=(n+1)%4;if(live(game.players[n])){beginTurn(n);return;}}finishCheck();}
function endTurn(){if(game.over||game.phase!=='human'||game.turn!==0)return;game.phase='transition';game.selected=null;game.pending=null;nextTurn();}
function damageHero(p,amount){p.hp=Math.max(0,p.hp-amount);finishCheck();}
function damageUnit(m,amount){m.hp-=amount;}
function cleanDead(){for(const p of game.players){const gone=p.board.filter(m=>m.hp<=0);if(gone.length)log(`${p.name} perdeu ${gone.map(m=>m.name).join(', ')}.`);p.board=p.board.filter(m=>m.hp>0);}}
function finishCheck(){const dead=game.players.filter(p=>p.hp===0&&!p.announced);for(const p of dead){p.announced=true;p.board=[];log(`${p.name} foi eliminado!`);}const alive=game.players.filter(live);if(alive.length<=1&&!game.over){game.over=true;game.phase='over';log(alive.length?`${alive[0].name} venceu a partida!`:'Empate!');}}
function canPlay(p,c){return live(p)&&p.mana>=c.cost&&(c.type!=='unit'||p.board.length<5);}
function validTargets(p,type){const out=[];for(const q of game.players){if(!live(q))continue;const allowed=type==='friendly'?q.id===p.id:q.id!==p.id;if(allowed){out.push({p:q,unit:null});for(const u of q.board)out.push({p:q,unit:u});}}return out;}
function useCard(p,c,target){if(!canPlay(p,c))return false;if(c.target&&!target)return false;if(c.target&&!validTargets(p,c.target).some(t=>sameTarget(t,target)))return false;p.mana-=c.cost;p.hand.splice(p.hand.findIndex(x=>x.uid===c.uid),1);if(c.type==='unit'){const m={...c,hp:c.hp,maxHp:c.hp,ready:false,sleeping:true,attacks:0};p.board.push(m);log(`${p.name} invocou ${c.name}.`);if(c.battle==='heal'){const healed=Math.min(3,p.maxHp-p.hp);p.hp+=healed;log(`${p.name} recuperou ${healed} de vida.`);}}else {log(`${p.name} lançou ${c.name}.`);if(c.damage)applyDamage(target,c.damage);if(c.heal)applyHeal(target,c.heal);if(c.draw)draw(p,c.draw);cleanDead();finishCheck();}return true;}
function sameTarget(a,b){return a.p.id===b.p.id&&a.unit?.uid===b.unit?.uid;}
function applyDamage(t,n){if(t.unit){damageUnit(t.unit,n);log(`${t.unit.name} recebeu ${n} de dano.`);}else {damageHero(t.p,n);log(`${t.p.name} recebeu ${n} de dano.`);}}
function applyHeal(t,n){if(t.unit){const amount=Math.min(n,t.unit.maxHp-t.unit.hp);t.unit.hp+=amount;log(`${t.unit.name} recuperou ${amount} de vida.`);}else{const amount=Math.min(n,t.p.maxHp-t.p.hp);t.p.hp+=amount;log(`${t.p.name} recuperou ${amount} de vida.`);}}
function attackTargets(p,m){if(!m||m.attacks>=1||(!m.ready&&!m.rush))return[];let out=[];for(const q of game.players){if(q.id===p.id||!live(q))continue;const taunts=q.board.filter(u=>u.taunt);if(taunts.length)out.push(...taunts.map(unit=>({p:q,unit})));else {out.push(...q.board.map(unit=>({p:q,unit})));if(m.ready)out.push({p:q,unit:null});}}return out;}
function attack(p,m,t){if(!attackTargets(p,m).some(x=>sameTarget(x,t)))return false;m.attacks=1;m.ready=false;log(`${p.name}: ${m.name} atacou ${t.unit?t.unit.name:t.p.name}.`);if(t.unit){const retaliate=t.unit.atk;damageUnit(t.unit,m.atk);damageUnit(m,retaliate);}else damageHero(t.p,m.atk);cleanDead();finishCheck();return true;}
function power(p,t){if(p.powerUsed||p.mana<2||!validTargets(p,'enemy').some(x=>sameTarget(x,t)))return false;p.mana-=2;p.powerUsed=true;log(`${p.name} usou seu poder heroico.`);applyDamage(t,1);cleanDead();finishCheck();return true;}
const choose=a=>a[Math.floor(Math.random()*a.length)];
function botTurn(){if(game.over||game.phase!=='bot')return;const p=cur();if(!live(p)){nextTurn();return;}if(p.coin&&p.manaMax<=4){p.mana++;p.coin=false;log(`${p.name} usou a Moeda (+1 mana).`);}let actions=0;while(!game.over&&actions++<18){const playable=p.hand.filter(c=>canPlay(p,c));if(!playable.length)break;playable.sort((a,b)=>b.cost-a.cost);const c=playable[0];let target=null;if(c.target){const candidates=validTargets(p,c.target);if(c.target==='enemy'){const tauntUnits=candidates.filter(t=>t.unit&&t.unit.taunt);const finishers=candidates.filter(t=>!t.unit&&t.p.hp<= (c.damage||0));target=choose(finishers.length?finishers:tauntUnits.length?tauntUnits:candidates);}else{const damaged=candidates.filter(t=>t.unit?t.unit.hp<t.unit.maxHp:t.p.hp<t.p.maxHp);if(!damaged.length)break;target=choose(damaged);}}useCard(p,c,target);}
if(!game.over){for(const m of [...p.board]){if(!p.board.includes(m))continue;const ts=attackTargets(p,m);if(ts.length){const heroes=ts.filter(t=>!t.unit);const weak=ts.filter(t=>t.unit&&t.unit.hp<=m.atk);const t=choose(heroes.length?heroes:weak.length?weak:ts);attack(p,m,t);}if(game.over)break;}}
if(!game.over&&!p.powerUsed&&p.mana>=2){const ts=validTargets(p,'enemy');const heroes=ts.filter(t=>!t.unit);if(ts.length)power(p,choose(heroes.length?heroes:ts));}
render();if(!game.over){game.phase='transition';timer=setTimeout(nextTurn,600);}}
function selectHand(uid){if(game.turn!==0||game.phase!=='human'||game.over)return;const p=cur(),c=p.hand.find(c=>c.uid===uid);if(!c||!canPlay(p,c))return;game.selected=null;if(c.target){game.pending={kind:'card',uid,type:c.target};log(`Selecione um alvo para ${c.name}.`);}else useCard(p,c);render();}
function selectUnit(uid){if(game.turn!==0||game.phase!=='human'||game.over)return;const p=cur(),m=p.board.find(m=>m.uid===uid);if(!m)return;game.pending=null;if(attackTargets(p,m).length){game.selected=game.selected===uid?null:uid;}render();}
function selectPower(){const p=cur();if(game.turn!==0||game.phase!=='human'||p.powerUsed||p.mana<2||game.over)return;game.selected=null;game.pending={kind:'power',type:'enemy'};render();}
function targetClick(pid,uid){if(game.turn!==0||game.phase!=='human'||game.over)return;const q=game.players[pid],t={p:q,unit:uid===null?null:q.board.find(m=>m.uid===uid)};if(uid!==null&&!t.unit)return;const p=cur();if(game.pending){if(game.pending.kind==='card'){const c=p.hand.find(c=>c.uid===game.pending.uid);if(c&&validTargets(p,c.target).some(x=>sameTarget(x,t))){useCard(p,c,t);game.pending=null;}}else if(game.pending.kind==='power'&&power(p,t))game.pending=null;}else if(game.selected!==null){const m=p.board.find(x=>x.uid===game.selected);if(m&&attack(p,m,t))game.selected=null;}render();}
function getTargets(){const p=game.players[0];if(game.phase!=='human'||game.over)return[];if(game.pending)return validTargets(p,game.pending.type);if(game.selected!==null)return attackTargets(p,p.board.find(m=>m.uid===game.selected));return[];}
function targetable(ts,p,unit){return ts.some(t=>t.p.id===p.id&&t.unit?.uid===unit?.uid);}
function el(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;}
function seat(p,ts){const div=el('div','seat seat-'+p.id+(!live(p)?' dead':'')+(game.turn===p.id&&!game.over?' active focus-turn':''));div.setAttribute('aria-label',p.name+' — '+(game.turn===p.id?'jogador ativo':'aguardando'));const head=el('div','seat-head');const hero=el('button','hero'+(targetable(ts,p,null)?' targetable':''));hero.innerHTML=`<span class="portrait">${['🧙','🔥','🌙','🌿'][p.id]}</span><strong>${p.name}</strong><span class="life-orb">♥ ${p.hp}</span>`;hero.dataset.targetPlayer=p.id;hero.dataset.targetUnit='hero';hero.disabled=!targetable(ts,p,null);hero.onclick=()=>{if(!suppressClick)targetClick(p.id,null)};head.append(hero,el('div','stats',`💧 ${p.mana}/${p.manaMax} · 🃏 ${p.hand.length} · 📚 ${p.deck.length}${p.coin?' · 🪙':''}`));if(p.id===0){const btn=el('button','secondary',`✨ Poder (2 mana)${p.powerUsed?' ✓':''}`);btn.disabled=game.phase!=='human'||p.mana<2||p.powerUsed||game.over;btn.onclick=selectPower;head.append(btn);}div.append(head);const board=el('div','board');if(!p.board.length)board.append(el('span','stats','Sem criaturas'));for(const m of p.board){const selected=p.id===0&&game.selected===m.uid;const active=targetable(ts,p,m);const b=el('button','minion'+(selected?' selected':'')+(active?' targetable':'')+(p.id===0&&m.ready?' ready':''));const kws=[m.taunt?'🛡️ Provocar':'',m.rush?'⚡ Investida':''].filter(Boolean).join(' ');b.innerHTML=`<span class="unit-art">${({squire:'⚔️',wolf:'🐺',guard:'🛡️',archer:'🏹',charger:'🐎',brute:'🪓',healer:'✨',giant:'🗿'})[m.id]||'⚜️'}</span><span class="name"></span><span class="keyword"></span><span class="numbers">⚔️ ${m.atk} &nbsp; ❤️ ${m.hp}/${m.maxHp}</span><span class="state"></span>`;b.querySelector('.name').textContent=m.name;b.querySelector('.keyword').textContent=kws;b.querySelector('.state').textContent=p.id===0?(m.attacks?'Atacou':m.ready?'Pronta':m.rush?'Investida':'Aguardando'):'';b.dataset.targetPlayer=p.id;b.dataset.targetUnit=m.uid;b.dataset.attacker=(p.id===0&&game.phase==='human'&&attackTargets(p,m).length)?m.uid:'';b.disabled=!(active||(p.id===0&&game.phase==='human'&&attackTargets(p,m).length));b.onclick=()=>{if(suppressClick)return;active?targetClick(p.id,m.uid):selectUnit(m.uid);};if(b.dataset.attacker)b.addEventListener('pointerdown',startAttackDrag);board.append(b);}div.append(board);return div;}
function render(){hideCardPreview();document.getElementById('arena').dataset.activeSeat=String(game.turn);const ts=getTargets();$('opponents').replaceChildren(...game.players.slice(1).map(p=>seat(p,ts)));$('playerArea').replaceChildren(seat(game.players[0],ts));const hand=$('hand');const p=game.players[0];const existing=new Map([...hand.children].map(node=>[Number(node.dataset.handUid),node]));const ordered=[];for(const c of p.hand){let b=existing.get(c.uid);if(!b){b=el('button','card');b.innerHTML=`<div class="top"><span class="name"></span><span class="cost">${c.cost}</span></div><span class="card-art">${({squire:'⚔️',wolf:'🐺',guard:'🛡️',archer:'🏹',charger:'🐎',brute:'🪓',healer:'✨',giant:'🗿',bolt:'⚡',fireball:'🔥',mend:'💚',insight:'📜'})[c.id]||'✦'}</span><span class="kind">${c.type==='unit'?'CRIATURA':'FEITIÇO'}</span><span class="desc"></span><span class="power">${c.type==='unit'?`⚔️ ${c.atk} · ❤️ ${c.hp}`:'✦ Feitiço'}</span>`;b.querySelector('.name').textContent=c.name;b.querySelector('.desc').textContent=c.text;b.disabled=game.phase!=='human'||!canPlay(p,c)||game.over;b.dataset.handUid=c.uid;b.dataset.cardId=c.id;b.draggable=false;b.addEventListener('pointerenter',()=>showCardPreview(b));b.addEventListener('pointerleave',hideCardPreview);b.addEventListener('focus',()=>showCardPreview(b));b.addEventListener('blur',hideCardPreview);b.addEventListener('pointerdown',startHandDrag);b.addEventListener('dragstart',e=>e.preventDefault());b.onclick=e=>{e.preventDefault();};}b.disabled=game.phase!=='human'||!canPlay(p,c)||game.over;ordered.push(b);}if(ordered.length!==hand.children.length || ordered.some((node,i)=>hand.children[i]!==node)){hand.replaceChildren(...ordered);}layoutFanHand();$('handCount').textContent=`(${p.hand.length}/10)`;$('endBtn').disabled=game.phase!=='human'||game.over;$('cancelBtn').hidden=!game.pending&&game.selected===null;const status=game.over?(p.hp>0?'🏆 Você venceu!':'💀 Você foi derrotado!'):game.pending?'🎯 Escolha um alvo destacado em amarelo.':game.selected!==null?'⚔️ Escolha uma criatura ou herói inimigo para atacar.':game.phase==='human'?'Sua vez: jogue cartas, ataque com criaturas prontas e encerre o turno.':`É a vez de ${cur().name}.`; $('notice').textContent=status;const logs=$('log');logs.replaceChildren(...game.events.map(s=>el('p','',s)));}
// A prévia usa um elemento separado da mão: nenhuma carta muda de tamanho ou posição.
let previewSource=null;
function hideCardPreview(){
 const host=$('cardPreview');if(!host)return;
 host.replaceChildren();host.classList.remove('visible');previewSource=null;
}
function showCardPreview(source){
 if(handDrag || drag || !source || !source.isConnected)return;
 if(previewSource===source)return;
 const host=$('cardPreview');if(!host)return;
 const copy=source.cloneNode(true);
 copy.classList.remove('drag-source');copy.classList.add('preview-card');
 copy.removeAttribute('disabled');copy.removeAttribute('style');
 host.replaceChildren(copy);host.classList.add('visible');previewSource=source;
 const rect=source.getBoundingClientRect();
 const width=230, margin=12;
 const left=Math.max(margin,Math.min(window.innerWidth-width-margin,rect.left+rect.width/2-width/2));
 // A prévia aparece sobre a mão, sem mexer no layout ou interceptar o mouse.
 const top=Math.max(10,Math.min(window.innerHeight-334,rect.top-344));
 host.style.left=left+'px';host.style.top=top+'px';
}
// Hand cards are handled through a pointer gesture, not click-based selection.
// A floating clone follows the pointer; the original card never leaves the hand.
function startHandDrag(e){
 if(e.button!==0 || game.turn!==0 || game.phase!=='human'||game.over||handDrag)return;
 const uid=Number(e.currentTarget.dataset.handUid),p=game.players[0];
 const c=p.hand.find(card=>card.uid===uid);if(!c||!canPlay(p,c))return;
 e.preventDefault();hideCardPreview();
 const source=e.currentTarget,rect=source.getBoundingClientRect();
 const ghost=source.cloneNode(true);
 ghost.classList.add('drag-ghost');ghost.disabled=false;ghost.style.width=rect.width+'px';ghost.style.height=rect.height+'px';
 document.body.append(ghost);
 handDrag={uid,startX:e.clientX,startY:e.clientY,moved:false,ghost,source};
 source.classList.add('drag-source');
 updateHandGhost(e.clientX,e.clientY);
 window.addEventListener('pointermove',moveHandDrag);
 window.addEventListener('pointerup',endHandDrag);
 window.addEventListener('pointercancel',cancelHandDrag);
}
function updateHandGhost(x,y){if(!handDrag)return;handDrag.ghost.style.left=x+'px';handDrag.ghost.style.top=y+'px';}
function moveHandDrag(e){
 if(!handDrag)return;
 if(Math.hypot(e.clientX-handDrag.startX,e.clientY-handDrag.startY)>6)handDrag.moved=true;
 updateHandGhost(e.clientX,e.clientY);
 const c=game.players[0].hand.find(x=>x.uid===handDrag.uid);
 document.querySelectorAll('.drop-valid').forEach(el=>el.classList.remove('drop-valid'));
 if(c?.target){for(const t of validTargets(game.players[0],c.target)){
 const selector=t.unit?`[data-target-player="${t.p.id}"][data-target-unit="${t.unit.uid}"]`:`[data-target-player="${t.p.id}"][data-target-unit="hero"]`;
 const el=document.querySelector(selector);if(el)el.classList.add('drop-valid');
 }}else if(c?.type==='unit')$('playerArea').classList.add('drop-valid');
}
function clearHandDrag(){
 if(!handDrag)return;
 handDrag.ghost.remove();handDrag.source.classList.remove('drag-source');handDrag=null;
 document.querySelectorAll('.drop-valid').forEach(el=>el.classList.remove('drop-valid'));
 window.removeEventListener('pointermove',moveHandDrag);
 window.removeEventListener('pointerup',endHandDrag);
 window.removeEventListener('pointercancel',cancelHandDrag);
}
function endHandDrag(e){
 if(!handDrag)return;
 const d=handDrag,p=game.players[0],c=p.hand.find(x=>x.uid===d.uid);
 // The clone is pointer-events:none, so elementFromPoint sees the actual target.
 const hit=document.elementFromPoint(e.clientX,e.clientY);
 const targetEl=hit?.closest('[data-target-player]');
 const isBoard=!!hit?.closest('#playerArea, #arena, .arena-frame');
 let used=false;
 if(c&&canPlay(p,c)&&d.moved){
  if(c.target&&targetEl){
   const pid=Number(targetEl.dataset.targetPlayer),raw=targetEl.dataset.targetUnit;
   const q=game.players[pid],unit=raw==='hero'?null:q.board.find(x=>x.uid===Number(raw));
   if(raw==='hero'||unit)used=useCard(p,c,{p:q,unit});
  }else if(!c.target&&isBoard){used=useCard(p,c);}
 }
 clearHandDrag();
 if(!used&&d.moved)log('Solte a carta em uma área válida para jogá-la.');
 game.pending=null;game.selected=null;render();
 suppressClick=true;setTimeout(()=>suppressClick=false,0);
}
function cancelHandDrag(){clearHandDrag();render();}
function startAttackDrag(e){
 if(e.button!==0||game.phase!=='human'||game.over)return;
 const uid=Number(e.currentTarget.dataset.attacker),m=game.players[0].board.find(x=>x.uid===uid);
 if(!m||!attackTargets(game.players[0],m).length)return;
 const r=e.currentTarget.getBoundingClientRect();
 drag={uid,startX:e.clientX,startY:e.clientY,x:r.left+r.width/2,y:r.top+r.height/2,moved:false,pointerId:e.pointerId};
 e.preventDefault();
 game.pending=null;game.selected=uid;
 drawAttackLine(drag.x,drag.y,e.clientX,e.clientY);
 window.addEventListener('pointermove',moveAttackDrag);window.addEventListener('pointerup',endAttackDrag);window.addEventListener('pointercancel',cancelAttackDrag);
}
function drawAttackLine(x1,y1,x2,y2){
 const svg=$('attackOverlay');svg.classList.add('show');
 $('attackLine').setAttribute('d',`M ${x1} ${y1} Q ${(x1+x2)/2-18} ${(y1+y2)/2-20} ${x2} ${y2}`);
}
function moveAttackDrag(e){if(!drag)return;if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>7)drag.moved=true;drawAttackLine(drag.x,drag.y,e.clientX,e.clientY);}
function clearAttackDrag(){drag=null;$('attackOverlay').classList.remove('show');window.removeEventListener('pointermove',moveAttackDrag);window.removeEventListener('pointerup',endAttackDrag);window.removeEventListener('pointercancel',cancelAttackDrag);}
function endAttackDrag(e){if(!drag)return;const d=drag;const dest=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-target-player]');clearAttackDrag();
 if(d.moved&&dest){const pid=Number(dest.dataset.targetPlayer),raw=dest.dataset.targetUnit,uid=raw==='hero'?null:Number(raw);const q=game.players[pid];const t={p:q,unit:uid===null?null:q.board.find(m=>m.uid===uid)};const m=game.players[0].board.find(x=>x.uid===d.uid);if(m&&(uid===null||t.unit))attack(game.players[0],m,t);}
 game.selected=null;render();suppressClick=true;setTimeout(()=>{suppressClick=false},0);
}
function cancelAttackDrag(){if(!drag)return;clearAttackDrag();game.selected=null;render();}
$('endBtn').onclick=endTurn;$('cancelBtn').onclick=()=>{game.pending=null;game.selected=null;render();};$('restartBtn').onclick=start;$('helpBtn').onclick=()=>$('help').showModal();start();

// Calcula cada carta sobre uma trilha curva, sem alterar a altura dos demais painéis.
function layoutFanHand(){
 const hand=$('hand'),cards=[...hand.children],n=cards.length;
 if(!n)return;
 const w=hand.clientWidth||window.innerWidth-25;
 const h=hand.clientHeight||120;
 const cardW=Math.min(116,Math.max(60,Math.min(w*.27,w/(Math.min(n,5)+.6))));
 const cardH=Math.min(155,Math.max(82,h-8));
 // Sobreposição progressiva impede scroll horizontal mesmo com dez cartas.
 const step=n<=1?0:Math.min(cardW*.81,Math.max(17,(w-cardW-16)/(n-1)));
 const arc=Math.min(17,(n-1)*2.7);
 cards.forEach((card,i)=>{
  const x=w/2+(i-(n-1)/2)*step;
  const t=n<=1?0:(i-(n-1)/2)/((n-1)/2);
  const angle=t*arc;
  const drop=(1-t*t)*0+Math.abs(t)*Math.min(12,h*.08);
  if(card.style.getPropertyValue('--fan-left')!==x+'px')card.style.setProperty('--fan-left',x+'px');
  if(card.style.getPropertyValue('--fan-angle')!==angle+'deg')card.style.setProperty('--fan-angle',angle+'deg');
  card.style.setProperty('--fan-drop',drop+'px');
  card.style.setProperty('--fan-width',cardW+'px');
  card.style.setProperty('--fan-height',cardH+'px');
  card.style.setProperty('--fan-order',String(i+1));
  card.style.setProperty('--fan-top','4px');
 });
}
window.addEventListener('resize',()=>{hideCardPreview();layoutFanHand();});
})();
