import { useState } from 'react';
import { ArrowLeft, MessageSquare, Cpu, Database } from 'lucide-react';
import { WeComSettingsSection } from '@/components/settings/WeComSettingsSection';
import { ModelSettingsSection } from '@/components/settings/ModelSettingsSection';
import { MilvusSettingsSection } from '@/components/settings/MilvusSettingsSection';
import { Button } from '@/components/ui/button';

interface Props {
  onBack: () => void;
  initialTab?: string;
}

type TabKey = 'wecom' | 'models' | 'milvus';

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'wecom', label: '企微配置', icon: <MessageSquare size={16} /> },
  { key: 'models', label: '模型配置', icon: <Cpu size={16} /> },
  { key: 'milvus', label: '向量数据库', icon: <Database size={16} /> },
];

export function SettingsPage({ onBack, initialTab = 'wecom' }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab as TabKey);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex h-screen">
        {/* Left sidebar */}
        <div className="w-56 bg-secondary flex flex-col">
          <div className="px-4 py-4">
            <Button
              onClick={onBack}
              variant="ghost"
              className="gap-2 justify-start px-0 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft size={16} />
              返回聊天
            </Button>
          </div>
          <nav className="flex-1 p-2 space-y-1">
            {tabs.map((tab) => (
              <Button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                variant={activeTab === tab.key ? 'secondary' : 'ghost'}
                className={`w-full justify-start gap-2.5 px-3 py-2.5 h-auto text-sm font-medium text-left ${
                  activeTab === tab.key
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.icon}
                {tab.label}
              </Button>
            ))}
          </nav>
        </div>

        {/* Right content */}
        <div className="flex-1 overflow-y-auto">
          <div className={`mx-auto p-6 md:p-8 ${activeTab === 'models' ? 'max-w-7xl' : 'max-w-3xl'}`}>
            {activeTab === 'wecom' && <WeComSettingsSection />}
            {activeTab === 'models' && <ModelSettingsSection />}
            {activeTab === 'milvus' && <MilvusSettingsSection />}
          </div>
        </div>
      </div>
    </div>
  );
}
