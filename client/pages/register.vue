<template>
  <div>
    <h1 class="text-2xl font-semibold text-slate-900">Đăng ký tài khoản</h1>
    <p class="mt-2 text-sm text-slate-500">Tạo tài khoản để quản lý công trường.</p>

    <form class="mt-6 space-y-4" @submit.prevent="handleSubmit">
      <div>
        <label class="text-xs font-medium uppercase text-slate-500">Họ tên</label>
        <input
          v-model="name"
          type="text"
          class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Nguyễn Văn A"
          required
        />
      </div>
      <div>
        <label class="text-xs font-medium uppercase text-slate-500">Email</label>
        <input
          v-model="email"
          type="email"
          class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="email@example.com"
          required
        />
      </div>
      <div>
        <label class="text-xs font-medium uppercase text-slate-500">Mật khẩu</label>
        <input
          v-model="password"
          type="password"
          class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Ít nhất 6 ký tự"
          required
        />
      </div>
      <div>
        <label class="text-xs font-medium uppercase text-slate-500">Xác nhận mật khẩu</label>
        <input
          v-model="confirmPassword"
          type="password"
          class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Nhập lại mật khẩu"
          required
        />
      </div>

      <button
        type="submit"
        class="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        :disabled="auth.loading.value"
      >
        {{ auth.loading.value ? "Đang xử lý..." : "Đăng ký" }}
      </button>

      <p v-if="localError" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
        {{ localError }}
      </p>
      <p v-if="auth.error.value" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
        {{ auth.error.value }}
      </p>
    </form>

    <p class="mt-6 text-center text-sm text-slate-500">
      Đã có tài khoản?
      <NuxtLink to="/login" class="font-medium text-brand-600 hover:text-brand-700">
        Đăng nhập
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

const name = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const localError = ref("");

const handleSubmit = async () => {
  localError.value = "";

  if (password.value !== confirmPassword.value) {
    localError.value = "Mật khẩu xác nhận không khớp";
    return;
  }

  if (password.value.length < 6) {
    localError.value = "Mật khẩu phải có ít nhất 6 ký tự";
    return;
  }

  const ok = await auth.register(name.value, email.value, password.value);
  if (ok) {
    toast.push("Đăng ký thành công", "success");
    navigateTo("/");
  } else {
    toast.push("Đăng ký thất bại", "error");
  }
};
</script>
