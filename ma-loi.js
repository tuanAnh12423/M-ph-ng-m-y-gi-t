/* =====================================================================
   DỮ LIỆU MÃ LỖI
   Thêm mã mới: copy nguyên khối MA_LOI.E10 = {...}; bên dưới, đổi tên (vd MA_LOI.E21)
   rồi sửa nội dung. App tự kiểm tra dữ liệu và báo lỗi ở trang chủ nếu ghi sai tên.

   kiemTra – mỗi bước kiểm tra có 1 tên viết liền (vd van_r) và:
     loai : 'xem'   = quan sát (chạm điểm trên linh kiện)
            'do'    = đo bằng VOM (chạm 2 chân)
            'apluc' = đo bằng đồng hồ áp lực
     ten  : tên hiển thị (cũng là dòng trên phiếu biên bản)
     tai  : xem/apluc → 'linhkien:diem' (vd 'van:luoi-loc', 'pcb:CN9')
            do        → danh sách cặp chân [['T1','T2']] (chân PCB = 'JACK-dây', vd 'CN9-W')
     thang: (do) 'VAC' | 'VDC' | 'Ω' | 'nF'      dv: đơn vị hiển thị
     can  : (đo điện áp) 'bat' = máy bật nguồn · 'chay' = máy đang chạy (Start)
            Ω và nF luôn phải RÚT ĐIỆN (đo nguội).
     nguoi: 1 = phải rút điện mới được làm (tháo/kiểm tra jack…)
     dungCu: dụng cụ cần cầm cho bước 'xem' (mặc định 'tay'; khác: 'cole','tuavit')
     tot  : xem → mô tả khi tốt · đo → [min, max, số lẻ] giá trị khi TỐT (lấy theo tài liệu)
     hong : xem → mô tả khi hỏng · đo → giá trị hiển thị khi HỎNG (giá trị mô phỏng)
     chuanTxt: giá trị chuẩn ghi theo tài liệu, hiện trong bảng quy trình (vd '10–15 kΩ')

   quyTrinh – các nhóm bước theo slide hướng dẫn, hiện trong bảng "Quy trình kiểm tra":
     {ten:'1. …', buoc:['voi','apluc',…]}  hoặc  {ten:'…', ghiChu:'…'} cho bước chỉ có lời dặn

   nguyenNhan – mỗi lần nhận ca app bốc ngẫu nhiên 1 dòng:
     ten  : nguyên nhân · xuLy: cách xử lý đúng
     hong : các bước sẽ cho kết quả bất thường
     canCo: các bước KTV phải làm mới tính là có căn cứ
   ===================================================================== */
window.MA_LOI = window.MA_LOI || {};

