
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
      const firstName = data.result.first_name || '';
      const lastName = data.result.last_name || '';
      const initial = firstName.charAt(0) || '?';
      return {
        name: `${firstName} ${lastName}`.trim(),
        username: data.result.username ? `@${data.result.username}` : '—',
        initial: initial.toUpperCase()
      };
    }
  } catch (e) {}
  return { name: `User ${userId}`, username: '—', initial: '?' };
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('OK', { status: 200 });
  if (!BOT_TOKEN) return new Response('Bot Token Not Set', { status: 500 });

  try {
    const update = await req.json();

    if (update.callback_query) {
      const cb = update.callback_query;
      const userId = cb.from.id;

      if (userId === ADMIN_ID && cb.data === 'detailed_stats') {
        const userIds: number[] = await kvGet(USERS_LIST_KEY) || [];
        
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cb.id, text: "Генерирую отчет..." })
        });

        let rowsHtml = '';
        const limit = Math.min(userIds.length, 200); 
        const usersToProcess = userIds.slice(-limit).reverse();

        for (const id of usersToProcess) {
          const info = await getChatInfo(id);
          rowsHtml += `
            <tr>
              <td>${id}</td>
              <td style="width: 50px;">
                <div class="avatar-circle">${info.initial}</div>
              </td>
              <td class="user-name">${info.name}</td>
              <td class="user-link">${info.username}</td>
            </tr>`;
        }

        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Отчет BEEF • LUDOVAR</title>
            <style>
              body { background-color: #0d0d0d; color: #e2e2e6; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; margin: 0; }
              .container { max-width: 900px; margin: 0 auto; }
              h1 { color: #C5A059; text-transform: uppercase; letter-spacing: 4px; text-align: center; margin-bottom: 10px; font-weight: 900; }
              .subtitle { text-align: center; opacity: 0.5; font-size: 12px; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 1px; }
              table { width: 100%; border-collapse: separate; border-spacing: 0 8px; margin-top: 20px; }
              th { padding: 15px; text-align: left; color: #C5A059; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; font-weight: 900; border-bottom: 2px solid #C5A059; }
              td { padding: 12px 15px; background: #1c1c1e; border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(0,0,0,0.2); }
              tr td:first-child { border-radius: 12px 0 0 12px; font-family: monospace; color: #555; font-size: 12px; }
              tr td:last-child { border-radius: 0 12px 12px 0; }
              .avatar-circle { width: 32px; height: 32px; background: linear-gradient(135deg, #C5A059 0%, #F3E5AB 100%); border-radius: 50%; display: flex; items-center: center; justify-content: center; color: #0d0d0d; font-weight: 900; font-size: 14px; border: 2px solid rgba(255,255,255,0.1); box-shadow: 0 4px 10px rgba(0,0,0,0.3); margin: 0 auto; line-height: 32px; text-align: center; }
              .user-name { font-weight: 700; color: #fff; }
              .user-link { color: #C5A059; font-weight: 500; }
              tr:hover td { background-color: #242426; cursor: default; }
              .footer { margin-top: 40px; font-size: 10px; color: #333; text-align: center; text-transform: uppercase; letter-spacing: 1px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>BEEF • LUDOVAR</h1>
              <div class="subtitle">Отчет по пользователям | База: ${userIds.length} | Выборка: ${limit}</div>
              <table>
                <thead>
                  <tr>
                    <th>Telegram ID</th>
                    <th style="text-align: center;">Аватар</th>
                    <th>Имя</th>
                    <th>Username</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
              <div class="footer">
                &copy; 2024 BEEF LUDOVAR SYSTEM • PRIVATE REPORT
              </div>
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
