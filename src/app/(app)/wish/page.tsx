import { Suspense } from "react";
import WishView from "@/components/wish/WishView";

export const instant = false; // 폰에서만 그려지는 화면

export default function WishPage() {
  return (
    <Suspense>
      <WishView />
    </Suspense>
  );
}
