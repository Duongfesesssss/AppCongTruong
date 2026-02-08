<template>
  <div class="min-h-screen bg-slate-100">
    <div class="mx-auto flex min-h-screen w-full max-w-md items-center justify-center p-6">
      <div class="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <slot />
      </div>
    </div>
    <ToastList />
  </div>
</template>
