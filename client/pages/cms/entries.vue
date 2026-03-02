<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-900">Quản lý nội dung CMS</h1>
      <p class="mt-1 text-sm text-slate-600">
        Tạo và quản lý các entry với filter, search và pagination
      </p>
    </div>

    <!-- Create New Entry Section -->
    <Card class="mb-6 shadow-md">
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-plus-circle text-brand-600"></i>
          <span>Thêm thông tin mới</span>
        </div>
      </template>
      <template #content>
        <form class="grid gap-4" @submit.prevent="createEntry">
          <div class="grid gap-4 md:grid-cols-2">
            <div class="flex flex-col gap-2">
              <label for="title" class="text-sm font-medium text-slate-700">Tiêu đề</label>
              <InputText
                id="title"
                v-model="form.title"
                placeholder="Ví dụ: Quy chuẩn đặt tên bản vẽ"
                :class="{ 'p-invalid': formError && !form.title.trim() }"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label for="status" class="text-sm font-medium text-slate-700">Trạng thái</label>
              <Dropdown
                id="status"
                v-model="form.status"
                :options="statusOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Chọn trạng thái"
              />
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <label for="content" class="text-sm font-medium text-slate-700">Nội dung</label>
            <Textarea
              id="content"
              v-model="form.content"
              rows="4"
              placeholder="Nhập nội dung..."
              :class="{ 'p-invalid': formError && !form.content.trim() }"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label for="tagNames" class="text-sm font-medium text-slate-700">Tag names</label>
            <InputText
              id="tagNames"
              v-model="form.tagNames"
              placeholder="discipline:aa, level:og1"
            />
            <small class="text-slate-500">Phân tách bằng dấu phẩy</small>
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
            <PrimeButton
              label="Thêm thông tin"
              icon="pi pi-plus"
              :loading="saving"
              type="submit"
            />
          </div>
        </form>
      </template>
    </Card>

    <!-- Entries List Section -->
    <Card class="shadow-md">
      <template #title>
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <i class="pi pi-list text-brand-600"></i>
            <span>Danh sách thông tin</span>
          </div>
          <PrimeButton
            label="Làm mới"
            icon="pi pi-refresh"
            severity="secondary"
            outlined
            size="small"
            @click="fetchEntries"
          />
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
          v-else-if="entries.length === 0"
          class="rounded-lg border-2 border-dashed border-slate-200 py-12 text-center"
        >
          <i class="pi pi-inbox text-4xl text-slate-300"></i>
          <p class="mt-3 text-sm text-slate-500">Chưa có nội dung nào</p>
        </div>

        <DataTable
          v-else
          :value="entries"
          paginator
          :rows="10"
          :rowsPerPageOptions="[5, 10, 20, 50]"
          stripedRows
          responsiveLayout="scroll"
          class="text-sm"
        >
          <Column field="title" header="Tiêu đề" sortable style="min-width: 200px">
            <template #body="{ data }">
              <div class="font-semibold text-slate-900">{{ data.title }}</div>
            </template>
          </Column>

          <Column field="content" header="Nội dung" style="min-width: 300px">
            <template #body="{ data }">
              <div class="line-clamp-2 text-slate-700">{{ data.content }}</div>
            </template>
          </Column>

          <Column field="status" header="Trạng thái" sortable style="min-width: 120px">
            <template #body="{ data }">
              <Tag
                :value="data.status === 'published' ? 'Published' : 'Draft'"
                :severity="data.status === 'published' ? 'success' : 'secondary'"
              />
            </template>
          </Column>

          <Column field="tagNames" header="Tags" style="min-width: 200px">
            <template #body="{ data }">
              <div class="flex flex-wrap gap-1">
                <Tag
                  v-for="tag in data.tagNames?.slice(0, 3)"
                  :key="tag"
                  :value="tag"
                  severity="info"
                  class="text-xs"
                />
                <Tag
                  v-if="data.tagNames?.length > 3"
                  :value="`+${data.tagNames.length - 3}`"
                  severity="warning"
                  class="text-xs"
                />
              </div>
            </template>
          </Column>

          <Column field="createdAt" header="Ngày tạo" sortable style="min-width: 150px">
            <template #body="{ data }">
              <span class="text-xs text-slate-500">{{ formatDate(data.createdAt) }}</span>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <PrimeToast position="top-right" />
  </div>
</template>

<script setup lang="ts">
import { useApi } from "~/composables/api/useApi";
import { useToast } from "primevue/usetoast";

definePageMeta({
  layout: "cms"
});

type CmsEntry = {
  _id: string;
  title: string;
  content: string;
  tagNames: string[];
  status: "draft" | "published";
  createdAt: string;
};

const api = useApi();
const toast = useToast();

const loading = ref(false);
const saving = ref(false);
const loadError = ref("");
const formError = ref("");
const entries = ref<CmsEntry[]>([]);

const statusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" }
];

const form = reactive({
  title: "",
  content: "",
  tagNames: "",
  status: "draft" as "draft" | "published"
});

const parseTagNames = (value: string) => {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.toLowerCase())
    )
  );
};

const formatDate = (value?: string) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("vi-VN");
  } catch {
    return value;
  }
};

const fetchEntries = async () => {
  loading.value = true;
  loadError.value = "";
  try {
    entries.value = await api.get<CmsEntry[]>("/cms/entries");
  } catch (err) {
    loadError.value = (err as Error).message || "Không tải được dữ liệu";
    entries.value = [];
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
  form.title = "";
  form.content = "";
  form.tagNames = "";
  form.status = "draft";
  formError.value = "";
};

const createEntry = async () => {
  formError.value = "";
  if (!form.title.trim()) {
    formError.value = "Vui lòng nhập tiêu đề.";
    return;
  }
  if (!form.content.trim()) {
    formError.value = "Vui lòng nhập nội dung.";
    return;
  }

  saving.value = true;
  try {
    const created = await api.post<CmsEntry>("/cms/entries", {
      title: form.title,
      content: form.content,
      status: form.status,
      tagNames: parseTagNames(form.tagNames)
    });
    entries.value = [created, ...entries.value];
    resetForm();
    toast.add({
      severity: "success",
      summary: "Thành công",
      detail: "Đã thêm thông tin",
      life: 3000
    });
  } catch (err) {
    formError.value = (err as Error).message || "Không thể thêm thông tin";
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: formError.value,
      life: 3000
    });
  } finally {
    saving.value = false;
  }
};

onMounted(fetchEntries);
</script>
