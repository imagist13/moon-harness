import { useState, useEffect } from 'react';
import { Session } from '@/types';
import { fetchSessions, createSession, deleteSession, updateSession } from '@/hooks/useApi';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { MessageSquarePlus, Trash2, PanelLeftClose, PanelLeft, Settings, MoreHorizontal, Pencil, Pin, PinOff, User, LogOut, Sun, Moon, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface SidebarProps {
  mode?: 'agent' | 'rag';
  domainId?: string;
}

export function Sidebar({ mode = 'agent', domainId }: SidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { sidebarOpen, toggleSidebar, activeSessionId, setActiveSession } = useUIStore();

  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { isDark, toggleTheme } = useThemeStore();

  const loadSessions = async () => {
    const data = await fetchSessions(mode);
    setSessions(data);
  };

  useEffect(() => {
    loadSessions();
    const handleRefresh = () => loadSessions();
    window.addEventListener('refresh-sessions', handleRefresh);
    return () => window.removeEventListener('refresh-sessions', handleRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const handleNewSession = async () => {
    const session = await createSession('新会话', mode, domainId);
    await loadSessions();
    setActiveSession(session.id);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteSession(id);
    await loadSessions();
    if (activeSessionId === id) {
      setActiveSession(null);
    }
  };

  const handlePin = async (e: React.MouseEvent, session: Session) => {
    e.stopPropagation();
    await updateSession(session.id, { pinned: !session.pinned });
    await loadSessions();
  };

  const openEditDialog = (e: React.MouseEvent, session: Session) => {
    e.stopPropagation();
    setEditingSession(session);
    setEditTitle(session.title);
  };

  const handleEditSave = async () => {
    if (editingSession && editTitle.trim()) {
      await updateSession(editingSession.id, { title: editTitle.trim() });
      await loadSessions();
    }
    setEditingSession(null);
  };

  if (!sidebarOpen) {
    return (
      <Button
        onClick={toggleSidebar}
        variant="outline"
        size="icon-sm"
        className="fixed left-4 top-4 z-50"
      >
        <PanelLeft size={16} />
      </Button>
    );
  }

  return (
    <div className="w-64 h-full bg-background border-r border-border flex flex-col">
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-indigo-500/30 ring-1 ring-white/20">
          Y
        </div>
        <span className="text-sm font-semibold text-foreground tracking-tight">moon-harness</span>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-semibold text-foreground">会话</h1>
          <div className="flex gap-1">
            <Button
              onClick={handleNewSession}
              variant="ghost"
              size="icon-sm"
              title="新建会话"
            >
              <MessageSquarePlus size={15} />
            </Button>
            <Button
              onClick={toggleSidebar}
              variant="ghost"
              size="icon-sm"
              title="关闭侧边栏"
            >
              <PanelLeftClose size={15} />
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0 p-2">
        <div className="space-y-1">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => setActiveSession(session.id)}
              onMouseEnter={() => setHoveredId(session.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                activeSessionId === session.id
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              {session.pinned && (
                <Pin size={12} className="shrink-0 opacity-50" />
              )}
              <span className="flex-1 text-sm truncate pr-6">{session.title}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute right-2 w-6 h-6 rounded flex items-center justify-center hover:bg-muted-foreground/10 transition-all opacity-0 group-hover:opacity-100 ${
                      hoveredId === session.id ? 'opacity-100' : ''
                    }`}
                  >
                    <MoreHorizontal size={14} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={(e) => openEditDialog(e as any, session)}>
                    <Pencil size={14} />
                    编辑标题
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => handlePin(e as any, session)}>
                    {session.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                    {session.pinned ? '取消置顶' : '置顶'}
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={(e) => handleDelete(e as any, session.id)}>
                    <Trash2 size={14} />
                    删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </ScrollArea>

      <Separator className="mx-2 w-auto" />
      <div className="p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="group w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer">
              <div className="w-7 h-7 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <User size={14} />
              </div>
              <span className="flex-1 truncate text-left">{user?.email || user?.phone || '用户'}</span>
              <ChevronDown size={14} className="opacity-40 group-hover:opacity-70 transition-opacity" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-52">
            <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('open-settings'))} className="gap-2">
              <Settings size={14} className="shrink-0" />
              设置
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleTheme} className="gap-2">
              {isDark ? <Sun size={14} className="shrink-0" /> : <Moon size={14} className="shrink-0" />}
              {isDark ? '切换亮色' : '切换暗色'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLogoutConfirmOpen(true)} className="gap-2 text-destructive focus:text-destructive">
              <LogOut size={14} className="shrink-0" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>确认退出登录</DialogTitle>
            <DialogDescription>
              退出后需要重新登录，当前未保存的数据可能会丢失。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" size="sm" onClick={() => setLogoutConfirmOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" size="sm" onClick={() => logout()}>
              确认退出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingSession} onOpenChange={(open) => !open && setEditingSession(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>编辑会话标题</DialogTitle>
          </DialogHeader>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleEditSave();
              if (e.key === 'Escape') setEditingSession(null);
            }}
            className="w-full px-3 py-2 rounded-md bg-background border border-input text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            autoFocus
          />
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" size="sm" onClick={() => setEditingSession(null)}>
              取消
            </Button>
            <Button size="sm" onClick={handleEditSave}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
