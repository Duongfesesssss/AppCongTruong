# Naming Convention Feature - Hướng dẫn sử dụng

## Tổng quan

Tính năng Naming Convention cho phép mỗi Project cấu hình quy tắc đặt tên bản vẽ riêng, giúp:
- Tự động phân loại bản vẽ khi upload (Building, Floor, Discipline)
- Validate tên file theo chuẩn đã định
- Mapping keywords linh hoạt theo từng tổ chức
- Giảm lỗi nhập tay và tăng tính nhất quán

## Cấu trúc tên file

Format chuẩn:
```
[ProjectPrefix]-[Building]-[Level]-[Discipline]-[DrawingType]-[RunningNumber]-[Description]
```

Ví dụ:
```
ABC-HQ-LA01-KT-MB-003-PhongKhach.pdf
```

**Giải thích:**
- `ABC`: Project prefix
- `HQ`: Building code (HQ = Headquarters)
- `LA01`: Level code (LA01 = Level A 01)
- `KT`: Discipline code (KT = Kiến trúc)
- `MB`: Drawing type code (MB = Mặt bằng)
- `003`: Running number
- `PhongKhach`: Description

## Các trường (Fields)

### 1. Project Prefix
- **Mô tả**: Mã định danh dự án
- **Required**: Thường là bắt buộc
- **Ví dụ**: ABC, 2201.CYSAPA, 22_008
- **Keywords**: Không cần (accept bất kỳ giá trị nào)

### 2. Building/Zone
- **Mô tả**: Tòa nhà hoặc khu vực
- **Required**: Bắt buộc
- **Keywords**: HQ, A, B, C, KS, TM, VP, NT, SH
- **Mapping**: HQ → Headquarters, A → Building A, etc.

### 3. Level
- **Mô tả**: Tầng/mức
- **Required**: Bắt buộc
- **Keywords**:
  - Basement: KG2, KG, B1, B2
  - Ground: EG, GF
  - Upper: 1OG, 2OG, L1, L2, FL01, FL02
  - Roof: DA, RF
- **Mapping**: Nhiều aliases map về cùng 1 code (ví dụ: L1, FL01, LEVEL01 → 1OG)

### 4. Discipline
- **Mô tả**: Bộ môn/ngành
- **Required**: Bắt buộc
- **Keywords**:
  - ARC/AR: Kiến trúc
  - STR/ST: Kết cấu
  - ELT/EL: Điện
  - HZG: Sưởi ấm
  - SAN: Cấp thoát nước
  - RLT: Thông gió
  - KLT: Lạnh
  - SPR: Sprinkler
  - BRS/FP: Phòng cháy
- **Mapping**: Support aliases (KT, KIENTRUC, ARCH → ARC)

### 5. Drawing Type
- **Mô tả**: Loại bản vẽ
- **Required**: Optional
- **Keywords**:
  - GR: Mặt bằng (Grundriss)
  - SC: Sơ đồ (Schema)
  - DT: Chi tiết (Detail)
  - SN: Mặt cắt (Schnitt)
  - AN: Mặt đứng (Ansicht)
  - MB: Mặt bằng (Vietnamese)
  - MC: Mặt cắt (Vietnamese)
  - MD: Mặt đứng (Vietnamese)

### 6. Running Number
- **Mô tả**: Số thứ tự
- **Required**: Optional
- **Format**: 001, 002, 003... (tối thiểu 3 chữ số)

### 7. Description
- **Mô tả**: Mô tả tự do
- **Required**: Optional
- **Keywords**: Không cần

## API Endpoints

### 1. Lấy Naming Convention của Project
```http
GET /api/naming-conventions/:projectId
```

**Response:**
```json
{
  "projectId": "...",
  "separator": "-",
  "fields": [
    {
      "type": "building",
      "order": 0,
      "enabled": true,
      "required": true,
      "keywords": [
        {
          "code": "HQ",
          "label": "Headquarters",
          "aliases": ["MAIN"]
        }
      ]
    }
  ],
  "isDefault": false
}
```

### 2. Tạo/Update Naming Convention
```http
POST /api/naming-conventions
Content-Type: application/json

{
  "projectId": "...",
  "separator": "-",
  "fields": [...]
}
```

### 3. Validate filename
```http
POST /api/naming-conventions/:projectId/validate
Content-Type: application/json

{
  "filename": "ABC-HQ-LA01-KT-MB-003-PhongKhach.pdf"
}
```

