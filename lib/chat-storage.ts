import { Message } from './types';

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'querylane.chats';
const CURRENT_CHAT_KEY = 'querylane.currentChatId';

/**
 * Генерировать заголовок чата из первого сообщения
 */
function generateTitle(messages: Message[]): string {
  const firstUserMessage = messages.find(m => m.role === 'user');
  if (!firstUserMessage) {
    return 'Новый чат';
  }

  const content = firstUserMessage.content.trim();
  // Берём первые 50 символов или до конца предложения
  const truncated = content.length > 50 ? content.slice(0, 50) + '...' : content;
  return truncated;
}

/**
 * Получить все чаты
 */
export function getAllChats(): Chat[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const chats: Chat[] = JSON.parse(data);
    // Сортируем по дате обновления (новые сверху)
    return chats.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error('Ошибка при загрузке чатов:', error);
    return [];
  }
}

/**
 * Получить чат по ID
 */
export function getChatById(id: string): Chat | null {
  const chats = getAllChats();
  return chats.find(chat => chat.id === id) || null;
}

/**
 * Сохранить чаты
 */
function saveChats(chats: Chat[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  } catch (error) {
    console.error('Ошибка при сохранении чатов:', error);
  }
}

/**
 * Создать новый чат
 */
export function createChat(messages: Message[] = []): Chat {
  const chat: Chat = {
    id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    title: messages.length > 0 ? generateTitle(messages) : 'Новый чат',
    messages,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const chats = getAllChats();
  chats.push(chat);
  saveChats(chats);
  setCurrentChatId(chat.id);

  return chat;
}

/**
 * Обновить чат
 */
export function updateChat(id: string, updates: Partial<Omit<Chat, 'id' | 'createdAt'>>): void {
  const chats = getAllChats();
  const index = chats.findIndex(chat => chat.id === id);

  if (index === -1) return;

  chats[index] = {
    ...chats[index],
    ...updates,
    updatedAt: Date.now(),
  };

  // Автоматически обновляем заголовок если есть сообщения
  if (updates.messages && chats[index].title === 'Новый чат') {
    chats[index].title = generateTitle(updates.messages);
  }

  saveChats(chats);
}

/**
 * Переименовать чат
 */
export function renameChat(id: string, title: string): void {
  updateChat(id, { title });
}

/**
 * Удалить чат
 */
export function deleteChat(id: string): void {
  const chats = getAllChats();
  const filtered = chats.filter(chat => chat.id !== id);
  saveChats(filtered);

  // Если удалили текущий чат, сбрасываем
  if (getCurrentChatId() === id) {
    clearCurrentChatId();
  }
}

/**
 * Получить ID текущего чата
 */
export function getCurrentChatId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CURRENT_CHAT_KEY);
}

/**
 * Установить текущий чат
 */
export function setCurrentChatId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CURRENT_CHAT_KEY, id);
}

/**
 * Очистить текущий чат
 */
export function clearCurrentChatId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CURRENT_CHAT_KEY);
}

/**
 * Получить или создать текущий чат
 */
export function getCurrentOrCreateChat(): Chat {
  const currentId = getCurrentChatId();

  if (currentId) {
    const chat = getChatById(currentId);
    if (chat) return chat;
  }

  // Если текущего чата нет, создаём новый
  return createChat();
}

/**
 * Удалить все чаты (для очистки)
 */
export function deleteAllChats(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CURRENT_CHAT_KEY);
}

/**
 * Экспортировать чат в JSON
 */
export function exportChat(id: string): string | null {
  const chat = getChatById(id);
  if (!chat) return null;

  return JSON.stringify(chat, null, 2);
}

/**
 * Импортировать чат из JSON
 */
export function importChat(jsonData: string): Chat | null {
  try {
    const chat: Chat = JSON.parse(jsonData);

    // Валидация
    if (!chat.id || !chat.title || !Array.isArray(chat.messages)) {
      throw new Error('Неверный формат чата');
    }

    // Создаём новый ID чтобы избежать конфликтов
    chat.id = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    chat.createdAt = Date.now();
    chat.updatedAt = Date.now();

    const chats = getAllChats();
    chats.push(chat);
    saveChats(chats);

    return chat;
  } catch (error) {
    console.error('Ошибка при импорте чата:', error);
    return null;
  }
}
