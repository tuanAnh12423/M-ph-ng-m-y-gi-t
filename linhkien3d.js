/* =====================================================================
   LINH KIỆN 3D PHÓNG TO (three.js r147) — đơn vị: cm
   LK3D.has(part)  : linh kiện có hình 3D không (không có → app dùng hình 2D trong parts.js)
   LK3D.show(S,p)  : vẽ linh kiện p theo trạng thái bài làm S
   LK3D.onPick     : chạm trả về {pin:'T1'} hoặc {spot:'van:luoi-loc'}
   Dấu hiệu hỏng nhìn thấy được:
     - jack lỏng + dây đứt, ống áp suất gập/tuột, tay vặn vòi gần khóa → thấy ngay khi nhìn
     - lưới lọc bẩn → chỉ thấy sau khi dùng cờ lê tháo ống
     - cuộn dây van đứt, phao hỏng, PCB hỏng → không nhìn thấy, phải đo
   ===================================================================== */
window.LK3D = (function(){
 const NO={ok:()=>false,has:()=>false};
 if(!window.THREE||!THREE.OrbitControls||!window.May3D||!May3D.ok())return NO;
 const T=THREE;
 const el=document.createElement('div');el.className='m3d';
 let renderer,scene,cam,ctrl,root,built=false,running=false,onPick=null,down=null,curPart=null,S=null;
 const labels=[],ray=new T.Raycaster(),v2=new T.Vector2(),tmp=new T.Vector3();

 /* ---------- tiện ích ---------- */
 const M=(c,o={})=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:.5,metalness:0},o));
 const mesh=(g,m)=>{const x=new T.Mesh(g,m);x.castShadow=true;x.receiveShadow=true;return x};
 const box=(w,h,d,m)=>mesh(new T.BoxGeometry(w,h,d),m);
 const rbox=(w,h,d,r,m)=>mesh(new T.RoundedBoxGeometry(w,h,d,4,r),m);
 const cyl=(r1,r2,h,m,s=32)=>mesh(new T.CylinderGeometry(r1,r2,h,s),m);
 const sph=(r,m)=>mesh(new T.SphereGeometry(r,16,12),m);
 const at=(o,x,y,z)=>{o.position.set(x,y,z);return o};
 const tube=(pts,r,m,seg=40)=>mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p))),seg,r,10,false),m);
 const tex=(w,h,draw)=>{const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;return t};
 const MT={
  gold:M(0xd4a72c,{metalness:.9,roughness:.25}), chrome:M(0xdde1e4,{metalness:1,roughness:.12}),
  copper:M(0xc8763a,{metalness:.9,roughness:.3}), plastic:M(0xeeeeea,{roughness:.45}),
  black:M(0x1b1d1f,{roughness:.5}), red:M(0xe60012,{roughness:.4})
 };
 const wireMat=c=>{const k=new T.Color(c);k.offsetHSL(0,0.15,-0.06);return M(k.getHex(),{roughness:.6,envMapIntensity:.25})};
 function pickable(o,data){o.userData.pick=data;return o}
 function label(text,pos){const d=document.createElement('div');d.className='m3l';d.textContent=text;el.appendChild(d);labels.push({d,p:new T.Vector3(...pos)})}
 function clearLabels(){labels.splice(0).forEach(L=>L.d.remove())}

 /* ---------- sân khấu ---------- */
 function build(){
  built=true;
  renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputEncoding=T.sRGBEncoding;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;el.appendChild(renderer.domElement);
  scene=new T.Scene();scene.background=new T.Color(0xcfc6b8);
  if(T.RoomEnvironment){const pm=new T.PMREMGenerator(renderer);scene.environment=pm.fromScene(new T.RoomEnvironment(),0.04).texture}
  scene.add(new T.HemisphereLight(0xffffff,0x8a7a66,0.45));
  const sun=new T.DirectionalLight(0xffffff,1.1);sun.position.set(12,30,18);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25,far:80});sun.shadow.bias=-0.0008;scene.add(sun);
  cam=new T.PerspectiveCamera(35,1.15,0.1,300);
  ctrl=new T.OrbitControls(cam,renderer.domElement);ctrl.enableDamping=true;ctrl.enablePan=false;ctrl.minDistance=8;ctrl.maxDistance=60;ctrl.maxPolarAngle=1.52;ctrl.rotateSpeed=0.7;
  root=new T.Group();scene.add(root);
  new ResizeObserver(resize).observe(el);resize();
  renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});
  renderer.domElement.addEventListener('pointerup',pick);
 }
 function bench(color=0x9b7b58){
  const t=tex(512,512,(g,w,h)=>{g.fillStyle='#'+color.toString(16).padStart(6,'0');g.fillRect(0,0,w,h);for(let i=0;i<70;i++){g.strokeStyle=`rgba(60,40,20,${Math.random()*.18})`;g.lineWidth=1+Math.random()*2;g.beginPath();const y=Math.random()*h;g.moveTo(0,y);g.bezierCurveTo(w/3,y+Math.random()*20-10,2*w/3,y+Math.random()*20-10,w,y+Math.random()*10-5);g.stroke()}});
  const b=new T.Mesh(new T.PlaneGeometry(80,80),M(0xffffff,{map:t,roughness:.75}));b.rotation.x=-Math.PI/2;b.receiveShadow=true;root.add(b);
 }
 function resize(){const w=el.clientWidth||360,fill=el.classList.contains('fill')&&el.clientHeight>80,h=fill?el.clientHeight:Math.round(w/1.15);renderer.setSize(w,h,false);renderer.domElement.style.height=h+'px';cam.aspect=w/h;const k=Math.max(1,1.15/cam.aspect);cam.fov=Math.min(75,2*Math.atan(Math.tan(35*Math.PI/360)*k)*180/Math.PI);cam.updateProjectionMatrix()} // màn hình dọc: mở rộng góc nhìn để giữ đủ bề ngang
 function visible(o){for(;o;o=o.parent)if(!o.visible)return false;return true}
 function pick(e){
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>8)return;
  const r=renderer.domElement.getBoundingClientRect();v2.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);
  ray.setFromCamera(v2,cam);
  const hits=ray.intersectObjects(root.children,true).filter(h=>visible(h.object)&&!h.object.userData.thru);
  // đang cầm VOM: ưu tiên chân đo (chân rất nhỏ); dụng cụ khác: bỏ qua chân đo
  const isPin=h=>{let o=h.object;while(o&&!o.userData.pick)o=o.parent;return !!(o&&o.userData.pick.pin)};
  const h0=S&&S.tool==='vom'?(hits.find(isPin)||hits[0]):hits.find(h=>!isPin(h));
  let o=(h0||{}).object;while(o&&!o.userData.pick)o=o.parent;
  if(o&&onPick)onPick(o.userData.pick);
 }
 function loop(){
  if(!el.isConnected){running=false;return}
  running=true;requestAnimationFrame(loop);ctrl.update();
  if(root.userData.anim)root.userData.anim(performance.now()/1000);
  renderer.render(scene,cam);
  const w=el.clientWidth,h=renderer.domElement.clientHeight;
  labels.forEach(L=>{tmp.copy(L.p).project(cam);const off=tmp.z>1||Math.abs(tmp.x)>1.05||Math.abs(tmp.y)>1.05;L.d.style.display=off?'none':'';
   if(!off)L.d.style.transform=`translate(${((tmp.x+1)/2*w).toFixed(1)}px,${((1-tmp.y)/2*h).toFixed(1)}px) translate(-50%,-100%)`});
 }

 /* ---------- trạng thái bài làm ---------- */
 const chk=spot=>Object.keys(S.E.kiemTra).find(id=>S.E.kiemTra[id].loai!=='do'&&S.E.kiemTra[id].tai===spot);
 const bad=spot=>{const k=chk(spot);return !!(k&&S.v.hong.includes(k))};
 const seen=spot=>{const k=chk(spot);return !!(k&&S.seen[k])};
 const PIN={};                                   // id → vị trí đầu chân (để đặt que đo)
 function pin(id,pos,geo,lbl){
  const g=new T.Group();at(g,...pos);
  const m=geo||cyl(0.18,0.18,0.9,MT.gold,12);g.add(m);
  const hit=new T.Mesh(new T.SphereGeometry(0.6,8,6),new T.MeshBasicMaterial({visible:false}));g.add(hit);
  pickable(g,{pin:id});root.add(g);
  PIN[id]=new T.Vector3(pos[0],pos[1]+0.45,pos[2]);
  if(lbl)label(lbl,[pos[0],pos[1]+1.6,pos[2]]);
  const i=S.probe.indexOf(id);if(i>=0)root.add(probe(i?0x111111:0xe60012,PIN[id]));
  return g;
 }
 function probe(color,p){
  const g=new T.Group();g.position.copy(p);
  const tip=cyl(0.02,0.1,0.9,MT.chrome,12);at(tip,0,0.45,0);g.add(tip);
  const guard=cyl(0.45,0.45,0.2,M(color,{roughness:.35}),20);at(guard,0,0.95,0);g.add(guard);
  const h=cyl(0.32,0.28,2.4,M(color,{roughness:.35}),20);at(h,0,2.2,0);g.add(h);
  g.add(tube([[0,3.4,0],[0,4.6,0],[2,5.4,1.5],[6,5.6,4]],0.13,M(color,{roughness:.5})));
  g.rotation.z=color===0xe60012?0.35:-0.35;g.traverse(x=>x.userData.thru=1);return g;
 }
 const hitTube=(pts,r)=>{const m=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p))),20,r,6,false),new T.MeshBasicMaterial({visible:false}));return m};
 function frame(pos,target){cam.position.set(...pos);ctrl.target.set(...target);ctrl.update()}

 /* =================== VAN CẤP =================== */
 function van(){
  bench();
  const body=rbox(8,4,4.6,0.5,MT.plastic);at(body,0,2.4,0);root.add(body);
  const coil=rbox(4.6,4.2,4.4,0.4,M(0x2f6db5,{roughness:.4}));at(coil,0.6,6.4,0);root.add(coil);
  const sticker=new T.Mesh(new T.PlaneGeometry(3.4,2),new T.MeshBasicMaterial({map:tex(256,150,(g,w,h)=>{g.fillStyle='#f4f4f4';g.fillRect(0,0,w,h);g.fillStyle='#222';g.font='bold 30px Arial';g.fillText('220-240V~',14,48);g.font='24px Arial';g.fillText('50/60Hz',14,88);g.fillText('FPS-180',14,126)})}));
  at(sticker,0.6,6.4,2.21);root.add(sticker);
  // chân T1/T2 (dây đã tháo ra để đo)
  const spade=()=>box(0.75,1.5,0.14,MT.gold);
  pin('T1',[-0.5,9.25,0],spade(),'T1');pin('T2',[1.7,9.25,0],spade(),'T2');
  // cụm dây tháo ra để bên cạnh
  const plugW=rbox(0.9,0.6,1.2,0.12,MT.plastic);at(plugW,6.5,0.4,4);root.add(plugW);
  root.add(tube([[6.5,0.4,4.6],[7.5,0.3,7],[12,0.3,9]],0.18,wireMat('#f4f4f4')));
  const plugO=rbox(0.9,0.6,1.2,0.12,MT.plastic);at(plugO,8,0.4,3);root.add(plugO);
  root.add(tube([[8,0.4,3.6],[9.5,0.3,6],[13,0.3,7.5]],0.18,wireMat('#f08a24')));
  // đầu ra
  [[-1.2],[1.2]].forEach(([z])=>{const o=cyl(0.7,0.7,2.6,MT.plastic,20);o.rotation.z=Math.PI/2;at(o,5.2,2.4,z);root.add(o)});
  // đầu vào có ren + lưới lọc
  const inlet=cyl(1.6,1.6,3,MT.plastic,32);inlet.rotation.z=Math.PI/2;at(inlet,-5.5,2.4,0);root.add(inlet);
  for(let i=0;i<5;i++){const th=new T.Mesh(new T.TorusGeometry(1.62,0.07,6,32),MT.plastic);th.rotation.y=Math.PI/2;at(th,-6.6+i*0.5,2.4,0);root.add(th)}
  const opened=seen('van:luoi-loc'),dirty=bad('van:luoi-loc');
  const meshTex=tex(256,256,(g,w,h)=>{g.fillStyle=dirty?'#8d7a5c':'#d9dde0';g.fillRect(0,0,w,h);g.strokeStyle=dirty?'#5d4a2e':'#8b939a';g.lineWidth=2;for(let i=0;i<w;i+=10){g.beginPath();g.moveTo(i,0);g.lineTo(i,h);g.stroke();g.beginPath();g.moveTo(0,i);g.lineTo(w,i);g.stroke()}
   if(dirty)for(let i=0;i<220;i++){g.fillStyle=`rgba(${70+Math.random()*50},${45+Math.random()*30},${20+Math.random()*20},${.5+Math.random()*.5})`;g.beginPath();g.arc(Math.random()*w,Math.random()*h,2+Math.random()*12,0,7);g.fill()}});
  const filt=new T.Group();
  const disc=new T.Mesh(new T.CircleGeometry(1.35,40),M(0xffffff,{map:meshTex,roughness:.6,metalness:dirty?0:.5,side:T.DoubleSide}));disc.rotation.y=-Math.PI/2;at(disc,-7.02,2.4,0);filt.add(disc);
  if(dirty)for(let i=0;i<14;i++){const s=sph(0.12+Math.random()*0.18,M(0x6b5028,{roughness:.9}));const a=Math.random()*6.28,r=Math.random()*1.1;at(s,-7.08,2.4+Math.sin(a)*r,Math.cos(a)*r);filt.add(s)}
  const g=new T.Group();g.add(filt);
  if(!opened){ // ống cấp còn vặn vào đầu vào → chưa thấy lưới lọc
   const nut=cyl(2.1,2.1,2.2,MT.chrome,6);nut.rotation.z=Math.PI/2;at(nut,-7.9,2.4,0);g.add(nut);
   g.add(tube([[-9,2.4,0],[-12,2.4,0],[-16,1,4],[-20,0.8,9]],1,M(0x9aa3ab,{roughness:.5,metalness:.2})));
   label('Đầu nối ống (tháo bằng cờ lê)',[-8,5.2,0]);
  }else{
   const nut=cyl(2.1,2.1,2.2,MT.chrome,6);nut.rotation.z=Math.PI/2;nut.rotation.y=0.6;at(nut,-13,1.2,6);g.add(nut);
   g.add(tube([[-14,1.1,6.5],[-16,0.9,8],[-20,0.8,10]],1,M(0x9aa3ab,{roughness:.5,metalness:.2})));
   label(dirty?'Lưới lọc: bám cặn':'Lưới lọc: sạch',[-7.2,4.6,0]);
  }
  pickable(g,{spot:'van:luoi-loc'});root.add(g);
  frame([-15,15,21],[-1,5,0]);
 }

 /* =================== BO MẠCH PCB =================== */
 function pcb(){
  bench(0x6f6a64);
  const traces=tex(1024,640,(g,w,h)=>{g.fillStyle='#1f6b3a';g.fillRect(0,0,w,h);g.strokeStyle='#3fa364';g.lineWidth=5;
   for(let i=0;i<46;i++){g.beginPath();let x=Math.random()*w,y=Math.random()*h;g.moveTo(x,y);for(let k=0;k<3;k++){Math.random()<.5?x+=(Math.random()-.5)*300:y+=(Math.random()-.5)*200;g.lineTo(x,y)}g.stroke()}
   g.fillStyle='#c9b25e';for(let i=0;i<120;i++){g.beginPath();g.arc(Math.random()*w,Math.random()*h,5,0,7);g.fill()}
   g.fillStyle='#e8f0e8';g.font='bold 34px Arial';g.fillText('MAIN PCB  TSB-WM',40,600)});
  const board=box(24,0.16,15,M(0xffffff,{map:traces,roughness:.55}));at(board,0,1.2,0);root.add(board);
  [[-11,-6.5],[11,-6.5],[-11,6.5],[11,6.5]].forEach(([x,z])=>root.add(at(cyl(0.35,0.35,1.1,MT.plastic,12),x,0.55,z)));
  // linh kiện trên board
  const ic=box(3.4,0.45,2.2,MT.black);at(ic,-2,1.5,2.5);root.add(ic);
  for(let i=0;i<8;i++)[-1.2,1.2].forEach(dz=>root.add(at(box(0.12,0.3,0.4,MT.chrome),-3.5+i*0.43,1.35,2.5+dz)));
  const relay=rbox(3,2.4,2.2,0.15,M(0x2b4fa0,{roughness:.35}));at(relay,6,2.5,3.5);root.add(relay);
  [[3,4.5,1.6,0x222a6a],[1.2,5.5,1.2,0x1b1b1b],[-6.5,4.2,1.4,0x222a6a],[-8.5,3.6,1,0x1b1b1b]].forEach(([x,z,r,c])=>{const k=cyl(r*0.5,r*0.5,r*1.8,M(c,{roughness:.4}),20);at(k,x,1.3+r*0.9,z);root.add(k);const top=cyl(r*0.5,r*0.5,0.05,MT.chrome,20);at(top,x,1.3+r*1.8,z);root.add(top)});
  const trafo=rbox(3.2,2.6,2.6,0.2,M(0x333333));at(trafo,-7.5,2.6,-0.5);root.add(trafo);
  // jack theo dữ liệu mã lỗi
  const J=S.E.jack||[];let x=-8;
  J.forEach(j=>{
   const n=j.day.length,w=1.4+n*1.1,loose=bad('pcb:'+j.id),z=-3;
   const cx=x+w/2,lift=loose?1.4:0,tilt=loose?0.35:0;
   root.add(at(box(w,0.9,1.5,M(0xf2f2ee,{roughness:.5})),cx,1.73,z));               // đế jack hàn trên board
   const plug=new T.Group();at(plug,cx,2.6+lift,z);plug.rotation.x=-tilt;
   plug.add(rbox(w-0.1,1.1,1.3,0.08,M(0xfafaf6,{roughness:.45})));
   pickable(plug,{spot:'pcb:'+j.id});root.add(plug);
   label(j.id+(loose?' bị lỏng':''),[cx,4.2+lift,z+1.2]);
   j.day.forEach((d,i)=>{
    const px=x+0.7+0.55+i*1.1,top=3.2+lift;
    pin(j.id+'-'+d[0],[px,top,z+(loose?-0.1:0)],cyl(0.16,0.16,0.5,MT.gold,10),'');
    const broken=loose&&i===n-1; // dây cuối của jack lỏng bị đứt
    const a=[px,2.6+lift,z-0.7],m1=[px,2.3,z-3],m2=[px+0.4,1.5,z-6],e=[px+1.2,1.3,z-11];
    if(!broken)root.add(tube([a,m1,m2,e],0.22,wireMat(d[2])));
    else{
     const b1=[px,2.4+lift*0.5,z-1.5],b2=[px+0.9,2,z-3.2];
     root.add(tube([a,b1],0.22,wireMat(d[2]),12));
     root.add(tube([b2,[px+0.6,1.9,z-4.5],m2,e],0.22,wireMat(d[2])));
     for(let s=0;s<8;s++){const sx=(Math.random()-.5)*0.3,sy=(Math.random()-.5)*0.3;
      root.add(tube([[b1[0]+sx*0.5,b1[1]+sy*0.5,b1[2]],[b1[0]+sx*2,b1[1]+sy,b1[2]-0.45-Math.random()*0.3]],0.04,MT.copper,4));
      root.add(tube([[b2[0]+sx*0.5,b2[1]+sy*0.5,b2[2]],[b2[0]+sx*2,b2[1]+sy,b2[2]+0.45+Math.random()*0.3]],0.04,MT.copper,4))}
     label('Dây '+d[1].toLowerCase()+' bị đứt',[px+2.5,2.4,z-2.6]);
    }
   });
   x+=w+3.2;
  });
  frame([-3,30,7],[-3,1.5,-4.5]);
 }

 /* =================== PHAO =================== */
 function phao(){
  bench();
  const body=cyl(4,4,3,M(0xf2f2ef,{roughness:.35}),48);at(body,0,2,0);root.add(body);
  const lid=cyl(4.05,4.05,0.4,M(0xdedcd6,{roughness:.4}),48);at(lid,0,3.6,0);root.add(lid);
  const st=new T.Mesh(new T.CircleGeometry(2.2,32),new T.MeshBasicMaterial({map:tex(256,256,(g,w,h)=>{g.fillStyle='#f4f4f4';g.fillRect(0,0,w,h);g.fillStyle='#333';g.textAlign='center';g.font='bold 30px Arial';g.fillText('WATER LEVEL',128,110);g.font='26px Arial';g.fillText('SENSOR',128,150)})}));
  st.rotation.x=-Math.PI/2;at(st,0,3.81,0);root.add(st);
  const noz=cyl(0.45,0.55,2.4,M(0xdedcd6),16);at(noz,-2,4.9,0);root.add(noz);
  // ổ cắm 3 chân bên hông (giắc dây đã rút ra)
  const sock=box(4.2,1.8,2.2,M(0x2a2a2a));at(sock,1,2,4.4);root.add(sock);
  ['P1','P2','P3'].forEach((id,i)=>{const g=cyl(0.15,0.15,1.2,MT.gold,10);g.rotation.x=Math.PI/2;pin(id,[-0.4+i*1.4,2.15,5.6],g,String(i+1))});
  const plug=rbox(3.6,1.2,1.6,0.15,M(0xf4f4f0));at(plug,7,0.6,9);plug.rotation.y=-0.4;root.add(plug);
  ['#f08a24','#1e6fd9','#f2c200'].forEach((c,i)=>root.add(tube([[6+i*1,0.6,9.8],[7+i,0.4,12],[9+i*1.2,0.4,16]],0.16,wireMat(c))));
  // ống áp suất
  const kink=bad('phao:ong'),hm=new T.MeshPhysicalMaterial({color:0xd8e6ee,roughness:.25,transparent:true,opacity:.75,depthWrite:false});
  const g=new T.Group();
  const okPath=[[-2,6,0],[-2,8.5,0],[-4,10,-2],[-8,10.5,-5]],badA=[[-2,7.4,0.7],[-2.3,8.8,1],[-3.2,9.4,1.3]],badB=[[-3.2,9.4,1.3],[-2.6,10.4,-0.4],[-5,10.6,-2.6],[-8,10.5,-5]];
  if(!kink){g.add(tube(okPath,0.55,hm));g.add(hitTube(okPath,1.6))}
  else{
   g.add(tube(badA,0.55,hm,20));      // tuột khỏi đầu nối
   g.add(tube(badB,0.55,hm,30));      // gập gấp khúc
   g.add(hitTube(badA,1.6));g.add(hitTube(badB,1.6));
   label('Ống tuột & bị gập',[-2.5,11.6,0.6]);
  }
  g.traverse(x=>{if(x.isMesh)x.castShadow=true});
  pickable(g,{spot:'phao:ong'});root.add(g);
  label('Ống áp suất',[-6.5,11.8,-4]);
  frame([11,13,19],[0,4.5,0]);
 }

 /* =================== VÒI NƯỚC =================== */
 function voi(){
  const wallT=tex(512,512,(g,w,h)=>{g.fillStyle='#e9e6df';g.fillRect(0,0,w,h);g.strokeStyle='#cfc9bd';g.lineWidth=4;for(let i=0;i<=4;i++){g.beginPath();g.moveTo(i*w/4,0);g.lineTo(i*w/4,h);g.stroke();g.beginPath();g.moveTo(0,i*h/4);g.lineTo(w,i*h/4);g.stroke()}});
  const wall=new T.Mesh(new T.PlaneGeometry(60,40),M(0xffffff,{map:wallT,roughness:.8}));at(wall,0,0,-4);wall.receiveShadow=true;root.add(wall);
  const fl=new T.Mesh(new T.PlaneGeometry(60,30),M(0xb8ab98,{roughness:.8}));fl.rotation.x=-Math.PI/2;at(fl,0,-16,10);fl.receiveShadow=true;root.add(fl);
  root.add(at(cyl(2.4,2.4,0.6,MT.chrome,32),0,6,-3.7).rotateX(Math.PI/2));
  const pipe=cyl(0.9,0.9,4,MT.chrome,20);pipe.rotation.x=Math.PI/2;at(pipe,0,6,-1.5);root.add(pipe);
  root.add(at(sph(1.6,MT.chrome),0,6,1));
  const out=cyl(0.8,0.8,3,MT.chrome,20);at(out,0,4,1);root.add(out);
  // tay vặn: song song với ống = mở; vuông góc = khóa
  const closed=bad('voi:tay-van'),lev=new T.Group();at(lev,0,7.6,1);
  lev.add(at(cyl(0.4,0.4,1.2,MT.chrome,12),0,0,0));
  const arm=rbox(1.2,0.6,6,0.25,MT.red);at(arm,0,0.5,2.6);lev.add(arm);
  const lh=new T.Mesh(new T.BoxGeometry(3,3,8),new T.MeshBasicMaterial({visible:false}));at(lh,0,0.5,2.8);lev.add(lh);
  lev.rotation.y=closed?1.25:0;
  pickable(lev,{spot:'voi:tay-van'});root.add(lev);
  label(closed?'Tay vặn (đang gần khóa)':'Tay vặn',[0,10,1]);
  // đầu nối ống / đồng hồ áp lực
  const nutG=new T.Group();const nut=cyl(1.3,1.3,1.6,MT.chrome,6);at(nut,0,1.9,1);nutG.add(nut);
  pickable(nutG,{spot:'voi:dau-noi'});root.add(nutG);
  const checked=seen('voi:tay-van'),gauge=S.gv!=null;
  if(gauge){
   const face=tex(256,256,(g,w,h)=>{g.fillStyle='#fafaf6';g.beginPath();g.arc(128,128,124,0,7);g.fill();
    const ang=t=>Math.PI*(0.75+1.5*t);g.lineWidth=16;[[0,.03,'#e60012'],[.03,.8,'#2fa35a'],[.8,1,'#e60012']].forEach(([a,b,c])=>{g.strokeStyle=c;g.beginPath();g.arc(128,128,100,ang(a),ang(b));g.stroke()});
    g.fillStyle='#222';g.font='bold 22px Arial';g.textAlign='center';[0,.2,.4,.6,.8,1].forEach(t=>g.fillText(t,128+72*Math.cos(ang(t)),136+72*Math.sin(ang(t))));g.fillText('MPa',128,190);
    const v=Math.min(1,+S.gv);g.strokeStyle='#e60012';g.lineWidth=6;g.beginPath();g.moveTo(128,128);g.lineTo(128+92*Math.cos(ang(v)),128+92*Math.sin(ang(v)));g.stroke();g.fillStyle='#333';g.beginPath();g.arc(128,128,10,0,7);g.fill()});
   const gb=cyl(3,3,1.4,MT.chrome,40);gb.rotation.x=Math.PI/2;at(gb,0,-3.5,1.6);root.add(gb);
   const gf=new T.Mesh(new T.CircleGeometry(2.8,40),new T.MeshBasicMaterial({map:face}));at(gf,0,-3.5,2.32);root.add(gf);
   root.add(at(cyl(0.5,0.5,3.4,MT.gold,12),0,-0.4,1));
   label('Áp lực: '+S.gv+' MPa',[0,0.6,4.5]);
  }else if(!checked){
   root.add(tube([[0,1,1],[0,-3,1],[3,-8,3],[9,-12,6],[16,-14,8]],1,M(0x9aa3ab,{roughness:.5,metalness:.2})));
   label('Đầu nối ống',[3.2,2,1]);
  }
  if(checked&&!gauge){ // đã tháo ống, mở vòi xả thử vào xô
   const bucket=mesh(new T.CylinderGeometry(5,4,8,32,1,true),M(0x2b6cb0,{roughness:.5,side:T.DoubleSide}));at(bucket,0,-12,2);root.add(bucket);
   const wm=new T.MeshPhysicalMaterial({color:0x7ec3ff,roughness:.05,transparent:true,opacity:.7,depthWrite:false});
   if(!closed){const s=cyl(0.55,0.75,9,wm,16);at(s,0,-3.4,1);s.userData.thru=1;root.add(s);label('Nước chảy mạnh',[3.5,-2,1])}
   else{const drops=[];for(let i=0;i<4;i++){const d=sph(0.22,wm);d.userData.thru=1;root.add(d);drops.push(d)}
    root.userData.anim=t=>drops.forEach((d,i)=>{const k=((t*0.9+i/4)%1);at(d,0,1-k*9,1)});label('Nước chảy rất yếu',[3.5,-2,1])}
  }
  frame([14,3,24],[0,1,0]);
 }

 const B={van,pcb,phao,voi};
 function show(state,part){
  S=state;if(!built)build();
  root.clear();delete root.userData.anim;clearLabels();for(const k in PIN)delete PIN[k];
  const keep=curPart===part,cp=cam.position.clone(),ct=ctrl.target.clone();
  B[part]();
  if(keep){cam.position.copy(cp);ctrl.target.copy(ct);ctrl.update()}
  curPart=part;
  if(!running)loop();
 }
 return {ok:()=>true,has:p=>!!B[p],el,show,set onPick(f){onPick=f},
  project(x,y,z){const r=renderer.domElement.getBoundingClientRect();const v=new T.Vector3(x,y,z).project(cam);return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]},
  pinPos:id=>PIN[id]&&PIN[id].toArray()};
})();
