import { Agent } from './types';

const STORAGE_KEY = 'querylane.agents.v1';
const ACTIVE_AGENT_KEY = 'querylane.active-agent.v1';

/**
 * Default agents created on first use
 */
function getDefaultAgents(): Agent[] {
  return [
    {
      id: 'default_general',
      name: 'Общий помощник',
      description: 'Универсальный ассистент для разных задач',
      model: 'glm-4.5-flash',
      provider: 'zai',
      systemPrompt: 'Ты полезный AI-ассистент. Отвечай кратко и по существу.',
      parameters: {
        temperature: 0.7,
        max_tokens: 2000,
      },
      formatConfig: {
        format: 'text',
        systemPrompt: '',
        validationMode: 'lenient',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'default_coder',
      name: 'Программист',
      description: 'Специализация на написании и анализе кода',
      model: 'glm-4.5',
      provider: 'zai',
      systemPrompt: 'Ты опытный программист. Пиши чистый, эффективный код с комментариями. Используй лучшие практики.',
      parameters: {
        temperature: 0.3,
        max_tokens: 4000,
      },
      formatConfig: {
        format: 'text',
        systemPrompt: '',
        validationMode: 'lenient',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'default_analyst',
      name: 'Аналитик данных',
      description: 'Анализ данных и структурированные ответы в JSON',
      model: 'glm-4.5',
      provider: 'zai',
      systemPrompt: 'Ты аналитик данных. Анализируй информацию глубоко и предоставляй структурированные ответы.',
      parameters: {
        temperature: 0.5,
        max_tokens: 3000,
      },
      formatConfig: {
        format: 'json',
        systemPrompt: 'Всегда отвечай в формате JSON. Структурируй данные логично.',
        validationMode: 'lenient',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];
}

/**
 * Initialize storage with default agents if empty
 */
function initializeStorage(): void {
  if (typeof window === 'undefined') return;

  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      const defaults = getDefaultAgents();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));

      // Set first agent as active by default
      localStorage.setItem(ACTIVE_AGENT_KEY, defaults[0].id);
    }
  } catch (error) {
    console.error('Failed to initialize agent storage:', error);
  }
}

// Initialize on module load
if (typeof window !== 'undefined') {
  initializeStorage();
}

export const agentStorage = {
  /**
   * Get all agents
   */
  getAll(): Agent[] {
    if (typeof window === 'undefined') return [];

    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : getDefaultAgents();
    } catch {
      return getDefaultAgents();
    }
  },

  /**
   * Get agent by ID
   */
  getById(id: string): Agent | undefined {
    return this.getAll().find(a => a.id === id);
  },

  /**
   * Save new agent
   */
  save(agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>): Agent {
    if (typeof window === 'undefined') {
      throw new Error('Cannot save in SSR');
    }

    const existing = this.getAll();
    const newAgent: Agent = {
      ...agent,
      id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [...existing, newAgent];
    this.saveAll(updated);

    return newAgent;
  },

  /**
   * Update existing agent
   */
  update(id: string, updates: Partial<Agent>): boolean {
    if (typeof window === 'undefined') return false;

    const agents = this.getAll();
    const index = agents.findIndex(a => a.id === id);

    if (index === -1) return false;

    agents[index] = {
      ...agents[index],
      ...updates,
      id: agents[index].id, // Prevent ID change
      createdAt: agents[index].createdAt, // Preserve creation time
      updatedAt: Date.now(),
    };

    this.saveAll(agents);
    return true;
  },

  /**
   * Delete an agent
   */
  delete(id: string): boolean {
    if (typeof window === 'undefined') return false;

    const agents = this.getAll();
    const filtered = agents.filter(a => a.id !== id);

    // Prevent deleting all agents
    if (filtered.length === 0) {
      console.warn('Cannot delete last agent');
      return false;
    }

    // If deleted agent was active, set first agent as active
    const activeId = this.getActiveAgentId();
    if (activeId === id) {
      this.setActiveAgent(filtered[0].id);
    }

    this.saveAll(filtered);
    return true;
  },

  /**
   * Save all agents to storage
   */
  saveAll(agents: Agent[]): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
    } catch (error) {
      console.error('Failed to save agents:', error);
    }
  },

  /**
   * Get active agent ID
   */
  getActiveAgentId(): string | null {
    if (typeof window === 'undefined') return null;

    try {
      return localStorage.getItem(ACTIVE_AGENT_KEY);
    } catch {
      return null;
    }
  },

  /**
   * Get active agent
   */
  getActiveAgent(): Agent | null {
    const id = this.getActiveAgentId();
    if (!id) return null;

    const agent = this.getById(id);
    if (!agent) {
      // If stored agent doesn't exist, use first available
      const all = this.getAll();
      if (all.length > 0) {
        this.setActiveAgent(all[0].id);
        return all[0];
      }
      return null;
    }

    return agent;
  },

  /**
   * Set active agent
   */
  setActiveAgent(id: string): boolean {
    if (typeof window === 'undefined') return false;

    const agent = this.getById(id);
    if (!agent) return false;

    try {
      localStorage.setItem(ACTIVE_AGENT_KEY, id);
      return true;
    } catch (error) {
      console.error('Failed to set active agent:', error);
      return false;
    }
  },

  /**
   * Duplicate an agent
   */
  duplicate(id: string): Agent | null {
    const original = this.getById(id);
    if (!original) return null;

    const duplicate = this.save({
      name: `${original.name} (Копия)`,
      description: original.description,
      model: original.model,
      provider: original.provider,
      systemPrompt: original.systemPrompt,
      parameters: { ...original.parameters },
      formatConfig: { ...original.formatConfig },
    });

    return duplicate;
  },

  /**
   * Export agents to JSON
   */
  exportToJSON(): string {
    const agents = this.getAll();
    return JSON.stringify(agents, null, 2);
  },

  /**
   * Import agents from JSON
   */
  importFromJSON(jsonString: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const imported = JSON.parse(jsonString) as Agent[];

      if (!Array.isArray(imported)) {
        return false;
      }

      const existing = this.getAll();
      const merged = [...existing, ...imported];

      // Remove duplicates by ID
      const unique = Array.from(
        new Map(merged.map(item => [item.id, item])).values()
      );

      this.saveAll(unique);
      return true;
    } catch (error) {
      console.error('Failed to import agents:', error);
      return false;
    }
  },

  /**
   * Search agents by name or description
   */
  search(query: string): Agent[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(
      a =>
        a.name.toLowerCase().includes(lowerQuery) ||
        a.description?.toLowerCase().includes(lowerQuery)
    );
  },

  /**
   * Get agents by provider
   */
  getByProvider(provider: 'zai' | 'openrouter'): Agent[] {
    return this.getAll().filter(a => a.provider === provider);
  },

  /**
   * Get agents by model
   */
  getByModel(model: string): Agent[] {
    return this.getAll().filter(a => a.model === model);
  },

  /**
   * Reset to default agents
   */
  resetToDefaults(): void {
    if (typeof window === 'undefined') return;

    const defaults = getDefaultAgents();
    this.saveAll(defaults);
    this.setActiveAgent(defaults[0].id);
  },
};
