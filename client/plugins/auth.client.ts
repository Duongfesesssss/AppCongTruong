import { useAuth } from "~/composables/state/useAuth";

export default defineNuxtPlugin(async () => {
  const auth = useAuth();
  await auth.initFromStorage();
});
