// Клиентская часть AI: сначала пробуем настоящий AI через /api/ai,
// если он не подключён или недоступен — используем встроенный демо-режим.
import { buildContext } from './ai-context';
import { localAssistant, localBreakdown } from './assistant-local';
import { sanitizeActions } from './actions';
import type { AppState, AssistantAction, ChatMessage, Goal } from './types';

export interface AskResult {
  reply: string;
  actions: AssistantAction[];
  source: 'llm' | 'local';
}

async function callApi(messages: { role: string; text: string }[], state: AppState, today: string): Promise<AskResult | null> {
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages, context: buildContext(state, today) }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.fallback || typeof data.reply !== 'string') return null;
    return { reply: data.reply, actions: sanitizeActions(data.actions), source: 'llm' };
  } catch {
    return null;
  }
}

export async function askAssistant(history: ChatMessage[], state: AppState, today: string): Promise<AskResult> {
  const messages = history.slice(-12).map((m) => ({ role: m.role, text: m.text }));
  const viaApi = await callApi(messages, state, today);
  if (viaApi) return viaApi;
  const last = [...history].reverse().find((m) => m.role === 'user')?.text ?? '';
  return { ...localAssistant(last, state, today), source: 'local' };
}

/** «Разбить цель на шаги» — через AI, а без него — по шаблону. */
export async function breakDownGoal(goal: Goal, state: AppState, today: string): Promise<{ steps: string[]; source: 'llm' | 'local' }> {
  const prompt = `Разбей мою цель «${goal.title}» (${goal.description || 'без описания'}, срок: ${goal.deadline ?? 'не задан'}) на 4–6 конкретных коротких шагов. Верни одно действие add_goal_steps с goalId "${goal.id}". Не дублируй уже существующие шаги.`;
  const viaApi = await callApi([{ role: 'user', text: prompt }], state, today);
  const steps = viaApi?.actions.find((a): a is Extract<AssistantAction, { type: 'add_goal_steps' }> => a.type === 'add_goal_steps')?.steps;
  if (steps?.length) return { steps, source: 'llm' };
  return { steps: localBreakdown(goal.title), source: 'local' };
}
