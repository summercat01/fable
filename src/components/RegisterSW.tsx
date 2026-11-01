"use client";

import { useEffect } from "react";

// 폰에서 '앱 설치'가 뜨려면 서비스워커가 있어야 함
export default function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
