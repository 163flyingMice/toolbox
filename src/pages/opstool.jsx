import React, { useCallback, useMemo, useState } from 'react';
import { Clock, Server, Terminal, Database, Search, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui';
import { ToolHeader, NavHeader, ActionButton, CopyButton } from '@/components/ToolCard.jsx';

const TABS = [{ id: 'cron', label: 'Cron', icon: Clock }, { id: 'nginx', label: 'Nginx', icon: Server }, { id: 'docker', label: 'Docker', icon: Terminal }, { id: 'unit', label: '单位换算', icon: Database }];
const CRON_PRESETS = [{ label: '每 5 分钟', value: '*/5 * * * *' }, { label: '每小时整点', value: '0 * * * *' }, { label: '每天 02:30', value: '30 2 * * *' }, { label: '工作日 09:00', value: '0 9 * * 1-5' }, { label: '每月 1 日 00:00', value: '0 0 1 * *' }];
const MONTH_NAMES = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const WEEKDAY_NAMES = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

function normalizeCronToken(token, aliases) {
  return String(token || '').toLowerCase().replace(/[a-z]{3}/g, word => { const n = aliases[word]; return n == null ? word : String(n); });
}

function parseCronField(field, min, max, aliases = {}) {
  const raw = String(field || '').trim();
  if (!raw) throw new Error('字段不能为空');
  const set = new Set();
  const addRange = (start, end, step = 1) => {
    if (start < min || end > max || start > end || step < 1) throw new Error(`${raw} 超出范围 ${min}-${max}`);
    for (let i = start; i <= end; i += step) set.add(max === 7 && i === 7 ? 0 : i);
  };
  normalizeCronToken(raw, aliases).split(',').forEach(part => {
    const [base, stepRaw] = part.split('/');
    const step = stepRaw ? Number(stepRaw) : 1;
    if (!Number.isInteger(step) || step < 1) throw new Error(`${raw} 步长无效`);
    if (base === '*' || base === '?') { addRange(min, max, step); return; }
    if (base.includes('-')) {
      const [startRaw, endRaw] = base.split('-');
      const start = Number(startRaw), end = Number(endRaw);
      if (!Number.isInteger(start) || !Number.isInteger(end)) throw new Error(`${raw} 范围无效`);
      addRange(start, end, step); return;
    }
    const value = Number(base);
    if (!Number.isInteger(value)) throw new Error(`${raw} 数值无效`);
    addRange(value, value, step);
  });
  return set;
}

function fieldLabel(field, names) {
  if (field === '*') return '每';
  return field.replace(/\*/g, '每').replace(/,/g, '、').replace(/\//g, ' 每隔 ').replace(/-/g, ' 到 ').replace(/[a-z]{3}/gi, word => names?.[word.toLowerCase()] || word);
}

function describeCron(parts) {
  const [minute, hour, day, month, weekday] = parts;
  const monthNames = { jan: '1月', feb: '2月', mar: '3月', apr: '4月', may: '5月', jun: '6月', jul: '7月', aug: '8月', sep: '9月', oct: '10月', nov: '11月', dec: '12月' };
  const weekNames = { sun: '周日', mon: '周一', tue: '周二', wed: '周三', thu: '周四', fri: '周五', sat: '周六' };
  return [`分钟: ${fieldLabel(minute, null)}`, `小时: ${fieldLabel(hour, null)}`, `日期: ${fieldLabel(day, null)}`, `月份: ${fieldLabel(month, monthNames)}`, `星期: ${fieldLabel(weekday, weekNames)}`].join(' / ');
}

function validateCronExpression(expr) {
  const parts = String(expr || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length !== 5) throw new Error('仅支持 Linux 5 段 Cron：分 时 日 月 周');
  const parsed = { minute: parseCronField(parts[0], 0, 59), hour: parseCronField(parts[1], 0, 23), day: parseCronField(parts[2], 1, 31), month: parseCronField(parts[3], 1, 12, MONTH_NAMES), weekday: parseCronField(parts[4], 0, 7, WEEKDAY_NAMES) };
  return { parts, parsed, summary: describeCron(parts) };
}

function getNextCronRuns(expr, count = 5) {
  const { parsed, parts } = validateCronExpression(expr);
  const dayAny = parts[2] === '*' || parts[2] === '?';
  const weekdayAny = parts[4] === '*' || parts[4] === '?';
  const out = [];
  const cursor = new Date();
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);
  const maxChecks = 60 * 24 * 366 * 2;
  for (let i = 0; i < maxChecks && out.length < count; i += 1) {
    const minuteOk = parsed.minute.has(cursor.getMinutes());
    const hourOk = parsed.hour.has(cursor.getHours());
    const monthOk = parsed.month.has(cursor.getMonth() + 1);
    const dayOk = parsed.day.has(cursor.getDate());
    const weekdayOk = parsed.weekday.has(cursor.getDay());
    const dateOk = dayAny && weekdayAny ? true : dayAny ? weekdayOk : weekdayAny ? dayOk : dayOk || weekdayOk;
    if (minuteOk && hourOk && monthOk && dateOk) out.push(new Date(cursor));
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return out;
}

function CronTool() {
  const { toast } = useToast();
  const [expr, setExpr] = useState('*/5 * * * *');
  const [result, setResult] = useState(null);
  const check = useCallback(() => {
    try {
      const validation = validateCronExpression(expr);
      const nextRuns = getNextCronRuns(expr);
      setResult({ ok: true, summary: validation.summary, nextRuns });
      toast({ title: 'Cron 表达式有效' });
    } catch (err) {
      setResult({ ok: false, message: err?.message || '表达式无效' });
      toast({ title: 'Cron 表达式无效', description: err?.message, variant: 'destructive' });
    }
  }, [expr, toast]);
  return <div className="space-y-5">
      <div className="rounded-xl border border-dev-border bg-dev-panel p-4">
        <label className="mb-2 block text-xs font-mono uppercase tracking-wider text-dev-muted">Cron 表达式</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input value={expr} onChange={e => setExpr(e.target.value)} onKeyDown={e => e.key === 'Enter' && check()} className="flex-1 rounded-lg border border-dev-border bg-dev-input px-3 py-2.5 font-mono text-sm text-dev-text placeholder:text-dev-muted/50 focus:border-dev-green/50 focus:outline-none" placeholder="*/5 * * * *" />
          <ActionButton onClick={check} variant="primary">校验</ActionButton>
        </div>
        <p className="mt-2 text-[10px] font-mono text-dev-muted/50">格式：分 时 日 月 周，支持 *、?、逗号、范围、步长和英文月份/星期缩写。</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {CRON_PRESETS.map(item => <button key={item.value} onClick={() => setExpr(item.value)} className="rounded-lg border border-dev-border bg-dev-panel px-3 py-1.5 text-xs font-mono text-dev-muted transition-colors hover:border-dev-green/30 hover:text-dev-green">{item.label}</button>)}
      </div>
      {result && <div className={'rounded-xl border p-4 ' + (result.ok ? 'border-dev-green/30 bg-dev-green/5' : 'border-dev-orange/30 bg-dev-orange/5')}>
          <div className="mb-2 flex items-center gap-2">
            {result.ok ? <CheckCircle2 size={16} className="text-dev-green" /> : <AlertCircle size={16} className="text-dev-orange" />}
            <span className={'text-sm font-heading font-semibold ' + (result.ok ? 'text-dev-green' : 'text-dev-orange')}>{result.ok ? '表达式有效' : '表达式无效'}</span>
          </div>
          {result.ok ? <div className="space-y-3">
              <p className="text-xs font-mono text-dev-muted">{result.summary}</p>
              <div>
                <p className="mb-1 text-xs font-mono text-dev-muted/60">最近 5 次执行</p>
                <div className="space-y-1">
                  {result.nextRuns.map(item => <p key={item.toISOString()} className="font-mono text-sm text-dev-text">{item.toLocaleString('zh-CN', { hour12: false })}</p>)}
                </div>
              </div>
            </div> : <p className="text-xs font-mono text-dev-muted">{result.message}</p>}
        </div>}
    </div>;
}

function formatNginxConfig(input) {
  const text = String(input || '').replace(/\r\n/g, '\n');
  const lines = [];
  let token = '', quote = '', escaped = false, indent = 0, balance = 0;
  const pushToken = (extra = '') => { const value = (token + extra).trim(); if (value) lines.push('  '.repeat(Math.max(0, indent)) + value); token = ''; };
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i], next = text[i + 1];
    if (escaped) { token += ch; escaped = false; continue; }
    if (ch === '\\' && quote) { token += ch; escaped = true; continue; }
    if ((ch === '"' || ch === "'") && !quote) { quote = ch; token += ch; continue; }
    if (ch === quote) { quote = ''; token += ch; continue; }
    if (!quote && ch === '#') { const comment = text.slice(i, text.indexOf('\n', i) === -1 ? text.length : text.indexOf('\n', i)).trim(); if (token.trim()) pushToken(); lines.push('  '.repeat(Math.max(0, indent)) + comment); i += comment.length - 1; continue; }
    if (!quote && ch === '{') { pushToken(' {'); indent += 1; balance += 1; continue; }
    if (!quote && ch === '}') { if (token.trim()) pushToken(); indent = Math.max(0, indent - 1); balance -= 1; lines.push('  '.repeat(Math.max(0, indent)) + '}'); if (next === ';') i += 1; continue; }
    if (!quote && ch === ';') { pushToken(';'); continue; }
    if (!quote && ch === '\n') { if (token.trim()) pushToken(); continue; }
    token += ch;
  }
  if (token.trim()) pushToken();
  return { output: lines.join('\n'), balance };
}

