(() => {
  "use strict";
  const el=id=>document.getElementById(id);
  const life=window.CozyLife, world=window.CozyWorld, audio=window.CozyAudio;
  const {icon}=window.PocketIcons;
  const panel=el("panel"),overlay=el("overlay"),map=el("map");
  const directions={arrowup:"up",w:"up",arrowdown:"down",s:"down",arrowleft:"left",a:"left",arrowright:"right",d:"right"};
  const places={
    bear:{name:"Bear",line:"Mrrp! Bear gives your hand a little nudge. It must be breakfast time."},
    cottage:{name:"Mere’s cottage",line:"The door is open. Come home whenever you’re ready for a new day."},
    mailbox:{name:"The mailbox",line:"The little red flag is up. There might be something inside."},
    garden:{name:"Flower garden",line:"The tulips lean into the sun. Their soil could use a little water."},
    shop:{name:"Meadow market",line:"A ribbon flutters on the market stall. Bear has excellent taste."},
    pond:{name:"Lily pond",line:"Something makes a tiny splash between the lily pads."}
  };
  const mark=()=>'<span class="mark">'+icon("check")+'</span>';
  const price=value=>'<span class="price">'+icon("star")+value+'</span>';
  const esc=text=>String(text).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let page=null,returnFocus=null,pendingMessageUntil=0,feedbackTimer=0,chaseCount=0,chaseLock=false,chaseTimer=0;
  const s=()=>life.getState();
  function say(who,text,sticky=0,portrait=who==="Bear"?"bear":"mere"){
    el("speaker").textContent=who;el("line").textContent=text;
    el("portrait").src="assets/pets/"+portrait+"-portrait.webp";
    pendingMessageUntil=Date.now()+sticky;
  }
  function context(id){
    const hint=el("talk");
    hint.setAttribute("aria-label",id?"Interact with "+places[id].name:"Find a place in your journal");
    hint.querySelector("span").textContent=id?"Interact":"Explore";
    if(Date.now()<pendingMessageUntil)return;
    if(id==="bear"){
      if(s().completed.includes("breakfast"))say("Bear","Purrr. Bear brushes against your ankles, ready to tag along.");
      else say("Bear",places.bear.line);
    }else if(id){
      const visitedLines={
        garden:["flowers","The tulips stand a little taller after their morning drink."],
        mailbox:["mailbox","Mere has collected today’s mail. The red flag can rest."],
        pond:["pond","The last ripple has settled. The lily pads barely stir."]
      };
      const visited=visitedLines[id];
      say(places[id].name,visited&&s().completed.includes(visited[0])?visited[1]:places[id].line);
    }
    else say("Mere","A little time to wander. Tap a spot in the meadow, or see what’s in the journal.");
  }
  function refresh(){
    const state=s();el("score").textContent=state.points;el("day").textContent="Day "+state.day;world.sync();
    document.querySelectorAll("[data-view]").forEach(b=>{
      const active=(b.dataset.view==="play"?!["journal","letter","shop"].includes(page):b.dataset.view===(page==="letter"?"journal":page));
      b.classList.toggle("current",active);
      if(active)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");
    });
  }
  function shell(id,title,body){
    if(overlay.hidden)returnFocus=document.activeElement;
    page=id;world.pause(true);overlay.hidden=false;
    panel.innerHTML='<div class="panel-heading"><h2 id="panel-title">'+title+'</h2><button class="x" data-action="close" aria-label="Close">'+icon("close")+'</button></div>'+body;
    panel.scrollTop=0;panel.focus({preventScroll:true});refresh();
  }
  function close(focus=true){
    clearTimeout(chaseTimer);chaseLock=false;
    if(overlay.hidden)return;
    page=null;overlay.hidden=true;panel.replaceChildren();world.pause(false);refresh();
    if(focus)(returnFocus&&returnFocus!==document.body&&returnFocus.isConnected?returnFocus:map).focus({preventScroll:true});
  }
  function journal(){
    const st=s();
    const rows=life.chores.map(c=>{
      const done=st.completed.includes(c.id);
      const name=places[c.location].name;
      return '<button class="menu-row" data-go="'+c.location+'" '+(done?'disabled':'')+'><span class="mark">'+(done?icon("check"):"")+'</span><span class="desc"><strong>'+c.label+'</strong></span>'+(done?'<small>Done</small>':price(reward(c)))+'<span class="sr-only">'+esc(name)+'</span></button>';
    }).join("");
    const m=st.milestone;
    shell("journal","Mere’s journal",'<p class="note">Day '+st.day+' · '+st.completed.length+' of '+life.chores.length+' cozy things done. Choose one to walk there.</p><div class="row-list">'+rows+'</div><div class="goal"><div class="section-line"><strong class="goal-title">'+(m.reached?"A letter for Meredith":"Sealed letter")+'</strong>'+(m.reached?'<button class="small-action" data-action="letter">Open</button>':'<small>'+st.totalPoints+' / '+m.target+' pts</small>')+'</div>'+(m.reached?'':'<p class="hint-line">A keepsake opens at '+m.target+' lifetime cozy points.</p><progress max="'+m.target+'" value="'+st.totalPoints+'"></progress>')+'</div>');
  }
  function shop(feedback=""){
    const st=s();
    const rows=life.items.map(it=>{
      const owned=st.owned.includes(it.id);
      return '<button class="menu-row" data-buy="'+it.id+'" '+(owned?'disabled':'')+'><span class="desc"><strong>'+it.label+'</strong><small>'+it.description+'</small></span>'+(owned?'<small>Owned</small>':price(it.cost))+'</button>';
    }).join("");
    shell("shop","Meadow market",'<div class="section-line"><p class="note">In Mere’s purse</p>'+price(st.points)+'</div><div class="row-list">'+rows+'</div><p class="hint-line" role="status">'+esc(feedback||"Choose a treat to bring home.")+'</p>');
  }
  function letter(){shell("letter","A letter for Meredith",'<p class="letter">'+esc(s().milestone.letter)+'</p><button class="small-action" data-action="journal">Back to journal</button>')}
  function reward(chore){return chore.reward+(chore.id==="play"&&s().owned.includes("toy")?8:0)}
  function taskMenu(id){
    const st=s(),chores=life.chores.filter(c=>c.location===id);
    const rows=chores.map(c=>{
      const done=st.completed.includes(c.id);
      return '<button class="menu-row" data-chore="'+c.id+'" '+(done?'disabled':'')+'><span class="desc"><strong>'+c.label+'</strong><small>'+c.description+'</small></span>'+(done?mark():price(reward(c)))+'</button>';
    }).join("");
    let description=places[id].line;
    if(id==="bear")description=st.completed.includes("breakfast")?"Bear blinks slowly. There’s always room for a little company.":"Two bright blue eyes look up at Mere.";
    if(chores.every(c=>st.completed.includes(c.id)))description=id==="bear"?"Bear is fed, loved, and thoroughly played with today.":"Mere has already visited today. Tomorrow will bring something new.";
    shell(id,places[id].name,'<p class="note">'+description+'</p><div class="row-list">'+rows+'</div>');
  }
  function cottage(){
    const st=s();
    shell("cottage","Mere’s cottage",'<p class="note">A soft pillow, a warm patch of sun, and a little room for Bear.</p><p class="hint-line">'+(st.completed.length?'You’ve finished '+st.completed.length+' of 6 errands today. ':'')+'Rest to begin day '+(st.day+1)+'. Your cozy points and purchases carry over.</p><button class="small-action" data-action="rest">Rest until morning</button>');
  }
  function help(){
    shell("help","How to play",'<p class="note">Take Mere for a walk, care for Bear, and spend cozy points at the striped market stall.</p><dl class="help-list"><dt>Walk</dt><dd>Use WASD, arrow keys, or the green directional pad. You can also tap anywhere on the ground.</dd><dt>Interact</dt><dd>Tap Bear or a landmark to walk there. Press E, Space, or the gold A button when you’re nearby.</dd><dt>Journal</dt><dd>Press J to see today’s errands. Choose an unfinished one for Mere to walk there.</dd><dt>Rest</dt><dd>Visit the cottage door to start another day. Progress saves in this browser.</dd><dt>Music</dt><dd>Use the music button above the game for a lo-fi meadow tune.</dd></dl><button class="small-action" data-action="close">Back to the meadow</button>');
  }
  function visit(id){
    audio.cue("interaction");
    if(!id){journal();return}
    if(id==="shop")shop();
    else if(id==="cottage")cottage();
    else taskMenu(id);
  }
  function pulse(text){
    const gain=el("gain");clearTimeout(feedbackTimer);
    gain.classList.remove("show");void gain.offsetWidth;gain.textContent=text;gain.classList.add("show");
    feedbackTimer=setTimeout(()=>{gain.classList.remove("show");gain.textContent=""},2150);
  }
  function complete(id){
    const res=life.act(id);if(!res.ok){say("Mere",res.message,3500);close();return}
    close();refresh();world.celebrate(id);audio.cue("points");pulse("+"+res.reward+" cozy pts");
    say(["breakfast","cuddle","play"].includes(id)?"Bear":"Mere",res.message,4900);
  }
  function chase(){
    chaseCount=0;chaseLock=false;
    const toy=s().owned.includes("toy");
    shell("chase",toy?"Ribbon chase":"Play with Bear",'<p class="note">'+(toy?"Flick the ribbon":"Roll the paper ball")+' for Bear three times. Tap the toy or press E.</p><div class="playmat"><img alt="Bear" src="assets/pets/bear-portrait.webp"><button class="play-toy '+(toy?"ribbon":"")+'" data-action="pounce" aria-label="'+(toy?'Flick the ribbon':'Roll the paper ball')+'"></button></div><p class="hint-line" id="pounces" aria-live="polite">0 / 3 pounces</p>');
  }
  function pounce(){
    if(chaseLock||page!=="chase")return;
    chaseLock=true;chaseCount++;audio.cue("interaction");
    el("pounces").textContent=chaseCount+" / 3 pounces";
    const toy=panel.querySelector(".play-toy"),cat=panel.querySelector(".playmat img");
    cat.style.left=toy.style.left||"70%";cat.style.transform="translate(-50%, -5px) rotate("+ (chaseCount%2?8:-8)+"deg)";
    if(chaseCount<3){toy.style.left=chaseCount%2?"24%":"78%";toy.style.top=chaseCount%2?"28%":"48%"}
    chaseTimer=setTimeout(()=>{chaseLock=false;if(page!=="chase")return;if(chaseCount===3)complete("play");else cat.style.transform="translate(-50%, 0)"},300);
  }
  function rest(){
    life.rest();close();refresh();world.morning();audio.cue("points");pulse("Day "+s().day);
    say("Mere","Sunlight slips through the curtains. A new day with Bear is waiting.",3900);
  }
  function back(){
    if(page==="letter")journal();
    else if(page==="chase"){clearTimeout(chaseTimer);taskMenu("bear")}
    else if(page)close();
    else journal();
  }
  function pressA(){
    if(!page){world.interact();return}
    if(page==="chase"){pounce();return}
    let btn=panel.contains(document.activeElement)&&document.activeElement.tagName==="BUTTON"?document.activeElement:null;
    btn??=panel.querySelector("button:not(.x):not(:disabled)")||panel.querySelector(".x");
    btn?.click();
  }
  function controllerFlash(id){
    const node=el(id);node.classList.add("pressed");setTimeout(()=>node.classList.remove("pressed"),115);
  }
  const actions={close,journal,shop,letter,rest,pounce};
  panel.addEventListener("click",ev=>{
    const btn=ev.target.closest("button");if(!btn||btn.disabled)return;
    if(btn.dataset.action){actions[btn.dataset.action]?.();return}
    if(btn.dataset.go){close(false);world.walkTo(btn.dataset.go);return}
    if(btn.dataset.chore){if(btn.dataset.chore==="play")chase();else complete(btn.dataset.chore);return}
    if(btn.dataset.buy){
      const id=btn.dataset.buy,res=life.buy(id);
      if(!res.ok){shop(res.message);return}
      close();refresh();audio.cue("buy");world.celebrate("buy");say("Mere",res.message,5900);
    }
  });
  document.querySelectorAll("[data-view]").forEach(btn=>btn.addEventListener("click",()=>{const target=btn.dataset.view;if(target==="play")close();else actions[target]()}));
  el("sound").addEventListener("click",async()=>{
    const button=el("sound");button.disabled=true;
    try{
      const enabled=await audio.setEnabled(!audio.enabled);
      button.querySelector("span").textContent=enabled?"Sound on":"Sound off";button.setAttribute("aria-pressed",String(enabled));
      button.setAttribute("aria-label",enabled?"Mute lo-fi music":"Turn on lo-fi music");
    }finally{button.disabled=false}
  });
  el("talk").addEventListener("click",()=>world.interact());
  el("a-key").addEventListener("click",pressA);el("b-key").addEventListener("click",back);
  el("quick-shop").addEventListener("click",()=>shop());el("quick-journal").addEventListener("click",journal);el("help").addEventListener("click",help);
  function menuDirection(dir){
    const options=[...panel.querySelectorAll("button:not(:disabled)")];
    const from=options.indexOf(document.activeElement),d=["up","left"].includes(dir)?-1:1;
    options[(from+d+options.length)%options.length]?.focus();
  }
  document.querySelectorAll("[data-dir]").forEach(btn=>{
    const dir=btn.dataset.dir;
    btn.addEventListener("pointerdown",ev=>{ev.preventDefault();btn.setPointerCapture(ev.pointerId);btn.classList.add("held");if(page)menuDirection(dir);else world.hold(dir,true)});
    const end=()=>{btn.classList.remove("held");world.hold(dir,false)};
    btn.addEventListener("pointerup",end);btn.addEventListener("lostpointercapture",end);
    btn.addEventListener("click",ev=>{if(ev.detail===0){if(page)menuDirection(dir);else{world.hold(dir,true);setTimeout(()=>world.hold(dir,false),140)}}});
  });
  window.addEventListener("keydown",ev=>{
    if(ev.metaKey||ev.ctrlKey||ev.altKey)return;
    const key=ev.key.toLowerCase(),dir=directions[key];
    if(page&&key==="tab"){
      const options=[...panel.querySelectorAll("button:not(:disabled)")];
      if(!options.length)return;const first=options[0],last=options.at(-1);
      if(ev.shiftKey&&(document.activeElement===first||document.activeElement===panel)){ev.preventDefault();last.focus()}
      else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus()}
      return;
    }
    if(dir){ev.preventDefault();if(page){if(!ev.repeat)menuDirection(dir)}else{world.hold(dir,true);document.querySelector('[data-dir="'+dir+'"]').classList.add("held")}return}
    if(key===" "&&document.activeElement?.tagName==="BUTTON")return;
    if(["e"," ","j","escape","b"].includes(key)){
      ev.preventDefault();if(ev.repeat)return;
      if(key==="e"||key===" "){controllerFlash("a-key");pressA()}
      else if(key==="j"){if(page==="journal")close();else journal()}
      else{controllerFlash("b-key");if(page||key==="b")back()}
    }
  });
  function release(){world.release();document.querySelectorAll(".held").forEach(b=>b.classList.remove("held"))}
  window.addEventListener("keyup",ev=>{const dir=directions[ev.key.toLowerCase()];if(dir){world.hold(dir,false);document.querySelector('[data-dir="'+dir+'"]').classList.remove("held")}});
  window.addEventListener("blur",release);
  document.addEventListener("visibilitychange",()=>{if(document.hidden){release();world.save()}});
  world.start(map,{near:context,visit});refresh();
})();
