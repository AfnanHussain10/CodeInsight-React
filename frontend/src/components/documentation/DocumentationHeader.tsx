import { Pencil, ClipboardCheck, MessageSquare, Download, Sidebar } from 'lucide-react';

interface DocumentationHeaderProps {
  editMode: boolean;
  onEditToggle: () => void;
  onEvaluate: () => void;
  onChatToggle: () => void;
  onDownloadPDF: () => void;
  onTreeToggle?: () => void; // Optional prop for toggling tree
  isTreeVisible?: boolean;  // Optional prop to track tree visibility
}

export default function DocumentationHeader({ 
  editMode, 
  onEditToggle, 
  onEvaluate,
  onChatToggle,
  onDownloadPDF,
  onTreeToggle,
  isTreeVisible
}: DocumentationHeaderProps) {
  return (
    <div className="p-2 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
      <div className="flex gap-2">
        <button
          onClick={onTreeToggle}
          className="p-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
          title={isTreeVisible ? "Hide Documentation Tree" : "Show Documentation Tree"}
        >
          <Sidebar className="h-5 w-5" />
        </button>
        <button
          onClick={onChatToggle}
          className="p-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
          title="Chat With Project"
        >
          <MessageSquare className="h-5 w-5" />
        </button>
        <button
          onClick={onEvaluate}
          className="p-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
          title="Evaluate"
        >
          <ClipboardCheck className="h-5 w-5" />
        </button>
        <button
          onClick={onEditToggle}
          className="p-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
          title={editMode ? "View Only Mode" : "Edit Mode"}
        >
          <Pencil className="h-5 w-5" />
        </button>
        <button
          onClick={onDownloadPDF}
          className="p-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
          title="Download as PDF"
        >
          <Download className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}