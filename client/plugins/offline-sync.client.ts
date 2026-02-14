import { useOfflineSync } from "~/composables/state/useOfflineSync";

export default defineNuxtPlugin(async () => {
  const offlineSync = useOfflineSync();
  await offlineSync.init();
});
