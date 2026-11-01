import { Suspense } from "react";
import WishView from "@/components/wish/WishView";

export const instant = false;

export default function DemoWish() {
  return (
    <Suspense>
      <WishView />
    </Suspense>
  );
}
