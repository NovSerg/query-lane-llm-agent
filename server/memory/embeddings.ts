/**
 * Embedding Generator Module
 * Uses Xenova/transformers.js with all-MiniLM-L6-v2 model
 * Generates 384-dimensional vectors for semantic search
 */

import { pipeline, env } from '@xenova/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.allowRemoteModels = true;

/**
 * Embedding generator with model caching
 */
export class EmbeddingGenerator {
  private static instance: EmbeddingGenerator | null = null;
  private model: any = null;
  private modelName: string = 'Xenova/all-MiniLM-L6-v2';
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): EmbeddingGenerator {
    if (!EmbeddingGenerator.instance) {
      EmbeddingGenerator.instance = new EmbeddingGenerator();
    }
    return EmbeddingGenerator.instance;
  }

  /**
   * Initialize model (lazy loading)
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        console.log('[EmbeddingGenerator] Initializing model:', this.modelName);
        const startTime = Date.now();

        this.model = await pipeline('feature-extraction', this.modelName);

        const loadTime = Date.now() - startTime;
        console.log(`[EmbeddingGenerator] Model loaded in ${loadTime}ms`);

        this.isInitialized = true;
      } catch (error) {
        console.error('[EmbeddingGenerator] Initialization error:', error);
        this.initPromise = null;
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Generate embedding for text
   * Returns 384-dimensional normalized vector
   */
  async embed(text: string): Promise<number[]> {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      // Truncate text if too long (BERT max is 512 tokens ≈ 2000 chars)
      const truncated = text.slice(0, 2000);

      // Generate embedding
      const output = await this.model(truncated, {
        pooling: 'mean', // Mean pooling over token embeddings
        normalize: true,  // L2 normalization for cosine similarity
      });

      // Convert to regular array
      const vector = Array.from(output.data) as number[];

      // Validate dimensions
      if (vector.length !== 384) {
        throw new Error(`Expected 384 dimensions, got ${vector.length}`);
      }

      return vector;
    } catch (error) {
      console.error('[EmbeddingGenerator] Embed error:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts (batch)
   * More efficient than calling embed() multiple times
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      // Truncate all texts
      const truncated = texts.map(t => t.slice(0, 2000));

      // Generate embeddings
      const output = await this.model(truncated, {
        pooling: 'mean',
        normalize: true,
      });

      // Convert to array of arrays
      const vectors: number[][] = [];
      const data = Array.from(output.data) as number[];
      const dim = 384;

      for (let i = 0; i < texts.length; i++) {
        const start = i * dim;
        const end = start + dim;
        vectors.push(data.slice(start, end));
      }

      return vectors;
    } catch (error) {
      console.error('[EmbeddingGenerator] Batch embed error:', error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   * Returns value between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite)
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Find most similar texts to query
   */
  async findSimilar(
    query: string,
    candidates: string[],
    topK: number = 5
  ): Promise<Array<{ text: string; similarity: number; index: number }>> {
    // Generate all embeddings
    const queryVector = await this.embed(query);
    const candidateVectors = await this.embedBatch(candidates);

    // Calculate similarities
    const results = candidates.map((text, index) => ({
      text,
      index,
      similarity: this.cosineSimilarity(queryVector, candidateVectors[index]),
    }));

    // Sort by similarity (descending) and take top K
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Get model info
   */
  getModelInfo(): { name: string; dimensions: number; maxTokens: number } {
    return {
      name: this.modelName,
      dimensions: 384,
      maxTokens: 512,
    };
  }

  /**
   * Reset model (for testing)
   */
  reset(): void {
    this.model = null;
    this.isInitialized = false;
    this.initPromise = null;
  }
}

// Export singleton instance
export const embeddingGenerator = EmbeddingGenerator.getInstance();

/**
 * Helper: Calculate similarity percentage
 */
export function similarityToPercentage(similarity: number): number {
  // Cosine similarity ranges from -1 to 1
  // Convert to 0-100 scale
  return Math.round(((similarity + 1) / 2) * 100);
}

/**
 * Helper: Classify similarity level
 */
export function classifySimilarity(similarity: number): 'high' | 'medium' | 'low' {
  if (similarity >= 0.7) return 'high';
  if (similarity >= 0.4) return 'medium';
  return 'low';
}
