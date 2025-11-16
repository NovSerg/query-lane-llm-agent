import { promises as fs } from 'fs';
import path from 'path';
import { Chat } from '@/lib/chat-storage';
import { Agent } from '@/lib/types';

// Путь к директории данных
const DATA_DIR = path.join(process.cwd(), 'data');

// Пути к файлам
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');
const AGENTS_FILE = path.join(DATA_DIR, 'agents.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

interface Settings {
  currentChatId: string | null;
  activeAgentId: string | null;
}

/**
 * Ensure data directory exists
 */
async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    // Directory already exists or error creating
  }
}

/**
 * Read JSON file with error handling
 */
async function readJSON<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist or parse error - return default
    return defaultValue;
  }
}

/**
 * Write JSON file with atomic write
 */
async function writeJSON<T>(filePath: string, data: T): Promise<void> {
  await ensureDataDir();

  const tempFile = `${filePath}.tmp`;
  const content = JSON.stringify(data, null, 2);

  // Write to temp file first
  await fs.writeFile(tempFile, content, 'utf-8');

  // Atomic rename
  await fs.rename(tempFile, filePath);
}

// ============= CHATS =============

export async function getAllChats(): Promise<Chat[]> {
  const chats = await readJSON<Chat[]>(CHATS_FILE, []);
  // Сортируем по дате обновления (новые сверху)
  return chats.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getChatById(id: string): Promise<Chat | null> {
  const chats = await getAllChats();
  return chats.find(chat => chat.id === id) || null;
}

export async function saveChats(chats: Chat[]): Promise<void> {
  await writeJSON(CHATS_FILE, chats);
}

export async function createChat(chat: Chat): Promise<Chat> {
  const chats = await getAllChats();
  chats.push(chat);
  await saveChats(chats);
  return chat;
}

export async function updateChat(id: string, updates: Partial<Omit<Chat, 'id' | 'createdAt'>>): Promise<boolean> {
  const chats = await getAllChats();
  const index = chats.findIndex(chat => chat.id === id);

  if (index === -1) return false;

  chats[index] = {
    ...chats[index],
    ...updates,
    updatedAt: Date.now(),
  };

  await saveChats(chats);
  return true;
}

export async function deleteChat(id: string): Promise<boolean> {
  const chats = await getAllChats();
  const filtered = chats.filter(chat => chat.id !== id);

  if (filtered.length === chats.length) {
    return false; // Chat not found
  }

  await saveChats(filtered);

  // Если удалили текущий чат, сбрасываем
  const settings = await getSettings();
  if (settings.currentChatId === id) {
    await setCurrentChatId(null);
  }

  return true;
}

export async function deleteAllChats(): Promise<void> {
  await writeJSON(CHATS_FILE, []);
  await setCurrentChatId(null);
}

// ============= AGENTS =============

export async function getAllAgents(): Promise<Agent[]> {
  return await readJSON<Agent[]>(AGENTS_FILE, []);
}

export async function getAgentById(id: string): Promise<Agent | null> {
  const agents = await getAllAgents();
  return agents.find(agent => agent.id === id) || null;
}

export async function saveAgents(agents: Agent[]): Promise<void> {
  await writeJSON(AGENTS_FILE, agents);
}

export async function createAgent(agent: Agent): Promise<Agent> {
  const agents = await getAllAgents();
  agents.push(agent);
  await saveAgents(agents);
  return agent;
}

export async function updateAgent(id: string, updates: Partial<Agent>): Promise<boolean> {
  const agents = await getAllAgents();
  const index = agents.findIndex(agent => agent.id === id);

  if (index === -1) return false;

  agents[index] = {
    ...agents[index],
    ...updates,
    id: agents[index].id, // Prevent ID change
    createdAt: agents[index].createdAt, // Preserve creation time
    updatedAt: Date.now(),
  };

  await saveAgents(agents);
  return true;
}

export async function deleteAgent(id: string): Promise<boolean> {
  const agents = await getAllAgents();
  const filtered = agents.filter(agent => agent.id !== id);

  // Prevent deleting all agents
  if (filtered.length === 0) {
    return false;
  }

  if (filtered.length === agents.length) {
    return false; // Agent not found
  }

  await saveAgents(filtered);

  // If deleted agent was active, set first agent as active
  const settings = await getSettings();
  if (settings.activeAgentId === id) {
    await setActiveAgentId(filtered[0].id);
  }

  return true;
}

// ============= SETTINGS =============

export async function getSettings(): Promise<Settings> {
  return await readJSON<Settings>(SETTINGS_FILE, {
    currentChatId: null,
    activeAgentId: null,
  });
}

export async function getCurrentChatId(): Promise<string | null> {
  const settings = await getSettings();
  return settings.currentChatId;
}

export async function setCurrentChatId(id: string | null): Promise<void> {
  const settings = await getSettings();
  settings.currentChatId = id;
  await writeJSON(SETTINGS_FILE, settings);
}

export async function getActiveAgentId(): Promise<string | null> {
  const settings = await getSettings();
  return settings.activeAgentId;
}

export async function setActiveAgentId(id: string | null): Promise<void> {
  const settings = await getSettings();
  settings.activeAgentId = id;
  await writeJSON(SETTINGS_FILE, settings);
}
