<template>
  <div class="w-full max-w-[520px]">
    <div class="rounded-[30px] border border-white/70 bg-panel p-6 shadow-shell backdrop-blur lg:p-8">
      <div class="rounded-[24px] border border-line bg-white p-6 lg:p-7">
        <div class="text-xs font-semibold uppercase tracking-[0.22em] text-accent">欢迎回来</div>
        <h1 class="mt-3 text-3xl font-semibold tracking-tight text-ink">登录你的工作台</h1>
        <p class="mt-3 text-sm leading-6 text-muted">
          阶段 2 先把真实登录注册链路接上。这个页面已经连到后端 `/api/auth/login`。
        </p>

        <form class="mt-8 space-y-5" @submit.prevent="submit">
          <UiTextField
            v-model="form.email"
            label="邮箱"
            placeholder="alice@example.com"
            :error="fieldErrors.email"
          />
          <UiTextField
            v-model="form.password"
            label="密码"
            type="password"
            placeholder="请输入密码"
            :error="fieldErrors.password"
          />

          <div v-if="submitError" class="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {{ submitError }}
          </div>

          <div class="flex items-center justify-between gap-3 pt-2">
            <RouterLink class="text-sm font-medium text-accent transition hover:opacity-80" to="/register">
              去注册
            </RouterLink>
            <UiButton type="submit" :disabled="submitting">
              {{ submitting ? "登录中..." : "登录" }}
            </UiButton>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import UiButton from "@/app/components/ui/UiButton.vue";
import UiTextField from "@/app/components/ui/UiTextField.vue";
import { useAuthStore } from "@/app/stores/auth";

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const form = reactive({
  email: "",
  password: ""
});

const fieldErrors = reactive({
  email: "",
  password: ""
});

const submitting = ref(false);
const submitError = ref("");

function validate() {
  fieldErrors.email = form.email ? "" : "请输入邮箱";
  fieldErrors.password = form.password ? "" : "请输入密码";
  return !fieldErrors.email && !fieldErrors.password;
}

async function submit() {
  submitError.value = "";
  if (!validate()) {
    return;
  }

  submitting.value = true;
  const result = await authStore.login({
    email: form.email,
    password: form.password
  });
  submitting.value = false;

  if (!result.ok) {
    submitError.value = result.message;
    return;
  }

  const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/app/home";
  await router.replace(redirect);
}
</script>
