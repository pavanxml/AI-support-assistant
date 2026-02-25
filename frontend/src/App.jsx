import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import { Send, PlusCircle, Bot, User, Loader2 } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

function App() {
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Initialize session and fetch history
  useEffect(() => {
    let currentSessionId = localStorage.getItem('chatSessionId');
    if (!currentSessionId) {
      currentSessionId = uuidv4();
      localStorage.setItem('chatSessionId', currentSessionId);
    }
    setSessionId(currentSessionId);
    fetchConversation(currentSessionId);
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const fetchConversation = async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/conversations/${id}`);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Error fetching conversation:', error);
    }
  };

  const handleNewChat = () => {
    const newSessionId = uuidv4();
    localStorage.setItem('chatSessionId', newSessionId);
    setSessionId(newSessionId);
    setMessages([]);
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const validIsoString = isoString.includes('T') ? isoString : isoString.replace(' ', 'T') + 'Z';
    const date = new Date(validIsoString);
    if (isNaN(date.getTime())) return 'Time Check';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsgText = inputValue;
    setInputValue('');

    // Optimistic UI update
    const optimisticMessage = {
      id: Date.now(),
      role: 'user',
      content: userMsgText,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/chat`, {
        sessionId,
        message: userMsgText
      });

      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.data.reply,
        created_at: new Date().toISOString(),
        tokensUsed: response.data.tokensUsed
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 2,
        role: 'assistant',
        content: 'Sorry, an error occurred while connecting to the assistant.',
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-200 font-sans p-4">
      {/* Sidebar (Optional) / Header area integrated in main */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto bg-slate-800 rounded-xl overflow-hidden shadow-2xl border border-slate-700">

        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 p-2 rounded-lg">
              <Bot size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                Support Assistant
              </h1>
              <p className="text-xs text-slate-400">Session: {sessionId.split('-')[0]}</p>
            </div>
          </div>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-2 hover:bg-slate-700 transition px-4 py-2 rounded-md font-medium text-sm border border-slate-600"
          >
            <PlusCircle size={16} />
            New Chat
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
              <Bot size={64} className="text-slate-600" />
              <p className="text-lg">How can I help you today?</p>
              <p className="text-sm">I can answer questions based on the product documentation.</p>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={msg.id || index}
              className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/50 mt-1">
                  <Bot size={18} className="text-indigo-400" />
                </div>
              )}

              <div
                className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
              >
                <div
                  className={`px-4 py-3 rounded-2xl ${msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                    : 'bg-slate-700 text-slate-100 rounded-tl-sm border border-slate-600 shadow-sm'
                    }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>

                <div className="text-xs text-slate-500 mt-1 px-1 flex gap-2">
                  <span>{formatTime(msg.created_at || new Date().toISOString())}</span>
                  {msg.tokensUsed && msg.role === 'assistant' && (
                    <span className="text-slate-600">• {msg.tokensUsed} tokens</span>
                  )}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center shrink-0 border border-slate-500 mt-1">
                  <User size={18} className="text-slate-300" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4 justify-start fade-in">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/50 mt-1">
                <Bot size={18} className="text-indigo-400" />
              </div>
              <div className="bg-slate-700 text-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-3 border border-slate-600">
                <Loader2 size={16} className="animate-spin text-indigo-400" />
                <span className="text-sm text-slate-300">Generating response...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-800 border-t border-slate-700">
          <form
            onSubmit={sendMessage}
            className="flex items-end gap-2 bg-slate-900 p-2 rounded-xl border border-slate-600 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all"
          >
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(e);
                }
              }}
              placeholder="Ask a question about the product..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-slate-200 resize-none px-3 py-2 max-h-32 min-h-[44px]"
              rows={1}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={20} />
            </button>
          </form>
          <div className="text-center mt-2">
            <p className="text-xs text-slate-500">Press Enter to send, Shift+Enter for new line.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