function NginxTool() {
  const { toast } = useToast();
  const [input, setInput] = useState('server { listen 80; server_name example.com; location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; } }');
  const [output, setOutput] = useState('');
  const [message, setMessage] = useState('');
  const format = useCallback(() => {
    if (!input.trim()) { toast({ title: '请输入 Nginx 配置', variant: 'destructive' }); return; }
    const result = formatNginxConfig(input);
    setOutput(result.output);
    setMessage(result.balance === 0 ? '括号数量正常' : result.balance > 0 ? `缺少 ${result.balance} 个 }` : `多出 ${Math.abs(result.balance)} 个 }`);
    toast({ title: '格式化完成' });
  }, [input, toast]);
  return <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-dev-muted">输入配置</span>
          <ActionButton onClick={() => setInput('')} variant="secondary" className="text-xs">清空</ActionButton>
        </div>
        <textarea value={input} onChange={e => setInput(e.target.value)} className="min-h-[420px] w-full resize-none rounded-xl border border-dev-border bg-dev-input p-4 font-mono text-sm leading-relaxed text-dev-text placeholder:text-dev-muted/50 focus:border-dev-green/50 focus:outline-none" placeholder="粘贴 nginx.conf 或 server/location 片段..." />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ActionButton onClick={format} variant="primary">格式化</ActionButton>
            {message && <span className="text-xs font-mono text-dev-muted">{message}</span>}
          </div>
          {output && <CopyButton text={output} />}
        </div>
        <pre className="min-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl border border-dev-border bg-dev-input/50 p-4 font-mono text-sm leading-relaxed text-dev-green">{output || '格式化结果会显示在这里'}</pre>
      </div>
    </div>;
}

