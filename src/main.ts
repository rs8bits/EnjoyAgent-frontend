import { createApp } from "vue";
import App from "./App.vue";
import router from "./app/router";
import pinia from "./app/stores/pinia";
import { useAuthStore } from "./app/stores/auth";
import { setHttpUnauthorizedHandler } from "./app/services/http";
import "./styles/main.css";

const app = createApp(App);

setHttpUnauthorizedHandler(async () => {
  const authStore = useAuthStore(pinia);
  const redirect = router.currentRoute.value.fullPath;
  authStore.clearAuth();
  if (router.currentRoute.value.meta.requiresAuth && router.currentRoute.value.name !== "login") {
    await router.replace({ name: "login", query: { redirect } });
  }
});

app.use(pinia);
app.use(router);
app.mount("#app");
