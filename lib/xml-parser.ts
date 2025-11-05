import { ParsedResponse, ValidationMode } from './types';

/**
 * Extracts XML from text that might contain markdown code blocks or extra text
 * @param {string} text - Raw text potentially containing XML
 * @returns {string | null} Extracted XML string or null
 */
export function extractXML(text: string): string | null {
  if (!text || text.trim() === '') {
    return null;
  }

  // Try 1: Direct XML parse check
  if (looksLikeXML(text.trim())) {
    return text.trim();
  }

  // Try 2: Extract from markdown code blocks
  const codeBlockRegex = /```(?:xml)?\s*\n?([\s\S]*?)\n?```/;
  const codeBlockMatch = text.match(codeBlockRegex);
  if (codeBlockMatch) {
    const extracted = codeBlockMatch[1].trim();
    if (looksLikeXML(extracted)) {
      return extracted;
    }
  }

  // Try 3: Find XML in text (between < and >)
  const xmlPattern = /<\?xml[\s\S]*?\?>[\s\S]*?<\/\w+>|<\w+[\s\S]*?<\/\w+>/;
  const match = text.match(xmlPattern);
  if (match && looksLikeXML(match[0])) {
    return match[0];
  }

  // Try 4: Find any tag-like structure
  const firstTag = text.indexOf('<');
  const lastTag = text.lastIndexOf('>');

  if (firstTag !== -1 && lastTag !== -1 && lastTag > firstTag) {
    const extracted = text.substring(firstTag, lastTag + 1);
    if (looksLikeXML(extracted)) {
      return extracted;
    }
  }

  return null;
}

/**
 * Checks if text looks like XML
 */
function looksLikeXML(text: string): boolean {
  const trimmed = text.trim();
  return (
    (trimmed.startsWith('<') && trimmed.endsWith('>')) ||
    trimmed.includes('<?xml')
  );
}

/**
 * Simple XML to JSON converter
 * @param {string} xmlString - XML string to parse
 * @returns {unknown | null} Parsed object or null
 */
export function parseXML(xmlString: string): unknown | null {
  try {
    // Basic XML parsing (simple implementation)
    // For production, consider using a library like fast-xml-parser

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      return null;
    }

    // Convert XML to JSON-like structure
    const result = xmlToJson(xmlDoc.documentElement);
    return result;
  } catch (error) {
    console.error('XML parsing error:', error);
    return null;
  }
}

/**
 * Converts XML node to JSON object
 */
function xmlToJson(xml: Element): any {
  const obj: any = {};

  // Handle attributes
  if (xml.attributes && xml.attributes.length > 0) {
    obj['@attributes'] = {};
    for (let i = 0; i < xml.attributes.length; i++) {
      const attr = xml.attributes[i];
      obj['@attributes'][attr.nodeName] = attr.nodeValue;
    }
  }

  // Handle child nodes
  if (xml.hasChildNodes()) {
    for (let i = 0; i < xml.childNodes.length; i++) {
      const child = xml.childNodes[i];

      if (child.nodeType === 1) {
        // Element node
        const nodeName = child.nodeName;

        if (typeof obj[nodeName] === 'undefined') {
          obj[nodeName] = xmlToJson(child as Element);
        } else {
          if (!Array.isArray(obj[nodeName])) {
            const old = obj[nodeName];
            obj[nodeName] = [old];
          }
          obj[nodeName].push(xmlToJson(child as Element));
        }
      } else if (child.nodeType === 3) {
        // Text node
        const text = child.nodeValue?.trim();
        if (text) {
          if (Object.keys(obj).length === 0) {
            return text;
          }
          obj['#text'] = text;
        }
      } else if (child.nodeType === 4) {
        // CDATA node
        obj['#cdata'] = child.nodeValue;
      }
    }
  }

  return obj;
}

/**
 * Validates XML structure
 */
export function validateXML(xmlString: string): boolean {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    const parserError = xmlDoc.querySelector('parsererror');
    return !parserError;
  } catch {
    return false;
  }
}

/**
 * Process XML response from LLM
 */
export function processXMLResponse(
  text: string,
  validationMode: ValidationMode = 'lenient'
): ParsedResponse {
  // Extract XML
  const extracted = extractXML(text);

  if (!extracted) {
    if (validationMode === 'fallback') {
      return {
        data: { text },
        isValid: false,
        rawContent: text,
        format: 'xml',
      };
    }

    return {
      data: null,
      isValid: false,
      rawContent: text,
      format: 'xml',
    };
  }

  // Validate XML
  const isValid = validateXML(extracted);

  if (!isValid) {
    if (validationMode === 'fallback') {
      return {
        data: { text: extracted },
        isValid: false,
        rawContent: text,
        format: 'xml',
      };
    }

    return {
      data: null,
      isValid: false,
      rawContent: text,
      format: 'xml',
    };
  }

  // Parse XML to JSON
  const parsed = parseXML(extracted);

  if (!parsed) {
    return {
      data: null,
      isValid: false,
      rawContent: text,
      format: 'xml',
    };
  }

  return {
    data: parsed,
    isValid: true,
    rawContent: text,
    format: 'xml',
  };
}

/**
 * Checks if text contains valid XML
 */
export function containsXML(text: string): boolean {
  return extractXML(text) !== null;
}

/**
 * Formats XML string with indentation
 */
export function formatXML(xmlString: string): string {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    const serializer = new XMLSerializer();

    // Simple formatting (add indentation)
    let formatted = serializer.serializeToString(xmlDoc);

    // Basic indentation
    let indent = 0;
    formatted = formatted.replace(/(<[^/][^>]*>)(<[^/])/g, '$1\n$2');
    formatted = formatted.replace(/(<\/[^>]+>)(<[^/])/g, '$1\n$2');

    const lines = formatted.split('\n');
    const indented = lines.map(line => {
      if (line.match(/<\/\w/)) {
        indent = Math.max(0, indent - 2);
      }
      const result = ' '.repeat(indent) + line;
      if (line.match(/<\w[^>]*[^/]>$/)) {
        indent += 2;
      }
      return result;
    });

    return indented.join('\n');
  } catch {
    return xmlString;
  }
}