const DOCKER_COMMANDS = [{ group: '容器', title: '查看运行容器', cmd: 'docker ps', note: '加 -a 查看全部容器' }, { group: '容器', title: '启动容器', cmd: 'docker start <container>', note: '支持容器名或 ID' }, { group: '容器', title: '进入容器 shell', cmd: 'docker exec -it <container> /bin/sh', note: '镜像有 bash 时可换成 /bin/bash' }, { group: '容器', title: '查看日志', cmd: 'docker logs -f --tail=200 <container>', note: '实时跟随最近 200 行' }, { group: '镜像', title: '构建镜像', cmd: 'docker build -t app:latest .', note: '当前目录 Dockerfile' }, { group: '镜像', title: '运行并映射端口', cmd: 'docker run -d --name app -p 8080:80 app:latest', note: '宿主 8080 到容器 80' }, { group: '镜像', title: '查看镜像', cmd: 'docker images', note: '列出本机镜像' }, { group: '清理', title: '清理未使用资源', cmd: 'docker system prune', note: '谨慎执行，会删除未使用对象' }, { group: 'Compose', title: '后台启动服务', cmd: 'docker compose up -d', note: '读取 compose.yaml' }, { group: 'Compose', title: '查看服务日志', cmd: 'docker compose logs -f --tail=200', note: '可追加服务名' }, { group: '网络', title: '查看网络', cmd: 'docker network ls', note: '列出 Docker 网络' }, { group: '卷', title: '查看数据卷', cmd: 'docker volume ls', note: '列出 Docker volumes' }];

