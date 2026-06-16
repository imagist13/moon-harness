import { useState, useEffect, useMemo } from 'react';
import { ToolConfig } from '@/types';
import { fetchTools, toggleTool, createTool, updateTool, deleteTool } from '@/hooks/useApi';
import { Loader2, Plus, Trash2, Pencil, ChevronDown, Globe, Bot, Wrench } from 'lucide-react';
import { useConfirm } from '@/hooks/useConfirm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ToolsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function ParameterHint({ parameters }: { parameters?: Record<string, any> }) {
  if (!parameters || !parameters.properties) return null;

  const props = parameters.properties;
  const required = parameters.required || [];

  return (
    <div className="mt-3 pt-3 border-t border-dashed border-border/60">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">参数说明</p>
      <div className="space-y-2">
        {Object.entries(props).map(([key, info]: [string, any]) => (
          <div key={key} className="flex items-start gap-2">
            <Badge
              variant={required.includes(key) ? 'default' : 'secondary'}
              className="shrink-0 text-[10px] font-mono px-1.5 py-0 h-5 rounded"
            >
              {key}
              {required.includes(key) && <span className="ml-0.5">*</span>}
            </Badge>
            <span className="text-xs text-muted-foreground leading-5 mt-0.5">
              {info.description || info.type || ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE'];

const DEFAULT_PARAMETERS = {
  type: 'object',
  properties: {},
  required: [],
};

export function ToolsPanel({ isOpen, onClose }: ToolsPanelProps) {
  const [tools, setTools] = useState<ToolConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingTool, setEditingTool] = useState<ToolConfig | null>(null);
  const [formType, setFormType] = useState<'function' | 'api'>('api');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formMethod, setFormMethod] = useState('GET');
  const [formParameters, setFormParameters] = useState(JSON.stringify(DEFAULT_PARAMETERS, null, 2));
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    function: true,
    api: true,
  });

  useEffect(() => {
    if (isOpen) loadTools();
  }, [isOpen]);

  const loadTools = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTools();
      setTools(data);
    } catch (e) {
      setError('加载工具失败');
    } finally {
      setLoading(false);
    }
  };

  const functionTools = useMemo(() => tools.filter(t => t.type === 'function'), [tools]);
  const apiTools = useMemo(() => tools.filter(t => t.type === 'api'), [tools]);

  const handleToggle = async (name: string) => {
    setToggling(name);
    try {
      const result = await toggleTool(name);
      setTools(prev =>
        prev.map(t => t.name === name ? { ...t, enabled: result.enabled } : t)
      );
    } finally {
      setToggling(null);
    }
  };

  const openAddModal = (type: 'function' | 'api') => {
    setEditingTool(null);
    setFormType(type);
    setFormName('');
    setFormDescription('');
    setFormUrl('');
    setFormMethod('GET');
    setFormParameters(JSON.stringify(DEFAULT_PARAMETERS, null, 2));
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (tool: ToolConfig) => {
    setEditingTool(tool);
    setFormType(tool.type);
    setFormName(tool.name);
    setFormDescription(tool.description);
    setFormUrl(tool.config?.url || '');
    setFormMethod(tool.config?.method || 'GET');
    setFormParameters(JSON.stringify(tool.parameters || DEFAULT_PARAMETERS, null, 2));
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTool(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = '名称为必填项';
    if (!formDescription.trim()) errors.description = '描述为必填项';

    if (formType === 'api') {
      if (!formUrl.trim()) errors.url = '请求地址为必填项';
      if (!HTTP_METHODS.includes(formMethod)) errors.method = '无效的请求方式';
    }

    try {
      JSON.parse(formParameters);
    } catch {
      errors.parameters = 'JSON 格式无效';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const parameters = JSON.parse(formParameters);

      if (editingTool) {
        const updates: any = {
          description: formDescription.trim(),
          parameters,
        };
        if (formName.trim() !== editingTool.name) {
          updates.name = formName.trim();
        }
        if (editingTool.type === 'api') {
          updates.config = {
            url: formUrl.trim(),
            method: formMethod,
            headers: {},
            timeout: 30,
          };
        }
        await updateTool(editingTool.name, updates);
      } else {
        if (formType === 'api') {
          await createTool({
            name: formName.trim(),
            type: 'api',
            description: formDescription.trim(),
            parameters,
            config: {
              url: formUrl.trim(),
              method: formMethod,
              headers: {},
              timeout: 30,
            },
            enabled: true,
          });
        } else {
          await createTool({
            name: formName.trim(),
            type: 'function',
            description: formDescription.trim(),
            parameters,
            enabled: true,
          });
        }
      }
      await loadTools();
      closeModal();
    } catch (e: any) {
      setError(e.message || '保存工具失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (name: string) => {
    const ok = await confirm(`确认删除工具 "${name}"？`);
    if (!ok) return;
    setDeleting(name);
    try {
      await deleteTool(name);
      await loadTools();
    } catch (e: any) {
      setError(e.message || '删除工具失败');
    } finally {
      setDeleting(null);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const renderToolCard = (tool: ToolConfig, isApi: boolean) => {
    const typeCfg = isApi
      ? { border: 'border-l-primary', bg: 'bg-primary/5', iconBg: 'bg-primary/10', iconColor: 'text-primary' }
      : { border: 'border-l-amber-500', bg: 'bg-amber-500/5', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-600 dark:text-amber-400' };
    return (
      <div
        key={tool.name}
        className={`group relative rounded-xl border border-border ${typeCfg.border} border-l-[3px] ${typeCfg.bg} p-4 transition-all hover:border-primary/20`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${typeCfg.iconBg}`}>
              {isApi ? <Globe size={15} className={typeCfg.iconColor} /> : <Bot size={15} className={typeCfg.iconColor} />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{tool.name}</p>
              {isApi && tool.config?.url && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5 font-mono">
                  <span className="text-primary font-medium">{tool.config.method}</span> {tool.config.url}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              onClick={() => openEditModal(tool)}
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:text-foreground h-7 w-7"
              title="编辑"
            >
              <Pencil size={13} />
            </Button>
            <Button
              onClick={() => handleDelete(tool.name)}
              disabled={deleting === tool.name}
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:text-destructive h-7 w-7"
              title="删除"
            >
              {deleting === tool.name ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mt-2 line-clamp-2">{tool.description}</p>
        <ParameterHint parameters={tool.parameters} />
        <div className="absolute top-3.5 right-3.5">
          <Switch
            checked={tool.enabled}
            onCheckedChange={() => handleToggle(tool.name)}
            disabled={toggling === tool.name}
          />
        </div>
      </div>
    );
  };

  const renderSection = (title: string, icon: React.ReactNode, sectionKey: string, items: ToolConfig[], isApi: boolean) => (
    <div className="mb-4">
      <button
        onClick={() => toggleSection(sectionKey)}
        className="flex items-center justify-between w-full py-2 px-1 rounded-lg hover:bg-muted/50 transition-colors group"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="text-muted-foreground">{icon}</span>
          {title}
          <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
            {items.length}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`text-muted-foreground/60 transition-transform duration-200 ${expandedSections[sectionKey] ? 'rotate-180' : ''}`}
        />
      </button>
      {expandedSections[sectionKey] && (
        <div className="space-y-2.5 mt-1">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              {isApi ? <Globe size={28} className="opacity-20 mb-2" /> : <Bot size={28} className="opacity-20 mb-2" />}
              <p className="text-xs">{sectionKey === 'function' ? '暂无 Function 工具' : '暂无 API 工具'}</p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">点击上方按钮添加</p>
            </div>
          ) : (
            items.map(tool => renderToolCard(tool, isApi))
          )}
        </div>
      )}
    </div>
  );

  const enabledCount = useMemo(() => tools.filter(t => t.enabled).length, [tools]);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="sm:max-w-lg flex flex-col p-0">
          <SheetHeader className="px-5 py-4">
            <SheetTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wrench size={16} className="text-primary" />
              </div>
              <div>
                <div className="text-base font-medium">工具管理</div>
                <div className="text-xs text-muted-foreground font-normal">
                  {tools.length} 个工具 · {enabledCount} 个已启用
                </div>
              </div>
            </SheetTitle>
          </SheetHeader>

          <div className="px-5 pb-3 -mt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => openAddModal('function')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Bot size={13} />
                Function
              </button>
              <button
                onClick={() => openAddModal('api')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
              >
                <Plus size={13} />
                API
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-5">
            {error && (
              <div className="mb-3 p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Loader2 size={24} className="animate-spin mb-2" />
                <p className="text-xs">加载中...</p>
              </div>
            ) : (
              <>
                {renderSection('Function 工具', <Bot size={14} />, 'function', functionTools, false)}
                {renderSection('API 工具', <Globe size={14} />, 'api', apiTools, true)}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-[600px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTool
                ? (editingTool.type === 'function' ? '编辑 Function 工具' : '编辑 API 工具')
                : (formType === 'function' ? '添加 Function 工具' : '添加 API 工具')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {/* 创建模式：类型选择 */}
            {!editingTool && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">工具类型</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => setFormType('function')}
                    variant={formType === 'function' ? 'default' : 'outline'}
                    size="sm"
                    className="gap-1.5"
                  >
                    <Bot size={12} />
                    Function 描述型
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setFormType('api')}
                    variant={formType === 'api' ? 'default' : 'outline'}
                    size="sm"
                    className="gap-1.5"
                  >
                    <Globe size={12} />
                    API 接口
                  </Button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs text-muted-foreground mb-1">名称 <span className="text-destructive">*</span></label>
              <Input
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="例如：search_web"
              />
              {formErrors.name && <p className="text-xs text-destructive mt-1">{formErrors.name}</p>}
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">描述 <span className="text-destructive">*</span></label>
              <Textarea
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                rows={3}
                placeholder="这个工具的作用是什么？"
              />
              {formErrors.description && <p className="text-xs text-destructive mt-1">{formErrors.description}</p>}
            </div>

            {formType === 'api' && (
              <>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">请求地址 <span className="text-destructive">*</span></label>
                  <Input
                    type="text"
                    value={formUrl}
                    onChange={e => setFormUrl(e.target.value)}
                    placeholder="https://api.example.com/endpoint"
                  />
                  {formErrors.url && <p className="text-xs text-destructive mt-1">{formErrors.url}</p>}
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">请求方式 <span className="text-destructive">*</span></label>
                  <Select value={formMethod} onValueChange={setFormMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HTTP_METHODS.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.method && <p className="text-xs text-destructive mt-1">{formErrors.method}</p>}
                </div>
              </>
            )}

            {formType === 'function' && !editingTool && (
              <div className="p-3 rounded bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300 leading-5">
                <p className="font-medium mb-1">Function 工具说明</p>
                <p>Function 工具不需要具体的代码或 API 配置。只需提供名称、描述和参数定义，Agent 会根据描述自行决定如何处理调用请求。</p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-muted-foreground">参数（JSON Schema）</label>
                <Button
                  type="button"
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(formParameters);
                      setFormParameters(JSON.stringify(parsed, null, 2));
                      setFormErrors(prev => { const n = { ...prev }; delete n.parameters; return n; });
                    } catch {
                      setFormErrors(prev => ({ ...prev, parameters: 'JSON 格式无效，无法格式化' }));
                    }
                  }}
                  variant="outline"
                  size="xs"
                >
                  一键格式化
                </Button>
              </div>
              <Textarea
                value={formParameters}
                onChange={e => setFormParameters(e.target.value)}
                rows={10}
                spellCheck={false}
                className="font-mono leading-5 text-xs"
              />
              {formErrors.parameters && <p className="text-xs text-destructive mt-1">{formErrors.parameters}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              onClick={closeModal}
              variant="outline"
              size="sm"
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              size="sm"
              className="gap-1"
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              {editingTool ? '更新' : '创建'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </>
  );
}
