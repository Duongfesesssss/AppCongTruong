<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
        @click.self="emit('cancel')"
      >
        <div class="w-full max-w-md rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
          <!-- Header -->
          <div class="border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100">
                <svg class="h-5 w-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="text-base font-semibold text-slate-900 sm:text-lg">Nhập kích thước thực</h3>
              </div>
            </div>
          </div>

          <!-- Body -->
          <div class="px-4 py-4 sm:px-6 sm:py-5">
            <!-- History quick buttons -->
            <div v-if="recentHistory.length > 0" class="mb-3">
              <p class="mb-2 text-xs font-medium text-slate-700 sm:text-sm">Gần đây:</p>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="item in recentHistory"
                  :key="item.id"
                  type="button"
                  class="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-brand-50 hover:border-brand-300 active:bg-brand-100"
                  @click="inputValue = item.realDistance"
                >
                  {{ item.realDistance }}
                </button>
              </div>
            </div>

            <!-- Name field -->
            <div>
              <label class="block text-xs font-medium text-slate-700 sm:text-sm">Tên đường thẳng</label>
              <input
                ref="inputRef"
                v-model="nameValue"
                type="text"
                placeholder="Ví dụ: Chiều dài phòng, Chiều rộng cửa..."
                class="mt-1 block h-11 w-full rounded-lg border border-slate-300 px-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:h-10 sm:text-sm"
              />
            </div>

            <!-- Distance field --><div class="mt-3">
              <label class="block text-xs font-medium text-slate-700 sm:text-sm">Kích thước thực tế</label>
              <input
                v-model="inputValue"
                type="text"
                inputmode="decimal"
                placeholder="Nhập số đo (vd: 2.5, 150, ...)"
                class="mt-1 block h-11 w-full rounded-lg border border-slate-300 px-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:h-10 sm:text-sm"
                @keyup.enter="handleSave"
              />
            </div>

            <!-- Unit buttons -->
            <div class="mt-3">
              <p class="mb-2 text-xs font-medium text-slate-700 sm:text-sm">Đơn vị:</p>
              <div class="flex gap-2">
                <button
                  v-for="unit in units"
                  :key="unit"
                  type="button"
                  class="flex h-11 flex-1 items-center justify-center rounded-lg border text-sm font-medium sm:h-10"
                  :class="selectedUnit === unit ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 active:bg-slate-100'"
                  @click="selectUnit(unit)"
                >
                  {{ unit }}
                </button>
              </div>
            </div>

            <!-- Category field -->
            <div class="mt-3">
              <label class="block text-xs font-medium text-slate-700 sm:text-sm">Loại đo đạc</label>
              <select
                v-model="categoryValue"
                class="mt-1 block h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:h-10"
              >
                <option value="">-- Chọn loại --</option>
                <option v-for="cat in categories" :key="cat.value" :value="cat.value">
                  {{ cat.label }}
                </option>
              </select>
            </div>

            <!-- Room field -->
            <div class="mt-3">
              <label class="block text-xs font-medium text-slate-700 sm:text-sm">Phòng/Khu vực</label>
              <input
                v-model="roomValue"
                type="text"
                placeholder="Vd: Phòng khách, Nhà bếp..."
                class="mt-1 block h-11 w-full rounded-lg border border-slate-300 px-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:h-10 sm:text-sm"
              />
            </div>

            <!-- Notes field -->
            <div class="mt-3">
              <label class="block text-xs font-medium text-slate-700 sm:text-sm">Ghi chú</label>
              <textarea
                v-model="notesValue"
                placeholder="Ghi chú bổ sung (nếu có)..."
                rows="2"
                class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              ></textarea>
            </div>

            <p class="mt-3 text-xs text-slate-500">
              💡 Có thể nhập tự do (vd: "2 feet", "50 inches", ...)
            </p>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 border-t border-slate-100 px-4 py-3 sm:justify-end sm:px-6 sm:py-4">
            <button
              type="button"
              class="flex h-11 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 active:bg-slate-100 sm:h-10 sm:flex-none sm:px-4"
              @click="emit('cancel')"
            >
              Bỏ qua
            </button>
            <button
              type="button"
              class="flex h-11 flex-1 items-center justify-center rounded-lg bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700 active:bg-brand-800 sm:h-10 sm:flex-none sm:px-4"
              :disabled="!inputValue.trim() && !nameValue.trim()"
              :class="{ 'opacity-50 cursor-not-allowed': !inputValue.trim() && !nameValue.trim() }"
              @click="handleSave"
            >
              Lưu
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useAnnotationHistory } from "~/composables/state/useAnnotationHistory";

