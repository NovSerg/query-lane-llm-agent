import { Message } from './types';

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

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
export async function getAllChats(): Promise<Chat[]> {
  if (typeof window === 'undefined') return [];

  try {
    const response = await fetch('/api/storage/chats');
    if (!response.ok) return [];

    const data = await response.json();
    return data.chats || [];
  } catch (error) {
    console.error('Error fetching chats:', error);
    return [];
  }
}

/**
 * Получить чат по ID
 */
export async function getChatById(id: string): Promise<Chat | null> {
  if (typeof window === 'undefined') return null;

  try {
    const response = await fetch(`/api/storage/chats/${id}`);
    if (!response.ok) return null;

    const data = await response.json();
    return data.chat || null;
  } catch (error) {
    console.error('Error fetching chat:', error);
    return null;
  }
}

/**
 * Создать новый чат
 */
export async function createChat(messages: Message[] = []): Promise<Chat> {
  const chat: Chat = {
    id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    title: messages.length > 0 ? generateTitle(messages) : 'Новый чат',
    messages,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  try {
    const response = await fetch('/api/storage/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chat),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to create chat:', errorText);
      throw new Error('Failed to create chat');
    }

    const data = await response.json();
    await setCurrentChatId(data.chat.id);

    return data.chat;
  } catch (error) {
    console.error('Error creating chat:', error);
    throw error;
  }
}

/**
 * Обновить чат
 */
export async function updateChat(id: string, updates: Partial<Omit<Chat, 'id' | 'createdAt'>>): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // Автоматически обновляем заголовок если есть сообщения
    const finalUpdates = { ...updates };
    if (updates.messages) {
      const chat = await getChatById(id);
      if (chat && chat.title === 'Новый чат') {
        finalUpdates.title = generateTitle(updates.messages);
      }
    }

    const response = await fetch(`/api/storage/chats/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalUpdates),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to update chat:', errorText);
    }
  } catch (error) {
    console.error('Error updating chat:', error);
  }
}

/**
 * Переименовать чат
 */
export async function renameChat(id: string, title: string): Promise<void> {
  await updateChat(id, { title });
}

/**
 * Удалить чат
 */
export async function deleteChat(id: string): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const response = await fetch(`/api/storage/chats/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to delete chat:', errorText);
      return;
    }

    // Проверяем, был ли это текущий чат
    const currentId = await getCurrentChatId();
    if (currentId === id) {
      await clearCurrentChatId();
    }
  } catch (error) {
    console.error('Error deleting chat:', error);
  }
}

/**
 * Получить ID текущего чата
 */
export async function getCurrentChatId(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  try {
    const response = await fetch('/api/storage/settings');
    if (!response.ok) return null;

    const data = await response.json();
    return data.settings.currentChatId || null;
  } catch (error) {
    console.error('Error fetching current chat ID:', error);
    return null;
  }
}

/**
 * Установить текущий чат
 */
export async function setCurrentChatId(id: string): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    await fetch('/api/storage/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentChatId: id }),
    });
  } catch (error) {
    console.error('Error setting current chat ID:', error);
  }
}

/**
 * Очистить текущий чат
 */
export async function clearCurrentChatId(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    await fetch('/api/storage/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentChatId: null }),
    });
  } catch (error) {
    console.error('Error clearing current chat ID:', error);
  }
}

/**
 * Получить или создать текущий чат
 */
export async function getCurrentOrCreateChat(): Promise<Chat> {
  const currentId = await getCurrentChatId();

  if (currentId) {
    const chat = await getChatById(currentId);
    if (chat) return chat;
  }

  // Если текущего чата нет, создаём новый
  return await createChat();
}

/**
 * Удалить все чаты (для очистки)
 */
export async function deleteAllChats(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    await fetch('/api/storage/chats', {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Error deleting all chats:', error);
  }
}

/**
 * Экспортировать чат в JSON
 */
export async function exportChat(id: string): Promise<string | null> {
  const chat = await getChatById(id);
  if (!chat) return null;

  return JSON.stringify(chat, null, 2);
}

/**
 * Импортировать чат из JSON
 */
export async function importChat(jsonData: string): Promise<Chat | null> {
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

    const response = await fetch('/api/storage/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chat),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to import chat:', errorText);
      return null;
    }

    const data = await response.json();
    return data.chat;
  } catch (error) {
    console.error('Error importing chat:', error);
    return null;
  }
}
