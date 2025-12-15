// // service-worker.js

// const CACHE_NAME = 'mindgarden-v3' + Date.now();
// const urlsToCache = [
//     '/',
//     '/index.html',
//     '/first-launch.html',
//     '/favorites.html',
//     '/settings.html',
//     '/style.css',
//     '/app.js',
//     '/db.js',
//     '/notifications.js',
//     '/quotes.json',
//     '/icons/icon-72x72.png',
//     '/icons/icon-96x96.png',
//     '/icons/icon-128x128.png',
//     '/icons/icon-144x144.png',
//     '/icons/icon-152x152.png',
//     '/icons/icon-192x192.png',
//     '/icons/icon-384x384.png',
//     '/icons/icon-512x512.png'
// ];

// // Установка Service Worker
// self.addEventListener('install', event => {
//     console.log('Service Worker: Активация новой версии v3...');
    
//     event.waitUntil(
//         caches.open(CACHE_NAME)
//             .then(cache => {
//                 console.log('Service Worker: Кэширование основных файлов');
//                 // Кэшируем только самые важные файлы
//                 return cache.addAll([
//                     './',
//                     './index.html',
//                     './style.css',
//                     './app.js',
//                     './db.js',
//                     './quotes.json'
//                 ]).catch(err => {
//                     console.log('Service Worker: Ошибка кэширования:', err);
//                 });
//             })
//             .then(() => {
//                 console.log('Service Worker: Установлен и кэширован');
//                 return self.skipWaiting();
//             })
//     );
// });

// // Активация
// self.addEventListener('activate', event => {
//     console.log('Service Worker: Активация...');
    
//     event.waitUntil(
//         caches.keys().then(cacheNames => {
//             return Promise.all(
//                 cacheNames.map(cacheName => {
//                     if (cacheName !== CACHE_NAME) {
//                         console.log('Service Worker: Удаляем старый кэш', cacheName);
//                         return caches.delete(cacheName);
//                     }
//                 })
//             );
//         }).then(() => self.clients.claim())
//     );
// });


// // Обработка запросов
// self.addEventListener('fetch', event => {
//     // Для уведомлений не используем кэш
//     if (event.request.url.includes('notification')) {
//         return;
//     }
    
//     event.respondWith(
//         caches.match(event.request)
//             .then(response => {
//                 if (response) {
//                     return response;
//                 }
                
//                 return fetch(event.request)
//                     .then(response => {
//                         // Не кэшируем всё подряд
//                         if (!response || response.status !== 200 || response.type !== 'basic') {
//                             return response;
//                         }
                        
//                         const responseToCache = response.clone();
//                         caches.open(CACHE_NAME)
//                             .then(cache => {
//                                 cache.put(event.request, responseToCache);
//                             });
                        
//                         return response;
//                     });
//             })
//     );
// });

// // Периодическая фоновая синхронизация (экспериментально)
// self.addEventListener('periodicsync', event => {
//     if (event.tag === 'update-quotes') {
//         event.waitUntil(updateQuotes());
//     }
// });

// async function updateQuotes() {
//     // Здесь можно добавить логику обновления цитат
//     console.log('Проверка обновлений цитат...');
// }

// // Push-уведомления
// self.addEventListener('push', event => {
//     if (!event.data) return;
    
//     const data = event.data.json();
//     const options = {
//         body: data.body || 'Новая цитата ждет вас!',
//         icon: data.icon || '/icons/192.png',
//         badge: '/icons/72.png',
//         tag: 'daily-quote',
//         requireInteraction: true,
//         data: {
//             url: data.url || '/index.html'
//         }
//     };
    
//     event.waitUntil(
//         self.registration.showNotification(data.title || 'MindGarden', options)
//     );
// });

// // Клик по уведомлению
// self.addEventListener('notificationclick', event => {
//     event.notification.close();
    
//     const urlToOpen = event.notification.data.url || '/index.html';
    
//     event.waitUntil(
//         clients.matchAll({
//             type: 'window',
//             includeUncontrolled: true
//         }).then(clientList => {
//             // Проверяем, есть ли открытые вкладки приложения
//             for (const client of clientList) {
//                 if (client.url === urlToOpen && 'focus' in client) {
//                     return client.focus();
//                 }
//             }
            
//             // Если нет открытых вкладок, открываем новую
//             if (clients.openWindow) {
//                 return clients.openWindow(urlToOpen);
//             }
//         })
//     );
// });

// service-worker.js - ИСПРАВЛЕННАЯ ВЕРСИЯ

const CACHE_NAME = 'mindgarden-v4-' + Date.now();
const urlsToCache = [
    './',
    './index.html',
    './first-launch.html',
    './favorites.html',
    './profile-settings.html',
    './style.css',
    './app.js',
    './db.js',
    './notifications.js',
    './quotes.json'
];

// Установка Service Worker
self.addEventListener('install', event => {
    console.log('[Service Worker] Установка версии v4...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Кэширование файлов...');
                return cache.addAll(urlsToCache)
                    .then(() => {
                        console.log('[Service Worker] Все файлы закешированы');
                    })
                    .catch(err => {
                        console.warn('[Service Worker] Некоторые файлы не удалось закешировать:', err);
                    });
            })
            .then(() => {
                console.log('[Service Worker] Установлен');
                return self.skipWaiting();
            })
    );
});

