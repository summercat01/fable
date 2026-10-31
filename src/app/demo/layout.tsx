import { notFound } from "next/navigation";
import DemoStore from "./DemoStore";

// 잠금 화면 때문에 앱 화면은 폰에서만 그려짐 → 즉시 표시 검사는 끔
export const instant = false;

// 개발할 때만 열리는 화면 미리보기 (npm run dev → /demo/calendar)
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="app-shell">
      <DemoStore>{children}</DemoStore>
    </div>
  );
}
