<template>
  <div class="grid gap-6">
    <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p class="text-xs uppercase tracking-widest text-slate-400">CMS / Tag Name</p>
          <h1 class="text-lg font-semibold text-slate-900 sm:text-xl">Quản Lý Tag Name</h1>
        </div>
        <div class="flex items-center gap-2">
          <NuxtLink to="/" class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
            Về trang bản vẽ
          </NuxtLink>
          <NuxtLink
            to="/cms"
            class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            Về trang CMS
          </NuxtLink>
        </div>
      </div>
      <p class="mt-2 text-sm text-slate-600">
        Quản lý mã viết tắt để dùng chung cho OCR/đặt tên bản vẽ theo chuẩn.
      </p>
      <div class="mt-3">
        <button
          type="button"
          class="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-60"
          :disabled="bootstrapping"
          @click="bootstrapDefaults"
        >
          {{ bootstrapping ? "Đang nạp bộ tag chuẩn..." : "Nạp bộ tag chuẩn V4" }}
        </button>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 class="text-base font-semibold text-slate-900">Thêm Tag Name</h2>
      <form class="mt-4 grid gap-3" @submit.prevent="createTagName">
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Scope</label>
            <select
              v-model="form.scope"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              <option v-for="scope in scopeOptions" :key="scope.value" :value="scope.value">
                {{ scope.label }}
              </option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Code</label>
            <input
              v-model="form.code"
              type="text"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              placeholder="VD: AA"
            />
          </div>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Alias</label>
            <input
              v-model="form.aliases"
              type="text"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              placeholder="VD: AR, A-Alias"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Tên hiển thị</label>
            <input
              v-model="form.label"
              type="text"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              placeholder="VD: Kiến trúc (Architectural)"
            />
          </div>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Mô tả</label>
          <input
            v-model="form.description"
            type="text"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            placeholder="Ghi chú thêm..."
          />
        </div>
        <div class="flex items-center gap-2">
          <input id="active-tag" v-model="form.isActive" type="checkbox" class="h-4 w-4 rounded border-slate-300" />
          <label for="active-tag" class="text-sm text-slate-700">Kích hoạt</label>
        </div>
        <p v-if="formError" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {{ formError }}
        </p>
        <div class="flex justify-end">
          <button
            type="submit"
            class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            :disabled="saving"
          >
            {{ saving ? "Đang thêm..." : "Thêm tag name" }}
          </button>
        </div>
      </form>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-base font-semibold text-slate-900">Danh Sách Tag Name</h2>
        <div class="flex items-center gap-2">
          <select
            v-model="scopeFilter"
            class="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500"
          >
            <option v-for="scope in scopeOptions" :key="`filter-${scope.value}`" :value="scope.value">
              {{ scope.label }}
            </option>
          </select>
          <input
            v-model="query"
            type="text"
            class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500"
            placeholder="Tìm code/tên..."
          />
          <button
            class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
            @click="fetchTagNames"
          >
            Làm mới
          </button>
        </div>
      </div>

      <div v-if="loading" class="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
        Đang tải dữ liệu...
      </div>
      <div v-else-if="loadError" class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
        {{ loadError }}
      </div>
      <div
        v-else-if="filteredTagNames.length === 0"
        class="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500"
      >
        Chưa có tag name nào.
      </div>
      <div v-else class="space-y-2">
        <article
          v-for="item in filteredTagNames"
          :key="item._id"
          class="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 p-3"
        >
          <div class="min-w-0 flex-1">
            <template v-if="editingId === item._id">
              <div class="grid gap-2 sm:grid-cols-2">
                <select
                  v-model="editForm.scope"
                  class="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs outline-none focus:border-brand-500"
                >
                  <option v-for="scope in scopeOptions" :key="`edit-${scope.value}`" :value="scope.value">
                    {{ scope.label }}
                  </option>
                </select>
                <input
                  v-model="editForm.code"
                  type="text"
                  class="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs outline-none focus:border-brand-500"
                  placeholder="Code"
                />
                <input
                  v-model="editForm.aliases"
                  type="text"
                  class="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs outline-none focus:border-brand-500 sm:col-span-2"
                  placeholder="Alias: AR, A-Alias"
                />
                <input
                  v-model="editForm.label"
                  type="text"
                  class="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs outline-none focus:border-brand-500 sm:col-span-2"
                  placeholder="Tên hiển thị"
                />
                <input
                  v-model="editForm.description"
                  type="text"
                  class="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs outline-none focus:border-brand-500 sm:col-span-2"
                  placeholder="Mô tả"
                />
                <label class="inline-flex items-center gap-2 text-xs text-slate-600 sm:col-span-2">
                  <input v-model="editForm.isActive" type="checkbox" class="h-3.5 w-3.5 rounded border-slate-300" />
                  Kích hoạt
                </label>
              </div>
              <p v-if="editError" class="mt-2 text-xs text-rose-600">{{ editError }}</p>
            </template>
            <template v-else>
              <p class="text-sm font-semibold text-slate-900">
                {{ item.code }}
                <span v-if="item.aliases?.length" class="font-normal text-slate-500">/ {{ item.aliases.join(" / ") }}</span>
              </p>
              <p class="text-sm text-slate-700">{{ item.label }}</p>
              <p v-if="item.description" class="text-xs text-slate-500">{{ item.description }}</p>
              <p class="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
                {{ item.scope }} · {{ item.isActive ? "active" : "inactive" }}
              </p>
            </template>
          </div>
          <div class="flex items-center gap-2">
            <template v-if="editingId === item._id">
              <button
                type="button"
                class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                :disabled="updatingId === item._id"
                @click="cancelEdit"
              >
                Hủy
              </button>
              <button
                type="button"
                class="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                :disabled="updatingId === item._id"
                @click="updateTagName(item._id)"
              >
                {{ updatingId === item._id ? "Đang lưu..." : "Lưu" }}
              </button>
            </template>
            <template v-else>
              <button
                type="button"
                class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
                @click="startEdit(item)"
              >
                Sửa
              </button>
              <button
                type="button"
                class="rounded-lg border border-rose-200 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                :disabled="deletingId === item._id"
                @click="deleteTagName(item._id)"
              >
                {{ deletingId === item._id ? "Đang xóa..." : "Xóa" }}
              </button>
            </template>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useApi } from "~/composables/api/useApi";
