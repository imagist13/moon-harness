import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Unlink, CheckCircle, Loader2, Eye, EyeOff, MessageSquare, Hash, Key, Sparkles } from 'lucide-react';
import { fetchWeComBindingStatus, unbindWeCom, bindWeCom } from '@/hooks/useApi';
import { useConfirm } from '@/hooks/useConfirm';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function WeComSettingsSection() {
  const [binding, setBinding] = useState<{ bound: boolean; bot_id?: string; bound_at?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [botId, setBotId] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const loadStatus = useCallback(async () => {
    try {
      const data = await fetchWeComBindingStatus();
      setBinding(data);
    } catch {
      setBinding({ bound: false });
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const validate = () => {
    if (!botId.trim()) return 'Bot ID 不能为空';
    if (!secret.trim()) return 'Secret 不能为空';
    if (botId.trim().length < 5) return 'Bot ID 长度不能少于 5 位';
    if (secret.trim().length < 5) return 'Secret 长度不能少于 5 位';
    return '';
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSubmitting(true);
    try {
      await bindWeCom(botId.trim(), secret.trim());
      setBotId('');
      setSecret('');
      toast.success('绑定成功');
      loadStatus();
    } catch (e: any) {
      toast.error(e.message || '绑定失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnbind = async () => {
    const ok = await confirm('确定要解绑企业微信机器人吗？');
    if (!ok) return;
    await unbindWeCom();
    loadStatus();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 animate-fade-in">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-md shadow-indigo-500/30 ring-1 ring-white/20 flex-shrink-0">
          <MessageSquare size={18} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">企业微信配置</h2>
          <p className="text-sm text-muted-foreground mt-1">
            绑定企业微信机器人后，即可通过企微与 AI 对话。
          </p>
        </div>
      </div>

      {binding?.bound ? (
        <Card className="animate-fade-in transition-all duration-300 hover:ring-emerald-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                <CheckCircle className="text-emerald-500 relative" size={20} />
              </div>
              <div>
                <div className="font-medium text-foreground">已绑定</div>
                <div className="text-sm text-muted-foreground font-mono">
                  Bot ID: {binding.bot_id}
                </div>
              </div>
            </div>
            <Button
              onClick={handleUnbind}
              variant="outline"
              size="sm"
              className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/60"
            >
              <Unlink size={14} />
              解绑
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="animate-fade-in transition-all duration-300 hover:ring-indigo-500/30">
          <CardContent className="p-6">
            <div className="space-y-4 max-w-md">
              <div style={{ animation: 'slideUp 0.4s ease-out 0.1s both' }}>
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                  <Hash size={13} className="text-indigo-500/70" />
                  Bot ID
                </label>
                <Input
                  type="text"
                  autoComplete="off"
                  value={botId}
                  onChange={(e) => setBotId(e.target.value)}
                  placeholder="从企业微信后台获取"
                  className="transition-all"
                />
              </div>
              <div style={{ animation: 'slideUp 0.4s ease-out 0.2s both' }}>
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                  <Key size={13} className="text-indigo-500/70" />
                  Secret
                </label>
                <div className="relative">
                  <Input
                    type={showSecret ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="从企业微信后台获取"
                    className="pr-10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting}
                style={{ animation: 'slideUp 0.4s ease-out 0.3s both' }}
                className="w-full gap-2 border-0 bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-md shadow-indigo-500/30 ring-1 ring-white/20 hover:from-indigo-600 hover:to-blue-600 hover:shadow-lg hover:shadow-indigo-500/40 disabled:opacity-50 transition-all"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {submitting ? '提交中...' : '提交绑定'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <ConfirmDialog />
    </div>
  );
}
