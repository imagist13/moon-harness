import { useState, useCallback, useRef } from 'react';
import { ChatItem, HarnessEvent, ToolCallInfo } from '@/types';
import { fetchMessages } from './useApi';

export interface ContextInfo {
  totalK: number;
  usedK: number;
  percentage: number;
}

export function useChat(sessionId: string | null) {
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [contextInfo, setContextInfo] = useState<ContextInfo>({ totalK: 128, usedK: 0, percentage: 0 });
  const abortRef = useRef<() => void>(() => {});
  const suppressContentRef = useRef(false);

  const loadHistory = useCallback(async () => {
    if (!sessionId) return;
    try {
      const msgs = await fetchMessages(sessionId);

      // Build map of tool_call_id -> output from tool messages
      const toolOutputs: Record<string, string> = {};
      msgs.forEach((msg: any) => {
        if (msg.role === 'tool' && msg.tool_call_id) {
          toolOutputs[msg.tool_call_id] = msg.content || '';
        }
      });

      const parseToolCalls = (toolCallsData: any): ToolCallInfo[] => {
        try {
          const calls = typeof toolCallsData === 'string' ? JSON.parse(toolCallsData) : toolCallsData;
          return calls.map((tc: any) => {
            const id = tc.id || '';
            const output = toolOutputs[id] || '';
            let status: 'success' | 'error' = 'success';
            if (output) {
              try {
                const parsed = JSON.parse(output);
                if (parsed.error) status = 'error';
              } catch {
                // not JSON
              }
            }
            return {
              id,
              name: tc.name || tc.function?.name || '',
              input: tc.args || (tc.function ? JSON.parse(tc.function.arguments || '{}') : {}),
              output,
              status,
            };
          });
        } catch {
          return [];
        }
      };

      // Deduplicate tool calls with same name + input, keeping the last one
      const dedupToolCalls = (calls: ToolCallInfo[]): ToolCallInfo[] => {
        const result: ToolCallInfo[] = [];
        const seen = new Set<string>();
        for (let i = calls.length - 1; i >= 0; i--) {
          const call = calls[i];
          const key = JSON.stringify({ name: call.name, input: call.input });
          if (!seen.has(key)) {
            seen.add(key);
            result.unshift(call);
          }
        }
        return result;
      };

      const filteredMsgs = msgs.filter((msg: any) => msg.role !== 'tool' && msg.role !== 'system');
      const items: ChatItem[] = [];
      let pendingToolCalls: ToolCallInfo[] = [];
      let pendingThinking = '';
      let pendingSkillName = '';

      for (let i = 0; i < filteredMsgs.length; i++) {
        const msg = filteredMsgs[i];
        const content = msg.content || '';
        const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
        const strippedContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        const reasoningContent = msg.reasoning_content || '';

        if (msg.role === 'assistant') {
          const hasToolCalls = msg.tool_calls && (
            (typeof msg.tool_calls === 'string' && msg.tool_calls !== '[]') ||
            (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0)
          );

          if (hasToolCalls) {
            // Intermediate step: accumulate tool_calls and thinking, don't create a ChatItem
            pendingToolCalls.push(...parseToolCalls(msg.tool_calls));
            if (thinkMatch) {
              pendingThinking = pendingThinking
                ? pendingThinking + '\n' + thinkMatch[1].trim()
                : thinkMatch[1].trim();
            }
            if (reasoningContent) {
              pendingThinking = pendingThinking
                ? pendingThinking + '\n' + reasoningContent
                : reasoningContent;
            }
            if (msg.skill_name) {
              pendingSkillName = msg.skill_name;
            }
            continue;
          }

          // Final answer (no tool_calls): create ChatItem with accumulated data
          let toolCalls: ToolCallInfo[] | undefined;
          if (pendingToolCalls.length > 0) {
            toolCalls = [...pendingToolCalls];
            pendingToolCalls = [];
          }
          if (msg.tool_calls) {
            const ownCalls = parseToolCalls(msg.tool_calls);
            toolCalls = toolCalls ? [...toolCalls, ...ownCalls] : ownCalls;
          }
          if (toolCalls && toolCalls.length > 0) {
            toolCalls = dedupToolCalls(toolCalls);
          }

          let thinking = thinkMatch ? thinkMatch[1].trim() : '';
          if (reasoningContent) {
            thinking = thinking ? pendingThinking + '\n' + reasoningContent : reasoningContent;
          } else if (pendingThinking) {
            thinking = thinking ? pendingThinking + '\n' + thinking : pendingThinking;
          }
          pendingThinking = '';

          const skillName = pendingSkillName || msg.skill_name || undefined;
          pendingSkillName = '';

          items.push({
            id: msg.id,
            role: 'assistant',
            content: strippedContent || content,
            thinking: thinking || undefined,
            toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
            activatedSkill: skillName,
          });
          continue;
        }

        // User message
        if (pendingToolCalls.length > 0) {
          items.push({
            id: `tool-group-${i}`,
            role: 'assistant',
            content: '',
            thinking: pendingThinking || undefined,
            toolCalls: dedupToolCalls(pendingToolCalls),
            activatedSkill: pendingSkillName || undefined,
          });
          pendingToolCalls = [];
          pendingThinking = '';
          pendingSkillName = '';
        }

        items.push({
          id: msg.id,
          role: msg.role,
          content: content,
        });
      }

      // Flush any remaining pending toolCalls at the end
      if (pendingToolCalls.length > 0) {
        items.push({
          id: 'tool-group-end',
          role: 'assistant',
          content: '',
          thinking: pendingThinking || undefined,
          toolCalls: dedupToolCalls(pendingToolCalls),
          activatedSkill: pendingSkillName || undefined,
        });
      }

      setMessages((prev) => {
        // 如果已有实时消息（正在发送中），不覆盖
        const hasLiveMessage = prev.some(
          (m) => m.id.startsWith('user-') || m.id.startsWith('ai-')
        );
        if (hasLiveMessage) return prev;
        return items;
      });

      // 用原始消息估算 token 数（和后端回退逻辑一致：content.length // 4）
      const totalTokens = msgs.reduce((sum: number, msg: any) => {
        return sum + Math.floor((msg.content?.length || 0) / 4);
      }, 0);
      const usedK = Math.round((totalTokens / 1000) * 10) / 10;
      const totalK = 128;
      const percentage = totalK > 0 ? Math.round((usedK / totalK) * 100 * 10) / 10 : 0;
      setContextInfo({ totalK, usedK, percentage });
    } catch (err) {
      setMessages((prev) => {
        const hasLiveMessage = prev.some(
          (m) => m.id.startsWith('user-') || m.id.startsWith('ai-')
        );
        if (hasLiveMessage) return prev;
        return [];
      });
      setContextInfo({ totalK: 128, usedK: 0, percentage: 0 });
    }
  }, [sessionId]);

  const sendMessage = useCallback((content: string) => {
    if (!sessionId || !content.trim()) return;

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
      thinking: '',
      toolCalls: [],
      isStreaming: true,
      thinkingEnded: false,
    };

    setMessages((prev) => [...prev, aiMsg]);

    const controller = new AbortController();
    abortRef.current = () => controller.abort();

    const token = localStorage.getItem('her-claw-token');
    fetch(`/api/chat/${sessionId}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message: content.trim() }),
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
              ? { ...m, isStreaming: false, content: m.content || '已中断' }
              : m
          )
        );
      }
      setIsLoading(false);
    });
  }, [sessionId]);

  const handleEvent = useCallback((event: HarnessEvent, aiMsgId: string) => {
    if (event.type === 'context_info') {
      setContextInfo({
        totalK: event.data.total_k || 128,
        usedK: event.data.used_k || 0,
        percentage: event.data.percentage || 0,
      });
      return;
    }

    // Drop content chunks that belong to intermediate agent steps (thinking or
    // tool-call preamble). Only the final answer should accumulate content.
    if (event.type === 'message_chunk' && suppressContentRef.current) {
      return;
    }
    if (event.type === 'think_start') {
      suppressContentRef.current = true;
    } else if (event.type === 'think_end') {
      suppressContentRef.current = false;
    } else if (event.type === 'tool_start') {
      suppressContentRef.current = true;
    }

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== aiMsgId) return msg;

        switch (event.type) {
          case 'think_start':
            // Each call_model in the agent loop starts with think_start.
            // Clear any previous intermediate content so only the final answer shows.
            return { ...msg, thinking: msg.thinking || '', thinkingEnded: false, content: '' };
          case 'think_chunk':
            return { ...msg, thinking: (msg.thinking || '') + (event.data.chunk || '') };
          case 'think_end': {
            // Defer thinkingEnded to next microtask so React doesn't batch it
            // with the last think_chunk. This gives the UI one frame where
            // thinking is shown alone before content starts streaming.
            const thinkContent = msg.thinking || event.data.content || '';
            Promise.resolve().then(() => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMsgId ? { ...m, thinking: thinkContent, thinkingEnded: true } : m
                )
              );
            });
            return { ...msg, thinking: thinkContent };
          }
          case 'tool_start': {
            const newCall: ToolCallInfo = {
              id: event.data.id,
              name: event.data.name,
              status: 'running',
            };
            return { ...msg, toolCalls: [...(msg.toolCalls || []), newCall], content: '' };
          }
          case 'tool_input': {
            const calls = msg.toolCalls || [];
            const idx = calls.findIndex((c) => c.id === event.data.id);
            if (idx >= 0) {
              const updated = [...calls];
              updated[idx] = { ...updated[idx], input: event.data.input };
              return { ...msg, toolCalls: updated };
            }
            return msg;
          }
          case 'tool_output': {
            const calls = msg.toolCalls || [];
            const idx = calls.findIndex((c) => c.id === event.data.id);
            if (idx >= 0) {
              const updated = [...calls];
              const output = event.data.output || '';
              let status: 'success' | 'error' = 'success';
              try {
                const parsed = JSON.parse(output);
                if (parsed.error) status = 'error';
              } catch {
                // not JSON
              }
              updated[idx] = { ...updated[idx], output, status };
              return { ...msg, toolCalls: updated };
            }
            return msg;
          }
          case 'tool_end': {
            const calls = msg.toolCalls || [];
            const idx = calls.findIndex((c) => c.id === event.data.id);
            if (idx >= 0) {
              const updated = [...calls];
              updated[idx] = { ...updated[idx], status: updated[idx].status === 'running' ? 'success' : updated[idx].status };
              return { ...msg, toolCalls: updated };
            }
            return msg;
          }
          case 'message_chunk': {
            if (event.data.is_preamble_clear) {
              return { ...msg, content: '' };
            }
            return { ...msg, content: msg.content + (event.data.chunk || '') };
          }
          case 'message_end':
            // Defensively mark the thinking block as ended: if the LLM
            // emitted THINK_END before this, thinkingEnded is already true.
            // If THINK_END was skipped (e.g. reasoning_content models that
            // never went through the <think> streaming path), this still
            // gives the UI a clean signal to stop showing the spinner.
            return {
              ...msg,
              content: event.data.content || msg.content,
              isStreaming: false,
              thinkingEnded: true,
            };
          case 'skill_activated':
            return { ...msg, activatedSkill: event.data.name || '' };
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

  return { messages, isLoading, sendMessage, clearMessages, loadHistory, contextInfo, abort };
}
