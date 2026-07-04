import React, { useState, useCallback } from 'react';
import { Database, Type, QrCode, Image, Server, FileCode, ArrowRightLeft, Upload, Download } from 'lucide-react';
import { useToast } from '@/components/ui';
import { ToolHeader, NavHeader, ActionBar, ActionButton, CopyButton, CodePanel } from '@/components/ToolCard.jsx';

const TABS = [{ id: 'sql', label: 'SQL 工具', icon: Database }, { id: 'text', label: '文本处理', icon: Type }, { id: 'qrcode', label: '二维码', icon: QrCode }, { id: 'image', label: '图片工具', icon: Image }, { id: 'ref', label: '速查表', icon: Server }, { id: 'code', label: '代码格式化', icon: FileCode }];

function SqlTool() {
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const formatSql = useCallback(() => {
    if (!input.trim()) { toast({ title: '请输入 SQL', variant: 'destructive' }); return; }
    try {
      const kw = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN', 'ON', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'CREATE INDEX', 'AS', 'DISTINCT', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'IS NULL', 'IS NOT NULL', 'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'ASC', 'DESC'];
      let formatted = input.trim();
      kw.forEach(k => { const re = new RegExp('\\b' + k.replace(/ /g, '\\s+') + '\\b', 'gi'); formatted = formatted.replace(re, '\n' + k + ' '); });
      formatted = formatted.replace(/^\s+/, '').replace(/\n\s*\n/g, '\n');
      const lines = formatted.split('\n');
      let indent = 0;
      const result = lines.map(line => {
        const upper = line.trim().toUpperCase();
        if (/^(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|UNION|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)/.test(upper)) indent = 0;
        if (/^(LEFT|RIGHT|INNER|OUTER|JOIN|ON|AND|OR|SET|VALUES)/.test(upper)) indent = 2;
        return ' '.repeat(indent) + line.trim();
      });
      setOutput(result.join('\n'));
      toast({ title: '格式化成功' });
    } catch (e) { toast({ title: '格式化失败', description: e.message, variant: 'destructive' }); }
  }, [input, toast]);
  const compressSql = useCallback(() => {
    if (!input.trim()) { toast({ title: '请输入 SQL', variant: 'destructive' }); return; }
    setOutput(input.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim());
    toast({ title: '压缩成功' });
  }, [input, toast]);
  return <div className="space-y-4">
      <CodePanel title="输入 SQL" value={input} onChange={setInput} placeholder="SELECT * FROM users WHERE id = 1 AND status = 'active' ORDER BY created_at DESC" />
      <div className="flex gap-3">
        <ActionButton onClick={formatSql} variant="primary">格式化</ActionButton>
        <ActionButton onClick={compressSql} variant="secondary">压缩</ActionButton>
      </div>
      {output && <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-dev-muted">输出</span>
            <CopyButton text={output} />
          </div>
          <pre className="w-full min-h-[200px] p-4 rounded-xl border bg-dev-input/50 text-dev-green border-dev-border font-mono text-sm leading-relaxed overflow-auto whitespace-pre-wrap">{output}</pre>
        </div>}
    </div>;
}

