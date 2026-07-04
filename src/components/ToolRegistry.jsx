import React from 'react';
import { Braces, Code2, Clock, Regex, Palette, Fingerprint, Hash, Database, FileText, Binary, FileCode, GitBranch, Terminal, Globe, Lock, Zap, Layers, BookOpen, TrendingUp, Gamepad2, Shield, Dice5, Key, Send, Network, MonitorSmartphone, Type, QrCode, Image, Server } from 'lucide-react';

export const CATEGORIES = [{ id: 'data', label: '数据处理', icon: Database, color: 'green' }, { id: 'encode', label: '编码转换', icon: Binary, color: 'orange' }, { id: 'dev', label: '开发调试', icon: Terminal, color: 'green' }, { id: 'generate', label: '生成工具', icon: Zap, color: 'orange' }, { id: 'design', label: '设计工具', icon: Palette, color: 'green' }, { id: 'crypto', label: '加密安全', icon: Lock, color: 'green' }, { id: 'network', label: '网络工具', icon: Globe, color: 'orange' }, { id: 'ops', label: '运维工具', icon: Server, color: 'green' }, { id: 'moyu', label: '扩展工具', icon: Layers, color: 'green' }];

export const TOOLS = [
  { id: 'jsontool', icon: Braces, title: 'JSON 格式化', description: '格式化、压缩、校验 JSON 数据，支持语法高亮和错误定位', category: 'data', tags: ['json', '格式化', '校验', '压缩', 'format', 'validate'], accentColor: 'green', pinned: true },
  { id: 'encodertool', icon: Code2, title: '编码转换', description: 'Base64 编解码、URL 编解码、HTML 实体、Unicode 转换', category: 'encode', tags: ['base64', 'url', '编码', '解码', 'encode', 'decode', 'html', 'unicode'], accentColor: 'orange', pinned: true },
  { id: 'devtool', icon: Clock, title: '时间戳转换', description: '时间戳与日期互转，支持秒级和毫秒级时间戳', category: 'dev', tags: ['时间戳', 'timestamp', '日期', 'date', 'unix'], accentColor: 'green', pinned: true },
  { id: 'devtool', icon: Regex, title: '正则测试', description: '实时正则表达式匹配测试，支持标志位和高亮匹配结果', category: 'dev', tags: ['正则', 'regex', 'regexp', '匹配', 'match'], accentColor: 'orange', tab: 'regex', pinned: false },
  { id: 'devtool', icon: Hash, title: '哈希计算', description: '文本哈希计算，支持 SHA-256/SHA-1/SHA-512 等算法', category: 'dev', tags: ['hash', '哈希', 'sha', 'sha256', 'md5', '加密', 'crc32'], accentColor: 'green', tab: 'hash', pinned: false },
  { id: 'devtool', icon: Fingerprint, title: 'UUID 生成', description: '一键生成 UUID v4，支持批量生成和格式切换', category: 'generate', tags: ['uuid', 'guid', 'id', '标识符', '随机'], accentColor: 'orange', tab: 'uuid', pinned: false },
  { id: 'devtool', icon: Palette, title: '颜色工具', description: '颜色选择与 HEX/RGB/HSL 格式互转，实时预览色彩', category: 'design', tags: ['color', '颜色', 'hex', 'rgb', 'hsl', '取色'], accentColor: 'green', tab: 'color', pinned: true },
  { id: 'networktool', icon: Send, title: '接口调试', description: '简易 Apifox，支持自定义请求头和请求体', category: 'network', tags: ['api', '接口', '调试', 'fetch', 'postman'], accentColor: 'green', tab: 'api', pinned: true },
  { id: 'networktool', icon: Terminal, title: 'CURL 转代码', description: 'CURL 命令转 JavaScript/Python/Java/PHP 代码', category: 'network', tags: ['curl', '转换', '代码生成', 'javascript', 'python'], accentColor: 'orange', tab: 'curl' },
  { id: 'networktool', icon: Globe, title: 'IP / Whois', description: 'IP 地址地理位置查询，域名 Whois 信息', category: 'network', tags: ['ip', 'whois', '域名', '地理位置'], accentColor: 'green', tab: 'ip' },
  { id: 'networktool', icon: Network, title: '端口检测', description: '检测目标主机端口开放状态', category: 'network', tags: ['端口', 'port', '扫描', '检测'], accentColor: 'orange', tab: 'port' },
  { id: 'networktool', icon: MonitorSmartphone, title: 'UA 解析', description: 'User-Agent 解析与生成，常用 UA 预设', category: 'network', tags: ['useragent', 'ua', '浏览器', '解析'], accentColor: 'green', tab: 'ua' },
  { id: 'assisttool', icon: Database, title: 'SQL 工具', description: 'SQL 格式化与压缩，支持关键字自动换行缩进', category: 'dev', tags: ['sql', '格式化', '压缩', '数据库', 'query'], accentColor: 'green', tab: 'sql' },
  { id: 'assisttool', icon: Type, title: '文本处理', description: '去空行/去空格/大小写/去重/排序/批量替换/分割合并', category: 'dev', tags: ['文本', '替换', '去空格', '去重', '排序', '对比'], accentColor: 'orange', tab: 'text' },
  { id: 'assisttool', icon: QrCode, title: '二维码生成', description: '文本/URL 生成二维码，支持下载 PNG', category: 'generate', tags: ['二维码', 'qrcode', '生成', '扫码'], accentColor: 'green', tab: 'qrcode' },
  { id: 'assisttool', icon: Image, title: '图片工具', description: '图片格式转换 (JPG/PNG/WebP)，压缩缩放', category: 'design', tags: ['图片', '压缩', '格式转换', 'webp', 'resize'], accentColor: 'orange', tab: 'image' },
  { id: 'assisttool', icon: Server, title: '速查表', description: '常用端口对照表、HTTP 状态码查询，支持搜索', category: 'dev', tags: ['端口', '状态码', 'http', '速查', '对照表'], accentColor: 'green', tab: 'ref' },
  { id: 'assisttool', icon: FileCode, title: '代码格式化', description: 'JS/TS/CSS/JSON 代码格式化与压缩', category: 'dev', tags: ['代码', '格式化', '压缩', 'javascript', 'minify'], accentColor: 'orange', tab: 'code' },
  { id: 'opstool', icon: Clock, title: 'Cron 表达式', description: '生成、校验 Linux 5 段 Cron，并预览最近执行时间', category: 'ops', tags: ['cron', 'crontab', '表达式', '定时任务', '调度', '校验'], accentColor: 'green', tab: 'cron' },
  { id: 'opstool', icon: Server, title: 'Nginx 格式化', description: '格式化 nginx.conf、server、location 配置片段并检查括号', category: 'ops', tags: ['nginx', '配置', '格式化', 'server', 'location', 'proxy'], accentColor: 'orange', tab: 'nginx' },
  { id: 'opstool', icon: Terminal, title: 'Docker 速查', description: '常用 Docker / Compose 命令速查，支持搜索和复制', category: 'ops', tags: ['docker', 'compose', '容器', '镜像', '日志', '命令'], accentColor: 'green', tab: 'docker' },
  { id: 'opstool', icon: Database, title: '单位换算', description: '存储 MB/GB/TB、流量速率、时间单位快速换算', category: 'ops', tags: ['单位', '换算', '存储', '流量', '时间', 'mb', 'gb', 'tb'], accentColor: 'orange', tab: 'unit' },
  { id: 'cryptotool', icon: Hash, title: '哈希生成', description: 'SHA-1/SHA-256/SHA-512 哈希计算，支持文件哈希和 CRC32', category: 'crypto', tags: ['hash', '哈希', 'sha', 'sha256', 'sha512', 'md5', 'crc32', '校验'], accentColor: 'green', tab: 'hash', pinned: true },
  { id: 'cryptotool', icon: Lock, title: 'AES 加密', description: 'AES-256-GCM 对称加密解密，PBKDF2 密钥派生', category: 'crypto', tags: ['aes', '加密', '解密', 'gcm', '对称', 'encrypt'], accentColor: 'orange', tab: 'aes' },
  { id: 'cryptotool', icon: Key, title: 'RSA 工具', description: 'RSA 公私钥生成、PEM 格式导出、公钥加密私钥解密', category: 'crypto', tags: ['rsa', '公钥', '私钥', '非对称', 'pem', '密钥对'], accentColor: 'green', tab: 'rsa' },
  { id: 'cryptotool', icon: Shield, title: 'HMAC 签名', description: 'HMAC-SHA1/256/384/512 签名生成', category: 'crypto', tags: ['hmac', '签名', 'sha', '验证', 'signature'], accentColor: 'orange', tab: 'hmac' },
  { id: 'cryptotool', icon: Fingerprint, title: 'UUID 生成', description: 'UUID v4 随机生成器，支持批量生成和格式切换', category: 'crypto', tags: ['uuid', 'guid', 'id', '标识符', '随机'], accentColor: 'green', tab: 'uuid' },
  { id: 'cryptotool', icon: Dice5, title: '随机密码', description: '自定义长度/大小写/数字/符号的随机密码生成器', category: 'crypto', tags: ['password', '密码', '随机', '生成', '强密码'], accentColor: 'orange', tab: 'password' },
  { id: 'moyutool', icon: FileText, title: 'Local Trace', description: '本地文本分片查看，支持单行步进与进度标记', category: 'moyu', tags: ['trace', 'local', 'txt', 'markdown'], accentColor: 'green', tab: 'reader' },
  { id: 'moyutool', icon: TrendingUp, title: 'Metric Probe', description: '轻量指标面板，支持自定义代码与定时刷新', category: 'moyu', tags: ['metric', 'probe', 'data'], accentColor: 'orange', tab: 'stock' },
  { id: 'moyutool', icon: Gamepad2, title: 'Canvas Probe', description: '极简 Canvas 渲染测试面板，用于方向键交互检查', category: 'moyu', tags: ['canvas', 'render', 'keyboard'], accentColor: 'green', tab: 'mini' },
  { id: 'moyutool', icon: FileText, title: 'Text Stream', description: '纯文本摘要流，支持低干扰翻页浏览', category: 'moyu', tags: ['text', 'stream', 'summary'], accentColor: 'orange', tab: 'video' }
];

export function getToolsByCategory(categoryId) {
  return TOOLS.filter(t => t.category === categoryId);
}

export function searchTools(query) {
  if (!query || !query.trim()) return TOOLS;
  const q = query.toLowerCase().trim();
  return TOOLS.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some(tag => tag.toLowerCase().includes(q)));
}

export function getPinnedIds() {
  try { const raw = localStorage.getItem('devtoolkit_pinned'); if (raw) return JSON.parse(raw); } catch {}
  return TOOLS.filter(t => t.pinned).map(t => t.tab ? `${t.id}_${t.tab}` : t.id);
}

export function savePinnedIds(ids) {
  try { localStorage.setItem('devtoolkit_pinned', JSON.stringify(ids)); } catch {}
}

export function getToolKey(tool) {
  return tool.tab ? `${tool.id}_${tool.tab}` : tool.id;
}
