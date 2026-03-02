<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Quản lý Tag Name</h1>
        <p class="mt-1 text-sm text-slate-600">
          Quản lý mã viết tắt để dùng chung cho OCR/đặt tên bản vẽ theo chuẩn
        </p>
      </div>
      <PrimeButton
        label="Nạp bộ tag chuẩn V4"
        icon="pi pi-download"
        severity="secondary"
        :loading="bootstrapping"
        @click="bootstrapDefaults"
      />
    </div>

    <!-- Create Tag Name Section -->
    <Card class="mb-6 shadow-md">
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-plus-circle text-brand-600"></i>
          <span>Thêm Tag Name</span>
        </div>
      </template>
      <template #content>
        <form class="grid gap-4" @submit.prevent="createTagName">
          <div class="grid gap-4 md:grid-cols-2">
            <div class="flex flex-col gap-2">
              <label for="scope" class="text-sm font-medium text-slate-700">Scope</label>
              <Dropdown
                id="scope"
                v-model="form.scope"
                :options="scopeOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Chọn scope"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label for="code" class="text-sm font-medium text-slate-700">Code</label>
              <InputText
                id="code"
                v-model="form.code"
                placeholder="VD: AA"
                :class="{ 'p-invalid': formError && !form.code.trim() }"
              />
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div class="flex flex-col gap-2">
              <label for="aliases" class="text-sm font-medium text-slate-700">Alias</label>
              <InputText id="aliases" v-model="form.aliases" placeholder="VD: AR, A-Alias" />
              <small class="text-slate-500">Phân tách bằng dấu phẩy</small>
            </div>
            <div class="flex flex-col gap-2">
              <label for="label" class="text-sm font-medium text-slate-700">Tên hiển thị</label>
              <InputText
                id="label"
                v-model="form.label"
                placeholder="VD: Kiến trúc (Architectural)"
                :class="{ 'p-invalid': formError && !form.label.trim() }"
              />
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <label for="description" class="text-sm font-medium text-slate-700">Mô tả</label>
            <InputText id="description" v-model="form.description" placeholder="Ghi chú thêm..." />
          </div>

          <div class="flex items-center gap-2">
            <Checkbox id="active-tag" v-model="form.isActive" :binary="true" />
            <label for="active-tag" class="text-sm text-slate-700">Kích hoạt</label>
          </div>

          <div v-if="formError" class="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <i class="pi pi-exclamation-circle mr-2"></i>
            {{ formError }}
          </div>

          <div class="flex justify-end gap-2">
            <PrimeButton
              label="Reset"
              icon="pi pi-refresh"
              severity="secondary"
              outlined
              @click="resetForm"
              type="button"
            />
            <PrimeButton label="Thêm tag name" icon="pi pi-plus" :loading="saving" type="submit" />
          </div>
        </form>
      </template>
    </Card>

    <!-- Tag Name List Section -->
    <Card class="shadow-md">
      <template #title>
        <div class="flex flex-wrap items-center justify-between gap-4">
          <span>Danh sách Tag Name</span>
          <div class="flex items-center gap-2">
            <Dropdown
              v-model="scopeFilter"
              :options="scopeOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Chọn scope"
              class="w-40"
            />
            <InputText v-model="query" placeholder="Tìm code/tên..." class="w-48" />
            <PrimeButton
              icon="pi pi-refresh"
              severity="secondary"
              outlined
              @click="fetchTagNames"
            />
          </div>
        </div>
      </template>
      <template #content>
        <div v-if="loading" class="py-8 text-center">
          <ProgressSpinner style="width: 50px; height: 50px" />
          <p class="mt-3 text-sm text-slate-500">Đang tải dữ liệu...</p>
        </div>

        <div v-else-if="loadError" class="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <i class="pi pi-exclamation-triangle mr-2"></i>
          {{ loadError }}
        </div>

        <div
          v-else-if="filteredTagNames.length === 0"
          class="rounded-lg border-2 border-dashed border-slate-200 py-12 text-center"
        >
          <i class="pi pi-inbox text-4xl text-slate-300"></i>
          <p class="mt-3 text-sm text-slate-500">Chưa có tag name nào</p>
        </div>

        <DataTable
          v-else
          :value="filteredTagNames"
          paginator
          :rows="10"
          :rowsPerPageOptions="[5, 10, 20, 50]"
          stripedRows
          responsiveLayout="scroll"
          class="text-sm"
        >
          <Column field="code" header="Code" sortable style="min-width: 100px">
            <template #body="{ data }">
              <div class="font-semibold text-slate-900">{{ data.code }}</div>
              <div v-if="data.aliases?.length" class="text-xs text-slate-500">
                {{ data.aliases.join(", ") }}
              </div>
            </template>
          </Column>

          <Column field="label" header="Tên hiển thị" sortable style="min-width: 200px">
            <template #body="{ data }">
              <div class="text-slate-900">{{ data.label }}</div>
            </template>
          </Column>

          <Column field="description" header="Mô tả" style="min-width: 200px">
            <template #body="{ data }">
              <div class="text-slate-600">{{ data.description || "—" }}</div>
            </template>
          </Column>

          <Column field="scope" header="Scope" sortable style="min-width: 120px">
            <template #body="{ data }">
              <Tag :value="data.scope" severity="info" class="text-xs" />
            </template>
          </Column>

          <Column field="isActive" header="Trạng thái" sortable style="min-width: 100px">
            <template #body="{ data }">
              <Tag
                :value="data.isActive ? 'Active' : 'Inactive'"
                :severity="data.isActive ? 'success' : 'secondary'"
              />
            </template>
          </Column>

          <Column header="Thao tác" style="min-width: 150px">
            <template #body="{ data }">
              <div class="flex gap-2">
                <PrimeButton
                  icon="pi pi-pencil"
                  severity="info"
                  size="small"
                  outlined
                  @click="openEditDialog(data)"
                />
                <PrimeButton
                  icon="pi pi-trash"
                  severity="danger"
                  size="small"
                  outlined
                  :loading="deletingId === data._id"
                  @click="confirmDelete(data)"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- Edit Dialog -->
    <PrimeDialog
      v-model:visible="editDialogVisible"
      header="Chỉnh sửa Tag Name"
      :modal="true"
      :style="{ width: '500px' }"
    >
      <div class="grid gap-4">
        <div class="flex flex-col gap-2">
          <label for="edit-scope" class="text-sm font-medium text-slate-700">Scope</label>
          <Dropdown
            id="edit-scope"
            v-model="editForm.scope"
            :options="scopeOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Chọn scope"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label for="edit-code" class="text-sm font-medium text-slate-700">Code</label>
          <InputText
            id="edit-code"
            v-model="editForm.code"
            placeholder="VD: AA"
            :class="{ 'p-invalid': editError && !editForm.code.trim() }"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label for="edit-aliases" class="text-sm font-medium text-slate-700">Alias</label>
          <InputText id="edit-aliases" v-model="editForm.aliases" placeholder="VD: AR, A-Alias" />
        </div>
        <div class="flex flex-col gap-2">
          <label for="edit-label" class="text-sm font-medium text-slate-700">Tên hiển thị</label>
          <InputText
            id="edit-label"
            v-model="editForm.label"
            placeholder="VD: Kiến trúc"
            :class="{ 'p-invalid': editError && !editForm.label.trim() }"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label for="edit-description" class="text-sm font-medium text-slate-700">Mô tả</label>
          <InputText id="edit-description" v-model="editForm.description" placeholder="Ghi chú..." />
        </div>
        <div class="flex items-center gap-2">
          <Checkbox id="edit-active" v-model="editForm.isActive" :binary="true" />
          <label for="edit-active" class="text-sm text-slate-700">Kích hoạt</label>
        </div>
        <div v-if="editError" class="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <i class="pi pi-exclamation-circle mr-2"></i>
          {{ editError }}
        </div>
      </div>
      <template #footer>
        <PrimeButton label="Hủy" icon="pi pi-times" severity="secondary" outlined @click="closeEditDialog" />
        <PrimeButton label="Lưu" icon="pi pi-check" :loading="updating" @click="updateTagName" />
      </template>
    </PrimeDialog>

    <!-- Confirm Delete Dialog -->
    <ConfirmDialog />
    <PrimeToast position="top-right" />
  </div>