import { useToast } from "~/composables/state/useToast";

type CmsTagScope =
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

type CmsTagNameItem = {
  _id: string;
  scope: CmsTagScope;
  code: string;
  aliases: string[];
  label: string;
  description?: string;
  isActive: boolean;
};

const scopeOptions: Array<{ value: CmsTagScope; label: string }> = [
  { value: "project", label: "project" },
  { value: "originator", label: "originator" },
  { value: "discipline", label: "discipline" },
  { value: "building", label: "building" },
  { value: "volume", label: "volume" },
  { value: "zone", label: "zone" },
  { value: "level", label: "level" },
  { value: "room", label: "room" },
  { value: "content_type", label: "content_type" },
  { value: "issue_status", label: "issue_status" },
  { value: "file_type", label: "file_type" },
  { value: "grid_axis", label: "grid_axis" },
  { value: "custom", label: "custom" }
];

const api = useApi();
const toast = useToast();

const loading = ref(false);
const saving = ref(false);
const bootstrapping = ref(false);
const editingId = ref("");
const updatingId = ref("");
const deletingId = ref("");
const loadError = ref("");
const formError = ref("");
const editError = ref("");
const query = ref("");
const scopeFilter = ref<CmsTagScope>("discipline");
const tagNames = ref<CmsTagNameItem[]>([]);

const form = reactive({
  scope: "discipline" as CmsTagScope,
  code: "",
  aliases: "",
  label: "",
  description: "",
  isActive: true
});

const editForm = reactive({
  scope: "discipline" as CmsTagScope,
  code: "",
  aliases: "",
  label: "",
  description: "",
  isActive: true
});

const filteredTagNames = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  return tagNames.value.filter((item) => {
    if (!keyword) return true;
    const joined = [item.code, item.aliases.join(" "), item.label, item.description || "", item.scope].join(" ").toLowerCase();
    return joined.includes(keyword);
  });
});

const parseAliases = (value: string) => {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
};