function TextTool() {
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const [sep, setSep] = useState('\n');
  const actions = [{ label: '去空行', fn: () => input.replace(/^\s*[\r\n]/gm, '\n').replace(/\n{2,}/g, '\n').trim() }, { label: '去行首空格', fn: () => input.replace(/^ +/gm, '') }, { label: '去行尾空格', fn: () => input.replace(/ +$/gm, '') }, { label: '去所有空格', fn: () => input.replace(/\s+/g, '') }, { label: '去换行', fn: () => input.replace(/\n/g, '') }, { label: '转大写', fn: () => input.toUpperCase() }, { label: '转小写', fn: () => input.toLowerCase() }, { label: '首字母大写', fn: () => input.replace(/\b\w/g, c => c.toUpperCase()) }, { label: '行去重', fn: () => [...new Set(input.split('\n'))].join('\n') }, { label: '行排序', fn: () => input.split('\n').sort().join('\n') }, { label: '行倒序', fn: () => input.split('\n').reverse().join('\n') }, { label: '行编号', fn: () => input.split('\n').map((l, i) => i + 1 + '. ' + l).join('\n') }];
  const handleAction = fn => {
    if (!input) { toast({ title: '请输入文本', variant: 'destructive' }); return; }
    setOutput(fn());
    toast({ title: '处理完成' });
  };
  const handleReplace = () => {
    if (!input || !find) { toast({ title: '请输入查找内容', variant: 'destructive' }); return; }
    try {
      const re = useRegex ? new RegExp(find, 'g') : new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      setOutput(input.replace(re, replace));
      toast({ title: '替换完成' });
    } catch (e) { toast({ title: '替换失败', description: e.message, variant: 'destructive' }); }
  };
  const handleSplit = () => {
    if (!input) { toast({ title: '请输入文本', variant: 'destructive' }); return; }
    const lines = input.split('\n').filter(l => l.trim());
    setOutput(lines.join(sep));
    toast({ title: '合并完成' });
  };
  return <div className="space-y-4">
      <CodePanel title="输入文本" value={input} onChange={setInput} placeholder="粘贴或输入需要处理的文本..." />
      <div className="flex flex-wrap gap-2">
        {actions.map(a => <button key={a.label} onClick={() => handleAction(a.fn)} className="px-3 py-1.5 rounded-lg text-xs font-mono border border-dev-border bg-dev-panel text-dev-muted hover:text-dev-green hover:border-dev-green/30 transition-colors">{a.label}</button>)}
      </div>
      <div className="bg-dev-panel border border-dev-border rounded-xl p-4 space-y-3">
        <span className="text-xs font-mono uppercase tracking-wider text-dev-muted">批量替换</span>
        <div className="flex gap-3 items-center">
          <input value={find} onChange={e => setFind(e.target.value)} placeholder="查找" className="flex-1 bg-dev-input border border-dev-border rounded-lg px-3 py-2 text-sm font-mono text-dev-text focus:border-dev-green/50 focus:outline-none placeholder:text-dev-muted/50" />
          <ArrowRightLeft size={16} className="text-dev-muted" />
          <input value={replace} onChange={e => setReplace(e.target.value)} placeholder="替换为" className="flex-1 bg-dev-input border border-dev-border rounded-lg px-3 py-2 text-sm font-mono text-dev-text focus:border-dev-green/50 focus:outline-none placeholder:text-dev-muted/50" />
          <label className="flex items-center gap-2 text-xs font-mono text-dev-muted whitespace-nowrap">
            <input type="checkbox" checked={useRegex} onChange={e => setUseRegex(e.target.checked)} className="accent-dev-green" />正则
          </label>
          <ActionButton onClick={handleReplace} variant="primary" className="text-xs">替换</ActionButton>
        </div>
        <div className="flex gap-3 items-center">
          <span className="text-xs font-mono text-dev-muted whitespace-nowrap">分割合并:</span>
          <select value={sep} onChange={e => setSep(e.target.value)} className="bg-dev-input border border-dev-border rounded-lg px-3 py-2 text-xs font-mono text-dev-green focus:border-dev-green/50 focus:outline-none">
            <option value="\n">换行</option>
            <option value=",">逗号</option>
            <option value=", ">逗号+空格</option>
            <option value="|">竖线</option>
            <option value=";">分号</option>
          </select>
          <ActionButton onClick={handleSplit} variant="secondary" className="text-xs">合并</ActionButton>
        </div>
      </div>
      {output && <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-dev-muted">输出</span>
            <CopyButton text={output} />
          </div>
          <pre className="w-full min-h-[150px] p-4 rounded-xl border bg-dev-input/50 text-dev-green border-dev-border font-mono text-sm leading-relaxed overflow-auto whitespace-pre-wrap">{output}</pre>
        </div>}
    </div>;
}

