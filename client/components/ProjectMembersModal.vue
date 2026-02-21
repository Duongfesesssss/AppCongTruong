<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
        @click.self="emit('close')"
      >
        <div class="w-full max-w-3xl rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
          <div class="border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100">
                <svg class="h-5 w-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.654-.126-1.279-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.654.126-1.279.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="truncate text-base font-semibold text-slate-900 sm:text-lg">
                  Quan ly thanh vien
                </h3>
                <p class="truncate text-xs text-slate-500">
                  {{ projectName ? `Project: ${projectName}` : "Quan ly thanh vien trong project dang chon" }}
                </p>
              </div>
              <button
                class="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                type="button"
                @click="emit('close')"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div class="border-b border-slate-100 px-4 py-4 sm:px-6">
            <form class="grid gap-2 sm:grid-cols-[1fr_auto]" @submit.prevent="handleAddMember">
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-700">Email ky thuat vien</label>
                <input
                  v-model="memberEmail"
                  type="email"
                  autocomplete="email"
                  class="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:h-10"
                  placeholder="vd: technician@company.com"
                  :disabled="adding"
                />
              </div>
              <button
                type="submit"
                class="inline-flex h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10"
                :disabled="!canAddMember"
              >
                {{ adding ? "Dang them..." : "Them thanh vien" }}
              </button>
            </form>
            <p v-if="formError" class="mt-2 text-xs text-rose-600">{{ formError }}</p>
          </div>

          <div class="max-h-[55vh] overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            <div v-if="loading" class="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
              Dang tai danh sach thanh vien...
            </div>

            <div v-else-if="loadError" class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              <p>{{ loadError }}</p>
              <button
                type="button"
                class="mt-2 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                @click="fetchMembers"
              >
                Thu lai
              </button>
            </div>

            <div v-else-if="members.length === 0" class="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
              Chua co thanh vien nao trong project.
            </div>

            <ul v-else class="space-y-2">
              <li
                v-for="member in members"
                :key="member.user.id"
                class="rounded-lg border border-slate-200 bg-white p-3"
              >
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-semibold text-slate-900">{{ member.user.name || "Unknown" }}</p>
                    <p class="truncate text-xs text-slate-500">{{ member.user.email || "Khong co email" }}</p>
                    <p class="mt-1 text-[11px] text-slate-400">
                      {{ member.isOwner ? "Owner project" : "Duoc them" }}
                      <span v-if="member.addedAt"> - {{ formatDate(member.addedAt) }}</span>
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span
                      class="rounded-full px-2 py-0.5 text-[11px] font-medium"
                      :class="member.role === 'admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'"
                    >
                      {{ member.role === "admin" ? "Admin" : "Ky thuat vien" }}
                    </span>
                    <button
                      v-if="canRemoveMember(member)"
                      type="button"
                      class="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                      :disabled="removingUserId === member.user.id"
                      @click="openRemoveConfirm(member)"
                    >
                      {{ removingUserId === member.user.id ? "Dang xoa..." : "Xoa" }}
                    </button>
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <div class="flex items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
            <button
              type="button"
              class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
              :disabled="loading"
              @click="fetchMembers"
            >
              Lam moi danh sach
            </button>
            <button
              type="button"
              class="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200"
              @click="emit('close')"
            >
              Dong
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <ConfirmModal
    :show="showRemoveConfirm"
    title="Xoa thanh vien?"
    :message="removeConfirmMessage"
    confirm-text="Xoa"
    :danger="true"
    @confirm="confirmRemoveMember"
    @cancel="cancelRemoveMember"
  />
</template>

<script setup lang="ts">
import { useApi } from "~/composables/api/useApi";
import { useAuth } from "~/composables/state/useAuth";
import { useToast } from "~/composables/state/useToast";

type ProjectMember = {
  user: {
    id: string;
    name: string;
    email: string;
  };
  role: "admin" | "technician";
  isOwner: boolean;
  addedAt?: string;
};

type ProjectMembersResponse = {
  projectId: string;
  members: ProjectMember[];
};

const props = defineProps<{
  show: boolean;
  projectId: string;
  projectName?: string;
}>();

const emit = defineEmits<{
  close: [];
  updated: [];
}>();

const api = useApi();
const toast = useToast();
const auth = useAuth();

const members = ref<ProjectMember[]>([]);
const loading = ref(false);
const loadError = ref("");

const memberEmail = ref("");
const formError = ref("");
const adding = ref(false);

const showRemoveConfirm = ref(false);
const removeTarget = ref<ProjectMember | null>(null);
const removingUserId = ref("");

const currentUserId = computed(() => auth.user.value?.id || "");

const canAddMember = computed(() => {
  return memberEmail.value.trim().length > 0 && !adding.value && !!props.projectId;
});

const removeConfirmMessage = computed(() => {
  if (!removeTarget.value) return "";
  return `Ban chac chan muon xoa ${removeTarget.value.user.email} khoi project?`;
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
};

const fetchMembers = async () => {
  if (!props.projectId) return;
  loading.value = true;
  loadError.value = "";
  try {
    const data = await api.get<ProjectMembersResponse>(`/projects/${props.projectId}/members`);
    members.value = data.members || [];
  } catch (err) {
    loadError.value = (err as Error).message || "Khong the tai danh sach thanh vien";
  } finally {
    loading.value = false;
  }
};

const handleAddMember = async () => {
  formError.value = "";
  const email = memberEmail.value.trim().toLowerCase();
  if (!emailPattern.test(email)) {
    formError.value = "Email khong hop le";
    return;
  }

  adding.value = true;
  try {
    await api.post(`/projects/${props.projectId}/members`, {
      email,
      role: "technician"
    });
    memberEmail.value = "";
    toast.push("Da them ky thuat vien vao project", "success");
    await fetchMembers();
    emit("updated");
  } catch (err) {
    formError.value = (err as Error).message || "Khong the them thanh vien";
  } finally {
    adding.value = false;
  }
};

const canRemoveMember = (member: ProjectMember) => {
  if (member.isOwner) return false;
  if (!member.user.id) return false;
  if (member.user.id === currentUserId.value) return false;
  return true;
};

const openRemoveConfirm = (member: ProjectMember) => {
  removeTarget.value = member;
  showRemoveConfirm.value = true;
};

const cancelRemoveMember = () => {
  showRemoveConfirm.value = false;
  removeTarget.value = null;
};

const confirmRemoveMember = async () => {
  if (!removeTarget.value) return;
  removingUserId.value = removeTarget.value.user.id;
  try {
    await api.delete(`/projects/${props.projectId}/members/${removeTarget.value.user.id}`);
    toast.push("Da xoa thanh vien khoi project", "success");
    await fetchMembers();
    emit("updated");
  } catch (err) {
    toast.push((err as Error).message || "Khong the xoa thanh vien", "error");
  } finally {
    removingUserId.value = "";
    cancelRemoveMember();
  }
};

watch(
  () => props.show,
  async (visible) => {
    if (!visible) {
      formError.value = "";
      loadError.value = "";
      memberEmail.value = "";
      cancelRemoveMember();
      return;
    }
    await fetchMembers();
  }
);

watch(
  () => props.projectId,
  async (projectId, prevProjectId) => {
    if (!props.show) return;
    if (!projectId || projectId === prevProjectId) return;
    await fetchMembers();
  }
);
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
