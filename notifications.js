// // notifications.js - Управление уведомлениями

// class NotificationManager {
//     constructor() {
//         this.notificationCheckInterval = null;
//         this.lastNotificationDate = null;
//         this.isChecking = false;
//     }

//     async init() {
//         console.log('Инициализация менеджера уведомлений...');
        
//         // Проверяем поддержку уведомлений
//         if (!('Notification' in window)) {
//             console.log('Браузер не поддерживает уведомления');
//             return false;
//         }

//         // Загружаем настройки пользователя
//         const db = await initDB();
//         const user = await db.getUser();
        
//         if (!user || !user.settings || !user.settings.notifications) {
//             console.log('Уведомления отключены в настройках');
//             return false;
//         }

//         // Запрашиваем разрешение, если еще не запрашивали
//         if (Notification.permission === 'default') {
//             const permission = await Notification.requestPermission();
//             console.log('Разрешение на уведомления:', permission);
            
//             if (permission !== 'granted') {
//                 console.log('Пользователь отказал в уведомлениях');
//                 return false;
//             }
//         } else if (Notification.permission === 'denied') {
//             console.log('Пользователь запретил уведомления ранее');
//             return false;
//         }

//         console.log('Уведомления разрешены, запускаем проверку...');
        
//         // Запускаем проверку уведомлений
//         this.startNotificationCheck();
        
//         // Планируем следующее уведомление
//         await this.scheduleNextNotification();
        
//         return true;
//     }

//     startNotificationCheck() {
//         // Останавливаем предыдущий интервал, если был
//         if (this.notificationCheckInterval) {
//             clearInterval(this.notificationCheckInterval);
//         }
        
//         // Проверяем каждую минуту
//         this.notificationCheckInterval = setInterval(async () => {
//             await this.checkForNotification();
//         }, 60 * 1000); // 1 минута
        
//         console.log('Проверка уведомлений запущена (каждую минуту)');
        
//         // Проверяем сразу
//         setTimeout(() => this.checkForNotification(), 1000);
//     }

//     async checkForNotification() {
//         // Защита от одновременного выполнения
//         if (this.isChecking) return;
//         this.isChecking = true;
        
//         try {
//             const db = await initDB();
//             const user = await db.getUser();
            
//             if (!user || !user.settings || !user.settings.notifications) {
//                 return;
//             }

//             const now = new Date();
//             const currentTime = now.getHours() * 60 + now.getMinutes(); // Текущее время в минутах
//             const [hours, minutes] = user.settings.notificationTime.split(':').map(Number);
//             const notificationTime = hours * 60 + minutes;
            
//             // Проверяем, настало ли время для уведомления (с допуском ±1 минута)
//             if (Math.abs(currentTime - notificationTime) <= 1) {
//                 // Проверяем, не было ли уже уведомления сегодня
//                 const today = now.toDateString();
//                 const lastNotification = localStorage.getItem('lastNotificationDate');
                
//                 if (lastNotification !== today) {
//                     console.log('Время для уведомления! Отправляем...');
//                     await this.sendDailyNotification();
//                     localStorage.setItem('lastNotificationDate', today);
//                     this.lastNotificationDate = today;
//                 } else {
//                     console.log('Уведомление уже отправлялось сегодня');
//                 }
//             }
//         } catch (error) {
//             console.error('Ошибка проверки уведомлений:', error);
//         } finally {
//             this.isChecking = false;
//         }
//     }

//     async sendDailyNotification() {
//         console.log('Подготовка уведомления...');
        
//         try {
//             const db = await initDB();
//             const user = await db.getUser();
            
//             if (!user) return;
            
//             // Получаем историю показа за последние 7 дней
//             const recentHistory = await db.getRecentHistory(7);
//             const shownQuoteIds = recentHistory.map(item => item.quoteId);
            
//             // Получаем все цитаты
//             const allQuotes = await db.getAllQuotes();
            