MA_LOI.E10 = {
 sanPham:'Máy giặt cửa trên',
 ten:'Không có nước cấp đầu vào',
 tinhHuong:[
  'Khách gọi: máy bấm chạy được nhưng không thấy nước vào lồng, một lúc sau máy kêu bíp và hiện E10.',
  'Khách phản ánh: sáng giặt bình thường, chiều giặt tiếp thì máy báo E10, lồng giặt vẫn khô.',
  'Khách báo: máy hiện E10 ngay trong lần giặt đầu tiên của ngày, khách đã tắt mở lại nhưng vẫn lỗi.'
 ],
 linhKien:['voi','van','pcb','phao'],
 jack:[
  {id:'CN9', noi:'van',  day:[['W','Trắng','#f4f4f4'],['O','Cam','#f08a24']]},
  {id:'CN2', noi:'phao', day:[['O','Cam','#f08a24'],['B','Xanh biển','#1e6fd9'],['Y','Vàng','#f2c200']]}
 ],
 kiemTra:{
  apluc :{loai:'apluc', ten:'Áp lực nước đầu vào', tai:'voi:dau-noi', dv:'MPa', tot:[0.15,0.45,2], hong:'0.01', chuan:[0.03,0.8], chuanTxt:'0,03–0,8 MPa'}, // 0,03–0,8 MPa theo HDSD máy giặt cửa trên Toshiba
  voi   :{loai:'xem', ten:'Vòi nước, ống cấp', tai:'voi:tay-van', tot:'Vòi mở, nước chảy mạnh, ống cấp không gập, không rò rỉ.', hong:'Vòi nước đang khóa gần hết, nước chảy rất yếu.'},
  loc   :{loai:'xem', ten:'Lưới lọc van cấp', tai:'van:luoi-loc', dungCu:'cole', tot:'Lưới lọc sạch.', hong:'Lưới lọc bám đầy cặn, gần như bị bịt kín.'},
  cn9   :{loai:'xem', ten:'Jack CN9 (van ↔ PCB)', tai:'pcb:CN9', nguoi:1, tot:'Jack CN9 cắm chắc, dây không đứt.', hong:'Jack CN9 bị lỏng, dây cam bị đứt sát chân jack.'},
  van_v :{loai:'do', ten:'Điện áp cấp cho van (CN9)', tai:[['CN9-W','CN9-O']], thang:'VAC', dv:'V', can:'chay', tot:[218,229,1], hong:'0.0', chuanTxt:'220 VAC'},
  van_r :{loai:'do', ten:'Điện trở cuộn dây van', tai:[['T1','T2']], thang:'Ω', dv:'kΩ', tot:[10.5,14.5,2], hong:'OL', chuanTxt:'10–15 kΩ'},
  cn2   :{loai:'xem', ten:'Jack CN2 (phao ↔ PCB)', tai:'pcb:CN2', nguoi:1, tot:'Jack CN2 cắm chắc, dây không đứt.', hong:'Jack CN2 bị tuột một nửa.'},
  ong   :{loai:'xem', ten:'Ống áp suất phao', tai:'phao:ong', tot:'Ống áp suất thông, không gập, không hở.', hong:'Ống áp suất bị gập và tuột khỏi đầu nối.'},
  // Cặp chân đo 5VDC trên CN2: tài liệu chưa ghi rõ → tạm chấp nhận mọi cặp. Sửa lại khi có tài liệu.
  phao_v:{loai:'do', ten:'Điện áp nguồn phao (CN2)', tai:[['CN2-O','CN2-B'],['CN2-O','CN2-Y'],['CN2-B','CN2-Y']], thang:'VDC', dv:'V', can:'bat', tot:[4.92,5.08,2], hong:'0.00', chuanTxt:'5 VDC'},
  phao_r:{loai:'do', ten:'Điện trở phao (chân 1–3)', tai:[['P1','P3']], thang:'Ω', dv:'Ω', tot:[24.5,27.5,1], hong:'OL', chuanTxt:'24–28 Ω'},
  phao_c:{loai:'do', ten:'Điện dung phao (chân 1–3)', tai:[['P1','P3']], thang:'nF', dv:'nF', tot:[41,49,1], hong:'0.00', chuanTxt:'40–50 nF'}
 },
 quyTrinh:[
  {ten:'1. Kiểm tra ống cấp nước, van cấp', buoc:['voi','apluc','loc','cn9','van_v','van_r']},
  {ten:'2. Kiểm tra phao (cảm biến mực nước)', buoc:['cn2','ong','phao_v','phao_r','phao_c']},
  {ten:'3. Kiểm tra và thay PCB', ghiChu:'Nếu các linh kiện liên quan đều tốt thì tiến hành thay PCB.'}
 ],
 nguyenNhan:[
  {ten:'Vòi nước khóa / áp lực nước đầu vào yếu', xuLy:'Mở vòi / hướng dẫn khách xử lý nguồn nước, ống cấp', hong:['voi','apluc'], canCo:['apluc']},
  {ten:'Lưới lọc van cấp bị tắc', xuLy:'Vệ sinh lưới lọc van cấp', hong:['loc'], canCo:['apluc','loc']},
  {ten:'Dây kết nối van – PCB (CN9) tiếp xúc kém', xuLy:'Cắm lại / xử lý jack CN9', hong:['cn9'], canCo:['cn9']},
  {ten:'Van cấp hỏng (đứt cuộn dây)', xuLy:'Thay van cấp', hong:['van_r'], canCo:['van_r']},
  {ten:'PCB không cấp 220V cho van', xuLy:'Thay PCB', hong:['van_v'], canCo:['cn9','van_v','van_r']},
  {ten:'Dây kết nối phao – PCB (CN2) tiếp xúc kém', xuLy:'Cắm lại / xử lý jack CN2', hong:['cn2'], canCo:['cn2']},
  {ten:'Ống áp suất của phao bị gập / tuột', xuLy:'Xử lý / thay ống áp suất phao', hong:['ong'], canCo:['ong']},
  {ten:'Phao (cảm biến mực nước) hỏng', xuLy:'Thay phao (cảm biến mực nước)', hong:['phao_r','phao_c'], canCo:['phao_r']},
  {ten:'PCB không cấp 5VDC cho phao', xuLy:'Thay PCB', hong:['phao_v'], canCo:['cn2','phao_v','phao_r']}
 ]
};
