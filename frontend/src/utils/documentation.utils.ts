/**
 * Process documentation string to handle escaped characters
 */
export function processDocumentation(doc: string): string {
    return doc
      .replace(/\\n/g, '\n')
      .replace(/^"/, '') // Remove leading quote
      .replace(/"$/, '') // Remove trailing quote
      .replace(/\\/g, '');
  }