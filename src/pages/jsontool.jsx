import React, { useState, useCallback } from 'react';
import { Braces, Minimize2, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui';
import { ToolHeader, CodePanel, ActionBar, ActionButton, CopyButton, StatusBadge, NavHeader } from '@/components/ToolCard.jsx';

export default function Jsontool(props) {
  const { toast } = useToast();
  const navigateBack = props.$w.utils.navigateBack;
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState(null);
  const [indent, setIndent] = useState(2);

  const handleFormat = useCallback(() => {
    if (!input.trim()) { toast({ title: '请输入 JSON 数据', variant: 'destructive' }); return; }
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, indent));
      setStatus('success');
      toast({ title: '格式化成功', description: `缩进: ${indent} 空格` });
    } catch (e) {
      setOutput('');
      setStatus('error');
      const match = e.message.match(/position (\d+)/);
      const posInfo = match ? ` (位置 ${match[1]})` : '';
      toast({ title: 'JSON 格式错误', description: e.message + posInfo, variant: 'destructive' });
    }
  }, [input, indent, toast]);

  const handleMinify = useCallback(() => {
    if (!input.trim()) { toast({ title: '请输入 JSON 数据', variant: 'destructive' }); return; }
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setStatus('success');
      toast({ title: '压缩成功' });
    } catch (e) { setStatus('error'); toast({ title: 'JSON 格式错误', description: e.message, variant: 'destructive' }); }
  }, [input, toast]);

  const handleValidate = useCallback(() => {
    if (!input.trim()) { toast({ title: '请输入 JSON 数据', variant: 'destructive' }); return; }
    try {
      JSON.parse(input);
      setStatus('success');
      setOutput('✓ JSON 格式正确');
      toast({ title: '校验通过', description: 'JSON 数据格式有效' });
    } catch (e) { setStatus('error'); setOutput('✗ ' + e.message); toast({ title: '校验失败', description: e.message, variant: 'destructive' }); }
  }, [input, toast]);

  const handleSort = useCallback(() => {
    if (!input.trim()) { toast({ title: '请输入 JSON 数据', variant: 'destructive' }); return; }
    try {
      const sortObject = obj => {
        if (typeof obj !== 'object' || obj === null) return obj;
        if (Array.isArray(obj)) return obj.map(sortObject);
        return Object.keys(obj).sort().reduce((result, key) => { result[key] = sortObject(obj[key]); return result; }, {});
      };
      const parsed = JSON.parse(input);
      const sorted = sortObject(parsed);
      setOutput(JSON.stringify(sorted, null, indent));
      setStatus('success');
      toast({ title: '排序完成', description: '已按 key 字母顺序排序' });
    } catch (e) { setStatus('error'); toast({ title: 'JSON 格式错误', description: e.message, variant: 'destructive' }); }
  }, [input, indent, toast]);

  return <div className="min-h-screen bg-dev-bg">
      <NavHeader />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <ToolHeader title="JSON 格式化" description="格式化、压缩、校验 JSON 数据，支持 key 排序" onBack={() => props.$w.utils.navigateTo({ pageId: 'home', params: {} })} />
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-dev-muted">缩进:</span>
            {[2, 4, 8].map(n => <button key={n} onClick={() => setIndent(n)} className={`px-3 py-1 rounded text-xs font-mono transition-all duration-200 ${indent === n ? 'bg-dev-green/20 text-dev-green border border-dev-green/40' : 'bg-dev-panel text-dev-muted border border-dev-border hover:text-dev-text'}`}>
                {n} spaces
              </button>)}
          </div>
          {status && <StatusBadge type={status}>
              {status === 'success' ? '有效 JSON' : '格式错误'}
            </StatusBadge>}
        </div>
        <ActionBar>
          <ActionButton onClick={handleFormat} variant="primary">
            <span className="flex items-center gap-2"><Braces size={14} /> 格式化</span>
          </ActionButton>
          <ActionButton onClick={handleMinify} variant="secondary">
            <span className="flex items-center gap-2"><Minimize2 size={14} /> 压缩</span>
          </ActionButton>
          <ActionButton onClick={handleValidate} variant="secondary">
            <span className="flex items-center gap-2"><CheckCircle size={14} /> 校验</span>
          </ActionButton>
          <ActionButton onClick={handleSort} variant="secondary">
            <span className="flex items-center gap-2">A→Z 排序</span>
          </ActionButton>
          {output && <CopyButton text={output} />}
        </ActionBar>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <CodePanel title="输入" value={input} onChange={setInput} placeholder='{"name": "developer", "tools": ["json", "regex"]}' />
          <CodePanel title="输出" value={output} onChange={setOutput} placeholder="格式化结果将显示在这里..." readOnly />
        </div>
        <div className="mt-8">
          <span className="text-xs font-mono text-dev-muted mb-3 block">快速示例:</span>
          <div className="flex flex-wrap gap-2">
            {[{ label: '对象', json: '{"name":"张三","age":28,"skills":["React","Node.js"]}' }, { label: '数组', json: '[1,2,3,{"key":"value"}]' }, { label: '嵌套', json: '{"user":{"profile":{"name":"Dev","level":5}},"meta":{"count":100}}' }].map(ex => <button key={ex.label} onClick={() => { setInput(ex.json); setOutput(''); setStatus(null); }} className="px-3 py-1.5 rounded-lg text-xs font-mono bg-dev-panel border border-dev-border text-dev-muted hover:text-dev-text hover:border-dev-green/30 transition-all duration-200">
                {ex.label}
              </button>)}
          </div>
        </div>
      </main>
    </div>;
}
