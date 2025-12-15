// app.js - Основная логика приложения

let currentFilterTag = null;
let allQuotes = [];
let filteredQuotes = [];


async function loadQuotes() {
    const db = await initDB();
    const user = await db.getUser();
    
    // Получаем ВСЕ цитаты (не фильтруем по тегам пользователя)
    allQuotes = await db.getAllQuotes();
    
    console.log('Все цитаты загружены:', allQuotes.length);
    
    // Показываем все цитаты
    showAllQuotes();
}

async function showQuoteOfDay() {
    const db = await initDB();
    const user = await db.getUser();
    
    if (!user) return;
    
    // Получаем историю показа за последние 7 дней
    const recentHistory = await db.getRecentHistory(7);
    const shownQuoteIds = recentHistory.map(item => item.quoteId);
    
    // Используем все цитаты, не фильтруя по тегам пользователя
    const allQuotesTemp = await db.getAllQuotes();
    
    if (allQuotesTemp.length === 0) {
        document.getElementById('dailyQuoteText').textContent = "Пока нет цитат";
        document.getElementById('dailyQuoteAuthor').textContent = "";
        return;
    }
    
    // Фильтруем цитаты, которые не показывались последние 7 дней
    const availableQuotes = allQuotesTemp.filter(quote => !shownQuoteIds.includes(quote.id));
    
    let dailyQuote;
    if (availableQuotes.length > 0) {
        dailyQuote = availableQuotes[Math.floor(Math.random() * availableQuotes.length)];
    } else {
        dailyQuote = allQuotesTemp[Math.floor(Math.random() * allQuotesTemp.length)];
    }
    
    // Сохраняем в историю
    await db.saveQuoteHistory(dailyQuote.id);
    
    // Обновляем статистику
    await db.updateUserStats({
        quotesReceived: (await db.getUser()).stats.quotesReceived + 1,
        lastQuoteDate: new Date().toISOString()
    });
    
    // Отображаем цитату
    document.getElementById('dailyQuoteText').textContent = dailyQuote.text;
    document.getElementById('dailyQuoteAuthor').textContent = `— ${dailyQuote.author}`;
    
    // Устанавливаем обработчики для кнопок
    const addToFavoritesBtn = document.getElementById('addToFavoritesBtn');
    const copyQuoteBtn = document.getElementById('copyQuoteBtn');
    
    // Проверяем, есть ли цитата в избранном
    const isFavorite = await db.isFavorite(dailyQuote.id);
    updateFavoriteButton(addToFavoritesBtn, isFavorite, dailyQuote.id);
    
    // Копирование цитаты
    copyQuoteBtn.onclick = () => {
        const textToCopy = `${dailyQuote.text}\n— ${dailyQuote.author}`;
        navigator.clipboard.writeText(textToCopy).then(() => {
            showToast('Цитата скопирована в буфер обмена');
        });
    };
}

