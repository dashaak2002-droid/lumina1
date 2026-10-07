// Серверная часть AI. Вызывается ТОЛЬКО из app/api/ai/route.ts,
// поэтому ключи API никогда не попадают в браузер.
//
// Чтобы подключить другую модель — добавьте ещё одну функцию по образцу
// callAnthropic / callOpenAI и ветку в callLLM.

export type Provider = 'anthropic' | 'openai' | 'local';

export function resolveProvider(): Provider {
  const want = (process.env.AI_PROVIDER || 'auto').toLowerCase();
  const hasA = !!process.env.ANTHROPIC_API_KEY?.trim();
  const hasO = !!process.env.OPENAI_API_KEY?.trim();
  if (want === 'local') return 'local';
  if (want === 'anthropic') return hasA ? 'anthropic' : 'local';
  if (want === 'openai') return hasO ? 'openai' : 'local';
  if (hasA) return 'anthropic';
  if (hasO) return 'openai';
  return 'local';
}

export function modelName(p: Provider): string {
  if (p === 'anthropic') return process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
  if (p === 'openai') return process.env.OPENAI_MODEL || 'gpt-4o-mini';
  return 'demo';
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export function buildSystemPrompt(context: unknown): string {
  return `Ты — личный AI-помощник в приложении Lumina (Life OS для женщин 25–45 лет). Помогаешь планировать жизнь: задачи, календарь, привычки, цели, заметки и сферы жизни (health, career, money, relationships, family, selfcare, home, growth).

Стиль: по-русски, тепло, спокойно и по делу, без морализаторства. Коротко: 2–6 предложений или короткий список. Не выдумывай данные, которых нет в контексте. Ты не врач и не финансовый консультант — по медицине и финансам давай общие ориентиры и советуй обращаться к специалисту.

Ты ОБЯЗАН ответить одним JSON-объектом, без пояснений вокруг и без markdown-обёртки:
{"reply": "текст ответа пользователю", "actions": [ ... ]}

Допустимые действия в "actions" (используй, только когда пользователь просит что-то добавить/изменить, либо когда ты предлагаешь план и пользователь просил его составить):
- {"type":"add_task","title":"...","date":"YYYY-MM-DD или null","time":"HH:MM или null","areaId":"<сфера>","priority":"high|normal|low"}
- {"type":"add_event","title":"...","date":"YYYY-MM-DD","time":"HH:MM или null","areaId":"<сфера>"}
- {"type":"add_note","text":"..."}
- {"type":"schedule_task","taskId":"<id существующей задачи>","date":"YYYY-MM-DD"}
- {"type":"add_goal_steps","goalId":"<id существующей цели>","steps":["шаг 1","шаг 2"]}

Правила: даты считай от today из контекста. Если пользователь просит лишь совет или анализ — "actions" пустой массив []. Не создавай дубликаты уже существующих задач. Сообщи в "reply", что именно ты сделала.

Контекст пользователя (JSON):
${JSON.stringify(context).slice(0, 18000)}`;
}

const TIMEOUT_MS = 30000;

async function callAnthropic(system: string, turns: ChatTurn[]): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY as string,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: modelName('anthropic'), max_tokens: 1500, system, messages: turns }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return (data.content ?? []).map((c: { text?: string }) => c.text ?? '').join('');
}

async function callOpenAI(system: string, turns: ChatTurn[]): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: modelName('openai'),
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, ...turns],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

export async function callLLM(provider: Provider, system: string, turns: ChatTurn[]): Promise<string> {
  if (provider === 'anthropic') return callAnthropic(system, turns);
  if (provider === 'openai') return callOpenAI(system, turns);
  throw new Error('Провайдер не настроен');
}

/** Достаём JSON из ответа модели, даже если она добавила лишний текст. */
export function extractJson(text: string): { reply?: unknown; actions?: unknown } | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}