//             if (allQuotes.length === 0) {
//                 console.log('Нет цитат для уведомления');
//                 return;
//             }
            
//             // Фильтруем цитаты, которые не показывались
//             const availableQuotes = allQuotes.filter(quote => !shownQuoteIds.includes(quote.id));
            
//             let quote;
//             if (availableQuotes.length > 0) {
//                 quote = availableQuotes[Math.floor(Math.random() * availableQuotes.length)];
//             } else {
//                 quote = allQuotes[Math.floor(Math.random() * allQuotes.length)];
//             }
            
//             if (!quote) return;
            
//             // Сохраняем в историю
//             await db.saveQuoteHistory(quote.id);
            
//             // Обновляем статистику
//             await db.updateUserStats({
//                 quotesReceived: (await db.getUser()).stats.quotesReceived + 1,
//                 lastQuoteDate: new Date().toISOString()
//             });
            
//             // Проверяем разрешение
//             if (Notification.permission !== 'granted') {
//                 console.log('Нет разрешения на уведомления');
//                 return;
//             }
            
//             // Создаем уведомление БЕЗ actions (простая версия)
//             const notificationOptions = {
//                 body: `${quote.text.substring(0, 100)}${quote.text.length > 100 ? '...' : ''}\n— ${quote.author}`,
//                 icon: 'icons/icon-192x192.png',
//                 badge: 'icons/icon-72x72.png',
//                 tag: 'daily-quote-' + Date.now(),
//                 requireInteraction: false,
//                 silent: false // Звуковое уведомление
//             };
            
//             console.log('Отправка уведомления:', notificationOptions.body);
            
//             const notification = new Notification('🌿 MindGarden - Цитата дня', notificationOptions);
            
//             // Обработчик клика по уведомлению
//             notification.onclick = () => {
//                 console.log('Клик по уведомлению');
//                 window.focus();
//                 notification.close();
                
//                 // Открываем приложение
//                 if (window.location.pathname.includes('index.html')) {
//                     window.location.reload();
//                 } else {
//                     window.location.href = 'index.html';
//                 }
//             };
            
//             // Закрываем уведомление через 30 секунд
//             setTimeout(() => {
//                 notification.close();
//             }, 30000);
            
//             console.log('Уведомление отправлено успешно');
            
//         } catch (error) {
//             console.error('Ошибка отправки уведомления:', error);
//         }
//     }

//     async scheduleNextNotification() {
//         try {
//             const db = await initDB();
//             const user = await db.getUser();
            
//             if (!user || !user.settings || !user.settings.notifications) {
//                 return;
//             }
            
//             const [hours, minutes] = user.settings.notificationTime.split(':').map(Number);
//             const now = new Date();
//             const nextNotification = new Date();
            
//             // Устанавливаем время уведомления
//             nextNotification.setHours(hours, minutes, 0, 0);
            
//             // Если время уже прошло сегодня, планируем на завтра
//             if (nextNotification < now) {
//                 nextNotification.setDate(nextNotification.getDate() + 1);
//             }
            
//             const timeUntilNotification = nextNotification.getTime() - now.getTime();
            
//             console.log(`Следующее уведомление запланировано на: ${nextNotification}`);
//             console.log(`Через ${Math.round(timeUntilNotification / 60000)} минут`);
            
//             // Планируем уведомление
//             setTimeout(async () => {
//                 console.log('Время для планового уведомления!');
//                 await this.sendDailyNotification();
//                 // Планируем следующее
//                 this.scheduleNextNotification();
//             }, timeUntilNotification);
            
//         } catch (error) {
//             console.error('Ошибка планирования уведомления:', error);
//         }
//     }

//     stop() {
//         if (this.notificationCheckInterval) {
//             clearInterval(this.notificationCheckInterval);
//             this.notificationCheckInterval = null;
//         }
//     }
    
//     // Метод для тестирования уведомлений (вызовите в консоли)
//     async testNotificationNow() {
//         console.log('Тестовое уведомление...');
//         await this.sendDailyNotification();
//     }
// }

