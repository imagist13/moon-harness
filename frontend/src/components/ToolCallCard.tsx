import { useState } from 'react';
import { ToolCallInfo } from '@/types';
import { Wrench, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ToolCallCardProps {
  tool: ToolCallInfo;
}

export function ToolCallCard({ tool }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig = {
    running: { icon: <Loader2 size={14} className="animate-spin" />, variant: 'default' as const, label: '运行中' },
    success: { icon: <CheckCircle2 size={14} />, variant: 'secondary' as const, label: '成功' },
    error: { icon: <XCircle size={14} />, variant: 'destructive' as const, label: '失败' },
  };

  const config = statusConfig[tool.status] || statusConfig.running;
  const hasBody = tool.input || tool.output;

  return (
    <Card className="w-full border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 overflow-hidden">
      <button
        type="button"
        onClick={() => hasBody && setExpanded((v) => !v)}
        className={`flex items-center gap-2 px-3 py-2 text-xs font-medium w-full ${hasBody ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5' : 'cursor-default'}`}
      >
        <Wrench size={14} className="text-emerald-600 dark:text-emerald-400" />
        <span className="text-muted-foreground">{tool.name}</span>
        <span className="ml-auto flex items-center gap-1.5">
          <Badge variant={config.variant} className="gap-1">
            {config.icon}
            {config.label}
          </Badge>
          {hasBody && (
            expanded
              ? <ChevronUp size={14} className="text-muted-foreground" />
              : <ChevronDown size={14} className="text-muted-foreground" />
          )}
        </span>
      </button>

      {expanded && (
        <CardContent className="border-t border-emerald-200 dark:border-emerald-800 px-3 py-0">
          {tool.input && (
            <div className="px-3 py-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">输入</div>
              <pre className="text-[11px] text-muted-foreground bg-black/5 dark:bg-white/5 rounded p-1.5 overflow-auto whitespace-pre-wrap break-all max-h-60">
                {JSON.stringify(tool.input, null, 2)}
              </pre>
            </div>
          )}

          {tool.output && (
            <div className="px-3 py-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">输出</div>
              <pre className="text-[11px] text-muted-foreground bg-black/5 dark:bg-white/5 rounded p-1.5 overflow-auto whitespace-pre-wrap break-all max-h-60">
                {(() => {
                  try {
                    const parsed = JSON.parse(tool.output);
                    return JSON.stringify(parsed, null, 2);
                  } catch {
                    return tool.output;
                  }
                })()}
              </pre>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
