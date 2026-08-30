import "vue-router";

declare module "vue-router" {
  interface RouteMeta {
    requiresAuth?: boolean;
    requiresAdmin?: boolean;
    requiresOwner?: boolean;
    guestOnly?: boolean;
    title?: string;
  }
}