function DockerCheatsheet() {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => { const q = query.trim().toLowerCase(); if (!q) return DOCKER_COMMANDS; return DOCKER_COMMANDS.filter(item => [item.group, item.title, item.cmd, item.note].join(' ').toLowerCase().includes(q)); }, [query]);
  return <div className="space-y-5">
      <div className="relative max-w-xl">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dev-muted" />
        <input value={query} onChange={e => setQuery(e.target.value)} className="w-full rounded-xl border border-dev-border bg-dev-input py-3 pl-10 pr-3 font-mono text-sm text-dev-text placeholder:text-dev-muted/50 focus:border-dev-green/50 focus:outline-none" placeholder="搜索 run / logs / compose / prune..." />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {filtered.map(item => <div key={item.title + item.cmd} className="rounded-xl border border-dev-border bg-dev-panel p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div><span className="text-[10px] font-mono text-dev-muted/50">{item.group}</span><h3 className="text-sm font-heading font-semibold text-dev-text">{item.title}</h3></div>
              <CopyButton text={item.cmd} />
            </div>
            <pre className="overflow-auto rounded-lg border border-dev-border bg-dev-input/60 p-3 font-mono text-xs text-dev-green">{item.cmd}</pre>
            <p className="mt-2 text-xs font-mono text-dev-muted/60">{item.note}</p>
          </div>)}
      </div>
    </div>;
}

const UNIT_GROUPS = {
  storage: { label: '存储', baseLabel: 'Bytes', units: [{ label: 'B', factor: 1 }, { label: 'KB', factor: 1000 }, { label: 'MB', factor: 1000 ** 2 }, { label: 'GB', factor: 1000 ** 3 }, { label: 'TB', factor: 1000 ** 4 }, { label: 'KiB', factor: 1024 }, { label: 'MiB', factor: 1024 ** 2 }, { label: 'GiB', factor: 1024 ** 3 }, { label: 'TiB', factor: 1024 ** 4 }] },
  traffic: { label: '流量速率', baseLabel: 'bps', units: [{ label: 'bps', factor: 1 }, { label: 'Kbps', factor: 1000 }, { label: 'Mbps', factor: 1000 ** 2 }, { label: 'Gbps', factor: 1000 ** 3 }, { label: 'B/s', factor: 8 }, { label: 'KB/s', factor: 8 * 1000 }, { label: 'MB/s', factor: 8 * 1000 ** 2 }, { label: 'GB/s', factor: 8 * 1000 ** 3 }] },
  time: { label: '时间', baseLabel: 'seconds', units: [{ label: 'ms', factor: 0.001 }, { label: 's', factor: 1 }, { label: 'min', factor: 60 }, { label: 'h', factor: 3600 }, { label: 'day', factor: 86400 }, { label: 'week', factor: 604800 }, { label: 'month(30d)', factor: 2592000 }, { label: 'year(365d)', factor: 31536000 }] }
};

function formatNumber(value) {
  if (!Number.isFinite(value)) return '--';
  if (Math.abs(value) >= 1000000 || Math.abs(value) < 0.0001 && value !== 0) return value.toExponential(6);
  return Number(value.toFixed(8)).toString();
}

