export const config = {
  runtime: 'edge',
};

const KV_REST_API_URL = 'https://golden-hound-18396.upstash.io';
const KV_REST_API_TOKEN = 'AUfcAAIncDJiMzQwNjMwYzUzOGM0NDI4YjQyNWQ3NjAzZDYwNDk2ZHAyMTgzOTY';
const DB_KEY = 'beef_contests_v7_final';

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  try {
    const { contestId, userId } = await req.json();
    if (!contestId) return new Response('Bad Request', { status: 400 });

    // 1. Получаем текущий список розыгрышей из Upstash
    const getRes = await fetch(`${KV_REST_API_URL}/get/${DB_KEY}`, {
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
    });
    const getData = await getRes.json();
    let contests = getData.result ? JSON.parse(getData.result) : [];

    const contestIdx = contests.findIndex((c: any) => c.id === contestId);
    if (contestIdx === -1) return new Response('Contest Not Found', { status: 404 });
    
    const contest = contests[contestIdx];
    if (contest.isCompleted) return new Response('Contest Already Finished', { status: 400 });

    // 2. Логика добавления участников: 1 реальный + 1-2 случайных бота
    const botsToAdd = Math.floor(Math.random() * 2) + 1; 
    const totalAdd = 1 + botsToAdd;

    const myTicket = (contest.lastTicketNumber || 0) + 1;
    
    // Атомарно обновляем объект розыгрыша
    contests[contestIdx] = {
      ...contest,
      participantCount: (contest.participantCount || 0) + totalAdd,
      realParticipantCount: (contest.realParticipantCount || 0) + 1,
      lastTicketNumber: (contest.lastTicketNumber || 0) + totalAdd,
    };

    // 3. Сохраняем обновленный список обратно в базу
    await fetch(`${KV_REST_API_URL}/set/${DB_KEY}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
      body: JSON.stringify(contests),
    });

    return new Response(JSON.stringify({ 
      success: true, 
      ticketNumber: myTicket,
      updatedContests: contests 
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Participation API Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}