// // Глобальный экземпляр менеджера уведомлений
// let notificationManager = null;

// async function initNotifications() {
//     console.log('=== ИНИЦИАЛИЗАЦИЯ УВЕДОМЛЕНИЙ ===');
    
//     if (notificationManager) {
//         notificationManager.stop();
//     }
    
//     notificationManager = new NotificationManager();
//     const success = await notificationManager.init();
    
//     if (success) {
//         console.log('Уведомления инициализированы успешно');
//     } else {
//         console.log('Уведомления не инициализированы (отключены или нет разрешения)');
//     }
    
//     // Для тестирования, сделаем метод доступным в консоли
//     window.testNotification = () => notificationManager.testNotificationNow();
// }

// // Экспорт для использования в других файлах
// window.initNotifications = initNotifications;
// window.getNotificationManager = () => notificationManager;

// notifications.js - УПРОЩЕННАЯ РАБОЧАЯ ВЕРСИЯ

class NotificationManager {
    constructor() {
        this.notificationCheckInterval = null;
        this.lastNotificationDate = null;
        this.isChecking = false;
        this.serviceWorker = null;
    }

    async init() {
        console.log('=== ИНИЦИАЛИЗАЦИЯ УВЕДОМЛЕНИЙ ===');
        
        try {
            // 1. Получаем регистрацию Service Worker
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                this.serviceWorker = registration;
                console.log('Service Worker готов:', registration.active ? 'активен' : 'не активен');
            }

            // 2. Загружаем настройки пользователя
            const db = await initDB();
            const user = await db.getUser();
            
            if (!user) {
                console.log('Пользователь не найден');
                return false;
            }
            
            console.log('Настройки пользователя:', user.settings);

            // 3. Проверяем поддержку уведомлений
            if (!('Notification' in window)) {
                console.log('❌ Браузер не поддерживает уведомления');
                return false;
            }

            // 4. Если уведомления отключены в настройках
            if (user.settings && user.settings.notifications === false) {
                console.log('🔕 Уведомления отключены в настройках');
                return false;
            }

            // 5. Запрашиваем разрешение
            let permission = Notification.permission;
            
            if (permission === 'default') {
                console.log('Запрашиваем разрешение...');
                permission = await Notification.requestPermission();
                console.log('Разрешение:', permission);
            }

            if (permission !== 'granted') {
                console.log('❌ Нет разрешения на уведомления:', permission);
                return false;
            }

            console.log('✅ Разрешение на уведомления получено');

            // 6. Запускаем проверку уведомлений
            this.startNotificationCheck();
            
            // 7. Проверяем немедленно (для отладки)
            setTimeout(() => this.checkForNotification(), 3000);
            
            return true;

        } catch (error) {
            console.error('Ошибка инициализации уведомлений:', error);
            return false;
        }
    }

    startNotificationCheck() {
        console.log('Запуск проверки уведомлений...');
        
        // Останавливаем предыдущий интервал
        if (this.notificationCheckInterval) {
            clearInterval(this.notificationCheckInterval);
        }
        
        // Проверяем каждые 30 секунд (для отладки)
        this.notificationCheckInterval = setInterval(async () => {
            await this.checkForNotification();
        }, 30000); // 30 секунд
        
        console.log('Проверка уведомлений запущена (каждые 30 сек)');
    }

    async checkForNotification() {
        if (this.isChecking) return;
        this.isChecking = true;
        
        console.log('🔔 Проверка необходимости уведомления...');
        
        try {
            const db = await initDB();
            const user = await db.getUser();
            
            if (!user) {
                console.log('Пользователь не найден');
                return;
            }

            // Проверяем, включены ли уведомления
            if (user.settings && user.settings.notifications === false) {
                console.log('Уведомления отключены');
                return;
            }

            // Получаем время уведомления из настроек (по умолчанию 10:00)
            const notificationTimeStr = (user.settings && user.settings.notificationTime) || '10:00';
            console.log('Время уведомления в настройках:', notificationTimeStr);
            
            const [hours, minutes] = notificationTimeStr.split(':').map(Number);
            const notificationTime = hours * 60 + minutes; // в минутах
            
            // Текущее время
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();
            
            console.log('Текущее время (минуты):', currentTime, 'Время уведомления:', notificationTime);
            
            // Проверяем, настало ли время для уведомления (±2 минуты)
            if (Math.abs(currentTime - notificationTime) <= 2) {
                const today = now.toDateString();
                const lastNotification = localStorage.getItem('lastNotificationDate');
                
                if (lastNotification !== today) {
                    console.log('🎉 Время для уведомления! Отправляем...');
                    await this.sendDailyNotification();
                    localStorage.setItem('lastNotificationDate', today);
                    console.log('Уведомление отправлено');
                } else {
                    console.log('Уведомление уже было сегодня');
                }
            } else {
                console.log('Еще не время для уведомления');
            }
            
        } catch (error) {
            console.error('Ошибка при проверке уведомлений:', error);
        } finally {
            this.isChecking = false;
        }
    }

    async sendDailyNotification() {
        console.log('Подготовка ежедневного уведомления...');
        
        try {
            const db = await initDB();
            
            // Получаем все цитаты
            const allQuotes = await db.getAllQuotes();
            
            if (allQuotes.length === 0) {
                console.log('Нет цитат для уведомления');
                return;
            }
            
            // Выбираем случайную цитату
            const randomQuote = allQuotes[Math.floor(Math.random() * allQuotes.length)];
            console.log('Выбрана цитата:', randomQuote.id);
            
            // Формируем текст уведомления
            const notificationText = `"${randomQuote.text.substring(0, 80)}${randomQuote.text.length > 80 ? '...' : ''}"`;
            
            // Пытаемся отправить через Service Worker
            if (this.serviceWorker && this.serviceWorker.showNotification) {
                try {
                    await this.serviceWorker.showNotification('🌿 Цитата дня', {
                        body: notificationText + `\n— ${randomQuote.author}`,
                        icon: './icons/icon-192x192.png',
                        badge: './icons/icon-72x72.png',
                        tag: 'daily-quote-' + Date.now(),
                        requireInteraction: true,
                        data: {
                            url: './index.html',
                            quoteId: randomQuote.id
                        }
                    });
                    console.log('✅ Уведомление отправлено через Service Worker');
                    return;
                } catch (swError) {
                    console.log('Service Worker не смог отправить, пробуем через Notification API:', swError);
                }
            }
            
            // Fallback: используем обычный Notification API
            if (Notification.permission === 'granted') {
                const notification = new Notification('🌿 Цитата дня', {
                    body: notificationText + `\n— ${randomQuote.author}`,
                    icon: './icons/icon-192x192.png',
                    tag: 'daily-quote-' + Date.now()
                });
                
                notification.onclick = () => {
                    window.focus();
                    if (window.location.pathname.includes('index.html')) {
                        window.location.reload();
                    } else {
                        window.location.href = './index.html';
                    }
                    notification.close();
                };
                
                console.log('✅ Уведомление отправлено через Notification API');
            }
            
        } catch (error) {
            console.error('❌ Ошибка отправки уведомления:', error);
        }
    }

    // Метод для ручной отправки тестового уведомления
    async testNotification() {
        console.log('🧪 Тестирование уведомления...');
        
        if (Notification.permission !== 'granted') {
            console.log('Запрашиваем разрешение...');
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.log('Нет разрешения');
                return;
            }
        }
        
        await this.sendDailyNotification();
    }

    stop() {
        if (this.notificationCheckInterval) {
            clearInterval(this.notificationCheckInterval);
            this.notificationCheckInterval = null;
            console.log('Проверка уведомлений остановлена');
        }
    }
}

// Глобальный экземпляр
let notificationManager = null;

window.testNotification = () => notificationManager ? notificationManager.testNotification() : null;

