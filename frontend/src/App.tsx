import { useEffect, useState } from 'react';
import { ChatPage } from '@/pages/ChatPage';
import { RagManager } from '@/pages/RagManager';
import { SettingsPage } from '@/pages/SettingsPage';
import { LoginPage } from '@/pages/LoginPage';
import { useThemeStore } from '@/stores/themeStore';
import { useAuthStore } from '@/stores/authStore';

function App() {
  const { isDark } = useThemeStore();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [page, setPage] = useState<'chat' | 'rag' | 'settings'>('chat');
  const [settingsTab, setSettingsTab] = useState<string>('wecom');

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (page === 'rag') {
    return <RagManager onBack={() => setPage('chat')} />;
  }

  if (page === 'settings') {
    return <SettingsPage onBack={() => setPage('chat')} initialTab={settingsTab} />;
  }

  return (
    <ChatPage
      onOpenSettings={(tab) => {
        setSettingsTab(tab || 'wecom');
        setPage('settings');
      }}
      onOpenRag={() => setPage('rag')}
    />
  );
}

export default App;