function QrCodeTool() {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [qrData, setQrData] = useState(null);
  const generateQR = useCallback(() => {
    if (!text.trim()) { toast({ title: '请输入内容', variant: 'destructive' }); return; }
    try {
      const size = 21;
      const data = text.trim();
      let bitStr = '';
      for (let i = 0; i < data.length; i++) {
        const c = data.charCodeAt(i);
        if (c < 128) bitStr += c.toString(2).padStart(8, '0');
        else { const e = encodeURIComponent(data[i]); for (let j = 0; j < e.length; j++) bitStr += e.charCodeAt(j).toString(2).padStart(8, '0'); }
      }
      const simplified = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const isFinder = r < 7 && c < 7 || r < 7 && c >= size - 7 || r >= size - 7 && c < 7;
          if (isFinder) {
            const lr = r < 7 ? r : r >= size - 7 ? r - (size - 7) : r;
            const lc = c < 7 ? c : c >= size - 7 ? c - (size - 7) : c;
            const isBorder = lr === 0 || lr === 6 || lc === 0 || lc === 6;
            const isInner = lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4;
            simplified.push(isBorder || isInner);
          } else {
            const idx = r * size + c;
            simplified.push(bitStr.length > idx && bitStr[idx] === '1');
          }
        }
      }
      setQrData(simplified);
      toast({ title: '生成成功' });
    } catch (e) { toast({ title: '生成失败', description: e.message, variant: 'destructive' }); }
  }, [text, toast]);
  const downloadQr = () => {
    const canvas = document.createElement('canvas');
    const s = 21, cs = 10, m = 4;
    canvas.width = (s + m * 2) * cs;
    canvas.height = canvas.width;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#00e5a0';
    if (qrData) qrData.forEach((v, i) => { if (v) { const r = Math.floor(i / s) + m; const c = i % s + m; ctx.fillRect(c * cs, r * cs, cs, cs); } });
    const a = document.createElement('a');
    a.download = 'qrcode.png';
    a.href = canvas.toDataURL();
    a.click();
  };
  return <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <CodePanel title="内容" value={text} onChange={setText} placeholder="输入要生成二维码的内容（URL/文本）..." />
          <ActionBar><ActionButton onClick={generateQR} variant="primary">生成二维码</ActionButton></ActionBar>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[280px] border border-dev-border rounded-xl bg-dev-input/30">
          {qrData ? <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <svg width="210" height="210" viewBox="0 0 210 210">
                  {qrData.map((v, i) => v ? <rect key={i} x={i % 21 * 10} y={Math.floor(i / 21) * 10} width="10" height="10" fill="#00e5a0" /> : null)}
                </svg>
              </div>
              <button onClick={downloadQr} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono bg-dev-green/10 text-dev-green border border-dev-green/30 hover:bg-dev-green/20 transition-colors"><Download size={14} />下载 PNG</button>
            </div> : <span className="text-dev-muted/40 text-sm font-mono">输入内容并生成</span>}
        </div>
      </div>
    </div>;
}

