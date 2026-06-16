import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Save, Plug, Loader2, CheckCircle2, Database, Server, Network } from 'lucide-react';
import { fetchSettings, updateSettings, testMilvusConnection } from '@/hooks/useSettings';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function MilvusSettingsSection() {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [processing, setProcessing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    fetchSettings().then((data) => {
      setHost(data.milvus.host || '');
      setPort(data.milvus.port || '');
    }).catch(() => {});
  }, []);

  const validate = () => {
    if (!host.trim()) return 'Host 不能为空';
    if (!port.trim()) return 'Port 不能为空';
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum <= 0 || portNum > 65535) return 'Port 必须是 1-65535 之间的整数';
    return '';
  };

  const doTest = async () => {
    return testMilvusConnection(host.trim(), port.trim());
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setProcessing(true);
    try {
      const result = await doTest();
      if (!result.success) {
        toast.error(`测试失败: ${result.message}`);
        return;
      }
      await updateSettings({ milvus_host: host.trim(), milvus_port: port.trim() });
      toast.success('保存成功');
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (e: any) {
      toast.error(e.message || '保存失败');
    } finally {
      setProcessing(false);
    }
  };

  const handleTest = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setTesting(true);
    try {
      const result = await doTest();
      if (result.success) {
        toast.success(`测试成功: ${result.message}`);
      } else {
        toast.error(`测试失败: ${result.message}`);
      }
    } catch (e: any) {
      toast.error(e.message || '测试失败');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 animate-fade-in">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-md shadow-indigo-500/30 ring-1 ring-white/20 flex-shrink-0">
          <Database size={18} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">向量数据库</h2>
          <p className="text-sm text-muted-foreground mt-1">
            配置 Milvus 向量数据库连接信息。RAG 功能依赖此配置，点击保存时会自动测试。
          </p>
        </div>
      </div>

      <Card className="max-w-md animate-fade-in transition-all duration-300 hover:ring-indigo-500/30">
        <CardContent className="p-5 space-y-4">
          <div style={{ animation: 'slideUp 0.4s ease-out 0.1s both' }}>
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
              <Server size={13} className="text-indigo-500/70" />
              主机地址
            </label>
            <Input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="例如: localhost"
              className="transition-all"
            />
          </div>
          <div style={{ animation: 'slideUp 0.4s ease-out 0.2s both' }}>
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
              <Network size={13} className="text-indigo-500/70" />
              端口
            </label>
            <Input
              type="text"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="例如: 19530"
              className="transition-all"
            />
          </div>

          <div
            className="flex items-center gap-3 pt-2"
            style={{ animation: 'slideUp 0.4s ease-out 0.3s both' }}
          >
            <Button
              onClick={handleSave}
              disabled={processing || testing}
              className={`gap-1.5 justify-center w-[104px] border-0 text-white shadow-md ring-1 ring-white/20 transition-all ${
                savedFlash
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/30 hover:from-emerald-500 hover:to-emerald-600'
                  : 'bg-gradient-to-br from-indigo-500 to-blue-500 shadow-indigo-500/30 hover:from-indigo-600 hover:to-blue-600 hover:shadow-lg hover:shadow-indigo-500/40 disabled:opacity-50'
              }`}
            >
              {processing ? (
                <Loader2 size={13} className="animate-spin" />
              ) : savedFlash ? (
                <CheckCircle2 size={13} />
              ) : (
                <Save size={13} />
              )}
              {processing ? '测试中' : savedFlash ? '已保存' : '保存'}
            </Button>
            <Button
              onClick={handleTest}
              disabled={testing}
              variant="outline"
              className="gap-1.5 justify-center w-[104px] border-indigo-500/30 hover:bg-indigo-500/5 hover:border-indigo-500/50 hover:text-foreground transition-all"
            >
              {testing ? (
                <Loader2 size={13} className="animate-spin text-indigo-500" />
              ) : (
                <Plug size={13} className="text-indigo-500" />
              )}
              {testing ? '测试中' : '测试连接'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
