import { useRef, useEffect } from 'react';
import Editor from "@monaco-editor/react";
import { Undo, Redo, Save } from 'lucide-react';
import MarkdownToolbar from './MarkdownToolbar';
import { insertMarkdownSyntax } from '../../utils/markdown.utils';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
}

export default function MarkdownEditor({ value, onChange, onSave }: MarkdownEditorProps) {
  const editorRef = useRef<any>(null);
  // const previewRef = useRef<HTMLDivElement>(null); // previewRef seems to be for a separate preview, not used for editor itself

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    
    // Configure editor to handle newlines properly
    editor.getModel().setEOL(0); // LF line endings
    
    // Add undo/redo keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, () => {
      editor.trigger('keyboard', 'undo', {});
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ, () => {
      editor.trigger('keyboard', 'redo', {});
    });
  };

  const handleUndo = () => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'undo', {});
    }
  };

  const handleRedo = () => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'redo', {});
    }
  };

  const handleToolbarAction = (action: string, defaultText?: string) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const selection = editor.getSelection();
    const selectedText = editor.getModel().getValueInRange(selection);
    
    const { text, newSelection } = insertMarkdownSyntax(
      action,
      selectedText || defaultText,
      selection
    );

    editor.executeEdits('markdown-toolbar', [{
      range: selection,
      text,
      forceMoveMarkers: true
    }]);

    if (newSelection) {
      editor.setSelection(newSelection);
      editor.focus();
    }
  };



  return (
    <div className="h-full grid grid-rows-[auto_1fr]"> {/* Changed to CSS Grid layout */}
      {/* Toolbar: First row, auto height */}
      <div className="flex justify-between items-center bg-gray-800 border-b border-gray-700">
        <div className="flex items-center">
          <MarkdownToolbar onAction={handleToolbarAction} />
          <div className="border-l border-gray-700 ml-2 pl-2 flex items-center gap-1">
            <button
              onClick={handleUndo}
              className="p-1.5 hover:bg-gray-700 rounded-md text-gray-400 hover:text-white transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="h-4 w-4" />
            </button>
            <button
              onClick={handleRedo}
              className="p-1.5 hover:bg-gray-700 rounded-md text-gray-400 hover:text-white transition-colors"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo className="h-4 w-4" />
            </button>
            <button
              onClick={onSave} // Added Save button
              className="p-1.5 hover:bg-gray-700 rounded-md text-gray-400 hover:text-white transition-colors ml-1"
              title="Save"
            >
              <Save className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="p-2">
          {/* Export PDF button removed */}
        </div>
    </div>
    {/* Editor: Second row, takes remaining height (1fr) */}
    <div className="relative h-full overflow-hidden"> {/* Added h-full and overflow-hidden to ensure the editor area gets correct height */}
      <Editor
          height="100%"
          defaultLanguage="markdown"
          theme="vs-dark"
          value={value}
          onChange={(value) => onChange(value || '')}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            lineNumbers: 'off',
            padding: { top: 16 },
            insertSpaces: true,
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            links: true,
            scrollBeyondLastLine: false,
            lineHeight: 1.6,
            renderWhitespace: 'boundary',
            suggest: {
              showWords: true,
              snippetsPreventQuickSuggestions: false
            }
          }}
        />
      </div>
    </div>
  );
}