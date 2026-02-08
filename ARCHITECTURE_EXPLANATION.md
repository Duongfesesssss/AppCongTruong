# Kiến trúc hệ thống đo đạc - Giải thích chi tiết

## 📐 1. Cấu trúc dữ liệu tổng quan

```
Project (Công trình)
  └─> Building (Tòa nhà)
       └─> Floor (Tầng)
            └─> Discipline (Bộ môn)
                 └─> Drawing (Bản vẽ PDF)
                      └─> Task/Pin (Điểm đánh dấu trên bản vẽ)
                           └─> Photo (Ảnh chụp hiện trường)
                                └─> Annotations/Lines (Đường đo trên ảnh)
```

### Ví dụ thực tế:
```
Dự án: Chung cư Vinhomes
  └─> Tòa: A1
       └─> Tầng: Tầng 5
            └─> Bộ môn: Chống cháy nước
                 └─> Bản vẽ: "Mặt bằng tầng 5 - hệ thống chống cháy"
                      └─> Pin: Vị trí van chống cháy (pinCode: VH-A1-05-CC-00001)
                           └─> Ảnh 1: "Ảnh chụp van chống cháy"
                                └─> Đường 1: Chiều dài ống = 2.5m
                                └─> Đường 2: Chiều cao lắp đặt = 1.8m
                           └─> Ảnh 2: "Ảnh chụp hộp điều khiển"
                                └─> Đường 3: Kích thước hộp = 40cm
```

## 🏷️ 2. PinCode System (Mã Pin) - KHÔNG bịa đặt!

### Format: `PROJECT-BUILDING-FLOOR-GEWERK-000001`

**Gewerk** = Bộ môn (từ tiếng Đức, nghĩa vụ trong xây dựng)

### Ví dụ:
- `VH-A1-05-CC-00001`: Vinhomes - Tòa A1 - Tầng 5 - Chống cháy - Pin số 1
- `VH-A1-05-CC-00002`: Vinhomes - Tòa A1 - Tầng 5 - Chống cháy - Pin số 2

### Logic tạo pinCode:
```typescript
// server/src/tasks/index.ts (đã có sẵn)
function generatePinCode(task: Task, counter: number): string {
  const projectSlug = slugify(project.name).substring(0, 3).toUpperCase(); // VH
  const buildingSlug = slugify(building.name).toUpperCase();               // A1
  const floorCode = formatFloorCode(floor.name);                          // 05
  const gewerk = task.gewerk?.substring(0, 2).toUpperCase() || "GN";     // CC
  const sequence = String(counter).padStart(6, "0");                      // 000001

  return `${projectSlug}-${buildingSlug}-${floorCode}-${gewerk}-${sequence}`;
}
```

## 📸 3. Photo System - VẤN ĐỀ HIỆN TẠI

### ❌ Vấn đề: Photo thiếu metadata

**Backend model** (server/src/photos/photo.model.ts):
```typescript
const photoSchema = new Schema({
  taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true },
  drawingId: { type: Schema.Types.ObjectId, ref: "Drawing", required: true },
  storageKey: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  annotations: { type: Schema.Types.Mixed, default: [] },
  // ❌ THIẾU: name, description, location, measuredBy, measuredAt
});
```

