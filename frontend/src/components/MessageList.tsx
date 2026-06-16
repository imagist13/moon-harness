import { useRef, useEffect } from 'react';
import { ChatItem } from '@/types';
import { ChatMessage } from './ChatMessage';
import { ScrollArea } from '@/components/ui/scroll-area';

function WelcomeScreen() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center flex flex-col items-center gap-5">
        {/* Logo with glow */}
        <div className="relative" style={{ animation: 'slideUp 0.5s ease-out' }}>
          <div className="absolute inset-0 blur-2xl opacity-30 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full scale-150 animate-pulse" />
          <img
            src="/logo.svg"
            alt="moon-harness"
            className="w-16 h-16 relative"
          />
        </div>

        {/* Title */}
        <h2
          className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent"
          style={{ animation: 'slideUp 0.5s ease-out 0.1s both' }}
        >
          moon-harness
        </h2>

        {/* Subtitle */}
        <p
          className="text-sm text-muted-foreground"
          style={{ animation: 'slideUp 0.5s ease-out 0.2s both' }}
        >
          开始与 AI 助手对话
        </p>

        {/* Decorative dots */}
        <div
          className="flex gap-1.5 mt-2"
          style={{ animation: 'slideUp 0.5s ease-out 0.3s both' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/60 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500/60 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/60 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

interface MessageListProps {
  messages: ChatItem[];
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return <WelcomeScreen />;
  }

  return (
    <ScrollArea className="flex-1 min-h-0 px-4 py-6">
      <div className="space-y-6">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
