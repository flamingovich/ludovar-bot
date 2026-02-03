
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

async function sendMessage(chatId: number, text: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      chat_id: chatId, 
      text, 
      parse_mode: 'Markdown',
      reply_markup: replyMarkup
    }),
  });
}

async function sendDocument(chatId: number, htmlContent: string, filename: string, caption: string) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`;
  const formData = new FormData();
  formData.append('chat_id', chatId.toString());
  formData.append('caption', caption);
  formData.append('parse_mode', 'Markdown');
  
  const blob = new Blob([htmlContent], { type: 'text/html' });
  formData.append('document', blob, filename);

  return fetch(url, {
    method: 'POST',
    body: formData,
  });
}

async function getChatInfo(userId: number) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=${userId}`);
    const data = await res.json();
    if (data.ok) {
      return {
        name: `${data.result.first_name || ''} ${data.result.last_name || ''}`.trim(),
        username: data.result.username ? `@${data.result.username}` : '—'
      };
    }
  } catch (e) {}
  return { name: `User ${userId}`, username: '—' };
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('OK', { status: 200 });
  if (!BOT_TOKEN) return new Response('Bot Token Not Set', { status: 500 });

  try {
    const update = await req.json();

    // Обработка нажатий на кнопки (Callback Queries)
    if (update.callback_query) {
      const cb = update.callback_query;
      const userId = cb.from.id;

      if (userId === ADMIN_ID && cb.data === 'detailed_stats') {
        const userIds: number[] = await kvGet(USERS_LIST_KEY) || [];
        
        // Показываем уведомление, что начали сбор (может занять время)
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cb.id, text: "Генерирую отчет..." })
        });

        let rowsHtml = '';
        // Берем последних 100 или всех, если мало, чтобы не упереться в лимиты API
        const limit = Math.min(userIds.length, 200); 
        const usersToProcess = userIds.slice(-limit).reverse();

        for (const id of usersToProcess) {
          const info = await getChatInfo(id);
          rowsHtml += `
            <tr>
              <td>${id}</td>
              <td>${info.name}</td>
              <td>${info.username}</td>
              <td>—</td>
              <td>—</td>
            </tr>`;
        }

        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { background-color: #0d0d0d; color: #e2e2e6; font-family: sans-serif; padding: 40px; }
              h1 { color: #C5A059; text-transform: uppercase; letter-spacing: 2px; text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 30px; background: #1c1c1e; border-radius: 15px; overflow: hidden; }
              th, td { padding: 15px; text-align: left; border-bottom: 1px solid #2c2c2e; }
              th { background-color: #C5A059; color: #0d0d0d; text-transform: uppercase; font-size: 12px; }
              tr:hover { background-color: rgba(197, 160, 89, 0.05); }
              .footer { margin-top: 20px; font-size: 10px; color: #444; text-align: center; }
            </style>
          </head>
          <body>
            <h1>Отчет по пользователям BEEF • LUDOVAR</h1>
            <p style="text-align: center; opacity: 0.5;">Всего в базе: ${userIds.length} | Показано: ${limit}</p>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Имя</th>
                  <th>Username</th>
                  <th>Дата рег.</th>
                  <th>Участий</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
            <div class="footer">
              * Данные о дате регистрации и кол-ве участий хранятся локально в TMA и не передаются на сервер.
            </div>
          </body>
          </html>`;

        await sendDocument(ADMIN_ID, html, 'ludovar_stats.html', `📊 *Подробная статистика*\n\nВ файле информация о последних ${limit} активных пользователях.`);
        return new Response('OK', { status: 200 });
      }
      return new Response('OK', { status: 200 });
    }

    const message = update.message;
    if (!message || !message.from) return new Response('OK', { status: 200 });

    const userId = message.from.id;
    const text = message.text || '';

    if (userId !== ADMIN_ID) return new Response('OK', { status: 200 });

    if (text === '/start') {
        await sendMessage(ADMIN_ID, "👋 *Бот Лудовара на связи!*\n\nКоманды:\n/send — рассылка\n/stats — статистика");
        return new Response('OK', { status: 200 });
    }

    if (text === '/stats') {
      const userIds: number[] = await kvGet(USERS_LIST_KEY) || [];
      const statsText = `📊 *Статистика проекта*\n\n👥 Всего пользователей: *${userIds.length}*`;
      
      const replyMarkup = {
        inline_keyboard: [
          [{ text: '📄 Подробный отчет (HTML)', callback_data: 'detailed_stats' }]
        ]
      };

      await sendMessage(ADMIN_ID, statsText, replyMarkup);
      return new Response('OK', { status: 200 });
    }

    if (text === '/send') {
      await kvSet(ADMIN_STATE_KEY, { active: true });
      await sendMessage(ADMIN_ID, "📝 *Режим рассылки!*\n\nПришлите сообщение для рассылки.");
      return new Response('OK', { status: 200 });
    }

    const broadcastState = await kvGet(ADMIN_STATE_KEY);
    if (broadcastState && broadcastState.active) {
      await kvSet(ADMIN_STATE_KEY, { active: false });
      const userIds: number[] = await kvGet(USERS_LIST_KEY) || [];
      
      if (userIds.length === 0) {
        await sendMessage(ADMIN_ID, "❌ Нет пользователей.");
        return new Response('OK', { status: 200 });
      }

      await sendMessage(ADMIN_ID, `⌛ *Рассылка на ${userIds.length} чел...*`);
      let successCount = 0;
      let failCount = 0;

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
        } catch (e) { failCount++; }
      }

      await sendMessage(ADMIN_ID, `✅ *Готово!*\n\nДоставлено: ${successCount}\nОшибок: ${failCount}`);
      return new Response('OK', { status: 200 });
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    return new Response('OK', { status: 200 });
  }
}
