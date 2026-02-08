import { useAuth } from "~/composables/state/useAuth";

export default defineNuxtRouteMiddleware((to) => {
  if (!process.client) return;
  const auth = useAuth();

  const publicPaths = ["/login", "/register"];
  const isPublicPath = publicPaths.includes(to.path);

  if (!isPublicPath && !auth.token.value) {
    return navigateTo("/login");
  }

  if (isPublicPath && auth.token.value) {
    return navigateTo("/");
  }
});
