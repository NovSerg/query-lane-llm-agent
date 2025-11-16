/**
 * External Memory System Tests
 * Tests persistence, embedding generation, and semantic search
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorage } from '@/server/memory/memory-storage';
import { embeddingGenerator } from '@/server/memory/embeddings';

describe('Memory Storage', () => {
  let storage: MemoryStorage;

  beforeEach(async () => {
    // Use test instance
    storage = MemoryStorage.getInstance({
      filePath: './data/memory.test.json',
      backupPath: './data/memory.test.backup.json',
      cacheEnabled: false, // Disable cache for testing
    });

    await storage.init();
  });

  it('should create and persist chat', async () => {
    const chat = await storage.createChat('Test Chat', 'agent_test', [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ]);

    expect(chat.id).toBeDefined();
    expect(chat.title).toBe('Test Chat');
    expect(chat.messages).toHaveLength(2);

    // Reload and verify persistence
    const loaded = await storage.getChat(chat.id);
    expect(loaded).toBeDefined();
    expect(loaded?.title).toBe('Test Chat');
  });

  it('should list chats sorted by update time', async () => {
    await storage.createChat('Chat 1', 'agent_1', []);
    await new Promise(resolve => setTimeout(resolve, 10));
    await storage.createChat('Chat 2', 'agent_1', []);
    await new Promise(resolve => setTimeout(resolve, 10));
    await storage.createChat('Chat 3', 'agent_1', []);

    const chats = await storage.listChats();
    expect(chats).toHaveLength(3);
    expect(chats[0].title).toBe('Chat 3'); // Newest first
  });

  it('should update chat messages', async () => {
    const chat = await storage.createChat('Update Test', 'agent_1', []);

    await storage.updateChat(chat.id, {
      messages: [
        { role: 'user', content: 'New message' },
      ],
    });

    const updated = await storage.getChat(chat.id);
    expect(updated?.messages).toHaveLength(1);
    expect(updated?.metadata.messageCount).toBe(1);
  });

  it('should delete chat and associated embeddings', async () => {
    const chat = await storage.createChat('Delete Test', 'agent_1', []);

    // Add embedding
    await storage.addEmbedding({
      chatId: chat.id,
      messageIndex: 0,
      role: 'user',
      text: 'Test',
      vector: new Array(384).fill(0),
    });

    // Delete chat
    await storage.deleteChat(chat.id);

    const deleted = await storage.getChat(chat.id);
    expect(deleted).toBeNull();

    // Embeddings should also be deleted
    const embeddings = await storage.getChatEmbeddings(chat.id);
    expect(embeddings).toHaveLength(0);
  });

  it('should calculate chat metadata correctly', async () => {
    const chat = await storage.createChat('Metadata Test', 'agent_1', [
      {
        role: 'user',
        content: 'Hello',
        metadata: {
          inputTokens: 10,
          outputTokens: 0,
          cost: 0,
        },
      },
      {
        role: 'assistant',
        content: 'Hi',
        metadata: {
          inputTokens: 0,
          outputTokens: 20,
          cost: 0.001,
          model: 'test-model',
        },
      },
    ]);

    expect(chat.metadata.messageCount).toBe(2);
    expect(chat.metadata.totalInputTokens).toBe(10);
    expect(chat.metadata.totalOutputTokens).toBe(20);
    expect(chat.metadata.totalTokens).toBe(30);
    expect(chat.metadata.totalCost).toBe(0.001);
    expect(chat.metadata.lastModel).toBe('test-model');
  });

  it('should get statistics', async () => {
    await storage.createChat('Stats Test', 'agent_1', [
      { role: 'user', content: 'Test' },
    ]);

    const stats = await storage.getStats();

    expect(stats.totalChats).toBeGreaterThan(0);
    expect(stats.fileSize).toBeGreaterThan(0);
    expect(stats.lastUpdated).toBeGreaterThan(0);
  });
});

describe('Embedding Generator', () => {
  beforeEach(async () => {
    await embeddingGenerator.init();
  });

  it('should generate 384-dimensional vector', async () => {
    const vector = await embeddingGenerator.embed('Test message');

    expect(vector).toHaveLength(384);
    expect(vector.every(v => typeof v === 'number')).toBe(true);
  });

  it('should generate normalized vectors', async () => {
    const vector = await embeddingGenerator.embed('Normalized test');

    // Calculate L2 norm (should be ≈1 for normalized vectors)
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));

    expect(norm).toBeCloseTo(1, 2);
  });

  it('should calculate cosine similarity', () => {
    const v1 = [1, 0, 0];
    const v2 = [1, 0, 0];
    const v3 = [0, 1, 0];

    expect(embeddingGenerator.cosineSimilarity(v1, v2)).toBeCloseTo(1, 5);
    expect(embeddingGenerator.cosineSimilarity(v1, v3)).toBeCloseTo(0, 5);
  });

  it('should find similar texts', async () => {
    const query = 'What is machine learning?';
    const candidates = [
      'Machine learning is a type of artificial intelligence',
      'The weather is nice today',
      'Neural networks are used in deep learning',
      'I like pizza',
    ];

    const results = await embeddingGenerator.findSimilar(query, candidates, 2);

    expect(results).toHaveLength(2);
    expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
    // First result should be about ML/AI
    expect(results[0].text).toContain('Machine learning');
  });
});

describe('Semantic Search', () => {
  let storage: MemoryStorage;

  beforeEach(async () => {
    storage = MemoryStorage.getInstance({
      filePath: './data/memory.test.json',
      cacheEnabled: false,
    });

    await storage.init();
    await embeddingGenerator.init();
  });

  it('should search by vector similarity', async () => {
    const chat = await storage.createChat('Search Test', 'agent_1', []);

    // Add messages with embeddings
    const messages = [
      'How do I learn Python programming?',
      'What is the weather forecast?',
      'Best Python tutorials for beginners',
    ];

    for (let i = 0; i < messages.length; i++) {
      const vector = await embeddingGenerator.embed(messages[i]);
      await storage.addEmbedding({
        chatId: chat.id,
        messageIndex: i,
        role: 'user',
        text: messages[i],
        vector,
      });
    }

    // Search for Python-related content
    const queryVector = await embeddingGenerator.embed('Python programming guide');
    const results = await storage.searchByVector(queryVector, 2, 0.3);

    expect(results).toHaveLength(2);
    // Both Python-related messages should rank higher than weather
    expect(results[0].text).toMatch(/Python/);
    expect(results[1].text).toMatch(/Python/);
  });

  it('should filter search by chatId', async () => {
    const chat1 = await storage.createChat('Chat 1', 'agent_1', []);
    const chat2 = await storage.createChat('Chat 2', 'agent_1', []);

    const vector1 = await embeddingGenerator.embed('Message in chat 1');
    const vector2 = await embeddingGenerator.embed('Message in chat 2');

    await storage.addEmbedding({
      chatId: chat1.id,
      messageIndex: 0,
      role: 'user',
      text: 'Message in chat 1',
      vector: vector1,
    });

    await storage.addEmbedding({
      chatId: chat2.id,
      messageIndex: 0,
      role: 'user',
      text: 'Message in chat 2',
      vector: vector2,
    });

    // Search only in chat1
    const queryVector = await embeddingGenerator.embed('Message');
    const results = await storage.searchByVector(queryVector, 10, 0, chat1.id);

    expect(results.every(r => r.chatId === chat1.id)).toBe(true);
  });
});
