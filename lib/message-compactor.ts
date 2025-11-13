import type { Message } from './types';

/**
 * Configuration for message compaction
 */
export interface CompactionConfig {
  /** Number of first messages to keep (after system prompt) */
  keepFirstMessages?: number;
  /** Number of last messages to keep */
  keepLastMessages?: number;
  /** Minimum messages needed before compaction triggers */
  minMessagesForCompaction?: number;
}

/**
 * Result of compaction operation
 */
export interface CompactionResult {
  /** Compacted messages array */
  messages: Message[];
  /** Summary that was created */
  summary: string;
  /** Number of messages that were compacted */
  compactedCount: number;
  /** Number of messages kept */
  keptCount: number;
  /** Original messages that were compacted (for preview/undo) */
  originalMessages: Message[];
}

/**
 * Default compaction configuration
 */
const DEFAULT_CONFIG: Required<CompactionConfig> = {
  keepFirstMessages: 2,
  keepLastMessages: 15,
  minMessagesForCompaction: 2, // Минимум 2 сообщения для сжатия
};

/**
 * Check if messages need compaction based on count
 */
export function shouldCompactByCount(
  messages: Message[],
  config: CompactionConfig = {}
): boolean {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const totalToKeep = cfg.keepFirstMessages + cfg.keepLastMessages;

  return (
    messages.length >= cfg.minMessagesForCompaction &&
    messages.length > totalToKeep
  );
}

/**
 * Determine which messages will be compacted and which will be kept
 */
export function getCompactionPlan(
  messages: Message[],
  config: CompactionConfig = {}
): {
  toCompact: Message[];
  firstToKeep: Message[];
  lastToKeep: Message[];
} {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (!shouldCompactByCount(messages, config)) {
    return {
      toCompact: [],
      firstToKeep: messages.slice(0, cfg.keepFirstMessages),
      lastToKeep: messages.slice(-cfg.keepLastMessages),
    };
  }

  const firstToKeep = messages.slice(0, cfg.keepFirstMessages);
  const lastToKeep = messages.slice(-cfg.keepLastMessages);
  const toCompact = messages.slice(
    cfg.keepFirstMessages,
    messages.length - cfg.keepLastMessages
  );

  return {
    toCompact,
    firstToKeep,
    lastToKeep,
  };
}

/**
 * Format messages for summarization prompt
 */
export function formatMessagesForSummary(messages: Message[]): string {
  return messages
    .map((msg, idx) => {
      const role = msg.role === 'user' ? 'Пользователь' : 'Ассистент';
      return `[${idx + 1}] ${role}: ${msg.content}`;
    })
    .join('\n\n');
}

/**
 * Get summarization prompt for LLM
 */
export function getSummarizationPrompt(messages: Message[]): string {
  const formattedMessages = formatMessagesForSummary(messages);

  return `Создай информативное резюме всей истории диалога. Это резюме будет единственным контекстом для продолжения работы, поэтому сохрани всю критически важную информацию.

${formattedMessages}

ВАЖНО: Резюме должно позволить AI продолжить работу без потери ключевого контекста. Включи:

1. **Тема и задачи**: О чем диалог, какие задачи ставились
2. **Что выполнено**: Конкретные действия, результаты, решения
3. **Детали реализации** (для технических задач):
   - Структура проекта (какие папки/файлы созданы или изменены)
   - Архитектура и ключевые компоненты (что за что отвечает)
   - Используемые технологии, библиотеки, паттерны
   - API endpoints, функции, методы
   - Важные настройки и конфигурации
4. **Контекст задачи** (для нетехнических задач):
   - Принятые решения и обоснования
   - Важные факты, данные, источники
   - Договоренности и ограничения
5. **Текущее состояние**: Что работает, что осталось сделать, известные проблемы
6. **Для продолжения**: Что нужно знать для следующих шагов

Формат резюме:
📋 **Резюме диалога**

**Тема:** [краткое описание]

**Выполнено:**
- [действие 1 с деталями]
- [действие 2 с деталями]

**Структура/Архитектура** (если применимо):
- [файл/компонент]: назначение
- [ключевая функция]: что делает

**Текущий статус:**
- ✅ Готово: [что работает]
- ⏳ Осталось: [что нужно доделать]

**Контекст:** [критически важные детали для продолжения]

Будь информативным, но структурированным. Используй списки. Ответь только резюме.`;
}

/**
 * Compact messages locally without API call (creates a placeholder summary)
 * Useful for preview or when summarization API is not available
 */
export function compactMessagesLocal(
  messages: Message[],
  config: CompactionConfig = {}
): CompactionResult {
  const plan = getCompactionPlan(messages, config);

  if (plan.toCompact.length === 0) {
    return {
      messages: [...messages],
      summary: '',
      compactedCount: 0,
      keptCount: messages.length,
      originalMessages: [],
    };
  }

  // Create a simple summary without API
  const summary = `[Сжато ${plan.toCompact.length} сообщений из предыдущей части диалога]`;

  // Build compacted message array
  const compactedMessages: Message[] = [
    ...plan.firstToKeep,
    {
      role: 'system' as const,
      content: summary,
    },
    ...plan.lastToKeep,
  ];

  return {
    messages: compactedMessages,
    summary,
    compactedCount: plan.toCompact.length,
    keptCount: plan.firstToKeep.length + plan.lastToKeep.length,
    originalMessages: plan.toCompact,
  };
}

/**
 * Apply a summary to messages (used after getting summary from API)
 * Replaces ALL messages with a single summary message
 */
export function applyCompactionSummary(
  messages: Message[],
  summary: string,
  config: CompactionConfig = {}
): CompactionResult {
  if (messages.length === 0) {
    return {
      messages: [],
      summary: '',
      compactedCount: 0,
      keptCount: 0,
      originalMessages: [],
    };
  }

  // Replace all messages with a single summary message
  const compactedMessages: Message[] = [
    {
      role: 'assistant' as const,
      content: summary,
    },
  ];

  return {
    messages: compactedMessages,
    summary,
    compactedCount: messages.length,
    keptCount: 0,
    originalMessages: messages,
  };
}

/**
 * Get preview text for compaction operation
 */
export function getCompactionPreview(
  messages: Message[],
  config: CompactionConfig = {}
): string {
  if (messages.length === 0) {
    return 'Нет сообщений для сжатия';
  }

  return `
Текущее количество сообщений: ${messages.length}
После сжатия: 1 сообщение (резюме)
Все сообщения будут заменены кратким резюме диалога
  `.trim();
}
