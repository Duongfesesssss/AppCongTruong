# Cấu trúc dữ liệu đo đạc mới

## 1. Line Type (Extended)

```typescript
type Line = {
  // === Tọa độ vẽ ===
  x1: number;
  y1: number;
  x2: number;
  y2: number;

  // === Đo đạc ===
  distance: number;           // khoảng cách pixel (dùng để tính tỷ lệ)
  realValue?: number;         // giá trị số thực (vd: 2.5)
  unit?: string;              // đơn vị (m, cm, mm, ft, in, etc.)
  realDistance?: string;      // LEGACY: "2.5m" - giữ để tương thích với code cũ
  scale?: number;             // tỷ lệ: realValue / distance (tự động tính)

  // === Thông tin mô tả ===
  name?: string;              // tên đường đo (vd: "Chiều dài phòng")
  category?: string;          // loại đo đạc (width, height, depth, diagonal, perimeter, area)
  notes?: string;             // ghi chú bổ sung
  room?: string;              // phòng/khu vực

  // === Template & Metadata ===
  templateId?: string;        // ID template nếu dùng (link với templates collection)
  templateName?: string;      // tên template (để hiển thị nhanh)
  createdAt?: number;         // timestamp tạo
  measuredBy?: string;        // người đo (userId hoặc tên)
  deviceType?: string;        // loại thiết bị ("manual", "bluetooth-bosch", "bluetooth-leica", etc.)

  // === Hiển thị UI ===
  color?: string;             // màu vẽ
  width?: number;             // độ dày line
  labelPosition?: 'top' | 'bottom' | 'auto';  // vị trí label
};
```

## 2. Migration Strategy (Tương thích ngược)

Khi load annotations cũ:
```typescript
function migrateLegacyLine(oldLine: Line): Line {
  const newLine = { ...oldLine };

  // Parse realDistance cũ "2.5m" → realValue + unit
  if (oldLine.realDistance && !oldLine.realValue) {
    const match = oldLine.realDistance.match(/^([\d.]+)\s*([a-zA-Z]+)$/);
    if (match) {
      newLine.realValue = parseFloat(match[1]);
      newLine.unit = match[2];
    }
  }

  // Tính scale nếu có đủ dữ liệu
  if (newLine.realValue && newLine.distance > 0) {
    newLine.scale = newLine.realValue / newLine.distance;
  }

  // Set timestamp nếu chưa có
  if (!newLine.createdAt) {
    newLine.createdAt = Date.now();
  }

  return newLine;
}
```

## 3. Excel Export Structure

### Header tiếng Việt:
```typescript
const excelHeaders = [
  'STT',                    // row number
  'Mã Pin',                 // pinCode
  'Tầng',                   // floor
  'Phòng/Khu vực',         // room
  'Tên đo đạc',            // name
  'Loại đo đạc',           // category
  'Giá trị',               // realValue
  'Đơn vị',                // unit
  'Tỷ lệ (đơn vị/px)',    // scale
  'Ghi chú',               // notes
  'Template',              // templateName
  'Người đo',              // measuredBy
  'Ngày đo',               // createdAt (formatted)
  'Thiết bị',              // deviceType
];
```

### Sample Excel Row:
```
1 | PJ-BLD-FL-GW-000001 | Tầng 1 | Phòng khách | Chiều dài | width | 4.5 | m | 0.025 | Đo theo tường | Template phòng khách | Nguyễn Văn A | 08/02/2026 14:30 | Manual
```

## 4. Backend Changes Needed

### 4.1 Update Photo Model
```typescript
// server/src/photos/model.ts
const photoSchema = new Schema({
  // ... existing fields
  annotations: {
    type: Schema.Types.Mixed,  // Vẫn giữ Mixed để linh hoạt
    default: []
  },
  // NEW: Metadata cấp ảnh
  measuredAt?: Date,           // thời điểm đo (lấy từ line mới nhất)
  measurementCount?: Number,   // số đường đo
  measuredBy?: String,         // người đo chính
});
```

### 4.2 Export Excel Endpoint
```typescript
// server/src/reports/export-excel.ts
router.get('/export-excel', requireAuth, async (req, res) => {
  const { taskId, projectId, from, to } = req.query;

  // 1. Query photos + annotations
  // 2. Parse all lines from annotations
  // 3. Enrich with task/project metadata
  // 4. Generate Excel with exceljs
  // 5. Return file stream

  // Filter options:
  // - By taskId
  // - By projectId + date range
  // - By category
  // - By template
});
```

### 4.3 Template Integration
```typescript
// server/src/templates/model.ts
const templateSchema = new Schema({
  name: String,
  category: String,             // width, height, depth, etc.
  defaultUnit: String,          // m, cm, mm
  attributes: Schema.Types.Mixed,
  color: String,
  width: Number,
  presetValues: [String],       // ["1m", "1.5m", "2m"] - quick values
});
```

## 5. Frontend Changes

### 5.1 MeasurementInputModal Enhancement
Thêm fields:
- Category dropdown (Chiều dài/rộng/cao/đường chéo/chu vi/diện tích)
- Room/Location input
- Notes textarea
- Template selector
- Device type (auto-detect hoặc manual)

### 5.2 History Structure
```typescript
// useAnnotationHistory.ts
type MeasurementHistory = {
  id: string;
  photoId: string;
  pixelDistance: number;
  realValue: number;           // NEW: tách số
  unit: string;                // NEW: tách đơn vị
  realDistance: string;        // LEGACY
  name?: string;               // NEW
  category?: string;           // NEW
  templateId?: string;         // NEW
  timestamp: number;
  color?: string;
  width?: number;
};
```

## 6. UI Improvements

### 6.1 PhotoAnnotator Toolbar
Thêm:
- Template dropdown (load từ /api/templates)
- Category quick buttons
- Room/Location display

### 6.2 Measurement Label Display
Format label theo category:
```
[Icon] Chiều dài: 4.5m
[Icon] Chiều cao: 2.8m
[Icon] Đường chéo: 6.2m
```

## 7. API Endpoints Cần Thêm

```
GET  /api/templates                        - Danh sách template
POST /api/templates                        - Tạo template mới
POST /api/templates/import-excel           - Import template từ Excel
DELETE /api/templates/:id                  - Xóa template

GET  /api/reports/export-excel             - Export Excel
     ?taskId=xxx                           - Theo task
     ?projectId=xxx&from=&to=              - Theo project + date
     ?category=width                        - Lọc theo loại đo

GET  /api/reports/export-pdf               - Export PDF báo cáo
POST /api/reports/preview                  - Preview trước khi export
```

## 8. Implementation Priority

### Phase 1: Cải thiện cấu trúc dữ liệu (1-2 ngày)
✅ Update Line type với backward compatibility
✅ Migration function cho data cũ
✅ Update MeasurementInputModal với fields mới
✅ Auto-parse realValue + unit khi save

### Phase 2: Template system (2-3 ngày)
- Templates collection + API
- Template selector trong UI
- Import template từ Excel

### Phase 3: Export Excel (2-3 ngày)
- Export endpoint với filter
- Excel generation với exceljs
- Download UI

### Phase 4: Advanced features (optional)
- Export PDF
- Bluetooth measurement integration
- Bulk edit annotations
- Statistics dashboard
