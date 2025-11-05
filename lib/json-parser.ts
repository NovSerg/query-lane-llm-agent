import { z, ZodSchema } from 'zod';
import { ParsedResponse, ValidationMode, OutputFormat } from './types';
import { processXMLResponse } from './xml-parser';

/**
 * Extracts JSON from text that might contain markdown code blocks or extra text
 * @param {string} text - Raw text potentially containing JSON
 * @returns {string | null} Extracted JSON string or null
 */
export function extractJSON(text: string): string | null {
  if (!text || text.trim() === '') {
    return null;
  }

  // Try 1: Direct JSON parse (fastest path)
  try {
    JSON.parse(text.trim());
    return text.trim();
  } catch {
    // Continue to extraction methods
  }

  // Try 2: Extract from markdown code blocks
  const codeBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?```/;
  const codeBlockMatch = text.match(codeBlockRegex);
  if (codeBlockMatch) {
    try {
      JSON.parse(codeBlockMatch[1].trim());
      return codeBlockMatch[1].trim();
    } catch {
      // Continue
    }
  }

  // Try 3: Find JSON object/array in text
  const jsonPatterns = [
    /\{[\s\S]*\}/,  // Object
    /\[[\s\S]*\]/,  // Array
  ];

  for (const pattern of jsonPatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        JSON.parse(match[0]);
        return match[0];
      } catch {
        // Continue
      }
    }
  }

  // Try 4: Clean and extract between first { and last }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const extracted = text.substring(firstBrace, lastBrace + 1);
    try {
      JSON.parse(extracted);
      return extracted;
    } catch {
      // Continue
    }
  }

  // Try 5: Same for arrays
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');

  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const extracted = text.substring(firstBracket, lastBracket + 1);
    try {
      JSON.parse(extracted);
      return extracted;
    } catch {
      // Failed all attempts
    }
  }

  return null;
}

/**
 * Cleans JSON string by removing common issues
 * @param {string} jsonString - JSON string to clean
 * @returns {string} Cleaned JSON string
 */
export function cleanJSONString(jsonString: string): string {
  let cleaned = jsonString.trim();

  // Remove BOM
  if (cleaned.charCodeAt(0) === 0xFEFF) {
    cleaned = cleaned.slice(1);
  }

  // Remove trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

  // Fix unescaped quotes in strings (basic attempt)
  // This is a simple heuristic and might not work for all cases

  return cleaned;
}

/**
 * Parses JSON string with error handling
 * @param {string} text - Text to parse
 * @returns {unknown | null} Parsed object or null
 */
export function parseJSON(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch (error) {
    // Try cleaning first
    try {
      const cleaned = cleanJSONString(text);
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}

/**
 * Validates parsed response against a schema
 * @param {unknown} data - Data to validate
 * @param {ZodSchema<T>} schema - Zod schema for validation
 * @returns {T | null} Validated data or null
 */
export function validateResponse<T>(
  data: unknown,
  schema: ZodSchema<T>
): T | null {
  try {
    return schema.parse(data);
  } catch {
    return null;
  }
}

/**
 * Validates parsed response with safe parsing
 * @param {unknown} data - Data to validate
 * @param {ZodSchema<T>} schema - Zod schema for validation
 * @returns {z.SafeParseReturnType<unknown, T>} Safe parse result
 */
export function safeValidateResponse<T>(
  data: unknown,
  schema: ZodSchema<T>
): z.SafeParseReturnType<unknown, T> {
  return schema.safeParse(data);
}

/**
 * Universal response processor for all formats
 * @param {string} text - Raw text from LLM
 * @param {OutputFormat} format - Expected format type
 * @param {ValidationMode} mode - Validation mode
 * @returns {ParsedResponse} Parsed response with metadata
 */
export function processResponse(
  text: string,
  format: OutputFormat,
  mode: ValidationMode = 'lenient'
): ParsedResponse {
  switch (format) {
    case 'json':
      return processLLMResponse(text, undefined, mode);
    case 'xml':
      return processXMLResponse(text, mode);
    case 'text':
    case 'custom':
    default:
      return {
        data: { text },
        isValid: true,
        rawContent: text,
        format,
      };
  }
}

/**
 * Complete parsing pipeline: extract -> parse -> validate
 * @param {string} text - Raw text from LLM
 * @param {Record<string, unknown>} schemaDefinition - Schema definition (optional)
 * @param {ValidationMode} mode - Validation mode
 * @returns {ParsedResponse} Parsed response with metadata
 */
export function processLLMResponse(
  text: string,
  schemaDefinition?: Record<string, unknown>,
  mode: ValidationMode = 'lenient'
): ParsedResponse {
  // Extract JSON
  const extracted = extractJSON(text);

  if (!extracted) {
    if (mode === 'fallback') {
      // Return text as-is in fallback mode
      return {
        data: { text },
        isValid: false,
        rawContent: text,
      };
    }

    return {
      data: null,
      isValid: false,
      rawContent: text,
    };
  }

  // Parse JSON
  const parsed = parseJSON(extracted);

  if (!parsed) {
    if (mode === 'fallback') {
      return {
        data: { text },
        isValid: false,
        rawContent: text,
      };
    }

    return {
      data: null,
      isValid: false,
      rawContent: text,
    };
  }

  // If no schema provided, return parsed data
  if (!schemaDefinition) {
    return {
      data: parsed,
      isValid: true,
      rawContent: text,
      format: 'json',
    };
  }

  // Create Zod schema from definition (basic implementation)
  // For now, we'll just validate that all required keys exist
  const requiredKeys = Object.keys(schemaDefinition);
  const parsedObj = parsed as Record<string, unknown>;

  const hasAllKeys = requiredKeys.every(key => key in parsedObj);

  if (mode === 'strict' && !hasAllKeys) {
    return {
      data: null,
      isValid: false,
      rawContent: text,
      schema: JSON.stringify(schemaDefinition),
      format: 'json',
    };
  }

  return {
    data: parsed,
    isValid: hasAllKeys,
    rawContent: text,
    schema: JSON.stringify(schemaDefinition),
    format: 'json',
  };
}

/**
 * Attempts to fix common JSON issues in lenient mode
 * @param {string} jsonString - Potentially malformed JSON
 * @returns {unknown | null} Fixed and parsed JSON or null
 */
export function attemptJSONFix(jsonString: string): unknown | null {
  const fixes = [
    // Original
    (s: string) => s,
    // Clean with utility
    (s: string) => cleanJSONString(s),
    // Add missing closing braces
    (s: string) => {
      const openBraces = (s.match(/\{/g) || []).length;
      const closeBraces = (s.match(/\}/g) || []).length;
      return s + '}'.repeat(Math.max(0, openBraces - closeBraces));
    },
    // Add missing closing brackets
    (s: string) => {
      const openBrackets = (s.match(/\[/g) || []).length;
      const closeBrackets = (s.match(/\]/g) || []).length;
      return s + ']'.repeat(Math.max(0, openBrackets - closeBrackets));
    },
  ];

  for (const fix of fixes) {
    try {
      const fixed = fix(jsonString);
      return JSON.parse(fixed);
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Checks if text contains valid JSON
 * @param {string} text - Text to check
 * @returns {boolean} True if contains valid JSON
 */
export function containsJSON(text: string): boolean {
  return extractJSON(text) !== null;
}

/**
 * Extracts multiple JSON objects from text
 * @param {string} text - Text potentially containing multiple JSON objects
 * @returns {unknown[]} Array of parsed JSON objects
 */
export function extractMultipleJSON(text: string): unknown[] {
  const results: unknown[] = [];

  // Split by newlines and try to parse each line
  const lines = text.split('\n');

  for (const line of lines) {
    const extracted = extractJSON(line);
    if (extracted) {
      const parsed = parseJSON(extracted);
      if (parsed) {
        results.push(parsed);
      }
    }
  }

  // If nothing found, try to find all {} and [] patterns
  if (results.length === 0) {
    const objectRegex = /\{[^{}]*\}/g;
    const matches = text.match(objectRegex);

    if (matches) {
      for (const match of matches) {
        const parsed = parseJSON(match);
        if (parsed) {
          results.push(parsed);
        }
      }
    }
  }

  return results;
}
