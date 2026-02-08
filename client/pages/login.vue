<template>
  <div>
    <h1 class="text-2xl font-semibold text-slate-900">Đăng nhập</h1>
    <p class="mt-2 text-sm text-slate-500">Quản lý công trường theo bản vẽ và task.</p>

    <form class="mt-6 space-y-4" @submit.prevent="handleSubmit">
      <div>
        <label class="text-xs font-medium uppercase text-slate-500">Email</label>
        <input
          v-model="email"
          type="email"
          class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="admin@example.com"
          required
        />
      </div>
      <div>
        <label class="text-xs font-medium uppercase text-slate-500">Mật khẩu</label>
        <input
          v-model="password"
          type="password"
          class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          required
        />
      </div>

      <button
        type="submit"
        class="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        :disabled="submitting"
      >
        {{ submitting ? "Đang xử lý..." : "Đăng nhập" }}
      </button>

      <p v-if="errorMsg" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
        {{ errorMsg }}
      </p>
    </form>

    <p class="mt-6 text-center text-sm text-slate-500">
      Chưa có tài khoản?
      <NuxtLink to="/register" class="font-medium text-brand-600 hover:text-brand-700">
        Đăng ký ngay
      </NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from "~/composables/state/useAuth";
import { useToast } from "~/composables/state/useToast";

definePageMeta({ layout: "auth" });

const auth = useAuth();
const toast = useToast();

const email = ref("");
const password = ref("");
const submitting = ref(false);
const errorMsg = ref("");

const handleSubmit = async () => {
  submitting.value = true;
  errorMsg.value = "";
  try {
    const ok = await auth.login(email.value, password.value);
    if (ok) {
      toast.push("Đăng nhập thành công", "success");
      navigateTo("/");
    } else {
      errorMsg.value = auth.error.value || "Đăng nhập thất bại";
      toast.push("Đăng nhập thất bại", "error");
    }
  } catch (err) {
    errorMsg.value = (err as Error).message || "Lỗi không xác định";
  } finally {
    submitting.value = false;
  }
};
</script>
