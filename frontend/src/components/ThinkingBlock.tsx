import { useState } from 'react';
import { Lightbulb, ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ThinkingBlockProps {
  thinking: string;
}

function stripThinkTags(content: string): string {
  return content.replace(/<think>|<\/think>/g, '').trim();
}

export function ThinkingBlock({ thinking }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const cleanThinking = stripThinkTags(thinking);

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <Card className="w-full border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:opacity-80 transition-opacity">
            <Lightbulb size={14} />
            <span>思考中</span>
            <ChevronDown
              size={14}
              className={`ml-auto transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0">
            <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {cleanThinking}
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
