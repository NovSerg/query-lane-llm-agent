import { FormatTemplate } from './types';

/**
 * Predefined format templates for common use cases
 */
export const FORMAT_TEMPLATES: FormatTemplate[] = [
  // ========== ANALYSIS TEMPLATES ==========
  {
    id: 'text-analysis',
    name: 'Text Analysis',
    description: 'Analyze text for sentiment, keywords, and summary',
    format: 'json',
    category: 'analysis',
    schema: {
      summary: 'string - Brief summary of the text',
      sentiment: 'string - positive|negative|neutral',
      keywords: 'array - Key terms and phrases',
      main_topics: 'array - Main topics discussed',
      confidence: 'number - Confidence score 0-1',
    },
    systemPrompt: `You are a text analysis assistant. Analyze the provided text and return ONLY valid JSON in this exact format:

{
  "summary": "brief summary of the text",
  "sentiment": "positive|negative|neutral",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "main_topics": ["topic1", "topic2"],
  "confidence": 0.95
}

Rules:
- Return ONLY the JSON object
- No markdown code blocks
- No explanatory text outside JSON
- Ensure all fields are present`,
    exampleInput: 'The product is amazing! Best purchase I made this year.',
    exampleOutput: `{
  "summary": "Highly positive product review",
  "sentiment": "positive",
  "keywords": ["amazing", "best purchase", "year"],
  "main_topics": ["product review", "satisfaction"],
  "confidence": 0.98
}`,
  },

  {
    id: 'qa-extraction',
    name: 'Q&A Extraction',
    description: 'Extract question, answer, and follow-up questions',
    format: 'json',
    category: 'extraction',
    schema: {
      question: 'string - The original question',
      answer: 'string - The answer',
      follow_up_questions: 'array - Related follow-up questions',
      sources: 'array - Sources or references (if any)',
    },
    systemPrompt: `You are a Q&A assistant. For any question asked, provide ONLY valid JSON in this format:

{
  "question": "the original question",
  "answer": "detailed answer",
  "follow_up_questions": ["related question 1", "related question 2"],
  "sources": ["source1", "source2"]
}

Rules:
- Return ONLY the JSON object
- No markdown code blocks
- Provide comprehensive answers
- Suggest 2-3 relevant follow-up questions`,
    exampleInput: 'What is machine learning?',
    exampleOutput: `{
  "question": "What is machine learning?",
  "answer": "Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed.",
  "follow_up_questions": [
    "What are the main types of machine learning?",
    "How does supervised learning differ from unsupervised learning?",
    "What are common applications of machine learning?"
  ],
  "sources": []
}`,
  },

  // ========== CODE GENERATION TEMPLATES ==========
  {
    id: 'code-generation',
    name: 'Code Generation',
    description: 'Generate code with explanation and dependencies',
    format: 'json',
    category: 'generation',
    schema: {
      language: 'string - Programming language',
      code: 'string - The generated code',
      explanation: 'string - What the code does',
      dependencies: 'array - Required libraries/packages',
      usage_example: 'string - How to use the code',
    },
    systemPrompt: `You are a coding assistant. Generate code and return ONLY valid JSON in this format:

{
  "language": "programming language name",
  "code": "the complete code",
  "explanation": "detailed explanation of what the code does",
  "dependencies": ["dependency1", "dependency2"],
  "usage_example": "example of how to use this code"
}

Rules:
- Return ONLY the JSON object
- Use proper escaping for code strings
- Include all necessary imports in the code
- Provide clear, working code`,
    exampleInput: 'Create a function to validate email addresses in JavaScript',
    exampleOutput: `{
  "language": "javascript",
  "code": "function validateEmail(email) {\\n  const regex = /^[^\\\\s@]+@[^\\\\s@]+\\\\.[^\\\\s@]+$/;\\n  return regex.test(email);\\n}",
  "explanation": "This function validates email addresses using a regular expression that checks for the basic email format: local@domain.extension",
  "dependencies": [],
  "usage_example": "const isValid = validateEmail('user@example.com'); // returns true"
}`,
  },

  {
    id: 'api-design',
    name: 'API Design',
    description: 'Design REST API endpoints with request/response schemas',
    format: 'json',
    category: 'generation',
    schema: {
      endpoint: 'string - API endpoint path',
      method: 'string - HTTP method',
      description: 'string - What this endpoint does',
      request_schema: 'object - Request body schema',
      response_schema: 'object - Response schema',
      example_request: 'object - Example request',
      example_response: 'object - Example response',
    },
    systemPrompt: `You are an API design assistant. Design REST API endpoints and return ONLY valid JSON in this format:

{
  "endpoint": "/api/resource",
  "method": "GET|POST|PUT|DELETE",
  "description": "what this endpoint does",
  "request_schema": {},
  "response_schema": {},
  "example_request": {},
  "example_response": {}
}

Rules:
- Return ONLY the JSON object
- Follow REST best practices
- Include proper HTTP status codes in examples`,
    exampleInput: 'Design an endpoint to create a new user',
    exampleOutput: `{
  "endpoint": "/api/users",
  "method": "POST",
  "description": "Create a new user account",
  "request_schema": {
    "email": "string (required)",
    "password": "string (required, min 8 chars)",
    "name": "string (required)"
  },
  "response_schema": {
    "id": "string",
    "email": "string",
    "name": "string",
    "created_at": "timestamp"
  },
  "example_request": {
    "email": "user@example.com",
    "password": "securepass123",
    "name": "John Doe"
  },
  "example_response": {
    "id": "usr_12345",
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2025-01-05T10:30:00Z"
  }
}`,
  },

  // ========== EXTRACTION TEMPLATES ==========
  {
    id: 'data-extraction',
    name: 'Data Extraction',
    description: 'Extract structured data from unstructured text',
    format: 'json',
    category: 'extraction',
    schema: {
      entities: 'array - Extracted entities',
      dates: 'array - Dates mentioned',
      locations: 'array - Locations mentioned',
      numbers: 'array - Important numbers/metrics',
      extracted_data: 'object - Key-value pairs of extracted information',
    },
    systemPrompt: `You are a data extraction assistant. Extract structured information from text and return ONLY valid JSON:

{
  "entities": ["person/org names"],
  "dates": ["dates found"],
  "locations": ["places mentioned"],
  "numbers": ["important metrics"],
  "extracted_data": {
    "key": "value"
  }
}

Rules:
- Return ONLY the JSON object
- Extract all relevant information
- Normalize dates to ISO format if possible`,
    exampleInput: 'Apple Inc. announced Q4 revenue of $90 billion on January 5, 2025 in Cupertino.',
    exampleOutput: `{
  "entities": ["Apple Inc."],
  "dates": ["2025-01-05"],
  "locations": ["Cupertino"],
  "numbers": ["90 billion"],
  "extracted_data": {
    "company": "Apple Inc.",
    "event": "Q4 revenue announcement",
    "revenue": "$90 billion",
    "quarter": "Q4",
    "date": "2025-01-05",
    "location": "Cupertino"
  }
}`,
  },

  {
    id: 'intent-classification',
    name: 'Intent Classification',
    description: 'Classify user intent and extract parameters',
    format: 'json',
    category: 'analysis',
    schema: {
      intent: 'string - The classified intent',
      confidence: 'number - Confidence score 0-1',
      parameters: 'object - Extracted parameters',
      suggested_action: 'string - What action to take',
    },
    systemPrompt: `You are an intent classification assistant. Classify user intent and return ONLY valid JSON:

{
  "intent": "intent_name",
  "confidence": 0.95,
  "parameters": {
    "param1": "value1"
  },
  "suggested_action": "what to do next"
}

Rules:
- Return ONLY the JSON object
- Use snake_case for intent names
- Extract all relevant parameters`,
    exampleInput: 'Book a flight to Paris for next Monday',
    exampleOutput: `{
  "intent": "book_flight",
  "confidence": 0.98,
  "parameters": {
    "destination": "Paris",
    "date": "next Monday",
    "travel_type": "flight"
  },
  "suggested_action": "Show available flights to Paris for the specified date"
}`,
  },

  // ========== CUSTOM TEMPLATES ==========
  {
    id: 'comparison',
    name: 'Comparison Analysis',
    description: 'Compare multiple items across different criteria',
    format: 'json',
    category: 'analysis',
    schema: {
      items: 'array - Items being compared',
      criteria: 'array - Comparison criteria',
      comparison: 'object - Detailed comparison',
      recommendation: 'string - Which option is best and why',
    },
    systemPrompt: `You are a comparison assistant. Compare items and return ONLY valid JSON:

{
  "items": ["item1", "item2"],
  "criteria": ["criterion1", "criterion2"],
  "comparison": {
    "item1": {
      "criterion1": "value",
      "criterion2": "value"
    },
    "item2": {
      "criterion1": "value",
      "criterion2": "value"
    }
  },
  "recommendation": "detailed recommendation with reasoning"
}

Rules:
- Return ONLY the JSON object
- Provide objective comparisons
- Give clear recommendations`,
  },

  {
    id: 'task-breakdown',
    name: 'Task Breakdown',
    description: 'Break down complex tasks into actionable steps',
    format: 'json',
    category: 'generation',
    schema: {
      task: 'string - The main task',
      complexity: 'string - low|medium|high',
      estimated_time: 'string - Time estimate',
      steps: 'array - Ordered steps to complete the task',
      prerequisites: 'array - What is needed before starting',
      potential_issues: 'array - Things to watch out for',
    },
    systemPrompt: `You are a task planning assistant. Break down tasks and return ONLY valid JSON:

{
  "task": "the main task",
  "complexity": "low|medium|high",
  "estimated_time": "time estimate",
  "steps": [
    {
      "order": 1,
      "description": "step description",
      "duration": "estimated duration"
    }
  ],
  "prerequisites": ["prerequisite1"],
  "potential_issues": ["issue1"]
}

Rules:
- Return ONLY the JSON object
- Order steps logically
- Be specific and actionable`,
  },

  {
    id: 'simple-json',
    name: 'Simple JSON',
    description: 'Basic JSON response for custom use',
    format: 'json',
    category: 'custom',
    schema: {
      result: 'any - The main result',
      metadata: 'object - Additional information',
    },
    systemPrompt: `Return your response as valid JSON only. Use this structure:

{
  "result": "your main response here",
  "metadata": {
    "additional": "information"
  }
}

Rules:
- Return ONLY valid JSON
- No markdown code blocks
- No explanatory text outside JSON`,
  },
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): FormatTemplate | undefined {
  return FORMAT_TEMPLATES.find(t => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: FormatTemplate['category']
): FormatTemplate[] {
  return FORMAT_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get all template categories
 */
export function getTemplateCategories(): string[] {
  return Array.from(new Set(FORMAT_TEMPLATES.map(t => t.category || 'custom')));
}

/**
 * Generate system prompt from template
 */
export function generateSystemPrompt(template: FormatTemplate): string {
  return template.systemPrompt;
}

/**
 * Generate system prompt from custom schema
 */
export function generateCustomSystemPrompt(
  schema: Record<string, unknown>,
  instructions?: string
): string {
  const schemaStr = JSON.stringify(schema, null, 2);

  return `You are a helpful assistant. Return your response as valid JSON following this schema:

${schemaStr}

${instructions || 'Provide accurate and detailed information.'}

Rules:
- Return ONLY valid JSON matching the schema
- No markdown code blocks
- No explanatory text outside JSON
- Ensure all required fields are present`;
}
