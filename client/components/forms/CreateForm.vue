<template>
  <FormModal :show="show" :title="title" @close="$emit('close')">
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <!-- Project -->
      <template v-if="type === 'project'">
        <div>
          <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Tên dự án <span class="text-rose-400">*</span></label>
          <input v-model="form.name" type="text" class="input" placeholder="VD: Chung cư ABC" required />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Mô tả</label>
          <textarea v-model="form.description" class="input" rows="2" placeholder="Mô tả dự án..."></textarea>
        </div>
      </template>

      <!-- Building -->
      <template v-else-if="type === 'building'">
        <div>
          <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Tên toà nhà <span class="text-rose-400">*</span></label>
          <input v-model="form.name" type="text" class="input" placeholder="VD: Toà A" required />
        </div>
      </template>

      <!-- Floor -->
      <template v-else-if="type === 'floor'">
        <div>
          <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Tên tầng <span class="text-rose-400">*</span></label>
          <input v-model="form.name" type="text" class="input" placeholder="VD: Tầng 1" required />
        </div>
      </template>

      <!-- Discipline -->
      <template v-else-if="type === 'discipline'">
        <div>
          <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Tên bộ môn <span class="text-rose-400">*</span></label>
          <input v-model="form.name" type="text" class="input" placeholder="VD: Điện, Nước, PCCC..." required />
        </div>
      </template>

      <!-- Drawing -->
      <template v-else-if="type === 'drawing'">
        <!-- Tab 2D / 3D -->
        <div class="flex overflow-hidden rounded-lg border border-slate-200">
          <button
            type="button"
            class="flex-1 px-3 py-2 text-xs font-medium transition-colors"
            :class="drawingMode === '2d' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'"
            @click="drawingMode = '2d'"
          >
            2D PDF
          </button>
          <button
            type="button"
            class="flex-1 border-l border-slate-200 px-3 py-2 text-xs font-medium transition-colors"
            :class="drawingMode === '3d' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'"
            @click="drawingMode = '3d'"
          >
            3D IFC
          </button>
        </div>

        <!-- 3D IFC Upload -->
        <template v-if="drawingMode === '3d'">
          <div>
            <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">File IFC <span class="text-rose-400">*</span></label>
            <input type="file" class="input" accept=".ifc" @change="handleIfcFileChange" :required="drawingMode === '3d'" />
            <p class="mt-1 text-[11px] text-slate-500">File định dạng .ifc từ phần mềm BIM (Revit, ArchiCAD...).</p>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Tên bản vẽ 3D <span class="text-rose-400">*</span></label>
            <input v-model="ifcName" type="text" class="input" placeholder="VD: MODEL-3D-TONG-THE" :required="drawingMode === '3d'" />
          </div>
        </template>

        <!-- 2D PDF Upload -->
        <template v-else>
        <div>
          <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">File PDF <span class="text-rose-400">*</span></label>
          <input type="file" class="input" accept="application/pdf" @change="handleFileChange" :required="drawingMode === '2d'" />
          <p class="mt-1 text-[11px] text-slate-500">
            Chỉ cần tải file PDF. Hệ thống sẽ auto-scan metadata theo quy tắc trong huongdanv1.md.
          </p>
        </div>

        <div
          v-if="drawingAutoScanStatus !== 'idle' || uploadFile"
          class="rounded-lg border p-3"
          :class="requiresDrawingIntervention ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'"
        >
          <p class="text-xs font-semibold text-slate-700">Review &amp; Categorize</p>
          <p class="mt-1 text-[11px]" :class="requiresDrawingIntervention ? 'text-rose-700' : 'text-slate-500'">
            {{
              requiresDrawingIntervention
                ? drawingReviewMessage
                : "Metadata đã được auto-fill. Bạn có thể lưu ngay hoặc chỉnh lại."
            }}
          </p>

          <div v-if="drawingAutoScanStatus === 'scanning'" class="mt-2 text-xs text-brand-600">
            Đang auto-scan metadata...
          </div>

          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Tên bản vẽ <span class="text-rose-400">*</span></label>
              <input
                v-model="drawingDraftName"
                type="text"
                class="input"
                placeholder="VD: 2201.CYSAPA-A79-AA-KS-BS-L1-M2"
                @input="handleDrawingDraftNameInput"
              />
            </div>
          </div>

          <div v-if="requiresManualCoreTags" class="mt-3 rounded-lg border border-rose-200 bg-white p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-rose-700">
              OCR không đọc được tên chuẩn, cần chọn theo cấu trúc 7 trường cốt lõi
            </p>
            <p class="mt-1 text-[11px] text-slate-600">
              Chọn từng trường theo format `[Project]-[Originator]-[Discipline]-[Building]-[Volume]-[Level]-[Type]`.
            </p>

            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <div v-for="field in drawingCoreTagFields" :key="field">
                <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  {{ drawingCoreTagLabels[field] }}
                  <span v-if="drawingRequiredManualFields.includes(field)" class="text-rose-400">*</span>
                </label>
                <select
                  v-model="drawingManualTagSelections[field]"
                  class="input"
                  @change="handleDrawingCoreTagChange"
                >
                  <option value="">
                    {{ drawingRequiredManualFields.includes(field) ? "Chọn mã bắt buộc" : "Tùy chọn" }}
                  </option>
                  <option
                    v-for="option in getDrawingTagOptions(field)"
                    :key="`${field}-${option.value}`"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </div>
            </div>

            <div class="mt-3 grid gap-3 sm:grid-cols-3">
              <div v-for="field in drawingSupplementaryTagFields" :key="field">
                <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  {{ drawingSupplementaryTagLabels[field] }}
                </label>
                <select
                  v-model="drawingSupplementaryTagSelections[field]"
                  class="input"
                  @change="handleDrawingSupplementaryTagChange"
                >
                  <option value="">Tùy chọn</option>
                  <option
                    v-for="option in getDrawingSupplementaryTagOptions(field)"
                    :key="`${field}-${option.value}`"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </div>
            </div>

            <div class="mt-3">
              <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Tag bổ sung (tùy chọn)
              </label>
              <input
                v-model="drawingManualTagInput"
                type="text"
                class="input"
                placeholder="vd: revision:v-a, source:manual"
                list="cms-tag-suggestions"
              />
            </div>

            <p v-if="!hasAnyDrawingTagOptions" class="mt-2 text-[11px] text-rose-700">
              Chưa đủ gợi ý mã chuyên ngành từ file. Bạn vẫn có thể nhập tag bổ sung theo dạng field:value.
            </p>

            <p v-if="manualDrawingName" class="mt-2 text-[11px] text-slate-600">
              Tên bản vẽ ghép tự động: <span class="font-semibold text-slate-700">{{ manualDrawingName }}</span>
            </p>
          </div>

          <p v-if="drawingValidationMessage" class="mt-2 text-xs text-rose-600">
            {{ drawingValidationMessage }}
          </p>
        </div>
        </template><!-- end 2D -->
      </template>

      <!-- Task -->
      <template v-else-if="type === 'task'">
        <div>
          <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Tên Pin</label>
          <input v-model="form.pinName" type="text" class="input" placeholder="VD: Điểm đo 1" list="pin-suggestions" @change="onPinNameSelect" />
          <datalist id="pin-suggestions">
            <option v-for="s in pinSuggestions" :key="s.pinName" :value="s.pinName">
              {{ s.pinCode }}
            </option>
          </datalist>
          <p v-if="pinSuggestions.length" class="mt-1 text-[11px] text-slate-400">Gợi ý từ các pin đã tạo trong dự án</p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Trạng thái</label>
            <select v-model="form.status" class="input">
              <option value="instruction">Hướng dẫn cho người vẽ</option>
              <option value="rfi">Yêu cầu thêm thông tin (RFI)</option>
              <option value="resolved">Đã hoàn thành</option>
              <option value="approved">Đã được QA kiểm soát</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Loại</label>
            <select v-model="form.category" class="input">
              <option value="quality">Chất lượng</option>
              <option value="safety">An toàn</option>
              <option value="progress">Tiến độ</option>
              <option value="fire_protection">Chống cháy</option>
              <option value="other">Khác</option>
            </select>
          </div>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Mô tả</label>
          <textarea v-model="form.description" class="input" rows="2" placeholder="Mô tả chi tiết..."></textarea>
        </div>
      </template>

      <datalist id="cms-tag-suggestions">
        <option v-for="tag in cmsTagSuggestions" :key="tag" :value="tag" />
      </datalist>

      <div v-if="errorMsg" class="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-600">
        {{ errorMsg }}
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <button
          type="button"
          class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
          @click="$emit('close')"
        >
          Huỷ
        </button>
        <button
          type="submit"
          class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          :disabled="submitting || (type === 'drawing' && !canSubmitDrawing)"
        >
          {{ submitting ? "Đang tạo..." : "Tạo mới" }}
        </button>
      </div>
    </form>
  </FormModal>
