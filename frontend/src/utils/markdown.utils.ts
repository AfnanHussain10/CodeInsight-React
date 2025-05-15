interface MarkdownSyntaxResult {
    text: string;
    newSelection?: {
      startLineNumber: number;
      startColumn: number;
      endLineNumber: number;
      endColumn: number;
    };
  }
  
  export function insertMarkdownSyntax(
    action: string,
    text: string = '',
    selection: any
  ): MarkdownSyntaxResult {
    const actions: { [key: string]: () => MarkdownSyntaxResult } = {
      bold: () => ({ text: `**${text}**` }),
      italic: () => ({ text: `*${text}*` }),
      code: () => ({ text: `\`${text}\`` }),
      heading1: () => ({ text: `# ${text}` }),
      heading2: () => ({ text: `## ${text}` }),
      heading3: () => ({ text: `### ${text}` }),
      quote: () => ({ text: `> ${text}` }),
      unorderedList: () => ({ 
        text: text.split('\n').map(line => `- ${line}`).join('\n')
      }),
      orderedList: () => ({ 
        text: text.split('\n').map((line, i) => `${i + 1}. ${line}`).join('\n')
      }),
      link: () => {
        const defaultText = text || 'Link text';
        return {
          text: `[${defaultText}](url)`,
          newSelection: {
            startLineNumber: selection.startLineNumber,
            startColumn: selection.startColumn + defaultText.length + 3,
            endLineNumber: selection.startLineNumber,
            endColumn: selection.startColumn + defaultText.length + 6
          }
        };
      },
      image: () => {
        const defaultText = text || 'Image alt text';
        return {
          text: `![${defaultText}](url)`,
          newSelection: {
            startLineNumber: selection.startLineNumber,
            startColumn: selection.startColumn + defaultText.length + 4,
            endLineNumber: selection.startLineNumber,
            endColumn: selection.startColumn + defaultText.length + 7
          }
        };
      }
    };
  
    return actions[action]?.() || { text };
  }