**Response:**
```json
{
  "filename": "ABC-HQ-LA01-KT-MB-003-PhongKhach.pdf",
  "parsed": {
    "rawName": "ABC-HQ-LA01-KT-MB-003-PhongKhach.pdf",
    "fields": [
      {
        "type": "projectPrefix",
        "value": "ABC"
      },
      {
        "type": "building",
        "value": "HQ",
        "matchedKeyword": {
          "code": "HQ",
          "label": "Headquarters"
        }
      }
    ],
    "isValid": true,
    "errors": [],
    "warnings": []
  },
  "suggestedFormat": "ABC-HQ-L1-KT-MB-001-[Description]"
}
```

### 4. Lấy format gợi ý
```http
GET /api/naming-conventions/:projectId/format-suggestion
```

## Workflow sử dụng

### Case 1: Setup lần đầu cho Project mới

1. **Admin vào Project Settings**
   - Click button "Cấu hình Naming Convention"
   - Modal mở ra với default config

2. **Config các fields**
   - Drag-drop để sắp xếp thứ tự
   - Bật/tắt fields theo nhu cầu
   - Set required/optional
   - Click icon cog để edit keywords

3. **Edit keywords**
   - Thêm/sửa/xóa keywords
   - Thêm aliases cho mỗi keyword
   - Ví dụ: KT, KIENTRUC, ARCH → map về ARC

4. **Save config**
   - Preview format trước khi save
   - Click "Lưu" để apply

### Case 2: Upload bản vẽ với auto-classification

1. **User upload file PDF/IFC**
   ```
   File: ABC-HQ-LA01-KT-MB-003-PhongKhach.pdf
   ```

2. **Hệ thống tự động parse**
   - Parse theo naming convention của Project
   - Map keywords (HQ → Headquarters, KT → Kiến trúc, MB → Mặt bằng)

3. **Auto-classify**
   - Tìm hoặc tạo Building "HQ"
   - Tìm hoặc tạo Floor "LA01" trong Building "HQ"
   - Tìm hoặc tạo Discipline "KT" trong Floor "LA01"
   - Gắn bản vẽ vào đúng cấu trúc

4. **Hiển thị kết quả**
   - Success: "Đã phân loại tự động vào HQ > LA01 > KT"
   - Errors: "Thiếu trường Level ở vị trí #3. Gợi ý format: ABC-HQ-[Level]-KT-..."

### Case 3: File sai format

1. **User upload file**
   ```
   File: ABC-KT-MB-003.pdf  (thiếu Building và Level)
   ```

2. **Hệ thống validate và báo lỗi**
   ```
   Errors:
   - Thiếu trường bắt buộc: building (vị trí #2)
   - Thiếu trường bắt buộc: level (vị trí #3)

   Format đúng:
   ABC-HQ-LA01-KT-MB-003-[Description]
   ```

3. **User sửa filename và upload lại**

### Case 4: Đổi naming convention sau khi đã dùng

1. **Admin thay đổi config**
   - Tắt field "Description"
   - Đổi thứ tự: Building trước Level
   - Thêm keywords mới

2. **Save config**
   - Config mới apply cho toàn bộ file upload tiếp theo
   - File cũ vẫn giữ nguyên metadata

## Frontend Components

### NamingConventionModal
Component chính để config naming convention

**Props:**
- `projectId`: string - ID của project
- `modelValue`: boolean - Show/hide modal

**Events:**
- `saved`: Emit khi save thành công

**Usage:**
```vue
<template>
  <NamingConventionModal
    v-model="showModal"
    :project-id="currentProject._id"
    @saved="onNamingConventionSaved"
  />
</template>

<script setup>
const showModal = ref(false);
const currentProject = ref(...);

const onNamingConventionSaved = (convention) => {
  console.log('Saved:', convention);
  // Refresh data or show notification
};
</script>
```

### FieldEditModal
Component để edit keywords của từng field

**Props:**
- `field`: NamingField | null
- `fieldIndex`: number
- `modelValue`: boolean

**Events:**
- `save`: Emit field đã update

## Composable

### useNamingConvention

```typescript
const {
  getNamingConvention,
  createOrUpdateNamingConvention,
  updateNamingConvention,
  deleteNamingConvention,
  validateFilename,
  getFormatSuggestion
} = useNamingConvention();

// Get config
const convention = await getNamingConvention(projectId);

// Validate filename
const result = await validateFilename(projectId, {
  filename: "ABC-HQ-LA01-KT-MB-003.pdf"
});

if (result.parsed.isValid) {
  console.log("Valid!");
} else {
  console.log("Errors:", result.parsed.errors);
  console.log("Suggested format:", result.suggestedFormat);
}
```

## Best Practices

