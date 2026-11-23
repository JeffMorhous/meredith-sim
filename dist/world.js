(() => {
  "use strict";

  const width = 1000, height = 409, cell = 7;
  const bearGap = 40;
  const sunroomArea = [[1,193],[96,193],[96,231],[1,231]];
  const rocks = [[350,319,21,13],[541,371,24,12]];
  const meadow = {
    id: "meadow",
    name: "Mere’s Meadow",
    background: "meadow.webp",
    spawn: { x: 492, y: 267 },
    bearSpawn: { x: 548, y: 264 },
    morningSpawn: { x: 241, y: 238 },
    spots: {
      cottage: { x: 239, y: 234, area: [81, 39, 326, 221] },
      mailbox: { x: 342, y: 234, area: [319, 172, 360, 226] },
      garden: { x: 249, y: 301, area: [12, 251, 240, 357] },
      shop: { x: 651, y: 179, area: [573, 49, 745, 164] },
      pond: { x: 783, y: 274, area: [752, 174, 986, 279] },
      "orchard-gate": { x: 477, y: 376, area: [450, 341, 551, 405] }
    },
    boundary: [[10,226],[74,220],[104,235],[204,232],[217,213],[265,215],[270,229],[322,226],[323,220],[355,225],[363,186],[394,184],[424,164],[453,172],[462,144],[518,144],[562,160],[602,176],[635,155],[684,161],[715,164],[761,134],[806,131],[825,159],[905,159],[970,167],[991,208],[985,272],[958,287],[937,320],[900,335],[866,314],[827,317],[790,341],[759,358],[727,340],[690,382],[646,402],[205,402],[123,375],[74,346],[12,310]],
    obstacles: [
      [[770,202],[793,179],[837,168],[897,169],[938,183],[972,199],[979,233],[959,248],[931,257],[880,276],[837,281],[806,272],[768,252],[749,238],[744,217]],
      [[4,244],[119,247],[159,271],[159,300],[243,311],[259,323],[265,361],[106,371],[9,320]],
      [[514,370],[523,370],[523,380],[514,380]]
    ],
    isBlocked(x, y, state) {
      return (state.owned.includes("sunroom") && pointIn(x, y, sunroomArea))
        || rocks.some(([cx,cy,rx,ry]) => ((x-cx)/rx)**2 + ((y-cy)/ry)**2 < 1);
    }
  };
  const scenes = new Map([[meadow.id, meadow]]);
  const images = new Map();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const keys = new Set();
  const pal = { shadow: "#43361b55", cream: "#fff3cc", dark: "#3e4934", pink: "#dc8790" };
  const steps = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  let state, player, bear, listeners, canvas, ctx;
  let verticalCamera = null;
  let scene = meadow, route = [], destination = null, visit = null, paused = false;
  let moving = false, face = 1, lastTime = null, lastNear, lastSaved = 0, elapsed = 0;
  let trail = [], bearRoute = [], nextBearRoute = 0, bearSpeed = 0;
  let bearMoving = false, bearFace = 1, bearHorizontal = 0, bearMotion = 0, bearStride = 1;
  let celebration = null, arrivalTime = 0;

  const dist = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);
  const clamp = (v,lo,hi) => Math.min(hi, Math.max(lo,v));
  const point = (x,y) => ({ x, y });
  const interpolate = (a,b,t) => point(a.x + (b.x-a.x)*t, a.y + (b.y-a.y)*t);
  const fed = () => state.completed.includes("breakfast");

  function getImage(path) {
    if (!images.has(path)) {
      const img = new Image();
      img.src = "assets/"+path;
      images.set(path, img);
    }
    return images.get(path);
  }

  function pointIn(x,y,poly) {
    let inside = false;
    for (let i=0,j=poly.length-1; i<poly.length; j=i++) {
      const [ax,ay] = poly[i], [bx,by] = poly[j];
      if ((ay>y)!==(by>y) && x<(bx-ax)*(y-ay)/(by-ay)+ax) inside = !inside;
    }
    return inside;
  }

  function clear(x,y) {
    return pointIn(x,y,scene.boundary)
      && !scene.obstacles?.some(polygon => pointIn(x,y,polygon))
      && !scene.isBlocked?.(x,y,state);
  }

  function segmentClear(from,to) {
    const count = Math.max(1, Math.ceil(dist(from,to)/(cell/2)));
    for (let index=1; index<=count; index++) {
      const t = index/count;
      if (!clear(from.x + (to.x-from.x)*t, from.y + (to.y-from.y)*t)) return false;
    }
    return true;
  }

  function closest(x,y,from) {
    let winner = null, min = Infinity;
    for (let radius=0; radius<=11; radius++) {
      for (let j=-radius; j<=radius; j++) for (let i=-radius; i<=radius; i++) {
        if (radius && Math.abs(j)!==radius && Math.abs(i)!==radius) continue;
        const grid = point((Math.round(x/cell)+i)*cell, (Math.round(y/cell)+j)*cell);
        const distance = Math.hypot(grid.x-x,grid.y-y);
        if (distance>=min || !clear(grid.x,grid.y) || (from && !segmentClear(from,grid))) continue;
        min = distance;
        winner = grid;
      }
      if (winner && min<(radius+.3)*cell) return winner;
    }
    return winner;
  }

  // Route around scene obstacles, then remove waypoints along clear sight lines.
  function findRoute(from,to) {
    if (segmentClear(from,to)) return [to];
    const start = closest(from.x,from.y,from);
    const end = closest(to.x,to.y,clear(to.x,to.y) ? to : null);
    if (!start || !end) return [];
    const stride = Math.ceil(width/cell)+1;
    const key = (x,y) => y*stride+x;
    const first = key(start.x/cell,start.y/cell), last = key(end.x/cell,end.y/cell);
    const queue = [first], parents = new Map([[first,null]]), passable = new Map();
    function clearCell(x,y) {
      const id = key(x,y);
      if (x<0 || x>=stride || y<0 || y*cell>=height) return false;
      if (!passable.has(id)) passable.set(id,clear(x*cell,y*cell));
      return passable.get(id);
    }
    for (let cursor=0; cursor<queue.length && !parents.has(last); cursor++) {
      const id = queue[cursor], gx = id%stride, gy = Math.floor(id/stride);
      for (const [dx,dy] of steps) {
        const nx = gx+dx, ny = gy+dy, next = key(nx,ny);
        if (parents.has(next) || !clearCell(nx,ny)) continue;
        if (dx && dy && (!clearCell(nx,gy) || !clearCell(gx,ny))) continue;
        if (!segmentClear(point(gx*cell,gy*cell),point(nx*cell,ny*cell))) continue;
        parents.set(next,id);
        queue.push(next);
      }
    }
    if (!parents.has(last)) return [];
    const path = [];
    for (let id=last; id!==null; id=parents.get(id)) path.push(point((id%stride)*cell, Math.floor(id/stride)*cell));
    path.reverse();
    if (clear(to.x,to.y) && segmentClear(end,to)) path.push(to);
    const smoothed = [];
    let anchor = from;
    for (let index=0; index<path.length;) {
      let next = index+1;
      while (next<path.length && segmentClear(anchor,path[next])) next++;
      anchor = path[next-1];
      smoothed.push(anchor);
      index = next;
    }
    return smoothed;
  }

  function advance(position,path,budget) {
    let traveled = 0;
    while (path.length && budget>0) {
      const target = path[0];
      const distance = dist(position,target), step = Math.min(distance,budget);
      const next = step===distance ? target : interpolate(position,target,step/distance);
      if (!segmentClear(position,next)) break;
      position.x = next.x;
      position.y = next.y;
      budget -= step;
      traveled += step;
      if (step===distance) path.shift();
    }
    return traveled;
  }

  function spot(id) { return id==="bear" ? bear : scene.spots[id]; }

  function nearby() {
    let id = null, best = 42;
    for (const [name, landmark] of Object.entries(scene.spots)) {
      if (name==="bear") continue;
      const distance = dist(player, landmark);
      if (distance<best) { id = name; best = distance; }
    }
    return id || (dist(player,bear)<75 ? "bear" : null);
  }

  function updateNear(force=false) {
    const id = nearby();
    if (force || id!==lastNear) {
      lastNear = id;
      listeners.near(id);
    }
  }

  function approaches(id) {
    if (id==="bear") {
      const sign = player.x<=bear.x ? -1 : 1;
      for (const [dx,dy] of [[31*sign,7],[-31*sign,7],[0,24],[0,-24]]) {
        if (clear(bear.x+dx,bear.y+dy)) return point(bear.x+dx,bear.y+dy);
      }
    }
    return spot(id);
  }

  function stopWalking() {
    route = [];
    destination = null;
    visit = null;
  }

  function walk(to,id=null) {
    const path = findRoute(player,to);
    if (!path.length) return;
    route = path;
    destination = route.at(-1);
    visit = id;
    keys.clear();
    arrivalTime = elapsed;
  }

  function walkTo(id) {
    if (paused || !spot(id)) return;
    const to = approaches(id);
    if (dist(player,to)<8) {
      stopWalking();
      listeners.visit(id);
      return;
    }
    walk(to,id);
  }

  function save() {
    if (!player) return;
    const rounded = point(Math.round(player.x), Math.round(player.y));
    const position = clear(rounded.x,rounded.y) ? rounded : player;
    window.CozyLife.savePosition(position.x,position.y,scene.id);
  }

  function viewport() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(rect.width,1)/Math.max(rect.height,1);
    const spanX = Math.min(width,height*ratio), spanY = Math.min(height,width/ratio);
    const targetY = clamp(player.y-spanY/2,0,height-spanY);
    return {
      rect, spanX, spanY, targetY,
      cameraX: clamp(player.x-spanX/2,0,width-spanX),
      cameraY: clamp(verticalCamera ?? targetY,0,height-spanY)
    };
  }

  function click(ev) {
    if (paused) return;
    const view = viewport();
    const x = view.cameraX+(ev.clientX-view.rect.left)/Math.max(view.rect.width,1)*view.spanX;
    const y = view.cameraY+(ev.clientY-view.rect.top)/Math.max(view.rect.height,1)*view.spanY;
    if (x<0 || x>=width || y<0 || y>=height) return;
    canvas.focus({preventScroll:true});
    let target = null;
    for (const [id,s] of Object.entries(scene.spots)) {
      const a = s.area;
      if (id!=="bear" && a && x>=a[0] && x<=a[2] && y>=a[1] && y<=a[3]) {
        target = id;
        break;
      }
    }
    const bearHit = Math.abs(x-bear.x)<(bearMoving ? 19 : 11)
      && y>=bear.y-(bearMoving ? 27 : 39) && y<=bear.y+3;
    if (bearHit && (!target || dist(point(x,y),spot(target))>24)) target = "bear";
    if (target && dist(player,spot(target))<(target==="bear" ? 75 : 42)) {
      stopWalking();
      listeners.visit(target);
    } else if (target) walkTo(target);
    else walk(point(x,y));
  }

  function addTrail(position) {
    const last = trail.at(-1);
    const distance = dist(last,position);
    if (distance>.001) trail.push({ ...position, distance: last.distance+distance });
    const cutoff = trail.at(-1).distance-bearGap;
    while (trail.length>2 && trail[1].distance<=cutoff) trail.shift();
  }

  function resetFollow() {
    trail = [{ ...bear, distance: 0 }];
    const path = fed() ? findRoute(bear,player) : [player];
    for (const position of path.length ? path : [player]) addTrail(position);
    bearRoute = [];
    nextBearRoute = 0;
    bearSpeed = 0;
    bearMoving = false;
    bearHorizontal = 0;
    bearMotion = 0;
    bearStride = 1;
  }

  function trailTarget() {
    const targetDistance = trail.at(-1).distance-bearGap;
    const [first,second] = trail;
    if (!second || targetDistance<=first.distance) return first;
    return interpolate(first,second,clamp((targetDistance-first.distance)/(second.distance-first.distance),0,1));
  }

  function animateBear(dx,traveled,dt) {
    const blend = 1-Math.exp(-dt*13);
    bearHorizontal += (dx/dt-bearHorizontal)*blend;
    bearMotion += (traveled/dt-bearMotion)*blend;
    if (Math.abs(bearHorizontal)>19) bearFace = Math.sign(bearHorizontal);
    bearMoving = bearMotion>(bearMoving ? 8 : 22);
    if (bearMoving) bearStride += traveled/11;
    else bearStride = 1;
  }

  function updateBear(dt) {
    if (!fed() || !dt) return;
    if (visit==="bear") {
      bearSpeed = 0;
      animateBear(0,0,dt);
      return;
    }
    const target = trailTarget();
    if (segmentClear(bear,target)) bearRoute = [target];
    else if (elapsed>=nextBearRoute) {
      bearRoute = findRoute(bear,target);
      nextBearRoute = elapsed+.14;
    }
    const remaining = bearRoute.length===1 ? dist(bear,bearRoute[0])
      : bearRoute.reduce((sum,step,index) => sum+dist(index ? bearRoute[index-1] : bear,step),0);
    const speed = Math.min(151, Math.max(0,remaining-.6)*8);
    bearSpeed += (speed-bearSpeed)*(1-Math.exp(-dt*14));
    const beforeX = bear.x;
    const traveled = advance(bear,bearRoute,Math.min(bearSpeed*dt,Math.max(0,remaining-.6)));
    animateBear(bear.x-beforeX,traveled,dt);
  }

  function move(dt) {
    const dx = Number(keys.has("right"))-Number(keys.has("left"));
    const dy = Number(keys.has("down"))-Number(keys.has("up"));
    const before = { ...player };
    if (dx || dy) {
      stopWalking();
      const step = dt*111/Math.hypot(dx,dy);
      const horizontal = point(player.x+dx*step,player.y);
      if (segmentClear(player,horizontal)) player.x = horizontal.x;
      const vertical = point(player.x,player.y+dy*step);
      if (segmentClear(player,vertical)) player.y = vertical.y;
    } else if (route.length) advance(player,route,dt*129);
    const isMoving = dist(before,player)>.001;
    if (Math.abs(player.x-before.x)>.05) face = player.x>before.x ? 1 : -1;
    if (isMoving && fed() && visit!=="bear") addTrail(player);
    if (moving && !isMoving) save();
    moving = isMoving;
    if (moving && elapsed-lastSaved>2) { save(); lastSaved = elapsed; }
    updateBear(dt);
    updateNear();
    if (!route.length && destination) {
      const id = visit;
      stopWalking();
      if (id==="bear") resetFollow();
      save();
      if (id) listeners.visit(id);
    }
  }

  function rect(x,y,w,h,color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x),Math.round(y),w,h);
  }

  function pixelHeart(x,y,s,color) {
    ["0110110","1111111","1111111","0111110","0011100","0001000"].forEach((row,j) => {
      [...row].forEach((value,i) => { if (value==="1") rect(x+i*s,y+j*s,s,s,color); });
    });
  }

  function sprite(name,pos,h,row,frames,t) {
    const img = getImage(name);
    if (!img.complete || !img.naturalWidth) return;
    const w = h*96/104, x = Math.round(pos.x), y = Math.round(pos.y);
    ctx.fillStyle = pal.shadow;
    ctx.beginPath();
    ctx.ellipse(x,y-1,h*.20,h*.045,0,0,Math.PI*2);
    ctx.fill();
    let frame = Math.floor(t)%frames;
    if (row===0) {
      const cycle = Math.floor(t)%29;
      frame = reduced.matches ? 0 : cycle<4 ? cycle : cycle<8 ? 7-cycle : 0;
    }
    // The first four Bear frames make a complete stride. Keep its ground contact
    // at the same baseline, with a small lift when all four paws are airborne.
    const baseline = name==="pets/bear-atlas.webp" && (row===1 || row===2)
      ? [97,99,98,97][frame] : 101;
    ctx.drawImage(img,frame*96,row*104,96,104,Math.round(x-w/2),Math.round(y-h*baseline/104),Math.round(w),Math.round(h));
  }

  function marker(x,y) {
    const bob = reduced.matches ? 0 : Math.round(Math.sin(elapsed*3)*1.2);
    y += bob;
    rect(x-10,y,20,16,pal.dark);rect(x-12,y+3,24,10,pal.dark);rect(x-1,y+15,6,4,pal.dark);rect(x+1,y+19,2,2,pal.dark);
    rect(x-9,y+2,18,12,pal.cream);rect(x-10,y+4,20,8,pal.cream);rect(x,y+14,4,3,pal.cream);
    pixelHeart(x-4,y+4,1.4,"#bc6b78");
  }

  function flower(x,y,c) {
    rect(x+1,y+2,1,4,"#435e37");rect(x,y-2,3,5,c);rect(x-1,y,5,2,c);rect(x+1,y,1,1,"#f6ca5b");
  }

  function trailSign() {
    rect(512,375,11,3,"#48523255");
    rect(516,349,5,29,"#63462d");rect(517,350,2,27,"#b68049");
    rect(493,342,51,16,"#54412a");rect(495,341,47,18,"#54412a");
    rect(495,343,47,13,"#dca565");rect(496,344,45,2,"#edc487");rect(495,356,47,2,"#ad7448");
    ctx.fillStyle = "#4d3627";
    ctx.font = "bold 8px monospace";
    ctx.textBaseline = "middle";
    ctx.fillText("ORCHARD",498,350);
    rect(536,346,2,6,"#63462d");rect(534,350,6,2,"#63462d");rect(535,352,4,1,"#63462d");
  }

  function meadowDecor() {
    const sunroom = getImage("sunroom.png");
    if (state.owned.includes("sunroom") && sunroom.complete && sunroom.naturalWidth) ctx.drawImage(sunroom,0,162,101,77);
    if (state.owned.includes("flower-box") && !Object.values(state.decor ?? {}).includes("flower-box")) {
      rect(139,187,48,8,"#734d32");rect(137,186,52,3,"#b47648");
      for (let i=0; i<12; i++) flower(138+i*4,183-(i%3),i%2 ? "#ffe5b3" : "#dc8791");
    }
    if (state.owned.includes("cottage-lights")) {
      ctx.strokeStyle = "#675737";ctx.lineWidth = 1.8;ctx.beginPath();
      for (let i=0; i<=26; i++) { const x=95+i*8.4,y=128+Math.sin(i*Math.PI/13)*4;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y); }
      ctx.stroke();for(let i=0;i<14;i++){const x=95+i*16.8,y=128+Math.sin(i*Math.PI/6.5)*4;rect(x,y,2,5,"#6e683e");rect(x-1,y+3,5,5,"#efb65a");rect(x,y+4,3,3,"#fff2aa");}
    }
    if (fed()) {
      rect(540,267,17,4,"#544c40");rect(539,265,19,2,"#b87965");rect(542,263,13,3,"#8b5540");
    }
    if (state.owned.includes("toy")) { rect(515,280,15,2,"#786040");rect(528,278,4,2,"#c26784");rect(531,280,4,2,"#e99bac"); }
    if (scenes.has("orchard")) trailSign();
  }

  function meadowAmbient() {
    if (reduced.matches) return;
    for (const [cx,cy,phase] of [[367,283,.3],[718,178,2.6],[130,273,5.5]]) {
      const x = cx+Math.sin(elapsed*.55+phase)*11, y = cy+Math.sin(elapsed*.9+phase)*4;
      rect(x,y,2,3,"#775727");const d = Math.sin(elapsed*9+phase)>0 ? 3 : 1;rect(x-d,y-2,d,3,"#ffe8a4");rect(x+2,y-2,d,3,"#f4c76e");
    }
    for (let i=0; i<3; i++) {
      const clock = (elapsed*.29+i/3)%1;
      ctx.globalAlpha = Math.sin(clock*Math.PI)*.6;
      const x = 853+i*29, y = 230-i%2*22;
      rect(x-5*clock,y,3+clock*7,1.5,"#ceead0");
    }
    ctx.globalAlpha = 1;
  }

  function effects() {
    if (!celebration) return;
    const t = elapsed-celebration.start;
    if (t>2.2) { celebration = null; return; }
    const pos = celebration.pos;
    ctx.globalAlpha = Math.min(1,(2.2-t)*2);
    if (celebration.id==="pond" && scene===meadow) {
      for (let i=0; i<3; i++) {
        ctx.beginPath();ctx.strokeStyle="#dcf8d5";ctx.lineWidth=1.5;ctx.ellipse(843,239,4+t*8+i*3,1+t*3+i,0,0,Math.PI*2);ctx.stroke();
      }
    } else {
      for (let i=0; i<3; i++) {
        const x = pos.x-12+i*12+Math.sin(t*3+i)*3, y = pos.y-47-(reduced.matches ? 7 : t*12)-i%2*7;
        if (celebration.id==="flowers") rect(x,y+35+t*5,2,4,"#80ddeb");
        else pixelHeart(x,y,1.3,i===1 ? "#fff1b1" : "#e69795");
      }
    }
    ctx.globalAlpha = 1;
  }

  function render(dt) {
    const view = viewport();
    if (view.spanY===height) verticalCamera = null;
    else if (verticalCamera===null) verticalCamera = view.targetY;
    else {
      const eased = view.cameraY+(view.targetY-view.cameraY)*(1-Math.exp(-dt*12));
      const margin = view.spanY*.3;
      verticalCamera = clamp(eased,Math.max(0,view.targetY-margin),Math.min(height-view.spanY,view.targetY+margin));
    }
    const outputW = Math.max(1,Math.round(view.spanX)), outputH = Math.max(1,Math.round(view.spanY));
    if (canvas.width!==outputW || canvas.height!==outputH) {
      canvas.width = outputW;
      canvas.height = outputH;
    }
    const scaleX = outputW/view.spanX, scaleY = outputH/view.spanY;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle = scene.backgroundColor || "#2d4034";
    ctx.fillRect(0,0,outputW,outputH);
    ctx.setTransform(scaleX,0,0,scaleY,-view.cameraX*scaleX,-(verticalCamera ?? 0)*scaleY);
    ctx.save();
    const background = getImage(scene.background);
    ctx.imageSmoothingEnabled = true;
    if (background.complete && background.naturalWidth) ctx.drawImage(background,0,0,width,height);
    ctx.imageSmoothingEnabled = false;
    if (scene===meadow) { meadowDecor(); meadowAmbient(); }
    if (scene.draw) {
      ctx.save();
      scene.draw(ctx,state,{ floorOnly: Boolean(scene.entities), elapsed, reducedMotion: reduced.matches });
      ctx.restore();
    }
    if (destination && !reduced.matches) {
      ctx.strokeStyle = "#fff4c6";ctx.lineWidth = 1.6;ctx.beginPath();
      ctx.ellipse(destination.x,destination.y,5+Math.sin((elapsed-arrivalTime)*7),2.5,0,0,Math.PI*2);ctx.stroke();
    }
    const happy = celebration && elapsed-celebration.start<1.5;
    const entities = scene.entities?.(state) ?? [];
    const actors = [
      { y: player.y, draw: () => sprite("pets/mere-atlas.webp",player,61,moving ? (face>0 ? 1 : 2) : happy ? 3 : 0,moving ? 8 : happy ? 4 : 6,elapsed*(moving ? 9 : happy ? 6 : 5)) },
      { y: bear.y, draw: () => sprite("pets/bear-atlas.webp",bear,40,bearMoving ? (bearFace>0 ? 1 : 2) : happy ? 3 : 0,bearMoving || happy ? 4 : 6,bearMoving ? bearStride : elapsed*(happy ? 6 : 4)) }
    ];
    for (const entity of [...entities,...actors].sort((a,b) => a.y-b.y)) {
      ctx.save();
      entity.draw(ctx);
      ctx.restore();
    }
    if (!celebration && lastNear==="bear") marker(bear.x+4,bear.y-53);
    effects();
    ctx.restore();
  }

  function frame(now) {
    const dt = lastTime===null ? 0 : Math.min(.045,(now-lastTime)/1000);
    lastTime = now;
    if (!document.hidden) {
      if (!paused && dt) { elapsed += dt; move(dt); }
      render(paused ? 0 : dt);
    }
    requestAnimationFrame(frame);
  }

  function openSpot(position) {
    if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return null;
    return clear(position.x,position.y) ? { ...position } : closest(position.x,position.y);
  }

  function placeBear(bearByPlayer=false) {
    const home = scene.bearSpawn || scene.spots.bear;
    if (!bearByPlayer && !fed() && home && clear(home.x,home.y) && dist(player,home)>23) return point(home.x,home.y);
    const offsets = [[40,0],[-40,0],[0,39],[0,-39],[30,21],[-30,21],[30,-21],[-30,-21],[25,0],[-25,0]];
    const choices = offsets.map(([x,y]) => point(player.x+x,player.y+y)).filter(position => clear(position.x,position.y));
    const awayFromLandmarks = choices.find(position => Object.values(scene.spots).every(landmark => dist(position,landmark)>25));
    return awayFromLandmarks || choices[0] || { ...player };
  }

  function enter(next,position,bearByPlayer=false) {
    scene = next;
    player = openSpot(position) || openSpot(next.spawn);
    bear = placeBear(bearByPlayer);
    getImage(next.background);
    keys.clear();
    stopWalking();
    resetFollow();
    celebration = null;
    moving = false;
    face = 1;
    bearFace = 1;
    verticalCamera = null;
    lastSaved = elapsed;
    lastTime = null;
    listeners.scene?.(scene.id);
    updateNear(true);
  }

  function travel(id,position) {
    const next = scenes.get(id);
    if (!next || !canvas) return false;
    enter(next,position);
    save();
    return true;
  }

  function start(el,callbacks) {
    canvas = el; ctx = canvas.getContext("2d"); listeners = callbacks;
    state = window.CozyLife.getState();
    for (const next of [window.CozyOrchard?.scene,window.CozyCottage?.scene]) {
      if (next) { scenes.set(next.id,next); getImage(next.background); }
    }
    for (const path of ["pets/mere-atlas.webp","pets/bear-atlas.webp","sunroom.png"]) getImage(path);
    const savedScene = scenes.get(state.sceneId || meadow.id);
    enter(savedScene || meadow,savedScene ? state.position : null);
    canvas.addEventListener("pointerdown",click);
    window.addEventListener("pagehide",save);
    document.addEventListener("visibilitychange",() => { lastTime = null; });
    requestAnimationFrame(frame);
  }

  function sync() {
    const wasFed = fed();
    state = window.CozyLife.getState();
    let reset = wasFed!==fed();
    if (!clear(player.x,player.y)) {
      player = openSpot(player) || openSpot(scene.spawn);
      stopWalking();
      reset = true;
      save();
    }
    if (!clear(bear.x,bear.y)) {
      bear = openSpot(bear) || placeBear();
      reset = true;
    }
    if (reset) { resetFollow(); updateNear(true); }
    if (route.length && [player,...route.slice(0,-1)].some((start,index) => !segmentClear(start,route[index]))) {
      const target = visit ? approaches(visit) : destination;
      const id = visit;
      stopWalking();
      walk(target,id);
    }
  }

  window.CozyWorld = {
    start, walkTo, save, travel, sync,
    get sceneId() { return scene.id; },
    hold(dir,on) {
      if (on && !paused) { keys.add(dir); stopWalking(); }
      else keys.delete(dir);
    },
    release() { keys.clear(); },
    interact() { if (!paused) listeners.visit(nearby()); },
    pause(on) {
      paused = on;
      keys.clear();
      lastTime = null;
      if (on) { stopWalking(); save(); }
    },
    celebrate(id) { celebration = { id, start: elapsed, pos: { ...player } }; },
    morning() {
      state = window.CozyLife.getState();
      const home = scenes.get("interior") || meadow;
      enter(home,home.morningSpawn,true);
      save();
    }
  };
})();
