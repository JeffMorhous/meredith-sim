(() => {
  "use strict";
  const el=id=>document.getElementById(id);
  const life=window.CozyLife, world=window.CozyWorld, audio=window.CozyAudio;
  const orchard=window.CozyOrchard, home=window.CozyCottage;
  const {icon}=window.PocketIcons;
  const panel=el("panel"),overlay=el("overlay"),map=el("map");
  const directions={arrowup:"up",w:"up",arrowdown:"down",s:"down",arrowleft:"left",a:"left",arrowright:"right",d:"right"};
  const places={
    ...orchard.places,
    ...home.places,
    bear:{name:"Bear",line:"Mrrp! Bear gives your hand a little nudge. It must be breakfast time."},
    cottage:{name:"Mere’s cottage",line:"The door is open. Step inside to decorate or settle in for the night."},
    "orchard-gate":{name:"Orchard trail",line:"Beyond the sign, the trail winds through apple trees. Follow it into the orchard."},
    mailbox:{name:"The mailbox",line:"The little red flag is up. There might be something inside."},
    garden:{name:"Flower garden",line:"The tulips lean into the sun. Their soil could use a little water."},
    shop:{name:"Meadow market",line:"A ribbon flutters on the market stall. Bear has excellent taste."},
    pond:{name:"Lily pond",line:"Something makes a tiny splash between the lily pads."}
  };
  const destinations={
    meadow:{name:"Mere’s Meadow",background:"meadow.webp",detail:"Garden, pond & market",line:"The meadow path is warm in the sun."},
    orchard:{...orchard.scene,detail:"Apple picking & birdsong",line:"The trees are heavy with apples. A little chorus carries over from the roost."},
    interior:{...home.scene,detail:"Decorating, quiet moments & rest",line:"Welcome home. There’s a place for Bear, and a little room to make your own."}
  };
  const assetUrl=path=>"assets/"+path;
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
    hint.setAttribute("aria-label",id?"Interact with "+places[id].name:"Choose a place to explore");
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
    else say("Mere",destinations[world.sceneId]?.line||destinations.meadow.line);
  }
  function sceneChanged(id){
    const destination=destinations[id];
    el("place-name").textContent=destination.name;
    el("season").textContent=id==="interior"?"Home":"Spring";
    el("room-tools").hidden=id!=="interior";
    map.setAttribute("aria-label",destination.name+". Walk with arrows or WASD. Walk through doorways and trail exits to travel. Tap a landmark or press E nearby to interact.");
  }
  function navigate(id,spawn){
    close(false);
    world.travel(id,spawn);
    refresh();
    say("Mere",destinations[id].line,1800);
    map.focus({preventScroll:true});
  }
  function travelMenu(){
    const rows=Object.entries(destinations).map(([id,destination])=>{
      const current=id===world.sceneId;
      return '<button class="destination" data-travel="'+id+'" '+(current?'disabled':'')+'><img alt="" src="'+assetUrl(destination.background)+'"><span><strong>'+esc(destination.name)+'</strong><small>'+esc(destination.detail)+'</small></span>'+(current?'<b>Here</b>':'')+'</button>';
    }).join("");
    shell("places","Places",'<p class="note">Choose where Mere and Bear will go.</p><div class="destinations">'+rows+'</div>');
  }
  function goToSpot(id){
    close(false);
    const destination=Object.hasOwn(orchard.scene.spots,id)?"orchard":Object.hasOwn(home.scene.spots,id)?"interior":"meadow";
    if(id!=="bear"&&world.sceneId!==destination) navigate(destination);
    world.walkTo(id);
  }
  let newestPiece=null;
  function decorate(initialItemId){
    if(world.sceneId!=="interior")return;
    home.open({panel,shell,life,world,close,initialItemId,shop:()=>shop("","furniture"),onChange:refresh});
  }
  function decorateAtHome(){
    if(world.sceneId!=="interior")navigate("interior");
    decorate(newestPiece);
  }
  function refresh(){
    const state=s();el("score").textContent=state.points;el("day").textContent="Day "+state.day;world.sync();
    document.querySelectorAll("[data-view]").forEach(b=>{
      const view=["letter","adventure"].includes(page)?"journal":page==="unpacked"?"shop":page;
      const active=b.dataset.view==="play"?!["journal","shop","places"].includes(view):b.dataset.view===view;
      b.classList.toggle("current",active);
      if(active)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");
    });
  }
  function shell(id,title,body){
    if(page?.startsWith("orchard-game-")&&page!==id)orchard.stop();
    if(page==="chase"&&id!=="chase"){clearTimeout(chaseTimer);chaseLock=false}
    if(overlay.hidden)returnFocus=document.activeElement;
    page=id;world.pause(true);overlay.hidden=false;
    panel.innerHTML='<div class="panel-heading"><h2 id="panel-title">'+title+'</h2><button class="x" data-action="close" aria-label="Close">'+icon("close")+'</button></div>'+body;
    panel.dataset.page=id;
    panel.scrollTop=0;panel.focus({preventScroll:true});refresh();
  }
  function close(focus=true){
    if(page?.startsWith("orchard-game-"))orchard.stop();
    clearTimeout(chaseTimer);chaseLock=false;
    if(overlay.hidden)return;
    page=null;overlay.hidden=true;panel.replaceChildren();world.pause(false);refresh();
    if(focus)(returnFocus&&returnFocus!==document.body&&returnFocus.isConnected?returnFocus:map).focus({preventScroll:true});
  }
  function journalTabs(active){
    return '<div class="shelves" role="group" aria-label="Journal sections">'+[["journal","Daily errands"],["adventure","Adventure"]].map(([id,title])=>'<button data-action="'+id+'" aria-pressed="'+(id===active)+'">'+title+'</button>').join("")+'</div>';
  }
  function adventureJournal(){
    const st=s(),story=orchard.adventure,stage=story.stages[st.bellStage];
    const log=story.stages.slice(0,st.bellStage).map(entry=>'<li>'+esc(entry.outcome)+'</li>').join("");
    const current=stage
      ? '<p class="note">'+esc(st.bellStage?story.stages[st.bellStage-1].outcome:stage.description)+'</p><button class="small-action" data-go="'+stage.spot+'">Walk to '+esc(places[stage.spot].name.replace(/^The /,"the "))+'</button>'
      : '<p class="note">The little bell is back at the roost. You can see it whenever you visit.</p>';
    shell("adventure","Mere’s journal",journalTabs("adventure")+'<div class="story-summary"><img alt="" src="'+assetUrl(orchard.scene.background)+'"><div><h3>'+esc(story.title)+'</h3><small>'+st.bellStage+' / '+story.stages.length+' clues · '+story.reward+' cozy pts</small></div></div>'+current+(log?'<ol class="clue-log">'+log+'</ol>':''));
  }
  function journal(){
    const st=s();
    const rows=life.chores.map(c=>{
      const done=st.completed.includes(c.id);
      const name=places[c.location].name;
      return '<button class="menu-row" data-go="'+c.location+'" '+(done?'disabled':'')+'><span class="mark">'+(done?icon("check"):"")+'</span><span class="desc"><strong>'+c.label+'</strong></span>'+(done?'<small>Done</small>':price(reward(c)))+'<span class="sr-only">'+esc(name)+'</span></button>';
    }).join("");
    const m=st.milestone;
    shell("journal","Mere’s journal",journalTabs("journal")+'<p class="note">Day '+st.day+' · '+st.completed.length+' of '+life.chores.length+' cozy things done. Choose one to walk there.</p><div class="row-list">'+rows+'</div><div class="goal"><div class="section-line"><strong class="goal-title">'+(m.reached?"A letter for Meredith":"Sealed letter")+'</strong>'+(m.reached?'<button class="small-action" data-action="letter">Open</button>':'<small>'+st.totalPoints+' / '+m.target+' pts</small>')+'</div>'+(m.reached?'':'<p class="hint-line">A keepsake opens at '+m.target+' lifetime cozy points.</p><progress max="'+m.target+'" value="'+st.totalPoints+'"></progress>')+'</div>');
  }
  let marketShelf="garden";
  function shop(feedback="",shelf=marketShelf){
    marketShelf=shelf;
    const st=s();
    const isFurniture=it=>it.category==="furniture"||it.id==="flower-box";
    const stock=life.items.filter(it=>shelf==="furniture"?isFurniture(it):it.category!=="furniture");
    if(shelf==="furniture")stock.sort((a,b)=>a.cost-b.cost);
    const rows=stock.map(it=>{
      const owned=st.owned.includes(it.id);
      const preview=shelf==="furniture"?'<canvas class="shop-sprite" width="46" height="32" data-preview="'+it.id+'" aria-hidden="true"></canvas>':'';
      return '<button class="menu-row" data-buy="'+it.id+'" '+(owned?'disabled':'')+'>'+preview+'<span class="desc"><strong>'+it.label+'</strong><small>'+it.description+'</small></span>'+(owned?'<small>Owned</small>':price(it.cost))+'</button>';
    }).join("");
    const shelves=[["garden","Garden & Bear"],["furniture","Furnishings"]].map(([id,label])=>'<button data-shelf="'+id+'" aria-pressed="'+(id===shelf)+'">'+label+'</button>').join("");
    shell("shop","Meadow market",'<div class="section-line"><p class="note">In Mere’s purse</p>'+price(st.points)+'</div><div class="shelves" role="group" aria-label="Market shelves">'+shelves+'</div><div class="row-list">'+rows+'</div><p class="hint-line" role="status">'+esc(feedback||(shelf==="furniture"?"Choose a furnishing, then place it inside the cottage.":"Choose a treat to bring home."))+'</p>');
    for(const canvas of panel.querySelectorAll("[data-preview]"))home.drawIcon(canvas,canvas.dataset.preview);
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
    if(chores.length&&chores.every(c=>st.completed.includes(c.id)))description=id==="bear"?"Bear is fed, loved, and thoroughly played with today.":"Mere has already visited today. Tomorrow will bring something new.";
    const clue=orchard.adventure.stages[st.bellStage];
    const story=clue?.spot===id?'<div class="clue"><strong>'+esc(orchard.adventure.title)+'</strong><p class="note">'+esc(clue.description)+'</p><button class="small-action" data-clue="'+st.bellStage+'">'+esc(clue.action)+'</button></div>':'';
    shell(id,places[id].name,story+'<p class="note">'+description+'</p><div class="row-list">'+rows+'</div>');
  }
  function bedtime(){
    const st=s();
    shell("bed","A good night’s rest",'<p class="note">The quilt is turned down. Bear has already picked a warm spot.</p><p class="hint-line">'+(st.completed.length?'You’ve finished '+st.completed.length+' of '+life.chores.length+' errands today. ':'')+'Rest to begin day '+(st.day+1)+'. Your cozy points and furnishings carry over.</p><button class="small-action" data-action="rest">Rest until morning</button>');
  }
  const cottageMoments = {
    "home-reading": {
      title: "A chapter with Bear",
      beats: [
        {line: "Mere opens her book in the lamplight. Bear climbs into her lap and sets one paw on the page.", action: "Read aloud"},
        {line: "“The mouse kept a lighthouse in a walnut shell.” At the word mouse, Bear leans in so close that her whiskers brush the paper.", action: "Turn the page"},
        {line: "By the time the little lighthouse shines, Bear is asleep. Mere keeps a thumb in the book and lets Bear finish her dream."}
      ]
    },
    "home-birds": {
      title: "Birds at the window",
      beats: [
        {line: "Bear settles into her basket. On the other side of the glass, a robin lands on the sill with a blade of grass in its beak.", action: "Listen with Bear"},
        {line: "The robin tips its head. “Ek-ek-ek,” says Bear. One small chirp comes back through the glass.", action: "See where it goes", cue: "robin"},
        {line: "The robin carries its grass toward the apple trees. Bear watches it go, one paw still resting on the sill."}
      ]
    }
  };
  function showMomentBeat(id, step){
    const beat = cottageMoments[id].beats[step];
    const button = panel.querySelector(".moment-action");
    panel.querySelector(".moment-line").textContent = beat.line;
    button.textContent = beat.action || "Back to the cottage";
    if (beat.action) button.dataset.momentNext = String(step + 1);
    else {
      delete button.dataset.momentNext;
      button.dataset.action = "close";
    }
    window.CottageMoments.draw(panel.querySelector("[data-moment-art]"), id, step);
    if (beat.cue) audio.cue(beat.cue);
  }
  function cottageMoment(id){
    if (world.sceneId !== "interior" || !home.activitySpots(s())[id]) return;
    shell(id, cottageMoments[id].title,
      '<canvas class="moment-art" data-moment-art width="320" height="128" aria-hidden="true"></canvas>' +
      '<p class="moment-line" aria-live="polite" aria-atomic="true"></p>' +
      '<button type="button" class="small-action moment-action"></button>');
    showMomentBeat(id, 0);
  }
  function help(){
    shell("help","How to play",'<dl class="help-list"><dt>Walk</dt><dd>Use WASD, the arrow keys, the directional pad, or tap the ground.</dd><dt>Interact</dt><dd>Tap a landmark, or press E, Space, or the gold A button nearby.</dd><dt>Explore</dt><dd>Walk up the cottage steps to go inside, or down across the doormat to leave. Follow the south trail past the sign to walk between the meadow and orchard.</dd><dt>Journal</dt><dd>Press J for today’s errands. Choose one to walk there.</dd><dt>Decorate</dt><dd>Buy something from the Furnishings shelf. Inside the cottage, choose Decorate to place, move, or store it. Put Bear’s bed at the window to watch birds together, or set the reading chair near the amber lamp to share a chapter.</dd><dt>Rest</dt><dd>Visit the bed to begin another day. Progress saves in this browser.</dd><dt>Music</dt><dd>Turn on the music button for Mere’s lo-fi soundtrack.</dd></dl><button class="small-action" data-action="close">Back to the game</button>');
  }
  function visit(id){
    audio.cue("interaction");
    if(!id){travelMenu();return}
    if(id==="shop")shop();
    else if(id==="cottage")navigate("interior");
    else if(id==="orchard-gate")navigate("orchard");
    else if(id==="orchard-exit")navigate("meadow",{x:477,y:357});
    else if(id==="home-exit")navigate("meadow",{x:239,y:243});
    else if(id==="bed")bedtime();
    else if(id==="decorate")decorate();
    else if(Object.hasOwn(cottageMoments,id))cottageMoment(id);
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
  const actions={close,journal,shop,letter,rest,pounce,adventure:adventureJournal,places:travelMenu,"decorate-home":decorateAtHome};
  panel.addEventListener("click",ev=>{
    const btn=ev.target.closest("button");if(!btn||btn.disabled)return;
    if(btn.dataset.action){actions[btn.dataset.action]?.();return}
    if(btn.hasAttribute("data-moment-next")){showMomentBeat(page,Number(btn.dataset.momentNext));return}
    if(btn.dataset.travel){navigate(btn.dataset.travel);return}
    if(btn.dataset.shelf){shop("",btn.dataset.shelf);return}
    if(btn.hasAttribute("data-clue")){
      const result=life.followBellClue(Number(btn.dataset.clue),page);
      close();refresh();say("Mere",result.message,6300);
      if(result.reward){audio.cue("points");world.celebrate("bell");pulse("+"+result.reward+" cozy pts")}
      else if(result.ok)audio.cue("interaction");
      return;
    }
    if(btn.dataset.go){goToSpot(btn.dataset.go);return}
    if(btn.dataset.chore){
      const id=btn.dataset.chore;
      if(id==="play")chase();
      else if(!orchard.start(id,{panel,shell,complete,audio}))complete(id);
      return;
    }
    if(btn.dataset.buy){
      const id=btn.dataset.buy,res=life.buy(id);
      if(!res.ok){shop(res.message);return}
      audio.cue("buy");
      const item=life.items.find(entry=>entry.id===id);
      if(item.category==="furniture"||id==="flower-box"){
        newestPiece=id;
        const hint = home.purchaseHint(id, s().decor);
        shell("unpacked",item.label,'<p class="note">'+esc(res.message)+'</p>' +
          (hint ? '<p class="note">'+esc(hint)+'</p>' : '') +
          '<div class="purchase-actions"><button class="small-action" data-action="decorate-home">Decorate at home</button><button class="small-action" data-action="shop">Keep shopping</button></div>');
      }else{
        close();refresh();world.celebrate("buy");say("Mere",res.message,5900);
      }
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
  el("room-tools").addEventListener("click",()=>decorate());
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
    if(dir){
      ev.preventDefault();
      // Movement stays held until keyup. A repeat must not restart it after a map change.
      if(ev.repeat)return;
      if(page)menuDirection(dir);
      else{world.hold(dir,true);document.querySelector('[data-dir="'+dir+'"]').classList.add("held")}
      return;
    }
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
  world.start(map,{near:context,visit,scene:sceneChanged});refresh();
})();
