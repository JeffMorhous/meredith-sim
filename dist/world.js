(() => {
  "use strict";
  const width = 1000, height = 409, cell = 7;
  const spots = {
    bear: {x:548,y:264},
    cottage:{x:239,y:234,area:[81,39,326,221]},
    mailbox:{x:342,y:234,area:[319,172,360,226]},
    garden:{x:249,y:301,area:[12,251,240,357]},
    shop:{x:651,y:179,area:[573,49,745,164]},
    pond:{x:783,y:274,area:[752,174,986,279]}
  };
  const boundary = [[10,226],[74,220],[104,235],[204,232],[217,213],[265,215],[270,229],[322,226],[323,220],[355,225],[363,186],[394,184],[424,164],[453,172],[462,144],[518,144],[562,160],[602,176],[635,155],[684,161],[715,164],[761,134],[806,131],[825,159],[905,159],[970,167],[991,208],[985,272],[958,287],[937,320],[900,335],[866,314],[827,317],[790,341],[759,358],[727,340],[690,382],[646,402],[205,402],[123,375],[74,346],[12,310]];
  const water=[[770,202],[793,179],[837,168],[897,169],[938,183],[972,199],[979,233],[959,248],[931,257],[880,276],[837,281],[806,272],[768,252],[749,238],[744,217]];
  const flowerbed=[[4,244],[119,247],[159,271],[159,300],[243,311],[259,323],[265,361],[106,371],[9,320]];
  const sunroomArea=[[1,193],[96,193],[96,231],[1,231]];
  const colliders=[[350,319,21,13],[541,371,24,12]];
  let state, player, bear, listeners, canvas, ctx, camera=0, visibleWidth=1000;
  let keys=new Set(),route=[],destination=null,visit=null,paused=false,moving=false,face=1,lastTime=0,lastNear;
  let lastSaved=0,follow=[],bearMoving=false,bearFace=1,elapsed=0,celebration=null,arrivalTime=0;
  const imgs={};
  const reduced=matchMedia("(prefers-reduced-motion: reduce)");
  function pointIn(x,y,poly){
    let inside=false;
    for(let i=0,j=poly.length-1;i<poly.length;j=i++){
      const [ax,ay]=poly[i],[bx,by]=poly[j];
      if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
    }
    return inside;
  }
  function clear(x,y){
    return pointIn(x,y,boundary)&&!pointIn(x,y,water)&&!pointIn(x,y,flowerbed)
      &&!(state?.owned.includes("sunroom")&&pointIn(x,y,sunroomArea))
      &&!colliders.some(([cx,cy,rx,ry])=>((x-cx)/rx)**2+((y-cy)/ry)**2<1);
  }
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const xy=(x,y)=>({x,y});
  const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
  function spot(id){return id==="bear"?bear:spots[id]}
  function nearby(){
    let id=null,best=Infinity;
    for(const name of Object.keys(spots)){
      const d=dist(player,spot(name));
      if(d<best&&d<(name==="bear"?75:42)){id=name;best=d}
    }
    return id;
  }
  function approaches(id){
    if(id==="bear"){
      const sign=player.x<=bear.x?-1:1;
      for(const [dx,dy] of [[30*sign,7],[-30*sign,7],[0,20],[0,-18]])if(clear(bear.x+dx,bear.y+dy))return xy(bear.x+dx,bear.y+dy);
    }
    return spot(id);
  }
  function closest(x,y){
    let winner=null,min=Infinity;
    for(let radius=0;radius<=11;radius++){
      for(let j=-radius;j<=radius;j++)for(let i=-radius;i<=radius;i++){
        if(radius&&Math.abs(j)!==radius&&Math.abs(i)!==radius)continue;
        const gx=Math.round(x/cell)+i,gy=Math.round(y/cell)+j;
        if(!clear(gx*cell,gy*cell))continue;
        const score=Math.hypot(gx*cell-x,gy*cell-y);
        if(score<min){min=score;winner={gx,gy}}
      }
      if(winner&&min<(radius+.3)*cell)return winner;
    }
    return winner;
  }
  // Shortest route on the small meadow grid. Corner checks keep diagonal steps on land.
  function findRoute(to){
    const start=closest(player.x,player.y),end=closest(to.x,to.y);
    if(!start||!end)return [];
    const stride=150,key=(x,y)=>y*stride+x,first=key(start.gx,start.gy),last=key(end.gx,end.gy);
    const queue=[first],parents=new Map([[first,null]]);
    for(let cursor=0;cursor<queue.length&&!parents.has(last);cursor++){
      const id=queue[cursor],gx=id%stride,gy=Math.floor(id/stride);
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
        const nx=gx+dx,ny=gy+dy,ni=key(nx,ny);
        if(parents.has(ni)||!clear(nx*cell,ny*cell))continue;
        if(dx&&dy&&(!clear(nx*cell,gy*cell)||!clear(gx*cell,ny*cell)))continue;
        parents.set(ni,id);queue.push(ni);
      }
    }
    if(!parents.has(last))return [];
    const path=[];
    for(let id=last;id!==first;id=parents.get(id))path.push(xy((id%stride)*cell,Math.floor(id/stride)*cell));
    path.reverse();
    if(clear(to.x,to.y))path.push(xy(to.x,to.y));
    if(!path.length)path.push(xy(end.gx*cell,end.gy*cell));
    return path;
  }
  function updateNear(force=false){const id=nearby();if(force||id!==lastNear){lastNear=id;listeners.near(id)}}
  function walk(to,id=null){
    const path=findRoute(to);if(!path.length)return;
    route=path;destination=route.at(-1);visit=id;keys.clear();arrivalTime=elapsed;
  }
  function walkTo(id){
    if(!spots[id])return;
    const to=approaches(id);
    if(dist(player,to)<8){listeners.visit(id);return}
    walk(to,id);
  }
  function save(){if(player)window.CozyLife.savePosition(Math.round(player.x),Math.round(player.y))}
  function click(ev){
    if(paused)return;
    const rect=canvas.getBoundingClientRect();
    const x=camera+(ev.clientX-rect.left)/rect.width*visibleWidth,y=(ev.clientY-rect.top)/rect.height*height;
    canvas.focus({preventScroll:true});
    let target=null;
    if(Math.abs(x-bear.x)<24&&y>=bear.y-58&&y<=bear.y+10)target="bear";
    if(!target){for(const [id,s] of Object.entries(spots)){const a=s.area;if(a&&x>=a[0]&&x<=a[2]&&y>=a[1]&&y<=a[3]){target=id;break}}}
    if(target&&dist(player,spot(target))<(target==="bear"?75:40)){listeners.visit(target);return}
    if(target)walkTo(target);else walk(xy(x,y));
  }
  function move(dt){
    const left=keys.has("left"),right=keys.has("right"),up=keys.has("up"),down=keys.has("down");
    const dx=Number(right)-Number(left),dy=Number(down)-Number(up),before={...player};
    if(dx||dy){
      route=[];visit=null;destination=null;const step=dt*111/Math.hypot(dx,dy);
      if(clear(player.x+dx*step,player.y))player.x+=dx*step;
      if(clear(player.x,player.y+dy*step))player.y+=dy*step;
    }else if(route.length){
      let budget=dt*129;
      while(route.length&&budget>0){
        const point=route[0],distance=dist(point,player);
        if(distance<=budget){player={...point};budget-=distance;route.shift()}
        else{player.x+=(point.x-player.x)*budget/distance;player.y+=(point.y-player.y)*budget/distance;budget=0}
      }
    }
    const isMoving=dist(before,player)>.01;
    if(Math.abs(player.x-before.x)>.05)face=player.x>before.x?1:-1;
    if(isMoving){
      if(!follow.length||dist(player,follow.at(-1))>=4)follow.push({...player});
      if(follow.length>80)follow.shift();
    }
    if(moving&&!isMoving)save();
    moving=isMoving;
    if(moving&&elapsed-lastSaved>2){save();lastSaved=elapsed}
    bearMoving=false;
    if(state.completed.includes("breakfast")&&visit!=="bear"&&follow.length){
      if(dist(bear,player)>48||follow.length>14){
        const goal=follow[0],d=dist(bear,goal),step=dt*130;
        if(d<2)follow.shift();
        else{
          const x=bear.x+(goal.x-bear.x)*Math.min(step/d,1),y=bear.y+(goal.y-bear.y)*Math.min(step/d,1);
          if(clear(x,y)){if(Math.abs(x-bear.x)>.1)bearFace=x>bear.x?1:-1;bear=xy(x,y);bearMoving=true}
          else{const old=player;player=bear;const path=findRoute(goal);player=old;follow=path.length?[...path,...follow.slice(1)]:follow.slice(1)}
        }
      }
    }else if(!state.completed.includes("breakfast"))follow=[];
    updateNear();
    if(!route.length&&destination){
      const id=visit;destination=null;visit=null;save();
      if(id)listeners.visit(id);
    }
  }
  const pal={shadow:"#43361b55",cream:"#fff3cc",dark:"#3e4934",pink:"#dc8790"};
  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h)}
  function pixelHeart(x,y,s,color){
    ["0110110","1111111","1111111","0111110","0011100","0001000"].forEach((r,j)=>[...r].forEach((v,i)=>{if(v==="1")rect(x+i*s,y+j*s,s,s,color)}))
  }
  function sprite(name,pos,h,row,frames,t){
    const img=imgs[name];if(!img.complete||!img.naturalWidth)return;
    const w=h*96/104,x=Math.round(pos.x),y=Math.round(pos.y);
    ctx.fillStyle=pal.shadow;ctx.beginPath();ctx.ellipse(x,y-1,h*.20,h*.045,0,0,Math.PI*2);ctx.fill();
    let frame=Math.floor(t)%frames;
    if(row===0){const cycle=Math.floor(t)%29;frame=cycle<4?cycle:cycle<8?7-cycle:0}
    if(reduced.matches&&row===0)frame=0;
    ctx.drawImage(img,frame*96,row*104,96,104,Math.round(x-w/2),Math.round(y-h*101/104),Math.round(w),Math.round(h));
  }
  function marker(x,y){
    const bob=reduced.matches?0:Math.round(Math.sin(elapsed*3)*1.2);y+=bob;
    rect(x-10,y,20,16,pal.dark);rect(x-12,y+3,24,10,pal.dark);rect(x-1,y+15,6,4,pal.dark);rect(x+1,y+19,2,2,pal.dark);
    rect(x-9,y+2,18,12,pal.cream);rect(x-10,y+4,20,8,pal.cream);rect(x,y+14,4,3,pal.cream);
    pixelHeart(x-4,y+4,1.4,"#bc6b78");
  }
  function flower(x,y,c){
    rect(x+1,y+2,1,4,"#435e37");rect(x,y-2,3,5,c);rect(x-1,y,5,2,c);rect(x+1,y,1,1,"#f6ca5b");
  }
  function decor(){
    if(state.owned.includes("sunroom")&&imgs.sunroom.complete&&imgs.sunroom.naturalWidth)ctx.drawImage(imgs.sunroom,0,162,101,77);
    if(state.owned.includes("flower-box")){
      rect(139,187,48,8,"#734d32");rect(137,186,52,3,"#b47648");
      for(let i=0;i<12;i++)flower(138+i*4,183-(i%3),i%2?"#ffe5b3":"#dc8791");
    }
    if(state.owned.includes("cottage-lights")){
      ctx.strokeStyle="#675737";ctx.lineWidth=1.8;ctx.beginPath();
      for(let i=0;i<=26;i++){const x=95+i*8.4,y=128+Math.sin(i*Math.PI/13)*4;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)}
      ctx.stroke();for(let i=0;i<14;i++){const x=95+i*16.8,y=128+Math.sin(i*Math.PI/6.5)*4;rect(x,y,2,5,"#6e683e");rect(x-1,y+3,5,5,"#efb65a");rect(x,y+4,3,3,"#fff2aa")}
    }
    if(state.completed.includes("breakfast")){
      rect(540,267,17,4,"#544c40");rect(539,265,19,2,"#b87965");rect(542,263,13,3,"#8b5540");
    }
    if(state.owned.includes("toy")){rect(515,280,15,2,"#786040");rect(528,278,4,2,"#c26784");rect(531,280,4,2,"#e99bac")}
  }
  function ambient(){
    if(reduced.matches)return;
    for(const [cx,cy,phase] of [[367,283,.3],[718,178,2.6],[130,273,5.5]]){
      const x=cx+Math.sin(elapsed*.55+phase)*11,y=cy+Math.sin(elapsed*.9+phase)*4;
      rect(x,y,2,3,"#775727");const d=Math.sin(elapsed*9+phase)>0?3:1;rect(x-d,y-2,d,3,"#ffe8a4");rect(x+2,y-2,d,3,"#f4c76e");
    }
    for(let i=0;i<3;i++){
      const clock=(elapsed*.29+i/3)%1;ctx.globalAlpha=Math.sin(clock*Math.PI)*.6;
      const x=853+i*29,y=230-i%2*22;rect(x-5*clock,y,3+clock*7,1.5,"#ceead0");
    }ctx.globalAlpha=1;
  }
  function effects(){
    if(!celebration)return;
    const t=elapsed-celebration.start;if(t>2.2){celebration=null;return}
    const pos=celebration.pos;
    ctx.globalAlpha=Math.min(1,(2.2-t)*2);
    if(celebration.id==="pond"){
      for(let i=0;i<3;i++){ctx.beginPath();ctx.strokeStyle="#dcf8d5";ctx.lineWidth=1.5;ctx.ellipse(843,239,4+t*8+i*3,1+t*3+i,0,0,Math.PI*2);ctx.stroke()}
    }else{
      for(let i=0;i<3;i++){
        const x=pos.x-12+i*12+Math.sin(t*3+i)*3,y=pos.y-47-(reduced.matches?7:t*12)-i%2*7;
        if(celebration.id==="flowers"){rect(x,y+35+t*5,2,4,"#80ddeb")}
        else pixelHeart(x,y,1.3,i===1?"#fff1b1":"#e69795");
      }
    }
    ctx.globalAlpha=1;
  }
  function render(){
    const css=canvas.getBoundingClientRect(),ratio=css.width/Math.max(css.height,1);
    visibleWidth=Math.min(width,height*ratio);
    camera=clamp(player.x-visibleWidth/2,0,width-visibleWidth);
    const outputW=Math.round(visibleWidth),outputH=height;
    if(canvas.width!==outputW||canvas.height!==outputH){canvas.width=outputW;canvas.height=outputH}
    ctx.setTransform(outputW/visibleWidth,0,0,1,-camera*outputW/visibleWidth,0);
    ctx.clearRect(camera,0,visibleWidth,height);
    ctx.imageSmoothingEnabled=true;
    if(imgs.bg.complete&&imgs.bg.naturalWidth)ctx.drawImage(imgs.bg,0,0,width,height);
    ctx.imageSmoothingEnabled=false;decor();ambient();
    if(destination&&!reduced.matches){ctx.strokeStyle="#fff4c6";ctx.lineWidth=1.6;ctx.beginPath();ctx.ellipse(destination.x,destination.y,5+Math.sin((elapsed-arrivalTime)*7),2.5,0,0,Math.PI*2);ctx.stroke()}
    const happy=celebration&&elapsed-celebration.start<1.5;
    const entities=[
      ()=>sprite("mere",player,61,moving?(face>0?1:2):happy?3:0,moving?8:happy?4:6,elapsed*(moving?9:happy?6:5)),
      ()=>sprite("bear",bear,40,bearMoving?(bearFace>0?1:2):happy?3:0,bearMoving?8:happy?4:6,elapsed*(bearMoving?10:happy?6:4))
    ];
    if(bear.y<player.y)entities.reverse();
    for(const draw of entities)draw();
    if(!celebration&&nearby()==="bear")marker(bear.x+4,bear.y-64);
    effects();
  }
  function frame(now){
    const dt=Math.min(.045,(now-lastTime)/1000||0);lastTime=now;
    if(!document.hidden){if(!paused){elapsed+=dt;move(dt)}render()}
    requestAnimationFrame(frame);
  }
  function start(el,callbacks){
    canvas=el;ctx=canvas.getContext("2d");listeners=callbacks;state=window.CozyLife.getState();
    player=state.position&&clear(state.position.x,state.position.y)?{...state.position}:xy(492,267);
    bear={...spots.bear};
    if(state.completed.includes("breakfast")&&dist(player,bear)>80){
      const offsets=[[31,-2],[-31,-2],[0,18],[0,-18],[0,0]];
      const [dx,dy]=offsets.find(([dx,dy])=>clear(player.x+dx,player.y+dy))||[0,0];
      bear=xy(player.x+dx,player.y+dy);follow=[{...player}];
    }
    for(const [key,path] of Object.entries({bg:"meadow.webp",mere:"pets/mere-atlas.webp",bear:"pets/bear-atlas.webp",sunroom:"sunroom.png"})){imgs[key]=new Image();imgs[key].src="assets/"+path}
    canvas.addEventListener("pointerdown",click);
    window.addEventListener("pagehide",save);
    updateNear(true);requestAnimationFrame(frame);
  }
  window.CozyWorld={
    start,walkTo,save,
    hold(dir,on){if(on&&!paused){keys.add(dir);route=[];destination=null;visit=null}else keys.delete(dir)},
    release(){keys.clear()},
    interact(){if(!paused)listeners.visit(nearby())},
    pause(on){paused=on;keys.clear();if(on){route=[];destination=null;visit=null;moving=false;save()}},
    sync(){state=window.CozyLife.getState()},
    celebrate(id){celebration={id,start:elapsed,pos:{...player}}},
    morning(){player=xy(241,238);bear={...spots.bear};follow=[];route=[];destination=null;visit=null;celebration=null;moving=false;save();updateNear(true)}
  };
})();
