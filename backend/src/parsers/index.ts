import { LogParser } from './baseParser';
import { CSVParser } from './csvParser';
import { JSONParser } from './jsonParser';

/**
 * Parser registry
 */
const parsers: LogParser[] = [
  new CSVParser(),
  new JSONParser(),
];

/**
 * Find appropriate parser for file
 */
export function findParser(filename: string, mimeType?: string): LogParser | null {
  for (const parser of parsers) {
    if (parser.supportsFormat(filename, mimeType)) {
      return parser;
    }
  }
  return null;
}

/**
 * Parse flight log file
 */
export async function parseLogFile(
  filename: string,
  fileContent: Buffer | string,
  mimeType?: string
): Promise<any[]> {
  const parser = findParser(filename, mimeType);
  
  if (!parser) {
    throw new Error(`Unsupported file format: ${filename}`);
  }
  
  return await parser.parse(fileContent);
}

export { CSVParser, JSONParser };
export type { LogParser } from './baseParser';
