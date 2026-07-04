import React, { useState, useCallback } from 'react';
import { Send, Terminal, Search, Network, MonitorSmartphone, RefreshCw, Plus, Trash2, ChevronDown, Play } from 'lucide-react';
import { useToast } from '@/components/ui';
import { ToolHeader, NavHeader, ActionBar, ActionButton, CopyButton, StatusBadge } from '@/components/ToolCard.jsx';

const TABS = [{ id: 'api', label: '接口调试', icon: Send }, { id: 'curl', label: 'CURL 转代码', icon: Terminal }, { id: 'ip', label: 'IP / Whois', icon: Search }, { id: 'port', label: '端口检测', icon: Network }, { id: 'ua', label: 'UA 解析', icon: MonitorSmartphone }];

function ApiDebugger() {
  const { toast } = useToast();
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState([{ key: 'Content-Type', value: 'application/json' }]);
  const [body, setBody] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [respTime, setRespTime] = useState(0);
  const [respSize, setRespSize] = useState(0);
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
  const addHeader = () => setHeaders([...headers, { key: '', value: '' }]);
  const removeHeader = i => setHeaders(headers.filter((_, idx) => idx !== i));
  const updateHeader = (i, field, val) => { const h = [...headers]; h[i][field] = val; setHeaders(h); };
  const sendRequest = useCallback(async () => {
    if (!url.trim()) { toast({ title: '请输入 URL', variant: 'destructive' }); return; }
    setLoading(true);
    setResponse(null);
    const t0 = Date.now();
    try {
      const opts = { method };
      const h = {};
      headers.forEach(({ key, value }) => { if (key.trim()) h[key.trim()] = value; });
      if (Object.keys(h).length > 0) opts.headers = h;
      if (['POST', 'PUT', 'PATCH'].includes(method) && body.trim()) opts.body = body;
      const res = await fetch(url, opts);
      const ms = Date.now() - t0;
      const text = await res.text();
      let formatted = text;
      try { formatted = JSON.stringify(JSON.parse(text), null, 2); } catch {}
      setResponse({ status: res.status, statusText: res.statusText, headers: Object.fromEntries(res.headers.entries()), body: formatted, raw: text });
      setRespTime(ms);
      setRespSize(new Blob([text]).size);
      toast({ title: '请求完成 ' + res.status });
    } catch (e) {
      setResponse({ status: 0, statusText: 'Error', headers: {}, body: e.message, raw: e.message });
      setRespTime(Date.now() - t0);
      setRespSize(0);
      toast({ title: '请求失败', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  }, [url, method, headers, body, toast]);
  const statusColor = s => s >= 200 && s < 300 ? 'success' : s >= 400 ? 'error' : 'info';
  return <div className="space-y-6">
      <div className="flex gap-3">
        <select value={method} onChange={e => setMethod(e.target.value)} className="bg-dev-input border border-dev-border rounded-lg px-3 py-2.5 text-sm font-mono text-dev-green focus:border-dev-green/50 focus:outline-none min-w-[110px]">
          {methods.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://api.example.com/endpoint" className="flex-1 bg-dev-input border border-dev-border rounded-lg px-4 py-2.5 text-sm font-mono text-dev-text focus:border-dev-green/50 focus:outline-none focus:ring-1 focus:ring-dev-green/30 placeholder:text-dev-muted/50" />
        <ActionButton onClick={sendRequest} variant="primary" className="flex items-center gap-2">
          {loading ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}发送
        </ActionButton>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-dev-muted">请求头</span>
              <button onClick={addHeader} className="text-xs font-mono text-dev-green hover:text-dev-green/70 flex items-center gap-1"><Plus size={12} />添加</button>
            </div>
            <div className="space-y-2">
              {headers.map((h, i) => <div key={i} className="flex gap-2 items-center">
                  <input value={h.key} onChange={e => updateHeader(i, 'key', e.target.value)} placeholder="Header" className="flex-1 bg-dev-input border border-dev-border rounded-lg px-3 py-2 text-xs font-mono text-dev-text focus:border-dev-green/50 focus:outline-none placeholder:text-dev-muted/50" />
                  <input value={h.value} onChange={e => updateHeader(i, 'value', e.target.value)} placeholder="Value" className="flex-1 bg-dev-input border border-dev-border rounded-lg px-3 py-2 text-xs font-mono text-dev-text focus:border-dev-green/50 focus:outline-none placeholder:text-dev-muted/50" />
                  <button onClick={() => removeHeader(i)} className="text-dev-muted/40 hover:text-dev-orange transition-colors"><Trash2 size={14} /></button>
                </div>)}
            </div>
          </div>
          {['POST', 'PUT', 'PATCH'].includes(method) && <div>
              <span className="text-xs font-mono uppercase tracking-wider text-dev-muted mb-2 block">请求体</span>
              <textarea value={body} onChange={e => setBody(e.target.value)} placeholder='{"key": "value"}' className="w-full min-h-[200px] p-4 rounded-xl border bg-dev-input text-dev-text border-dev-border font-mono text-sm focus:border-dev-green/50 focus:outline-none focus:ring-1 focus:ring-dev-green/30 placeholder:text-dev-muted/50 resize-none" />
            </div>}
        </div>
        <div className="space-y-4">
          {response && <>
              <div className="flex items-center gap-3 flex-wrap">
                <StatusBadge type={statusColor(response.status)}>{response.status} {response.statusText}</StatusBadge>
                <span className="text-xs font-mono text-dev-muted">耗时 {respTime}ms</span>
                <span className="text-xs font-mono text-dev-muted">大小 {respSize > 1024 ? (respSize / 1024).toFixed(1) + 'KB' : respSize + 'B'}</span>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-dev-muted">响应体</span>
                  <CopyButton text={response.body} />
                </div>
                <pre className="w-full min-h-[300px] p-4 rounded-xl border bg-dev-input/50 text-dev-green border-dev-border font-mono text-xs leading-relaxed overflow-auto whitespace-pre-wrap">{response.body}</pre>
              </div>
              <details className="group">
                <summary className="text-xs font-mono text-dev-muted cursor-pointer hover:text-dev-green transition-colors flex items-center gap-1">
                  <ChevronDown size={12} className="group-open:rotate-180 transition-transform" />响应头
                </summary>
                <pre className="mt-2 p-3 rounded-lg bg-dev-input/30 border border-dev-border text-xs font-mono text-dev-muted leading-relaxed">{Object.entries(response.headers).map(([k, v]) => k + ': ' + v).join('\n')}</pre>
              </details>
            </>}
          {!response && !loading && <div className="flex items-center justify-center min-h-[300px] border border-dashed border-dev-border rounded-xl">
              <span className="text-dev-muted/40 text-sm font-mono">输入 URL 并点击发送</span>
            </div>}
          {loading && <div className="flex items-center justify-center min-h-[300px] border border-dev-border rounded-xl">
              <RefreshCw size={24} className="animate-spin text-dev-green/50" />
            </div>}
        </div>
      </div>
    </div>;
}

function CurlConverter() {
  const { toast } = useToast();
  const [curlInput, setCurlInput] = useState('');
  const [lang, setLang] = useState('javascript');
  const [output, setOutput] = useState('');
  const parseCurl = cmd => {
    const result = { method: 'GET', url: '', headers: {}, data: '' };
    const tokens = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';
    for (let i = 0; i < cmd.length; i++) {
      const c = cmd[i];
      if (inQuote) { if (c === quoteChar && cmd[i - 1] !== '\\') inQuote = false; else current += c; }
      else {
        if (c === '"' || c === "'") { inQuote = true; quoteChar = c; }
        else if (c === ' ' || c === '\t') { if (current) { tokens.push(current); current = ''; } }
        else current += c;
      }
    }
    if (current) tokens.push(current);
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t === 'curl') continue;
      if (t.startsWith('http://') || t.startsWith('https://')) { result.url = t; continue; }
      if (t === '-X' || t === '--request') { result.method = tokens[++i] || 'GET'; continue; }
      if (t === '-H' || t === '--header') { const h = tokens[++i] || ''; const ci = h.indexOf(':'); if (ci > 0) result.headers[h.slice(0, ci).trim()] = h.slice(ci + 1).trim(); continue; }
      if (t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-binary') { result.data = tokens[++i] || ''; if (result.method === 'GET') result.method = 'POST'; continue; }
    }
    return result;
  };
  const generateCode = useCallback(() => {
    if (!curlInput.trim()) { toast({ title: '请输入 CURL 命令', variant: 'destructive' }); return; }
    try {
      const p = parseCurl(curlInput);
      if (!p.url) { toast({ title: '未检测到 URL', variant: 'destructive' }); return; }
      let code = '';
      if (lang === 'javascript') {
        const opts = [];
        if (p.method !== 'GET') opts.push("  method: '" + p.method + "'");
        const hKeys = Object.keys(p.headers);
        if (hKeys.length > 0) opts.push("  headers: { " + hKeys.map(k => "'" + k + "': '" + p.headers[k] + "'").join(', ') + " }");
        if (p.data) opts.push('  body: JSON.stringify(' + p.data + ')');
        code = "const response = await fetch('" + p.url + "', {\n" + opts.join(',\n') + "\n});\nconst data = await response.json();";
      } else if (lang === 'python') {
        code = "import requests\n\nheaders = {\n" + Object.entries(p.headers).map(([k, v]) => "    '" + k + "': '" + v + "'").join(',\n') + "\n}\n" + (p.data ? "data = " + p.data + "\n\n" : '') + "response = requests." + p.method.toLowerCase() + "('" + p.url + "', headers=headers" + (p.data ? ', json=data' : '') + ")\nprint(response.json())";
      } else if (lang === 'java') {
        code = 'import java.net.http.*;\nimport java.net.URI;\n\nHttpRequest request = HttpRequest.newBuilder()\n    .uri(URI.create("' + p.url + '"))\n    ' + (p.method !== 'GET' ? '.' + p.method.toLowerCase() + '(HttpRequest.BodyPublishers.ofString("' + p.data + '"))' : '.GET()') + '\n    ' + Object.entries(p.headers).map(([k, v]) => '.header("' + k + '", "' + v + '")').join('\n    ') + '\n    .build();\n\nHttpClient client = HttpClient.newHttpClient();\nHttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());\nSystem.out.println(response.body());';
      } else if (lang === 'php') {
        code = "<?php\n$ch = curl_init();\ncurl_setopt($ch, CURLOPT_URL, '" + p.url + "');\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\n" + (p.method !== 'GET' ? "curl_setopt($ch, CURLOPT_CUSTOMREQUEST, '" + p.method + "');\n" : '') + (p.data ? "curl_setopt($ch, CURLOPT_POSTFIELDS, '" + p.data + "');\n" : '') + Object.entries(p.headers).map(([k, v]) => "curl_setopt($ch, CURLOPT_HTTPHEADER, ['" + k + ": " + v + "']);").join('\n') + "\n$response = curl_exec($ch);\ncurl_close($ch);";
      }
      setOutput(code);
      toast({ title: '转换成功' });
    } catch (e) { toast({ title: '解析失败', description: e.message, variant: 'destructive' }); }
  }, [curlInput, lang, toast]);
  return <div className="space-y-4">
      <textarea value={curlInput} onChange={e => setCurlInput(e.target.value)} placeholder="curl 'https://api.example.com/data' -H 'Content-Type: application/json' -X POST -d '{&quot;key&quot;:&quot;value&quot;}'" className="w-full min-h-[180px] p-4 rounded-xl border bg-dev-input text-dev-text border-dev-border font-mono text-sm focus:border-dev-green/50 focus:outline-none focus:ring-1 focus:ring-dev-green/30 placeholder:text-dev-muted/50 resize-none" />
      <div className="flex items-center gap-3">
        <select value={lang} onChange={e => setLang(e.target.value)} className="bg-dev-input border border-dev-border rounded-lg px-3 py-2.5 text-sm font-mono text-dev-green focus:border-dev-green/50 focus:outline-none">
          <option value="javascript">JavaScript (fetch)</option>
          <option value="python">Python (requests)</option>
          <option value="java">Java (HttpClient)</option>
          <option value="php">PHP (curl)</option>
        </select>
        <ActionButton onClick={generateCode} variant="primary">转换代码</ActionButton>
      </div>
      {output && <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-dev-muted">{lang === 'javascript' ? 'JavaScript' : lang === 'python' ? 'Python' : lang === 'java' ? 'Java' : 'PHP'} 代码</span>
            <CopyButton text={output} />
          </div>
          <pre className="w-full min-h-[250px] p-4 rounded-xl border bg-dev-input/50 text-dev-green border-dev-border font-mono text-sm leading-relaxed overflow-auto whitespace-pre-wrap">{output}</pre>
        </div>}
    </div>;
}

function IpWhoisTool() {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('ip');
  const lookup = useCallback(async () => {
    if (!query.trim()) { toast({ title: '请输入 IP 或域名', variant: 'destructive' }); return; }
    setLoading(true);
    setResult(null);
    try {
      if (mode === 'ip') {
        const res = await fetch('https://ipapi.co/' + query.trim() + '/json/');
        const data = await res.json();
        if (data.error) throw new Error(data.reason || '查询失败');
        setResult({ type: 'ip', data });
        toast({ title: '查询成功' });
      } else {
        setResult({ type: 'whois', data: { domain: query.trim(), info: '域名 Whois 查询需使用命令行工具 (whois/rdap)，受浏览器跨域限制无法直接查询。\n\n推荐使用:\n  - 终端: whois ' + query.trim() + '\n  - 在线: https://who.is/whois/' + query.trim() } });
        toast({ title: 'Whois 提示已生成' });
      }
    } catch (e) { toast({ title: '查询失败', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [query, mode, toast]);
  const getMyIp = async () => { try { const res = await fetch('https://ipapi.co/json/'); const data = await res.json(); setQuery(data.ip || ''); } catch { toast({ title: '获取失败', variant: 'destructive' }); } };
  return <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <div className="flex bg-dev-panel border border-dev-border rounded-lg overflow-hidden">
          <button onClick={() => setMode('ip')} className={'px-4 py-2.5 text-sm font-mono transition-colors ' + (mode === 'ip' ? 'bg-dev-green/15 text-dev-green' : 'text-dev-muted hover:text-dev-text')}>IP 查询</button>
          <button onClick={() => setMode('whois')} className={'px-4 py-2.5 text-sm font-mono transition-colors ' + (mode === 'whois' ? 'bg-dev-green/15 text-dev-green' : 'text-dev-muted hover:text-dev-text')}>域名 Whois</button>
        </div>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder={mode === 'ip' ? '8.8.8.8' : 'example.com'} className="flex-1 bg-dev-input border border-dev-border rounded-lg px-4 py-2.5 text-sm font-mono text-dev-text focus:border-dev-green/50 focus:outline-none placeholder:text-dev-muted/50" onKeyDown={e => e.key === 'Enter' && lookup()} />
        {mode === 'ip' && <ActionButton onClick={getMyIp} variant="secondary">我的 IP</ActionButton>}
        <ActionButton onClick={lookup} variant="primary">{loading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}查询</ActionButton>
      </div>
      {result && result.type === 'ip' && <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[['IP', result.data.ip], ['城市', result.data.city], ['地区', result.data.region], ['国家', result.data.country_name], ['ISP', result.data.org], ['ASN', result.data.asn], ['时区', result.data.timezone], ['经度', result.data.longitude], ['纬度', result.data.latitude]].map(([k, v]) => <div key={k} className="bg-dev-input/50 border border-dev-border rounded-lg p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-dev-muted mb-1">{k}</div>
              <div className="text-sm font-mono text-dev-text truncate">{v || '-'}</div>
            </div>)}
        </div>}
      {result && result.type === 'whois' && <pre className="w-full p-4 rounded-xl border bg-dev-input/50 text-dev-muted border-dev-border font-mono text-sm leading-relaxed whitespace-pre-wrap">{result.data.info}</pre>}
    </div>;
}

function PortScanner() {
  const { toast } = useToast();
  const [host, setHost] = useState('');
  const [ports, setPorts] = useState('');
  const [results, setResults] = useState([]);
  const [scanning, setScanning] = useState(false);
  const commonPorts = [{ l: 'SSH', p: '22' }, { l: 'HTTP', p: '80' }, { l: 'HTTPS', p: '443' }, { l: 'MySQL', p: '3306' }, { l: 'Redis', p: '6379' }, { l: 'MongoDB', p: '27017' }, { l: 'FTP', p: '21' }, { l: 'SMTP', p: '25' }, { l: 'DNS', p: '53' }, { l: 'PG', p: '5432' }, { l: 'ES', p: '9200' }];
  const scanPorts = useCallback(async () => {
    if (!host.trim() || !ports.trim()) { toast({ title: '请输入主机和端口', variant: 'destructive' }); return; }
    setScanning(true);
    setResults([]);
    const pList = ports.split(',').map(p => parseInt(p.trim())).filter(p => p > 0 && p <= 65535);
    for (const port of pList) {
      const t0 = Date.now();
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3000);
        await fetch('http://' + host + ':' + port, { mode: 'no-cors', signal: ctrl.signal });
        clearTimeout(timer);
        setResults(prev => [...prev, { port, status: 'open', time: Date.now() - t0 }]);
      } catch (e) { const ms = Date.now() - t0; setResults(prev => [...prev, { port, status: e.name === 'AbortError' ? 'timeout' : 'closed', time: ms }]); }
    }
    setScanning(false);
    toast({ title: '检测完成' });
  }, [host, ports, toast]);
  return <div className="space-y-4">
      <div className="flex gap-3 items-center flex-wrap">
        <input value={host} onChange={e => setHost(e.target.value)} placeholder="主机 (example.com 或 IP)" className="flex-1 min-w-[200px] bg-dev-input border border-dev-border rounded-lg px-4 py-2.5 text-sm font-mono text-dev-text focus:border-dev-green/50 focus:outline-none placeholder:text-dev-muted/50" />
        <input value={ports} onChange={e => setPorts(e.target.value)} placeholder="端口 (80,443,3306)" className="flex-1 min-w-[200px] bg-dev-input border border-dev-border rounded-lg px-4 py-2.5 text-sm font-mono text-dev-text focus:border-dev-green/50 focus:outline-none placeholder:text-dev-muted/50" />
        <ActionButton onClick={scanPorts} variant="primary">{scanning ? <RefreshCw size={16} className="animate-spin" /> : <Network size={16} />}检测</ActionButton>
      </div>
      <div className="flex flex-wrap gap-2">
        {commonPorts.map(cp => <button key={cp.p} onClick={() => setPorts(prev => prev ? prev + ',' + cp.p : cp.p)} className="px-2.5 py-1 rounded-md text-xs font-mono border border-dev-border bg-dev-panel text-dev-muted hover:text-dev-green hover:border-dev-green/30 transition-colors">{cp.l} {cp.p}</button>)}
      </div>
      {results.length > 0 && <div className="space-y-2">
          {results.map((r, i) => <div key={i} className="flex items-center gap-3 bg-dev-input/50 border border-dev-border rounded-lg p-3">
              <div className={'w-2 h-2 rounded-full ' + (r.status === 'open' ? 'bg-dev-green' : r.status === 'timeout' ? 'bg-yellow-500' : 'bg-dev-orange')} />
              <span className="text-sm font-mono text-dev-text flex-1">端口 {r.port}</span>
              <StatusBadge type={r.status === 'open' ? 'success' : r.status === 'timeout' ? 'info' : 'error'}>{r.status === 'open' ? '开放' : r.status === 'timeout' ? '超时' : '关闭'}</StatusBadge>
              <span className="text-xs font-mono text-dev-muted">{r.time}ms</span>
            </div>)}
        </div>}
    </div>;
}

function UaParser() {
  const { toast } = useToast();
  const [uaInput, setUaInput] = useState('');
  const [parsed, setParsed] = useState(null);
  const presets = [{ label: 'Chrome Win', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }, { label: 'Firefox Mac', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0' }, { label: 'Safari iOS', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1' }, { label: 'Edge Win', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0' }, { label: 'Android', ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' }, { label: 'Googlebot', ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }, { label: 'curl', ua: 'curl/8.4.0' }];
  const parse = ua => {
    const r = { browser: '', browserVer: '', os: '', device: 'Desktop', engine: '', isBot: false };
    if (/googlebot/i.test(ua)) { r.browser = 'Googlebot'; r.isBot = true; }
    else if (/curl/i.test(ua)) r.browser = 'curl';
    else {
      if (/Edg\/(\S+)/.test(ua)) { r.browser = 'Edge'; r.browserVer = RegExp.$1; }
      else if (/Chrome\/(\S+)/.test(ua) && !/Edge|OPR/.test(ua)) { r.browser = 'Chrome'; r.browserVer = RegExp.$1; }
      else if (/Firefox\/(\S+)/.test(ua)) { r.browser = 'Firefox'; r.browserVer = RegExp.$1; }
      else if (/Version\/(\S+).*Safari/.test(ua)) { r.browser = 'Safari'; r.browserVer = RegExp.$1; }
    }
    if (/Windows NT (\S+)/.test(ua)) r.os = 'Windows ' + RegExp.$1;
    else if (/Mac OS X (\S+)/.test(ua)) r.os = 'macOS ' + RegExp.$1.replace(/_/g, '.');
    else if (/Android (\S+)/.test(ua)) { r.os = 'Android ' + RegExp.$1; r.device = 'Mobile'; }
    else if (/iPhone OS (\S+)/.test(ua)) { r.os = 'iOS ' + RegExp.$1.replace(/_/g, '.'); r.device = 'Mobile'; }
    else if (/Linux/.test(ua)) r.os = 'Linux';
    if (/AppleWebKit/.test(ua)) r.engine = 'WebKit';
    if (/Gecko\//.test(ua) && !/like Gecko/.test(ua)) r.engine = 'Gecko';
    if (/Trident/.test(ua)) r.engine = 'Trident';
    return r;
  };
  const handleParse = useCallback(() => {
    if (!uaInput.trim()) { toast({ title: '请输入 UA', variant: 'destructive' }); return; }
    setParsed(parse(uaInput));
    toast({ title: '解析完成' });
  }, [uaInput, toast]);
  return <div className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-2">
        {presets.map(p => <button key={p.label} onClick={() => { setUaInput(p.ua); setParsed(parse(p.ua)); }} className="px-3 py-1.5 rounded-lg text-xs font-mono border border-dev-border bg-dev-panel text-dev-muted hover:text-dev-green hover:border-dev-green/30 transition-colors">{p.label}</button>)}
      </div>
      <div className="flex gap-3">
        <textarea value={uaInput} onChange={e => setUaInput(e.target.value)} placeholder="粘贴 User-Agent 字符串..." className="flex-1 min-h-[100px] p-4 rounded-xl border bg-dev-input text-dev-text border-dev-border font-mono text-sm focus:border-dev-green/50 focus:outline-none focus:ring-1 focus:ring-dev-green/30 placeholder:text-dev-muted/50 resize-none" />
        <ActionButton onClick={handleParse} variant="primary">解析</ActionButton>
      </div>
      {parsed && <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[['浏览器', parsed.browser + (parsed.browserVer ? ' ' + parsed.browserVer : '')], ['操作系统', parsed.os || '未知'], ['设备类型', parsed.device], ['渲染引擎', parsed.engine || '未知'], ['爬虫', parsed.isBot ? '是' : '否'], ['UA 长度', uaInput.length + ' 字符']].map(([k, v]) => <div key={k} className="bg-dev-input/50 border border-dev-border rounded-lg p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-dev-muted mb-1">{k}</div>
              <div className="text-sm font-mono text-dev-text">{v}</div>
            </div>)}
        </div>}
      {uaInput && <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-dev-muted">完整 UA:</span>
          <CopyButton text={uaInput} />
        </div>}
    </div>;
}

export default function Networktool(props) {
  const params = props.$w.page.dataset.params;
  const [activeTab, setActiveTab] = useState(params.tab || 'api');
  const renderContent = () => {
    switch (activeTab) {
      case 'api': return <ApiDebugger />;
      case 'curl': return <CurlConverter />;
      case 'ip': return <IpWhoisTool />;
      case 'port': return <PortScanner />;
      case 'ua': return <UaParser />;
      default: return <ApiDebugger />;
    }
  };
  return <div className="min-h-screen bg-dev-bg">
      <NavHeader />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <ToolHeader title="网络工具" description="接口调试、CURL 转代码、IP 查询、端口检测、UA 解析" onBack={() => props.$w.utils.navigateTo({ pageId: 'home', params: {} })} />
        <div className="app-tab-row">
          {TABS.map(t => {
            const Icon = t.icon;
            return <button key={t.id} onClick={() => setActiveTab(t.id)} className={'app-tab ' + (activeTab === t.id ? 'app-tab-active' : '')}>
                <Icon size={16} />{t.label}
              </button>;
          })}
        </div>
        {renderContent()}
      </main>
    </div>;
}