</template>

<script setup lang="ts">
import { isOfflineQueuedResponse, useApi } from "~/composables/api/useApi";
import { useToast } from "~/composables/state/useToast";
import { useProjectTree } from "~/composables/api/useProjectTree";
import { autoScanDrawingFile, type DrawingAutoScanResult } from "~/utils/drawing-auto-scan";

export type CreateFormType = "project" | "building" | "floor" | "discipline" | "drawing" | "task";

const props = defineProps<{
  show: boolean;
  type: CreateFormType;
  parentId?: string;
  initialPinX?: number;
  initialPinY?: number;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "created", data: unknown): void;
}>();

const api = useApi();
const toast = useToast();
const { fetchTree } = useProjectTree();

const submitting = ref(false);
const errorMsg = ref("");
const drawingMode = ref<'2d' | '3d'>('2d');
const ifcFile = ref<File | null>(null);
const ifcName = ref('');
const uploadFile = ref<File | null>(null);
const drawingAutoScanStatus = ref<"idle" | "scanning" | "matched" | "unmatched" | "error">("idle");
const drawingAutoScanSource = ref<"filename" | "ocr" | "none">("none");
const drawingAutoScanText = ref<string>("");
const drawingParsed = ref<NonNullable<DrawingAutoScanResult["parsed"]> | null>(null);
const drawingDraftName = ref("");
const cmsTagSuggestions = ref<string[]>([]);

type CmsTagNameSuggestionItem = {
  scope:
    | "project"
    | "discipline"
    | "originator"
    | "building"
    | "volume"
    | "zone"
    | "level"
    | "room"
    | "content_type"
    | "issue_status"
    | "file_type"
    | "grid_axis"
    | "custom";
  code: string;
  aliases?: string[];
  label?: string;
  description?: string;
  isActive: boolean;
};

