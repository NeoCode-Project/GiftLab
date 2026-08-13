# GiftLab V4 — fixed core

Эта версия сделана заново, без зависимости основного интерфейса от Firebase.

## Почему старая версия не работала

В старом app.js было две разные реализации страницы наград. Вторая версия `renderRewards()` искала элементы, которых уже не было в HTML. На `init()` получался JavaScript runtime error, поэтому рендер кейсов обрывался. Firebase даже не успевал нормально инициализироваться.

V4 разделяет:
- `app.js` — вся игра, обычный классический JS, всегда работает;
- `firebase-sync.js` — только облачное сохранение, отдельно и необязательно.

Даже если Firebase выключен, вся игра должна работать в Local.

## Реальные изображения collectible gifts

В `assets/` находятся изображения реальных Telegram collectible gifts / их публичных карточек:
- Plush Pepe #1 (Pumpkin)
- Plush Pepe #2624 (Midas Pepe)
- Durov's Cap #23
- Durov's Cap Sunrise

Они используются вместо emoji-заглушек.

Внутренняя `Virtual Value` в V4 — игровая стоимость симулятора, НЕ заявляется как реальная рыночная цена.

## Cloudflare

Загрузи ВСЁ содержимое ZIP одним deployment, включая папку `assets`.

В корне должны быть:
- index.html
- styles.css
- app.js
- firebase-sync.js
- firebase-config.js
- firestore.rules
- assets/

Не загружай только index.html — иначе картинки/JS не найдутся.

## Firebase

1. Authentication -> Sign-in method -> Anonymous = Enabled.
2. Firestore создан.
3. В Firestore -> Rules вставь `firestore.rules` и Publish.
4. Конфиг твоего проекта уже находится в `firebase-config.js`.

Если Firebase не заработает, сверху будет `Local`, но игра всё равно должна полностью работать.

## Проверка

После деплоя:
- F12 -> Console: `GiftLab V4 core loaded`
- `/app.js` должен открываться
- `/assets/plush-pepe-pumpkin.png` должен открываться
- `/firebase-config.js` должен открываться
