<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-900">Dashboard CMS</h1>
      <p class="mt-1 text-sm text-slate-600">
        Tổng quan về hệ thống quản lý nội dung công trường
      </p>
    </div>

    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <!-- User Management Card -->
      <Card class="shadow-md">
        <template #header>
          <div class="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
            <i class="pi pi-user text-4xl text-white"></i>
          </div>
        </template>
        <template #title>
          <div class="text-lg font-semibold">Quản lý tài khoản</div>
        </template>
        <template #content>
          <p class="mb-4 text-sm text-slate-600">
            Cập nhật thông tin cá nhân, đổi avatar, quản lý hồ sơ người dùng
          </p>
          <NuxtLink to="/cms/user">
            <PrimeButton label="Xem chi tiết" icon="pi pi-arrow-right" iconPos="right" class="w-full" />
          </NuxtLink>
        </template>
      </Card>

      <!-- CMS Entries Card -->
      <Card class="shadow-md">
        <template #header>
          <div class="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6">
            <i class="pi pi-file-edit text-4xl text-white"></i>
          </div>
        </template>
        <template #title>
          <div class="text-lg font-semibold">Quản lý nội dung</div>
        </template>
        <template #content>
          <p class="mb-4 text-sm text-slate-600">
            Tạo, chỉnh sửa, xóa các bài viết và nội dung trong hệ thống
          </p>
          <NuxtLink to="/cms/entries">
            <PrimeButton label="Xem chi tiết" icon="pi pi-arrow-right" iconPos="right" class="w-full" />
          </NuxtLink>
        </template>
      </Card>

      <!-- Tag Names Card -->
      <Card class="shadow-md">
        <template #header>
          <div class="bg-gradient-to-r from-amber-500 to-amber-600 p-6">
            <i class="pi pi-tags text-4xl text-white"></i>
          </div>
        </template>
        <template #title>
          <div class="text-lg font-semibold">Quản lý tag name</div>
        </template>
        <template #content>
          <p class="mb-4 text-sm text-slate-600">
            Quản lý các tag name theo scope để phân loại và tìm kiếm
          </p>
          <NuxtLink to="/cms/tagname">
            <PrimeButton label="Xem chi tiết" icon="pi pi-arrow-right" iconPos="right" class="w-full" />
          </NuxtLink>
        </template>
      </Card>
    </div>

    <div class="mt-8">
      <Card class="shadow-md">
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-info-circle text-brand-600"></i>
            <span>Hướng dẫn sử dụng</span>
          </div>
        </template>
        <template #content>
          <div class="space-y-3 text-sm text-slate-700">
            <div class="flex gap-3">
              <i class="pi pi-check-circle mt-0.5 text-emerald-600"></i>
              <div>
                <strong>Quản lý tài khoản:</strong> Cập nhật thông tin cá nhân, đổi tên hiển thị, upload avatar mới
              </div>
            </div>
            <div class="flex gap-3">
              <i class="pi pi-check-circle mt-0.5 text-emerald-600"></i>
              <div>
                <strong>Quản lý nội dung:</strong> Tạo và quản lý các entry với filter, search, pagination
              </div>
            </div>
            <div class="flex gap-3">
              <i class="pi pi-check-circle mt-0.5 text-emerald-600"></i>
              <div>
                <strong>Quản lý tag name:</strong> Tạo và quản lý các tag theo scope khác nhau (project, discipline, level, v.v.)
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "cms"
});
</script>
