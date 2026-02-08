✅ FULL AGENT RULES — Construction Site Web App (Nuxt 3 + Express + MongoDB) 0) Nguyên tắc nền tảng (BẮT BUỘC)

Luôn phản hồi bằng tiếng Việt (trừ khi user yêu cầu khác).

Không bịa: nếu thiếu thông tin thì đưa ra giả định rõ ràng và chọn hướng an toàn.

Không commit secrets: tuyệt đối không đưa key/token/password vào code/commit/log.

Mọi chức năng phải:

Có validate input (server-side là bắt buộc)

Có try/catch + error message rõ ràng

Có trạng thái loading/empty/error ở UI

Tuân thủ ESLint + Prettier và convention repo. Không “tắt lint” để chạy cho nhanh.

Ưu tiên giải pháp đơn giản, rõ ràng, dễ bảo trì trước khi tối ưu.

1. Mục tiêu hệ thống (Phạm vi tính năng cốt lõi)

Hệ thống là app quản lý công trường theo mô hình "bản vẽ + pin/task + ảnh + đo đạc + khoanh vùng + export", gồm:

1.1 Cây quản lý bản vẽ (core UX)

TẠO SƠ ĐỒ QUẢN LÝ THEO: Công trình (Project) → Tòa nhà (Building) → Tầng (Floor) → Bộ môn (Discipline) → Bản vẽ (Drawing) → Task(Pin)

Tree dùng cho sidebar điều hướng, mỗi node có type và children.

Upload bản vẽ PDF cho Drawing.

1.2 Drawing/Plan View

Upload bản vẽ (ưu tiên PDF).

Trả metadata nhẹ và endpoint file streaming riêng.

UI Plan View: zoom/pan, overlay pin, overlay zone.

1.3 Task/Pin (thao tác trong bản vẽ)

Pin gắn tọa độ trên bản vẽ (x/y normalized 0–1).

Có status, category, property, description, roomName, pinName, gewerk, notes[].

Sinh pinCode theo cấu trúc:
PROJECT-BUILDING-FLOOR-GEWERK-000001 (sequence theo project).

Đặt tên Pin:
- Tên auto theo hệ thống (pinCode)
- Tên người dùng đặt (pinName)

Category (Pin dùng để làm gì):
- Chống cháy (fire_protection)
- Chất lượng (quality)
- An toàn (safety)
- Tiến độ (progress)
- Khác (other)
- (Cho phép mở rộng thêm)

Property (Pin thuộc bộ phận nào):
- Chống cháy nước (fire_water)
- Chống cháy cho thông gió (fire_ventilation)
- Chống cháy cho hệ thống sưởi (fire_heating)
- (Cho phép mở rộng thêm)

Quản lý Task:
- Tạo Task/Pin mới
- Di chuyển Task giữa các Drawing
- Xóa Task
- Tạo Pin hàng loạt (batch create)

1.4 Photo + Annotation + Đo đạc

Upload/chụp ảnh hiện trường theo task.

Lưu annotations JSON (fabric/canvas objects).

Vẽ đường đo kích thước vào ảnh:
- Bắt được thông số máy đo qua Bluetooth (nhiều loại máy đo)
- Nhập số đo thủ công
- Lưu lại lịch sử đo để cho chọn lại

1.5 Templates (mẫu đường đo)

Template gồm name, category, attributes (JSON), color.

Dùng cho dimension line / annotation presets.

Tạo hoặc Nhập Excel các mẫu đường đo kích thước.

1.6 Zones

Zone khoanh vùng (rectangle/shape) gắn với task (1 task = 1 zone).

Có style + status + notes.

1.7 Export (xuất kết quả)

Export ra bảng Excel (dữ liệu đo đạc từ annotations, lọc isDimensionLine).

Export ra hình ảnh kèm đường đo kích thước.

Export ra báo cáo PDF.

Xuất theo header tiếng Việt, cho phép filter (tối thiểu theo project/drawing/date).

1.8 Chat & Ghi ý kiến

Cho Chat và ghi ý kiến trong từng Task/Pin.

1.9 Upload tài liệu

Cho upload tài liệu bổ sung (PDF hoặc hình ảnh) cho Task.

1.10 Login & Auth

Đăng nhập / Đăng ký tài khoản.

JWT access token + refresh token.

2. Kiến trúc repo & module boundaries
   2.1 Cấu trúc thư mục chuẩn

client/: Nuxt 3 frontend

server/: Express backend

shared/: CHỈ tạo khi thật sự cần chia sẻ type/schema giữa client-server; nếu chưa có thì không import chéo.

2.2 Frontend Nuxt 3 (client/)

Bắt buộc:

Dùng <script setup>

Tách logic phức tạp sang composables/ hoặc utils/

Dùng TailwindCSS toàn bộ UI

Gợi ý structure:

client/pages/

client/components/

client/components/tree/ (tree nodes)

client/components/plan/ (viewer, pins, zones)

