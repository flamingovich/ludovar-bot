
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
  try {
    const res = await fetch(`${KV_REST_API_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
    });
    const data = await res.json();
    return data.result ? JSON.parse(data.result) : null;
  } catch (e) {
    return null;
  }
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
  // На любой запрос от Telegram отвечаем 200 OK сразу, чтобы избежать повторов
  if (req.method !== 'POST') return new Response('OK', { status: 200 });
  if (!BOT_TOKEN) return new Response('Bot Token Not Set', { status: 500 });

  try {
    const update = await req.json();
    const message = update.message;

    if (!message || !message.from) return new Response('OK', { status: 200 });

    const userId = message.from.id;
    const text = message.text || '';

    // Только админ может управлять ботом через команды
    if (userId !== ADMIN_ID) {
        // Обычным пользователям можно отвечать приветствием или просто игнорировать
        return new Response('OK', { status: 200 });
    }

    // Если админ ввел /start, подтверждаем работу
    if (text === '/start') {
        await sendMessage(ADMIN_ID, "👋 *Бот Лудовара на связи!*\n\nТвой ID: `" + ADMIN_ID + "` подтвержден как администратор.\n\nКоманды:\n/send — запустить рассылку");
        return new Response('OK', { status: 200 });
    }

    // Если ввели команду /send
    if (text === '/send') {
      await kvSet(ADMIN_STATE_KEY, { active: true });
      await sendMessage(ADMIN_ID, "📝 *Режим рассылки активирован.*\n\nПришлите следующим сообщением то, что нужно разослать всем пользователям (текст, фото с описанием, пост и т.д.).");
      return new Response('OK', { status: 200 });
    }

    // Проверяем состояние админа (не ждем ли мы сообщение для рассылки)
    const broadcastState = await kvGet(ADMIN_STATE_KEY);

    if (broadcastState && broadcastState.active) {
      // Выключаем режим рассылки
      await kvSet(ADMIN_STATE_KEY, { active: false });

      // Получаем список пользователей
      const userIds: number[] = await kvGet(USERS_LIST_KEY) || [];
      
      if (userIds.length === 0) {
        await sendMessage(ADMIN_ID, "❌ Ошибка: В базе данных еще нет зарегистрированных пользователей.");
        return new Response('OK', { status: 200 });
      }

      await sendMessage(ADMIN_ID, `⌛ *Начинаю рассылку на ${userIds.length} пользователей...*`);

      let successCount = 0;
      let failCount = 0;

      // Рассылаем методом copyMessage (сохраняет форматирование и медиа)
      // Используем цикл, чтобы не перегружать API слишком сильно
      for (const targetId of userIds) {
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
        } catch (e) { 
          failCount++; 
        }
      }

      await sendMessage(ADMIN_ID, `✅ *Рассылка завершена!*\n\nДоставлено: ${successCount}\nОшибок: ${failCount}`);
      return new Response('OK', { status: 200 });
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    // В случае критической ошибки отправляем отчет админу (если возможно)
    try { await sendMessage(ADMIN_ID, "⚠️ Произошла ошибка в работе Webhook: " + (error as Error).message); } catch(e) {}
    return new Response('OK', { status: 200 });
  }
}