const props = defineProps<{
  show: boolean;
  pixelDistance: number;
  initialName?: string;
  initialDistance?: string;
  initialCategory?: string;
  initialRoom?: string;
  initialNotes?: string;
}>();

const emit = defineEmits<{
  (e: "save", data: {
    name: string;
    distance: string;
    category?: string;
    room?: string;
    notes?: string;
  }): void;
  (e: "cancel"): void;
}>();

const units = ["m", "cm", "mm"];
const nameValue = ref("");
const inputValue = ref("");
const selectedUnit = ref<string>("m");
const inputRef = ref<HTMLInputElement | null>(null);

// New fields
const categoryValue = ref<string>("");
const roomValue = ref<string>("");
const notesValue = ref<string>("");

// Categories
const categories = [
  { value: "width", label: "📏 Chiều dài/rộng" },
  { value: "height", label: "📐 Chiều cao" },
  { value: "depth", label: "📊 Chiều sâu/độ dày" },
  { value: "diagonal", label: "📐 Đường chéo" },
  { value: "perimeter", label: "⭕ Chu vi" },
  { value: "area", label: "🔲 Diện tích" },
  { value: "other", label: "📝 Khác" }
];

// History
const annotationHistory = useAnnotationHistory();
const recentHistory = computed(() => {
  return annotationHistory.getRecentGlobal(6);
});

const selectUnit = (unit: string) => {
  selectedUnit.value = unit;

  // If there's a numeric value, append the unit
  const trimmed = inputValue.value.trim();
  if (trimmed && !isNaN(parseFloat(trimmed))) {
    // Remove any existing unit suffix first
    const numericPart = trimmed.replace(/[a-zA-Z]+$/, "").trim();
    inputValue.value = `${numericPart}${unit}`;
  }
};

const handleSave = () => {
  const distanceVal = inputValue.value.trim();
  if (!distanceVal) return;

  const name = nameValue.value.trim();

  // If value is just a number, append selected unit
  let distance = distanceVal;
  if (!isNaN(parseFloat(distanceVal)) && !/[a-zA-Z]/.test(distanceVal)) {
    distance = `${distanceVal}${selectedUnit.value}`;
  }

  emit("save", {
    name,
    distance,
    category: categoryValue.value || undefined,
    room: roomValue.value.trim() || undefined,
    notes: notesValue.value.trim() || undefined
  });

  // Reset
  nameValue.value = "";
  inputValue.value = "";
  selectedUnit.value = "m";
  categoryValue.value = "";
  roomValue.value = "";
  notesValue.value = "";
};

// Auto-focus input when modal opens
watch(() => props.show, (newVal) => {
  if (newVal) {
    // Load initial values if editing
    if (props.initialName) {
      nameValue.value = props.initialName;
    }
    if (props.initialDistance) {
      inputValue.value = props.initialDistance;
    }
    if (props.initialCategory) {
      categoryValue.value = props.initialCategory;
    }
    if (props.initialRoom) {
      roomValue.value = props.initialRoom;
    }
    if (props.initialNotes) {
      notesValue.value = props.initialNotes;
    }

    nextTick(() => {
      inputRef.value?.focus();
    });
  } else {
    // Reset on close
    nameValue.value = "";
    inputValue.value = "";
    selectedUnit.value = "m";
    categoryValue.value = "";
    roomValue.value = "";
    notesValue.value = "";
  }
});
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.25s ease, opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from > div {
  transform: translateY(100%);
  opacity: 0;
}
.modal-leave-to > div {
  transform: translateY(100%);
  opacity: 0;
}

@media (min-width: 640px) {
  .modal-enter-from > div,
  .modal-leave-to > div {
    transform: translateY(0) scale(0.95);
  }
}
</style>