</template>

<script setup lang="ts">
import { useApi } from "~/composables/api/useApi";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";

definePageMeta({
  layout: "cms"
});

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
const confirm = useConfirm();

const loading = ref(false);
const saving = ref(false);
const updating = ref(false);
const bootstrapping = ref(false);
const deletingId = ref("");
const loadError = ref("");
const formError = ref("");
const editError = ref("");
const query = ref("");
const scopeFilter = ref<CmsTagScope>("discipline");
const tagNames = ref<CmsTagNameItem[]>([]);
const editDialogVisible = ref(false);
const editingId = ref("");

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
    const joined = [item.code, item.aliases.join(" "), item.label, item.description || "", item.scope]
      .join(" ")
      .toLowerCase();
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
    toast.add({
      severity: "success",
      summary: "Thành công",
      detail: `Đã nạp bộ tag chuẩn (${result.totalSeedItems} mục)`,
      life: 3000
    });
  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: (err as Error).message || "Không thể nạp bộ tag chuẩn",
      life: 3000
    });
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
    toast.add({
      severity: "success",
      summary: "Thành công",
      detail: "Đã thêm tag name",
      life: 3000
    });
  } catch (err) {
    formError.value = (err as Error).message || "Không thể thêm tag name";
  } finally {
    saving.value = false;
  }
};

