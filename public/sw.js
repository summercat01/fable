// 설치용 최소 서비스워커: 캐시 안 함, 그냥 네트워크로 넘김
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
