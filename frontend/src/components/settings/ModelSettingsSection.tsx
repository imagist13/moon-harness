import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Save, Plug, Eye, EyeOff, Plus, Trash2, CheckCircle2, Loader2, Brain, Sparkles, ArrowUpDown, Cpu } from 'lucide-react';
import { fetchSettings, updateSettings, testModelConnection } from '@/hooks/useSettings';
import type { CustomModel } from '@/hooks/useSettings';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface ModelRow {
  id: string;
  type: 'llm' | 'embedding' | 'rerank';
  name: string;
  isDefault: boolean;
  apiKey: string;
  baseUrl: string;
  modelName: string;
  extra?: string;
  enabled: boolean;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

const TYPE_CONFIG = {
  llm: {
    icon: Brain,
    label: 'LLM',
    desc: '大语言模型',
    borderColor: 'border-l-blue-500',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    accentBg: 'bg-blue-500/5',
    extraLabel: '超时 (秒)',
    extraPlaceholder: '60',
    extraKey: 'timeout' as const,
  },
  embedding: {
    icon: Sparkles,
    label: 'Embedding',
    desc: '向量模型',
    borderColor: 'border-l-violet-500',
    badgeClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
    accentBg: 'bg-violet-500/5',
    extraLabel: '向量维度',
    extraPlaceholder: '1536',
    extraKey: 'dimension' as const,
  },
  rerank: {
    icon: ArrowUpDown,
    label: 'Rerank',
    desc: '重排模型',
    borderColor: 'border-l-amber-500',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    accentBg: 'bg-amber-500/5',
    extraLabel: '',
    extraPlaceholder: '',
    extraKey: null,
  },
};

const TYPE_ORDER: Array<'llm' | 'embedding' | 'rerank'> = ['llm', 'embedding', 'rerank'];

export function ModelSettingsSection() {
  const [rows, setRows] = useState<ModelRow[]>([]);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [savedFlash, setSavedFlash] = useState<Record<string, boolean>>({});

  const [adding, setAdding] = useState(false);
  const [newModel, setNewModel] = useState<Partial<CustomModel>>({ type: 'llm' });
  const [newTesting, setNewTesting] = useState(false);

  useEffect(() => {
    fetchSettings().then((data) => {
      const customsEnabled = new Map<string, boolean>();
      (data.custom_models || []).forEach((m: any) => {
        customsEnabled.set(m.id, m.enabled ?? false);
      });

      const defaultEnabled = data.default_models_enabled || {};
      const hasCustomLlm = (data.custom_models || []).some((m: any) => m.type === 'llm');
      const hasCustomEmbedding = (data.custom_models || []).some((m: any) => m.type === 'embedding');
      const hasCustomRerank = (data.custom_models || []).some((m: any) => m.type === 'rerank');

      const defaults: ModelRow[] = [
        {
          id: 'llm',
          type: 'llm',
          name: 'LLM 大模型',
          isDefault: true,
          apiKey: data.models.llm.api_key || '',
          baseUrl: data.models.llm.base_url || 'https://api.minimax.chat/v1',
          modelName: data.models.llm.model || 'MiniMax-M2.5',
          extra: data.models.llm.timeout || '60',
          enabled: defaultEnabled['llm'] ?? !hasCustomLlm,
        },
        {
          id: 'embedding',
          type: 'embedding',
          name: '向量模型',
          isDefault: true,
          apiKey: data.models.embedding.api_key || '',
          baseUrl: data.models.embedding.base_url || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
          modelName: data.models.embedding.model || 'text-embedding-v4',
          extra: data.models.embedding.dimension || '1536',
          enabled: defaultEnabled['embedding'] ?? !hasCustomEmbedding,
        },
        {
          id: 'rerank',
          type: 'rerank',
          name: '重排模型',
          isDefault: true,
          apiKey: data.models.rerank.api_key || '',
          baseUrl: data.models.rerank.base_url || 'https://dashscope.aliyuncs.com/api/v1/services/rerank/text-rerank/text-rerank',
          modelName: data.models.rerank.model || 'qwen3-vl-rerank',
          enabled: defaultEnabled['rerank'] ?? !hasCustomRerank,
        },
      ];
      const customs: ModelRow[] = (data.custom_models || []).map((m: any) => ({
        id: m.id,
        type: m.type,
        name: m.name,
        isDefault: false,
        apiKey: m.api_key,
        baseUrl: m.base_url,
        modelName: m.model,
        extra: m.timeout || m.dimension,
        enabled: m.enabled ?? false,
      }));
      setRows([...defaults, ...customs]);
    }).catch(() => {});
  }, []);

  const showMsg = (type: 'success' | 'error', message: string) => {
    if (type === 'success') {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  const validateRow = (row: Pick<ModelRow, 'apiKey' | 'baseUrl' | 'modelName' | 'type' | 'extra'>) => {
    if (!row.apiKey.trim()) return 'API Key 不能为空';
    if (!row.baseUrl.trim()) return 'Base URL 不能为空';
    if (!row.modelName.trim()) return '模型名称 不能为空';
    if (row.type === 'llm' && row.extra) {
      const t = parseInt(row.extra, 10);
      if (isNaN(t) || t <= 0) return '超时时间必须是正整数';
    }
    if (row.type === 'embedding' && row.extra) {
      const d = parseInt(row.extra, 10);
      if (isNaN(d) || d <= 0) return '向量维度必须是正整数';
    }
    return '';
  };

  const doTest = async (type: 'llm' | 'embedding' | 'rerank', apiKey: string, baseUrl: string, modelName: string) => {
    return testModelConnection(type, { api_key: apiKey, base_url: baseUrl, model: modelName });
  };

  const buildCustomModelsPayload = (currentRows: ModelRow[]) => {
    return currentRows
      .filter((r) => !r.isDefault)
      .map((r) => ({
        id: r.id,
        type: r.type,
        name: r.name,
        api_key: r.apiKey,
        base_url: r.baseUrl,
        model: r.modelName,
        timeout: r.type === 'llm' ? r.extra : undefined,
        dimension: r.type === 'embedding' ? r.extra : undefined,
        enabled: r.enabled,
      }));
  };

  const buildDefaultEnabledPayload = (currentRows: ModelRow[]) => {
    const payload: Record<string, boolean> = {};
    currentRows.filter((r) => r.isDefault).forEach((r) => {
      payload[r.type] = r.enabled;
    });
    return payload;
  };


  const doSave = async (row: ModelRow) => {
    if (row.isDefault) {
      const payload: Record<string, string> = {};
      if (row.type === 'llm') {
        payload.minimax_api_key = row.apiKey;
        payload.minimax_base_url = row.baseUrl;
        payload.minimax_model = row.modelName;
        payload.minimax_timeout = row.extra || '60';
      } else if (row.type === 'embedding') {
        payload.bailian_api_key = row.apiKey;
        payload.bailian_embedding_url = row.baseUrl;
        payload.bailian_embedding_model = row.modelName;
        payload.bailian_embedding_dim = row.extra || '1536';
      } else if (row.type === 'rerank') {
        payload.bailian_rerank_api_key = row.apiKey;
        payload.bailian_rerank_url = row.baseUrl;
        payload.bailian_rerank_model = row.modelName;
      }
      await updateSettings(payload);
    } else {
      await updateSettings({ custom_models: JSON.stringify(buildCustomModelsPayload(rows)) });
    }
  };

  const handleSave = async (row: ModelRow) => {
    const err = validateRow(row);
    if (err) {
      showMsg('error', err);
      return;
    }
    setProcessing((p) => ({ ...p, [row.id]: true }));
    try {
      const result = await doTest(row.type, row.apiKey, row.baseUrl, row.modelName);
      if (!result.success) {
        showMsg('error', `测试失败: ${result.message}`);
        return;
      }
      await doSave(row);
      showMsg('success', '保存成功');
      setSavedFlash((p) => ({ ...p, [row.id]: true }));
      setTimeout(() => setSavedFlash((p) => ({ ...p, [row.id]: false })), 1500);
    } catch (e: any) {
      showMsg('error', e.message || '保存失败');
    } finally {
      setProcessing((p) => ({ ...p, [row.id]: false }));
    }
  };

  const handleTestOnly = async (row: ModelRow) => {
    const err = validateRow(row);
    if (err) {
      showMsg('error', err);
      return;
    }
    setTesting((p) => ({ ...p, [row.id]: true }));
    try {
      const result = await doTest(row.type, row.apiKey, row.baseUrl, row.modelName);
      if (result.success) {
        showMsg('success', `测试成功: ${result.message}`);
      } else {
        showMsg('error', `测试失败: ${result.message}`);
      }
    } catch (e: any) {
      showMsg('error', e.message || '测试失败');
    } finally {
      setTesting((p) => ({ ...p, [row.id]: false }));
    }
  };

  const handleDelete = async (row: ModelRow) => {
    const updated = rows.filter((r) => r.id !== row.id);
    setRows(updated);

    if (row.isDefault) {
      const payload: Record<string, string> = {};
      if (row.type === 'llm') {
        payload.minimax_api_key = '';
        payload.minimax_base_url = '';
        payload.minimax_model = '';
        payload.minimax_timeout = '';
      } else if (row.type === 'embedding') {
        payload.bailian_api_key = '';
        payload.bailian_embedding_url = '';
        payload.bailian_embedding_model = '';
        payload.bailian_embedding_dim = '';
      } else if (row.type === 'rerank') {
        payload.bailian_rerank_api_key = '';
        payload.bailian_rerank_url = '';
        payload.bailian_rerank_model = '';
      }
      payload.default_models_enabled = JSON.stringify(buildDefaultEnabledPayload(updated));
      await updateSettings(payload);
    } else {
      await updateSettings({
        custom_models: JSON.stringify(buildCustomModelsPayload(updated)),
        default_models_enabled: JSON.stringify(buildDefaultEnabledPayload(updated)),
      });
    }
    showMsg('success', '删除成功');
  };

  const handleTestNew = async () => {
    if (!newModel.name?.trim() || !newModel.api_key?.trim() || !newModel.base_url?.trim() || !newModel.model?.trim()) {
      showMsg('error', '请填写完整信息');
      return;
    }
    setNewTesting(true);
    try {
      const result = await doTest(
        (newModel.type || 'llm') as any,
        newModel.api_key,
        newModel.base_url,
        newModel.model
      );
      if (result.success) {
        showMsg('success', `测试成功: ${result.message}`);
      } else {
        showMsg('error', `测试失败: ${result.message}`);
      }
    } catch (e: any) {
      showMsg('error', e.message || '测试失败');
    } finally {
      setNewTesting(false);
    }
  };

  const handleAddCustom = async () => {
    if (!newModel.name?.trim() || !newModel.api_key?.trim() || !newModel.base_url?.trim() || !newModel.model?.trim()) {
      showMsg('error', '请填写完整信息');
      return;
    }
    const type = newModel.type || 'llm';
    const row: ModelRow = {
      id: generateId(),
      type: type as any,
      name: newModel.name.trim(),
      isDefault: false,
      apiKey: newModel.api_key,
      baseUrl: newModel.base_url,
      modelName: newModel.model,
      extra: newModel.timeout || newModel.dimension,
      enabled: true,
    };

    setProcessing((p) => ({ ...p, [row.id]: true }));
    try {
      const result = await doTest(row.type, row.apiKey, row.baseUrl, row.modelName);
      if (!result.success) {
        showMsg('error', `测试失败: ${result.message}`);
        return;
      }

      // New model enabled = true; disable all others (custom + default) of the same type
      const updatedRows = rows.map((r) =>
        r.type === type ? { ...r, enabled: false } : r
      );
      updatedRows.push(row);

      await updateSettings({
        custom_models: JSON.stringify(buildCustomModelsPayload(updatedRows)),
        default_models_enabled: JSON.stringify(buildDefaultEnabledPayload(updatedRows)),
      });
      setRows(updatedRows);
      setAdding(false);
      setNewModel({ type: 'llm' });
      showMsg('success', '添加成功');
    } catch (e: any) {
      showMsg('error', e.message || '添加失败');
    } finally {
      setProcessing((p) => ({ ...p, [row.id]: false }));
    }
  };

  const handleToggleEnabled = async (targetRow: ModelRow) => {
    const newEnabled = !targetRow.enabled;
    let updatedRows: ModelRow[];

    if (newEnabled) {
      // Enabling: disable all others of the same type (including default and customs)
      updatedRows = rows.map((r) => {
        if (r.id === targetRow.id) return { ...r, enabled: true };
        if (r.type === targetRow.type) return { ...r, enabled: false };
        return r;
      });
    } else {
      // Disabling: only flip this one, do not auto-enable anything else
      updatedRows = rows.map((r) =>
        r.id === targetRow.id ? { ...r, enabled: false } : r
      );
    }

    setRows(updatedRows);

    try {
      await updateSettings({
        custom_models: JSON.stringify(buildCustomModelsPayload(updatedRows)),
        default_models_enabled: JSON.stringify(buildDefaultEnabledPayload(updatedRows)),
      });
      showMsg('success', newEnabled ? '已启用' : '已停用');
    } catch (e: any) {
      showMsg('error', e.message || '保存失败');
      setRows(rows);
    }
  };

  const updateRow = (id: string, patch: Partial<ModelRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const renderModelCard = (row: ModelRow) => {
    const cfg = TYPE_CONFIG[row.type];
    const Icon = cfg.icon;
    return (
      <Card key={row.id} className={`border-l-[3px] ${cfg.borderColor} overflow-hidden animate-fade-in transition-all duration-300 hover:ring-indigo-500/30`}>
        <CardContent className="p-0">
          {/* Card Header */}
          <div className={`flex items-center justify-between px-5 py-3 ${cfg.accentBg}`}>
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${cfg.badgeClass}`}>
                <Icon size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{row.name}</span>
                  <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${cfg.badgeClass}`}>
                    {cfg.label}
                  </Badge>
                  {row.isDefault && (
                    <span className="text-[10px] text-muted-foreground">默认</span>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground">{cfg.desc}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 mr-1">
                <Switch
                  checked={row.enabled}
                  onCheckedChange={() => handleToggleEnabled(row)}
                  size="sm"
                />
                <span className={`text-[11px] ${row.enabled ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {row.enabled ? '启用' : '停用'}
                </span>
              </div>
              <Button
                onClick={() => handleSave(row)}
                disabled={processing[row.id] || testing[row.id]}
                size="sm"
                className={`gap-1.5 h-8 px-3 border-0 text-white shadow-md ring-1 ring-white/20 transition-all ${
                  savedFlash[row.id]
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/30 hover:from-emerald-500 hover:to-emerald-600'
                    : 'bg-gradient-to-br from-indigo-500 to-blue-500 shadow-indigo-500/30 hover:from-indigo-600 hover:to-blue-600 hover:shadow-lg hover:shadow-indigo-500/40 disabled:opacity-50'
                }`}
              >
                {processing[row.id] ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : savedFlash[row.id] ? (
                  <CheckCircle2 size={13} />
                ) : (
                  <Save size={13} />
                )}
                {processing[row.id] ? '处理中' : savedFlash[row.id] ? '已保存' : '保存'}
              </Button>
              <Button
                onClick={() => handleTestOnly(row)}
                disabled={testing[row.id]}
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 px-3 border-indigo-500/30 hover:bg-indigo-500/5 hover:border-indigo-500/50 hover:text-foreground transition-all"
              >
                {testing[row.id] ? (
                  <Loader2 size={13} className="animate-spin text-indigo-500" />
                ) : (
                  <Plug size={13} className="text-indigo-500" />
                )}
                {testing[row.id] ? '测试中' : '测试'}
              </Button>
              <Button
                onClick={() => handleDelete(row)}
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive h-8 w-8"
                title="删除"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>

          {/* Card Body */}
          <div className="px-5 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
              {/* API Key */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">API Key</label>
                <div className="relative">
                  <Input
                    type={showKey[row.id] ? 'text' : 'password'}
                    value={row.apiKey}
                    onChange={(e) => updateRow(row.id, { apiKey: e.target.value })}
                    className="pr-9 h-8 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((p) => ({ ...p, [row.id]: !p[row.id] }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKey[row.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              {/* Base URL */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">Base URL</label>
                <Input
                  type="text"
                  value={row.baseUrl}
                  onChange={(e) => updateRow(row.id, { baseUrl: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              {/* Model Name */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">模型名称</label>
                <Input
                  type="text"
                  value={row.modelName}
                  onChange={(e) => updateRow(row.id, { modelName: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              {/* Extra: timeout / dimension */}
              {cfg.extraKey && (
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">{cfg.extraLabel}</label>
                  <Input
                    type="text"
                    value={row.extra || ''}
                    onChange={(e) => updateRow(row.id, { extra: e.target.value })}
                    placeholder={cfg.extraPlaceholder}
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 animate-fade-in">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-md shadow-indigo-500/30 ring-1 ring-white/20 flex-shrink-0">
            <Cpu size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">模型配置</h2>
            <p className="text-xs text-muted-foreground mt-1">
              配置 LLM、Embedding 和 Rerank 模型参数。点击保存时会自动测试，测试通过直接保存。
            </p>
          </div>
        </div>
        <Button
          onClick={() => setAdding(true)}
          variant="outline"
          size="sm"
          className="gap-1.5 shrink-0 rounded-lg border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-500/50 hover:text-foreground transition-all"
        >
          <Plus size={14} className="text-indigo-500" />
          添加模型
        </Button>
      </div>

      {/* Model Cards grouped by type */}
      <div className="space-y-6">
        {TYPE_ORDER.map((type) => {
          const cfg = TYPE_CONFIG[type];
          const typeRows = rows.filter((r) => r.type === type);
          if (typeRows.length === 0) return null;
          const Icon = cfg.icon;
          return (
            <div key={type} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Icon size={16} className="text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">{cfg.label}</h3>
                <span className="text-xs text-muted-foreground">{cfg.desc}</span>
                <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ml-auto ${cfg.badgeClass}`}>
                  {typeRows.length} 个模型
                </Badge>
              </div>
              <div className="space-y-3">
                {typeRows.map((row) => renderModelCard(row))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add model dialog */}
      <Dialog open={adding} onOpenChange={(open) => { if (!open) setNewModel({ type: 'llm' }); setAdding(open); }}>
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>添加新模型</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">类型</label>
              <div className="flex gap-2">
                {(Object.entries(TYPE_CONFIG) as [keyof typeof TYPE_CONFIG, typeof TYPE_CONFIG.llm][]).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  const selected = (newModel.type || 'llm') === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setNewModel((p) => ({ ...p, type: key as any }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        selected
                          ? `${cfg.badgeClass} border-current`
                          : 'border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon size={13} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">名称</label>
              <Input
                type="text"
                value={newModel.name || ''}
                onChange={(e) => setNewModel((p) => ({ ...p, name: e.target.value }))}
                placeholder="例如: OpenAI GPT-4"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">API Key</label>
              <div className="relative">
                <Input
                  type={showKey['add-new'] ? 'text' : 'password'}
                  value={newModel.api_key || ''}
                  onChange={(e) => setNewModel((p) => ({ ...p, api_key: e.target.value }))}
                  className="pr-9 h-8 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((p) => ({ ...p, 'add-new': !p['add-new'] }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey['add-new'] ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">Base URL</label>
              <Input
                type="text"
                value={newModel.base_url || ''}
                onChange={(e) => setNewModel((p) => ({ ...p, base_url: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">模型名称</label>
              <Input
                type="text"
                value={newModel.model || ''}
                onChange={(e) => setNewModel((p) => ({ ...p, model: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
            {(newModel.type || 'llm') !== 'rerank' && (
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                  {(newModel.type || 'llm') === 'llm' ? '超时 (秒)' : '向量维度'}
                </label>
                <Input
                  type="text"
                  value={(newModel.type || 'llm') === 'llm' ? (newModel.timeout || '') : (newModel.dimension || '')}
                  onChange={(e) => setNewModel((p) =>
                    (newModel.type || 'llm') === 'llm'
                      ? { ...p, timeout: e.target.value }
                      : { ...p, dimension: e.target.value }
                  )}
                  placeholder={(newModel.type || 'llm') === 'llm' ? '60' : '1536'}
                  className="h-8 text-xs"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={handleTestNew}
              disabled={newTesting}
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 border-indigo-500/30 hover:bg-indigo-500/5 hover:border-indigo-500/50 hover:text-foreground transition-all"
            >
              {newTesting ? <Loader2 size={13} className="animate-spin text-indigo-500" /> : <Plug size={13} className="text-indigo-500" />}
              {newTesting ? '测试中...' : '测试'}
            </Button>
            <Button
              onClick={handleAddCustom}
              disabled={newTesting}
              size="sm"
              className="gap-1.5 h-8 border-0 bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-md shadow-indigo-500/30 ring-1 ring-white/20 hover:from-indigo-600 hover:to-blue-600 hover:shadow-lg hover:shadow-indigo-500/40 disabled:opacity-50 transition-all"
            >
              <Plus size={13} /> 添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
