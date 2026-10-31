import ScreenHeader from "@/components/ScreenHeader";

export default function GamePage() {
  return (
    <>
      <ScreenHeader title="우리 게임" />
      <p style={{ padding: "0 18px", fontSize: 13, color: "var(--ink-muted)" }}>
        밸런스, 만약에 5개 뽑기와 기다리는 질문 목록이 들어갈 자리야.
      </p>
    </>
  );
}
