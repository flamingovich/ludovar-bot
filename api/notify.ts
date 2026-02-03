
export const config = {
  runtime: 'edge',
};

const KV_REST_API_URL = 'https://golden-hound-18396.upstash.io';
const KV_REST_API_TOKEN = 'AUfcAAIncDJiMzQwNjMwYzUzOGM0NDI4YjQyNWQ3NjAzZDYwNDk2ZHAyMTgzOTY';
const USERS_KEY = 'beef_registered_users_v1';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (!BOT_TOKEN) {
    return new Response('Telegram Bot Token not configured', { status: 500 });
  }

  try {
    const { title, prize, winners } = await req.json();

    // 1. Получаем список ID пользователей из Upstash
    const res = await fetch(`${KV_REST_API_URL}/get/${USERS_KEY}`, {
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
    });
    const data = await res.json();
    const userIds: number[] = data.result ? JSON.parse(data.result) : [];

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No users registered' }), { status: 200 });
    }

    // 2. Рассылаем сообщения
    const results = await Promise.all(
      userIds.map(async (userId) => {
        const text = `🎁 *НОВЫЙ РОЗЫГРЫШ!*\n\n🏆 *${title}*\n💰 Призовой фонд: *${prize}*\n👥 Победителей: *${winners}*\n\nНажми на кнопку ниже, чтобы занять свое место!`;
        
        const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        
        return fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: userId,
            text: text,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '🚀 Участвовать',
                    url: `https://t.me/Ludovar_Bot/BeefMiniApp`, // Замените на ссылку вашего бота/аппа
                  },
                ],
              ],
            },
          }),
        });
      })
    );

    return new Response(JSON.stringify({ success: true, count: results.length }), { status: 200 });
  } catch (error) {
    console.error('Notification Error:', error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), { status: 500 });
  }
}