function UnitConverter() {
  const [groupId, setGroupId] = useState('storage');
  const group = UNIT_GROUPS[groupId];
  const [value, setValue] = useState('1024');
  const [from, setFrom] = useState('MB');
  const [to, setTo] = useState('GB');
  const fromUnit = group.units.find(item => item.label === from) || group.units[0];
  const toUnit = group.units.find(item => item.label === to) || group.units[1] || group.units[0];
  const num = Number(value);
  const base = Number.isFinite(num) ? num * fromUnit.factor : NaN;
  const result = Number.isFinite(base) ? base / toUnit.factor : NaN;
  const switchGroup = nextId => { const ng = UNIT_GROUPS[nextId]; setGroupId(nextId); setFrom(ng.units[0].label); setTo(ng.units[1]?.label || ng.units[0].label); };
  return <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {Object.entries(UNIT_GROUPS).map(([id, item]) => <button key={id} onClick={() => switchGroup(id)} className={'rounded-lg border px-3 py-1.5 text-xs font-mono transition-colors ' + (groupId === id ? 'border-dev-green/40 bg-dev-green/10 text-dev-green' : 'border-dev-border bg-dev-panel text-dev-muted hover:text-dev-text')}>{item.label}</button>)}
      </div>
      <div className="rounded-xl border border-dev-border bg-dev-panel p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_160px_48px_160px]">
          <input value={value} onChange={e => setValue(e.target.value)} className="rounded-lg border border-dev-border bg-dev-input px-3 py-2.5 font-mono text-sm text-dev-text focus:border-dev-green/50 focus:outline-none" placeholder="输入数值" />
          <select value={from} onChange={e => setFrom(e.target.value)} className="rounded-lg border border-dev-border bg-dev-input px-3 py-2.5 font-mono text-sm text-dev-green focus:border-dev-green/50 focus:outline-none">
            {group.units.map(unit => <option key={unit.label} value={unit.label}>{unit.label}</option>)}
          </select>
          <button onClick={() => { setFrom(to); setTo(from); }} className="rounded-lg border border-dev-border bg-dev-input px-3 py-2 font-mono text-dev-muted hover:text-dev-green"><RefreshCw size={15} /></button>
          <select value={to} onChange={e => setTo(e.target.value)} className="rounded-lg border border-dev-border bg-dev-input px-3 py-2.5 font-mono text-sm text-dev-green focus:border-dev-green/50 focus:outline-none">
            {group.units.map(unit => <option key={unit.label} value={unit.label}>{unit.label}</option>)}
          </select>
        </div>
        <div className="mt-5 rounded-lg border border-dev-border bg-dev-input/50 p-4">
          <p className="text-xs font-mono text-dev-muted/60">结果</p>
          <div className="mt-1 flex flex-wrap items-end gap-2">
            <span className="font-mono text-3xl text-dev-green">{formatNumber(result)}</span>
            <span className="pb-1 font-mono text-sm text-dev-muted">{toUnit.label}</span>
          </div>
          <p className="mt-2 text-xs font-mono text-dev-muted/50">基准值：{formatNumber(base)} {group.baseLabel}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {group.units.map(unit => <div key={unit.label} className="rounded-lg border border-dev-border/50 bg-dev-panel/50 px-3 py-2">
            <span className="text-[10px] font-mono text-dev-muted/50">{unit.label}</span>
            <p className="font-mono text-sm text-dev-text">{formatNumber(Number.isFinite(base) ? base / unit.factor : NaN)}</p>
          </div>)}
      </div>
    </div>;
}

export default function Opstool(props) {
  const params = props.$w.page.dataset.params;
  const [activeTab, setActiveTab] = useState(params.tab || 'cron');
  const renderContent = () => { switch (activeTab) { case 'cron': return <CronTool />; case 'nginx': return <NginxTool />; case 'docker': return <DockerCheatsheet />; case 'unit': return <UnitConverter />; default: return <CronTool />; } };
  return <div className="min-h-screen bg-dev-bg">
      <NavHeader />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <ToolHeader title="运维 & 容器小工具" description="Cron 校验、Nginx 配置格式化、Docker 速查、常用单位换算" onBack={() => props.$w.utils.navigateTo({ pageId: 'home', params: {} })} />
        <div className="app-tab-row">
          {TABS.map(tab => { const Icon = tab.icon; return <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={'app-tab ' + (activeTab === tab.id ? 'app-tab-active' : '')}><Icon size={16} />{tab.label}</button>; })}
        </div>
        {renderContent()}
      </main>
    </div>;
}