const openEditDialog = (item: CmsTagNameItem) => {
  editingId.value = item._id;
  editError.value = "";
  editForm.scope = item.scope;
  editForm.code = item.code;
  editForm.aliases = (item.aliases || []).join(", ");
  editForm.label = item.label;
  editForm.description = item.description || "";
  editForm.isActive = item.isActive;
  editDialogVisible.value = true;
};

const closeEditDialog = () => {
  editDialogVisible.value = false;
  editingId.value = "";
  editError.value = "";
};

const updateTagName = async () => {
  editError.value = "";
  if (!editForm.code.trim()) {
    editError.value = "Vui lòng nhập code.";
    return;
  }
  if (!editForm.label.trim()) {
    editError.value = "Vui lòng nhập tên hiển thị.";
    return;
  }

  updating.value = true;
  try {
    const updated = await api.patch<CmsTagNameItem>(`/cms/tag-names/${editingId.value}`, {
      scope: editForm.scope,
      code: editForm.code,
      aliases: parseAliases(editForm.aliases),
      label: editForm.label,
      description: editForm.description || undefined,
      isActive: editForm.isActive
    });

    if (updated.scope !== scopeFilter.value) {
      tagNames.value = tagNames.value.filter((item) => item._id !== editingId.value);
    } else {
      tagNames.value = tagNames.value.map((item) =>
        item._id === editingId.value ? updated : item
      );
    }
    closeEditDialog();
    toast.add({
      severity: "success",
      summary: "Thành công",
      detail: "Đã cập nhật tag name",
      life: 3000
    });
  } catch (err) {
    editError.value = (err as Error).message || "Không thể cập nhật tag name";
  } finally {
    updating.value = false;
  }
};

const confirmDelete = (item: CmsTagNameItem) => {
  confirm.require({
    message: `Bạn có chắc chắn muốn xóa tag "${item.code}"?`,
    header: "Xác nhận xóa",
    icon: "pi pi-exclamation-triangle",
    acceptLabel: "Xóa",
    rejectLabel: "Hủy",
    acceptClass: "p-button-danger",
    accept: () => deleteTagName(item._id)
  });
};

const deleteTagName = async (id: string) => {
  deletingId.value = id;
  try {
    await api.delete(`/cms/tag-names/${id}`);
    tagNames.value = tagNames.value.filter((item) => item._id !== id);
    toast.add({
      severity: "success",
      summary: "Thành công",
      detail: "Đã xóa tag name",
      life: 3000
    });
  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: (err as Error).message || "Không thể xóa tag name",
      life: 3000
    });
  } finally {
    deletingId.value = "";
  }
};

watch(
  scopeFilter,
  async (nextScope) => {
    form.scope = nextScope;
    closeEditDialog();
    await fetchTagNames();
  },
  { immediate: true }
);
</script>
