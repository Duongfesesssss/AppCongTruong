# Kế hoạch cải thiện chất lượng hiển thị PDF trong PlanViewer

## Vấn đề hiện tại

Code trong `client/components/plan/PlanViewer.vue` có các vấn đề sau:

1. **PDF bị mờ khi zoom**:
   - Dòng 488: Canvas được render với resolution = `fitScale * zoom.value * outputScale`
   - Dòng 206-209: CSS transform được áp dụng để pan/zoom
   - Khi user zoom (wheel/button), `zoom.value` thay đổi nhưng canvas chưa re-render ngay
   - CSS transform scale canvas cũ lên → mờ và vỡ nét

2. **Debounce quá dài**:
   - Dòng 248: `schedulePdfRender(120)` - delay 120ms mới re-render
   - Trong 120ms đó PDF bị mờ

3. **Output resolution không đủ cao**:
   - Dòng 481: `outputScale = Math.min(devicePixelRatio, 2)` - tối đa 2x
   - Không đủ cho màn hình retina hoặc khi zoom cao

4. **CSS không tối ưu cho canvas**:
   - Không có `image-rendering` property để cải thiện visual khi scale

## Giải pháp đã chọn: Phương án Extreme - Always render ở max resolution

User đã chọn phương án extreme để đảm bảo PDF luôn rõ nét tối đa, chấp nhận trade-off về memory usage.

### Cách hoạt động

1. **Render canvas ở resolution rất cao**:
   - Canvas luôn được render ở resolution cố định cao (4-6x base size)
   - Không thay đổi resolution khi zoom
   - Chỉ thay đổi CSS scale để zoom in/out

2. **Zoom bằng CSS transform**:
   - Khi user zoom, chỉ thay đổi CSS transform scale
   - Không trigger re-render canvas
   - → Zoom rất smooth và luôn sharp

3. **Re-render khi nào**:
   - Chỉ khi: thay đổi drawing, window resize
   - Không re-render khi zoom

4. **CSS image-rendering**:
   - Sử dụng `image-rendering: high-quality` hoặc `crisp-edges`
   - Đảm bảo browser không blur canvas khi scale

### Ưu điểm
- ✅ PDF luôn rõ nét tuyệt đối, zoom bao nhiêu cũng sharp (trong giới hạn max resolution)
- ✅ Zoom rất mượt mà (chỉ CSS, không re-render)
- ✅ Không có độ trễ render khi zoom
- ✅ Không cần debouncing cho zoom

### Nhược điểm
- ❌ Tốn RAM nhiều (canvas lớn)
- ❌ Load time ban đầu lâu hơn
- ❌ Có thể crash trên mobile với PDF nhiều trang hoặc thiết bị RAM thấp

## Chi tiết implementation

### Bước 1: Thay đổi cách tính output resolution
Trong `renderLoadedPdf()` (dòng 481-488):

```js
// Cũ:
const outputScale = Math.min(window.devicePixelRatio || 1, 2);
const viewport = page.getViewport({ scale: fitScale * zoom.value });

// Mới: Render ở max resolution cố định (không phụ thuộc zoom.value)
const MAX_RESOLUTION_SCALE = 5; // 5x base resolution
const outputScale = Math.min(window.devicePixelRatio || 1, 2);
const viewport = page.getViewport({ scale: fitScale * MAX_RESOLUTION_SCALE });
```

### Bước 2: Loại bỏ re-render khi zoom
Trong `zoomIn()`, `zoomOut()`, `resetView()` (dòng 231-244):

```js
// Cũ:
const zoomIn = () => {
  zoom.value = Math.min(zoom.value + 0.15, 3);
  schedulePdfRender();
};

// Mới: Không gọi schedulePdfRender()
const zoomIn = () => {
  zoom.value = Math.min(zoom.value + 0.15, 3);
  // Không re-render, chỉ CSS scale
};
```

Tương tự cho `zoomOut()`, `resetView()`, `handleWheel()`

### Bước 3: Thay đổi CSS transform để scale canvas
Trong `transformStyle` computed (dòng 206-209):

```js
// Cũ: Chỉ translate (pan)
const transformStyle = computed(() => ({
  transform: `translate(${offset.x}px, ${offset.y}px)`,
  transformOrigin: "top left"
}));

// Mới: Thêm scale để zoom
const transformStyle = computed(() => ({
  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom.value / MAX_RESOLUTION_SCALE})`,
  transformOrigin: "top left"
}));
```

**Note**: MAX_RESOLUTION_SCALE cần được define như một constant

### Bước 4: Thêm CSS image-rendering cho canvas
Trong `renderLoadedPdf()` sau khi tạo canvas (dòng 495):

```js
canvas.style.display = "block";
canvas.style.imageRendering = "high-quality";
```

Hoặc thêm vào global CSS:
```css
canvas {
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
}
```

### Bước 5: Add constant cho max resolution scale
Thêm vào đầu script section:

```js
const MAX_RESOLUTION_SCALE = 5; // Canvas được render ở 5x base size
```

### Bước 6: Điều chỉnh zoom limits
Vì canvas được render ở 5x, user có thể zoom từ 20% đến 500% của base:

```js
// Trong zoomIn/zoomOut
const zoomIn = () => {
  zoom.value = Math.min(zoom.value + 0.15, MAX_RESOLUTION_SCALE); // Max là 5
};
const zoomOut = () => {
  zoom.value = Math.max(zoom.value - 0.15, 0.2); // Min là 0.2 (20%)
};
```

## Testing checklist

- [ ] PDF hiển thị rõ nét ở zoom 100%
- [ ] Zoom in (150%, 200%, 300%) - text vẫn sharp
- [ ] Zoom out (70%, 50%) - không bị distortion
- [ ] Wheel zoom mượt và re-render nhanh
- [ ] Button zoom (+/-) hoạt động tốt
- [ ] Không lag trên mobile
- [ ] Không tốn quá nhiều memory (test với PDF nhiều trang)
- [ ] Pan vẫn smooth khi zoom
- [ ] Pins và zones vẫn align chính xác

## Rủi ro và trade-offs

1. **Memory usage tăng**: Canvas có resolution cao hơn → dùng nhiều RAM hơn
   - Mitigation: Giới hạn outputScale tối đa là 4

2. **Render time lâu hơn**: Resolution cao → render chậm hơn
   - Mitigation: Debounce vẫn có (50ms), có queueing system

3. **Battery drain trên mobile**: Re-render thường xuyên tốn pin
   - Mitigation: Acceptable vì user experience quan trọng hơn

## Alternative: Nếu vẫn chưa đủ tốt

Nếu sau khi implement phương án 1 mà vẫn không đủ rõ nét, có thể:
1. Tăng base outputScale lên 4-6x
2. Thêm TextLayer từ PDF.js để text luôn sharp (DOM text thay vì canvas)
3. Implement multi-resolution caching như PDF.js viewer chính thức
