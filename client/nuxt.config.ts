export default defineNuxtConfig({
 modules: ["@nuxtjs/tailwindcss"],

 components: {
   dirs: [
     { path: "~/components", pathPrefix: false },
   ],
 },

 tailwindcss: {
   cssPath: "~/assets/css/tailwind.css",
   configPath: "tailwind.config.ts"
 },

 runtimeConfig: {
   public: {
     apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:8888"
   }
 },

 app: {
   head: {
     title: "App Công Trường"
   }
 },

 compatibilityDate: "2026-02-06"
});