type DrawingCoreTagField = "project" | "unit" | "discipline" | "building" | "part" | "floor" | "fileType";
type DrawingSupplementaryTagField = "room" | "issueStatus" | "gridAxis";
type DrawingTagOption = { value: string; label: string };
const drawingCoreTagFields = [
  "project",
  "unit",
  "discipline",
  "building",
  "part",
  "floor",
  "fileType"
] as const satisfies readonly DrawingCoreTagField[];
const drawingCoreTagLabels: Record<DrawingCoreTagField, string> = {
  project: "Mã dự án",
  unit: "Đơn vị",
  discipline: "Bộ môn",
  building: "Tòa nhà",
  part: "Phân khu",
  floor: "Tầng",
  fileType: "Loại bản vẽ"
};
const drawingSupplementaryTagFields = ["room", "issueStatus", "gridAxis"] as const satisfies readonly DrawingSupplementaryTagField[];
const drawingSupplementaryTagLabels: Record<DrawingSupplementaryTagField, string> = {
  room: "Phòng",
  issueStatus: "Trạng thái phát hành",
  gridAxis: "Trục tọa độ"
};
const drawingSupplementaryTagKeys: Record<DrawingSupplementaryTagField, string> = {
  room: "room",
  issueStatus: "issue-status",
  gridAxis: "grid-axis"
};
const drawingDisciplineLabels: Record<string, string> = {
  AA: "Kiến trúc",
  AR: "Kiến trúc (alt)",
  ES: "Kết cấu",
  ST: "Kết cấu (alt)",
  EM: "Cơ điện / Điều hòa",
  ME: "Cơ điện / Điều hòa (alt)",
  EL: "Điện",
  EP: "Cấp thoát nước",
  PL: "Cấp thoát nước (alt)",
  EF: "PCCC",
  FP: "PCCC (alt)",
  HV: "Thông gió & Điều hòa",
  IN: "Nội thất",
  LA: "Cảnh quan",
  LU: "Thông gió (DE)",
  SW: "Thoát nước (DE)",
  A: "Alias -> AA",
  S: "Alias -> ES",
  H: "Alias -> EM",
  F: "Alias -> EF"
};
const drawingBuildingLabels: Record<string, string> = {
  KS: "Khách sạn",
  TM: "TTTM",
  VP: "Văn phòng",
  NT: "Chung cư"
};
const drawingPartLabels: Record<string, string> = {
  BS: "Khối hầm",
  PO: "Khối đế",
  TY: "Tầng điển hình",
  XO: "Toàn khu"
};
const drawingFloorLabels: Record<string, string> = {
  B1: "Tầng hầm 1",
  B2: "Tầng hầm 2",
  B3: "Tầng hầm 3",
  L1: "Tầng 1",
  L2: "Tầng 2",
  L3: "Tầng 3",
  RF: "Tầng mái",
  DG: "Tầng mái (Dachgeschoss)",
  DA: "Tầng mái",
  ZZ: "Toàn khu/chung",
  UG: "Untergeschoss",
  UG1: "Untergeschoss 1",
  UG2: "Untergeschoss 2",
  EG: "Erdgeschoss",
  GF: "Ground Floor",
  OG1: "Obergeschoss 1",
  OG2: "Obergeschoss 2",
  OG3: "Obergeschoss 3",
  MZ: "Mezzanine",
  MEZ: "Mezzanine"
};
const drawingFileTypeLabels: Record<string, string> = {
  M2: "Bản vẽ 2D",
  M3: "Mô hình 3D",
  DR: "Drawing",
  SH: "Schedule",
  SM: "Schema",
  DT: "Detail",
  IS: "Isometric",
  KP: "Connection detail"
};
const drawingDisciplineAliasMap: Record<string, string> = {
  A: "AA",
  S: "ES",
  H: "EM",
  F: "EF"
};
const drawingFieldBaseOptions: Record<DrawingCoreTagField, string[]> = {
  project: [],
  unit: [],
  discipline: Object.keys(drawingDisciplineLabels),
  building: Object.keys(drawingBuildingLabels),
  part: Object.keys(drawingPartLabels),
  floor: Object.keys(drawingFloorLabels),
  fileType: Object.keys(drawingFileTypeLabels)
};
const drawingFieldCmsScopes: Record<DrawingCoreTagField, CmsTagNameSuggestionItem["scope"][]> = {
  project: ["project"],
  unit: ["originator"],
  discipline: ["discipline"],
  building: ["building"],
  part: ["volume", "zone"],
  floor: ["level"],
  fileType: ["file_type", "content_type"]
};
const drawingSupplementaryCmsScopes: Record<DrawingSupplementaryTagField, CmsTagNameSuggestionItem["scope"][]> = {
  room: ["room"],
  issueStatus: ["issue_status"],
  gridAxis: ["grid_axis"]
};
const drawingFilenameTokens = ref<string[]>([]);
const drawingManualTagInput = ref("");
const cmsTagItems = ref<CmsTagNameSuggestionItem[]>([]);
const selectedProjectCode = ref("");
const drawingDraftNameLockedByUser = ref(false);
const drawingManualTagsLockedByUser = ref(false);
const drawingAutoScanRequestId = ref(0);
const drawingDraftProjectToken = ref("");
const DRAFT_PROJECT_TOKEN_DEBOUNCE_MS = 300;
let draftProjectTokenTimer: ReturnType<typeof setTimeout> | null = null;
const drawingRequiredManualFields = [
  "project",
  "unit",
  "discipline",
  "building",
  "part",
  "floor",
  "fileType"
] as const satisfies readonly DrawingCoreTagField[];
const drawingManualTagSelections = reactive<Record<DrawingCoreTagField, string>>({
  project: "",
  unit: "",
  discipline: "",
  building: "",
  part: "",
  floor: "",
  fileType: ""
});
const drawingSupplementaryTagSelections = reactive<Record<DrawingSupplementaryTagField, string>>({
  room: "",
  issueStatus: "",
  gridAxis: ""
});

// #13/#14 Pin suggestions for autofill
type PinSuggestion = {
  pinName: string;
  pinCode: string;
  status?: string;
  category?: string;
  description?: string;
};
const pinSuggestions = ref<PinSuggestion[]>([]);

const taskDraftKey = computed(() => `task-form-draft:${props.parentId || "unknown"}`);

const fetchPinSuggestions = async () => {
  if (props.type !== "task" || !props.parentId) { pinSuggestions.value = []; return; }
  try {
    const data = await api.get<PinSuggestion[]>(`/tasks/pin-suggestions?drawingId=${props.parentId}`);
    pinSuggestions.value = data || [];
  } catch { pinSuggestions.value = []; }
};

