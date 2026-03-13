# Drawing Filter & Download - Quick Start Guide

## Installation

### 1. Install Dependencies

```bash
cd client
npm install
```

Dependency mới: `@vueform/multiselect` đã được thêm vào `package.json`.

### 2. Backend Setup

Backend API đã được cập nhật tự động. Không cần thay đổi gì thêm.

## Usage

### Option 1: Use DrawingListPanel Component (Recommended)

Component này đã tích hợp sẵn filter và list display.

```vue
<template>
  <div>
    <DrawingListPanel
      :project-id="currentProjectId"
      :buildings="buildings"
      :floors="floors"
      :disciplines="disciplines"
      @view-drawing="handleViewDrawing"
    />
  </div>
</template>

<script setup lang="ts">
import DrawingListPanel from "~/components/DrawingListPanel.vue";

// Get project tree data
const { data: treeData } = await useApi().get("/project-tree");

const currentProjectId = ref("your-project-id");

// Extract buildings, floors, disciplines from tree
const buildings = computed(() => {
  // Filter buildings for current project from treeData
  return treeData.value
    .filter(node => node.type === 'building' && node.projectId === currentProjectId.value)
    .map(node => ({ _id: node._id, name: node.name, code: node.code }));
});

const floors = computed(() => {
  return treeData.value
    .filter(node => node.type === 'floor' && node.projectId === currentProjectId.value)
    .map(node => ({
      _id: node._id,
      name: node.name,
      code: node.code,
      buildingId: node.buildingId
    }));
});

const disciplines = computed(() => {
  return treeData.value
    .filter(node => node.type === 'discipline' && node.projectId === currentProjectId.value)
    .map(node => ({
      _id: node._id,
      name: node.name,
      code: node.code,
      floorId: node.floorId
    }));
});

const handleViewDrawing = (drawing) => {
  // Navigate to drawing viewer or emit event
  console.log("View drawing:", drawing);
};
</script>
```

### Option 2: Use DrawingFilterPanel Separately

Nếu bạn muốn tách riêng filter UI:

```vue
<template>
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-4">
    <!-- Filter Sidebar -->
    <div class="lg:col-span-1">
      <DrawingFilterPanel
        :project-id="projectId"
        :buildings="buildings"
        :floors="floors"
        :disciplines="disciplines"
        @filter-change="handleFilterChange"
      />
    </div>

    <!-- Drawing List -->
    <div class="lg:col-span-3">
      <div v-if="loading">Loading...</div>
      <div v-else class="space-y-2">
        <div
          v-for="drawing in filteredDrawings"
          :key="drawing._id"
          class="rounded-lg border p-4"
        >
          <h3>{{ drawing.name }}</h3>
          <button @click="downloadDrawing(drawing)">Download</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DrawingFilterPanel from "~/components/DrawingFilterPanel.vue";

const api = useApi();
const filteredDrawings = ref([]);
const loading = ref(false);

const handleFilterChange = async (filters) => {
  loading.value = true;

  const params = {
    projectId: projectId.value,
    buildingIds: filters.buildingIds.map(b => b.value),
    floorIds: filters.floorIds.map(f => f.value),
    disciplineIds: filters.disciplineIds.map(d => d.value),
    levelCodes: filters.levelCodes.map(l => l.value),
    disciplineCodes: filters.disciplineCodes.map(d => d.value),
    fileType: filters.fileType
  };

  // Remove empty arrays
  Object.keys(params).forEach(key => {
    if (Array.isArray(params[key]) && params[key].length === 0) {
      delete params[key];
    }
  });

  try {
    filteredDrawings.value = await api.get("/drawings", { params });
  } catch (error) {
    console.error("Error fetching drawings:", error);
  } finally {
    loading.value = false;
  }
};

const downloadDrawing = async (drawing) => {
  const config = useRuntimeConfig();
  const token = useState("auth-token");
  const url = `${config.public.apiBase}/drawings/${drawing._id}/file?download=1&token=${token.value}`;

  window.open(url, "_blank");
};
</script>
```

## API Reference

### DrawingFilterPanel Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `projectId` | string | No | Current project ID |
| `buildings` | Array | No | List of buildings |
| `floors` | Array | No | List of floors |
| `disciplines` | Array | No | List of disciplines |

### DrawingFilterPanel Events

| Event | Payload | Description |
|-------|---------|-------------|
| `filter-change` | `DrawingFilters` | Emitted when filters change |

### DrawingFilters Type