async function showAllQuotes() {
    const quotesList = document.getElementById('quotesList');
    if (!quotesList) return;
    
    quotesList.innerHTML = '';
    
    let quotesToShow = allQuotes;
    
    if (currentFilterTag) {
        quotesToShow = allQuotes.filter(quote => 
            quote.tags && quote.tags.includes(currentFilterTag)
        );
    }
    
    if (quotesToShow.length === 0) {
        quotesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <h3>Нет цитат</h3>
                <p>${currentFilterTag ? 'По выбранному тегу нет цитат' : 'Пока нет цитат в базе данных'}</p>
            </div>
        `;
        return;
    }
    
    quotesToShow.forEach(async (quote) => {
        const quoteElement = createQuoteElement(quote);
        quotesList.appendChild(quoteElement);
    });
    
    // Обновляем статистику
    updateFilterStats();
    updateFilterUI();
}

function createQuoteElement(quote) {
    const div = document.createElement('div');
    div.className = 'quote-card';
    div.dataset.id = quote.id;
    
    // УБРАЛИ getTagEmoji - только названия тегов
    const tagsHtml = quote.tags.map(tag => 
        `<span class="quote-tag">${getTagName(tag)}</span>`
    ).join('');
    
    div.innerHTML = `
        <div class="quote-card-content">
            <p class="quote-card-text">${quote.text}</p>
            <p class="quote-card-author">— ${quote.author}</p>
            <div class="quote-card-tags">${tagsHtml}</div>
        </div>
        <div class="quote-card-actions">
            <button class="icon-btn small favorite-btn" title="Добавить в избранное">
                <span>❤️</span>
            </button>
            <button class="icon-btn small copy-btn" title="Копировать">
                <span>📋</span>
            </button>
        </div>
    `;
    
    // Добавляем обработчики
    const favoriteBtn = div.querySelector('.favorite-btn');
    const copyBtn = div.querySelector('.copy-btn');
    
    // Проверяем, есть ли в избранном
    checkFavoriteStatus(quote.id).then(isFavorite => {
        updateFavoriteButton(favoriteBtn, isFavorite, quote.id);
    });
    
    // Копирование
    copyBtn.onclick = () => {
        const textToCopy = `${quote.text}\n— ${quote.author}`;
        navigator.clipboard.writeText(textToCopy).then(() => {
            showToast('Цитата скопирована');
        });
    };
    
    return div;
}

async function checkFavoriteStatus(quoteId) {
    const db = await initDB();
    return await db.isFavorite(quoteId);
}

function updateFavoriteButton(button, isFavorite, quoteId) {
    if (isFavorite) {
        button.innerHTML = '<span>💖</span>';
        button.title = 'Удалить из избранного';
        button.classList.add('active');
    } else {
        button.innerHTML = '<span>🤍</span>';
        button.title = 'Добавить в избранное';
        button.classList.remove('active');
    }
    
    button.onclick = async () => {
        const db = await initDB();
        if (isFavorite) {
            await db.removeFromFavorites(quoteId);
            showToast('Удалено из избранного');
        } else {
            await db.addToFavorites(quoteId);
            showToast('Добавлено в избранное');
        }
        
        // Обновляем статистику
        const user = await db.getUser();
        await db.updateUserStats({
            favoritesCount: await getFavoritesCount()
        });
        
        // Обновляем кнопку
        updateFavoriteButton(button, !isFavorite, quoteId);
    };
}

async function getFavoritesCount() {
    const db = await initDB();
    const favorites = await db.getFavorites();
    return favorites.length;
}

async function initTagsFilter() {
    const tagSelect = document.getElementById('tagFilterSelect');
    const resetBtn = document.getElementById('resetFilterBtn');
    const filterStats = document.getElementById('filterStats');
    const filterTagInfo = document.getElementById('filterTagInfo');
    const currentTagName = document.getElementById('currentTagName');
    
    if (!tagSelect) return;
    
    try {
        // Получаем ВСЕ теги из базы данных (не только выбранные пользователем)
        const db = await initDB();
        const allTags = await db.getAllTags();
        
        console.log('Все теги в системе:', allTags);
        
        // Очищаем список, оставляя только "Все теги"
        while (tagSelect.options.length > 1) {
            tagSelect.remove(1);
        }
        
        // Добавляем ВСЕ теги в выпадающий список - УБРАЛИ getTagEmoji
        allTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = getTagName(tag); // Только название
            tagSelect.appendChild(option);
        });
        
        // Восстанавливаем сохраненный фильтр
        const savedFilter = localStorage.getItem('currentTagFilter');
        if (savedFilter && allTags.includes(savedFilter)) {
            tagSelect.value = savedFilter;
            currentFilterTag = savedFilter;
            updateFilterUI();
        }
        
        // Обработчик изменения фильтра
        tagSelect.addEventListener('change', function() {
            currentFilterTag = this.value || null;
            
            // Сохраняем в localStorage
            if (currentFilterTag) {
                localStorage.setItem('currentTagFilter', currentFilterTag);
            } else {
                localStorage.removeItem('currentTagFilter');
            }
            
            // Показываем цитаты с фильтром
            showAllQuotes();
            updateFilterUI();
        });
        
        // Кнопка сброса фильтра
        if (resetBtn) {
            resetBtn.addEventListener('click', function() {
                tagSelect.value = '';
                currentFilterTag = null;
                localStorage.removeItem('currentTagFilter');
                showAllQuotes();
                updateFilterUI();
                showToast('Фильтр сброшен');
            });
        }
        
        // Обновляем статистику
        updateFilterStats();
        
    } catch (error) {
        console.error('Ошибка загрузки тегов:', error);
        // В случае ошибки используем теги пользователя как запасной вариант
        const db = await initDB();
        const user = await db.getUser();
        if (user && user.selectedTags) {
            initTagsFilterWithUserTags(user.selectedTags);
        }
    }
}

// Запасная функция для использования тегов пользователя
function initTagsFilterWithUserTags(userTags) {
    const tagSelect = document.getElementById('tagFilterSelect');
    if (!tagSelect) return;
    
    // Очищаем список, оставляя только "Все теги"
    while (tagSelect.options.length > 1) {
        tagSelect.remove(1);
    }
    
    // Добавляем теги пользователя - УБРАЛИ getTagEmoji
    userTags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = getTagName(tag); // Только название
        tagSelect.appendChild(option);
    });
    
    // Восстанавливаем сохраненный фильтр
    const savedFilter = localStorage.getItem('currentTagFilter');
    if (savedFilter && userTags.includes(savedFilter)) {
        tagSelect.value = savedFilter;
        currentFilterTag = savedFilter;
        updateFilterUI();
    }
    
    // Обработчик изменения фильтра
    tagSelect.addEventListener('change', function() {
        currentFilterTag = this.value || null;
        
        if (currentFilterTag) {
            localStorage.setItem('currentTagFilter', currentFilterTag);
        } else {
            localStorage.removeItem('currentTagFilter');
        }
        
        showAllQuotes();
        updateFilterUI();
    });
    
    updateFilterStats();
}

function updateFilterUI() {
    const filterTagInfo = document.getElementById('filterTagInfo');
    const currentTagName = document.getElementById('currentTagName');
    const tagSelect = document.getElementById('tagFilterSelect');
    
    if (currentFilterTag && tagSelect) {
        const selectedOption = tagSelect.options[tagSelect.selectedIndex];
        filterTagInfo.style.display = 'inline-block';
        currentTagName.textContent = selectedOption.textContent;
    } else {
        filterTagInfo.style.display = 'none';
    }
}

// Обновление статистики фильтра
function updateFilterStats() {
    const filterStats = document.getElementById('filterStats');
    if (!filterStats) return;
    
    const totalQuotes = allQuotes.length;
    let filteredQuotes = allQuotes;
    
    if (currentFilterTag) {
        filteredQuotes = allQuotes.filter(quote => 
            quote.tags && quote.tags.includes(currentFilterTag)
        );
    }
    
    if (currentFilterTag) {
        filterStats.textContent = `Цитат по тегу: ${filteredQuotes.length} из ${totalQuotes}`;
    } else {
        filterStats.textContent = `Всего цитат: ${totalQuotes}`;
    }
}

function updateFilterButtons() {
    const buttons = document.querySelectorAll('.tag-filter-btn');
    buttons.forEach(btn => {
        const tagName = btn.textContent.replace(/[^\w\s]/gi, '').trim();
        btn.classList.remove('active');
        
        if (currentFilterTag === null && btn.textContent.includes('Все теги')) {
            btn.classList.add('active');
        } else if (currentFilterTag === getTagIdFromName(tagName)) {
            btn.classList.add('active');
        }
    });
}

function getTagName(tagId) {
    const names = {
        'motivation': 'Мотивация',
        'philosophy': 'Философия',
        'success': 'Успех',
        'wisdom': 'Мудрость',
        'love': 'Любовь',
        'life': 'Жизнь',
        'inspiration': 'Вдохновение',
        'happiness': 'Счастье',
        'work': 'Работа',
        'creativity': 'Креативность',
        'nature': 'Природа',
        'spirituality': 'Духовность'
    };
    return names[tagId] || tagId;
}

// Обновляем initEventListeners
function initEventListeners() {
    console.log('Инициализация обработчиков событий...');
    
    // Настройки - перенаправляем на страницу профиля
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.onclick = () => {
            window.location.href = 'profile-settings.html';
        };
    }
    
    // Профиль
    const navProfile = document.getElementById('navProfile');
    if (navProfile) {
        // Убираем обработчик, так как это уже ссылка
        navProfile.onclick = null;
    }
}

async function loadProfile() {
    try {
        console.log('Загрузка профиля...');
        
        const db = await initDB();
        const user = await db.getUser();
        
        if (!user) {
            console.error('Пользователь не найден');
            return;
        }
        
        console.log('Пользователь загружен:', user.username);
        
        // Обновляем данные в профиле
        const profileUsername = document.getElementById('profileUsername');
        const favoritesCountEl = document.getElementById('favoritesCount');
        const tagsCountEl = document.getElementById('tagsCount');
        
        if (profileUsername) {
            profileUsername.textContent = user.username || 'Пользователь';
        }
        
        // Получаем количество избранных
        const favorites = await db.getFavorites();
        const favoritesCount = favorites.length;
        
        if (favoritesCountEl) {
            favoritesCountEl.textContent = favoritesCount;
        }
        
        // Получаем количество тегов
        const tagsCount = user.selectedTags ? user.selectedTags.length : 0;
        
        if (tagsCountEl) {
            tagsCountEl.textContent = tagsCount;
        }
        
        console.log('Профиль загружен:', { 
            username: user.username, 
            favoritesCount, 
            tagsCount 
        });
        
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
    }
}

function showToast(message) {
    // Создаем элемент тоста
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    // Добавляем стили
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 24px;
        border-radius: 20px;
        z-index: 1000;
        font-size: 14px;
        animation: fadeInOut 3s ease-in-out;
    `;
    
    // Добавляем анимацию
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translate(-50%, 20px); }
            10% { opacity: 1; transform: translate(-50%, 0); }
            90% { opacity: 1; transform: translate(-50%, 0); }
            100% { opacity: 0; transform: translate(-50%, -20px); }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(toast);
    
    // Удаляем через 3 секунды
    setTimeout(() => {
        toast.remove();
        style.remove();
    }, 3000);
}

