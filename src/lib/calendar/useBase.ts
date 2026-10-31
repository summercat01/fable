"use client";

import { usePathname } from "next/navigation";

/** /demo 미리보기에서도 링크가 제자리로 가게 */
export function useCalendarBase(): string {
  return usePathname().startsWith("/demo") ? "/demo/calendar" : "/calendar";
}
