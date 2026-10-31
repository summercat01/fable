import ScreenHeader from "@/components/ScreenHeader";
import DdayBadge from "@/components/DdayBadge";

export default function CalendarPage() {
  return (
    <>
      <ScreenHeader title="캘린더" right={<DdayBadge />} />
      <p style={{ padding: "0 18px", fontSize: 13, color: "var(--ink-muted)" }}>
        다음 작업에서 월간 달력, 일정 추가, 근무 뱃지를 붙일 자리야.
      </p>
    </>
  );
}
