import { ChatItem } from '@/types';
import { ThinkingBlock } from './ThinkingBlock';
import { ToolCallCard } from './ToolCallCard';
import { User, Pause } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
  message: ChatItem;
}

function stripThinkTags(content: string): string {
  // Remove complete think tags
  let result = content.replace(/<think>[\s\S]*?<\/think>/g, '');
  // Remove unclosed think tags (streaming in progress)
  result = result.replace(/<think>[\s\S]*/g, '');
  return result.trim();
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const displayContent = isUser ? message.content : stripThinkTags(message.content);

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}>
      {isUser ? (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <User size={16} className="text-primary-foreground" />
        </div>
      ) : (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/40 ring-1 ring-white/20">
          Y
        </div>
      )}

      <div className={`flex flex-col gap-2 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        {message.thinking && !isUser && (
          <ThinkingBlock thinking={message.thinking} />
        )}

        {message.toolCalls && message.toolCalls.length > 0 && !isUser && (
          <div className="flex flex-col gap-2 w-full">
            {message.toolCalls.map((tool) => (
              <ToolCallCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}

        {!isUser && message.thinking && message.thinkingEnded === false && message.isStreaming && (
          <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed bg-secondary text-secondary-foreground rounded-bl-md">
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          </div>
        )}

        {(() => {
          const hasRunningTool = message.toolCalls?.some((t) => t.status === 'running');
          const isCurrentlyThinking = !!message.thinking && message.thinkingEnded === false;
          return (isUser || displayContent || message.isStreaming) && !isCurrentlyThinking && !hasRunningTool;
        })() && (
          <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-secondary text-secondary-foreground rounded-bl-md'
          }`}>
            {isUser ? (
              displayContent || (message.isStreaming ? (
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              ) : '')
            ) : (
              message.isStreaming && !displayContent ? (
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              ) : displayContent === '已中断' || displayContent === '⏹ 已中断' ? (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Pause size={12} className="opacity-60" />
                  <span className="text-xs">已中断</span>
                </span>
              ) : (
                <div className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {displayContent}
                  </ReactMarkdown>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
