// db.js - Работа с IndexedDB

const DB_NAME = 'MindGardenDB';
const DB_VERSION = 1;

// Структура базы данных
const STORES = {
    USERS: 'users',
    QUOTES: 'quotes',
    FAVORITES: 'favorites',
    SETTINGS: 'settings',
    HISTORY: 'history'
};

class Database {
    constructor() {
        this.db = null;
    }

    // Инициализация базы данных
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                
                // Создаем хранилище для пользователей
                if (!this.db.objectStoreNames.contains(STORES.USERS)) {
                    const userStore = this.db.createObjectStore(STORES.USERS, { keyPath: 'id' });
                    userStore.createIndex('username', 'username', { unique: false });
                }
                
                // Создаем хранилище для цитат
                if (!this.db.objectStoreNames.contains(STORES.QUOTES)) {
                    const quoteStore = this.db.createObjectStore(STORES.QUOTES, { keyPath: 'id' });
                    quoteStore.createIndex('tags', 'tags', { multiEntry: true });
                    quoteStore.createIndex('author', 'author', { unique: false });
                }
                
                // Создаем хранилище для избранного
                if (!this.db.objectStoreNames.contains(STORES.FAVORITES)) {
                    const favoriteStore = this.db.createObjectStore(STORES.FAVORITES, { 
                        keyPath: ['userId', 'quoteId']
                    });
                    favoriteStore.createIndex('userId', 'userId', { unique: false });
                    favoriteStore.createIndex('addedAt', 'addedAt', { unique: false });
                }
                
                // Создаем хранилище для настроек
                if (!this.db.objectStoreNames.contains(STORES.SETTINGS)) {
                    this.db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
                }
                
                // Создаем хранилище для истории
                if (!this.db.objectStoreNames.contains(STORES.HISTORY)) {
                    const historyStore = this.db.createObjectStore(STORES.HISTORY, { keyPath: 'id' });
                    historyStore.createIndex('date', 'date', { unique: false });
                    historyStore.createIndex('userId', 'userId', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // Получение пользователя
    async getUser() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.USERS], 'readonly');
            const store = transaction.objectStore(STORES.USERS);
            const request = store.get('current_user');

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Сохранение пользователя
    async saveUser(userData) {
        const user = {
            id: 'current_user',
            ...userData,
            updatedAt: new Date().toISOString()
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.USERS], 'readwrite');
            const store = transaction.objectStore(STORES.USERS);
            const request = store.put(user);

