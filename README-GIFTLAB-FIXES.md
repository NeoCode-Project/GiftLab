# GiftLab V1.1 FIXED — важное

Я проверил UpgradeLab-based GiftLab и исправил основные блокирующие проблемы.

## Что было сломано

1. `firebase-config.js` был от старого проекта `upgradelab`, а не от нового `giftlab-6dd3a`.
2. Этот код использует Email/Password авторизацию UpgradeLab. Anonymous для этой версии НЕ нужен.
3. Если Email/Password не включён, вход не работает (`auth/operation-not-allowed`).
4. Для Workers/Pages домен сайта нужно добавить в Firebase Authentication → Settings → Authorized domains.
5. В Firestore rule для `usernames` другой пользователь мог перезаписать уже занятый username. Исправлено.
6. В `app.js` случайно были вложены дубликаты функций админ-промокодов внутри обработчика быстрых настроек. Убрано.
7. Исправлена опечатка `подарокы`.
8. Проверено: `app.js` и `price-engine.js` синтаксически валидны.
9. Проверено: в каталоге 142 Gift entries и все их локальные asset-файлы существуют.
10. В проекте 24 Gift cases.
11. Admin UI скрывается, если `profiles/{uid}.role != "admin"`. Даже если вручную снять CSS `hidden`, Firestore Rules запрещают admin writes.

## Firebase Authentication — настройка именно для этой версии

Authentication → Sign-in method:
- Email/Password: ENABLE
- Anonymous: можно оставить выключенным

Authentication → Settings → Authorized domains:
добавь домен, на котором открыт GiftLab, например:
`giftlab.tel95651.workers.dev`

## Firestore

Опубликуй `firestore.rules` из этого ZIP.

Чтобы выдать себе админа, вручную в Firebase Console у своего документа:
`profiles/{ТВОЙ_UID}`
добавь:
`role = "admin"`

Обычный пользователь не может сам назначить себе эту роль через сайт.

## Cloudflare

Загружай ВСЁ содержимое архива, включая:
- index.html
- app.js
- styles.css
- firebase-config.js
- price-engine.js
- assets/
- _worker.js (если используешь Workers deployment)

## Если снова не загрузится

Открой F12 → Console. Теперь для двух самых частых ошибок будут понятные сообщения:
- Email/Password не включён
- домен не разрешён в Firebase
