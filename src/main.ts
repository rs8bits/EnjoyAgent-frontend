import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createApp } from "vue";
import App from "./App.vue";
import router from "./app/router";
import pinia from "./app/stores/pinia";
import "./styles/main.css";

const app = createApp(App);
const queryClient = new QueryClient();

app.use(pinia);
app.use(router);
app.use(VueQueryPlugin, { queryClient });
app.mount("#app");
