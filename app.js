{
'use strict';
/* ===================== CẤU HÌNH ===================== */
const GOOGLE_FORM = {
 gui:'https://docs.google.com/forms/d/e/1FAIpQLSczsw6AzFjsoI8X_2DVJnz77SK4IQW0w_gytogms70RuKCeuA/formResponse',
 o:{hoTen:'entry.1654364529', maCa:'entry.455765969', maLoi:'entry.792817741', diem:'entry.1588322802', dapAn:'entry.1642753951',
    ktvChon:'entry.404542898', phieuKhop:'entry.1569364676', phieu:'entry.1664251069', ghiChu:'entry.1432781207', nhatKy:'entry.1699485277'}
};
const MIEN_TRU = 4;                               // số lần kiểm tra thừa không bị trừ
const TRU = {antoan:10, saiThang:3, saiDiem:2};    // điểm trừ
const DIEN = ['Đã rút điện · đo nguội','Cắm điện · máy tắt','Bật nguồn','Đang chạy · cấp nước'];
const ic = p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const TOOLS = [
 ['tay','Tay',ic('<path d="M8 12V5.5a1.5 1.5 0 013 0V11M11 11V4a1.5 1.5 0 013 0v7M14 11V5.5a1.5 1.5 0 013 0V12M17 12V9a1.5 1.5 0 013 0v4c0 4.5-3 8-7.5 8-3 0-4.6-1.6-6-4l-2-3.4a1.5 1.5 0 012.5-1.6L8 14.5"/>')],
 ['vom','VOM',ic('<rect x="5" y="2" width="14" height="20" rx="2"/><rect x="7.5" y="4.5" width="9" height="5" rx="1"/><circle cx="12" cy="15.5" r="3"/><path d="M12 15.5l1.6-1.6"/>')],
 ['tuavit','Tua vít',ic('<path d="M15 3l6 6-3 3-6-6z"/><path d="M13.5 8.5L4 18l2 2 9.5-9.5"/>')],
 ['cole','Cờ lê',ic('<path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>')],
 ['apluc','Áp lực',ic('<circle cx="12" cy="13" r="8"/><path d="M12 13l4-4M10 3h4M12 3v2"/>')]
];
const TOOLNAME = Object.fromEntries(TOOLS.map(t=>[t[0],t[1]]));

/* ===================== TIỆN ÍCH ===================== */
const $ = id=>document.getElementById(id);
const esc = x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const rnd = a=>a[Math.floor(Math.random()*a.length)];
const shuffle = a=>a.map(x=>[Math.random(),x]).sort((p,q)=>p[0]-q[0]).map(p=>p[1]);
const uniq = a=>[...new Set(a)];
const pk = (a,b)=>[a,b].sort().join('|');
const isV = sc=>sc==='VAC'||sc==='VDC';
const store = {get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const SCREENS = ['s-start','s-case','s-lab','s-end','s-res'];
const show = id=>{SCREENS.forEach(s=>$(s).classList.toggle('hide',s!==id));window.scrollTo(0,0)};
let S = null;

/* ===================== KIỂM TRA DỮ LIỆU MÃ LỖI ===================== */
const pinsOf = (E,p)=>p==='pcb'?(E.jack||[]).flatMap(j=>j.day.map(d=>j.id+'-'+d[0])):(PARTS[p].pins||[]);
const spotsOf = (E,p)=>p==='pcb'?(E.jack||[]).map(j=>j.id):(PARTS[p].spots||[]);
function kiemDuLieu(code,E){
 const err=[],L=E.linhKien||[];
 L.forEach(p=>{if(!PARTS[p])err.push(`linh kiện "${p}" chưa có trong thư viện`)});
 const ok=L.filter(p=>PARTS[p]),pins=new Set(ok.flatMap(p=>pinsOf(E,p)));
 Object.entries(E.kiemTra||{}).forEach(([id,c])=>{
  if(c.loai==='do'){
   if(!(c.tai||[]).length)err.push(`${id}: thiếu chân đo`);
   if(!['VAC','VDC','Ω','nF'].includes(c.thang))err.push(`${id}: thang đo "${c.thang}" không hợp lệ`);
   (c.tai||[]).flat().forEach(pn=>{if(!pins.has(pn))err.push(`${id}: chân "${pn}" không có`)});
   if(!Array.isArray(c.tot))err.push(`${id}: thiếu giá trị tốt [min,max,số lẻ]`);
  }else{
   const [p,sp]=String(c.tai).split(':');
   if(!ok.includes(p)||!spotsOf(E,p).includes(sp))err.push(`${id}: điểm "${c.tai}" không có`);
  }
 });
 (E.quyTrinh||[]).forEach(g=>(g.buoc||[]).forEach(k=>{if(!E.kiemTra[k])err.push(`quy trình "${g.ten}": bước "${k}" không có`)}));
 (E.nguyenNhan||[]).forEach((n,i)=>[...(n.hong||[]),...(n.canCo||[])].forEach(k=>{if(!E.kiemTra[k])err.push(`nguyên nhân ${i+1}: bước "${k}" không có`)}));
 return err.map(e=>code+': '+e);
}

/* ===================== TRANG CHỦ ===================== */
const CODES = Object.keys(window.MA_LOI||{});
const errs = CODES.flatMap(c=>kiemDuLieu(c,MA_LOI[c]));
if(errs.length){$('dataErr').innerHTML='<b>Dữ liệu mã lỗi đang có lỗi:</b><br>'+errs.map(esc).join('<br>');$('dataErr').classList.remove('hide')}
$('codes').innerHTML = CODES.map((k,i)=>`<label class="code"><input type="radio" name="code" value="${k}"${i?'':' checked'}><b>${esc(k)}</b><span>${esc(MA_LOI[k].ten)}<br><span class="mut">${esc(MA_LOI[k].sanPham)}</span></span></label>`).join('');
const fromHash = ()=>{const h=location.hash.slice(1).toUpperCase(),r=document.querySelector(`input[name=code][value="${h}"]`);if(r)r.checked=true};
fromHash(); addEventListener('hashchange',fromHash);
const me = store.get('ktv'); if(me){$('nm').value=me.nm||'';$('ma').value=me.ma||''}

$('go').onclick = ()=>{
 const nm=$('nm').value.trim(),ma=$('ma').value.trim(),code=(document.querySelector('input[name=code]:checked')||{}).value;
 if(!nm){$('msg').textContent='Vui lòng nhập họ tên.';$('nm').focus();return}
 if(!code){$('msg').textContent='Chưa có mã lỗi nào.';return}
 store.set('ktv',{nm,ma});
 const E=MA_LOI[code],v=rnd(E.nguyenNhan),vals={};
 Object.entries(E.kiemTra).forEach(([id,c])=>{if(Array.isArray(c.tot)){const[a,b,d]=c.tot;vals[id]=(a+Math.random()*(b-a)).toFixed(d)}});
 S={nm,ma,code,E,v,vals,caseId:code+'-'+(1000+Math.floor(Math.random()*9000)),intro:rnd(E.tinhHuong),t0:Date.now(),
    done:{},valid:{},got:{},pen:[],log:[],phieu:{v:{},ghiChu:''},opts:null};
 reset();
 $('c-prod').textContent=E.sanPham;$('c-id').textContent='Mã ca '+S.caseId;$('c-title').textContent=code+' – '+E.ten;$('c-intro').textContent=S.intro;
 $('hd').textContent=S.caseId; show('s-case');
};
$('toLab').onclick = ()=>{buildQT();render();show('s-lab')};
function reset(){Object.assign(S,{dien:2,nap:true,part:null,tool:'tay',thang:null,probe:[],mv:'',mu:'',gv:null,seen:{},quiet:0})}

/* ===================== TRẠNG THÁI & ĐIỂM ===================== */
const ck = id=>S.E.kiemTra[id];
const isBad = id=>S.v.hong.includes(id);
const spotCheck = spot=>Object.keys(S.E.kiemTra).find(id=>ck(id).loai!=='do'&&ck(id).tai===spot);
const log = (t,w)=>S.log.push({t,w});
function say(t,w){$('out').textContent=t;$('out').classList.toggle('w',!!w)}
function tru(t,p){if(S.quiet){log(t,1);say(t,1);return}S.pen.push({t,p});log('⚠ '+t+' (−'+p+')',1);say('⚠ '+t+' (−'+p+' điểm)',1)}
function dem(id){if(!S.quiet)S.done[id]=(S.done[id]||0)+1}
const tongKiem = ()=>Object.values(S.done).reduce((a,b)=>a+b,0);
const truThua = ()=>Math.min(15,2*Math.max(0,tongKiem()-S.v.canCo.length-MIEN_TRU));
const conLai = ()=>Math.max(0,100-S.pen.reduce((a,p)=>a+p.p,0)-truThua());
function needTool(t){if(S.tool===t)return true;say('Cần cầm '+TOOLNAME[t]+' cho thao tác này — chọn ở cột dụng cụ bên phải.',1);return false}

/* ===================== VẼ ===================== */
function H(part){return{
 E:S.E, gv:S.gv,
 pin:(id,x,y)=>{const i=S.probe.indexOf(id),r=i===0?'#e60012':i===1?'#111':'';return `<g class="hs" data-pin="${id}"><circle cx="${x}" cy="${y}" r="18" fill="transparent"/><circle cx="${x}" cy="${y}" r="9" fill="#d4a72c"${r?` stroke="${r}" stroke-width="5"`:''}/></g>`},
 spot:(id,inner)=>`<g class="hs" data-spot="${part}:${id}">${inner}</g>`,
 seen:id=>{const k=spotCheck(part+':'+id);return !!(k&&S.seen[k])},
 bad:id=>{const k=spotCheck(part+':'+id);return !!(k&&S.seen[k]&&isBad(k))}
}}
function machineSvg(){
 const d=S.dien,E=S.E,L=E.linhKien;
 let s=`<svg viewBox="0 0 360 300" class="sv pull" role="img" aria-label="Máy của khách"><rect width="360" height="300" fill="var(--wall)"/><rect y="286" width="360" height="14" fill="#b9ad9b"/>`;
 // vòi nước
 const faucet=`<rect x="0" y="52" width="40" height="14" fill="#9aa3ab"/><rect class="glow" x="32" y="40" width="16" height="40" rx="4" fill="#b8c0c7"/><rect x="26" y="30" width="28" height="8" rx="3" fill="#e60012"/><text x="42" y="18" text-anchor="middle" class="lb">Vòi nước</text>`;
 s+=L.includes('voi')?`<g class="hs" data-part="voi"><rect x="0" y="2" width="84" height="96" fill="transparent"/>${faucet}</g>`:faucet;
 s+=`<path d="M40 80 C 42 160, 80 120, 92 132" stroke="#7b8790" stroke-width="7" fill="none"/>`;
 // ổ điện + phích
 s+=`<g class="hs" data-act="phich"><rect x="8" y="176" width="66" height="84" fill="transparent"/><text x="40" y="192" text-anchor="middle" class="lb">Ổ điện</text><rect class="glow" x="18" y="198" width="44" height="54" rx="6" fill="#fff" stroke="#bbb"/><circle cx="32" cy="225" r="3" fill="#555"/><circle cx="48" cy="225" r="3" fill="#555"/>`;
 s+=d?`<rect x="24" y="210" width="32" height="30" rx="5" fill="#333"/><path d="M40 240 C40 290 100 286 120 270" stroke="#333" stroke-width="5" fill="none"/>`
     :`<rect x="10" y="266" width="30" height="18" rx="4" fill="#333"/><path d="M40 275 C70 282 100 280 120 270" stroke="#333" stroke-width="5" fill="none"/>`;
 s+=`</g>`;
 // thân máy + bảng điều khiển
 s+=`<rect x="92" y="40" width="240" height="246" rx="12" fill="var(--mach)" stroke="#aab1b8"/><rect x="92" y="40" width="240" height="36" rx="12" fill="#3a3f44" stroke="#111"/>`;
 const btn=(act,x,label,on)=>`<g class="hs" data-act="${act}"><rect class="glow" x="${x}" y="46" width="52" height="24" rx="12" fill="${on?'#2fa35a':'#c9ced3'}"/><text x="${x+26}" y="62" text-anchor="middle" style="font-size:12px;font-weight:700;fill:${on?'#fff':'#333'}">${label}</text></g>`;
 s+=btn('nguon',100,'Nguồn',d>=2)+btn('start',158,'Start',d===3);
 s+=`<rect x="250" y="47" width="70" height="22" rx="3" fill="#111"/>`;
 if(d===2)s+=`<text x="285" y="63" text-anchor="middle" fill="#ff3b3b" class="blink" style="font:15px 'Share Tech Mono',monospace">${esc(S.code)}</text>`;
 if(d===3)s+=`<text x="285" y="63" text-anchor="middle" fill="#4cd07d" class="blink" style="font:13px 'Be Vietnam Pro',sans-serif;font-weight:700">Cấp nước</text>`;
 s+=`<text x="212" y="262" text-anchor="middle" style="font:700 18px 'Be Vietnam Pro',sans-serif;letter-spacing:3px" fill="#e60012">TOSHIBA</text>`;
 if(S.nap){
  s+=`<g class="hs" data-act="nap"><rect class="glow" x="102" y="86" width="220" height="116" rx="6" fill="#3b4045" stroke="#555"/>`;
  [[112,96],[312,96],[112,192],[312,192]].forEach(([x,y])=>s+=`<circle cx="${x}" cy="${y}" r="4" fill="#8a929a"/>`);
  s+=`<text x="212" y="140" text-anchor="middle" style="font-size:13px;font-weight:600;fill:#eee">Nắp kỹ thuật</text><text x="212" y="158" text-anchor="middle" style="font-size:12px;fill:#bbb">dùng tua vít để tháo</text></g>`;
 }else{
  s+=`<rect x="102" y="86" width="220" height="116" rx="6" fill="#2a2f33"/>`;
  const pc=PARTS.pcb.slot;
  (E.jack||[]).forEach(j=>{const P=PARTS[j.noi];if(!P||!P.slot||!L.includes(j.noi))return;
   const x1=P.slot[0]+P.anchor[0],y1=P.slot[1]+P.anchor[1],left=x1<pc[0],x2=pc[0]+(left?0:70),y2=pc[1]+14,m=(x1+x2)/2;
   j.day.forEach((w,i)=>s+=`<path d="M${x1} ${y1+i*4} C${m} ${y1+i*4-8},${m} ${y2+i*4+8},${x2} ${y2+i*4}" stroke="${w[2]}" stroke-width="3" fill="none"/>`)});
  L.filter(p=>PARTS[p]&&PARTS[p].mini).forEach(p=>{const[x,y]=PARTS[p].slot;s+=`<g class="hs" data-part="${p}" transform="translate(${x} ${y})">${PARTS[p].mini(H(p))}</g>`});
 }
 return s+`</svg>`;
}
const zoomSvg = p=>`<svg viewBox="0 0 360 240" class="sv pull" role="img" aria-label="${esc(PARTS[p].ten)}"><defs><pattern id="mesh" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 0L6 6M6 0L0 6" stroke="#888" stroke-width=".8"/></pattern></defs>${PARTS[p].zoom(H(p))}</svg>`;
function meterSvg(){
 const pos=[['OFF',200],['VAC',245],['VDC',290],['Ω',335],['nF',20]],cx=272,cy=88,cur=S.thang||'OFF',a=pos.find(p=>p[0]===cur)[1]*Math.PI/180;
 let s=`<svg viewBox="0 0 360 170" class="sv" role="img" aria-label="Đồng hồ vạn năng"><rect width="360" height="170" rx="18" fill="#2b2f2a"/><rect x="14" y="14" width="178" height="96" rx="8" fill="#c9d6b8"/>`;
 s+=`<text x="22" y="32" class="lcds">${cur}</text><text x="182" y="86" text-anchor="end" class="lcdv">${esc(S.mv||(S.thang?'----':''))}</text><text x="182" y="104" text-anchor="end" class="lcdu">${esc(S.mu)}</text>`;
 s+=`<circle cx="26" cy="138" r="7" fill="#e60012"/><text x="40" y="143" class="pl">Que đỏ: ${S.probe[0]||'—'}</text><circle cx="168" cy="138" r="7" fill="#111" stroke="#888"/><text x="182" y="143" class="pl">Que đen: ${S.probe[1]||'—'}</text>`;
 s+=`<circle cx="${cx}" cy="${cy}" r="40" fill="#1a1c1a" stroke="#555" stroke-width="3"/><line x1="${cx}" y1="${cy}" x2="${(cx+32*Math.cos(a)).toFixed(1)}" y2="${(cy+32*Math.sin(a)).toFixed(1)}" stroke="#ffd23f" stroke-width="7" stroke-linecap="round"/>`;
 pos.forEach(([n,dg])=>{const r=dg*Math.PI/180,x=(cx+62*Math.cos(r)).toFixed(1),y=(cy+62*Math.sin(r)).toFixed(1),on=n===cur;
  s+=`<g class="hs" data-s="${n}"><circle cx="${x}" cy="${y}" r="17" fill="${on?'#ffd23f':'#3a3f39'}"/><text x="${x}" y="${+y+4}" text-anchor="middle" class="dl" fill="${on?'#111':'#eee'}">${n}</text></g>`});
 return s+`</svg>`;
}
function gaugeSvg(){
 const c=Object.values(S.E.kiemTra).find(x=>x.loai==='apluc')||{},[lo,hi]=c.chuan||[0,1];
 const v=S.gv==null?0:Math.min(1,+S.gv),ang=t=>Math.PI*(0.75+1.5*t),cx=110,cy=88,R=62;
 const P=t=>[(cx+R*Math.cos(ang(t))).toFixed(1),(cy+R*Math.sin(ang(t))).toFixed(1)];
 const arc=(a0,a1,col)=>{const[p0,q0]=P(a0),[p1,q1]=P(a1);return `<path d="M${p0} ${q0} A${R} ${R} 0 ${(a1-a0)*1.5>1?1:0} 1 ${p1} ${q1}" stroke="${col}" stroke-width="8" fill="none"/>`};
 let s=`<svg viewBox="0 0 360 170" class="sv" role="img" aria-label="Đồng hồ áp lực nước"><rect width="360" height="170" rx="18" fill="#2b2f2a"/><circle cx="${cx}" cy="${cy}" r="76" fill="#f7f7f2" stroke="#999" stroke-width="4"/>`;
 s+=arc(0,lo,'#e60012')+arc(lo,hi,'#2fa35a')+arc(hi,1,'#e60012');
 [0,0.2,0.4,0.6,0.8,1].forEach(t=>{const a=ang(t);s+=`<text x="${(cx+46*Math.cos(a)).toFixed(1)}" y="${(cy+46*Math.sin(a)+4).toFixed(1)}" text-anchor="middle" style="font-size:12px;fill:#333">${t}</text>`});
 s+=`<text x="${cx}" y="${cy+34}" text-anchor="middle" style="font-size:12px;fill:#333">MPa</text><line x1="${cx}" y1="${cy}" x2="${(cx+58*Math.cos(ang(v))).toFixed(1)}" y2="${(cy+58*Math.sin(ang(v))).toFixed(1)}" stroke="#e60012" stroke-width="4" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="6" fill="#333"/>`;
 s+=`<text x="210" y="62" class="pl" style="font-size:14px">Đồng hồ áp lực nước</text><text x="210" y="106" style="font:34px 'Share Tech Mono',monospace;fill:#ffd23f">${S.gv==null?'--':esc(S.gv)}</text><text x="210" y="128" class="pl">MPa · vùng xanh ${String(lo).replace('.',',')}–${String(hi).replace('.',',')}</text>`;
 return s+`</svg>`;
}
const has3D=()=>!!(window.May3D&&May3D.ok());
const has3DPart=p=>!!(window.LK3D&&LK3D.ok()&&LK3D.has(p));
function hint(){
 if(S.part)return (has3DPart(S.part)?'Kéo để xoay linh kiện. ':'')+PARTS[S.part].goiY;
 if(has3D()){
  if(S.nap)return 'Kéo để xoay máy. Nắp kỹ thuật ở phía sau hộp điều khiển. '+(S.dien?'Rút điện (chạm ổ điện trên tường), ':'')+'cầm tua vít, bấm "Mặt sau" rồi chạm nắp để tháo.';
  return 'Chạm van, PCB hoặc phao để lấy ra kiểm tra. Đo nguội: rút điện. Đo nóng: cắm điện → Nguồn → Start (bấm "Mặt trước" để thấy nút).';
 }
 if(S.nap)return S.dien?'Muốn tháo nắp: rút điện ở ổ điện, cầm tua vít, chạm nắp kỹ thuật.':'Cầm tua vít rồi chạm nắp kỹ thuật để tháo.';
 return 'Chạm linh kiện để lấy ra kiểm tra. Đo nguội: rút điện. Đo nóng: cắm điện → Nguồn → Start.';
}
function render(){
 const p=S.part;
 if(!p&&has3D()){if($('view').firstChild!==May3D.el){$('view').innerHTML='';$('view').appendChild(May3D.el)}May3D.update(S)}
 else if(p&&has3DPart(p)){if($('view').firstChild!==LK3D.el){$('view').innerHTML='';$('view').appendChild(LK3D.el)}LK3D.show(S,p)}
 else $('view').innerHTML=p?zoomSvg(p):machineSvg();
 $('view').style.background=(!p||p==='voi')?'var(--wall)':'var(--bench)';
 $('v-title').textContent=p?PARTS[p].ten:'Máy của khách';
 $('backMach').classList.toggle('hide',!p);
 $('hint').textContent=hint();
 $('st-diem').textContent='Điểm còn '+conLai()+'/100';
 $('st-dien').textContent=DIEN[S.dien];$('st-dien').dataset.s=S.dien;
 $('st-tool').textContent='Đang cầm: '+TOOLNAME[S.tool];
 $('tools').innerHTML=TOOLS.map(([id,n,svg])=>`<button class="tool${S.tool===id?' on':''}" data-t="${id}" aria-pressed="${S.tool===id}">${svg}<span>${n}</span></button>`).join('');
 $('inst').innerHTML=S.tool==='vom'?meterSvg():S.tool==='apluc'?gaugeSvg():'';
 updQT();
 $('logn').textContent=S.log.length;
 $('log').innerHTML=S.log.length?S.log.slice().reverse().map(x=>`<div class="${x.w?'w':''}">${esc(x.t)}</div>`).join(''):'<div class="mut">Chưa có thao tác nào.</div>';
}

/* ===================== QUY TRÌNH KIỂM TRA ===================== */
function pinName(pin){
 const m=/^(.+)-([^-]+)$/.exec(pin),j=m&&(S.E.jack||[]).find(x=>x.id===m[1]);
 if(j){const d=j.day.find(x=>x[0]===m[2]);return j.id+' dây '+(d?d[1]:m[2])}
 return pin.replace(/^P(\d)$/,'chân $1');
}
function partOf(c){
 if(c.loai!=='do')return String(c.tai).split(':')[0];
 const pin=c.tai[0][0];return S.E.linhKien.find(p=>PARTS[p]&&pinsOf(S.E,p).includes(pin));
}
function cachLam(id){
 const c=ck(id),p=partOf(c),P=PARTS[p]||{},r=[];
 const tool=c.loai==='do'?'VOM, xoay núm sang <b>'+c.thang+'</b>':c.loai==='apluc'?'Đồng hồ áp lực':TOOLNAME[c.dungCu||'tay'];
 r.push('Dụng cụ: '+tool);
 let dien='';
 if(c.loai==='do'&&!isV(c.thang))dien='<b>Rút điện</b> (đo nguội)';
 else if(c.loai==='do')dien=c.can==='chay'?'<b>Cắm điện → bấm Nguồn → bấm Start</b> (đo nóng, máy đang chạy)':'<b>Cắm điện → bấm Nguồn</b> (đo nóng)';
 else if(c.nguoi)dien='<b>Rút điện</b> trước khi chạm vào jack';
 if(dien)r.push('Điện: '+dien);
 if(!P.ngoai)r.push('Mở máy: rút điện, cầm tua vít, chạm nắp kỹ thuật'+(c.loai==='do'&&isV(c.thang)?'; tháo xong mới cắm điện lại':''));
 if(c.loai==='do')r.push('Vị trí: '+esc(P.ten||p)+' → que đỏ '+esc(pinName(c.tai[0][0]))+', que đen '+esc(pinName(c.tai[0][1]))+(c.tai.length>1?' (hoặc cặp chân khác trong jack)':''));
 else{const sp=String(c.tai).split(':')[1];r.push('Vị trí: '+esc(P.ten||p)+' → chạm '+esc(p==='pcb'?'vỏ jack '+sp:sp.replace(/-/g,' ')))}
 if(c.chuanTxt)r.push('Chuẩn: <b>'+esc(c.chuanTxt)+'</b>');
 return r;
}
function buildQT(){
 const E=S.E,G=E.quyTrinh&&E.quyTrinh.length?E.quyTrinh:[{ten:'Các bước kiểm tra',buoc:Object.keys(E.kiemTra)}];
 $('qt-title').textContent='Quy trình kiểm tra '+S.code;
 $('qt-body').innerHTML=G.map(g=>`<div class="qg">${esc(g.ten)}</div>`+(g.ghiChu?`<p class="qn">${esc(g.ghiChu)}</p>`:'')+
  (g.buoc||[]).map(id=>`<details class="qs" data-q="${id}"><summary><span class="ic">○</span><span>${esc(ck(id).ten)}</span><span class="ch">${esc(ck(id).chuanTxt||'')}</span></summary><ul>${cachLam(id).map(x=>`<li>${x}</li>`).join('')}</ul></details>`).join('')).join('');
}
function updQT(){document.querySelectorAll('#qt-body .qs').forEach(el=>{const ok=!!S.valid[el.dataset.q];el.classList.toggle('ok',ok);el.querySelector('.ic').textContent=ok?'✓':'○'})}

/* ===================== THAO TÁC ===================== */
function onAct(a){
 if(a==='phich'){S.dien=S.dien?0:1;log(S.dien?'Cắm điện':'Rút điện');say(S.dien?'Đã cắm điện. Bấm Nguồn trên bảng điều khiển để bật máy.':'Đã rút điện — được tháo nắp, kiểm tra jack và đo nguội (Ω, nF).');return}
 if(a==='nguon'){if(!S.dien){say('Máy chưa cắm điện.',1);return}S.dien=S.dien>=2?1:2;log(S.dien===2?'Bật nguồn':'Tắt nguồn');say(S.dien===2?'Máy đã bật nguồn — board có điện (đo được điện áp nguồn cấp cho cảm biến). Bấm Start để máy chạy.':'Đã tắt nguồn máy.');return}
 if(a==='start'){if(S.dien<2){say('Bật Nguồn trước rồi mới bấm Start.',1);return}S.dien=S.dien===3?2:3;log(S.dien===3?'Bấm Start – máy chạy':'Tạm dừng máy');say(S.dien===3?'Máy đang chạy bước cấp nước — đo được điện áp board cấp cho van (VAC).':'Máy đã tạm dừng.');return}
 if(a==='nap'){if(!needTool('tuavit'))return;if(S.dien)tru('Tháo nắp kỹ thuật khi máy còn điện',TRU.antoan);S.nap=false;log('Tháo nắp kỹ thuật');if(!S.dien)say('Đã tháo nắp. Chạm linh kiện để lấy ra kiểm tra.')}
}
function onSpot(spot){
 const id=spotCheck(spot);if(!id){say('Chưa có bước kiểm tra nào ở điểm này.');return}
 const c=ck(id);
 if(c.loai==='apluc'){if(!needTool('apluc'))return;dem(id);S.valid[id]=S.seen[id]=1;S.gv=isBad(id)?c.hong:S.vals[id];S.got[id]=S.gv;const t=c.ten+': '+S.gv+' '+c.dv;log(t);say(t);return}
 if(!needTool(c.dungCu||'tay'))return;
 dem(id);const unsafe=c.nguoi&&S.dien>0;
 if(unsafe)tru('Kiểm tra '+c.ten+' khi máy còn điện',TRU.antoan);
 S.valid[id]=S.seen[id]=1;S.got[id]=isBad(id)?'Bất thường':'Tốt';
 const t=c.ten+': '+(isBad(id)?c.hong:c.tot);log(t);if(!unsafe)say(t);
}
function onPin(pin){
 if(!needTool('vom'))return;
 if(S.probe.length>=2)S.probe=[];
 if(S.probe[0]===pin)return;
 S.probe.push(pin);
 if(S.probe.length===2)measure();else{S.mv='';S.mu='';say('Que đỏ ở '+pin+'. Chạm điểm thứ hai để đặt que đen.')}
}
function measure(){
 const[a,b]=S.probe,sc=S.thang,E=S.E;
 if(!sc){S.mv='';log('Đồng hồ đang OFF',1);say('Đồng hồ đang OFF — xoay núm chọn thang đo.',1);return}
 if(!isV(sc)&&S.dien){tru('Đo '+sc+' khi máy còn điện',TRU.antoan);S.mv='Err';S.mu='';return}
 const key=pk(a,b),at=Object.keys(E.kiemTra).filter(id=>ck(id).loai==='do'&&ck(id).tai.some(p=>pk(p[0],p[1])===key));
 const blank=()=>{S.mv=isV(sc)?'0.0':'OL';S.mu=isV(sc)?'V':sc};
 if(!at.length){tru('Đặt que sai điểm ('+a+' – '+b+')',TRU.saiDiem);blank();return}
 const id=at.find(i=>ck(i).thang===sc);
 if(!id){dem(at[0]);tru('Đo sai thang '+sc+' tại '+ck(at[0]).ten,TRU.saiThang);blank();return}
 const c=ck(id);dem(id);
 if(isV(sc)){const need=c.can==='chay'?3:2;
  if(S.dien<need){S.mv=sc==='VAC'?'0.0':'0.00';S.mu='V';const t=c.ten+': '+S.mv+' V — '+(need===3?'máy chưa chạy (cần bấm Start)':'máy chưa bật nguồn')+', số đo không có giá trị';log(t,1);say(t,1);return}}
 S.valid[id]=1;S.mv=isBad(id)?c.hong:S.vals[id];S.mu=c.dv;S.got[id]=S.mv;
 const t=c.ten+': '+S.mv+' '+c.dv;log(t);say(t);
}
function handle(d){
 if(d.pin)onPin(d.pin);
 else if(d.spot)onSpot(d.spot);
 else if(d.part){S.part=d.part;S.probe=[];S.mv='';log('Lấy ra kiểm tra: '+PARTS[d.part].ten);say('Đang kiểm tra '+PARTS[d.part].ten+'.')}
 else onAct(d.act);
 render();
}
$('view').onclick=e=>{if(e.target.closest('.m3d'))return;const g=e.target.closest('[data-pin],[data-spot],[data-part],[data-act]');if(g)handle(g.dataset)};
if(has3D())May3D.onPick=d=>{if(S)handle(d)};
if(window.LK3D&&LK3D.ok())LK3D.onPick=d=>{if(S)handle(d)};
$('inst').onclick=e=>{const g=e.target.closest('[data-s]');if(!g)return;
 S.thang=g.dataset.s==='OFF'?null:g.dataset.s;S.mv='';S.mu='';
 if(S.probe.length===2&&S.thang){S.quiet=1;measure();S.quiet=0}
 render()};
$('tools').onclick=e=>{const b=e.target.closest('[data-t]');if(!b)return;S.tool=b.dataset.t;S.probe=[];render();say('Đang cầm: '+TOOLNAME[S.tool]+'.')};
$('backMach').onclick=()=>{S.part=null;S.probe=[];render();say('Đã lắp linh kiện vào máy.')};
$('restart').onclick=()=>{reset();log('↺ Làm lại ca (giữ nguyên điểm trừ và các bước đã làm)',1);render();say('Đã đưa máy về trạng thái ban đầu. Điểm trừ trước đó vẫn giữ nguyên.')};

/* ===================== PHIẾU BIÊN BẢN ===================== */
function savePhieu(){document.querySelectorAll('#p-rows [data-k]').forEach(el=>S.phieu.v[el.dataset.k]=el.value);S.phieu.ghiChu=$('p-note').value}
$('toEnd').onclick=()=>{
 const E=S.E;
 if(!S.opts)S.opts={c:shuffle(uniq(E.nguyenNhan.map(n=>n.ten))),a:shuffle(uniq(E.nguyenNhan.map(n=>n.xuLy)))};
 $('p-head').textContent=`KTV: ${S.nm}${S.ma?' ('+S.ma+')':''} · Mã ca ${S.caseId} · ${S.code} – ${E.ten}`;
 $('p-rows').innerHTML=Object.entries(E.kiemTra).map(([id,c])=>{const v=S.phieu.v[id]||'';
  const f=c.loai==='xem'?`<select data-k="${id}"><option value="">Chưa kiểm tra</option>${['Tốt','Bất thường'].map(o=>`<option${o===v?' selected':''}>${o}</option>`).join('')}</select>`
   :`<input data-k="${id}" inputmode="decimal" placeholder="${esc(c.dv)}" value="${esc(v)}">`;
  return `<tr><td>${esc(c.ten)}${c.dv?' ('+esc(c.dv)+')':''}</td><td>${f}</td></tr>`}).join('');
 $('p-note').value=S.phieu.ghiChu;
 $('causes').innerHTML=S.opts.c.map((c,i)=>`<label class="opt"><input type="radio" name="c" value="${i}"><span>${esc(c)}</span></label>`).join('');
 $('acts').innerHTML=S.opts.a.map((a,i)=>`<label class="opt"><input type="radio" name="a" value="${i}"><span>${esc(a)}</span></label>`).join('');
 $('emsg').textContent='';show('s-end');
};
$('p-rows').oninput=$('p-rows').onchange=$('p-note').oninput=savePhieu;
$('back').onclick=()=>{savePhieu();render();show('s-lab')};

/* ===================== NỘP BÀI ===================== */
function formUrl(f){
 if(!GOOGLE_FORM.gui)return '';
 try{const u=new URL(GOOGLE_FORM.gui);Object.entries(GOOGLE_FORM.o).forEach(([k,e])=>{if(e)u.searchParams.set(e,String(f[k]??'').slice(0,1200))});u.searchParams.set('submit','Submit');return u.toString()}catch(e){return ''}
}
$('submit').onclick=ev=>{
 const ci=document.querySelector('input[name=c]:checked'),ai=document.querySelector('input[name=a]:checked');
 if(!ci||!ai){ev.preventDefault();$('emsg').textContent='Chọn cả nguyên nhân và cách xử lý.';return}
 savePhieu();
 const E=S.E,v=S.v,cause=S.opts.c[+ci.value],act=S.opts.a[+ai.value],okC=cause===v.ten,okA=act===v.xuLy;
 const missing=v.canCo.filter(id=>!S.valid[id]),total=tongKiem();
 // đối chiếu phiếu
 const P=[];let khop=0,tong=0;
 Object.entries(S.got).forEach(([id,real])=>{const c=ck(id),w=(S.phieu.v[id]||'').trim();tong++;
  let m;if(c.loai==='xem')m=w===real;else{const rv=parseFloat(real),wv=parseFloat(w.replace(',','.'));m=isNaN(rv)?/ol/i.test(w):(!isNaN(wv)&&Math.abs(wv-rv)<=Math.max(Math.abs(rv)*0.05,0.02))}
  if(m)khop++;P.push(`<div class="${m?'':'w'}">${esc(c.ten)}: thực tế <b>${esc(real)}${c.loai==='xem'?'':' '+esc(c.dv)}</b> – phiếu ghi <b>${esc(w||'(trống)')}</b> ${m?'✓':'✗'}</div>`)});
 Object.entries(S.phieu.v).forEach(([id,w])=>{if(w&&!S.got[id]){tong++;P.push(`<div class="w">${esc(ck(id).ten)}: phiếu ghi <b>${esc(w)}</b> nhưng chưa thực hiện bước này ✗</div>`)}});
 // chấm điểm
 let pts=0;const L=[],sc=(n,g,m)=>{pts+=g;L.push(`<div><span>${n}</span><b class="${g===m?'good':'bad'}">${g}/${m}</b></div>`)};
 sc('Xác định đúng nguyên nhân',okC?40:0,40);
 sc('Chọn đúng cách xử lý',okA?20:0,20);
 sc('Có đủ bước kiểm tra làm căn cứ',okC?Math.round(25*(1-missing.length/v.canCo.length)):0,25);
 sc('Quy trình gọn',15-truThua(),15);
 const pen=S.pen.reduce((a,p)=>a+p.p,0);pts=Math.max(0,pts-pen);
 if(pen)L.push(`<div><span>Trừ an toàn / đo sai</span><b class="bad">−${pen}</b></div>`);
 const mins=Math.max(1,Math.round((Date.now()-S.t0)/60000));
 L.push(`<div><span>Thời gian · số lần kiểm tra</span><b>${mins} phút · ${total}</b></div>`,`<div><span>Ghi phiếu khớp</span><b>${khop}/${tong}</b></div>`);
 const notes=[`Đáp án: <b>${esc(v.ten)}</b> → ${esc(v.xuLy)}`];
 if(!okC||!okA)notes.push('Bạn chọn: '+esc(cause)+' → '+esc(act));
 if(okC&&missing.length)notes.push('Đúng nguyên nhân nhưng thiếu căn cứ: '+missing.map(id=>esc(ck(id).ten)).join('; '));
 S.pen.forEach(p=>notes.push('⚠ '+esc(p.t)+' (−'+p.p+')'));
 if(S.phieu.ghiChu)P.push(`<div>Ghi chú: ${esc(S.phieu.ghiChu)}</div>`);
 // hiển thị
 $('r-who').textContent=S.nm+(S.ma?' · '+S.ma:'')+' · '+S.caseId;
 $('r-score').textContent=pts;$('r-list').innerHTML=L.join('');$('r-notes').innerHTML=notes.map(n=>`<div>${n}</div>`).join('');
 $('r-phieu').innerHTML=P.length?P.join(''):'<div class="mut">Phiếu chưa ghi số liệu nào.</div>';
 const phieuTxt=Object.entries(S.phieu.v).filter(x=>x[1]).map(([id,w])=>ck(id).ten+' = '+w).join('; ')||'(trống)';
 const f={hoTen:S.nm+(S.ma?' ('+S.ma+')':''),maCa:S.caseId,maLoi:S.code,diem:pts+'/100',dapAn:v.ten+' → '+v.xuLy,ktvChon:cause+' → '+act,
   phieuKhop:khop+'/'+tong,phieu:phieuTxt,ghiChu:S.phieu.ghiChu,nhatKy:(S.pen.length?'LỖI: '+S.pen.map(x=>x.t+' (−'+x.p+')').join('; ')+'\n':'')+'NHẬT KÝ: '+S.log.map(x=>x.t).join(' | ')};
 const url=formUrl(f);
 if(url){$('submit').href=url;$('resend').href=url}else ev.preventDefault();
 $('sentNote').classList.toggle('hide',!url);$('resend').classList.toggle('hide',!url);
 S.text=`[Mô phỏng ${S.code}] ${f.hoTen} – ${S.caseId}\nĐiểm: ${f.diem} – ${mins} phút – ${total} lần kiểm tra\nĐáp án: ${f.dapAn}\nKTV chọn: ${f.ktvChon}\nGhi phiếu khớp: ${f.phieuKhop}\nPhiếu: ${phieuTxt}${S.phieu.ghiChu?'\nGhi chú: '+S.phieu.ghiChu:''}\nLỗi thao tác: ${S.pen.length?S.pen.map(p=>p.t).join('; '):'không'}`;
 show('s-res');
};
$('copy').onclick=()=>{navigator.clipboard.writeText(S.text).then(()=>$('cmsg').textContent='Đã sao chép.',()=>$('cmsg').textContent=S.text)};
$('again').onclick=()=>{S=null;$('hd').textContent='';$('cmsg').textContent='';show('s-start')};
}
