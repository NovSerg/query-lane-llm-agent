import { Agent } from './types';
import { getReasoningPrompt } from './reasoning-modes';

/**
 * Default agents - experimental and reasoning modes
 */
function getDefaultAgents(): Agent[] {
  return [
    // Experimental agent for testing temperature settings
    {
      id: 'experimental_temp',
      name: '🔬 Лаборатория температур',
      description: 'Агент для экспериментов с temperature (БЕЗ seed для разнообразия)',
      model: 'glm-4.5-flash',
      provider: 'zai',
      systemPrompt: 'Ты полезный AI-ассистент.',
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
    // Reasoning modes agents
    {
      id: 'reasoning_direct',
      name: '⚡ Прямой ответ',
      description: 'Быстрый и лаконичный ответ без детального анализа',
      model: 'glm-4.5-flash',
      provider: 'zai',
      systemPrompt: getReasoningPrompt('direct'),
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
      id: 'reasoning_cot',
      name: '🧩 Пошаговое рассуждение',
      description: 'Детальный анализ с объяснением каждого шага (Chain-of-Thought)',
      model: 'glm-4.5',
      provider: 'zai',
      systemPrompt: getReasoningPrompt('chain-of-thought'),
      parameters: {
        temperature: 0.5,
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
      id: 'reasoning_meta',
      name: '🎯 Мета-промптинг',
      description: 'Создает оптимальный промпт для другого LLM',
      model: 'glm-4.5',
      provider: 'zai',
      systemPrompt: getReasoningPrompt('meta-prompting'),
      parameters: {
        temperature: 0.6,
        max_tokens: 5000,
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
      id: 'reasoning_panel',
      name: '👥 Экспертная панель',
      description: 'Несколько виртуальных экспертов обсуждают решение',
      model: 'glm-4.5',
      provider: 'zai',
      systemPrompt: getReasoningPrompt('expert-panel'),
      parameters: {
        temperature: 0.7,
        max_tokens: 5000,
      },
      formatConfig: {
        format: 'text',
        systemPrompt: '',
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
async function initializeStorage(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const agents = await agentStorage.getAll();
    if (agents.length === 0) {
      const defaults = getDefaultAgents();
      await agentStorage.saveAll(defaults);
      await agentStorage.setActiveAgent(defaults[0].id);
    }
  } catch (error) {
    console.error('Failed to initialize agent storage:', error);
  }
}

export const agentStorage = {
  /**
   * Get all agents
   */
  async getAll(): Promise<Agent[]> {
    if (typeof window === 'undefined') return [];

    try {
      const response = await fetch('/api/storage/agents');
      if (!response.ok) return getDefaultAgents();

      const data = await response.json();
      return data.agents || getDefaultAgents();
    } catch (error) {
      console.error('Error fetching agents:', error);
      return getDefaultAgents();
    }
  },

  /**
   * Get agent by ID
   */
  async getById(id: string): Promise<Agent | undefined> {
    if (typeof window === 'undefined') return undefined;

    try {
      const response = await fetch(`/api/storage/agents/${id}`);
      if (!response.ok) return undefined;

      const data = await response.json();
      return data.agent;
    } catch (error) {
      console.error('Error fetching agent:', error);
      return undefined;
    }
  },

  /**
   * Save new agent
   */
  async save(agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>): Promise<Agent> {
    if (typeof window === 'undefined') {
      throw new Error('Cannot save in SSR');
    }

    const newAgent: Agent = {
      ...agent,
      id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      const response = await fetch('/api/storage/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgent),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to save agent:', errorText);
        throw new Error('Failed to save agent');
      }

      const data = await response.json();
      return data.agent;
    } catch (error) {
      console.error('Error saving agent:', error);
      throw error;
    }
  },

  /**
   * Update existing agent
   */
  async update(id: string, updates: Partial<Agent>): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    try {
      const response = await fetch(`/api/storage/agents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      return response.ok;
    } catch (error) {
      console.error('Error updating agent:', error);
      return false;
    }
  },

  /**
   * Delete an agent
   */
  async delete(id: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    try {
      const response = await fetch(`/api/storage/agents/${id}`, {
        method: 'DELETE',
      });

      return response.ok;
    } catch (error) {
      console.error('Error deleting agent:', error);
      return false;
    }
  },

  /**
   * Save all agents to storage
   */
  async saveAll(agents: Agent[]): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const response = await fetch('/api/storage/agents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agents),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to save agents:', errorText);
      }
    } catch (error) {
      console.error('Error saving all agents:', error);
    }
  },

  /**
   * Get active agent ID
   */
  async getActiveAgentId(): Promise<string | null> {
    if (typeof window === 'undefined') return null;

    try {
      const response = await fetch('/api/storage/settings');
      if (!response.ok) return null;

      const data = await response.json();
      return data.settings.activeAgentId || null;
    } catch (error) {
      console.error('Error fetching active agent ID:', error);
      return null;
    }
  },

  /**
   * Get active agent
   */
  async getActiveAgent(): Promise<Agent | null> {
    const id = await this.getActiveAgentId();
    if (!id) return null;

    const agent = await this.getById(id);
    if (!agent) {
      // If stored agent doesn't exist, use first available
      const all = await this.getAll();
      if (all.length > 0) {
        await this.setActiveAgent(all[0].id);
        return all[0];
      }
      return null;
    }

    return agent;
  },

  /**
   * Set active agent
   */
  async setActiveAgent(id: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const agent = await this.getById(id);
    if (!agent) return false;

    try {
      await fetch('/api/storage/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeAgentId: id }),
      });
      return true;
    } catch (error) {
      console.error('Error setting active agent:', error);
      return false;
    }
  },

  /**
   * Duplicate an agent
   */
  async duplicate(id: string): Promise<Agent | null> {
    const original = await this.getById(id);
    if (!original) return null;

    try {
      const duplicate = await this.save({
        name: `${original.name} (Копия)`,
        description: original.description,
        model: original.model,
        provider: original.provider,
        systemPrompt: original.systemPrompt,
        parameters: { ...original.parameters },
        formatConfig: { ...original.formatConfig },
      });

      return duplicate;
    } catch (error) {
      console.error('Error duplicating agent:', error);
      return null;
    }
  },

  /**
   * Export agents to JSON
   */
  async exportToJSON(): Promise<string> {
    const agents = await this.getAll();
    return JSON.stringify(agents, null, 2);
  },

  /**
   * Import agents from JSON
   */
  async importFromJSON(jsonString: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    try {
      const imported = JSON.parse(jsonString) as Agent[];

      if (!Array.isArray(imported)) {
        return false;
      }

      const existing = await this.getAll();
      const merged = [...existing, ...imported];

      // Remove duplicates by ID
      const unique = Array.from(
        new Map(merged.map(item => [item.id, item])).values()
      );

      await this.saveAll(unique);
      return true;
    } catch (error) {
      console.error('Error importing agents:', error);
      return false;
    }
  },

  /**
   * Search agents by name or description
   */
  async search(query: string): Promise<Agent[]> {
    const lowerQuery = query.toLowerCase();
    const all = await this.getAll();
    return all.filter(
      a =>
        a.name.toLowerCase().includes(lowerQuery) ||
        a.description?.toLowerCase().includes(lowerQuery)
    );
  },

  /**
   * Get agents by provider
   */
  async getByProvider(provider: 'zai' | 'openrouter'): Promise<Agent[]> {
    const all = await this.getAll();
    return all.filter(a => a.provider === provider);
  },

  /**
   * Get agents by model
   */
  async getByModel(model: string): Promise<Agent[]> {
    const all = await this.getAll();
    return all.filter(a => a.model === model);
  },

  /**
   * Reset to default agents
   */
  async resetToDefaults(): Promise<void> {
    if (typeof window === 'undefined') return;

    const defaults = getDefaultAgents();
    await this.saveAll(defaults);
    await this.setActiveAgent(defaults[0].id);
  },

  /**
   * Add missing default agents (useful for updates)
   * Only adds agents that don't exist yet
   */
  async addMissingDefaults(): Promise<number> {
    if (typeof window === 'undefined') return 0;

    const existing = await this.getAll();
    const existingIds = new Set(existing.map(a => a.id));
    const defaults = getDefaultAgents();

    const missing = defaults.filter(agent => !existingIds.has(agent.id));

    if (missing.length > 0) {
      const updated = [...existing, ...missing];
      await this.saveAll(updated);
    }

    return missing.length;
  },

  /**
   * Check if reasoning mode agents are available
   */
  async hasReasoningModes(): Promise<boolean> {
    const agents = await this.getAll();
    return agents.some(a => a.id.startsWith('reasoning_'));
  },

  /**
   * Initialize storage (ensure defaults exist)
   */
  async initialize(): Promise<void> {
    await initializeStorage();
  },
};
