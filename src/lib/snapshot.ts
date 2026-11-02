import type { Thread } from "@/lib/game/types";
import type { Wish } from "@/lib/wish/types";

/**
 * 앱 켜져 있는 동안 마지막으로 불러온 걸 기억해 두는 곳.
 * 탭을 옮겨도 이걸로 바로 그리고, 뒤에서 조용히 새로 불러옴 (로딩 화면 없이)
 */
export const snap: {
  game?: { meId: string; threads: Thread[]; remaining: number };
  wish?: { me: { id: string; admin: boolean }; wishes: Wish[] };
} = {};