// Активация
self.addEventListener('activate', event => {
    console.log('[Service Worker] Активация...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Удаляем старый кэш:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[Service Worker] Активирован');
            return self.clients.claim();
        })
    );
});

// Обработка запросов
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Пропускаем запросы к favicon.ico и chrome-extension
    if (url.pathname.endsWith('favicon.ico') || 
        event.request.url.startsWith('chrome-extension://') ||
        event.request.url.startsWith('chrome://')) {
        return;
    }
    
    // Пропускаем POST запросы и другие методы кроме GET
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Для API запросов всегда идем в сеть
    if (event.request.url.includes('/api/') || event.request.url.includes('notification')) {
        return fetch(event.request);
    }
    
    event.respondWith(
        (async () => {
            try {
                // Пытаемся получить из кэша
                const cachedResponse = await caches.match(event.request);
                
                if (cachedResponse) {
                    console.log('[Service Worker] Используем кэш для:', event.request.url);
                    return cachedResponse;
                }
                
                // Если нет в кэше, идем в сеть
                console.log('[Service Worker] Загружаем из сети:', event.request.url);
                const networkResponse = await fetch(event.request);
                
                // Проверяем валидность ответа для кэширования
                if (networkResponse.ok && networkResponse.status === 200) {
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(event.request, networkResponse.clone());
                }
                
                return networkResponse;
            } catch (error) {
                console.error('[Service Worker] Ошибка при fetch:', error, 'URL:', event.request.url);
                
                // Fallback: пробуем отдать index.html для навигационных запросов
                if (event.request.mode === 'navigate') {
                    const cache = await caches.open(CACHE_NAME);
                    const fallback = await cache.match('./index.html');
                    if (fallback) {
                        return fallback;
                    }
                }
                
                // Возвращаем простой ответ для ошибки
                return new Response('Ошибка сети', {
                    status: 408,
                    headers: { 'Content-Type': 'text/plain' }
                });
            }
        })()
    );
});

// Периодическая синхронизация (для браузеров, которые поддерживают)
self.addEventListener('periodicsync', event => {
    if (event.tag === 'update-quotes') {
        console.log('[Service Worker] Запущена периодическая синхронизация');
        event.waitUntil(updateQuotes());
    }
});

async function updateQuotes() {
    try {
        console.log('[Service Worker] Обновление цитат...');
        const cache = await caches.open(CACHE_NAME);
        const response = await fetch('./quotes.json');
        
        if (response.ok) {
            await cache.put(new Request('./quotes.json'), response);
            console.log('[Service Worker] Цитаты обновлены');
        }
    } catch (error) {
        console.error('[Service Worker] Ошибка обновления цитат:', error);
    }
}

// Push-уведомления
self.addEventListener('push', event => {
    console.log('[Service Worker] Получено push-сообщение');
    
    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            console.error('[Service Worker] Ошибка парсинга push-данных:', e);
            data = {
                title: 'MindGarden',
                body: 'Новая цитата ждет вас!'
            };
        }
    } else {
        data = {
            title: 'MindGarden',
            body: 'Пришло время для новой цитаты!'
        };
    }
    
    const options = {
        body: data.body || 'Новая цитата ждет вас!',
        icon: './icons/icon-192x192.png',
        badge: './icons/icon-72x72.png',
        tag: 'daily-quote',
        requireInteraction: true,
        data: {
            url: data.url || './index.html',
            timestamp: Date.now()
        },
        actions: [
            {
                action: 'open',
                title: 'Открыть'
            },
            {
                action: 'close',
                title: 'Закрыть'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'MindGarden', options)
        .then(() => {
            console.log('[Service Worker] Уведомление показано');
        })
        .catch(err => {
            console.error('[Service Worker] Ошибка показа уведомления:', err);
        })
    );
});

// Клик по уведомлению
self.addEventListener('notificationclick', event => {
    console.log('[Service Worker] Клик по уведомлению:', event.action);
    
    event.notification.close();
    
    if (event.action === 'close') {
        console.log('[Service Worker] Уведомление закрыто');
        return;
    }
    
    const urlToOpen = event.notification.data.url || './index.html';
    
    event.waitUntil(
        (async () => {
            try {
                const clients = await self.clients.matchAll({
                    type: 'window',
                    includeUncontrolled: true
                });
                
                // Ищем открытую вкладку с нашим приложением
                for (const client of clients) {
                    if (client.url.includes(urlToOpen) && 'focus' in client) {
                        await client.focus();
                        console.log('[Service Worker] Вкладка сфокусирована');
                        return;
                    }
                }
                
                // Если нет открытых вкладок, открываем новую
                if (self.clients.openWindow) {
                    const newWindow = await self.clients.openWindow(urlToOpen);
                    if (newWindow) {
                        console.log('[Service Worker] Открыта новая вкладка');
                    }
                }
            } catch (error) {
                console.error('[Service Worker] Ошибка при обработке клика:', error);
            }
        })()
    );
});

// Фоновая синхронизация
self.addEventListener('sync', event => {
    if (event.tag === 'sync-quotes') {
        console.log('[Service Worker] Фоновая синхронизация');
        event.waitUntil(syncQuotes());
    }
});

async function syncQuotes() {
    // Здесь можно добавить логику синхронизации с сервером
    console.log('[Service Worker] Синхронизация данных...');
}