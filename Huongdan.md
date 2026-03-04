MÔ TẢ YÊU CẦU KỸ THUẬT (TECHNICAL SPECIFICATION)
Ngữ cảnh: Nâng cấp hệ thống quản lý bản vẽ và Task (Issue Tracking) cho dự án kỹ thuật/xây dựng. Yêu cầu tối ưu UX/UI, xử lý real-time và tự động hóa trích xuất dữ liệu từ file name.

1. Cải tiến quy trình làm việc (Workflow) và Task Management
   Tối giản khâu Upload: Bỏ chặn (blocking) khi upload ảnh. Xây dựng tính năng Bulk Upload (chạy background/async). Người dùng không cần nhập thông tin từng ảnh; chỉ gán metadata chung ở cấp độ Task (Tên phòng, Ghi chú, Tầng, Bộ môn). (Gợi ý kiến trúc: Đẩy thẳng object lên S3/MinIO, trả về URL lưu vào DB).

Lazy-load Markup: Tối ưu hóa performance hiển thị. Ảnh trên view mặc định là ảnh gốc. Chỉ khi user trigger action Click/Edit mới load module Canvas (Fabric.js hoặc tương đương) để vẽ đường đo (markup) và thêm ghi chú.

Chuẩn hóa Status & Color Coding: Áp dụng hệ màu tiêu chuẩn ngành kỹ thuật để tracking qua UI/Dashboard dễ dàng nhất:

Hướng dẫn cho người vẽ (Instruction/To-do): Màu Xám/Trắng.

Yêu cầu thêm thông tin (RFI/Inquiry): Màu Vàng/Cam (cảnh báo cần action).

Đã hoàn thành (Resolved): Màu Xanh dương (Blue).

Đã được QA Kiểm soát (Approved): Màu Xanh lá (Green - chốt hạ).

2. Tính năng bổ sung và Tương tác (Real-time & Collaboration)
   Hệ thống Notification (Real-time): Triển khai chuông thông báo ở thanh Navigation. Yêu cầu kỹ thuật: Dùng Socket.io đẩy push notification ngay khi có sự kiện (Task change status, Mention). (Lưu ý DevOps: Nếu chạy đa instance, nhớ cắm thêm Redis Adapter/PubSub để đồng bộ state của Socket).

Global Workspace Chat: Tích hợp một kênh chat chung của công ty tại Dashboard dùng Socket.io để anh em trao đổi nhanh.
phần chat chung này sẽ đc dùng trong mọi project, và sẽ có thể nhắn tin cùng với mọi người trong project đó
@Mention & Auto-Capture Deep Link:

Khi gõ @username vào comment/ghi chú, hệ thống chạy hàm chụp ảnh màn hình vùng đang view (dùng html2canvas hoặc Puppeteer).

Trigger Socket gửi thông báo đến người được tag.

Crucial: Gắn tọa độ (x, y, zoom level) vào thông báo. Khi người dùng click vào chuông, nhảy thẳng (Deep link) vào đúng bản vẽ và tự động zoom đúng vị trí ảnh bị capture.

Overlay Bản vẽ (Visual Diff): Thêm công cụ chồng 2 file PDF/Image (VD: Index 1 vs Index 2). Kỹ thuật: Dùng CSS mix-blend-mode: multiply hoặc difference, hoặc tạo 2 layer Canvas set Opacity 50% và gán 2 màu đỏ/xanh (Redline) để highlight điểm khác biệt.

3. Cấu trúc dữ liệu và Quản lý bản vẽ (Data Structure & File Extraction)
   Project Tree Rework: Cấu trúc lại quan hệ cha-con trong DB: Dự án -> File pdf. Giúp query list theo scope công việc của từng phòng ban nhanh hơn.

Versioning (Indexing): Group các bản vẽ có cùng "Mã bản vẽ" lại thành 1 record cha, các file tải lên sau tạo thành các phiên bản Index 1, Index 2, Index 3... Giao diện chỉ hiển thị bản vẽ mới nhất (Latest Index), có dropdown để xem lịch sử bản cũ.

Deep Clone Logic: Sửa API Clone dự án. Khi clone, phải copy toàn bộ cây thư mục (Bộ môn -> Tầng) và setting đi kèm. Trạng thái mặc định: Không clone data bản vẽ và Task bên trong để tránh rác DB.

Tự động nhận diện (Auto-naming & Parsing): Cốt lõi của tự động hóa. Khi user ném file PDF vào, viết một module Regex Parser để bóc tách tên file thành Metadata tự động, bám sát quy tắc quản lý thông tin:

Quy tắc chung: Tên file có tối đa 7 trường thông tin, cách nhau bởi dấu gạch ngang "-". File Revit thì có đủ 7 trường.
+1