### ✅ Cần bổ sung:
```typescript
const photoSchema = new Schema({
  // ... existing fields

  // NEW: Photo metadata
  name: { type: String },                    // "Ảnh van chống cháy số 1"
  description: { type: String },             // "Chụp từ góc phía bắc"
  location: { type: String },                // "Phòng kỹ thuật, tầng 5"
  category: { type: String },                // "fire_protection", "quality", etc.

  // NEW: Measurement metadata
  measuredBy: { type: String },              // "Nguyễn Văn A"
  measuredAt: { type: Date },                // Thời điểm đo (lấy từ line mới nhất)
  measurementCount: { type: Number, default: 0 }, // Số đường đo

  // Existing
  annotations: { type: Schema.Types.Mixed, default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

## 📏 4. Line (Đường đo) System - ĐÃ IMPLEMENT

### Cấu trúc Line type (client/components/PhotoAnnotator.vue):
```typescript
type Line = {
  // Tọa độ vẽ
  x1, y1, x2, y2: number;

  // Đo đạc
  distance: number;          // Khoảng cách pixel
  realValue: number;         // 2.5 (số thuần)
  unit: string;              // "m"
  realDistance: string;      // "2.5m" (legacy)
  scale: number;             // 0.025 (tỷ lệ m/px)

  // Thông tin
  name: string;              // "Chiều dài ống"
  category: string;          // "width", "height", etc.
  notes: string;             // "Đo từ điểm A đến B"
  room: string;              // "Phòng kỹ thuật"

  // Metadata
  createdAt: number;
  measuredBy: string;

  // UI
  color: string;
  width: number;
};
```

### ❌ Vấn đề: **room** và **category** ở ĐÚNG CHỖ!

User nói "phòng/khu vực, loại đo đạc t vẫn chưa hiểu sao lại k có" - có thể:
1. User chưa test với code mới
2. Hoặc không thấy fields trong UI

**→ Fields ĐÃ CÓ trong MeasurementInputModal.vue (line 61-95)**

## 🔄 5. Data Flow - Từ vẽ đến Excel

```
1. USER ACTION: Vẽ đường trên ảnh
   └─> PhotoAnnotator: handlePointerUp()
        └─> Tạo Line với x1, y1, x2, y2, distance (px)

2. USER ACTION: Nhập thông tin đo đạc
   └─> MeasurementInputModal hiện lên với 5 fields:
        - Tên đường thẳng: "Chiều dài ống"
        - Kích thước: "2.5" + chọn đơn vị "m"
        - Loại đo đạc: Dropdown → chọn "📏 Chiều dài/rộng"
        - Phòng/Khu vực: "Phòng kỹ thuật"
        - Ghi chú: "Đo từ van A đến van B"

3. USER CLICKS: Lưu
   └─> handleMeasurementSave()
        ├─> Parse "2.5m" → realValue: 2.5, unit: "m"
        ├─> Calculate scale: 2.5 / 150px = 0.0166 m/px
        └─> Save to line: {
              name: "Chiều dài ống",
              realValue: 2.5,
              unit: "m",
              realDistance: "2.5m",
              category: "width",
              room: "Phòng kỹ thuật",
              notes: "Đo từ van A đến van B",
              scale: 0.0166,
              createdAt: 1707398400000
            }

4. AUTO-SAVE: PhotoAnnotator closes
   └─> PATCH /api/photos/:photoId
        └─> Update photo.annotations = [line1, line2, ...]

5. USER CLICKS: Excel button
   └─> GET /api/reports/export-excel?projectId=xxx
        └─> Query all photos of project
        └─> For each photo:
             ├─> Get task (pinCode, pinName)
             ├─> Get drawing (name)
             ├─> Get project, building, floor (names)
             └─> For each line in photo.annotations:
                  └─> Add Excel row:
                       STT | Mã pin | Tên pin | Dự án | Tòa | Tầng |
                       Phòng | Tên đo | Loại | Giá trị | Đơn vị | Tỷ lệ |
                       Ghi chú | Ngày đo
```

## 🎯 6. Template System - CHƯA IMPLEMENT

Theo AGENTS.md (line 85-92):

### Mục đích:
**Template = Mẫu đường đo** để:
1. Tạo nhanh các đường đo chuẩn
2. Import từ Excel các mẫu đường đo
3. Chọn template khi vẽ → Auto-fill name, category, unit

### Ví dụ Template:

**Template 1: "Đo chiều dài ống nước"**
```typescript
{
  name: "Chiều dài ống nước",
  category: "width",
  defaultUnit: "m",
  color: "#10b981",
  width: 3,
  presetValues: ["2m", "2.5m", "3m", "4m"]
}
```

**Template 2: "Đo chiều cao lắp đặt"**
```typescript
{
  name: "Chiều cao lắp đặt",
  category: "height",
  defaultUnit: "m",
  color: "#3b82f6",
  width: 3,
  presetValues: ["1.5m", "1.8m", "2m", "2.5m"]
}
```

### Flow với Template:
```
1. Admin: Import Excel templates
   └─> POST /api/templates/import-excel
        └─> Save to templates collection

2. User: Chọn template trước khi vẽ
   └─> PhotoAnnotator toolbar: Template dropdown
        └─> Chọn "Đo chiều dài ống nước"

