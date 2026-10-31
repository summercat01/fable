import AppLock from "@/components/AppLock";
import BottomNav from "@/components/BottomNav";

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