Chuỗi Regex cần trích xuất: [Mã dự án]-[Đơn vị]-[Bộ môn]-[Tên tòa nhà]-[Bộ phận]-[Tầng/Vị trí]-[Kiểu file].

Logic Mapping vào DB:

(1) Mã dự án (10 ký tự): Mã duy nhất của dự án. Ví dụ 2201.CYSAPA (Khách sạn Courtyard by Marriott Sapa).
+1

(2) Đơn vị (3 ký tự): Đơn vị khởi tạo (ví dụ: A79, SDE).

(3) Bộ môn (2 ký tự): Tự động phân loại vào Project Tree dựa trên mã này. Ví dụ: AA (Kiến trúc), ES (Kết cấu), EM (ĐHKK).

(4) Tên tòa nhà (2 ký tự): VD: KS (Khách sạn), TM (TTTM).

(5) Bộ phận tòa nhà (2 ký tự): Phân vùng không gian. VD: BS (Tầng hầm), PO (Khối đế), TY (Tầng điển hình).
+1

(6) Tầng/Vị trí (2 ký tự): Tự động map vào Tầng tương ứng trong Tree. VD: L1 (Tầng một), B1 (Tầng hầm 1).

(7) Kiểu file (2 ký tự - Nếu có): M2 (Bản vẽ 2D), M3 (Mô hình 3D).

Tự động sinh Số hiệu Bản vẽ: Cấu trúc thành [Mã bộ môn] + [Hạng mục bản vẽ] + [Số thứ tự] (Số thứ tự chạy tự động từ 01, 02...).
+1

Ví dụ luồng chạy: File name là 2201.CYSAPA-A79-AA-KS-BS-ZZ -> Hệ thống tự bóc: Dự án 2201.CYSAPA , ném vào thư mục Bộ môn Kiến trúc (AA) , Tòa Khách sạn (KS) , Khối Hầm (BS). Không bắt người dùng nhập tay một chữ nào.

1. Quy trình "Cửa khẩu" (The Gateway Workflow)
   Đừng để bản vẽ vào hệ thống ngay. Hãy bắt nó đi qua một bước gọi là "Review & Categorize" (Phê duyệt và Phân loại).

Upload: User quăng file vào.

Auto-Scan: Em dùng code (như Tesseract.js anh nói ở trên) quét thử.

Trường hợp A: Có Metadata (Mã bản vẽ, tên) -> Điền sẵn vào form.

Trường hợp B: Không có Metadata/Chữ mờ -> Để trống.

User Intervention (Bước quan trọng): Hệ thống hiện ra một màn hình bảng (Grid View). Những file "đặt tên lung tung" sẽ bị đánh dấu đỏ.

Bắt buộc user phải điền: Mã bản vẽ (Code), Tầng, Bộ môn.

Nếu user không điền? -> Không cho nhấn "Save". Bản vẽ vẫn nằm ở trạng thái "Draft" (Nháp) và không ai thấy được nó cả.

2. Ép user vào "Khuôn khổ" (Validation)
   Đừng hỏi user: "Tầng mấy?" bằng một ô nhập văn bản (Text Input). Hãy dùng Dropdown (Danh sách chọn).

Dữ liệu chuẩn hóa: Em đã có danh mục Tòa nhà, Tầng, Bộ môn từ lúc khởi tạo dự án. User chỉ được chọn trong danh mục đó.

Tự động đổi tên file: Sau khi user chọn xong (Ví dụ: Tòa A, Tầng 5, Hệ Điện), em hãy dùng code tự động Rename cái file 1.pdf kia thành A-FL05-E-001.pdf theo đúng chuẩn của hệ thống.

Tư duy: File gốc user đặt là gì không quan trọng, hệ thống chỉ lưu và hiển thị theo tên đã được "chuẩn hóa".

3. Xử lý bản vẽ "Không có tên, không có khung tên"
   Với những bản vẽ dạng ảnh chụp hiện trường hoặc bản vẽ tay không có khung tên (Metadata):

Sử dụng Tags mặc định: Khi upload, nếu hệ thống không đọc được gì, nó sẽ tự động gán nhãn Uncategorized (Chưa phân loại).

AI Suggestion (Nếu em muốn thể hiện trình độ): Em có thể dùng AI để phân loại ảnh. Ví dụ: Thấy ảnh có nhiều dây điện -> Gợi ý tag Electrical. Thấy ảnh mặt bằng -> Gợi ý tag Plan.

Gán nhãn theo Ngữ cảnh (Contextual Tagging): Nếu user đang đứng ở màn hình "Tầng 5" và nhấn Upload, hệ thống tự mặc định file đó thuộc "Tầng 5".
