
export const config = {
  runtime: 'edge',
};

const KV_REST_API_URL = 'https://golden-hound-18396.upstash.io';
const KV_REST_API_TOKEN = 'AUfcAAIncDJiMzQwNjMwYzUzOGM0NDI4YjQyNWQ3NjAzZDYwNDk2ZHAyMTgzOTY';
const USERS_LIST_KEY = 'beef_registered_users_list_v1';
const ADMIN_STATE_KEY = 'beef_admin_broadcast_state';
const ADMIN_ID = 7946967720;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function kvGet(key: string) {
  const res = await fetch(`${KV_REST_API_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
  });
  const data = await res.json();
  return data.result ? JSON.parse(data.result) : null;
}

async function kvSet(key: string, value: any) {
  await fetch(`${KV_REST_API_URL}/set/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
    body: JSON.stringify(value),
  });
}

async function sendMessage(chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('OK', { status: 200 });
  if (!BOT_TOKEN) return new Response('Bot Token Not Set', { status: 500 });

  try {
    const update = await req.json();
    const message = update.message;

    if (!message || !message.from || !message.chat) return new Response('OK', { status: 200 });

    const userId = message.from.id;
    const text = message.text || '';

    // Проверка прав админа
    if (userId !== ADMIN_ID) return new Response('OK', { status: 200 });

    // Проверяем состояние админа (не ждем ли мы сообщение для рассылки)
    const broadcastState = await kvGet(ADMIN_STATE_KEY);

    // Если ввели команду /send
    if (text === '/send') {
      await kvSet(ADMIN_STATE_KEY, { active: true });
      await sendMessage(ADMIN_ID, "📝 *Режим рассылки активирован.*\n\nПришлите следующим сообщением то, что нужно разослать всем пользователям (текст, фото с описанием, пост и т.д.).");
      return new Response('OK', { status: 200 });
    }

    // Если админ прислал сообщение в режиме рассылки
    if (broadcastState && broadcastState.active) {
      // Сразу выключаем режим, чтобы не зациклиться
      await kvSet(ADMIN_STATE_KEY, { active: false });

      await sendMessage(ADMIN_ID, "⌛ *Начинаю рассылку...*");

      // Получаем список пользователей
      const userIds: number[] = await kvGet(USERS_LIST_KEY) || [];
      
      if (userIds.length === 0) {
        await sendMessage(ADMIN_ID, "❌ Ошибка: Список пользователей пуст.");
        return new Response('OK', { status: 200 });
      }

      let successCount = 0;
      let failCount = 0;

      // Рассылаем методом copyMessage (сохраняет форматирование и медиа)
      const sendPromises = userIds.map(async (targetId) => {
        try {
          const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/copyMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: targetId,
              from_chat_id: ADMIN_ID,
              message_id: message.message_id
            }),
          });
          if (res.ok) successCount++; else failCount++;
        } catch (e) { failCount++; }
      });

      await Promise.all(sendPromises);

      await sendMessage(ADMIN_ID, `✅ *Рассылка завершена!*\n\nДоставлено: ${successCount}\nОшибок: ${failCount}`);
      return new Response('OK', { status: 200 });
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('OK', { status: 200 });
  }
}
