<template>
  <div class="grid gap-6">
    <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-widest text-slate-400">CMS</p>
          <h1 class="text-lg font-semibold text-slate-900 sm:text-xl">Trang Quản Trị Thông Tin</h1>
        </div>
        <div class="flex items-center gap-2">
          <NuxtLink to="/" class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
            Về trang bản vẽ
          </NuxtLink>
          <NuxtLink
            to="/cms/tagname"
            class="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
          >
            Quản lý tag name
          </NuxtLink>
        </div>
      </div>
      <p class="mt-2 text-sm text-slate-600">
        Tạo nội dung dùng chung cho hệ thống. Có thể gắn tag để tìm kiếm/lọc nhanh ở các bước sau.
      </p>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 class="text-base font-semibold text-slate-900">Thêm Thông Tin</h2>
      <form class="mt-4 grid gap-3" @submit.prevent="createEntry">
        <div>
          <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Tiêu đề</label>
          <input
            v-model="form.title"
            type="text"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            placeholder="Ví dụ: Quy chuẩn đặt tên bản vẽ"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Nội dung</label>
          <textarea
            v-model="form.content"
            class="min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            placeholder="Nhập nội dung..."
          />
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Tag names</label>
            <input
              v-model="form.tagNames"
              type="text"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              placeholder="discipline:aa, level:og1"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Trạng thái</label>
            <select
              v-model="form.status"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
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
            {{ saving ? "Đang lưu..." : "Thêm thông tin" }}
          </button>
        </div>
      </form>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div class="mb-3 flex items-center justify-between gap-2">
        <h2 class="text-base font-semibold text-slate-900">Danh Sách Thông Tin</h2>
        <button class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100" @click="fetchEntries">
          Làm mới
        </button>
      </div>

      <div v-if="loading" class="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
        Đang tải dữ liệu...
      </div>
      <div v-else-if="loadError" class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
        {{ loadError }}
      </div>
      <div
        v-else-if="entries.length === 0"
        class="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500"
      >
        Chưa có nội dung nào.
      </div>
      <div v-else class="space-y-3">
        <article v-for="entry in entries" :key="entry._id" class="rounded-xl border border-slate-200 p-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="text-sm font-semibold text-slate-900 sm:text-base">{{ entry.title }}</h3>
            <span
              class="rounded-full px-2 py-0.5 text-[11px] font-medium uppercase"
              :class="entry.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'"
            >
              {{ entry.status }}
            </span>
          </div>
          <p class="mt-2 whitespace-pre-line text-sm text-slate-700">{{ entry.content }}</p>
          <p v-if="entry.tagNames?.length" class="mt-2 text-xs text-slate-500">
            {{ entry.tagNames.join(", ") }}
          </p>
          <p class="mt-2 text-[11px] text-slate-400">
            {{ formatDate(entry.createdAt) }}
          </p>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useApi } from "~/composables/api/useApi";
import { useToast } from "~/composables/state/useToast";

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
    toast.push("Đã thêm thông tin", "success");
  } catch (err) {
    formError.value = (err as Error).message || "Không thể thêm thông tin";
  } finally {
    saving.value = false;
  }
};

onMounted(fetchEntries);
</script>
