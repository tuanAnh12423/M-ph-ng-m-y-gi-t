/* =====================================================================
   THƯ VIỆN LINH KIỆN — hình vẽ + điểm chạm + chân đo
   Mã lỗi chỉ cần ghi tên linh kiện (vd 'van') trong ma-loi.js.
   Mỗi linh kiện:
     ten    : tên hiển thị
     ngoai  : true nếu nằm ngoài máy (không cần tháo nắp)
     slot   : vị trí vẽ thu nhỏ trong khoang kỹ thuật [x,y]
     anchor : điểm nối dây trên hình thu nhỏ [x,y]
     spots  : các điểm chạm để quan sát (dùng trong ma-loi.js: 'van:luoi-loc')
     pins   : các chân đo VOM (PCB lấy chân từ danh sách jack của mã lỗi)
     goiY   : gợi ý thao tác khi đang xem linh kiện
     mini(h): hình thu nhỏ trong máy · zoom(h): hình phóng to (khung 360×240)
   h = công cụ vẽ do app cung cấp: h.pin(id,x,y) · h.spot(id,svg) · h.seen(id) · h.bad(id) · h.E · h.gv
   ===================================================================== */
window.PARTS = {

 voi:{
  ten:'Vòi nước & ống cấp', ngoai:true,
  spots:['tay-van','dau-noi'], pins:[],
  goiY:'Cầm tay rồi chạm tay vặn để mở vòi và quan sát. Cầm đồng hồ áp lực rồi chạm đầu nối ống để đo áp lực.',
  zoom(h){
   let s=`<rect width="360" height="240" fill="var(--wall)"/><rect x="0" y="80" width="150" height="34" fill="#9aa3ab"/><rect x="140" y="60" width="74" height="80" rx="10" fill="#c3cad0"/>`;
   s+=h.spot('tay-van',`<rect x="100" y="16" width="160" height="56" fill="transparent"/><rect class="glow" x="112" y="26" width="136" height="24" rx="8" fill="#e60012"/><rect x="170" y="48" width="16" height="14" fill="#888"/><text x="180" y="43" text-anchor="middle" class="lw">Tay vặn</text>`);
   s+=`<path d="M177 140 C177 210, 260 170, 340 232" stroke="#7b8790" stroke-width="16" fill="none"/>`;
   s+=h.spot('dau-noi',`<circle cx="177" cy="150" r="22" fill="transparent"/><rect class="glow" x="165" y="138" width="24" height="22" rx="4" fill="#d4a72c"/><text x="198" y="156" class="lb">Đầu nối ống</text>`);
   if(h.seen('tay-van'))s+=h.bad('tay-van')
     ?`<text x="250" y="120" class="lb">Nước yếu</text><circle cx="232" cy="140" r="3" fill="#3b8bd6"/><circle cx="240" cy="152" r="3" fill="#3b8bd6"/>`
     :`<text x="250" y="120" class="lb">Nước mạnh</text><path d="M226 132 l8 22 M236 130 l8 24 M246 130 l8 22" stroke="#3b8bd6" stroke-width="3"/>`;
   if(h.gv!=null){const a=Math.PI*(0.75+1.5*Math.min(1,+h.gv));
    s+=`<circle cx="60" cy="190" r="30" fill="#fff" stroke="#333" stroke-width="3"/><path d="M60 190 l${(18*Math.cos(a)).toFixed(1)} ${(18*Math.sin(a)).toFixed(1)}" stroke="#e60012" stroke-width="3"/><path d="M88 186 C120 180,150 170,166 152" stroke="#333" stroke-width="4" fill="none"/>`}
   return s;
  }
 },

 ongcap:{
  ten:'Ống cấp nước', ngoai:true, spots:['gap'], pins:[],
  goiY:'Cầm tay rồi chạm ống cấp để kiểm tra ống có bị gập, xoắn không.',
  zoom(h){
   const k=h.badNow('gap'),d=k?'M20 60 C120 60,150 70,170 120 L150 150 L200 140 C230 190,280 200,340 205':'M20 60 C140 60,200 120,240 170 C270 200,300 205,340 205';
   let s=`<rect width="360" height="240" fill="var(--wall)"/><rect y="180" width="360" height="60" fill="#c9b99c"/>`;
   s+=h.spot('gap',`<path d="${d}" stroke="transparent" stroke-width="34" fill="none"/><path class="glow" d="${d}" stroke="#9aa3ab" stroke-width="12" fill="none" stroke-linejoin="round"/><text x="24" y="44" class="lb">Ống cấp nước${k?' – bị gập':''}</text>`);
   return s;
  }
 },

 ongxa:{
  ten:'Ống xả', ngoai:true, spots:['vi-tri'], pins:[],
  goiY:'Cầm tay rồi chạm ống xả để kiểm tra vị trí ống xả và đầu ống trong cống.',
  zoom(h){
   const k=h.badNow('vi-tri'),d=k?'M40 120 C60 200,120 205,200 205 L262 214':'M40 120 C60 40,140 30,200 50 C250 70,262 120,262 196';
   let s=`<rect width="360" height="240" fill="var(--wall)"/><rect y="200" width="360" height="40" fill="#c9b99c"/><rect x="0" y="80" width="44" height="120" fill="#24282c"/>`;
   s+=`<ellipse cx="262" cy="206" rx="34" ry="8" fill="#555"/>`+(k?'':`<rect x="186" y="34" width="10" height="26" fill="#888"/>`);
   s+=h.spot('vi-tri',`<path d="${d}" stroke="transparent" stroke-width="30" fill="none"/><path class="glow" d="${d}" stroke="#7d8790" stroke-width="12" fill="none"/><text x="60" y="${k?150:24}" class="lb">${k?'Ống xả nằm sàn, cắm sâu xuống cống':'Ống xả treo đúng độ cao'}</text>`);
   return s;
  }
 },

 van:{
  ten:'Van cấp nước', slot:[108,104], anchor:[44,8],
  spots:['luoi-loc'], pins:['T1','T2'],
  goiY:'Cầm cờ lê rồi chạm lưới lọc để tháo ống xem lưới lọc. Cầm VOM, chạm T1 rồi T2 để đo cuộn dây.',
  mini:()=>`<rect class="glow" width="44" height="30" rx="6" fill="#2f6db5"/><rect x="-12" y="8" width="14" height="14" fill="#c9ced3"/><text x="22" y="48" text-anchor="middle" class="lw">Van cấp</text>`,
  zoom(h){
   const dirty=h.bad('luoi-loc');
   let s=`<rect width="360" height="240" fill="var(--bench)"/><rect x="24" y="92" width="88" height="56" rx="6" fill="#d8dde2"/>`;
   s+=h.spot('luoi-loc',`<circle class="glow" cx="66" cy="120" r="32" fill="${dirty?'#8a6a3a':'#eef2f5'}" stroke="#999"/><circle cx="66" cy="120" r="30" fill="url(#mesh)"/>${dirty?'<circle cx="58" cy="112" r="9" fill="#6b5028"/><circle cx="76" cy="128" r="7" fill="#6b5028"/>':''}<text x="66" y="178" text-anchor="middle" class="lb">Lưới lọc</text>`);
   s+=`<rect x="112" y="78" width="150" height="84" rx="14" fill="#2f6db5"/><text x="187" y="128" text-anchor="middle" class="lw" style="font-size:15px">VAN CẤP</text><rect x="262" y="104" width="74" height="32" rx="6" fill="#d8dde2"/>`;
   s+=`<rect x="157" y="48" width="10" height="32" fill="#c9a227"/><rect x="207" y="48" width="10" height="32" fill="#c9a227"/>`+h.pin('T1',162,40)+h.pin('T2',212,40);
   s+=`<text x="162" y="18" text-anchor="middle" class="lb">T1</text><text x="212" y="18" text-anchor="middle" class="lb">T2</text>`;
   return s;
  }
 },

 pcb:{
  ten:'Bo mạch PCB', slot:[172,98], anchor:[0,14],
  goiY:'Rút điện, cầm tay rồi chạm vỏ jack để kiểm tra jack. Cầm VOM, chạm 2 chân trong jack để đo (đo nóng: cắm điện → Nguồn → Start).',
  mini:h=>`<rect class="glow" width="70" height="56" rx="4" fill="#1f6b3a"/>`+(h.E.jack||[]).map((j,i)=>`<rect x="${8+i*30}" y="8" width="22" height="10" fill="#f4f4f4"/>`).join('')+`<rect x="18" y="32" width="22" height="14" fill="#111"/><text x="35" y="74" text-anchor="middle" class="lw">PCB</text>`,
  zoom(h){
   let s=`<rect x="8" y="12" width="344" height="216" rx="10" fill="#1f6b3a"/><path d="M30 196 H150 V172 M220 206 H330 M60 168 V186 H120" stroke="#3e9a5c" stroke-width="3" fill="none"/><rect x="150" y="170" width="64" height="40" fill="#111"/><circle cx="260" cy="190" r="12" fill="#2b4fa0"/><circle cx="292" cy="190" r="12" fill="#2b4fa0"/>`;
   let x=24;
   (h.E.jack||[]).forEach(j=>{
    const n=j.day.length,w=24+n*38,off=h.bad(j.id)?-12:0,px=i=>x+31+i*38;
    j.day.forEach((d,i)=>s+=`<line x1="${px(i)}" y1="12" x2="${px(i)}" y2="${68+off}" stroke="${d[2]}" stroke-width="6"/>`);
    s+=h.spot(j.id,`<rect class="glow" x="${x}" y="${62+off}" width="${w}" height="44" rx="4" fill="#f4f4f4"/><text x="${x+w/2}" y="124" text-anchor="middle" class="lw">${j.id}</text>`);
    j.day.forEach((d,i)=>s+=h.pin(j.id+'-'+d[0],px(i),84+off)+`<text x="${px(i)}" y="${i%2?160:144}" text-anchor="middle" class="lw">${d[1]}</text>`);
    x+=w+18;
   });
   return s;
  }
 },

 phao:{
  ten:'Phao (cảm biến mực nước)', slot:[268,104], anchor:[0,22],
  spots:['ong'], pins:['P1','P2','P3'],
  goiY:'Cầm tay rồi chạm ống áp suất để kiểm tra. Rút điện, cầm VOM, chạm chân 1 rồi chân 3 để đo điện trở / điện dung.',
  mini:()=>`<circle class="glow" cx="22" cy="22" r="22" fill="#f0f0f0"/><path d="M22 44 L22 92" stroke="#8fa3b0" stroke-width="5"/><text x="12" y="70" text-anchor="end" class="lw">Phao</text>`,
  zoom(h){
   const k=h.bad('ong'),d=k?'M180 34 L150 24 L162 10 L120 18 L80 6':'M180 34 C170 10,110 8,40 14';
   let s=`<rect width="360" height="240" fill="var(--bench)"/>`;
   s+=h.spot('ong',`<path d="${d}" stroke="transparent" stroke-width="30" fill="none"/><path class="glow" d="${d}" stroke="#8fa3b0" stroke-width="9" fill="none"/>${k?'<circle cx="184" cy="40" r="5" fill="#e60012"/>':''}<text x="70" y="44" class="lb">Ống áp suất</text>`);
   s+=`<rect x="170" y="34" width="20" height="20" fill="#ccc"/><circle cx="180" cy="116" r="66" fill="#f0f0f0" stroke="#bbb" stroke-width="2"/><circle cx="180" cy="116" r="46" fill="none" stroke="#ccc" stroke-dasharray="4 4"/><text x="180" y="112" text-anchor="middle" style="font-size:12px;font-weight:600;fill:#333">PHAO</text>`;
   s+=`<rect x="130" y="168" width="100" height="40" rx="5" fill="#333"/>`+h.pin('P1',150,188)+h.pin('P2',180,188)+h.pin('P3',210,188);
   s+=`<text x="150" y="230" text-anchor="middle" class="lb">1</text><text x="180" y="230" text-anchor="middle" class="lb">2</text><text x="210" y="230" text-anchor="middle" class="lb">3</text>`;
   return s;
  }
 }
};
