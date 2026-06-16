import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Square } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ContextRing } from './ContextRing';
import type { ContextInfo } from '@/hooks/useChat';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  onAbort?: () => void;
  contextInfo?: ContextInfo;
}

const SLASH_COMMANDS = [
  { name: 'compact', description: '手动压缩上下文' },
  { name: 'clear', description: '清空会话缓存' },
  { name: 'readcache', description: '读取缓存内容' },
];

export function ChatInput({ onSend, disabled, onAbort, contextInfo }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [showCommands, setShowCommands] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const trimmed = input.trim();
  const isCommandMode = trimmed.startsWith('/');

  const filteredCommands = isCommandMode
    ? SLASH_COMMANDS.filter((c) =>
        ('/' + c.name).startsWith(trimmed)
      )
    : [];

  useEffect(() => {
    if (filteredCommands.length > 0) {
      setShowCommands(true);
      setSelectedIndex(0);
    } else {
      setShowCommands(false);
    }
  }, [input]);

  const insertCommand = (cmd: typeof SLASH_COMMANDS[0]) => {
    setInput('/' + cmd.name);
    setShowCommands(false);
    textareaRef.current?.focus();
  };

  const handleSend = () => {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
    setShowCommands(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommands && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        insertCommand(filteredCommands[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowCommands(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }
  };

  return (
    <div className="px-4 py-4 relative bg-background/60 backdrop-blur-md backdrop-saturate-150">
      <div className="max-w-3xl mx-auto flex gap-3 items-center">
        {contextInfo && (
          <ContextRing
            totalK={contextInfo.totalK}
            usedK={contextInfo.usedK}
            percentage={contextInfo.percentage}
          />
        )}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="输入消息..."
            rows={1}
            disabled={disabled}
            className="min-h-[44px] resize-none rounded-2xl px-4 py-3 scrollbar-hide"
          />
          {showCommands && filteredCommands.length > 0 && (
            <div
              ref={listRef}
              className="absolute bottom-full left-0 mb-1 w-64 rounded-lg border border-border bg-popover shadow-lg overflow-hidden z-50"
            >
              {filteredCommands.map((cmd, idx) => (
                <div
                  key={cmd.name}
                  onClick={() => insertCommand(cmd)}
                  className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between ${
                    idx === selectedIndex
                      ? 'bg-accent text-accent-foreground'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <span className="font-medium">/{cmd.name}</span>
                  <span className="text-muted-foreground text-xs">{cmd.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {disabled ? (
          <Button
            onClick={onAbort}
            variant="outline"
            size="icon"
            className="flex-shrink-0 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/60"
            title="停止生成"
          >
            <Square size={14} fill="currentColor" />
          </Button>
        ) : (
          <Button
            onClick={handleSend}
            disabled={!input.trim()}
            size="icon"
            className="flex-shrink-0 rounded-xl border-0 bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-md shadow-indigo-500/30 ring-1 ring-white/20 hover:from-indigo-600 hover:to-blue-600 hover:shadow-lg hover:shadow-indigo-500/40 disabled:opacity-40"
          >
            <Send size={18} />
          </Button>
        )}
      </div>
    </div>
  );
}
