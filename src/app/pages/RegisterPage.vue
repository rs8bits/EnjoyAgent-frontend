<template>
  <div class="w-full max-w-[560px]">
    <div class="rounded-[30px] border border-white/70 bg-panel p-6 shadow-shell backdrop-blur lg:p-8">
      <div class="rounded-[24px] border border-line bg-white p-6 lg:p-7">
        <div class="text-xs font-semibold uppercase tracking-[0.22em] text-accent">开始使用</div>
        <h1 class="mt-3 text-3xl font-semibold tracking-tight text-ink">创建你的 EnjoyAgent 工作台</h1>
        <p class="mt-3 text-sm leading-6 text-muted">
          注册成功后会自动创建默认租户，并直接登录进入工作台。
        </p>

        <form class="mt-8 space-y-5" @submit.prevent="submit">
          <UiTextField
            v-model="form.displayName"
            label="显示名称"
            placeholder="例如：小陈"
            :error="fieldErrors.displayName"
          />
          <UiTextField
            v-model="form.tenantName"
            label="工作区名称"
            placeholder="例如：小陈工作室"
            hint="不填时后端会自动按“显示名 + Workspace”生成。"
          />
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
            placeholder="至少 8 位字符"
            :error="fieldErrors.password"
          />

          <div v-if="submitError" class="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {{ submitError }}
          </div>

          <div class="flex items-center justify-between gap-3 pt-2">
            <RouterLink class="text-sm font-medium text-accent transition hover:opacity-80" to="/login">
              已有账号，去登录
            </RouterLink>
            <UiButton type="submit" :disabled="submitting">
              {{ submitting ? "创建中..." : "创建账号" }}
            </UiButton>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import UiButton from "@/app/components/ui/UiButton.vue";
import UiTextField from "@/app/components/ui/UiTextField.vue";
import { useAuthStore } from "@/app/stores/auth";

const authStore = useAuthStore();
const router = useRouter();

const form = reactive({
  displayName: "",
  tenantName: "",
  email: "",
  password: ""
});

const fieldErrors = reactive({
  displayName: "",
  email: "",
  password: ""
});

const submitting = ref(false);
const submitError = ref("");

function validate() {
  fieldErrors.displayName = form.displayName ? "" : "请输入显示名称";
  fieldErrors.email = form.email ? "" : "请输入邮箱";
  fieldErrors.password = form.password.length >= 8 ? "" : "密码至少需要 8 位";
  return !fieldErrors.displayName && !fieldErrors.email && !fieldErrors.password;
}

async function submit() {
  submitError.value = "";
  if (!validate()) {
    return;
  }

  submitting.value = true;
  const result = await authStore.register({
    displayName: form.displayName,
    tenantName: form.tenantName || undefined,
    email: form.email,
    password: form.password
  });
  submitting.value = false;

  if (!result.ok) {
    submitError.value = result.message;
    return;
  }

  await router.replace("/app/home");
}
</script>
