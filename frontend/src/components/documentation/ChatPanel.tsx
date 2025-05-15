import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Loader, Plus, Trash2, Grip, X, ChevronLeft, ChevronRight, User, Bot, MessageCirclePlus, MessagesSquare } from 'lucide-react';
import { getAuthHeader } from '../../lib/auth';
import Toast from '../common/Toast';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Chat {
  id: string;
  messages: Message[];
  created_at: string;
}

interface ChatPanelProps {
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatPanel({ projectName, isOpen, onClose }: ChatPanelProps) {
  const [isVectorized, setIsVectorized] = useState(false);
  const [isVectorizing, setIsVectorizing] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [width, setWidth] = useState(480);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const messageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkVectorizeStatus();
    fetchChatHistory();

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = window.innerWidth - e.clientX;
      setWidth(Math.min(Math.max(320, newWidth), window.innerWidth * 0.8));
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = 'default';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [projectName]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedChat, chats]);

  // Focus input field when chat changes
  useEffect(() => {
    if (selectedChat && messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [selectedChat]);

  const startResize = (e: React.MouseEvent) => {
    isResizingRef.current = true;
    document.body.style.cursor = 'ew-resize';
    e.preventDefault();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkVectorizeStatus = async () => {
    try {
      const headers = getAuthHeader();
      if (!headers) return;

      const response = await fetch(
        `http://localhost:8000/api/chat/vectorize-status/${encodeURIComponent(projectName)}`,
        { headers }
      );

      if (!response.ok) throw new Error('Failed to check vectorize status');
      const data = await response.json();
      setIsVectorized(data.is_vectorized);
    } catch (error) {
      showToast('Failed to check vectorize status', 'error');
    }
  };

  const vectorizeProject = async () => {
    try {
      setIsVectorizing(true);
      const headers = getAuthHeader();
      if (!headers) return;

      const response = await fetch(
        `http://localhost:8000/api/chat/vectorize?project_name=${encodeURIComponent(projectName)}`,
        { 
          method: 'POST',
          headers 
        }
      );

      if (!response.ok) throw new Error('Failed to vectorize project');
      
      setIsVectorized(true);
      showToast('Project vectorized successfully', 'success');
    } catch (error) {
      showToast('Failed to vectorize project', 'error');
    } finally {
      setIsVectorizing(false);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const headers = getAuthHeader();
      if (!headers) return;

      const response = await fetch(
        `http://localhost:8000/api/chat/history/${encodeURIComponent(projectName)}`,
        { headers }
      );

      if (!response.ok) throw new Error('Failed to fetch chat history');
      const data = await response.json();
      setChats(data);
      
      if (data.length > 0 && !selectedChat) {
        setSelectedChat(data[0].id);
      }
    } catch (error) {
      showToast('Failed to fetch chat history', 'error');
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !isVectorized) return;

    try {
      setIsLoading(true);
      const headers = {
        ...getAuthHeader(),
        'Content-Type': 'application/json'
      };
      if (!headers) return;

      const response = await fetch('http://localhost:8000/api/chat/message', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          project_name: projectName,
          query: message.trim(),
          chat_id: selectedChat
        })
      });

      if (!response.ok) throw new Error('Failed to send message');
      await fetchChatHistory();
      setMessage('');
    } catch (error) {
      showToast('Failed to send message', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setSelectedChat(null);
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      const headers = getAuthHeader();
      if (!headers) return;

      const response = await fetch(`http://localhost:8000/api/chat/history/${chatId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) throw new Error('Failed to delete chat');
      
      await fetchChatHistory();
      if (selectedChat === chatId) {
        setSelectedChat(null);
      }
      showToast('Chat deleted successfully', 'success');
    } catch (error) {
      showToast('Failed to delete chat', 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  if (!isOpen) return null;

  const selectedChatMessages = chats.find(chat => chat.id === selectedChat)?.messages || [];

  return (
    <>
      {/* Backdrop for blur effect */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}
      <div 
        className="fixed inset-y-0 right-0 bg-gray-800 border-l border-gray-700 flex flex-col shadow-xl z-50 transition-all duration-300 ease-in-out"
        style={{ width: `${width}px` }}
      >
        <div
          ref={resizeRef}
          className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500 transition-colors"
          onMouseDown={startResize}
        />

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-750 shrink-0">
          <div className="flex items-center space-x-3">
            <MessageSquare className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">{projectName} Chat</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {!isVectorized ? (
          <div className="flex-1 flex items-center justify-center p-8 overflow-auto custom-scrollbar">
            <div className="text-center max-w-sm">
              <div className="bg-blue-500/10 rounded-full p-4 mb-6 inline-block">
                <MessageSquare className="h-8 w-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Project Needs Vectorization
              </h3>
              <p className="text-gray-400 mb-6">
                Before you can chat with your project, we need to process and index its content.
                This will only take a moment.
              </p>
              <button
                onClick={vectorizeProject}
                disabled={isVectorizing}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center space-x-2 mx-auto"
              >
                {isVectorizing ? (
                  <>
                    <Loader className="animate-spin h-5 w-5" />
                    <span>Vectorizing Project...</span>
                  </>
                ) : (
                  <>
                    <span>Start Vectorization</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex min-h-0">
            {/* Chat List Sidebar */}
            <div 
              className={`border-r border-gray-700 bg-gray-850 flex flex-col min-h-0 transition-all duration-300 ${
                sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-1/3'
              }`}
            >
              <button
                onClick={startNewChat}
                className="w-full p-4 flex items-center justify-center space-x-2 text-white bg-blue-500 hover:bg-blue-600 transition-colors shrink-0 font-medium"
              >
                <Plus className="h-4 w-4" />
                <span>New Chat</span>
              </button>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {chats.length === 0 ? (
                  <div className="p-4 text-center text-gray-400 text-sm">
                    No chat history yet
                  </div>
                ) : (
                  chats.map(chat => (
                    <div
                      key={chat.id}
                      className={`group p-4 cursor-pointer transition-colors border-l-2 ${
                        chat.id === selectedChat 
                          ? 'bg-gray-700 border-l-blue-500' 
                          : 'hover:bg-gray-750 border-l-transparent'
                      }`}
                    >
                      <div
                        className="flex items-start space-x-3"
                        onClick={() => setSelectedChat(chat.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-300 truncate mb-1 font-medium">
                            {chat.messages[0]?.content.substring(0, 40) || 'New Chat'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatTimestamp(chat.created_at)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteChat(chat.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 transition-all rounded-full hover:bg-gray-700"
                          aria-label="Delete chat"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Toggle sidebar button */}
            <button
              onClick={toggleSidebar}
              className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-gray-700 text-gray-300 hover:text-white hover:bg-gray-600 p-1 rounded-r-md shadow-lg transition-all z-10"
              aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>

            {/* Chat Messages */}
            <div className="flex-1 flex flex-col min-h-0 bg-gray-900">
              {selectedChatMessages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center p-6">
                    <div className="bg-blue-500/10 rounded-full p-6 mb-6 mx-auto inline-flex flex-col items-center">
                      <div className="relative">
                        <MessagesSquare className="h-12 w-12 text-blue-400" />
                        <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                          <Plus className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    </div>
                    <h3 className="text-lg font-medium text-white mb-3">Start a new conversation</h3>
                    <p className="text-gray-400 text-sm max-w-xs mx-auto">
                      Ask questions about your {projectName} project and get intelligent responses based on your codebase.
                    </p>
                    <button 
                      onClick={() => messageInputRef.current?.focus()}
                      className="mt-6 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors inline-flex items-center space-x-2"
                    >
                      <MessageCirclePlus className="h-4 w-4" />
                      <span>Start chatting</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  {selectedChatMessages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`flex max-w-[85%] ${
                          msg.role === 'user'
                            ? 'flex-row-reverse'
                            : 'flex-row'
                        }`}
                      >
                        {/* Avatar Icon */}
                        <div className={`flex items-start ${
                          msg.role === 'user'
                            ? 'ml-3'
                            : 'mr-3'
                        }`}>
                          <div className={`rounded-full p-2 ${
                            msg.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-blue-400'
                          }`}>
                            {msg.role === 'user' 
                              ? <User className="h-4 w-4" /> 
                              : <Bot className="h-4 w-4" />
                            }
                          </div>
                        </div>
                        
                        {/* Message Content */}
                        <div
                          className={`rounded-lg px-6 py-4 shadow-sm ${
                            msg.role === 'user'
                              ? 'bg-blue-600 text-white rounded-tr-none'
                              : 'bg-gray-700 text-white rounded-tl-none'
                          }`}
                        >
                          <ReactMarkdown
                            className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-gray-800 prose-pre:p-4 prose-pre:rounded-md"
                            components={{
                              code({ node, inline, className, children, ...props }) {
                                return (
                                  <code
                                    className={`${inline ? 'bg-gray-750 px-1.5 py-0.5 rounded text-sm' : ''} ${className}`}
                                    {...props}
                                  >
                                    {children}
                                  </code>
                                );
                              }
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}

              <div className="p-4 border-t border-gray-700 bg-gray-800 shrink-0">
                <div className="flex space-x-3">
                  <input
                    ref={messageInputRef}
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    disabled={isLoading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isLoading || !message.trim()}
                    className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[48px] shadow-md"
                    aria-label="Send message"
                  >
                    {isLoading ? (
                      <Loader className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <div className="mt-2 text-xs text-gray-500 text-center">
                  Press Enter to send
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}