client/components/forms/

client/composables/api/ (useApi, useProjects, useTasks…)

client/composables/state/ (useSelectedNode, useAuth…)

client/utils/ (format, validators nhẹ)

client/assets/ (ảnh nội bộ, fonts nếu có)

client/public/ (static public)

2.3 Backend Express (server/)

Bắt buộc group theo domain:

server/src/projects

server/src/buildings

server/src/floors

server/src/disciplines

server/src/drawings

server/src/tasks

server/src/photos

server/src/templates

server/src/zones

server/src/reports

server/src/lib (logger, errors, db, utils)

server/src/middlewares (auth, error handler, validation)

Rule module:

Mỗi domain export public surface qua index.ts.

Không import tắt giữa domain (trừ lib/).

3. Coding style & naming convention
   3.1 Quy tắc chung

Indent 2 spaces (TS/JS).

camelCase cho biến/hàm.

PascalCase cho component/class.

File module: kebab-case.ts / kebab-case.vue.

CSS class: kebab-case (Tailwind utility đã ok).

Comment logic phức tạp bằng tiếng Việt, ngắn gọn, đúng ý.

3.2 Quy tắc code clean

Không viết function quá dài: > 80–120 dòng thì tách.

Tránh lặp logic: tách helper/composable/service.

Không để “magic string” rải rác: tách constants/enums.

4. API Design & Response Contract (BẮT BUỘC thống nhất)
   4.1 Response format

Thành công:

{ "success": true, "data": ..., "meta": { } }

Thất bại:

{
"success": false,
"error": { "code": "VALIDATION_ERROR", "message": "…", "details": {...} }
}

4.2 Quy tắc HTTP status

200/201: OK/Created

400: validation lỗi

401: chưa đăng nhập

403: không có quyền

404: không tồn tại

409: conflict (duplicate key)

500: lỗi server

4.3 Không trả file base64 trong JSON

Drawing/PDF/ảnh phải trả bằng file streaming endpoint hoặc signed URL.

DB chỉ lưu URL/key + metadata.

4.4 Endpoints tối thiểu (gợi ý)

GET /api/project-tree

CRUD:

POST /api/projects

POST /api/buildings

POST /api/floors

POST /api/disciplines

POST /api/drawings (multipart)

Drawing:

GET /api/drawings/:id (metadata nhẹ)

GET /api/drawings/:id/file (stream, hỗ trợ ?token= cho <object> tag)

Tasks:

POST /api/tasks (create/update theo id)

GET /api/tasks/:id

GET /api/tasks/:id/hierarchy

GET /api/tasks (list/filter)

DELETE /api/tasks/:id

POST /api/tasks/batch (tạo pin hàng loạt)

PUT /api/tasks/:id/move (di chuyển task giữa drawing)

Photos:

POST /api/photos (upload)

GET /api/tasks/:id/photos

GET /api/photos/:id/file (stream, hỗ trợ ?token= cho <img> tag)

PATCH /api/photos/:id (update annotations)

Templates:

GET /api/templates

POST /api/templates

POST /api/templates/import-excel (nhập mẫu từ Excel)

Zones:

POST /api/zones (1 task = 1 zone)

GET /api/drawings/:id/zones

GET /api/tasks/:id/zone

PUT /api/zones/:id

DELETE /api/zones/:id

Export:

GET /api/reports/export-excel?projectId=&drawingId=&from=&to=

GET /api/reports/export-image/:taskId (ảnh kèm đường đo)

GET /api/reports/export-pdf?projectId=&drawingId=&from=&to=

Comments:

POST /api/tasks/:id/comments (thêm ý kiến/chat)

GET /api/tasks/:id/comments (danh sách ý kiến)

Documents:

POST /api/tasks/:id/documents (upload tài liệu bổ sung)

GET /api/tasks/:id/documents (danh sách tài liệu)

Auth:

POST /api/auth/register

POST /api/auth/login

POST /api/auth/refresh

POST /api/auth/logout

GET /api/auth/me

5. Validation rules (Server-side là bắt buộc)

Dùng Zod/Joi để validate body/query/params.

Chuẩn hóa lỗi validation → VALIDATION_ERROR + details.

Validate các field bắt buộc:

id format (uuid hoặc slug)

projectId/buildingId/... phải tồn tại khi tạo cấp dưới

pinX/pinY phải trong range hợp lệ

status/category/property phải thuộc enum cho phép

6. Database rules (MongoDB + Mongoose)
   6.1 Collections bắt buộc

projects

buildings

floors

disciplines

drawings

tasks

photos

templates

zones

counters (sequence pinCode)

comments (chat/ý kiến theo task)

documents (tài liệu bổ sung theo task)

users

6.2 Schema rules

Có createdAt, updatedAt.

Có index cho:

foreign keys (projectId, buildingId, drawingId, taskId)

fields filter nhiều (status, category, createdAt)

pinCode unique (nếu dùng)

