import { useEffect, useState, useRef } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { MessageList } from '@/components/MessageList';
import { ChatInput } from '@/components/ChatInput';
import { ToolsPanel } from '@/components/ToolsPanel';
import { useUIStore } from '@/stores/uiStore';
import { useChat } from '@/hooks/useChat';
import { useRagChat } from '@/hooks/useRagChat';
import { createSession, fetchRagDomains, fetchRagStats, fetchSession, fetchSkills, updateSession } from '@/hooks/useApi';
import { fetchSystemStatus } from '@/hooks/useSettings';
import { Wrench, Database, Bot, BookOpen, ChevronDown, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ChatPageProps {
  onOpenSettings?: (tab?: string) => void;
  onOpenRag?: () => void;
}

type ChatMode = 'agent' | 'rag';

export function ChatPage({ onOpenSettings, onOpenRag }: ChatPageProps) {
  const { activeSessionId, setActiveSession } = useUIStore();
  const [mode, setMode] = useState<ChatMode>(() => {
    const saved = localStorage.getItem('chat-mode');
    return (saved as ChatMode) || 'agent';
  });
  const [domains, setDomains] = useState<any[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [_ragDocCount, setRagDocCount] = useState(0);
  const [showTools, setShowTools] = useState(false);
  const [activeSessionDomain, setActiveSessionDomain] = useState<{ id: string; name: string } | null>(null);
  const isCreatingRef = useRef(false);
  const [milvusConfigured, setMilvusConfigured] = useState(true);
  const [skills, setSkills] = useState<{ name: string; description: string; strict_references?: boolean }[]>([]);
  const [skillSheetOpen, setSkillSheetOpen] = useState(false);

  const isAgent = mode === 'agent';
  const agentChat = useChat(activeSessionId);
  const ragChat = useRagChat(selectedDomainId, activeSessionId);

  const messages = isAgent ? agentChat.messages : ragChat.messages;
  const isLoading = isAgent ? agentChat.isLoading : ragChat.isLoading;
  const sendMessage = isAgent ? agentChat.sendMessage : ragChat.sendMessage;
  const clearMessages = isAgent ? agentChat.clearMessages : ragChat.clearMessages;
  const loadHistory = isAgent ? agentChat.loadHistory : ragChat.loadHistory;
  const contextInfo = isAgent ? agentChat.contextInfo : ragChat.contextInfo;
  const abort = isAgent ? agentChat.abort : ragChat.abort;

  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  // Check system status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await fetchSystemStatus();
        setMilvusConfigured(status.milvus_configured);
        // Auto-switch to agent if RAG is unavailable
        if (!status.milvus_configured && mode === 'rag') {
          setMode('agent');
          localStorage.setItem('chat-mode', 'agent');
        }
      } catch {
        setMilvusConfigured(false);
      }
    };
    checkStatus();

    fetchSkills().then(setSkills).catch(() => {});

    // Listen for settings open event from sidebar
    const handleOpenSettings = () => onOpenSettings?.('wecom');
    window.addEventListener('open-settings', handleOpenSettings);
    return () => window.removeEventListener('open-settings', handleOpenSettings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem('chat-mode', mode);
  }, [mode]);

  useEffect(() => {
    if (!isAgent) {
      fetchRagDomains().then((items) => {
        setDomains(items);
        const targetId = items.length > 0 && !items.find((d: any) => d.id === selectedDomainId)
          ? items[0].id
          : selectedDomainId;
        if (targetId && targetId !== selectedDomainId) {
          setSelectedDomainId(targetId);
        }
        if (targetId) {
          fetchRagStats(targetId).then((s) => setRagDocCount(s.ready_documents || 0));
        }
      });
    }
  }, [isAgent]);

  useEffect(() => {
    if (!isAgent && selectedDomainId) {
      fetchRagStats(selectedDomainId).then((s) => setRagDocCount(s.ready_documents || 0));
    }
  }, [isAgent, selectedDomainId]);

  useEffect(() => {
    if (!isAgent && activeSessionId) {
      fetchSession(activeSessionId).then((session) => {
        if (session?.domain_id) {
          const domain = domains.find((d: any) => d.id === session.domain_id);
          setActiveSessionDomain(domain ? { id: domain.id, name: domain.name } : null);
        } else {
          setActiveSessionDomain(null);
        }
      });
    } else {
      setActiveSessionDomain(null);
    }
  }, [activeSessionId, isAgent, domains]);

  useEffect(() => {
    clearMessages();
    if (isAgent) {
      loadHistory();
    } else {
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, isAgent]);

  useEffect(() => {
    if (pendingMessage && activeSessionId && !isCreatingRef.current && isAgent) {
      sendMessage(pendingMessage);
      setPendingMessage(null);
    } else if (pendingMessage && activeSessionId && !isAgent) {
      sendMessage(pendingMessage);
      setPendingMessage(null);
    }
  }, [activeSessionId, pendingMessage, sendMessage, isAgent]);

  const handleSend = async (content: string) => {
    if (isAgent) {
      if (!activeSessionId) {
        if (isCreatingRef.current) return;
        isCreatingRef.current = true;
        try {
          const title = content.trim().slice(0, 10) || '新会话';
          const session = await createSession(title);
          setActiveSession(session.id);
          window.dispatchEvent(new CustomEvent('refresh-sessions'));
          setPendingMessage(content);
        } finally {
          isCreatingRef.current = false;
        }
      } else {
        if (messages.length === 0) {
          const title = content.trim().slice(0, 10) || '新会话';
          await updateSession(activeSessionId, { title });
          window.dispatchEvent(new CustomEvent('refresh-sessions'));
        }
        sendMessage(content);
      }
    } else {
      // RAG mode
      if (!activeSessionId) {
        if (isCreatingRef.current) return;
        isCreatingRef.current = true;
        try {
          const title = content.trim().slice(0, 10) || '新会话';
          const session = await createSession(title, 'rag', selectedDomainId);
          setActiveSession(session.id);
          window.dispatchEvent(new CustomEvent('refresh-sessions'));
          setPendingMessage(content);
        } finally {
          isCreatingRef.current = false;
        }
      } else {
        if (messages.length === 0) {
          const title = content.trim().slice(0, 10) || '新会话';
          await updateSession(activeSessionId, { title });
          window.dispatchEvent(new CustomEvent('refresh-sessions'));
        }
        sendMessage(content);
      }
    }
  };

  const handleModeSwitch = (newMode: ChatMode) => {
    if (newMode === mode) return;
    if (newMode === 'rag' && !milvusConfigured) return;
    setMode(newMode);
    setActiveSession(null);
    clearMessages();
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen w-screen bg-background">
        <Sidebar mode={mode} domainId={selectedDomainId} />

        <div className="flex-1 flex flex-col min-w-0 dot-pattern">
          <header className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-background/60 backdrop-blur-md backdrop-saturate-150">
            <div className="flex items-center gap-3">
              <Tabs value={mode} onValueChange={(v) => handleModeSwitch(v as ChatMode)}>
                <TabsList className="ring-1 ring-border/40 shadow-sm">
                  <TabsTrigger value="agent" className="gap-1.5 data-active:text-indigo-600 dark:data-active:text-indigo-400 data-active:[&_svg]:text-indigo-500">
                    <Bot size={14} />
                    Agent
                  </TabsTrigger>
                  {!milvusConfigured ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex">
                          <TabsTrigger value="rag" disabled className="gap-1.5 data-active:text-indigo-600 dark:data-active:text-indigo-400 data-active:[&_svg]:text-indigo-500">
                            <BookOpen size={14} />
                            RAG
                          </TabsTrigger>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        请前往设置页面配置 Milvus 以使用 RAG 功能
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <TabsTrigger value="rag" className="gap-1.5 data-active:text-indigo-600 dark:data-active:text-indigo-400 data-active:[&_svg]:text-indigo-500">
                      <BookOpen size={14} />
                      RAG
                    </TabsTrigger>
                  )}
                </TabsList>
              </Tabs>

              {mode === 'rag' && (
                <>
                  {activeSessionId && activeSessionDomain ? (
                    <span className="text-sm flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/5 border border-indigo-500/20 text-foreground">
                      <Database size={14} className="text-indigo-500" />
                      {activeSessionDomain.name}
                    </span>
                  ) : domains.length > 0 ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 rounded-lg border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-500/40 hover:text-foreground"
                        >
                          <Database size={14} className="text-indigo-500" />
                          {domains.find((d: any) => d.id === selectedDomainId)?.name || '选择知识库'}
                          <ChevronDown size={13} className="opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        {domains.map((d: any) => (
                          <DropdownMenuItem
                            key={d.id}
                            onClick={() => {
                              setSelectedDomainId(d.id);
                              setActiveSession(null);
                              clearMessages();
                            }}
                            className="gap-2"
                          >
                            <Database size={14} className="shrink-0" />
                            <span className={`flex-1 truncate ${d.id === selectedDomainId ? 'text-primary' : ''}`}>
                              {d.name}
                            </span>
                            {d.id === selectedDomainId && <Check size={14} className="text-primary shrink-0" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {mode === 'agent' && (
                <>
                  <Button
                    onClick={() => setShowTools(true)}
                    variant="ghost"
                    size="icon"
                    title="工具"
                  >
                    <Wrench size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="技能"
                    onClick={() => setSkillSheetOpen(true)}
                  >
                    <Sparkles size={16} />
                  </Button>
                </>
              )}
              {mode === 'rag' && (
                <Button
                  onClick={onOpenRag}
                  variant="ghost"
                  size="icon"
                  title="管理知识库"
                >
                  <Database size={16} />
                </Button>
              )}
            </div>
          </header>

          {/* Skill Sheet */}
          <Sheet open={skillSheetOpen} onOpenChange={setSkillSheetOpen}>
            <SheetContent side="right" className="sm:max-w-md" showCloseButton>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Sparkles size={18} className="text-primary" />
                  技能库
                </SheetTitle>
                <SheetDescription>
                  {skills.length} 个可用技能，对话中可自然触发
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto -mx-4 px-4">
                {skills.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Sparkles size={32} className="opacity-20 mb-3" />
                    <p className="text-sm">暂无技能</p>
                    <p className="text-xs mt-1">在 backend/skills/ 目录添加 SKILL.md 即可</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {skills.map((skill, i) => {
                      const colors = [
                        { bg: 'bg-rose-500/8', border: 'border-rose-500/15', text: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
                        { bg: 'bg-emerald-500/8', border: 'border-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
                        { bg: 'bg-amber-500/8', border: 'border-amber-500/15', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
                        { bg: 'bg-sky-500/8', border: 'border-sky-500/15', text: 'text-sky-600 dark:text-sky-400', dot: 'bg-sky-500' },
                      ];
                      const c = colors[i % colors.length];
                      return (
                        <div
                          key={skill.name}
                          className={`relative rounded-xl border ${c.border} ${c.bg} p-4 transition-colors`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-1 w-2 h-2 rounded-full ${c.dot} shrink-0`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold ${c.text}`}>{skill.name}</span>
                                {skill.strict_references && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-foreground/5 text-muted-foreground font-medium border border-border/40">
                                    严格引用
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{skill.description}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <MessageList messages={messages} />

          <ChatInput
            onSend={handleSend}
            disabled={isLoading}
            onAbort={abort}
            contextInfo={contextInfo}
          />
        </div>

        {isAgent && <ToolsPanel isOpen={showTools} onClose={() => setShowTools(false)} />}
      </div>

    </TooltipProvider>
  );
}
