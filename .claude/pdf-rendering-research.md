# Research: PDF Rendering trong Construction Apps

## Các app quốc tế nổi tiếng

### 1. PlanGrid (Autodesk Construction Cloud)
**Cách làm:**
- Dùng **tiled rendering** - chia PDF thành tiles nhỏ
- Render tiles visible trước, tiles khác lazy load
- Mỗi tile render ở resolution cao cố định
- Zoom = CSS transform + progressive re-render tiles
- **Pins/markups**: SVG overlay layer độc lập, không re-render

**Ưu điểm:**
- Smooth, không lag với PDF lớn
- Zoom mượt, pins luôn sharp (SVG)
- Memory efficient (chỉ render visible tiles)

### 2. Procore
**Cách làm:**
- Dùng **PDF.js với canvas re-render**
- Khi zoom: re-render canvas sau 150-200ms debounce
- Canvas resolution = `zoom × devicePixelRatio × 2`
- Dùng **OffscreenCanvas** cho performance (Web Worker)
- Pins: Absolutely positioned DOM elements với transform

**Ưu điểm:**
- Luôn sharp ở mọi zoom level
- Không bị overflow viewport
- Pins vẫn interactive

### 3. Fieldwire
**Cách làm:**
- Dùng **PDF.js TextLayer + Canvas**
- Canvas render graphics
- TextLayer render text bằng DOM → text luôn sharp
- Zoom: Scale cả canvas + TextLayer
- Re-render canvas khi zoom >2x base
- Pins: CSS absolute position với % coordinates

### 4. Bluebeam Revu Web
**Cách làm:**
- Hybrid: Canvas for display + SVG for annotations
- Multi-resolution caching (3 levels: low/med/high)
- Load appropriate resolution based on zoom
- Annotations (pins) = SVG layer on top
- Zoom: immediate scale + async high-res reload

## Best Practice Pattern (Recommended)

Dựa trên các app trên, pattern tốt nhất cho use case này:

### **Hybrid Approach: Smart Re-render**

```
┌─────────────────────────────┐
│   PDF.js Canvas (Dynamic)   │ ← Re-render khi zoom với resolution cao
├─────────────────────────────┤
│   SVG Overlay Layer         │ ← Pins/zones (scale-independent)
├─────────────────────────────┤
│   Viewport (overflow clip)  │ ← Container handle pan/zoom
└─────────────────────────────┘
```

**Logic:**
1. Canvas render ở resolution = `baseSize × zoom × min(devicePixelRatio, 2)`
2. Khi zoom (wheel/button):
   - Immediately: CSS transform scale canvas tạm
   - After 100ms debounce: Re-render canvas ở resolution mới
   - → Smooth zoom + sharp result
3. Pins/zones: Dùng absolute position với % coordinates
   - Hoặc SVG overlay (better for scale)

**Ưu điểm:**
- ✅ Luôn sharp sau khi re-render
- ✅ Zoom mượt (CSS immediate)
- ✅ Không bị overflow (canvas fit viewport)
- ✅ Pins/zones không bị ảnh hưởng
- ✅ Memory efficient

**Code changes needed:**
1. Revert MAX_RESOLUTION_SCALE approach
2. Re-render canvas when zoom (debounced)
3. Dynamic resolution = `zoom × devicePixelRatio × 2`
4. Add viewport `overflow: hidden` or clip
5. Optional: Convert pins to SVG for perfect scaling

## Alternative: PDF.js Viewer Integration

Dùng PDF.js Viewer (full viewer) + custom annotation layer:

**Pros:**
- Zoom handling đã tối ưu sẵn
- Text layer, search, navigation built-in
- Proven solution

**Cons:**
- Khó customize UI
- Cần integrate annotation API riêng
- Bundle size lớn hơn

## Recommendation: **Hybrid Approach**

Giống Procore/Fieldwire - re-render canvas khi zoom với resolution cao, debounce để smooth.
