"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * 예전에 설치한 앱은 시작 주소가 /calendar로 저장돼 있음 (폰이 새 설정을 늦게 받아옴)
 * → 앱을 새로 켰을 때 캘린더로 열리면 홈으로 보냄. 앱 안에서 캘린더 탭 누른 건 그대로
 */
export default function LaunchHome() {
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    try {
      if (sessionStorage.getItem("fable-launched")) return;
      sessionStorage.setItem("fable-launched", "1");
    } catch {
      return;
    }
    if (path === "/calendar") router.replace("/home");
    // 처음 한 번만 확인하면 됨
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
