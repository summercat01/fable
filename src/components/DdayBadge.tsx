"use client";

import { useSyncExternalStore } from "react";
import { dday, nextHundred } from "@/lib/couple";

const noop = () => () => {};

// 날짜는 폰 시계 기준으로 그 자리에서 계산
export default function DdayBadge() {
  const onClient = useSyncExternalStore(noop, () => true, () => false);
  if (!onClient) return <span style={{ height: 36 }} />;
  const now = new Date();
  const { target, left } = nextHundred(now);
  return (
    <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      <span className="hand" style={{ fontSize: 22, color: "var(--us)" }}>
        D+{dday(now)}
      </span>
      <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>
        {target}일까지 {left}일
      </span>
    </span>
  );
}
