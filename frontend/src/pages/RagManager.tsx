import { useState, useEffect, useRef } from 'react';
import {
  fetchRagDocuments,
  uploadRagDocument,
  deleteRagDocument,
  retrainRagDocument,
  testRagRetrieval,
  fetchRagStats,
  fetchRagDocumentChunks,
  fetchRagDomains,
  createRagDomain,
  deleteRagDomain,
  updateRagDomain,
} from '@/hooks/useApi';
import { useConfirm } from '@/hooks/useConfirm';
import { toast } from 'sonner';
import {
  Upload,
  Trash2,
  RefreshCw,
  Search,
  FileText,
  ChevronLeft,
  Settings,
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
  Database,
  Eye,
  Plus,
  Folder,
  Edit2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RagDoc {
  id: string;
  domain_id: string;
  filename: string;
  file_type: string;
  status: string;
  chunk_count: number;
  chunk_size: number;
  chunk_overlap: number;
  smart_split: number;
  error_msg: string | null;
  created_at: string;
  updated_at: string;
}

interface Domain {
  id: string;
  name: string;
  description: string;
  doc_count: number;
  created_at: string;
}

interface RagManagerProps {
  onBack: () => void;
}

export function RagManager({ onBack }: RagManagerProps) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState('default');
  const [docs, setDocs] = useState<RagDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState({ ready_documents: 0, milvus: { doc_count: 0 } });
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({ chunk_size: 500, chunk_overlap: 50, smart_split: true });
  const [retrainingId, setRetrainingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Domain management
  const [showCreateDomain, setShowCreateDomain] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [newDomainDesc, setNewDomainDesc] = useState('');
  const [creatingDomain, setCreatingDomain] = useState(false);

  // Domain editing
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
  const [editDomainName, setEditDomainName] = useState('');
  const [editDomainDesc, setEditDomainDesc] = useState('');
  const [updatingDomain, setUpdatingDomain] = useState(false);

  // Chunks viewer state
  const [viewingDoc, setViewingDoc] = useState<RagDoc | null>(null);
  const [docChunks, setDocChunks] = useState<any[]>([]);
  const [chunksLoading, setChunksLoading] = useState(false);

  const { confirm, ConfirmDialog } = useConfirm();

  // Load domains
  useEffect(() => {
    fetchRagDomains().then((items) => {
      setDomains(items);
      if (items.length > 0 && !items.find((d: Domain) => d.id === selectedDomainId)) {
        setSelectedDomainId(items[0].id);
      }
    }).catch(console.error);
  }, [refreshTrigger]);

  // Smart polling: only poll when docs are processing
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let pollCount = 0;
    const MAX_POLLS = 10;
    const POLL_INTERVAL = 5000;
    const processingStatuses = ['pending', 'parsing', 'segmenting', 'embedding'];

    const fetchAndUpdate = async () => {
      try {
        const data = await fetchRagDocuments(selectedDomainId);
        const items: RagDoc[] = data.items || [];
        setDocs(items);
        const s = await fetchRagStats(selectedDomainId);
        setStats(s);
        return items.some((d) => processingStatuses.includes(d.status));
      } catch (e) {
        console.error(e);
        return false;
      }
    };

    const startPolling = async () => {
      const hasProcessing = await fetchAndUpdate();
      if (hasProcessing) {
        intervalId = setInterval(async () => {
          pollCount += 1;
          const stillProcessing = await fetchAndUpdate();
          if (!stillProcessing || pollCount >= MAX_POLLS) {
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
          }
        }, POLL_INTERVAL);
      }
    };

    const timer = setTimeout(startPolling, 50);

    return () => {
      clearTimeout(timer);
      if (intervalId) clearInterval(intervalId);
    };
  }, [refreshTrigger, selectedDomainId]);

  const handleUpload = async (file: File) => {
    if (uploading) return;
    setUploading(true);
    try {
      await uploadRagDocument(file, config, selectedDomainId);
      setRefreshTrigger((n) => n + 1);
    } catch (e: any) {
      toast.error(e.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm('确定删除此文档？');
    if (!ok) return;
    setLoading(true);
    try {
      await deleteRagDocument(id);
      setRefreshTrigger((n) => n + 1);
    } catch (e: any) {
      toast.error(e.message || '删除失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRetrain = async (doc: RagDoc) => {
    const ok = await confirm('确定重新训练此文档？');
    if (!ok) return;
    setRetrainingId(doc.id);
    try {
      await retrainRagDocument(doc.id, {
        chunk_size: doc.chunk_size,
        chunk_overlap: doc.chunk_overlap,
        smart_split: Boolean(doc.smart_split),
      });
      setRefreshTrigger((n) => n + 1);
    } catch (e: any) {
      toast.error(e.message || '重新训练失败');
    } finally {
      setRetrainingId(null);
    }
  };

  const handleViewChunks = async (doc: RagDoc) => {
    if (doc.status !== 'ready' || !doc.chunk_count) return;
    setViewingDoc(doc);
    setChunksLoading(true);
    setDocChunks([]);
    try {
      const chunks = await fetchRagDocumentChunks(doc.id);
      setDocChunks(chunks);
    } catch (e: any) {
      toast.error(e.message || '获取 chunks 失败');
    } finally {
      setChunksLoading(false);
    }
  };

  const handleTest = async () => {
    if (!testQuery.trim()) return;
    setTesting(true);
    setTestResults(null);
    try {
      const res = await testRagRetrieval(testQuery.trim(), 20, 5, selectedDomainId);
      setTestResults(res);
    } catch (e: any) {
      toast.error(e.message || '测试失败');
    } finally {
      setTesting(false);
    }
  };

  const handleCreateDomain = async () => {
    if (!newDomainName.trim()) return;
    setCreatingDomain(true);
    try {
      await createRagDomain(newDomainName.trim(), newDomainDesc.trim());
      setNewDomainName('');
      setNewDomainDesc('');
      setShowCreateDomain(false);
      setRefreshTrigger((n) => n + 1);
    } catch (e: any) {
      toast.error(e.message || '创建领域失败');
    } finally {
      setCreatingDomain(false);
    }
  };

  const handleDeleteDomain = async (domain: Domain) => {
    if (domain.id === 'default') {
      toast.error('不能删除默认领域');
      return;
    }
    const ok = await confirm(`确定删除领域 "${domain.name}"？该领域下的所有文档将被删除。`);
    if (!ok) return;
    try {
      await deleteRagDomain(domain.id);
      if (selectedDomainId === domain.id) {
        setSelectedDomainId('default');
      }
      setRefreshTrigger((n) => n + 1);
    } catch (e: any) {
      toast.error(e.message || '删除领域失败');
    }
  };

  const handleStartEdit = (domain: Domain) => {
    setEditingDomain(domain);
    setEditDomainName(domain.name);
    setEditDomainDesc(domain.description || '');
  };

  const handleUpdateDomain = async () => {
    if (!editingDomain || !editDomainName.trim()) return;
    setUpdatingDomain(true);
    try {
      await updateRagDomain(editingDomain.id, editDomainName.trim(), editDomainDesc.trim());
      setEditingDomain(null);
      setEditDomainName('');
      setEditDomainDesc('');
      setRefreshTrigger((n) => n + 1);
    } catch (e: any) {
      toast.error(e.message || '更新领域失败');
    } finally {
      setUpdatingDomain(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { text: string; icon: any; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      ready: { text: '就绪', icon: CheckCircle, variant: 'secondary' },
      pending: { text: '等待中', icon: Clock, variant: 'outline' },
      parsing: { text: '解析中', icon: Loader2, variant: 'default' },
      segmenting: { text: '分割中', icon: Loader2, variant: 'default' },
      embedding: { text: '嵌入中', icon: Loader2, variant: 'default' },
      failed: { text: '失败', icon: AlertCircle, variant: 'destructive' },
    };
    const s = map[status] || { text: status, icon: Clock, variant: 'outline' };
    const Icon = s.icon;
    const isSpinning = s.text === '解析中' || s.text === '分割中' || s.text === '嵌入中';
    return (
      <Badge variant={s.variant} className="gap-1">
        <Icon size={12} className={isSpinning ? 'animate-spin' : ''} />
        {s.text}
      </Badge>
    );
  };

  const selectedDomain = domains.find((d) => d.id === selectedDomainId);

  return (
    <div className="flex h-screen w-screen bg-background">
      {/* Left Sidebar: Domain List */}
      <div className="w-56 flex flex-col bg-secondary/30">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Database size={16} />
            知识领域
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {domains.map((domain) => (
            <div
              key={domain.id}
              className={`group flex items-center gap-2 px-3 py-2 mx-2 rounded-lg cursor-pointer transition-colors ${
                selectedDomainId === domain.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
              onClick={() => setSelectedDomainId(domain.id)}
            >
              <Folder size={14} className="shrink-0" />
              <span className="text-sm flex-1 truncate">{domain.name}</span>
              <span className={`text-xs ${selectedDomainId === domain.id ? 'text-primary/70' : 'text-muted-foreground'}`}>
                {domain.doc_count || 0}
              </span>
              {domain.id !== 'default' && (
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all">
                  <Button
                    onClick={(e) => { e.stopPropagation(); handleStartEdit(domain); }}
                    variant="ghost"
                    size="icon-xs"
                    title="编辑"
                  >
                    <Edit2 size={10} />
                  </Button>
                  <Button
                    onClick={(e) => { e.stopPropagation(); handleDeleteDomain(domain); }}
                    variant="ghost"
                    size="icon-xs"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 size={10} />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="px-3 py-3">
          <Button
            onClick={() => setShowCreateDomain(true)}
            variant="outline"
            className="w-full justify-center gap-1.5 border-dashed"
          >
            <Plus size={14} />
            新建领域
          </Button>
        </div>
      </div>

      {/* Right Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              onClick={onBack}
              variant="ghost"
              size="icon"
            >
              <ChevronLeft size={18} />
            </Button>
            <h1 className="text-lg font-semibold text-foreground">
              {selectedDomain?.name || 'RAG 知识库管理'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Database size={14} />
              <span>{stats.ready_documents} 文档</span>
            </div>
            <Button
              onClick={() => setShowConfig(true)}
              variant="ghost"
              size="icon"
              title="分割配置"
            >
              <Settings size={16} />
            </Button>
          </div>
        </header>

        {/* Upload Area */}
        <div className="px-6 py-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            className={`border-2 border-dashed rounded-xl px-6 py-8 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-secondary'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md"
              onChange={onFileChange}
              className="hidden"
            />
            {uploading ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 size={18} className="animate-spin" />
                <span>上传中...</span>
              </div>
            ) : (
              <>
                <Upload size={24} className="mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  点击或拖拽上传文档（PDF、DOCX、TXT、MD）到 "{selectedDomain?.name}"
                </p>
                <p className="text-xs text-muted-foreground mt-1">最大 50MB</p>
              </>
            )}
          </div>
        </div>

        {/* Document List */}
        <div className="px-6 pb-4 flex-1 overflow-y-auto">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">文件名</th>
                    <th className="px-4 py-3 text-left font-medium">状态</th>
                    <th className="px-4 py-3 text-left font-medium">分块数</th>
                    <th className="px-4 py-3 text-left font-medium">创建时间</th>
                    <th className="px-4 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-secondary/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-muted-foreground" />
                          <span className="text-foreground truncate max-w-[200px]">{doc.filename}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{statusBadge(doc.status)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{doc.chunk_count || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(doc.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {doc.status === 'ready' && doc.chunk_count > 0 && (
                            <Button
                              onClick={() => handleViewChunks(doc)}
                              variant="ghost"
                              size="icon-xs"
                              title="查看分块"
                            >
                              <Eye size={13} />
                            </Button>
                          )}
                          <Button
                            onClick={() => handleRetrain(doc)}
                            disabled={retrainingId === doc.id || doc.status === 'parsing' || doc.status === 'segmenting' || doc.status === 'embedding'}
                            variant="ghost"
                            size="icon-xs"
                            title="重新训练"
                          >
                            <RefreshCw size={13} className={retrainingId === doc.id ? 'animate-spin' : ''} />
                          </Button>
                          <Button
                            onClick={() => handleDelete(doc.id)}
                            disabled={loading}
                            variant="ghost"
                            size="icon-xs"
                            className="text-destructive hover:text-destructive"
                            title="删除"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {docs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                        暂无文档，请上传
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Test Retrieval Panel */}
        <div className="px-6 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Search size={14} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">检索测试</span>
            <span className="text-xs text-muted-foreground">（仅在当前领域检索）</span>
          </div>
          <div className="flex gap-2">
            <Input
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTest()}
              placeholder="输入测试查询..."
              className="flex-1"
            />
            <Button
              onClick={handleTest}
              disabled={testing || !testQuery.trim()}
            >
              {testing ? '测试中...' : '测试'}
            </Button>
          </div>
          {testResults?.chunks && (
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {testResults.chunks.map((chunk: any, i: number) => (
                <Card key={i}>
                  <CardContent className="p-3 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-foreground">Chunk {chunk.chunk_index}</span>
                      <span className="text-muted-foreground">
                        相似度: {chunk.distance?.toFixed(4)}
                        {chunk.rerank_score && ` / 重排: ${chunk.rerank_score.toFixed(4)}`}
                      </span>
                    </div>
                    <p className="text-muted-foreground line-clamp-3">{chunk.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {testResults?.warning && (
            <p className="mt-2 text-xs text-yellow-500">{testResults.warning}</p>
          )}
        </div>
      </div>

      {/* Config Dialog */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="w-96">
          <DialogHeader>
            <DialogTitle>默认分割配置</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">块大小</label>
              <Input
                type="number"
                value={config.chunk_size}
                onChange={(e) => setConfig({ ...config, chunk_size: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">块重叠</label>
              <Input
                type="number"
                value={config.chunk_overlap}
                onChange={(e) => setConfig({ ...config, chunk_overlap: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="smart_split"
                checked={config.smart_split}
                onCheckedChange={(checked) => setConfig({ ...config, smart_split: checked })}
              />
              <label htmlFor="smart_split" className="text-sm text-muted-foreground">启用智能分割</label>
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={() => setShowConfig(false)} variant="outline">
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Domain Dialog */}
      <Dialog open={showCreateDomain} onOpenChange={setShowCreateDomain}>
        <DialogContent className="w-96">
          <DialogHeader>
            <DialogTitle>新建知识领域</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">名称</label>
              <Input
                value={newDomainName}
                onChange={(e) => setNewDomainName(e.target.value)}
                placeholder="例如：法律文档"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">描述</label>
              <Input
                value={newDomainDesc}
                onChange={(e) => setNewDomainDesc(e.target.value)}
                placeholder="可选描述"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setShowCreateDomain(false)} variant="outline">
              取消
            </Button>
            <Button
              onClick={handleCreateDomain}
              disabled={creatingDomain || !newDomainName.trim()}
            >
              {creatingDomain ? '创建中...' : '创建'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Domain Dialog */}
      <Dialog open={!!editingDomain} onOpenChange={(open) => !open && setEditingDomain(null)}>
        <DialogContent className="w-96">
          <DialogHeader>
            <DialogTitle>编辑知识领域</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">名称</label>
              <Input
                value={editDomainName}
                onChange={(e) => setEditDomainName(e.target.value)}
                placeholder="例如：法律文档"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">描述</label>
              <Input
                value={editDomainDesc}
                onChange={(e) => setEditDomainDesc(e.target.value)}
                placeholder="可选描述"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setEditingDomain(null)} variant="outline">
              取消
            </Button>
            <Button
              onClick={handleUpdateDomain}
              disabled={updatingDomain || !editDomainName.trim()}
            >
              {updatingDomain ? '保存中...' : '保存'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chunks Viewer Dialog */}
      <Dialog open={!!viewingDoc} onOpenChange={(open) => !open && setViewingDoc(null)}>
        <DialogContent className="!max-w-[56rem] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div>
              <DialogTitle>{viewingDoc?.filename}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                共 {viewingDoc?.chunk_count} 个 Chunk · 块大小 {viewingDoc?.chunk_size} · 重叠 {viewingDoc?.chunk_overlap}
              </p>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-2">
            {chunksLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm">加载中...</span>
              </div>
            ) : docChunks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">暂无 chunks</div>
            ) : (
              <div className="relative pl-10 py-2">
                {/* 时间轴线 */}
                <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-border rounded-full" />
                <div className="space-y-5">
                  {docChunks.map((chunk, i) => (
                    <div key={chunk.id || i} className="relative">
                      {/* 编号圆点 */}
                      <div className="absolute -left-10 top-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold shadow-sm">
                        {chunk.chunk_index}
                      </div>

                      <Card className="border-l-[3px] border-l-primary/60 shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                              #{chunk.chunk_index}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {chunk.content?.length || 0} 字符
                            </span>
                          </div>
                          <div className="relative">
                            <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-primary/20 via-primary/10 to-transparent" />
                            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap pl-3">{chunk.content}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </div>
  );
}
