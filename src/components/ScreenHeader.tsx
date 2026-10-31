export default function ScreenHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <header
      style={{
        padding: "40px 18px 8px",
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
      }}
    >
      <h1 className="hand" style={{ margin: 0, fontSize: 30, lineHeight: 1 }}>
        {title}
      </h1>
      {right}
    </header>
  );
}
