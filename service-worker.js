// service-worker.js
const CACHE_NAME = 'mond-cottage-v1';
const urlsToCache = [
  '/',
  '/static/css/style.css',
  '/static/js/script.js',
  '/static/icons/icon-192x192.png'
];

// 1. 설치: 서비스 워커가 설치될 때, 필수 파일들을 캐시에 저장합니다.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. 요청 처리: 앱이 파일을 요청할 때, 네트워크보다 캐시를 먼저 확인합니다.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 캐시에 있으면 캐시된 파일을 반환
        if (response) {
          return response;
        }
        // 캐시에 없으면 네트워크로 요청
        return fetch(event.request);
      }
    )
  );
});