const normalizeDrawingTagToken = (value: string, allowDot = false) => {
  const pattern = allowDot ? /[^A-Z0-9.]+/g : /[^A-Z0-9]+/g;
  return value
    .trim()
    .toUpperCase()
    .replace(pattern, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const normalizeDrawingTagName = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.:-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const hasAlpha = (value: string) => /[A-Z]/.test(value);
const hasDigit = (value: string) => /[0-9]/.test(value);

const isLikelyProjectFieldValue = (value: string) => {
  const normalized = value.trim().toUpperCase();
  if (!normalized) return false;
  const segments = normalized.split("-").filter(Boolean);
  if (segments.length === 0) return false;
  if (!hasDigit(segments[0])) return false;
  return segments.every((segment) => /^[A-Z0-9.]+$/.test(segment));
};

const normalizeDrawingFieldValue = (field: DrawingCoreTagField, rawValue: string) => {
  const base = field === "project"
    ? rawValue
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
    : normalizeDrawingTagToken(rawValue, false);
  if (!base) return "";
  if (field === "discipline") {
    return drawingDisciplineAliasMap[base] || base;
  }
  return base;
};

const isValidDrawingFieldValue = (field: DrawingCoreTagField, value: string) => {
  if (!value) return false;
  switch (field) {
    case "project":
      return isLikelyProjectFieldValue(value);
    case "unit":
      return /^[A-Z0-9]+$/.test(value) && hasAlpha(value);
    case "discipline":
      return /^[A-Z0-9]+$/.test(value) && hasAlpha(value);
    case "building":
      return /^[A-Z0-9]+$/.test(value) && hasAlpha(value);
    case "part":
      return /^[A-Z0-9]+$/.test(value) && hasAlpha(value);
    case "floor":
      if (/^(B\d+|L\d+|RF|DG|DA|UG\d*|EG|GF|OG\d+|MZ|MEZ|ZZ)$/i.test(value)) return true;
      return /^[A-Z0-9]+$/.test(value) && (hasAlpha(value) || hasDigit(value));
    case "fileType":
      return /^[A-Z][A-Z0-9]*$/.test(value);
    default:
      return false;
  }
};

const toUniqueTokens = (tokens: string[], allowDot = false) => {
  const unique = new Set<string>();
  tokens.forEach((rawToken) => {
    const token = normalizeDrawingTagToken(rawToken, allowDot);
    if (token) unique.add(token);
  });
  return Array.from(unique);
};

const extractFilenameTokens = (filename: string) => {
  const normalizedName = filename
    .replace(/\.[^.]+$/, "")
    .replace(/[_\s]+/g, "-");
  const tokens = normalizedName.split(/[^A-Za-z0-9.-]+/).flatMap((part) => part.split("-"));
  return toUniqueTokens(tokens, false);
};

const extractOcrTokens = (text: string) => {
  const tokens = text
    .toUpperCase()
    .replace(/[_\s]+/g, "-")
    .split(/[^A-Z0-9.-]+/)
    .flatMap((part) => part.split("-"));
  return toUniqueTokens(tokens, false);
};

const cmsItemsByScope = computed(() => {
  const map = new Map<string, CmsTagNameSuggestionItem[]>();
  cmsTagItems.value.forEach((item) => {
    if (!item.isActive) return;
    if (!map.has(item.scope)) map.set(item.scope, []);
    map.get(item.scope)!.push(item);
  });
  return map;
});

const getCmsTagItemsByScopes = (scopes: CmsTagNameSuggestionItem["scope"][]) => {
  return scopes.flatMap((scope) => cmsItemsByScope.value.get(scope) ?? []);
};

const getCmsTagItemsForField = (field: DrawingCoreTagField) => {
  const scopes = drawingFieldCmsScopes[field] || [];
  return getCmsTagItemsByScopes(scopes);
};

const getCmsTagCodesForField = (field: DrawingCoreTagField) => {
  const codes: string[] = [];
  getCmsTagItemsForField(field).forEach((item) => {
    codes.push(item.code);
    (item.aliases || []).forEach((alias) => codes.push(alias));
  });
  return toUniqueTokens(codes, field === "project");
};

const getCmsTagLabelForField = (field: DrawingCoreTagField, value: string) => {
  const normalizedValue = normalizeDrawingFieldValue(field, value);
  if (!normalizedValue) return "";

  const matchedItem = getCmsTagItemsForField(field).find((item) => {
    if (normalizeDrawingFieldValue(field, item.code) === normalizedValue) return true;
    return (item.aliases || []).some((alias) => normalizeDrawingFieldValue(field, alias) === normalizedValue);
  });

  if (!matchedItem?.label) return "";
  return `${normalizedValue} - ${matchedItem.label}`;
};

const getDrawingTagLabel = (field: DrawingCoreTagField, value: string) => {
  const cmsLabel = getCmsTagLabelForField(field, value);
  if (cmsLabel) return cmsLabel;

  const maps: Record<DrawingCoreTagField, Record<string, string>> = {
    project: {},
    unit: {},
    discipline: drawingDisciplineLabels,
    building: drawingBuildingLabels,
    part: drawingPartLabels,
    floor: drawingFloorLabels,
    fileType: drawingFileTypeLabels
  };
  const description = maps[field][value];
  return description ? `${value} - ${description}` : value;
};

const collectDrawingFieldTokenCandidates = (field: DrawingCoreTagField, tokens: string[]) => {
  const normalized: string[] = [];
  tokens.forEach((token, index) => {
    const value = normalizeDrawingFieldValue(field, token);
    if (!value || !isValidDrawingFieldValue(field, value)) return;
    if (field === "project" && !hasAlpha(value) && index > 0) return;
    normalized.push(value);
  });
  return toUniqueTokens(normalized, field === "project");
};

const buildDrawingTagOptionsForField = (field: DrawingCoreTagField) => {
  const values: string[] = [];
  values.push(...drawingFieldBaseOptions[field]);
  values.push(...getCmsTagCodesForField(field));

  if (drawingParsed.value) {
    const parsedValues: Partial<Record<DrawingCoreTagField, string | undefined>> = {
      project: drawingParsed.value.projectCode,
      unit: drawingParsed.value.unitCode,
      discipline: drawingParsed.value.disciplineCode,
      building: drawingParsed.value.buildingCode,
      part: drawingParsed.value.buildingPartCode,
      floor: drawingParsed.value.floorCode,
      fileType: drawingParsed.value.fileTypeCode
    };
    const parsedFieldValue = parsedValues[field];
    if (parsedFieldValue) values.push(parsedFieldValue);
  }

  if (field === "project") {
    if (selectedProjectCode.value) {
      values.push(selectedProjectCode.value);
    }
    const draftProject = drawingDraftProjectToken.value;
    if (draftProject) values.push(draftProject);
  }

  values.push(...collectDrawingFieldTokenCandidates(field, drawingFilenameTokens.value));

  const normalizedValues = values
    .map((value) => normalizeDrawingFieldValue(field, value))
    .filter((value) => isValidDrawingFieldValue(field, value));

  const uniqueValues = Array.from(new Set(normalizedValues));
  return uniqueValues.map((value) => ({ value, label: getDrawingTagLabel(field, value) }));
};

const drawingTagOptionsByField = computed<Record<DrawingCoreTagField, DrawingTagOption[]>>(() => {
  return {
    project: buildDrawingTagOptionsForField("project"),
    unit: buildDrawingTagOptionsForField("unit"),
    discipline: buildDrawingTagOptionsForField("discipline"),
    building: buildDrawingTagOptionsForField("building"),
    part: buildDrawingTagOptionsForField("part"),
    floor: buildDrawingTagOptionsForField("floor"),
    fileType: buildDrawingTagOptionsForField("fileType")
  };
});

const getDrawingTagOptions = (field: DrawingCoreTagField): DrawingTagOption[] => {
  return drawingTagOptionsByField.value[field] || [];
};

const drawingSupplementaryTagOptionsByField = computed<Record<DrawingSupplementaryTagField, DrawingTagOption[]>>(() => {
  const result = {} as Record<DrawingSupplementaryTagField, DrawingTagOption[]>;
  drawingSupplementaryTagFields.forEach((field) => {
    const scopes = drawingSupplementaryCmsScopes[field] || [];
    const items = getCmsTagItemsByScopes(scopes);
    const values: string[] = [];
    items.forEach((item) => {
      values.push(item.code);
      (item.aliases || []).forEach((alias) => values.push(alias));
    });
    const normalizedValues = toUniqueTokens(values, false);
    result[field] = normalizedValues.map((value) => {
      const matched = items.find((item) => {
        const normalizedCode = normalizeDrawingTagToken(item.code, false);
        if (normalizedCode === value) return true;
        return (item.aliases || []).some((alias) => normalizeDrawingTagToken(alias, false) === value);
      });
      if (matched?.label) {
        return { value, label: `${value} - ${matched.label}` };
      }
      return { value, label: value };
    });
  });
  return result;
});

const getDrawingSupplementaryTagOptions = (field: DrawingSupplementaryTagField): DrawingTagOption[] => {
  return drawingSupplementaryTagOptionsByField.value[field] || [];
};

const hasAnyDrawingTagOptions = computed(() => {
  return (
    drawingCoreTagFields.some((field) => getDrawingTagOptions(field).length > 0) ||
    drawingSupplementaryTagFields.some((field) => getDrawingSupplementaryTagOptions(field).length > 0)
  );
});

const resetDrawingManualTags = () => {
  drawingFilenameTokens.value = [];
  drawingManualTagInput.value = "";
  drawingCoreTagFields.forEach((field) => {
    drawingManualTagSelections[field] = "";
  });
  drawingSupplementaryTagFields.forEach((field) => {
    drawingSupplementaryTagSelections[field] = "";
  });
};

const handleDrawingDraftNameInput = () => {
  drawingDraftNameLockedByUser.value = true;
  if (draftProjectTokenTimer !== null) clearTimeout(draftProjectTokenTimer);
  draftProjectTokenTimer = setTimeout(() => {
    drawingDraftProjectToken.value = drawingDraftName.value.split("-")[0] || "";
    draftProjectTokenTimer = null;
  }, DRAFT_PROJECT_TOKEN_DEBOUNCE_MS);
};

const handleDrawingCoreTagChange = () => {
  drawingManualTagsLockedByUser.value = true;
};

const handleDrawingSupplementaryTagChange = () => {
  drawingManualTagsLockedByUser.value = true;
};

const applyDrawingManualTagsFromTokens = (tokens: string[]) => {
  drawingFilenameTokens.value = toUniqueTokens(tokens, false);
  drawingCoreTagFields.forEach((field) => {
    const candidates = collectDrawingFieldTokenCandidates(field, drawingFilenameTokens.value);
    drawingManualTagSelections[field] = candidates[0] || "";
  });
};

const fillMissingDrawingManualTagsFromTokens = (tokens: string[]) => {
  const normalizedTokens = toUniqueTokens(tokens, false);
  drawingCoreTagFields.forEach((field) => {
    if (drawingManualTagSelections[field]) return;
    const candidates = collectDrawingFieldTokenCandidates(field, normalizedTokens);
    if (candidates.length > 0) {
      drawingManualTagSelections[field] = candidates[0];
    }
  });
};

const applyDrawingManualTagsFromParsed = (parsed: NonNullable<DrawingAutoScanResult["parsed"]>) => {
  const parsedValues: Partial<Record<DrawingCoreTagField, string | undefined>> = {
    project: parsed.projectCode,
    unit: parsed.unitCode,
    discipline: parsed.disciplineCode,
    building: parsed.buildingCode,
    part: parsed.buildingPartCode,
    floor: parsed.floorCode,
    fileType: parsed.fileTypeCode
  };
  drawingCoreTagFields.forEach((field) => {
    const rawValue = parsedValues[field] || "";
    const normalizedValue = normalizeDrawingFieldValue(field, rawValue);
    drawingManualTagSelections[field] = normalizedValue && isValidDrawingFieldValue(field, normalizedValue)
      ? normalizedValue
      : "";
  });
};

const buildDrawingNameFromManualSelections = () => {
  const requiredSegments = drawingRequiredManualFields.map((field) => {
    const normalized = normalizeDrawingFieldValue(field, drawingManualTagSelections[field]);
    return isValidDrawingFieldValue(field, normalized) ? normalized : "";
  });

  if (requiredSegments.some((segment) => !segment)) {
    return "";
  }

  return requiredSegments.join("-");
};

const manualDrawingName = computed(() => {
  return buildDrawingNameFromManualSelections();
});

const buildManualDrawingTagNames = () => {
  const tags: string[] = [];
  drawingCoreTagFields.forEach((field) => {
    const rawValue = drawingManualTagSelections[field];
    const normalizedFieldValue = normalizeDrawingFieldValue(field, rawValue);
    if (!normalizedFieldValue || !isValidDrawingFieldValue(field, normalizedFieldValue)) return;
    const normalizedValue = normalizeDrawingTagName(normalizedFieldValue);
    const normalizedField = normalizeDrawingTagName(field);
    tags.push(`${normalizedField}:${normalizedValue}`);
  });

  drawingSupplementaryTagFields.forEach((field) => {
    const rawValue = drawingSupplementaryTagSelections[field];
    const normalizedValue = normalizeDrawingTagToken(rawValue, false);
    if (!normalizedValue) return;
    const fieldKey = drawingSupplementaryTagKeys[field];
    tags.push(`${fieldKey}:${normalizeDrawingTagName(normalizedValue)}`);
  });

  parseTagNames(drawingManualTagInput.value).forEach((rawTag) => {
    const normalizedTag = normalizeDrawingTagName(rawTag);
    if (!normalizedTag) return;
    tags.push(normalizedTag);
  });

  return Array.from(new Set(tags));
};

const requiresManualCoreTags = computed(() => {
  if (props.type !== "drawing" || !uploadFile.value) return false;
  return !drawingParsed.value;
});

const missingManualCoreTagFields = computed(() => {
  if (!requiresManualCoreTags.value) return [];
  return drawingRequiredManualFields.filter((field) => !drawingManualTagSelections[field]);
});

const missingManualCoreTagLabels = computed(() => {
  return missingManualCoreTagFields.value.map((field) => drawingCoreTagLabels[field]);
});

const drawingReviewMessage = computed(() => {
  if (requiresManualCoreTags.value) {
    return "OCR chưa đọc được tên chuẩn. Bắt buộc chọn đủ 7 trường lõi để hệ thống tự ghép Tên bản vẽ.";
  }
  return "Metadata đã được nhận diện từ file PDF. Bạn có thể lưu ngay hoặc chỉnh lại Tên bản vẽ.";
});

const drawingValidationMessage = computed(() => {
  if (props.type !== "drawing" || !uploadFile.value) return "";
  const hasDraftName = !!drawingDraftName.value.trim();
  if (hasDraftName) {
    const normalizedDraftSegments = drawingDraftName.value
      .trim()
      .replace(/[_\s]+/g, "-")
      .split("-")
      .map((segment) => segment.trim())
      .filter(Boolean);
    const minSegments = requiresManualCoreTags.value ? 7 : 6;
    if (normalizedDraftSegments.length < minSegments) {
      if (minSegments === 7) {
        return "Tên bản vẽ chưa đúng cấu trúc. Cần đủ 7 trường: Project-Originator-Discipline-Building-Volume-Level-Type.";
      }
      return "Tên bản vẽ chưa đúng cấu trúc. Cần tối thiểu 6 trường: Project-Originator-Discipline-Building-Volume-Level.";
    }
    return "";
  }
  if (requiresManualCoreTags.value && missingManualCoreTagLabels.value.length > 0) {
    return `Thiếu Tên bản vẽ. Vui lòng chọn mã cho: ${missingManualCoreTagLabels.value.join(", ")} hoặc nhập tên chuẩn thủ công.`;
  }
  if (manualDrawingName.value) return "";
  return "Thiếu Tên bản vẽ. Nhập tên theo chuẩn hoặc chọn đủ 7 trường lõi để hệ thống ghép tự động.";
});

const requiresDrawingIntervention = computed(() => {
  if (props.type !== "drawing" || !uploadFile.value) return false;
  return !!drawingValidationMessage.value;
});

const canSubmitDrawing = computed(() => {
  if (props.type !== "drawing") return true;
  if (drawingMode.value === "3d") return !!ifcFile.value && !!ifcName.value.trim();
  return !!uploadFile.value && !drawingValidationMessage.value;
});

const saveTaskDraft = () => {
  if (!process.client || props.type !== "task") return;
  const draft = {
    pinName: form.pinName,
    description: form.description,
    status: form.status,
    category: form.category
  };
  try {
    localStorage.setItem(taskDraftKey.value, JSON.stringify(draft));
  } catch {
    // Ignore localStorage errors
  }
};

const clearTaskDraft = () => {
  if (!process.client || props.type !== "task") return;
  try {
    localStorage.removeItem(taskDraftKey.value);
  } catch {
    // Ignore localStorage errors
  }
};

const restoreTaskDraft = () => {
  if (!process.client || props.type !== "task") return;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(taskDraftKey.value);
  } catch {
    raw = null;
  }
  if (!raw) return;

  try {
    const draft = JSON.parse(raw) as Partial<typeof form>;
    form.pinName = draft.pinName || "";
    form.description = draft.description || "";
    form.status = (draft.status as string) || "instruction";
    form.category = (draft.category as string) || "quality";
  } catch {
    // Ignore malformed draft
  }
};

const onPinNameSelect = () => {
  // Auto-fill full form from matching suggestion
  const match = pinSuggestions.value.find((s) => s.pinName === form.pinName);
  if (match) {
    if (match.status) form.status = match.status;
    if (match.category) form.category = match.category;
    if (match.description && !form.description) form.description = match.description;
  }
};

const parseTagNames = (value: string) => {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.toLowerCase())
    .filter((item, index, arr) => arr.indexOf(item) === index);
};

