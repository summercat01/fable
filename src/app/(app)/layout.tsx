import AppLock from "@/components/AppLock";
import BottomNav from "@/components/BottomNav";

// 잠금 화면 때문에 앱 화면은 폰에서만 그려짐 → 즉시 표시 검사는 끔
export const instant = false;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLock>
      <div className="app-shell">
        <main className="app-main">{children}</main>
        <BottomNav />
      </div>
    </AppLock>
  );
}
