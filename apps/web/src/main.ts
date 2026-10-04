import { mount } from "svelte";
import "./app.css";
import App from "./App.svelte";

const app = mount(App, {
  target: document.getElementById("app")!,
});

// Service Worker の更新（新バージョン有効化）を検知して自動リロード
// 初回ロード時（initialController が null）の不要なリロードを防止
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  let refreshing = false;
  const initialController = navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (initialController && !refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

export default app;