3. User: Vẽ đường
   └─> Modal hiện lên với fields AUTO-FILLED:
        - Tên: "Chiều dài ống nước" ← từ template
        - Loại: "📏 Chiều dài/rộng" ← từ template
        - Đơn vị: "m" ← từ template
        - Quick values: [2m, 2.5m, 3m, 4m] ← từ template
        - User chỉ cần: nhập số + chọn quick value
```

## 🐛 7. VẤN ĐỀ CẦN FIX NGAY

### 7.1. Photo Upload thiếu metadata input

**❌ Hiện tại:**
```vue
<!-- TaskDetail.vue line 77 -->
<input type="file" accept="image/*" multiple @change="handlePhotoUpload" />
```

**✅ Cần fix:**
```vue
<!-- NEW: Photo Upload Modal -->
<PhotoUploadModal
  :show="showPhotoUploadModal"
  @upload="handlePhotoUploadWithMetadata"
  @cancel="showPhotoUploadModal = false"
/>

<!-- Modal form: -->
- File picker (multiple)
- Tên ảnh chung (nếu upload 1 ảnh) hoặc prefix (nếu nhiều ảnh)
- Mô tả
- Phòng/Khu vực
- Category
```

### 7.2. Excel Export thiếu thông tin ảnh

**❌ Hiện tại:** Chỉ có info từ task/drawing
**✅ Cần thêm:**
- Tên ảnh
- Mô tả ảnh
- Task thuộc Drawing nào

### 7.3. Template System chưa có

**Cần implement:**
1. Template model + CRUD API
2. Import Excel templates
3. Template selector trong PhotoAnnotator
4. Auto-fill từ template

## 📋 8. PRIORITY FIXES

### High Priority (Cần ngay):
1. ✅ Add Photo metadata fields (name, description, location, category)
2. ✅ Photo Upload Modal với form đầy đủ
3. ✅ Update Excel export để include photo info

### Medium Priority:
4. ⚠️ Template system (Phase 2)
5. ⚠️ Batch create lines
6. ⚠️ Stats dashboard

### Low Priority:
7. PDF export
8. Bluetooth measurement
9. Advanced filters

## 🎨 9. UI Flow cải thiện

### Upload Photo Flow (MỚI):
```
1. User clicks "Tải ảnh" button
   └─> PhotoUploadModal opens

2. Modal shows:
   ┌─────────────────────────────────┐
   │  📷 Tải ảnh lên                  │
   ├─────────────────────────────────┤
   │  [Chọn file...]  (3 files)      │
   │                                  │
   │  Tên ảnh/Prefix:                │
   │  [Ảnh van chống cháy           ]│
   │                                  │
   │  Mô tả:                          │
   │  [Chụp từ góc phía bắc...      ]│
   │                                  │
   │  Phòng/Khu vực:                  │
   │  [Phòng kỹ thuật               ]│
   │                                  │
   │  Category:                       │
   │  [Chống cháy ▾]                  │
   │                                  │
   │  [Huỷ]  [Tải lên]               │
   └─────────────────────────────────┘

3. Backend saves:
   Photo 1: name = "Ảnh van chống cháy 1", location = "Phòng kỹ thuật"
   Photo 2: name = "Ảnh van chống cháy 2", location = "Phòng kỹ thuật"
   Photo 3: name = "Ảnh van chống cháy 3", location = "Phòng kỹ thuật"
```

### Annotate Photo Flow (HIỆN TẠI - ĐÃ OK):
```
1. User clicks photo → PhotoAnnotator opens
2. User vẽ đường → MeasurementInputModal opens
3. User fills 5 fields → Save
4. Repeat for nhiều đường
5. Close → Auto-save to photo.annotations
```

### Export Excel Flow (CẦN FIX):
```
Current: GET /api/reports/export-excel?projectId=xxx
   └─> Export all photos of project

Excel columns:
   STT | Tên ảnh | Mã pin | Tên pin | Dự án | Tòa | Tầng | Bản vẽ |
   Phòng (photo) | Tên đo | Loại đo | Giá trị | Đơn vị | Tỷ lệ |
   Ghi chú | Người đo | Ngày đo
```
