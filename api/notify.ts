
export const config = {
  runtime: 'edge',
};

const KV_REST_API_URL = 'https://golden-hound-18396.upstash.io';
const KV_REST_API_TOKEN = 'AUfcAAIncDJiMzQwNjMwYzUzOGM0NDI4YjQyNWQ3NjAzZDYwNDk2ZHAyMTgzOTY';
const USERS_LIST_KEY = 'beef_registered_users_list_v1';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  if (!BOT_TOKEN) return new Response('Bot Token Not Set', { status: 500 });

  try {
    const { title, prize, winners, duration } = await req.json();

    // 1. Получаем список ID всех пользователей из Upstash
    const res = await fetch(`${KV_REST_API_URL}/get/${USERS_LIST_KEY}`, {
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
    });
    const data = await res.json();
    const userIds: number[] = data.result ? JSON.parse(data.result) : [];

    if (userIds.length === 0) return new Response('No users', { status: 200 });

    // 2. Рассылаем сообщения в новом формате
    const text = `🎁 *НОВЫЙ РОЗЫГРЫШ!*\n\n🏆 *${title}*\n💰 Приз: *${prize}*\n👥 Призовых Мест: *${winners}*\n⏰ Итоги через *${duration}*\n\nЗаходи скорее, пока есть время! 👇`;
    
    const sendPromises = userIds.map(userId => {
      const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: userId,
          text: text,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🚀 УЧАСТВОВАТЬ', url: 'https://t.me/ludovar_gift_bot/gift' }]
            ]
          }
        }),
      }).catch(err => console.error(`Failed to notify ${userId}`, err));
    });

    await Promise.all(sendPromises);

    return new Response(JSON.stringify({ success: true, count: userIds.length }), { status: 200 });
  } catch (error) {
    console.error('Notify error:', error);
    return new Response('Error', { status: 500 });
  }
}
