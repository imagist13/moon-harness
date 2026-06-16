import { useState, useCallback, useRef } from 'react';
import { ChatItem, HarnessEvent } from '@/types';
import { fetchMessages } from './useApi';
import type { ContextInfo } from './useChat';

export function useRagChat(domainId?: string, sessionId?: string | null) {
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [contextInfo, setContextInfo] = useState<ContextInfo>({ totalK: 128, usedK: 0, percentage: 0 });
  const abortRef = useRef<() => void>(() => {});

  const extractThink = (text: string): { content: string; thinking?: string } => {
    const completeMatch = text.match(/<think>([\s\S]*?)<\/think>/);
    if (completeMatch) {
      return {
        content: text.replace(/<think>[\s\S]*?<\/think>/g, '').trim(),
        thinking: completeMatch[1].trim(),
      };
    }
    const partialMatch = text.match(/<think>([\s\S]*)/);
    if (partialMatch) {
      return {
        content: text.replace(/<think>[\s\S]*/g, '').trim(),
        thinking: partialMatch[1].trim(),
      };
    }
    return { content: text };
  };

  const loadHistory = useCallback(async () => {
    if (!sessionId) {
      setMessages([]);
      return;
    }
    try {
      const msgs = await fetchMessages(sessionId);
      const items: ChatItem[] = msgs
        .filter((msg: any) => msg.role !== 'tool' && msg.role !== 'system')
        .map((msg: any) => {
          const extracted = extractThink(msg.content || '');
          return {
            id: msg.id,
            role: msg.role,
            content: extracted.content,
            thinking: extracted.thinking,
          };
        });
      setMessages((prev) => {
        const hasLiveMessage = prev.some(
          (m) => m.id.startsWith('user-') || m.id.startsWith('ai-')
        );
        if (hasLiveMessage) return prev;
        return items;
      });
    } catch {
      setMessages((prev) => {
        const hasLiveMessage = prev.some(
          (m) => m.id.startsWith('user-') || m.id.startsWith('ai-')
        );
        if (hasLiveMessage) return prev;
        return [];
      });
    }
  }, [sessionId]);

  const sendMessage = useCallback((content: string) => {
    if (!content.trim()) return;

    const userMsg: ChatItem = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    window.dispatchEvent(new CustomEvent('refresh-sessions'));

    const aiMsg: ChatItem = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: '',
      isStreaming: true,
    };

    setMessages((prev) => [...prev, aiMsg]);

    const controller = new AbortController();
    abortRef.current = () => controller.abort();

    const body: Record<string, any> = { message: content.trim() };
    if (domainId) body.domain_id = domainId;
    if (sessionId) body.session_id = sessionId;

    const token = localStorage.getItem('her-claw-token');
    fetch('/api/rag/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) {
        const text = await response.text().catch(() => 'Request failed');
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsg.id
              ? { ...m, content: m.content + '\n[Error: ' + response.status + ' ' + text + ']', isStreaming: false }
              : m
          )
        );
        setIsLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6);
            try {
              const event: HarnessEvent = JSON.parse(jsonStr);
              handleEvent(event, aiMsg.id);
            } catch (e) {
              // ignore parse errors
            }
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsg.id ? { ...m, isStreaming: false } : m
        )
      );
      window.dispatchEvent(new CustomEvent('refresh-sessions'));
      setIsLoading(false);
    }).catch((err) => {
      if (err.name !== 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsg.id
              ? { ...m, content: m.content + '\n[Error: ' + err.message + ']', isStreaming: false }
              : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsg.id
              ? { ...m, isStreaming: false, content: m.content || '⏹ 已中断' }
              : m
          )
        );
      }
      setIsLoading(false);
    });
  }, [domainId, sessionId]);

  const handleEvent = useCallback((event: HarnessEvent, aiMsgId: string) => {
    if (event.type === 'context_info') {
      setContextInfo({
        totalK: event.data.total_k || 128,
        usedK: event.data.used_k || 0,
        percentage: event.data.percentage || 0,
      });
      return;
    }

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== aiMsgId) return msg;

        switch (event.type) {
          case 'message_start':
            return { ...msg, content: msg.content || '' };
          case 'message_chunk': {
            const raw = msg.content + (event.data.chunk || '');
            const extracted = extractThink(raw);
            return { ...msg, content: raw, thinking: extracted.thinking || msg.thinking };
          }
          case 'message_end': {
            const raw = event.data.content || msg.content;
            const extracted = extractThink(raw);
            return { ...msg, content: extracted.content, thinking: extracted.thinking || msg.thinking, isStreaming: false };
          }
          case 'error':
            return { ...msg, content: msg.content + '\n[Error: ' + (event.data.message || 'Unknown error') + ']', isStreaming: false };
          default:
            return msg;
        }
      })
    );
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setContextInfo({ totalK: 128, usedK: 0, percentage: 0 });
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.();
  }, []);

  return { messages, isLoading, sendMessage, clearMessages, loadHistory, abort, contextInfo };
}