```typescript
type DrawingFilters = {
  buildingIds: Array<{ label: string; value: string }>;
  floorIds: Array<{ label: string; value: string }>;
  disciplineIds: Array<{ label: string; value: string }>;
  levelCodes: Array<{ label: string; value: string }>;
  disciplineCodes: Array<{ label: string; value: string }>;
  fileType: "" | "2d" | "3d" | "hybrid";
};
```

### DrawingListPanel Props

Same as DrawingFilterPanel, plus:

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| All from DrawingFilterPanel | - | - | - |

### DrawingListPanel Events

| Event | Payload | Description |
|-------|---------|-------------|
| `view-drawing` | `Drawing` | Emitted when view button clicked |

## Backend API

### GET /api/drawings

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `projectId` | string | Filter by project | `?projectId=123` |
| `buildingIds` | string[] | Filter by buildings | `?buildingIds=["b1","b2"]` |
| `floorIds` | string[] | Filter by floors | `?floorIds=["f1"]` |
| `disciplineIds` | string[] | Filter by disciplines | `?disciplineIds=["d1"]` |
| `levelCodes` | string[] | Filter by level codes | `?levelCodes=["EG","1OG"]` |
| `disciplineCodes` | string[] | Filter by discipline codes | `?disciplineCodes=["ARC"]` |
| `fileType` | string | Filter by file type | `?fileType=2d` |
| `includeVersions` | boolean | Include all versions | `?includeVersions=true` |

**Response:**
```json
[
  {
    "_id": "abc123",
    "name": "Architectural Plan Level 1",
    "drawingCode": "B01-EG-ARC-001",
    "versionIndex": 1,
    "isLatestVersion": true,
    "fileType": "2d",
    "size": 2456789,
    "parsedMetadata": {
      "levelCode": "EG",
      "disciplineCode": "ARC",
      "buildingCode": "B01"
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

### GET /api/drawings/:id/file

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `download` | "1" \| "true" | Force download (vs inline view) |
| `token` | string | Auth token |

**Response Headers:**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="B01-EG-ARC-001.pdf"
Content-Length: 2456789
```

## Styling

Component sử dụng Tailwind CSS. Multiselect component có CSS riêng:

```vue
<style src="@vueform/multiselect/themes/default.css"></style>
```

Để customize multiselect, override CSS variables:

```css
:root {
  --ms-border-color: #cbd5e1;
  --ms-ring-color: #3b82f6;
  --ms-tag-bg: #dbeafe;
  --ms-tag-color: #1e40af;
}
```

## Examples

### Filter by building and floor

```javascript
const filters = {
  buildingIds: [{ label: "Building A (B01)", value: "building-id-1" }],
  floorIds: [{ label: "Level 1 (EG)", value: "floor-id-1" }],
  disciplineIds: [],
  levelCodes: [],
  disciplineCodes: [],
  fileType: ""
};
```

### Filter by metadata codes only

```javascript
const filters = {
  buildingIds: [],
  floorIds: [],
  disciplineIds: [],
  levelCodes: [
    { label: "EG (Tầng trệt)", value: "EG" },
    { label: "1OG (Tầng 1)", value: "1OG" }
  ],
  disciplineCodes: [
    { label: "ARC (Kiến trúc)", value: "ARC" }
  ],
  fileType: "2d"
};
```

## Troubleshooting

### Multiselect not showing

Đảm bảo đã import CSS:
```vue
<style src="@vueform/multiselect/themes/default.css"></style>
```

### Filters not cascading

Check rằng `buildingId`, `floorId` trong data đúng format và matching.

### Download not working

1. Check authentication token
2. Check file exists trong database
3. Check S3/local storage configuration
4. Check browser console for CORS errors

### PDF viewer slow

Đã có optimizations:
- Lazy rendering
- Tiled viewport rendering
- Quality scaling
- Debounced updates

Nếu vẫn chậm:
1. Giảm `MAX_QUALITY_SCALE` từ 10 → 5
2. Tăng `SHARPEN_DEBOUNCE_MS` từ 220ms → 400ms
3. Check PDF file size (>20MB có thể chậm)

## Performance Tips

1. **Filter strategically:** Start với building → floor → discipline cascade
2. **Limit metadata codes:** Không select quá 10 codes cùng lúc
3. **Use latest version only:** Set `includeVersions: false`
4. **Pagination:** Nếu có >100 drawings, implement pagination
5. **Cache results:** Cache API responses trong component

## Next Steps

- Implement batch download
- Add drawing thumbnails
- Add virtual scrolling for large lists
- Add full-text search in PDF content
- Add export filtered list to Excel