Với zones:

enforce 1:1 giữa taskId và zone (unique index taskId)

6.3 Pin code generation (bắt buộc ổn định)

counters theo projectId:

atomic increment (findOneAndUpdate with $inc)

Format pinCode:

PJ-BLD-FL-GW-000001

Các hàm slug/floor code/gewerk code phải deterministic.

7. File storage rules (PDF/ảnh)

Local dev: cho phép lưu disk (uploads/).

Production: ưu tiên S3/Azure Blob:

DB lưu storageKey, mimeType, size, width/height (nếu ảnh)

Trả file bằng signed URL hoặc stream

Giới hạn upload:

max size (ví dụ 20MB ảnh, 100MB pdf)

allowlist mime types

Không log raw base64 hoặc file bytes.

8. Security & Auth (bắt buộc)

Validate input tất cả endpoint.

CORS theo env (dev mới allow all).

Auth:

JWT access token + refresh token (hoặc session)

Middleware requireAuth (hỗ trợ header Authorization hoặc ?token= query param cho file streaming)

RBAC:

admin: toàn quyền

manager: CRUD công trình, upload bản vẽ, duyệt báo cáo

staff: tạo/update task, upload ảnh, zone

viewer: chỉ xem

Rate limit cho login/upload.

Sanitization text fields.

Error response không lộ stacktrace ở production.

9. UI/UX rules (Nuxt 3)
   9.1 Layout & routing

pages/index.vue dashboard

pages/projects/[projectId]/... hoặc dùng tree + route query

Có layout chung: header + sidebar tree + main content

9.2 Plan View rules

Viewer PDF: zoom/pan mượt

Overlay:

pins clickable

zones hiển thị theo drawingId

Mọi action phải có:

loading state

optimistic update (nếu phù hợp)

toast notification

9.3 Forms

Validate trước khi submit (client-side) nhưng server vẫn là nguồn tin.

Disable submit khi pending.

9.4 Accessibility & performance

Semantic HTML

alt cho ảnh

lazy load ảnh

code splitting route-level

cache file drawing (browser cache)

10. Error handling rules
    10.1 Backend

Có error handler middleware:

map lỗi sang { success:false, error:{...}}

Không trả lỗi dạng plain text.

Mọi endpoint có try/catch (hoặc wrapper async handler).

10.2 Frontend

Khi API lỗi:

hiển thị message dễ hiểu

log nhẹ (không log token/secret)

11. Testing rules

Unit tests cạnh code (\*.spec.ts).

Integration/E2E dưới tests/.

Không gọi network thật trong test mặc định.

Bug fix phải có regression test.

12. DevOps & CI/CD (GitHub Actions)

Workflow .github/workflows/ci.yml:

install deps client + server

lint

test

build

Artifact build có thể upload (tuỳ).

Deploy tách riêng workflow (staging/prod).

13. Logging & Observability

Logger chuẩn (pino/winston).

Có requestId (nếu có) để trace.

Log mức:

info: action chính

warn: validation fail/unauthorized attempt

error: exception

Không log payload chứa dữ liệu nhạy cảm.

14. Documentation rules

README.md phải có:

cách chạy dev (client/server)

env vars và .env.example

cách build

cách chạy test

Comment tiếng Việt cho phần khó.

15. Definition of Done (BẮT BUỘC để coi là xong)

Một task/feature chỉ “xong” khi:

API đúng contract {success,data/error}

Có validation + try/catch

UI có loading/empty/error

lint pass

build pass

Không lộ secrets

Có test cho business logic quan trọng (nếu thay đổi backend)

16. Anti-patterns (TUYỆT ĐỐI KHÔNG)

Lưu base64 file lớn trong DB

Hardcode key/token trong code

Bỏ qua lint/test

Viết logic nghiệp vụ rải rác trong component UI

Xoá cascade không kiểm quyền

Trả lỗi stacktrace cho client (prod)

## Workflow sử dụng chính

1. Đăng nhập / Đăng ký tài khoản
2. Tạo cây quản lý: Project → Building → Floor → Discipline
3. Upload bản vẽ PDF (mặt bằng) cho Discipline
4. Mở bản vẽ → Tạo Task/Pin (ghim điểm đo trên bản vẽ)
   - Đặt tên (auto + thủ công), chọn Category và Property
   - Có thể tạo pin hàng loạt, di chuyển, xóa
5. Chụp/upload ảnh hiện trường cho Task
6. Mở ảnh → Chọn Template → Vẽ đường đo kích thước
   - Nhập số đo thủ công hoặc bắt từ máy đo qua Bluetooth
   - Lưu lịch sử đo để chọn lại
7. Chat và ghi ý kiến cho Task
8. Upload tài liệu bổ sung (PDF hoặc hình ảnh)
9. Xuất kết quả:
   - Export ra bảng Excel
   - Export ra hình ảnh kèm đường đo kích thước
   - Export ra báo cáo PDF
