import { Bold, Italic, Code, List, ListOrdered, Link, Image, Quote, Heading1, Heading2, Heading3 } from 'lucide-react';

interface ToolbarButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  title: string;
}

function ToolbarButton({ icon, onClick, title }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 hover:bg-gray-700 rounded-md text-gray-400 hover:text-white transition-colors"
    >
      {icon}
    </button>
  );
}

interface MarkdownToolbarProps {
  onAction: (action: string, defaultText?: string) => void;
}

export default function MarkdownToolbar({ onAction }: MarkdownToolbarProps) {
  return (
    <div className="flex items-center gap-1 p-2 bg-gray-800 border-b border-gray-700">
      <ToolbarButton
        icon={<Heading1 className="h-4 w-4" />}
        onClick={() => onAction('heading1')}
        title="Heading 1"
      />
      <ToolbarButton
        icon={<Heading2 className="h-4 w-4" />}
        onClick={() => onAction('heading2')}
        title="Heading 2"
      />
      <ToolbarButton
        icon={<Heading3 className="h-4 w-4" />}
        onClick={() => onAction('heading3')}
        title="Heading 3"
      />
      <div className="w-px h-4 bg-gray-700 mx-1" />
      <ToolbarButton
        icon={<Bold className="h-4 w-4" />}
        onClick={() => onAction('bold')}
        title="Bold"
      />
      <ToolbarButton
        icon={<Italic className="h-4 w-4" />}
        onClick={() => onAction('italic')}
        title="Italic"
      />
      <ToolbarButton
        icon={<Code className="h-4 w-4" />}
        onClick={() => onAction('code')}
        title="Code"
      />
      <div className="w-px h-4 bg-gray-700 mx-1" />
      <ToolbarButton
        icon={<List className="h-4 w-4" />}
        onClick={() => onAction('unorderedList')}
        title="Bullet List"
      />
      <ToolbarButton
        icon={<ListOrdered className="h-4 w-4" />}
        onClick={() => onAction('orderedList')}
        title="Numbered List"
      />
      <ToolbarButton
        icon={<Quote className="h-4 w-4" />}
        onClick={() => onAction('quote')}
        title="Quote"
      />
      <div className="w-px h-4 bg-gray-700 mx-1" />
      <ToolbarButton
        icon={<Link className="h-4 w-4" />}
        onClick={() => onAction('link')}
        title="Link"
      />
      <ToolbarButton
        icon={<Image className="h-4 w-4" />}
        onClick={() => onAction('image')}
        title="Image"
      />
    </div>
  );
}