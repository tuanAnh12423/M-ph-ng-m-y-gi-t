/* =====================================================================
   MÁY GIẶT 3D (three.js r147, file trong thư mục lib/)
   - Kéo để xoay, chụm 2 ngón để phóng to/thu nhỏ, chạm để thao tác.
   - Chạm trả về {act:'phich'|'nguon'|'start'|'nap'} hoặc {part:'van'|'pcb'|'phao'|'voi'|...}
   - Máy không hỗ trợ WebGL → May3D.ok() = false → app dùng hình 2D.
   Đơn vị: mét. Máy cửa trên: rộng 0,6 · sâu 0,62 · cao 0,92 (+ hộp điều khiển phía sau).
   ===================================================================== */
window.May3D = (function(){
 const NO = {ok:()=>false};
 if(!window.THREE||!THREE.OrbitControls) return NO;
 try{const c=document.createElement('canvas');if(!(c.getContext('webgl2')||c.getContext('webgl')))return NO}catch(e){return NO}
 const T = THREE;
 const el = document.createElement('div'); el.className='m3d';
 let renderer, scene, cam, ctrl, built=false, running=false, onPick=null, S=null, down=null;
 const picks=[], labels=[], O={}, tween={t:1};
 const ray=new T.Raycaster(), v2=new T.Vector2();

 /* ---------- vật liệu & hình cơ bản ---------- */
 const M = (color,o={})=>new T.MeshStandardMaterial(Object.assign({color,roughness:.5,metalness:0},o));
 const MAT = {
  white: M(0x0b0c0e,{roughness:.32,metalness:.05,envMapIntensity:.25}),   // màu vỏ máy (đen)
  silver:M(0xc7ccd1,{roughness:.28,metalness:.55}),
  dark:  M(0x24292d,{roughness:.55}),
  panel: M(0x1d2226,{roughness:.25,metalness:.2}),
  steel: M(0xb9c0c6,{roughness:.22,metalness:.9,side:T.DoubleSide}),
  inner: M(0x15191c,{roughness:.9}),
  rubber:M(0x1a1a1a,{roughness:.8}),
  chrome:M(0xd9dde0,{roughness:.12,metalness:1}),
  red:   M(0xe60012,{roughness:.4}),
  hose:  M(0x9aa3ab,{roughness:.5,metalness:.2})
 };
 const mesh = (g,m)=>{const x=new T.Mesh(g,m);x.castShadow=true;x.receiveShadow=true;return x};
 const box = (w,h,d,m)=>mesh(new T.BoxGeometry(w,h,d),m);
 const rbox = (w,h,d,r,m)=>mesh(new T.RoundedBoxGeometry(w,h,d,4,r),m);
 const cyl = (r1,r2,h,m,seg=32)=>mesh(new T.CylinderGeometry(r1,r2,h,seg),m);
 const at = (o,x,y,z)=>{o.position.set(x,y,z);return o};
 const tube = (pts,r,m)=>mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p))),48,r,10,false),m);
 function pickable(o,data){o.userData.pick=data;o.traverse(x=>{if(x.isMesh)picks.push(x)});return o}
 function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.userData.draw=()=>{draw(c.getContext('2d'),w,h);t.needsUpdate=true};t.userData.draw();return t}
 function label(text,pos,side){const d=document.createElement('div');d.className='m3l';d.textContent=text;el.appendChild(d);const L={d,p:new T.Vector3(...pos),side};labels.push(L);return L}

 /* ---------- dựng cảnh ---------- */
 function build(){
  built=true;
  renderer=new T.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=0.95;
  el.appendChild(renderer.domElement);
  scene=new T.Scene();scene.background=new T.Color(0xd9d2c7);
  if(T.RoomEnvironment){const pm=new T.PMREMGenerator(renderer);scene.environment=pm.fromScene(new T.RoomEnvironment(),0.04).texture}
  cam=new T.PerspectiveCamera(36,1.2,0.05,20);
  ctrl=new T.OrbitControls(cam,renderer.domElement);
  ctrl.enableDamping=true;ctrl.enablePan=false;ctrl.minDistance=0.7;ctrl.maxDistance=3.2;ctrl.maxPolarAngle=1.5;ctrl.rotateSpeed=0.7;
  view('truoc',true);
  scene.add(new T.HemisphereLight(0xffffff,0xb9ad9b,0.45));
  const sun=new T.DirectionalLight(0xffffff,1.15);sun.position.set(1.4,3,2.2);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-1.4,right:1.4,top:1.6,bottom:-1.2});sun.shadow.bias=-0.0006;scene.add(sun);
  const fill=new T.DirectionalLight(0xffffff,0.35);fill.position.set(-1,1.5,-2);scene.add(fill);
  // sàn gạch + tường
  const floorTex=canvasTex(512,512,(g,w,h)=>{g.fillStyle='#d3c3a8';g.fillRect(0,0,w,h);g.strokeStyle='#bfae91';g.lineWidth=4;for(let i=0;i<=4;i++){g.beginPath();g.moveTo(i*w/4,0);g.lineTo(i*w/4,h);g.stroke();g.beginPath();g.moveTo(0,i*h/4);g.lineTo(w,i*h/4);g.stroke()}});
  floorTex.wrapS=floorTex.wrapT=T.RepeatWrapping;floorTex.repeat.set(4,4);
  const floor=new T.Mesh(new T.PlaneGeometry(6,6),M(0xffffff,{map:floorTex,roughness:.7}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  const wall=new T.Mesh(new T.PlaneGeometry(6,3),M(0xe4ddd2,{roughness:.95}));wall.position.set(-0.64,1.5,0);wall.rotation.y=Math.PI/2;wall.receiveShadow=true;scene.add(wall);
  const skirt=box(0.02,0.08,6,M(0xd8d0c4));at(skirt,-0.63,0.04,0);scene.add(skirt);
  buildMachine();buildFaucet();buildSocket();
  // lớp nút đổi góc nhìn
  const vb=document.createElement('div');vb.className='m3v';
  vb.innerHTML='<button data-v="truoc">Mặt trước</button><button data-v="sau">Mặt sau</button><button data-v="tren">Trên xuống</button>';
  vb.onclick=e=>{const b=e.target.closest('[data-v]');if(b)view(b.dataset.v)};el.appendChild(vb);
  new ResizeObserver(resize).observe(el);resize();
  renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});
  renderer.domElement.addEventListener('pointerup',pick);
 }

 function buildMachine(){
  const g=new T.Group();scene.add(g);O.may=g;
  // chân đế
  g.add(at(box(0.56,0.05,0.58,MAT.rubber),0,0.025,0));
  // vỏ: 4 tấm + cạnh bo tròn (để hở trên nhìn thấy lồng giặt)
  const H=0.87,y=0.05+H/2;
  g.add(at(box(0.6,H,0.012,MAT.white),0,y,0.304));
  g.add(at(box(0.6,H,0.012,MAT.white),0,y,-0.304));
  g.add(at(box(0.012,H,0.62,MAT.white),-0.294,y,0));
  g.add(at(box(0.012,H,0.62,MAT.white),0.294,y,0));
  [[-0.29,0.3],[0.29,0.3],[-0.29,-0.3],[0.29,-0.3]].forEach(([x,z])=>g.add(at(cyl(0.012,0.012,H,MAT.white,16),x,y,z)));
  // logo mặt trước
  const logo=canvasTex(512,96,(c,w,h)=>{c.clearRect(0,0,w,h);c.fillStyle='#ff2b2b';c.font='bold 72px "Be Vietnam Pro",Arial,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('TOSHIBA',w/2,h/2+4)});
  const lg=new T.Mesh(new T.PlaneGeometry(0.22,0.042),new T.MeshBasicMaterial({map:logo,transparent:true}));at(lg,0,0.8,0.311);g.add(lg);
  // mặt trên có lỗ tròn
  const sh=new T.Shape();const w=0.3,d=0.31,r=0.03;
  sh.moveTo(-w+r,-d);sh.lineTo(w-r,-d);sh.quadraticCurveTo(w,-d,w,-d+r);sh.lineTo(w,d-r);sh.quadraticCurveTo(w,d,w-r,d);sh.lineTo(-w+r,d);sh.quadraticCurveTo(-w,d,-w,d-r);sh.lineTo(-w,-d+r);sh.quadraticCurveTo(-w,-d,-w+r,-d);
  const hole=new T.Path();hole.absarc(0,-0.07,0.205,0,Math.PI*2,true);sh.holes.push(hole);
  const deck=mesh(new T.ExtrudeGeometry(sh,{depth:0.02,bevelEnabled:true,bevelThickness:0.004,bevelSize:0.004,bevelSegments:2,curveSegments:48}),MAT.white);
  deck.rotation.x=-Math.PI/2;deck.position.y=0.9;g.add(deck);
  // lồng giặt inox + mâm giặt
  const drum=mesh(new T.CylinderGeometry(0.2,0.2,0.42,48,1,true),MAT.steel);at(drum,0,0.7,0.07);g.add(drum);
  const holes=canvasTex(256,256,(c,W,Hh)=>{c.fillStyle='#b9c0c6';c.fillRect(0,0,W,Hh);c.fillStyle='#6f777e';for(let i=0;i<16;i++)for(let j=0;j<16;j++)if((i+j)%2)c.beginPath(),c.arc(i*16+8,j*16+8,2.6,0,7),c.fill()});
  holes.wrapS=holes.wrapT=T.RepeatWrapping;holes.repeat.set(6,2);drum.material=M(0xffffff,{map:holes,roughness:.3,metalness:.7,side:T.DoubleSide});
  const bot=mesh(new T.CircleGeometry(0.2,48),MAT.silver);bot.rotation.x=-Math.PI/2;at(bot,0,0.5,0.07);g.add(bot);
  g.add(at(cyl(0.09,0.15,0.04,M(0xb9c0c6,{roughness:.35,metalness:.4}),32),0,0.52,0.07));
  // nắp kính + khung
  const lid=new T.Group();at(lid,0,0.93,0.07);g.add(lid);
  [[0,0.21,0.5,0.04],[0,-0.21,0.5,0.04]].forEach(([x,z,w,d])=>lid.add(at(rbox(w,0.018,d,0.006,MAT.silver),x,0,z)));
  [[-0.23],[0.23]].forEach(([x])=>lid.add(at(rbox(0.04,0.018,0.46,0.006,MAT.silver),x,0,0)));
  const glass=new T.Mesh(new T.BoxGeometry(0.44,0.006,0.38),new T.MeshPhysicalMaterial({color:0x3a4a55,roughness:.05,metalness:.1,transparent:true,opacity:.32,clearcoat:1,depthWrite:false}));at(glass,0,0.004,0);glass.userData.thru=1;lid.add(glass);
  lid.add(at(box(0.12,0.012,0.02,MAT.dark),0,0.012,0.215));
  // hộp điều khiển phía sau (rỗng, mặt sau là nắp kỹ thuật)
  const cb=new T.Group();g.add(cb);O.console=cb;
  const cy=0.985,cz=-0.235;
  cb.add(at(rbox(0.6,0.012,0.15,0.005,MAT.white),0,cy+0.064,cz));          // nóc
  cb.add(at(box(0.6,0.012,0.15,MAT.white),0,cy-0.064,cz));                  // đáy
  cb.add(at(box(0.012,0.13,0.15,MAT.white),-0.294,cy,cz));
  cb.add(at(box(0.012,0.13,0.15,MAT.white),0.294,cy,cz));
  const front=box(0.6,0.13,0.012,MAT.white);at(front,0,cy,-0.16);cb.add(front);
  cb.add(at(box(0.57,0.115,0.004,MAT.inner),0,cy,-0.168));                 // vách tối bên trong
  // mặt điều khiển (kính đen) + màn hình + nút
  const pnl=box(0.56,0.1,0.004,MAT.panel);at(pnl,0,cy,-0.153);cb.add(pnl);
  O.dispTex=canvasTex(256,96,drawDisplay);
  const disp=new T.Mesh(new T.PlaneGeometry(0.12,0.045),new T.MeshBasicMaterial({map:O.dispTex}));at(disp,0.17,cy+0.005,-0.1505);cb.add(disp);
  O.btnN=btn(-0.22,cy,'nguon');O.btnS=btn(-0.05,cy,'start');
  // nắp kỹ thuật phía sau (có vít)
  const cov=new T.Group();g.add(cov);O.cover=cov;
  cov.add(at(box(0.58,0.12,0.008,M(0x3b4045,{roughness:.4,metalness:.3})),0,cy,-0.312));
  [[-0.27,0.045],[0.27,0.045],[-0.27,-0.045],[0.27,-0.045]].forEach(([x,yy])=>{const s=cyl(0.007,0.007,0.004,MAT.chrome,12);s.rotation.x=Math.PI/2;cov.add(at(s,x,cy+yy,-0.317))});
  pickable(cov,{act:'nap'});
  // khoang linh kiện
  O.inside=new T.Group();g.add(O.inside);
  // dây nguồn ra sau máy
  O.cordStart=[0.2,0.12,-0.31];
  // nhãn
  O.lNut=label('Nguồn  ·  Start',[-0.135,cy+0.08,-0.15],'front');
  O.lNap=label('Nắp kỹ thuật',[0,cy+0.1,-0.33],'back');
 }
 function btn(x,y,act){
  const b=cyl(0.022,0.022,0.012,M(0xc9ced3,{roughness:.3,metalness:.3}),24);O.btnMat=O.btnMat||[];O.btnMat.push(b);b.rotation.x=Math.PI/2;at(b,x,y,-0.148);O.console.add(b);
  const ring=new T.Mesh(new T.TorusGeometry(0.025,0.004,8,32),M(0x666666,{emissive:0x000000}));at(ring,x,y,-0.146);O.console.add(ring);
  const hit=new T.Mesh(new T.BoxGeometry(0.06,0.06,0.03),new T.MeshBasicMaterial({visible:false}));at(hit,x,y,-0.145);O.console.add(hit);
  pickable(b,{act});pickable(hit,{act});picks.push(ring);ring.userData.pick={act};
  return ring;
 }
 function drawDisplay(c,w,h){
  c.fillStyle='#050706';c.fillRect(0,0,w,h);
  if(!S)return;
  c.textAlign='center';c.textBaseline='middle';
  if(S.dien===2&&O.blink){c.fillStyle='#ff3b3b';c.font='bold 64px "Share Tech Mono",monospace';c.fillText(S.code,w/2,h/2+4)}
  if(S.dien===3){c.fillStyle=O.blink?'#4cd07d':'#2a8a4f';c.font='bold 40px "Be Vietnam Pro",Arial,sans-serif';c.fillText('Cấp nước',w/2,h/2+2)}
 }
 function buildFaucet(){
  const g=new T.Group();scene.add(g);
  g.add(at(rbox(0.012,0.09,0.09,0.004,MAT.chrome),-0.633,1.18,-0.22));                       // đế gắn tường
  const pipe=cyl(0.014,0.014,0.07,MAT.chrome,16);pipe.rotation.z=Math.PI/2;g.add(at(pipe,-0.6,1.18,-0.22));
  g.add(at(cyl(0.024,0.024,0.05,MAT.chrome,24),-0.56,1.18,-0.22));                             // thân van
  const lever=box(0.02,0.012,0.09,MAT.red);at(lever,-0.56,1.213,-0.22);g.add(lever);O.lever=lever;
  g.add(at(cyl(0.014,0.014,0.05,MAT.chrome,16),-0.56,1.14,-0.22));                             // đầu ra
  const hit=new T.Mesh(new T.BoxGeometry(0.16,0.16,0.16),new T.MeshBasicMaterial({visible:false}));at(hit,-0.57,1.17,-0.22);g.add(hit);
  pickable(g,{part:'voi'});O.faucet=g;
  // ống cấp từ vòi tới van (sau máy)
  scene.add(tube([[-0.56,1.115,-0.22],[-0.55,0.95,-0.32],[-0.42,0.9,-0.45],[-0.26,0.97,-0.38],[-0.2,0.985,-0.335]],0.011,MAT.hose));
  O.lVoi=label('Vòi nước',[-0.56,1.29,-0.22],'front');
 }
 function buildSocket(){
  const g=new T.Group();scene.add(g);
  g.add(at(rbox(0.012,0.1,0.08,0.006,M(0xffffff,{roughness:.3})),-0.633,0.45,0.18));
  [-0.012,0.012].forEach(z=>g.add(at(cyl(0.004,0.004,0.004,MAT.dark,8),-0.626,0.45,0.18+z)));
  const hit=new T.Mesh(new T.BoxGeometry(0.12,0.16,0.14),new T.MeshBasicMaterial({visible:false}));at(hit,-0.6,0.45,0.18);g.add(hit);
  pickable(g,{act:'phich'});
  O.plug=new T.Group();scene.add(O.plug);
  O.lSocket=label('Ổ điện',[-0.62,0.55,0.18],'front');
 }
 function placePlug(on){
  for(let i=picks.length-1;i>=0;i--)if(picks[i].userData.plug)picks.splice(i,1);
  O.plug.clear();
  const body=rbox(0.04,0.035,0.035,0.006,MAT.rubber);
  const end=on?[-0.605,0.45,0.18]:[-0.35,0.02,0.32];
  if(!on)body.rotation.z=Math.PI/2;
  at(body,...end);O.plug.add(body);
  const s=O.cordStart,pts=on?[s,[0.2,0.02,-0.4],[-0.3,0.01,-0.3],[-0.5,0.02,0.1],[-0.58,0.3,0.18],[end[0]+0.02,end[1],end[2]]]:[s,[0.2,0.02,-0.4],[-0.2,0.01,-0.1],[-0.32,0.015,0.3],end];
  O.plug.add(tube(pts,0.005,MAT.rubber));
  pickable(O.plug,{act:'phich'});O.plug.traverse(x=>{if(x.isMesh)x.userData.plug=1});
 }
 // linh kiện bên trong hộp điều khiển (theo dữ liệu mã lỗi)
 const P3 = {
  van:{pos:[-0.2,0.985,-0.25],make(){const g=new T.Group();g.add(rbox(0.075,0.05,0.05,0.008,M(0x2f6db5,{roughness:.4})));const inl=cyl(0.013,0.013,0.06,MAT.chrome,16);inl.rotation.x=Math.PI/2;g.add(at(inl,0,0,-0.05));[[-0.015],[0.015]].forEach(([x])=>g.add(at(box(0.006,0.018,0.004,M(0xd4a72c,{metalness:.8,roughness:.3})),x,0.033,0)));return g},a:[0.04,0,0]},
  pcb:{pos:[0.02,0.985,-0.215],make(h){const g=new T.Group();g.add(box(0.17,0.095,0.004,M(0x1f6b3a,{roughness:.6})));g.add(at(box(0.035,0.025,0.006,M(0x111111)),-0.03,-0.02,-0.004));(h.jack||[]).forEach((j,i)=>g.add(at(box(0.03,0.012,0.012,M(0xf4f4f4)),-0.055+i*0.05,0.03,-0.006)));g.add(at(cyl(0.008,0.008,0.016,M(0x2b4fa0),12),0.05,-0.02,-0.01));return g},a:[-0.085,0.02,0]},
  phao:{pos:[0.2,0.985,-0.25],make(){const g=new T.Group();const c=cyl(0.035,0.035,0.035,M(0xf0f0f0,{roughness:.35}),32);c.rotation.x=Math.PI/2;g.add(c);const n=cyl(0.006,0.006,0.03,M(0xcccccc),12);g.add(at(n,0,-0.045,0));g.add(at(box(0.03,0.012,0.012,M(0x333333)),0,0.035,-0.005));return g},a:[-0.035,0,0]}
 };
 function buildInside(E){
  O.inside.clear();
  if(O.partLabels)O.partLabels.forEach(L=>{L.d.remove();labels.splice(labels.indexOf(L),1)});O.partLabels=[];
  for(let i=picks.length-1;i>=0;i--)if(picks[i].userData.inside)picks.splice(i,1);
  const L=E.linhKien.filter(p=>p!=='voi');let k=0;
  const pos={};
  L.forEach(p=>{
   const D=P3[p]||{pos:[-0.2+0.13*(k++%4),0.985,-0.25],make(){return rbox(0.06,0.05,0.05,0.008,M(0x888888))},a:[0,0,0]};
   const g=D.make(E);at(g,...D.pos);g.traverse(x=>{if(x.isMesh)x.userData.inside=1});
   pickable(g,{part:p});g.traverse(x=>{if(x.isMesh)x.userData.inside=1});
   O.inside.add(g);pos[p]=D;
   const nm=(window.PARTS&&PARTS[p]?PARTS[p].ten:p).split(' (')[0];
   const lb=label(nm,[D.pos[0],D.pos[1]+0.07,D.pos[2]-0.06],'back');O.partLabels.push(lb);
  });
  // dây từ linh kiện về jack PCB
  if(pos.pcb)(E.jack||[]).forEach((j,ji)=>{const D=pos[j.noi];if(!D)return;
   j.day.forEach((w,i)=>{const a=[D.pos[0]+D.a[0],D.pos[1]+D.a[1]+0.01-i*0.006,D.pos[2]],b=[pos.pcb.pos[0]-0.055+ji*0.05,pos.pcb.pos[1]+0.03,pos.pcb.pos[2]-0.012];
    const m=[(a[0]+b[0])/2,Math.max(a[1],b[1])+0.03,(a[2]+b[2])/2-0.02];const wt=tube([a,m,b],0.0022,M(new T.Color(w[2]).getHex(),{roughness:.5}));wt.userData.thru=1;O.inside.add(wt)})});
  O.insideCode=S.code;
 }

 /* ---------- góc nhìn ---------- */
 const VIEWS={truoc:[[1.05,1.38,1.62],[-0.12,0.72,0]],sau:[[0.32,1.32,-0.92],[0,0.97,-0.24]],tren:[[0.3,2.35,0.75],[-0.05,0.8,0]]};
 function view(k,instant){const[p,t]=VIEWS[k];if(instant){cam.position.set(...p);ctrl.target.set(...t);ctrl.update();return}
  Object.assign(tween,{t:0,p0:cam.position.clone(),t0:ctrl.target.clone(),p1:new T.Vector3(...p),t1:new T.Vector3(...t)})}

 /* ---------- chạm ---------- */
 function visible(o){for(;o;o=o.parent)if(!o.visible)return false;return true}
 function pick(e){
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>8)return;
  const r=renderer.domElement.getBoundingClientRect();
  v2.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);
  ray.setFromCamera(v2,cam);
  const hit=ray.intersectObjects(scene.children,true).find(h=>visible(h.object)&&!h.object.userData.thru); // vật đầu tiên tia chạm vào (không chạm xuyên vật khác)
  if(!hit)return;
  let o=hit.object;while(o&&!o.userData.pick)o=o.parent;
  if(o&&onPick)onPick(o.userData.pick);
 }

 /* ---------- vòng lặp ---------- */
 function resize(){const w=el.clientWidth||360,h=Math.round(w/1.15);renderer.setSize(w,h,false);renderer.domElement.style.height=h+'px';cam.aspect=w/h;cam.updateProjectionMatrix()}
 const tmp=new T.Vector3();
 function loop(){
  if(!el.isConnected){running=false;return}
  running=true;requestAnimationFrame(loop);
  if(tween.t<1){tween.t=Math.min(1,tween.t+0.04);const k=1-Math.pow(1-tween.t,3);cam.position.lerpVectors(tween.p0,tween.p1,k);ctrl.target.lerpVectors(tween.t0,tween.t1,k)}
  ctrl.update();
  const b=Math.floor(performance.now()/500)%2===0;if(b!==O.blink){O.blink=b;O.dispTex.userData.draw()}
  renderer.render(scene,cam);
  const w=el.clientWidth,h=renderer.domElement.clientHeight;
  const cz=cam.position.z;labels.forEach(L=>{if(L.hide||(L.side==='front'&&cz<0.1)||(L.side==='back'&&cz>-0.1)){L.d.style.display='none';return}tmp.copy(L.p).project(cam);
   const off=tmp.z>1||Math.abs(tmp.x)>1.05||Math.abs(tmp.y)>1.05;L.d.style.display=off?'none':'';
   if(!off)L.d.style.transform=`translate(${((tmp.x+1)/2*w).toFixed(1)}px,${((1-tmp.y)/2*h).toFixed(1)}px) translate(-50%,-100%)`});
 }

 /* ---------- cập nhật theo trạng thái bài làm ---------- */
 let last={};
 function update(state){
  S=state;if(!built)build();
  if(O.insideCode!==S.code)buildInside(S.E);
  if(last.dien!==S.dien){placePlug(S.dien>0);last.dien=S.dien}
  const on=(m,c)=>{m.material.emissive.setHex(c);m.material.emissiveIntensity=c?1.2:0};
  on(O.btnN,S.dien>=2?0x2fa35a:0);on(O.btnS,S.dien===3?0x2fa35a:0);
  O.btnMat[0].material.color.setHex(S.dien>=2?0x3cc46e:0xc9ced3);O.btnMat[1].material.color.setHex(S.dien===3?0x3cc46e:0xc9ced3);
  O.lever.rotation.y=S.v.hong.includes('voi')?0.35:Math.PI/2;   // song song ống = mở, gần vuông góc = gần khóa
  O.cover.visible=S.nap;O.lNap.hide=!S.nap;
  O.inside.visible=!S.nap;O.partLabels.forEach(L=>L.hide=S.nap);
  if(last.nap&&!S.nap)view('sau');
  last.nap=S.nap;
  O.dispTex.userData.draw();
  if(!running)loop();
 }
 // project: toạ độ 3D → điểm trên màn hình (dùng khi kiểm thử)
 return {ok:()=>true, el, update, set onPick(f){onPick=f}, view,
  project(x,y,z){const r=renderer.domElement.getBoundingClientRect();const v=new T.Vector3(x,y,z).project(cam);return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]}};
})();