async function initApp() {
    console.log('=== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ===');
    
    try {
        const db = await initDB();
        console.log('База данных инициализирована');
        
        const user = await db.getUser();
        console.log('Пользователь:', user ? user.username : 'не найден');
        
        if (!user) {
            console.log('Перенаправление на первый запуск');
            window.location.href = 'first-launch.html';
            return;
        }
        
        // Устанавливаем текущую дату
        const currentDate = new Date();
        const dateStr = currentDate.toLocaleDateString('ru-RU', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
        
        const dateElement = document.getElementById('currentDate');
        if (dateElement) {
            dateElement.textContent = dateStr;
        }
        
        // Загружаем цитаты
        console.log('Загрузка цитат...');
        await loadQuotes();
        
        // Показываем цитату дня
        console.log('Показ цитаты дня...');
        await showQuoteOfDay();
        
        // Инициализируем фильтр тегов (ВСЕ теги системы)
        console.log('Инициализация фильтра тегов...');
        await initTagsFilter();
        
        // Инициализируем обработчики событий
        console.log('Инициализация обработчиков событий...');
        initEventListeners();
        
        // Загружаем профиль
        console.log('Загрузка профиля...');
        await loadProfile();
        

        console.log('Запуск системы уведомлений...');
        if (typeof initNotifications === 'function') {
            await initNotifications();
        } else {
            console.log('Функция initNotifications не найдена');
        }
        
        
        console.log('=== ПРИЛОЖЕНИЕ УСПЕШНО ЗАПУЩЕНО ===');
        
    } catch (error) {
        console.error('КРИТИЧЕСКАЯ ОШИБКА при инициализации:', error);
        alert('Произошла ошибка при запуске приложения. Пожалуйста, обновите страницу.');
    }
   
}

// Регистрация Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', async () => {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js', {
                    scope: './',
                    updateViaCache: 'none'
                });
                
                console.log('Service Worker зарегистрирован:', registration.scope);
                
                // Отслеживаем обновления
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('Обнаружено обновление Service Worker');
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed') {
                            console.log('Новый Service Worker установлен');
                        }
                    });
                });
                
                // Проверяем состояние каждые 60 секунд
                setInterval(() => {
                    registration.update().catch(err => {
                        console.warn('Ошибка обновления Service Worker:', err);
                    });
                }, 60000);
                
            } catch (error) {
                console.error('Ошибка регистрации Service Worker:', error);
            }
        });
    }
}

// Инициализация Service Worker
registerServiceWorker();

// Функция для отправки тестового уведомления (для отладки)
async function testNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification('Тестовое уведомление', {
                body: 'Проверка работы уведомлений',
                icon: './icons/icon-192x192.png',
                badge: './icons/icon-72x72.png',
                tag: 'test-notification',
                data: {
                    url: './index.html'
                }
            });
            console.log('Тестовое уведомление отправлено');
        } catch (error) {
            console.error('Ошибка отправки уведомления:', error);
        }
    } else {
        console.log('Нет разрешения на уведомления или браузер не поддерживает');
    }
}

// Экспортируем для отладки
window.testNotification = testNotification;

// Экспорт для использования в других файлах
window.initApp = initApp;
window.loadProfile = loadProfile;
window.showToast = showToast;