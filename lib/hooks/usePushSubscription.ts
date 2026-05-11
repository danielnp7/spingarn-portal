"use client";
import { useEffect, useState } from "react";

const VAPID_PUBLIC_KEY = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").replace(/\s/g, "");

function urlBase64ToUint8Array(base64String: string) {
  const clean = base64String.replace(/\s/g, "");
  const padding = "=".repeat((4 - (clean.length % 4)) % 4);
  const base64 = (clean + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function usePushSubscription(isLoggedIn: boolean) {
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (isLoggedIn && permission === "granted" && VAPID_PUBLIC_KEY) {
      subscribeInternal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, permission]);

  async function subscribeInternal() {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth }),
      });
      if (res.ok) { setSubscribed(true); setError(null); }
      else setError("Error al guardar suscripción");
    } catch (err) {
      setError(String(err));
    }
  }

  async function requestAndSubscribe() {
    setError(null);
    setLoading(true);
    try {
      if (!VAPID_PUBLIC_KEY) { setError("Notificaciones no configuradas"); return; }
      if (!("Notification" in window)) { setError("Tu navegador no soporta notificaciones"); return; }
      if (!("serviceWorker" in navigator)) { setError("Tu navegador no soporta service workers"); return; }
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm === "granted") await subscribeInternal();
      else if (perm === "denied") setError("Permiso denegado — actívalo en ajustes del navegador");
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return { subscribed, permission, error, loading, requestAndSubscribe };
}