const scopeToTagField = (scope: CmsTagNameSuggestionItem["scope"]) => {
  if (scope === "file_type") return "filetype";
  return scope;
};

const fetchCmsTagSuggestions = async () => {
  try {
    const tagItems = await api.get<CmsTagNameSuggestionItem[]>("/cms/tag-names?active=1");
    cmsTagItems.value = tagItems || [];
    const suggestions = new Set<string>();
    (cmsTagItems.value || []).forEach((item) => {
      if (!item?.isActive) return;
      const field = scopeToTagField(item.scope);
      const primaryCode = String(item.code || "").trim().toLowerCase();
      if (primaryCode) {
        suggestions.add(`${field}:${primaryCode}`);
        suggestions.add(primaryCode);
      }
      (item.aliases || []).forEach((alias) => {
        const normalizedAlias = String(alias || "").trim().toLowerCase();
        if (!normalizedAlias) return;
        suggestions.add(`${field}:${normalizedAlias}`);
        suggestions.add(normalizedAlias);
      });
    });
    cmsTagSuggestions.value = Array.from(suggestions);
  } catch {
    cmsTagItems.value = [];
    cmsTagSuggestions.value = [];
  }
};

const fetchDrawingProjectCode = async () => {
  if (props.type !== "drawing" || !props.parentId) {
    selectedProjectCode.value = "";
    return;
  }

  try {
    const project = await api.get<{ code?: string }>(`/projects/${props.parentId}`);
    const normalizedProjectCode = normalizeDrawingFieldValue("project", String(project?.code || ""));
    selectedProjectCode.value = normalizedProjectCode;
    if (!drawingManualTagSelections.project && normalizedProjectCode) {
      drawingManualTagSelections.project = normalizedProjectCode;
    }
  } catch {
    selectedProjectCode.value = "";
  }
};

