import React, { useState, useCallback } from 'react';
import { Code2, Unlock, Lock, Link, Unlink } from 'lucide-react';
import { useToast } from '@/components/ui';
import { ToolHeader, ActionBar, ActionButton, CopyButton, StatusBadge, NavHeader } from '@/components/ToolCard.jsx';

export default function Encodertool(props) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('base64');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  const handleBase64Encode = useCallback(() => {
    if (!input) { toast({ title: '请输入内容', variant: 'destructive' }); return; }
    try { setOutput(btoa(unescape(encodeURIComponent(input)))); toast({ title: 'Base64 编码成功' }); }
    catch (e) { toast({ title: '编码失败', description: e.message, variant: 'destructive' }); }
  }, [input, toast]);

  const handleBase64Decode = useCallback(() => {
    if (!input) { toast({ title: '请输入内容', variant: 'destructive' }); return; }
    try { setOutput(decodeURIComponent(escape(atob(input.trim())))); toast({ title: 'Base64 解码成功' }); }
    catch (e) { toast({ title: '解码失败', description: '无效的 Base64 字符串', variant: 'destructive' }); }
  }, [input, toast]);

  const handleUrlEncode = useCallback(() => {
    if (!input) { toast({ title: '请输入内容', variant: 'destructive' }); return; }
    try { setOutput(encodeURIComponent(input)); toast({ title: 'URL 编码成功' }); }
    catch (e) { toast({ title: '编码失败', description: e.message, variant: 'destructive' }); }
  }, [input, toast]);

  const handleUrlDecode = useCallback(() => {
    if (!input) { toast({ title: '请输入内容', variant: 'destructive' }); return; }
    try { setOutput(decodeURIComponent(input)); toast({ title: 'URL 解码成功' }); }
    catch (e) { toast({ title: '解码失败', description: '无效的 URL 编码字符串', variant: 'destructive' }); }
  }, [input, toast]);

  const handleHtmlEncode = useCallback(() => {
    if (!input) { toast({ title: '请输入内容', variant: 'destructive' }); return; }
    const div = document.createElement('div');
    div.textContent = input;
    setOutput(div.innerHTML);
    toast({ title: 'HTML 编码成功' });
  }, [input, toast]);

  const handleHtmlDecode = useCallback(() => {
    if (!input) { toast({ title: '请输入内容', variant: 'destructive' }); return; }
    const div = document.createElement('div');
    div.innerHTML = input;
    setOutput(div.textContent);
    toast({ title: 'HTML 解码成功' });
  }, [input, toast]);

  const handleUnicodeEncode = useCallback(() => {
    if (!input) { toast({ title: '请输入内容', variant: 'destructive' }); return; }
    const result = Array.from(input).map(c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).join('');
    setOutput(result);
    toast({ title: 'Unicode 编码成功' });
  }, [input, toast]);

  const handleUnicodeDecode = useCallback(() => {
    if (!input) { toast({ title: '请输入内容', variant: 'destructive' }); return; }
    try { setOutput(input.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))); toast({ title: 'Unicode 解码成功' }); }
    catch (e) { toast({ title: '解码失败', description: e.message, variant: 'destructive' }); }
  }, [input, toast]);

  const tabs = [{ id: 'base64', label: 'Base64', icon: Lock }, { id: 'url', label: 'URL', icon: Link }, { id: 'html', label: 'HTML', icon: Code2 }, { id: 'unicode', label: 'Unicode', icon: Unlock }];
  const actions = {
    base64: [{ label: '编码', icon: Lock, onClick: handleBase64Encode, variant: 'primary' }, { label: '解码', icon: Unlock, onClick: handleBase64Decode, variant: 'secondary' }],
    url: [{ label: '编码', icon: Link, onClick: handleUrlEncode, variant: 'primary' }, { label: '解码', icon: Unlink, onClick: handleUrlDecode, variant: 'secondary' }],
    html: [{ label: '编码', icon: Code2, onClick: handleHtmlEncode, variant: 'primary' }, { label: '解码', icon: Unlock, onClick: handleHtmlDecode, variant: 'secondary' }],
    unicode: [{ label: '编码', icon: Lock, onClick: handleUnicodeEncode, variant: 'primary' }, { label: '解码', icon: Unlock, onClick: handleUnicodeDecode, variant: 'secondary' }]
  };
  const placeholders = {
    base64: { input: '输入要 Base64 编码/解码的文本...', output: '结果将显示在这里...' },
    url: { input: '输入要 URL 编码/解码的文本...', output: '结果将显示在这里...' },
    html: { input: '输入要 HTML 编码/解码的文本...', output: '结果将显示在这里...' },
    unicode: { input: '输入要 Unicode 编码/解码的文本...', output: '结果将显示在这里...' }
  };

  return <div className="min-h-screen bg-dev-bg">
      <NavHeader />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <ToolHeader title="编码转换" description="Base64、URL、HTML、Unicode 编解码工具" onBack={() => props.$w.utils.navigateTo({ pageId: 'home', params: {} })} />
        <div className="app-tab-row">
          {tabs.map(tab => <button key={tab.id} onClick={() => { setActiveTab(tab.id); setInput(''); setOutput(''); }} className={'app-tab ' + (activeTab === tab.id ? 'app-tab-active' : '')}>
              <tab.icon size={16} />{tab.label}
            </button>)}
        </div>
        <ActionBar>
          {actions[activeTab].map(action => <ActionButton key={action.label} onClick={action.onClick} variant={action.variant}>
              <span className="flex items-center gap-2"><action.icon size={14} /> {action.label}</span>
            </ActionButton>)}
          {output && <CopyButton text={output} />}
          <ActionButton onClick={() => { setInput(''); setOutput(''); }} variant="danger">清空全部</ActionButton>
        </ActionBar>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-dev-muted">输入</span>
              {input && <button onClick={() => setInput('')} className="text-xs font-mono text-dev-muted hover:text-dev-orange transition-colors">清空</button>}
            </div>
            <textarea value={input} onChange={e => setInput(e.target.value)} placeholder={placeholders[activeTab].input} className="flex-1 min-h-[300px] p-4 rounded-xl border bg-dev-input text-dev-text border-dev-border focus:border-dev-green/50 focus:outline-none focus:ring-1 focus:ring-dev-green/30 font-mono text-sm leading-relaxed resize-none placeholder:text-dev-muted/50 transition-colors duration-200" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-dev-muted">输出</span>
            </div>
            <textarea value={output} readOnly placeholder={placeholders[activeTab].output} className="flex-1 min-h-[300px] p-4 rounded-xl border bg-dev-input/50 text-dev-green border-dev-border font-mono text-sm leading-relaxed resize-none cursor-default placeholder:text-dev-muted/50 transition-colors duration-200" />
          </div>
        </div>
        <div className="mt-6 p-4 rounded-xl bg-dev-panel/50 border border-dev-border/50">
          <p className="text-xs font-mono text-dev-muted">
            💡 <span className="text-dev-text">提示：</span>
            {activeTab === 'base64' && ' Base64 编码支持中文等多字节字符，解码时自动处理 UTF-8。'}
            {activeTab === 'url' && ' URL 编码将特殊字符转换为 %XX 格式，常用于 URL 参数传递。'}
            {activeTab === 'html' && ' HTML 编码将 <、>、& 等字符转为 HTML 实体，防止 XSS 注入。'}
            {activeTab === 'unicode' && ' Unicode 编码将字符转为 \\uXXXX 格式，常用于国际化文本处理。'}
          </p>
        </div>
      </main>
    </div>;
}
