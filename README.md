# GiftLab — Telegram Gifts virtual simulator

Готовый статический прототип с:
- обычным ограниченным балансом Stars;
- Sandbox-режимом с бесконечными Stars;
- кейсами и анимированной рулеткой;
- NFT/Gift Upgrade с шансом;
- Case Battles 1v1 против бота;
- Battle Pass + Prime;
- промокодами;
- инвентарём и продажей виртуальных предметов;
- Firebase Auth/Firestore интеграцией;
- localStorage fallback без Firebase.

## Важно про цены

В `app.js` встроен DEMO-каталог, и интерфейс явно пишет `DEMO` рядом с такими ценами.
Это специально: проект НЕ выдаёт придуманные цифры за реальные цены.

Для реальных значений создай документы в Firestore:
`market/{gift-id}`

Пример:
```json
{
  "name": "Plush Pepe",
  "emoji": "🐸",
  "rarity": "legendary",
  "value": 12345
}
```

Когда коллекция `market` непустая, сайт автоматически заменит DEMO-каталог данными Firestore.

## Firebase

1. Создай Firebase Project.
2. Включи Authentication -> Anonymous.
3. Создай Firestore Database.
4. Скопируй `firebase-config.example.js` в `firebase-config.js`.
5. Вставь свой Firebase Web config.
6. Задеплой `firestore.rules`.

## Запуск локально

Из папки проекта:
```bash
python -m http.server 8080
```

Открой:
`http://localhost:8080`

> Не открывай index.html двойным кликом, если хочешь Firebase: ES modules лучше запускать через локальный HTTP server.

## Демо промокоды

- `WELCOME` → +750 ★
- `PRIMEDEMO` → +1000 XP
- `LUCKYCASE` → +1 бесплатный кейс

## Что хранится в Firestore

`users/{uid}`:
- balance
- sandbox
- inventory
- xp
- prime
- usedPromos
- stats

`market/{giftId}`:
- name
- emoji
- rarity
- value

## Следующий логичный шаг

Для production-версии:
- отдельная admin panel;
- Cloud Functions для защищённой экономики;
- real-time battles через Firestore listeners;
- Telegram Mini App login;
- импорт реальных Telegram Gift values в `market`;
- настоящие Lottie/TGS/WebM анимации подарков вместо emoji.


## V2: бесплатные награды по таймеру

Добавлена отдельная страница `Награды`:

- Часовой кейс — раз в 1 час
- Дневной кейс — раз в 24 часа
- 7-дневный кейс — раз в 7 дней

Награды:
- виртуальные Stars;
- XP Battle Pass;
- шанс получить бесплатное открытие кейса.

Таймер хранится в `rewardClaims`. При включённом Firebase это поле синхронизируется вместе с остальным состоянием пользователя.

Для production лучше перенести проверку времени и выдачу наград в Cloud Functions / серверную часть, потому что клиентский JavaScript и localStorage можно изменить вручную.


## V3 FIXED

Исправления:
- Firebase больше не должен ломать работу интерфейса.
- Если Firebase недоступен, кейсы, апгрейд, баттлы, награды, Battle Pass, промокоды и инвентарь продолжают работать через localStorage.
- В Console теперь видна точная ошибка Firebase.
- Добавлена загрузка сохранения из Firestore.
- Добавлена кнопка сброса локального прогресса.

### Для Cloudflare Pages
В deployment обязательно должны быть:
- index.html
- app.js
- styles.css
- firebase-config.js

`firebase-config.example.js` сам сайт не использует.

После загрузки открой:
`https://ТВОЙ-ДОМЕН.pages.dev/firebase-config.js`

Если там 404, значит firebase-config.js не попал в deployment.
