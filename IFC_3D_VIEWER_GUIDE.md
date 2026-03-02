# IFC 3D và 2D PDF Viewer - Hướng dẫn sử dụng

## Tổng quan

Tính năng mới cho phép bạn:
- Upload và xem file IFC 3D song song với bản vẽ PDF 2D
- Liên kết (link) các cặp file PDF ↔ IFC với ID metadata rõ ràng
- Chuyển đổi nhanh giữa chế độ xem 2D, 3D, hoặc song song (split view)
- Quản lý versioning cho cả PDF và IFC files
- Kiểm tra validation IFC file khi upload

## Backend API

### 1. Upload file IFC 3D

**Endpoint:** `POST /api/drawings/ifc`

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `file`: IFC file (required)
  - `projectId`: ID của project (required)
  - `buildingId`: ID của tòa nhà (optional)
  - `floorId`: ID của tầng (optional)
  - `disciplineId`: ID của bộ môn (optional)
  - `drawingCode`: Mã bản vẽ tùy chỉnh (optional, auto-generate nếu không có)
  - `name`: Tên hiển thị (optional)
  - `tagNames`: Array các tag (optional)
  - `linkedDrawingId`: ID của file PDF để link (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Building A - Floor 1",
    "drawingCode": "TM-FL01-AR-001",
    "fileType": "3d",
    "linkedDrawingId": null,
    "ifcMetadata": {
      "ifcSchema": "IFC4",
      "containsBuildingElements": true,
      "elementCount": 1523,
      "validated": true,
      "validatedAt": "2026-03-02T04:00:00.000Z"
    },
    "validation": {
      "valid": true,
      "warnings": []
    }
  }
}
```

### 2. Link file PDF và IFC

**Endpoint:** `POST /api/drawings/link`

**Request:**
```json
{
  "drawing2dId": "pdf_drawing_id",
  "drawing3dId": "ifc_drawing_id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "drawing2d": {
      "_id": "pdf_drawing_id",
      "fileType": "hybrid",
      "linkedDrawingId": "ifc_drawing_id"
    },
    "drawing3d": {
      "_id": "ifc_drawing_id",
      "fileType": "hybrid",
      "linkedDrawingId": "pdf_drawing_id"
    }
  }
}
```

### 3. Unlink file

**Endpoint:** `DELETE /api/drawings/:id/unlink`

**Response:**
```json
{
  "success": true,
  "data": {
    "drawing": {
      "_id": "...",
      "fileType": "2d",
      "linkedDrawingId": null
    },
    "linkedDrawing": {
      "_id": "...",
      "fileType": "3d",
      "linkedDrawingId": null
    }
  }
}
```

## Frontend Components

### 1. IfcViewer Component

Component để hiển thị file IFC 3D.

**Props:**
- `drawing`: Drawing object (IFC file)
- `loading`: Boolean loading state
- `error`: Error message string

**Events:**
- `@loaded`: Được emit khi model load xong
- `@error`: Được emit khi có lỗi
- `@view-state`: Được emit khi camera state thay đổi

**Usage:**
```vue
<template>
  <IfcViewer
    :drawing="ifcDrawing"
    :loading="loading"
    :error="error"
    @loaded="handleLoaded"
    @error="handleError"
  />
</template>
```

### 2. HybridViewer Component

Component chính để hiển thị song song PDF và IFC, với chức năng toggle view modes.

**Props:**
- `drawing2d`: PDF drawing object
- `drawing3d`: IFC drawing object
- `pins`: Array của task pins (cho PDF viewer)
- `zones`: Array của zones (cho PDF viewer)
- `loading`: Boolean loading state
- `error`: Error message
- `placingPin`: Boolean pin placement mode
- `selectedPinId`: Selected pin ID

**Events:**
- `@pin-click`: Click vào pin
- `@zone-click`: Click vào zone
- `@place-pin`: Đặt pin mới
- `@pin-move`: Di chuyển pin
- `@cancel-place`: Hủy đặt pin
- `@view-state`: View state thay đổi

**View Modes:**
- `2d`: Chỉ hiển thị PDF viewer
- `3d`: Chỉ hiển thị IFC viewer
- `split`: Hiển thị cả hai song song (horizontal hoặc vertical)

**Usage:**
```vue
<template>
  <HybridViewer
    :drawing2d="pdfDrawing"
    :drawing3d="ifcDrawing"
    :pins="pins"
    :zones="zones"
    :loading="loading"
    @pin-click="handlePinClick"
    @place-pin="handlePlacePin"
  />