function ImageTool() {
  const { toast } = useToast();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [format, setFormat] = useState('image/png');
  const [quality, setQuality] = useState(0.8);
  const [result, setResult] = useState('');
  const [origSize, setOrigSize] = useState(0);
  const [newSize, setNewSize] = useState(0);
  const [scale, setScale] = useState(100);
  const handleFile = e => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast({ title: '请选择图片文件', variant: 'destructive' }); return; }
    setFile(f);
    setOrigSize(f.size);
    setPreview(URL.createObjectURL(f));
    setResult('');
  };
  const handleDrop = e => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) { setFile(f); setOrigSize(f.size); setPreview(URL.createObjectURL(f)); setResult(''); }
    else toast({ title: '请拖入图片文件', variant: 'destructive' });
  };
  const convert = useCallback(() => {
    if (!file || !preview) { toast({ title: '请先选择图片', variant: 'destructive' }); return; }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale / 100);
      canvas.height = Math.round(img.height * scale / 100);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => { if (blob) { setResult(URL.createObjectURL(blob)); setNewSize(blob.size); toast({ title: '转换成功' }); } }, format, quality);
    };
    img.src = preview;
  }, [file, preview, format, quality, scale, toast]);
  const download = () => { if (!result) return; const ext = format.split('/')[1]; const a = document.createElement('a'); a.download = 'converted.' + ext; a.href = result; a.click(); };
  return <div className="space-y-4">
      <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} className="border-2 border-dashed border-dev-border rounded-xl p-8 text-center hover:border-dev-green/40 transition-colors cursor-pointer" onClick={() => document.getElementById('img-input').click()}>
        <input id="img-input" type="file" accept="image/*" className="hidden" onChange={handleFile} />
        {preview ? <img src={preview} alt="preview" className="max-h-48 mx-auto rounded-lg" /> : <><Upload size={32} className="mx-auto text-dev-muted/30 mb-3" /><p className="text-sm font-mono text-dev-muted/50">点击或拖拽图片到此处</p></>}
      </div>
      {file && <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-dev-input/50 border border-dev-border rounded-lg p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-dev-muted mb-1">原始大小</div>
              <div className="text-sm font-mono text-dev-text">{(origSize / 1024).toFixed(1)} KB</div>
            </div>
            <div className="bg-dev-input/50 border border-dev-border rounded-lg p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-dev-muted mb-1">格式</div>
              <select value={format} onChange={e => setFormat(e.target.value)} className="bg-transparent text-sm font-mono text-dev-green focus:outline-none w-full">
                <option value="image/png">PNG</option><option value="image/jpeg">JPG</option><option value="image/webp">WebP</option>
              </select>
            </div>
            <div className="bg-dev-input/50 border border-dev-border rounded-lg p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-dev-muted mb-1">缩放 {scale}%</div>
              <input type="range" min="10" max="200" value={scale} onChange={e => setScale(parseInt(e.target.value))} className="w-full accent-dev-green" />
            </div>
            <div className="bg-dev-input/50 border border-dev-border rounded-lg p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-dev-muted mb-1">质量 {Math.round(quality * 100)}%</div>
              <input type="range" min="10" max="100" value={quality * 100} onChange={e => setQuality(parseInt(e.target.value) / 100)} className="w-full accent-dev-green" />
            </div>
          </div>
          <div className="flex gap-3">
            <ActionButton onClick={convert} variant="primary">转换 / 压缩</ActionButton>
          </div>
        </div>}
      {result && <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-dev-input/50 border border-dev-border rounded-lg p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-dev-muted mb-1">新大小</div>
              <div className="text-sm font-mono text-dev-green">{(newSize / 1024).toFixed(1)} KB ({origSize > 0 ? Math.round((1 - newSize / origSize) * 100) : 0}% 压缩)</div>
            </div>
          </div>
          <img src={result} alt="result" className="max-h-48 rounded-lg border border-dev-border" />
          <button onClick={download} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono bg-dev-green/10 text-dev-green border border-dev-green/30 hover:bg-dev-green/20 transition-colors"><Download size={14} />下载</button>
        </div>}
    </div>;
}

