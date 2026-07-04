import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, Regex, Palette, Fingerprint, Hash, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui';
import { ToolHeader, ActionBar, ActionButton, CopyButton, NavHeader } from '@/components/ToolCard.jsx';

function TimestampTool() {
  const { toast } = useToast();
  const [currentTs, setCurrentTs] = useState(Date.now());
  const [tsInput, setTsInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [tsResult, setTsResult] = useState('');
  const [dateResult, setDateResult] = useState('');
  useEffect(() => { const timer = setInterval(() => setCurrentTs(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const handleTsToDate = useCallback(() => {
    if (!tsInput) { toast({ title: '请输入时间戳', variant: 'destructive' }); return; }
    try {
      let ts = parseInt(tsInput);
      if (tsInput.length <= 10) ts *= 1000;
      const d = new Date(ts);
      if (isNaN(d.getTime())) throw new Error('Invalid');
      setTsResult(d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + '\nISO: ' + d.toISOString() + '\n本地: ' + d.toString());
      toast({ title: '转换成功' });
    } catch { toast({ title: '无效的时间戳', variant: 'destructive' }); }
  }, [tsInput, toast]);
  const handleDateToTs = useCallback(() => {
    if (!dateInput) { toast({ title: '请输入日期', variant: 'destructive' }); return; }
    try {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) throw new Error('Invalid');
      setDateResult(`秒: ${Math.floor(d.getTime() / 1000)}\n毫秒: ${d.getTime()}`);
      toast({ title: '转换成功' });
    } catch { toast({ title: '无效的日期格式', variant: 'destructive' }); }
  }, [dateInput, toast]);
  const setCurrentTimestamp = () => { setTsInput(String(Math.floor(Date.now() / 1000))); };
  return <div className="space-y-6">
      <div className="p-4 rounded-xl bg-dev-panel border border-dev-border">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-dev-muted">当前时间戳</span>
          <CopyButton text={String(Math.floor(currentTs / 1000))} />
        </div>
        <div className="mt-2 font-mono text-2xl text-dev-green">{Math.floor(currentTs / 1000)}</div>
        <div className="mt-1 text-xs font-mono text-dev-muted">{new Date(currentTs).toLocaleString('zh-CN')}</div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-dev-panel border border-dev-border">
          <h3 className="text-sm font-heading font-semibold text-white mb-3">时间戳 → 日期</h3>
          <div className="flex gap-2 mb-3">
            <input value={tsInput} onChange={e => setTsInput(e.target.value)} placeholder="输入时间戳 (秒/毫秒)" className="flex-1 px-3 py-2 rounded-lg bg-dev-input border border-dev-border text-dev-text font-mono text-sm focus:border-dev-green/50 focus:outline-none focus:ring-1 focus:ring-dev-green/30 placeholder:text-dev-muted/50" />
            <ActionButton onClick={setCurrentTimestamp} variant="secondary"><RefreshCw size={14} /></ActionButton>
          </div>
          <ActionButton onClick={handleTsToDate} variant="primary">转换</ActionButton>
          {tsResult && <pre className="mt-3 p-3 rounded-lg bg-dev-input/50 text-dev-green font-mono text-sm whitespace-pre-wrap">{tsResult}</pre>}
        </div>
        <div className="p-4 rounded-xl bg-dev-panel border border-dev-border">
          <h3 className="text-sm font-heading font-semibold text-white mb-3">日期 → 时间戳</h3>
          <div className="flex gap-2 mb-3">
            <input type="datetime-local" value={dateInput} onChange={e => setDateInput(e.target.value)} className="flex-1 px-3 py-2 rounded-lg bg-dev-input border border-dev-border text-dev-text font-mono text-sm focus:border-dev-green/50 focus:outline-none focus:ring-1 focus:ring-dev-green/30" />
          </div>
          <ActionButton onClick={handleDateToTs} variant="primary">转换</ActionButton>
          {dateResult && <pre className="mt-3 p-3 rounded-lg bg-dev-input/50 text-dev-green font-mono text-sm whitespace-pre-wrap">{dateResult}</pre>}
        </div>
      </div>
    </div>;
}

function RegexTool() {
  const { toast } = useToast();
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('g');
  const [testStr, setTestStr] = useState('');
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!pattern || !testStr) { setMatches([]); setError(''); return; }
    try {
      const re = new RegExp(pattern, flags);
      const results = [];
      let m;
      if (flags.includes('g')) { while ((m = re.exec(testStr)) !== null) { results.push({ match: m[0], index: m.index, groups: m.slice(1) }); if (!m[0]) break; } }
      else { m = re.exec(testStr); if (m) results.push({ match: m[0], index: m.index, groups: m.slice(1) }); }
      setMatches(results);
      setError('');
    } catch (e) { setError(e.message); setMatches([]); }
  }, [pattern, flags, testStr]);
  const flagOptions = [{ flag: 'g', label: 'Global' }, { flag: 'i', label: 'Ignore' }, { flag: 'm', label: 'Multi' }, { flag: 's', label: 'DotAll' }, { flag: 'u', label: 'Unicode' }];
  const toggleFlag = f => { setFlags(prev => prev.includes(f) ? prev.replace(f, '') : prev + f); };
  return <div className="space-y-4">
      <div className="p-4 rounded-xl bg-dev-panel border border-dev-border">
        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <label className="text-xs font-mono text-dev-muted mb-1 block">正则表达式</label>
            <div className="flex items-center gap-1">
              <span className="text-dev-green font-mono text-lg">/</span>
              <input value={pattern} onChange={e => setPattern(e.target.value)} placeholder="输入正则表达式" className="flex-1 px-2 py-2 rounded-lg bg-dev-input border border-dev-border text-dev-text font-mono text-sm focus:border-dev-green/50 focus:outline-none focus:ring-1 focus:ring-dev-green/30 placeholder:text-dev-muted/50" />
              <span className="text-dev-green font-mono text-lg">/{flags}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {flagOptions.map(f => <button key={f.flag} onClick={() => toggleFlag(f.flag)} className={`px-3 py-1 rounded text-xs font-mono transition-all ${flags.includes(f.flag) ? 'bg-dev-green/20 text-dev-green border border-dev-green/40' : 'bg-dev-input text-dev-muted border border-dev-border hover:text-dev-text'}`}>{f.flag} - {f.label}</button>)}
        </div>
      </div>
      <div className="p-4 rounded-xl bg-dev-panel border border-dev-border">
        <label className="text-xs font-mono text-dev-muted mb-2 block">测试文本</label>
        <textarea value={testStr} onChange={e => setTestStr(e.target.value)} placeholder="输入要测试的文本..." className="w-full min-h-[120px] p-3 rounded-lg bg-dev-input border border-dev-border text-dev-text font-mono text-sm resize-none focus:border-dev-green/50 focus:outline-none focus:ring-1 focus:ring-dev-green/30 placeholder:text-dev-muted/50" />
      </div>
      {error && <div className="p-3 rounded-xl bg-dev-orange/10 border border-dev-orange/30"><p className="text-sm font-mono text-dev-orange">✗ {error}</p></div>}
      {matches.length > 0 && <div className="p-4 rounded-xl bg-dev-panel border border-dev-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-dev-muted">匹配结果 ({matches.length})</span>
            <CopyButton text={matches.map(m => m.match).join('\n')} />
          </div>
          <div className="space-y-2">
            {matches.map((m, i) => <div key={i} className="p-2 rounded-lg bg-dev-input/50 font-mono text-sm">
                <span className="text-dev-muted">#{i + 1}</span>{' '}
                <span className="text-dev-green">"{m.match}"</span>
                <span className="text-dev-muted"> @ {m.index}</span>
                {m.groups.length > 0 && <span className="text-dev-orange"> groups: [{m.groups.map(g => `"${g}"`).join(', ')}]</span>}
              </div>)}
          </div>
        </div>}
      {!error && pattern && testStr && matches.length === 0 && <div className="p-3 rounded-xl bg-dev-panel border border-dev-border"><p className="text-sm font-mono text-dev-muted">无匹配结果</p></div>}
    </div>;
}

function ColorTool() {
  const { toast } = useToast();
  const [hex, setHex] = useState('#00E5A0');
  const [rgb, setRgb] = useState('0, 229, 160');
  const [hsl, setHsl] = useState('153, 100%, 45%');
  const [colorPickerVal, setColorPickerVal] = useState('#00E5A0');
  const hexToRgb = h => { const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h); return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null; };
  const rgbToHsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) { case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break; case g: h = ((b - r) / d + 2) / 6; break; case b: h = ((r - g) / d + 4) / 6; break; }
    }
    return `${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;
  };
  const handleHexChange = val => {
    setHex(val);
    const rgbVal = hexToRgb(val);
    if (rgbVal) {
      setRgb(rgbVal);
      const [r, g, b] = rgbVal.split(', ').map(Number);
      setHsl(rgbToHsl(r, g, b));
      setColorPickerVal(val.length === 7 ? val : val.length === 4 ? '#' + val[1] + val[1] + val[2] + val[2] + val[3] + val[3] : colorPickerVal);
    }
  };
  const handlePickerChange = val => { setColorPickerVal(val); handleHexChange(val); };
  const presets = ['#00E5A0', '#FF6B35', '#0F1117', '#1A1D2E', '#FF3366', '#00B4D8', '#FFD166', '#06D6A0', '#EF476F', '#118AB2'];
  return <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-6 rounded-xl bg-dev-panel border border-dev-border">
          <div className="w-full h-40 rounded-xl mb-4 border border-dev-border/50" style={{ backgroundColor: hex }} />
          <div className="flex items-center gap-4">
            <input type="color" value={colorPickerVal} onChange={e => handlePickerChange(e.target.value)} className="w-12 h-12 rounded-lg cursor-pointer border-0 bg-transparent" />
            <div className="flex-1">
              <span className="text-xs font-mono text-dev-muted block mb-1">选色器</span>
              <span className="text-sm font-mono text-dev-text">点击左侧色块选择颜色</span>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-dev-panel border border-dev-border flex items-center justify-between">
            <div><span className="text-xs font-mono text-dev-muted block">HEX</span><span className="font-mono text-dev-text">{hex}</span></div>
            <CopyButton text={hex} />
          </div>
          <div className="p-3 rounded-xl bg-dev-panel border border-dev-border flex items-center justify-between">
            <div><span className="text-xs font-mono text-dev-muted block">RGB</span><span className="font-mono text-dev-text">rgb({rgb})</span></div>
            <CopyButton text={`rgb(${rgb})`} />
          </div>
          <div className="p-3 rounded-xl bg-dev-panel border border-dev-border flex items-center justify-between">
            <div><span className="text-xs font-mono text-dev-muted block">HSL</span><span className="font-mono text-dev-text">hsl({hsl})</span></div>
            <CopyButton text={`hsl(${hsl})`} />
          </div>
        </div>
      </div>
      <div className="p-4 rounded-xl bg-dev-panel border border-dev-border">
        <label className="text-xs font-mono text-dev-muted mb-2 block">输入 HEX 值</label>
        <input value={hex} onChange={e => handleHexChange(e.target.value)} placeholder="#00E5A0" className="w-full px-3 py-2 rounded-lg bg-dev-input border border-dev-border text-dev-text font-mono text-sm focus:border-dev-green/50 focus:outline-none focus:ring-1 focus:ring-dev-green/30 placeholder:text-dev-muted/50" />
      </div>
      <div className="p-4 rounded-xl bg-dev-panel border border-dev-border">
        <span className="text-xs font-mono text-dev-muted mb-3 block">常用颜色</span>
        <div className="flex flex-wrap gap-3">
          {presets.map(c => <button key={c} onClick={() => handleHexChange(c)} className="w-10 h-10 rounded-lg border-2 transition-transform hover:scale-110 focus:outline-none" style={{ backgroundColor: c, borderColor: hex === c ? '#fff' : 'transparent' }} title={c} />)}
        </div>
      </div>
    </div>;
}

function UUIDTool() {
  const { toast } = useToast();
  const [uuids, setUuids] = useState([]);
  const [count, setCount] = useState(1);
  const [format, setFormat] = useState('lower');
  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : r & 0x3 | 0x8).toString(16); });
  };
  const handleGenerate = () => {
    const n = Math.min(Math.max(parseInt(count) || 1, 1), 50);
    const results = Array.from({ length: n }, () => { const uuid = generateUUID(); if (format === 'upper') return uuid.toUpperCase(); if (format === 'no-dash') return uuid.replace(/-/g, ''); return uuid; });
    setUuids(results);
    toast({ title: `已生成 ${n} 个 UUID` });
  };
  const copyAll = () => { navigator.clipboard.writeText(uuids.join('\n')); toast({ title: '已复制全部 UUID' }); };
  return <div className="space-y-6">
      <div className="p-4 rounded-xl bg-dev-panel border border-dev-border">
        <div className="flex items-end gap-4 mb-4">
          <div className="flex-1">
            <label className="text-xs font-mono text-dev-muted mb-1 block">生成数量</label>
            <input type="number" min="1" max="50" value={count} onChange={e => setCount(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-dev-input border border-dev-border text-dev-text font-mono text-sm focus:border-dev-green/50 focus:outline-none focus:ring-1 focus:ring-dev-green/30" />
          </div>
          <div>
            <label className="text-xs font-mono text-dev-muted mb-1 block">格式</label>
            <div className="flex gap-2">
              {[{ id: 'lower', label: '小写' }, { id: 'upper', label: '大写' }, { id: 'no-dash', label: '无横线' }].map(f => <button key={f.id} onClick={() => setFormat(f.id)} className={`px-3 py-2 rounded-lg text-xs font-mono transition-all ${format === f.id ? 'bg-dev-green/20 text-dev-green border border-dev-green/40' : 'bg-dev-input text-dev-muted border border-dev-border hover:text-dev-text'}`}>{f.label}</button>)}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <ActionButton onClick={handleGenerate} variant="primary"><span className="flex items-center gap-2"><Fingerprint size={14} /> 生成</span></ActionButton>
          {uuids.length > 0 && <ActionButton onClick={copyAll} variant="secondary">复制全部</ActionButton>}
        </div>
      </div>
      {uuids.length > 0 && <div className="p-4 rounded-xl bg-dev-panel border border-dev-border">
          <div className="flex items-center justify-between mb-3"><span className="text-xs font-mono text-dev-muted">生成结果 ({uuids.length})</span></div>
          <div className="space-y-1">
            {uuids.map((uuid, i) => <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-dev-input/50 group">
                <span className="font-mono text-sm text-dev-green">{uuid}</span>
                <CopyButton text={uuid} className="opacity-0 group-hover:opacity-100" />
              </div>)}
          </div>
        </div>}
    </div>;
}

function HashTool() {
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const handleHash = useCallback(async () => {
    if (!input) { toast({ title: '请输入文本', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const algorithms = ['SHA-256', 'SHA-1', 'SHA-384', 'SHA-512'];
      const hashes = {};
      for (const algo of algorithms) { const hashBuffer = await crypto.subtle.digest(algo, data); hashes[algo] = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join(''); }
      let md5sum = 0;
      for (let i = 0; i < input.length; i++) md5sum = (md5sum << 5) - md5sum + input.charCodeAt(i) | 0;
      hashes['CRC32-like'] = (md5sum >>> 0).toString(16).padStart(8, '0');
      setResults(hashes);
      toast({ title: '哈希计算完成' });
    } catch (e) { toast({ title: '计算失败', description: e.message, variant: 'destructive' }); }
    setLoading(false);
  }, [input, toast]);
  return <div className="space-y-6">
      <div className="p-4 rounded-xl bg-dev-panel border border-dev-border">
        <label className="text-xs font-mono text-dev-muted mb-2 block">输入文本</label>
        <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="输入要计算哈希的文本..." className="w-full min-h-[120px] p-3 rounded-lg bg-dev-input border border-dev-border text-dev-text font-mono text-sm resize-none focus:border-dev-green/50 focus:outline-none focus:ring-1 focus:ring-dev-green/30 placeholder:text-dev-muted/50" />
        <div className="mt-3"><ActionButton onClick={handleHash} variant="primary"><span className="flex items-center gap-2"><Hash size={14} /> {loading ? '计算中...' : '计算哈希'}</span></ActionButton></div>
      </div>
      {Object.keys(results).length > 0 && <div className="space-y-2">
          {Object.entries(results).map(([algo, hash]) => <div key={algo} className="p-3 rounded-xl bg-dev-panel border border-dev-border flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-mono text-dev-muted block mb-0.5">{algo}</span>
                <span className="font-mono text-sm text-dev-green break-all">{hash}</span>
              </div>
              <CopyButton text={hash} />
            </div>)}
        </div>}
    </div>;
}

export default function Devtool(props) {
  const params = props.$w.page.dataset.params;
  const [activeTab, setActiveTab] = useState(params.tab || 'timestamp');
  const tabs = [{ id: 'timestamp', label: '时间戳', icon: Clock }, { id: 'regex', label: '正则测试', icon: Regex }, { id: 'color', label: '颜色工具', icon: Palette }, { id: 'uuid', label: 'UUID 生成', icon: Fingerprint }, { id: 'hash', label: '哈希计算', icon: Hash }];
  const renderTab = () => {
    switch (activeTab) { case 'timestamp': return <TimestampTool />; case 'regex': return <RegexTool />; case 'color': return <ColorTool />; case 'uuid': return <UUIDTool />; case 'hash': return <HashTool />; default: return <TimestampTool />; }
  };
  return <div className="min-h-screen bg-dev-bg">
      <NavHeader />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <ToolHeader title="开发者工具" description="时间戳转换、正则测试、颜色工具、UUID 生成、哈希计算" onBack={() => props.$w.utils.navigateTo({ pageId: 'home', params: {} })} />
        <div className="app-tab-row">
          {tabs.map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={'app-tab ' + (activeTab === tab.id ? 'app-tab-active' : '')}>
              <tab.icon size={16} />{tab.label}
            </button>)}
        </div>
        {renderTab()}
      </main>
    </div>;
}