const form = reactive({
  name: "",
  description: "",
  pinName: "",
  status: "instruction",
  category: "quality",
  pinX: 0.5,
  pinY: 0.5
});

const title = computed(() => {
  const titles: Record<CreateFormType, string> = {
    project: "Tạo dự án mới",
    building: "Tạo toà nhà mới",
    floor: "Tạo tầng mới",
    discipline: "Tạo bộ môn mới",
    drawing: "Tải lên bản vẽ",
    task: "Tạo Task/Pin mới"
  };
  return titles[props.type];
});

const handleFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (!input.files || !input.files[0]) return;

  const requestId = drawingAutoScanRequestId.value + 1;
  drawingAutoScanRequestId.value = requestId;
  const selectedFile = input.files[0];
  const extractedTokens = extractFilenameTokens(selectedFile.name);
  uploadFile.value = selectedFile;
  drawingAutoScanStatus.value = "scanning";
  drawingAutoScanSource.value = "none";
  drawingAutoScanText.value = "";
  drawingParsed.value = null;
  drawingDraftName.value = "";
  drawingDraftProjectToken.value = "";
  drawingDraftNameLockedByUser.value = false;
  drawingManualTagsLockedByUser.value = false;
  resetDrawingManualTags();
  applyDrawingManualTagsFromTokens(extractedTokens);

  try {
    const result = await autoScanDrawingFile(selectedFile);
    if (requestId !== drawingAutoScanRequestId.value) {
      return;
    }
    drawingAutoScanSource.value = result.source;
    drawingAutoScanText.value = result.ocrText || "";
    drawingParsed.value = result.parsed || null;
    const ocrTokens = extractOcrTokens(drawingAutoScanText.value);
    drawingFilenameTokens.value = toUniqueTokens([...drawingFilenameTokens.value, ...ocrTokens], false);
    if (!drawingManualTagsLockedByUser.value) {
      fillMissingDrawingManualTagsFromTokens(drawingFilenameTokens.value);
    }

    if (result.parsed) {
      if (!drawingDraftNameLockedByUser.value) {
        drawingDraftName.value = result.parsed.suggestedName || result.parsed.drawingCode || "";
        drawingDraftProjectToken.value = drawingDraftName.value.split("-")[0] || "";
      }
      if (!drawingManualTagsLockedByUser.value) {
        applyDrawingManualTagsFromParsed(result.parsed);
      }
    } else if (!drawingDraftName.value && extractedTokens.length > 0 && !drawingDraftNameLockedByUser.value) {
      drawingDraftName.value = extractedTokens.slice(0, 7).join("-");
      drawingDraftProjectToken.value = drawingDraftName.value.split("-")[0] || "";
    }

    drawingAutoScanStatus.value = result.matched ? "matched" : "unmatched";

    if (result.matched) {
      toast.push("Auto-scan đã nhận diện metadata bản vẽ", "success");
    } else if (result.error) {
      toast.push("Auto-scan không lấy được metadata: " + result.error, "info");
    } else {
      toast.push("Không đọc được metadata từ file. Vui lòng chọn các trường lõi để ghép Tên bản vẽ.", "info");
    }
  } catch {
    if (requestId !== drawingAutoScanRequestId.value) {
      return;
    }
    drawingAutoScanStatus.value = "error";
    toast.push("Auto-scan thất bại. Vui lòng chọn các trường lõi để nhập Tên bản vẽ thủ công.", "error");
  }
};

const handleIfcFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (!input.files || !input.files[0]) return;
  ifcFile.value = input.files[0];
  if (!ifcName.value) {
    ifcName.value = input.files[0].name.replace(/\.ifc$/i, "").toUpperCase();
  }
};

const resetForm = () => {
  form.name = "";
  form.description = "";
  form.pinName = "";
  form.status = "instruction";
  form.category = "quality";
  form.pinX = props.initialPinX ?? 0.5;
  form.pinY = props.initialPinY ?? 0.5;

  uploadFile.value = null;
  ifcFile.value = null;
  ifcName.value = "";
  drawingMode.value = "2d";
  drawingAutoScanStatus.value = "idle";
  drawingAutoScanSource.value = "none";
  drawingAutoScanText.value = "";
  drawingParsed.value = null;
  drawingDraftName.value = "";
  drawingDraftProjectToken.value = "";
  if (draftProjectTokenTimer !== null) {
    clearTimeout(draftProjectTokenTimer);
    draftProjectTokenTimer = null;
  }
  drawingDraftNameLockedByUser.value = false;
  drawingManualTagsLockedByUser.value = false;
  resetDrawingManualTags();

  errorMsg.value = "";
};

const handleSubmit = async () => {
  if (submitting.value) return;
  submitting.value = true;
  errorMsg.value = "";

  try {
    let result: unknown;
    let taskPayload: Record<string, unknown> | null = null;

    switch (props.type) {
      case "project":
        result = await api.post("/projects", {
          name: form.name,
          description: form.description || undefined
        });
        break;

      case "building":
        result = await api.post("/buildings", {
          projectId: props.parentId,
          name: form.name
        });
        break;

      case "floor":
        result = await api.post("/floors", {
          buildingId: props.parentId,
          name: form.name
        });
        break;

      case "discipline":
        result = await api.post("/disciplines", {
          floorId: props.parentId,
          name: form.name
        });
        break;

      case "drawing": {
        if (!props.parentId) {
          errorMsg.value = "Cần chọn project để tải bản vẽ";
          return;
        }

        // 3D IFC upload
        if (drawingMode.value === "3d") {
          if (!ifcFile.value) {
            errorMsg.value = "Vui lòng chọn file IFC";
            return;
          }
          if (!ifcName.value.trim()) {
            errorMsg.value = "Vui lòng nhập tên bản vẽ 3D";
            return;
          }
          const ifcFormData = new FormData();
          ifcFormData.append("projectId", props.parentId);
          ifcFormData.append("name", ifcName.value.trim().toUpperCase());
          ifcFormData.append("drawingCode", ifcName.value.trim().toUpperCase());
          ifcFormData.append("file", ifcFile.value);
          result = await api.upload("/drawings/ifc", ifcFormData);
          break;
        }

        // 2D PDF upload
        if (!uploadFile.value) {
          errorMsg.value = "Vui lòng chọn file PDF";
          return;
        }
        if (drawingValidationMessage.value) {
          errorMsg.value = drawingValidationMessage.value;
          return;
        }

        const resolvedDrawingName = drawingDraftName.value.trim() || manualDrawingName.value;
        const normalizedDrawingName = resolvedDrawingName.trim().toUpperCase();

        const formData = new FormData();
        formData.append("projectId", props.parentId);
        formData.append("drawingCode", normalizedDrawingName);
        formData.append("name", normalizedDrawingName);
        if (drawingAutoScanText.value) {
          formData.append("ocrText", drawingAutoScanText.value);
        }
        const manualTagNames = buildManualDrawingTagNames();
        if (manualTagNames.length > 0) {
          formData.append("tagNames", JSON.stringify(manualTagNames));
        }
        formData.append("file", uploadFile.value);
        result = await api.upload("/drawings", formData);
        break;
      }

      case "task":
        taskPayload = {
          drawingId: props.parentId,
          pinName: form.pinName || undefined,
          description: form.description || undefined,
          status: form.status,
          category: form.category,
          pinX: form.pinX,
          pinY: form.pinY
        };
        result = await api.post("/tasks", taskPayload);
        break;
    }

    if (props.type === "task" && taskPayload && isOfflineQueuedResponse(result)) {
      result = {
        ...(result as Record<string, unknown>),
        __offlineTaskDraft: taskPayload
      };
    }

    const queued = isOfflineQueuedResponse(result);
    if (queued) {
      toast.push(`Đã lưu tạm ${props.type}, sẽ đồng bộ khi có mạng`, "info");
    } else {
      toast.push(`Tạo ${props.type} thành công`, "success");
    }
    if (props.type === "task") {
      clearTaskDraft();
    }
    if (!queued) {
      await fetchTree();
    }
    resetForm();
    emit("created", result);
    emit("close");
  } catch (err) {
    errorMsg.value = (err as Error).message || "Lỗi khi tạo";
  } finally {
    submitting.value = false;
  }
};

// Reset form khi đóng modal, áp dụng toạ độ khi mở
watch(() => props.show, async (newVal) => {
  if (!newVal) {
    resetForm();
  } else {
    if (props.type === "task" || props.type === "drawing") {
      await fetchCmsTagSuggestions();
    }
    if (props.type === "drawing") {
      await fetchDrawingProjectCode();
    }
    if (props.type === "task") {
      form.pinX = props.initialPinX ?? 0.5;
      form.pinY = props.initialPinY ?? 0.5;
      fetchPinSuggestions();
      restoreTaskDraft();
    }
  }
});

watch(
  () => [form.pinName, form.description, form.status, form.category, props.show],
  () => {
    if (!props.show || props.type !== "task") return;
    saveTaskDraft();
  }
);

watch(
  () => [props.parentId, props.show, props.type] as const,
  async ([parentId, isVisible, formType]) => {
    if (!isVisible || formType !== "drawing" || !parentId) return;
    await fetchDrawingProjectCode();
  }
);
</script>