</template>
```

## Database Schema Changes

### Drawing Model Updates

Các field mới được thêm vào Drawing schema:

```typescript
{
  // Loại file: 2d (PDF), 3d (IFC), hybrid (có cả 2)
  fileType: "2d" | "3d" | "hybrid",

  // ID của file liên kết (PDF ↔ IFC)
  linkedDrawingId?: ObjectId,

  // Metadata cho IFC files
  ifcMetadata?: {
    ifcSchema?: string,          // IFC2X3, IFC4, IFC4X3
    containsBuildingElements?: boolean,
    elementCount?: number,
    validated?: boolean,
    validatedAt?: Date
  }
}
```

## IFC File Validation

File IFC được validate khi upload:

1. **Signature Check**: Kiểm tra file bắt đầu với `ISO-10303-21;`
2. **Schema Detection**: Phát hiện IFC schema version (IFC2X3, IFC4, etc.)
3. **Structure Check**: Kiểm tra HEADER và DATA sections
4. **Element Counting**: Đếm số lượng building elements

**Lỗi validation phổ biến:**
- File không có IFC signature hợp lệ
- Thiếu HEADER hoặc DATA section
- File corrupt hoặc không đúng định dạng

## Configuration

### Environment Variables

**Server (.env):**
```env
# Upload limits
UPLOAD_MAX_PDF_MB=100
UPLOAD_MAX_IFC_MB=200

# Storage
STORAGE_TYPE=local  # hoặc 's3'
```

### WASM Files

IFC viewer yêu cầu WASM files từ web-ifc library. Các file này đã được copy vào:
- `client/public/wasm/web-ifc.wasm`
- `client/public/wasm/web-ifc-mt.wasm`

## Workflow Sử Dụng

### 1. Upload bản vẽ PDF 2D (hiện tại)

```
POST /api/drawings
- Upload PDF file
- Auto-generate drawing code
- Parse metadata từ filename
```

### 2. Upload file IFC 3D

```
POST /api/drawings/ifc
- Upload IFC file
- Validate IFC structure
- Auto-generate drawing code (hoặc dùng existing)
- Optional: Link với PDF file ngay khi upload
```

### 3. Link PDF và IFC

**Option A: Link khi upload IFC**
```typescript
// Khi upload IFC, truyền linkedDrawingId
POST /api/drawings/ifc
{
  projectId: "...",
  linkedDrawingId: "pdf_drawing_id",
  file: ifc_file
}
```

**Option B: Link sau khi đã upload cả 2**
```typescript
POST /api/drawings/link
{
  drawing2dId: "pdf_id",
  drawing3dId: "ifc_id"
}
```

### 4. Xem song song

Sau khi link, sử dụng HybridViewer component:

```vue
<HybridViewer
  :drawing2d="linkedPdfDrawing"
  :drawing3d="linkedIfcDrawing"
/>
```

Component sẽ tự động:
- Detect linked files
- Show split view mặc định
- Allow toggle giữa 2D/3D/Split

## Versioning

Cả PDF và IFC đều hỗ trợ versioning:

- Mỗi bản vẽ có `drawingCode` unique
- Mỗi version có `versionIndex` (1, 2, 3...)
- Flag `isLatestVersion` để track version mới nhất
- Upload version mới: old versions được mark `isLatestVersion = false`

## Tips & Best Practices

1. **File Naming**: Đặt tên file IFC theo cùng convention với PDF để auto-linking
   - Example: `TM-FL01-AR.pdf` và `TM-FL01-AR.ifc`

2. **Linking Strategy**:
   - Link ngay khi upload để tránh quên
   - Hoặc batch link sau khi upload nhiều files

3. **Performance**:
   - IFC files có thể lớn (50-200MB), cần connection tốt
   - Loading 3D model mất vài giây, có progress indicator
   - Khuyến khích split view trên màn hình lớn (desktop)

4. **Metadata**:
   - IFC metadata (schema, element count) được lưu tự động
   - Dùng để verify file quality và completeness

## Troubleshooting

### IFC file không load được

**Lỗi**: "File IFC không hợp lệ"
- **Nguyên nhân**: File không đúng định dạng IFC
- **Giải pháp**: Kiểm tra file bằng IFC viewer khác (như BIMcollab, Solibri)

**Lỗi**: "Failed to load IFC"
- **Nguyên nhân**: File quá lớn hoặc corrupt
- **Giải pháp**:
  - Kiểm tra file size (< 200MB)
  - Optimize IFC file (xóa unused elements)
  - Check network connection

### Split view không hiển thị

**Vấn đề**: Chỉ thấy 1 viewer
- **Nguyên nhân**: Files chưa được link
- **Giải pháp**:
  - Kiểm tra `linkedDrawingId` trong database
  - Gọi API link nếu chưa link

### Performance Issues

**Vấn đề**: 3D viewer lag
- **Nguyên nhân**: Model quá phức tạp (nhiều elements)
- **Giải pháp**:
  - Simplify IFC model trước khi upload
  - Sử dụng view mode 2D hoặc 3D only, tránh split view
  - Upgrade hardware (GPU)

## Future Enhancements

Các tính năng có thể mở rộng:

1. **Element Selection**: Click vào element trong 3D để xem properties
2. **Cross-highlighting**: Click element trong 3D để highlight tương ứng trong 2D
3. **Multiple IFC Files**: Link nhiều IFC files cho 1 PDF
4. **IFC Export**: Export measurements từ 3D model
5. **Clash Detection**: So sánh giữa as-built (3D) và design (2D)

## Support

Nếu gặp vấn đề, vui lòng:
1. Check console logs (browser DevTools)
2. Check server logs
3. Verify IFC file validity
4. Contact support với error details
