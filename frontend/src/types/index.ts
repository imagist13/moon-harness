export interface User {
  id: string;
  email?: string;
  phone?: string;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Session {
  id: string;
  title: string;
  system_prompt: string;
  temperature: number;
  pinned?: boolean;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  created_at: string;
}

export interface ToolConfig {
  name: string;
  type: 'function' | 'api';
  description: string;
  enabled: boolean;
  parameters: Record<string, any>;
  config?: Record<string, any>;
}

export type EventType =
  | 'think_start'
  | 'think_chunk'
  | 'think_end'
  | 'tool_start'
  | 'tool_input'
  | 'tool_output'
  | 'tool_end'
  | 'message_start'
  | 'message_chunk'
  | 'message_end'
  | 'context_info'
  | 'skill_activated'
  | 'error';

export interface HarnessEvent {
  type: EventType;
  data: Record<string, any>;
  timestamp: string;
}

export interface ChatItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  toolCalls?: ToolCallInfo[];
  isStreaming?: boolean;
  activatedSkill?: string;
  thinkingEnded?: boolean;
}

export interface ToolCallInfo {
  id: string;
  name: string;
  input?: Record<string, any>;
  output?: string;
  status: 'running' | 'success' | 'error';
}