const resetForm = () => {
  form.scope = scopeFilter.value;
  form.code = "";
  form.aliases = "";
  form.label = "";
  form.description = "";
  form.isActive = true;
  formError.value = "";
};

const fetchTagNames = async () => {
  loading.value = true;
  loadError.value = "";
  try {
    const params = new URLSearchParams({ scope: scopeFilter.value });
    tagNames.value = await api.get<CmsTagNameItem[]>(`/cms/tag-names?${params.toString()}`);
  } catch (err) {
    loadError.value = (err as Error).message || "Không tải được dữ liệu";
    tagNames.value = [];
  } finally {
    loading.value = false;
  }
};

const bootstrapDefaults = async () => {
  bootstrapping.value = true;
  try {
    const result = await api.post<{ totalSeedItems: number }>("/cms/tag-names/bootstrap");
    await fetchTagNames();
    toast.push(`Đã nạp bộ tag chuẩn (${result.totalSeedItems} mục)`, "success");
  } catch (err) {
    toast.push((err as Error).message || "Không thể nạp bộ tag chuẩn", "error");
  } finally {
    bootstrapping.value = false;
  }
};

const createTagName = async () => {
  formError.value = "";
  if (!form.code.trim()) {
    formError.value = "Vui lòng nhập code.";
    return;
  }
  if (!form.label.trim()) {
    formError.value = "Vui lòng nhập tên hiển thị.";
    return;
  }

  saving.value = true;
  try {
    const created = await api.post<CmsTagNameItem>("/cms/tag-names", {
      scope: form.scope,
      code: form.code,
      aliases: parseAliases(form.aliases),
      label: form.label,
      description: form.description || undefined,
      isActive: form.isActive
    });
    if (created.scope === scopeFilter.value) {
      tagNames.value = [created, ...tagNames.value];
    }
    resetForm();
    toast.push("Đã thêm tag name", "success");
  } catch (err) {
    formError.value = (err as Error).message || "Không thể thêm tag name";
  } finally {
    saving.value = false;
  }
};

const startEdit = (item: CmsTagNameItem) => {
  editingId.value = item._id;
  updatingId.value = "";
  editError.value = "";
  editForm.scope = item.scope;
  editForm.code = item.code;
  editForm.aliases = (item.aliases || []).join(", ");
  editForm.label = item.label;
  editForm.description = item.description || "";
  editForm.isActive = item.isActive;
};

const cancelEdit = () => {
  editingId.value = "";
  updatingId.value = "";
  editError.value = "";
};

const updateTagName = async (id: string) => {
  editError.value = "";
  if (!editForm.code.trim()) {
    editError.value = "Vui lòng nhập code.";
    return;
  }
  if (!editForm.label.trim()) {
    editError.value = "Vui lòng nhập tên hiển thị.";
    return;
  }

  updatingId.value = id;
  try {
    const updated = await api.patch<CmsTagNameItem>(`/cms/tag-names/${id}`, {
      scope: editForm.scope,
      code: editForm.code,
      aliases: parseAliases(editForm.aliases),
      label: editForm.label,
      description: editForm.description || undefined,
      isActive: editForm.isActive
    });

    if (updated.scope !== scopeFilter.value) {
      tagNames.value = tagNames.value.filter((item) => item._id !== id);
    } else {
      tagNames.value = tagNames.value.map((item) => (item._id === id ? updated : item));
    }
    cancelEdit();
    toast.push("Đã cập nhật tag name", "success");
  } catch (err) {
    editError.value = (err as Error).message || "Không thể cập nhật tag name";
  } finally {
    updatingId.value = "";
  }
};

const deleteTagName = async (id: string) => {
  deletingId.value = id;
  try {
    await api.delete(`/cms/tag-names/${id}`);
    tagNames.value = tagNames.value.filter((item) => item._id !== id);
    toast.push("Đã xóa tag name", "success");
  } catch (err) {
    toast.push((err as Error).message || "Không thể xóa tag name", "error");
  } finally {
    deletingId.value = "";
  }
};

watch(
  scopeFilter,
  async (nextScope) => {
    form.scope = nextScope;
    cancelEdit();
    await fetchTagNames();
  },
  { immediate: true }
);
</script>
