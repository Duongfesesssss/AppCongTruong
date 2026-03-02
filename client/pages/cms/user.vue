<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-900">Quản lý tài khoản</h1>
      <p class="mt-1 text-sm text-slate-600">
        Cập nhật thông tin cá nhân và quản lý hồ sơ người dùng
      </p>
    </div>

    <div v-if="loading" class="py-12 text-center">
      <ProgressSpinner style="width: 50px; height: 50px" />
      <p class="mt-3 text-sm text-slate-500">Đang tải thông tin...</p>
    </div>

    <div v-else-if="loadError" class="rounded-lg bg-red-50 p-4 text-sm text-red-700">
      <i class="pi pi-exclamation-triangle mr-2"></i>
      {{ loadError }}
    </div>

    <div v-else class="grid gap-6 lg:grid-cols-3">
      <!-- Avatar Card -->
      <Card class="shadow-md lg:col-span-1">
        <template #content>
          <div class="flex flex-col items-center text-center">
            <div class="relative mb-4">
              <Avatar
                v-if="user?.avatarUrl"
                :image="getAvatarUrl(user.avatarUrl)"
                size="xlarge"
                shape="circle"
                class="h-32 w-32"
              />
              <Avatar
                v-else
                :label="userInitial"
                size="xlarge"
                shape="circle"
                class="h-32 w-32 bg-brand-600 text-4xl text-white"
              />
              <button
                class="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-700"
                @click="openAvatarUpload"
              >
                <i class="pi pi-camera"></i>
              </button>
            </div>
            <h2 class="text-xl font-bold text-slate-900">{{ user?.name }}</h2>
            <p class="mt-1 text-sm text-slate-500">{{ user?.email }}</p>
            <div v-if="user?.createdAt" class="mt-3 text-xs text-slate-400">
              <i class="pi pi-calendar mr-1"></i>
              Tham gia: {{ formatDate(user.createdAt) }}
            </div>
          </div>
        </template>
      </Card>

      <!-- Profile Info Card -->
      <Card class="shadow-md lg:col-span-2">
        <template #title>
          <div class="flex items-center justify-between">
            <span>Thông tin cá nhân</span>
            <PrimeButton
              v-if="!editMode"
              label="Chỉnh sửa"
              icon="pi pi-pencil"
              size="small"
              outlined
              @click="enterEditMode"
            />
          </div>
        </template>
        <template #content>
          <form v-if="editMode" class="grid gap-4" @submit.prevent="saveProfile">
            <div class="flex flex-col gap-2">
              <label for="name" class="text-sm font-medium text-slate-700">Tên hiển thị</label>
              <InputText
                id="name"
                v-model="form.name"
                placeholder="Nhập tên của bạn"
                :class="{ 'p-invalid': formError && !form.name.trim() }"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label for="email" class="text-sm font-medium text-slate-700">Email</label>
              <InputText id="email" :value="user?.email" disabled />
              <small class="text-slate-500">Email không thể thay đổi</small>
            </div>

            <div class="flex flex-col gap-2">
              <label for="phone" class="text-sm font-medium text-slate-700">Số điện thoại</label>
              <InputText id="phone" v-model="form.phone" placeholder="Nhập số điện thoại" />
            </div>

            <div class="flex flex-col gap-2">
              <label for="bio" class="text-sm font-medium text-slate-700">Giới thiệu</label>
              <Textarea
                id="bio"
                v-model="form.bio"
                rows="4"
                placeholder="Viết vài dòng về bản thân..."
              />
              <small class="text-slate-500">Tối đa 500 ký tự</small>
            </div>

            <div v-if="formError" class="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <i class="pi pi-exclamation-circle mr-2"></i>
              {{ formError }}
            </div>

            <div class="flex justify-end gap-2">
              <PrimeButton
                label="Hủy"
                icon="pi pi-times"
                severity="secondary"
                outlined
                @click="cancelEdit"
                type="button"
              />
              <PrimeButton label="Lưu thay đổi" icon="pi pi-check" :loading="saving" type="submit" />
            </div>
          </form>

          <div v-else class="space-y-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Tên hiển thị</label>
                <p class="text-slate-900">{{ user?.name || "—" }}</p>
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Email</label>
                <p class="text-slate-900">{{ user?.email || "—" }}</p>
              </div>
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Số điện thoại</label>
              <p class="text-slate-900">{{ user?.phone || "—" }}</p>
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Giới thiệu</label>
              <p class="whitespace-pre-line text-slate-900">{{ user?.bio || "—" }}</p>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Hidden file input for avatar upload -->
    <input
      ref="avatarInput"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="hidden"
      @change="handleAvatarUpload"
    />

    <PrimeToast position="top-right" />
  </div>
</template>

<script setup lang="ts">
import { useApi } from "~/composables/api/useApi";
import { useToast } from "primevue/usetoast";

definePageMeta({
  layout: "cms"
});

type User = {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
};

const api = useApi();
const toast = useToast();
const config = useRuntimeConfig();

const loading = ref(false);
const saving = ref(false);
const loadError = ref("");
const formError = ref("");
const editMode = ref(false);
const user = ref<User | null>(null);
const avatarInput = ref<HTMLInputElement | null>(null);

const form = reactive({
  name: "",
  phone: "",
  bio: ""
});

const userInitial = computed(() => {
  const name = user.value?.name || "U";
  return name.charAt(0).toUpperCase();
});

const getAvatarUrl = (key: string) => {
  if (key.startsWith("http")) return key;
  return `${config.public.apiBase.replace("/api", "")}/uploads/avatars/${key}`;
};

const formatDate = (value?: string) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString("vi-VN");
  } catch {
    return value;
  }
};

const fetchProfile = async () => {
  loading.value = true;
  loadError.value = "";
  try {
    user.value = await api.get<User>("/users/me");
  } catch (err) {
    loadError.value = (err as Error).message || "Không tải được thông tin người dùng";
  } finally {
    loading.value = false;
  }
};

const enterEditMode = () => {
  form.name = user.value?.name || "";
  form.phone = user.value?.phone || "";
  form.bio = user.value?.bio || "";
  editMode.value = true;
  formError.value = "";
};

const cancelEdit = () => {
  editMode.value = false;
  formError.value = "";
};

const saveProfile = async () => {
  formError.value = "";
  if (!form.name.trim()) {
    formError.value = "Vui lòng nhập tên hiển thị.";
    return;
  }

  saving.value = true;
  try {
    const updated = await api.patch<User>("/users/me", {
      name: form.name,
      phone: form.phone || undefined,
      bio: form.bio || undefined
    });
    user.value = updated;
    editMode.value = false;
    toast.add({
      severity: "success",
      summary: "Thành công",
      detail: "Đã cập nhật thông tin cá nhân",
      life: 3000
    });
  } catch (err) {
    formError.value = (err as Error).message || "Không thể cập nhật thông tin";
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

const openAvatarUpload = () => {
  avatarInput.value?.click();
};

const handleAvatarUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: "Vui lòng chọn file ảnh (JPG, PNG, WEBP)",
      life: 3000
    });
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: "Kích thước file không được vượt quá 5MB",
      life: 3000
    });
    return;
  }

  try {
    const formData = new FormData();
    formData.append("avatar", file);

    const updated = await api.upload<User>("/users/me/avatar", formData);
    user.value = updated;
    toast.add({
      severity: "success",
      summary: "Thành công",
      detail: "Đã cập nhật avatar",
      life: 3000
    });
  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: (err as Error).message || "Không thể upload avatar",
      life: 3000
    });
  } finally {
    target.value = "";
  }
};

onMounted(fetchProfile);
</script>