function RefTable() {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('port');
  const portTable = [[20, 'FTP-DATA', 'FTP 数据传输'], [21, 'FTP', 'FTP 控制连接'], [22, 'SSH', '安全远程登录'], [23, 'TELNET', '远程登录(明文)'], [25, 'SMTP', '邮件发送'], [53, 'DNS', '域名解析'], [67, 'DHCP-S', 'DHCP 服务端'], [68, 'DHCP-C', 'DHCP 客户端'], [69, 'TFTP', '简单文件传输'], [80, 'HTTP', 'Web 服务'], [110, 'POP3', '邮件接收'], [119, 'NNTP', '网络新闻'], [123, 'NTP', '时间同步'], [143, 'IMAP', '邮件访问'], [161, 'SNMP', '网络管理'], [194, 'IRC', '即时通讯'], [443, 'HTTPS', '安全 Web'], [445, 'SMB', '文件共享'], [465, 'SMTPS', '安全邮件发送'], [514, 'Syslog', '系统日志'], [587, 'SMTP-Sub', '邮件提交'], [993, 'IMAPS', '安全 IMAP'], [995, 'POP3S', '安全 POP3'], [1080, 'SOCKS', '代理'], [1433, 'MSSQL', 'SQL Server'], [1521, 'Oracle', 'Oracle DB'], [2049, 'NFS', '网络文件系统'], [2181, 'ZooKeeper', '分布式协调'], [2375, 'Docker', 'Docker API'], [3306, 'MySQL', 'MySQL 数据库'], [3389, 'RDP', '远程桌面'], [5432, 'PostgreSQL', 'PostgreSQL'], [5672, 'AMQP', '消息队列'], [5900, 'VNC', '远程桌面'], [6379, 'Redis', 'Redis 缓存'], [6443, 'K8s-API', 'Kubernetes API'], [8080, 'HTTP-Alt', '备用 Web'], [8443, 'HTTPS-Alt', '备用安全 Web'], [8888, 'Jupyter', 'Jupyter Notebook'], [9090, 'Prometheus', '监控'], [9200, 'Elasticsearch', '搜索引擎'], [9300, 'ES-Transport', 'ES 传输'], [11211, 'Memcached', '内存缓存'], [27017, 'MongoDB', 'MongoDB'], [27018, 'MongoDB', 'MongoDB Shard'], [2888, 'Kafka-JMX', 'Kafka JMX'], [9092, 'Kafka', 'Kafka Broker']];
  const statusCodes = [[200, 'OK', '请求成功'], [201, 'Created', '资源创建成功'], [204, 'No Content', '无内容返回'], [301, 'Moved Permanently', '永久重定向'], [302, 'Found', '临时重定向'], [304, 'Not Modified', '缓存未修改'], [307, 'Temporary Redirect', '临时重定向(保持方法)'], [308, 'Permanent Redirect', '永久重定向(保持方法)'], [400, 'Bad Request', '请求格式错误'], [401, 'Unauthorized', '未认证'], [403, 'Forbidden', '无权限'], [404, 'Not Found', '资源不存在'], [405, 'Method Not Allowed', '方法不允许'], [408, 'Request Timeout', '请求超时'], [409, 'Conflict', '资源冲突'], [410, 'Gone', '资源已删除'], [413, 'Payload Too Large', '请求体过大'], [422, 'Unprocessable Entity', '参数验证失败'], [429, 'Too Many Requests', '请求过多'], [500, 'Internal Server Error', '服务器内部错误'], [502, 'Bad Gateway', '网关错误'], [503, 'Service Unavailable', '服务不可用'], [504, 'Gateway Timeout', '网关超时']];
  const data = tab === 'port' ? portTable : statusCodes;
  const filtered = data.filter(row => row.some(cell => String(cell).toLowerCase().includes(search.toLowerCase())));
  return <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <div className="flex bg-dev-panel border border-dev-border rounded-lg overflow-hidden">
          <button onClick={() => setTab('port')} className={'px-4 py-2.5 text-sm font-mono transition-colors ' + (tab === 'port' ? 'bg-dev-green/15 text-dev-green' : 'text-dev-muted hover:text-dev-text')}>端口对照</button>
          <button onClick={() => setTab('http')} className={'px-4 py-2.5 text-sm font-mono transition-colors ' + (tab === 'http' ? 'bg-dev-green/15 text-dev-green' : 'text-dev-muted hover:text-dev-text')}>HTTP 状态码</button>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索端口/服务/状态码..." className="flex-1 bg-dev-input border border-dev-border rounded-lg px-4 py-2.5 text-sm font-mono text-dev-text focus:border-dev-green/50 focus:outline-none placeholder:text-dev-muted/50" />
      </div>
      <div className="border border-dev-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-dev-panel border-b border-dev-border">
            <th className="text-left px-4 py-3 text-xs font-mono uppercase tracking-wider text-dev-muted">{tab === 'port' ? '端口' : '状态码'}</th>
            <th className="text-left px-4 py-3 text-xs font-mono uppercase tracking-wider text-dev-muted">名称</th>
            <th className="text-left px-4 py-3 text-xs font-mono uppercase tracking-wider text-dev-muted">说明</th>
          </tr></thead>
          <tbody>
            {filtered.map((row, i) => <tr key={i} className="border-b border-dev-border/50 hover:bg-dev-input/30 transition-colors">
                <td className="px-4 py-2.5 text-sm font-mono text-dev-green">{row[0]}</td>
                <td className="px-4 py-2.5 text-sm font-mono text-dev-text">{row[1]}</td>
                <td className="px-4 py-2.5 text-xs font-mono text-dev-muted">{row[2]}</td>
              </tr>)}
          </tbody>
        </table>
      </div>
      <div className="text-xs font-mono text-dev-muted/50">共 {filtered.length} 条记录</div>
    </div>;
}

