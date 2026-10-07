// Быстрая проверка парсера Quick Add: npm test
import assert from 'node:assert/strict';
import { classifyNote, parseQuickAdd } from '../lib/parser';

// «Сегодня» для тестов — среда, 7 октября 2026
const NOW = new Date(2026, 9, 7, 12, 0);
let passed = 0;
function t(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log('  ✓', name);
  } catch (e) {
    console.error('  ✗', name);
    throw e;
  }
}

t('Маникюр завтра в 16:00 → событие', () => {
  const p = parseQuickAdd('Маникюр завтра в 16:00', NOW);
  assert.equal(p.kind, 'event');
  assert.equal(p.date, '2026-10-08');
  assert.equal(p.time, '16:00');
  assert.equal(p.title, 'Маникюр');
  assert.equal(p.areaId, 'selfcare');
});

t('встреча с врачом в пятницу → событие на пятницу', () => {
  const p = parseQuickAdd('встреча с врачом в пятницу', NOW);
  assert.equal(p.kind, 'event');
  assert.equal(p.date, '2026-10-09');
  assert.equal(p.time, null);
  assert.equal(p.areaId, 'health');
});

t('Купить подарок маме 15 октября → задача, семья', () => {
  const p = parseQuickAdd('Купить подарок маме 15 октября', NOW);
  assert.equal(p.kind, 'task');
  assert.equal(p.date, '2026-10-15');
  assert.equal(p.areaId, 'family');
  assert.equal(p.title, 'Купить подарок маме');
});

t('Каждый понедельник планёрка в 10:00 → повтор раз в неделю', () => {
  const p = parseQuickAdd('Каждый понедельник планёрка в 10:00', NOW);
  assert.equal(p.repeat, 'weekly');
  assert.equal(p.date, '2026-10-12');
  assert.equal(p.time, '10:00');
  assert.equal(p.kind, 'task');
});

t('позвонить маме в 18:00 срочно → задача с напоминанием', () => {
  const p = parseQuickAdd('позвонить маме в 18:00 срочно', NOW);
  assert.equal(p.kind, 'task');
  assert.equal(p.time, '18:00');
  assert.equal(p.priority, 'high');
});

t('идея: запустить подкаст → заметка', () => {
  const p = parseQuickAdd('идея: запустить подкаст', NOW);
  assert.equal(p.kind, 'note');
  assert.equal(p.title, 'Запустить подкаст');
});

t('через 3 дня оплатить интернет → задача на 10 октября', () => {
  const p = parseQuickAdd('через 3 дня оплатить интернет', NOW);
  assert.equal(p.date, '2026-10-10');
  assert.equal(p.areaId, 'money');
});

t('в 9 вечера йога послезавтра → 21:00, 9 октября', () => {
  const p = parseQuickAdd('в 9 вечера йога послезавтра', NOW);
  assert.equal(p.time, '21:00');
  assert.equal(p.date, '2026-10-09');
});

t('12.11 стоматолог в 10.30 → числовая дата и время', () => {
  const p = parseQuickAdd('стоматолог 12.11 в 10.30', NOW);
  assert.equal(p.date, '2026-11-12');
  assert.equal(p.time, '10:30');
});

t('classifyNote', () => {
  assert.equal(classifyNote('Хочу выучить испанский до лета', NOW), 'goal');
  assert.equal(classifyNote('Позвонить в сервис по поводу стиральной машины', NOW), 'task');
  assert.equal(classifyNote('Идея: воскресный ритуал планирования', NOW), 'idea');
  assert.equal(classifyNote('Красивое слово: умиротворение', NOW), 'note');
});

console.log(`\nГотово: ${passed} проверок пройдено`);
