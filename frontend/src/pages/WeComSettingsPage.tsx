import { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Unlink, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { fetchWeComBindingStatus, unbindWeCom, bindWeCom } from '@/hooks/useApi';
import { useConfirm } from '@/hooks/useConfirm';

interface Props {
  onBack: () => void;
}

export function WeComSettingsPage({ onBack }: Props) {
  const [binding, setBinding] = useState<{ bound: boolean; bot_id?: string; bound_at?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [botId, setBotId] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState('');
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

  const handleSubmit = async () => {
    if (!botId.trim() || !secret.trim()) {
      setError('请填写 Bot ID 和 Secret');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await bindWeCom(botId.trim(), secret.trim());
      setBotId('');
      setSecret('');
      loadStatus();
    } catch (e: any) {
      setError(e.message || '绑定失败');
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-lg mx-auto p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6"
        >
          <ArrowLeft size={16} />
          返回聊天
        </button>

        <h1 className="text-2xl font-bold mb-2">企业微信设置</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          绑定企业微信机器人后，即可通过企微与 AI 对话。
        </p>

        {binding?.bound ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="text-green-500" size={24} />
              <div>
                <div className="font-medium">已绑定</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Bot ID: {binding.bot_id}
                </div>
              </div>
            </div>
            <button
              onClick={handleUnbind}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm"
            >
              <Unlink size={16} />
              解绑
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bot ID</label>
                <input
                  type="text"
                  autoComplete="off"
                  value={botId}
                  onChange={(e) => setBotId(e.target.value)}
                  placeholder="从企业微信后台获取"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Secret</label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="从企业微信后台获取"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-500">{error}</div>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                提交绑定
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog />
    </div>
  );
}
