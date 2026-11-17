# Mô phỏng sửa chữa theo mã lỗi – TOSHIBA

App thực hành cho kỹ thuật viên: quét QR → nhận ca bảo hành giả lập → kiểm tra, đo bằng dụng cụ (VOM, đồng hồ áp lực…) → ghi phiếu biên bản → kết luận. Kết quả tự gửi về Google Form của trainer.

Link: https://tuananh12423.github.io/m-ph-ng-m-y-gi-t/  ·  Vào thẳng một mã lỗi: thêm `#E10` vào cuối link.

## Các file
| File | Nội dung |
|---|---|
| `ma-loi.js` | Dữ liệu từng mã lỗi (tình huống, bước kiểm tra, giá trị chuẩn, quy trình, nguyên nhân). **Thêm mã lỗi mới ở đây.** |
| `parts.js` | Thư viện hình vẽ linh kiện (vòi nước, van cấp, PCB, phao…). |
| `app.js` | Phần chạy của app + cấu hình Google Form (`GOOGLE_FORM`). |
| `index.html` | Giao diện. |

## Thêm mã lỗi mới
1. Mở `ma-loi.js`, copy nguyên khối `MA_LOI.E10 = {...};`, đổi thành mã mới (vd `MA_LOI.E21`) và sửa nội dung theo hướng dẫn ở đầu file.
2. Lưu (Commit). Sau 1–2 phút trang tự cập nhật, mã mới hiện ở trang chủ.
3. Nếu ghi sai tên bước / chân đo, trang chủ hiện khung đỏ báo đúng chỗ sai.