### 1. Thiết lập naming convention
- ✅ Đặt các trường quan trọng là "Required"
- ✅ Sử dụng separator dễ nhìn (-,  _, .)
- ✅ Thêm nhiều aliases cho keywords để dễ nhận diện
- ✅ Giữ format đơn giản, dễ nhớ
- ❌ Không đặt quá nhiều trường (tối đa 7)
- ❌ Không dùng separator đặc biệt khó gõ

### 2. Mapping keywords
- ✅ Dùng code ngắn gọn (2-4 ký tự)
- ✅ Label rõ ràng, dễ hiểu
- ✅ Thêm aliases cho các biến thể phổ biến
- ✅ Consistent với quy chuẩn của tổ chức
- ❌ Không trùng lặp code giữa các keywords

### 3. Upload bản vẽ
- ✅ Đặt tên file theo format trước khi upload
- ✅ Check format suggestion trước
- ✅ Đọc error message kỹ nếu upload fail
- ❌ Không upload file có tên ngẫu nhiên
- ❌ Không bỏ qua validation errors

## Troubleshooting

### Q: Upload file nhưng không tự động phân loại?
**A:** Kiểm tra:
1. File name có đúng format không?
2. Keywords có match không?
3. Xem log validation errors trong response

### Q: Keyword không match dù đã config?
**A:** Kiểm tra:
1. Code phải uppercase
2. Aliases phải exact match (case-insensitive)
3. Separator đúng với config

### Q: Muốn đổi format sau khi đã upload nhiều file?
**A:**
1. Config mới chỉ áp dụng cho file upload sau
2. File cũ giữ nguyên metadata
3. Có thể re-classify thủ công nếu cần

### Q: Test naming convention trước khi save?
**A:** Dùng API validate:
```typescript
const result = await validateFilename(projectId, {
  filename: "test-filename.pdf"
});
console.log(result.parsed);
```

## Examples

### Example 1: Project với format đơn giản
```typescript
{
  separator: "-",
  fields: [
    { type: "building", order: 0, enabled: true, required: true },
    { type: "level", order: 1, enabled: true, required: true },
    { type: "discipline", order: 2, enabled: true, required: true },
    { type: "runningNumber", order: 3, enabled: true, required: false }
  ]
}

// Format: HQ-L1-KT-001.pdf
```

### Example 2: Project với full format
```typescript
{
  separator: "-",
  fields: [
    { type: "projectPrefix", order: 0, enabled: true, required: true },
    { type: "building", order: 1, enabled: true, required: true },
    { type: "level", order: 2, enabled: true, required: true },
    { type: "discipline", order: 3, enabled: true, required: true },
    { type: "drawingType", order: 4, enabled: true, required: false },
    { type: "runningNumber", order: 5, enabled: true, required: false },
    { type: "description", order: 6, enabled: true, required: false }
  ]
}

// Format: ABC-HQ-LA01-KT-MB-003-PhongKhach.pdf
```

### Example 3: Project không dùng description
```typescript
{
  separator: "_",
  fields: [
    { type: "building", order: 0, enabled: true, required: true },
    { type: "level", order: 1, enabled: true, required: true },
    { type: "discipline", order: 2, enabled: true, required: true },
    { type: "drawingType", order: 3, enabled: true, required: true },
    { type: "runningNumber", order: 4, enabled: true, required: true },
    { type: "description", order: 5, enabled: false, required: false }
  ]
}

// Format: HQ_L1_KT_MB_001.pdf
```

## Migration từ hệ thống cũ

Nếu đang dùng legacy parser (filename-parser.ts), hệ thống vẫn fallback về parser cũ nếu naming convention parse fail. Không cần migrate ngay lập tức.

**Khuyến nghị:**
1. Setup naming convention cho Project mới
2. Migrate dần các Project cũ
3. Test kỹ trước khi apply

## Support

Nếu gặp vấn đề, check:
1. Console logs (browser và server)
2. API response errors
3. Naming convention config trong database
4. Test với API validate trước

## Technical Details

### Parser Logic
1. Split filename theo separator
2. Map segments theo field order
3. Match keywords cho từng field
4. Validate required fields
5. Return parsed result với errors/warnings

### Auto-classification Logic
1. Parse filename → extract Building/Level/Discipline codes
2. Tìm existing entities theo code (fuzzy match)
3. Nếu không tìm thấy → tự động tạo mới
4. Link bản vẽ vào đúng cấu trúc
5. Generate tags cho search

### Performance
- Parser: O(n) với n là số segments
- Keyword matching: O(m) với m là số keywords
- Database queries: Optimized với index trên code fields