function CodeFormatTool() {
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [lang, setLang] = useState('js');
  const formatCode = useCallback(() => {
    if (!input.trim()) { toast({ title: '请输入代码', variant: 'destructive' }); return; }
    try {
      let formatted = input;
      if (lang === 'json') formatted = JSON.stringify(JSON.parse(input), null, 2);
      else {
        formatted = input.replace(/;\s*/g, ';\n').replace(/\{\s*/g, '{\n  ').replace(/\s*\}/g, '\n}').replace(/,\s*/g, ',\n  ');
        const lines = formatted.split('\n');
        let indent = 0;
        formatted = lines.map(line => { if (line.includes('}')) indent = Math.max(0, indent - 1); const result = '  '.repeat(indent) + line.trim(); if (line.includes('{')) indent++; return result; }).join('\n');
      }
      setOutput(formatted);
      toast({ title: '格式化成功' });
    } catch (e) { toast({ title: '格式化失败', description: e.message, variant: 'destructive' }); }
  }, [input, lang, toast]);
  const compressCode = useCallback(() => {
    if (!input.trim()) { toast({ title: '请输入代码', variant: 'destructive' }); return; }
    try {
      let minified = input;
      if (lang === 'json') minified = JSON.stringify(JSON.parse(input));
      else minified = input.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').replace(/\s*([{}();,=+\-*/<>!&|?:])\s*/g, '$1').trim();
      setOutput(minified);
      toast({ title: '压缩成功' });
    } catch (e) { toast({ title: '压缩失败', description: e.message, variant: 'destructive' }); }
  }, [input, lang, toast]);
  return <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={lang} onChange={e => setLang(e.target.value)} className="bg-dev-input border border-dev-border rounded-lg px-3 py-2.5 text-sm font-mono text-dev-green focus:border-dev-green/50 focus:outline-none">
          <option value="js">JavaScript / TypeScript</option>
          <option value="json">JSON</option>
          <option value="css">CSS</option>
        </select>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CodePanel title="输入代码" value={input} onChange={setInput} placeholder={lang === 'json' ? '{"name":"test","value":123}' : 'const x=1;function test(){return x+1;}'} />
        <div className="space-y-3">
          <div className="flex gap-3">
            <ActionButton onClick={formatCode} variant="primary">格式化</ActionButton>
            <ActionButton onClick={compressCode} variant="secondary">压缩</ActionButton>
          </div>
          <CodePanel title="输出" value={output} onChange={() => {}} readOnly />
        </div>
      </div>
    </div>;
}

export default function Assisttool(props) {
  const params = props.$w.page.dataset.params;
  const [activeTab, setActiveTab] = useState(params.tab || 'sql');
  const renderContent = () => {
    switch (activeTab) {
      case 'sql': return <SqlTool />;
      case 'text': return <TextTool />;
      case 'qrcode': return <QrCodeTool />;
      case 'image': return <ImageTool />;
      case 'ref': return <RefTable />;
      case 'code': return <CodeFormatTool />;
      default: return <SqlTool />;
    }
  };
  return <div className="min-h-screen bg-dev-bg">
      <NavHeader />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <ToolHeader title="开发辅助" description="SQL 工具、文本处理、二维码、图片工具、速查表、代码格式化" onBack={() => props.$w.utils.navigateTo({ pageId: 'home', params: {} })} />
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
