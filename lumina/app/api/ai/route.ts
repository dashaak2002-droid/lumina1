import { NextResponse } from 'next/server';
import { sanitizeActions } from '@/lib/actions';
import { buildSystemPrompt, callLLM, extractJson, modelName, resolveProvider, type ChatTurn } from '@/lib/ai-server';

export const dynamic = 'force-dynamic';

// GET — показать в профиле, какой AI подключён (ключи не раскрываются)
export async function GET() {
  const provider = resolveProvider();
  return NextResponse.json({ provider, model: modelName(provider) });
}

// POST — задать вопрос AI.
// Если ключей нет или произошла ошибка — отвечаем {fallback:true},
// и приложение само использует встроенный демо-режим.
export async function POST(req: Request) {
  const provider = resolveProvider();
  if (provider === 'local') return NextResponse.json({ fallback: true, reason: 'no_key' });

  let body: { messages?: { role?: string; text?: string }[]; context?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 });
  }

  // Простая валидация: последние 12 сообщений, ограничение по длине, чередование ролей
  const turns: ChatTurn[] = [];
  for (const m of (body.messages ?? []).slice(-12)) {
    if ((m.role !== 'user' && m.role !== 'assistant') || typeof m.text !== 'string') continue;
    const content = m.text.slice(0, 2000);
    if (!content.trim()) continue;
    if (turns.length && turns[turns.length - 1].role === m.role) turns[turns.length - 1].content += '\n' + content;
    else turns.push({ role: m.role, content });
  }
  while (turns.length && turns[0].role !== 'user') turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'no_user_message' }, { status: 400 });
  }

  try {
    const raw = await callLLM(provider, buildSystemPrompt(body.context ?? {}), turns);
    const json = extractJson(raw);
    const reply = typeof json?.reply === 'string' && json.reply.trim() ? json.reply : raw.trim() || 'Не получилось сформулировать ответ — попробуй переформулировать.';
    return NextResponse.json({ reply, actions: sanitizeActions(json?.actions), source: 'llm' });
  } catch (e) {
    console.error('[api/ai]', e);
    return NextResponse.json({ fallback: true, reason: 'error' });
  }
}