            request.onsuccess = () => resolve(user);
            request.onerror = () => reject(request.error);
        });
    }

    // Получение цитат по тегам
    async getQuotesByTags(tags, limit = 50) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.QUOTES], 'readonly');
            const store = transaction.objectStore(STORES.QUOTES);
            const index = store.index('tags');
            
            const quotes = [];
            const processedIds = new Set();
            
            // Для каждого тега получаем цитаты
            const promises = tags.map(tag => {
                return new Promise((resolveTag) => {
                    const keyRange = IDBKeyRange.only(tag);
                    const request = index.openCursor(keyRange);
                    
                    request.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor) {
                            const quote = cursor.value;
                            if (!processedIds.has(quote.id)) {
                                processedIds.add(quote.id);
                                quotes.push(quote);
                            }
                            cursor.continue();
                        } else {
                            resolveTag();
                        }
                    };
                });
            });
            
            Promise.all(promises).then(() => {
                // Перемешиваем цитаты
                const shuffled = quotes.sort(() => 0.5 - Math.random());
                resolve(shuffled.slice(0, limit));
            });
        });
    }

    // Получение всех цитат
    async getAllQuotes() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.QUOTES], 'readonly');
            const store = transaction.objectStore(STORES.QUOTES);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Сохранение цитат
    async saveQuotes(quotes) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.QUOTES], 'readwrite');
            const store = transaction.objectStore(STORES.QUOTES);
            
            quotes.forEach(quote => {
                store.put(quote);
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    // Добавление в избранное
    async addToFavorites(quoteId) {
        const user = await this.getUser();
        if (!user) throw new Error('Пользователь не найден');

        const favorite = {
            userId: user.id,
            quoteId: quoteId,
            addedAt: new Date().toISOString()
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.FAVORITES], 'readwrite');
            const store = transaction.objectStore(STORES.FAVORITES);
            const request = store.put(favorite);

            request.onsuccess = () => resolve(favorite);
            request.onerror = () => reject(request.error);
        });
    }

    // Удаление из избранного
    async removeFromFavorites(quoteId) {
        const user = await this.getUser();
        if (!user) throw new Error('Пользователь не найден');

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.FAVORITES], 'readwrite');
            const store = transaction.objectStore(STORES.FAVORITES);
            const request = store.delete([user.id, quoteId]);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Проверка, есть ли цитата в избранном
    async isFavorite(quoteId) {
        const user = await this.getUser();
        if (!user) return false;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.FAVORITES], 'readonly');
            const store = transaction.objectStore(STORES.FAVORITES);
            const request = store.get([user.id, quoteId]);

            request.onsuccess = () => resolve(!!request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Получение всех избранных цитат
    async getFavorites() {
        const user = await this.getUser();
        if (!user) return [];

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.FAVORITES, STORES.QUOTES], 'readonly');
            const favoriteStore = transaction.objectStore(STORES.FAVORITES);
            const quoteStore = transaction.objectStore(STORES.QUOTES);
            
            const index = favoriteStore.index('userId');
            const request = index.getAll(user.id);
            
            request.onsuccess = async () => {
                const favorites = request.result;
                const quotes = [];
                
                // Получаем полные данные цитат
                for (const fav of favorites) {
                    const quoteRequest = quoteStore.get(fav.quoteId);
                    quoteRequest.onsuccess = () => {
                        if (quoteRequest.result) {
                            quotes.push({
                                ...quoteRequest.result,
                                addedAt: fav.addedAt
                            });
                        }
                    };
                }
                
                // Ждем завершения транзакции
                transaction.oncomplete = () => {
                    // Сортируем по дате добавления (новые сверху)
                    quotes.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
                    resolve(quotes);
                };
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    // Сохранение истории показа цитат
    async saveQuoteHistory(quoteId) {
        const user = await this.getUser();
        if (!user) return;

        const historyItem = {
            id: `${user.id}_${Date.now()}`,
            userId: user.id,
            quoteId: quoteId,
            date: new Date().toISOString().split('T')[0], // Только дата
            timestamp: new Date().toISOString()
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.HISTORY], 'readwrite');
            const store = transaction.objectStore(STORES.HISTORY);
            const request = store.put(historyItem);

            request.onsuccess = () => resolve(historyItem);
            request.onerror = () => reject(request.error);
        });
    }

    // Получение истории показа цитат за последние N дней
    async getRecentHistory(days = 7) {
        const user = await this.getUser();
        if (!user) return [];

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffISO = cutoffDate.toISOString().split('T')[0];

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.HISTORY], 'readonly');
            const store = transaction.objectStore(STORES.HISTORY);
            const index = store.index('userId');
            
            const range = IDBKeyRange.only(user.id);
            const request = index.openCursor(range);
            
            const history = [];
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const item = cursor.value;
                    // Фильтруем по дате
                    if (item.date >= cutoffISO) {
                        history.push(item);
                    }
                    cursor.continue();
                } else {
                    resolve(history);
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    // Получение настройки
    async getSetting(key, defaultValue = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.SETTINGS], 'readonly');
            const store = transaction.objectStore(STORES.SETTINGS);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result ? request.result.value : defaultValue);
            request.onerror = () => reject(request.error);
        });
    }

    // Сохранение настройки
    async saveSetting(key, value) {
        const setting = {
            key: key,
            value: value,
            updatedAt: new Date().toISOString()
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.SETTINGS], 'readwrite');
            const store = transaction.objectStore(STORES.SETTINGS);
            const request = store.put(setting);

            request.onsuccess = () => resolve(setting);
            request.onerror = () => reject(request.error);
        });
    }

    // Обновление статистики пользователя
    async updateUserStats(statsUpdate) {
        const user = await this.getUser();
        if (!user) return;

        const updatedUser = {
            ...user,
            stats: {
                ...user.stats,
                ...statsUpdate
            },
            updatedAt: new Date().toISOString()
        };

        return this.saveUser(updatedUser);
    }

    async getAllTags() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.QUOTES], 'readonly');
            const store = transaction.objectStore(STORES.QUOTES);
            const request = store.getAll();
    
            request.onsuccess = (event) => {
                const quotes = event.target.result;
                const allTags = new Set(); // Используем Set для уникальности
                
                // Собираем все теги из всех цитат
                quotes.forEach(quote => {
                    if (quote.tags && Array.isArray(quote.tags)) {
                        quote.tags.forEach(tag => allTags.add(tag));
                    }
                });
                
                // Преобразуем в массив и сортируем
                const sortedTags = Array.from(allTags).sort();
                resolve(sortedTags);
            };
    
            request.onerror = () => reject(request.error);
        });
    }
}

// Экспорт глобального экземпляра базы данных
let dbInstance = null;

async function initDB() {
    if (!dbInstance) {
        dbInstance = new Database();
        await dbInstance.init();
    }
    return dbInstance;
}

// Экспорт функций для использования в других файлах
window.initDB = initDB;
window.getDB = () => dbInstance;