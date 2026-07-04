import React, { useState, useCallback, useRef } from 'react';
import { Hash, Lock, Unlock, Key, Shield, Fingerprint, Dice5, RefreshCw, Eye, EyeOff, Download } from 'lucide-react';
import { useToast } from '@/components/ui';
import { ToolHeader, NavHeader, ActionBar, ActionButton, CopyButton, StatusBadge, CodePanel } from '@/components/ToolCard.jsx';

const TABS = [{ id: 'hash', label: '哈希生成', icon: Hash }, { id: 'aes', label: 'AES 加密', icon: Lock }, { id: 'rsa', label: 'RSA 工具', icon: Key }, { id: 'hmac', label: 'HMAC 签名', icon: Shield }, { id: 'uuid', label: 'UUID 生成', icon: Fingerprint }, { id: 'password', label: '随机密码', icon: Dice5 }];

function HashTool() {
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [results, setResults] = useState({});
  const fileRef = useRef(null);
  const computeHash = useCallback(async text => {
    if (!text) { setResults({}); return; }
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const r = {};
    try { const s1 = await crypto.subtle.digest('SHA-1', data); r['SHA-1'] = Array.from(new Uint8Array(s1)).map(b => b.toString(16).padStart(2, '0')).join(''); } catch {}
    try { const s256 = await crypto.subtle.digest('SHA-256', data); r['SHA-256'] = Array.from(new Uint8Array(s256)).map(b => b.toString(16).padStart(2, '0')).join(''); } catch {}
    try { const s384 = await crypto.subtle.digest('SHA-384', data); r['SHA-384'] = Array.from(new Uint8Array(s384)).map(b => b.toString(16).padStart(2, '0')).join(''); } catch {}
    try { const s512 = await crypto.subtle.digest('SHA-512', data); r['SHA-512'] = Array.from(new Uint8Array(s512)).map(b => b.toString(16).padStart(2, '0')).join(''); } catch {}
    let md5Hash = 0;
    for (let i = 0; i < text.length; i++) { const c = text.charCodeAt(i); md5Hash = (md5Hash << 5) - md5Hash + c; md5Hash |= 0; }
    r['MD5 (模拟)'] = Math.abs(md5Hash).toString(16).padStart(8, '0') + Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data))).slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < text.length; i++) { crc ^= text.charCodeAt(i); for (let j = 0; j < 8; j++) crc = crc >>> 1 ^ (crc & 1 ? 0xEDB88320 : 0); }
    r['CRC32'] = ((crc ^ 0xFFFFFFFF) >>> 0).toString(16).padStart(8, '0');
    setResults(r);
  }, []);
  const handleFileHash = useCallback(async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast({ title: '文件过大', description: '请选择 10MB 以内的文件', variant: 'destructive' }); return; }
    try {
      const buf = await file.arrayBuffer();
      const r = {};
      const s256 = await crypto.subtle.digest('SHA-256', buf); r['SHA-256'] = Array.from(new Uint8Array(s256)).map(b => b.toString(16).padStart(2, '0')).join('');
      const s512 = await crypto.subtle.digest('SHA-512', buf); r['SHA-512'] = Array.from(new Uint8Array(s512)).map(b => b.toString(16).padStart(2, '0')).join('');
      const s1 = await crypto.subtle.digest('SHA-1', buf); r['SHA-1'] = Array.from(new Uint8Array(s1)).map(b => b.toString(16).padStart(2, '0')).join('');
      let crc = 0xFFFFFFFF;
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) { crc ^= bytes[i]; for (let j = 0; j < 8; j++) crc = crc >>> 1 ^ (crc & 1 ? 0xEDB88320 : 0); }
      r['CRC32'] = ((crc ^ 0xFFFFFFFF) >>> 0).toString(16).padStart(8, '0');
      setResults(r);
      toast({ title: '文件哈希计算完成', description: file.name });
    } catch (err) { toast({ title: '计算失败', description: err.message, variant: 'destructive' }); }
  }, [toast]);
  return <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Hash size={20} className="text-dev-green" />
        <h2 className="text-lg font-heading font-semibold text-white">哈希生成</h2>
        <StatusBadge type="info">SHA-1/256/384/512 + CRC32</StatusBadge>
      </div>
      <CodePanel title="输入文本" value={input} onChange={v => { setInput(v); computeHash(v); }} placeholder="输入需要计算哈希的文本..." />
      <div className="flex items-center gap-3">
        <ActionButton variant="secondary" onClick={() => fileRef.current?.click()}>
          <span className="flex items-center gap-2"><Download size={14} /> 文件哈希</span>
        </ActionButton>
        <input ref={fileRef} type="file" className="hidden" onChange={handleFileHash} />
        <ActionButton variant="danger" onClick={() => { setInput(''); setResults({}); }}>清空</ActionButton>
      </div>
      {Object.keys(results).length > 0 && <div className="space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-dev-muted">计算结果</h3>
          {Object.entries(results).map(([algo, hash]) => <div key={algo} className="bg-dev-input/50 rounded-xl border border-dev-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-dev-muted uppercase">{algo}</span>
                <CopyButton text={hash} />
              </div>
              <p className="text-sm font-mono text-dev-green break-all select-all">{hash}</p>
            </div>)}
        </div>}
    </div>;
}

function AESTool() {
  const { toast } = useToast();
  const [plaintext, setPlaintext] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [encrypted, setEncrypted] = useState('');
  const [decryptInput, setDecryptInput] = useState('');
  const [decryptPwd, setDecryptPwd] = useState('');
  const [decrypted, setDecrypted] = useState('');
  const deriveKey = async (pwd, salt) => {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pwd), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  };
  const handleEncrypt = useCallback(async () => {
    if (!plaintext || !password) { toast({ title: '请输入明文和密码', variant: 'destructive' }); return; }
    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(password, salt);
      const enc = new TextEncoder();
      const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
      const buf = new Uint8Array(salt.length + iv.length + ct.byteLength);
      buf.set(salt, 0); buf.set(iv, salt.length); buf.set(new Uint8Array(ct), salt.length + iv.length);
      setEncrypted(btoa(String.fromCharCode(...buf)));
      toast({ title: 'AES-256-GCM 加密成功' });
    } catch (err) { toast({ title: '加密失败', description: err.message, variant: 'destructive' }); }
  }, [plaintext, password, toast]);
  const handleDecrypt = useCallback(async () => {
    if (!decryptInput || !decryptPwd) { toast({ title: '请输入密文和密码', variant: 'destructive' }); return; }
    try {
      const raw = Uint8Array.from(atob(decryptInput), c => c.charCodeAt(0));
      const salt = raw.slice(0, 16); const iv = raw.slice(16, 28); const ct = raw.slice(28);
      const key = await deriveKey(decryptPwd, salt);
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
      setDecrypted(new TextDecoder().decode(pt));
      toast({ title: '解密成功' });
    } catch (err) { toast({ title: '解密失败', description: '密码错误或密文损坏', variant: 'destructive' }); setDecrypted(''); }
  }, [decryptInput, decryptPwd, toast]);
  return <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Lock size={20} className="text-dev-green" />
          <h2 className="text-lg font-heading font-semibold text-white">AES-256-GCM 加密</h2>
          <StatusBadge type="info">PBKDF2 10万轮</StatusBadge>
        </div>
        <CodePanel title="明文" value={plaintext} onChange={setPlaintext} placeholder="输入需要加密的文本..." />
        <div className="relative">
          <span className="text-xs font-mono text-dev-muted mb-1 block">密码</span>
          <div className="flex items-center gap-2">
            <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="输入加密密码" className="flex-1 px-4 py-2.5 rounded-xl bg-dev-input border border-dev-border text-dev-text font-mono text-sm focus:border-dev-green/50 focus:outline-none focus:ring-1 focus:ring-dev-green/30 placeholder:text-dev-muted/50" />
            <button onClick={() => setShowPwd(v => !v)} className="p-2.5 rounded-xl bg-dev-panel border border-dev-border text-dev-muted hover:text-dev-text transition-colors">
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <ActionButton variant="primary" onClick={handleEncrypt}>加密</ActionButton>
        {encrypted && <div className="bg-dev-input/50 rounded-xl border border-dev-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-dev-muted">密文 (Base64)</span>
              <CopyButton text={encrypted} />
            </div>
            <p className="text-sm font-mono text-dev-green break-all select-all">{encrypted}</p>
          </div>}
      </div>
      <div className="space-y-4 pt-6 border-t border-dev-border/30">
        <div className="flex items-center gap-3 mb-2">
          <Unlock size={20} className="text-dev-orange" />
          <h2 className="text-lg font-heading font-semibold text-white">AES-256-GCM 解密</h2>
        </div>
        <CodePanel title="密文 (Base64)" value={decryptInput} onChange={setDecryptInput} placeholder="粘贴 Base64 格式密文..." />
        <div>
          <span className="text-xs font-mono text-dev-muted mb-1 block">密码</span>
          <input type="password" value={decryptPwd} onChange={e => setDecryptPwd(e.target.value)} placeholder="输入解密密码" className="w-full px-4 py-2.5 rounded-xl bg-dev-input border border-dev-border text-dev-text font-mono text-sm focus:border-dev-green/50 focus:outline-none focus:ring-1 focus:ring-dev-green/30 placeholder:text-dev-muted/50" />
        </div>
        <ActionButton variant="secondary" onClick={handleDecrypt}>解密</ActionButton>
        {decrypted && <div className="bg-dev-input/50 rounded-xl border border-dev-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-dev-muted">明文</span>
              <CopyButton text={decrypted} />
            </div>
            <p className="text-sm font-mono text-dev-text break-all select-all">{decrypted}</p>
          </div>}
      </div>
    </div>;
}

function RSATool() {
  const { toast } = useToast();
  const [keySize, setKeySize] = useState(2048);
  const [publicKey, setPublicKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [generating, setGenerating] = useState(false);
  const [rsaInput, setRsaInput] = useState('');
  const [rsaEncrypted, setRsaEncrypted] = useState('');
  const [rsaDecryptInput, setRsaDecryptInput] = useState('');
  const [rsaDecrypted, setRsaDecrypted] = useState('');
  const keyRef = useRef(null);
  const ab2pem = (buf, type) => {
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const b64 = btoa(binary);
    const lines = b64.match(/.{1,64}/g) || [];
    return `-----BEGIN ${type} KEY-----\n${lines.join('\n')}\n-----END ${type} KEY-----`;
  };
  const handleGenerate = useCallback(async () => {
    setGenerating(true); setPublicKey(''); setPrivateKey('');
    try {
      const pair = await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: keySize, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']);
      const pubBuf = await crypto.subtle.exportKey('spki', pair.publicKey);
      const priBuf = await crypto.subtle.exportKey('pkcs8', pair.privateKey);
      setPublicKey(ab2pem(pubBuf, 'PUBLIC'));
      setPrivateKey(ab2pem(priBuf, 'RSA PRIVATE'));
      toast({ title: `RSA-${keySize} 密钥对生成成功` });
    } catch (err) { toast({ title: '生成失败', description: err.message, variant: 'destructive' }); }
    setGenerating(false);
  }, [keySize, toast]);
  const handleRSAEncrypt = useCallback(async () => {
    if (!rsaInput || !publicKey) { toast({ title: '请先生成密钥并输入文本', variant: 'destructive' }); return; }
    try {
      const pem = publicKey.replace(/-----[\s\S]*?-----/g, '').replace(/\s/g, '');
      const binary = atob(pem);
      const buf = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
      const key = await crypto.subtle.importKey('spki', buf, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
      const enc = new TextEncoder();
      const ct = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, enc.encode(rsaInput));
      setRsaEncrypted(btoa(String.fromCharCode(...new Uint8Array(ct))));
      toast({ title: 'RSA 加密成功' });
    } catch (err) { toast({ title: '加密失败', description: err.message, variant: 'destructive' }); }
  }, [rsaInput, publicKey, toast]);
  const handleRSADecrypt = useCallback(async () => {
    if (!rsaDecryptInput || !privateKey) { toast({ title: '请先生成密钥并输入密文', variant: 'destructive' }); return; }
    try {
      const pem = privateKey.replace(/-----[\s\S]*?-----/g, '').replace(/\s/g, '');
      const binary = atob(pem);
      const buf = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
      const key = await crypto.subtle.importKey('pkcs8', buf, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
      const raw = Uint8Array.from(atob(rsaDecryptInput), c => c.charCodeAt(0));
      const pt = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, key, raw);
      setRsaDecrypted(new TextDecoder().decode(pt));
      toast({ title: 'RSA 解密成功' });
    } catch (err) { toast({ title: '解密失败', description: '密钥不匹配或密文损坏', variant: 'destructive' }); }
  }, [rsaDecryptInput, privateKey, toast]);
  return <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Key size={20} className="text-dev-green" />
          <h2 className="text-lg font-heading font-semibold text-white">RSA 密钥生成</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-dev-muted">密钥长度</span>
          {[2048, 4096].map(s => <button key={s} onClick={() => setKeySize(s)} className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${keySize === s ? 'bg-dev-green/20 text-dev-green border border-dev-green/30' : 'bg-dev-panel text-dev-muted border border-dev-border hover:text-dev-text'}`}>{s} bit</button>)}
        </div>
        <ActionButton variant="primary" onClick={handleGenerate} disabled={generating}>
          {generating ? '生成中...（可能需要几秒）' : '生成密钥对'}
        </ActionButton>
        {publicKey && <div className="space-y-3">
            <div className="bg-dev-input/50 rounded-xl border border-dev-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-dev-muted">公钥 (PEM)</span>
                <CopyButton text={publicKey} />
              </div>
              <pre className="text-xs font-mono text-dev-green break-all select-all whitespace-pre-wrap">{publicKey}</pre>
            </div>
            <div className="bg-dev-input/50 rounded-xl border border-dev-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-dev-muted">私钥 (PEM)</span>
                <CopyButton text={privateKey} />
              </div>
              <pre className="text-xs font-mono text-dev-orange break-all select-all whitespace-pre-wrap">{privateKey}</pre>
            </div>
          </div>}
      </div>
      <div className="space-y-4 pt-6 border-t border-dev-border/30">
        <div className="flex items-center gap-3 mb-2">
          <Lock size={20} className="text-dev-orange" />
          <h2 className="text-lg font-heading font-semibold text-white">RSA 加密</h2>
        </div>
        <CodePanel title="明文" value={rsaInput} onChange={setRsaInput} placeholder="输入需要加密的文本（RSA-OAEP 有长度限制）..." />
        <ActionButton variant="secondary" onClick={handleRSAEncrypt} disabled={!publicKey}>公钥加密</ActionButton>
        {rsaEncrypted && <div className="bg-dev-input/50 rounded-xl border border-dev-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-dev-muted">密文 (Base64)</span>
              <CopyButton text={rsaEncrypted} />
            </div>
            <p className="text-sm font-mono text-dev-green break-all select-all">{rsaEncrypted}</p>
          </div>}
      </div>
      <div className="space-y-4 pt-6 border-t border-dev-border/30">
        <div className="flex items-center gap-3 mb-2">
          <Unlock size={20} className="text-dev-green" />
          <h2 className="text-lg font-heading font-semibold text-white">RSA 解密</h2>
        </div>
        <CodePanel title="密文 (Base64)" value={rsaDecryptInput} onChange={setRsaDecryptInput} placeholder="粘贴 Base64 格式 RSA 密文..." />
        <ActionButton variant="secondary" onClick={handleRSADecrypt} disabled={!privateKey}>私钥解密</ActionButton>
        {rsaDecrypted && <div className="bg-dev-input/50 rounded-xl border border-dev-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-dev-muted">明文</span>
              <CopyButton text={rsaDecrypted} />
            </div>
            <p className="text-sm font-mono text-dev-text break-all select-all">{rsaDecrypted}</p>
          </div>}
      </div>
    </div>;
}

function HMACTool() {
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [secret, setSecret] = useState('');
  const [algo, setAlgo] = useState('SHA-256');
  const [signature, setSignature] = useState('');
  const handleSign = useCallback(async () => {
    if (!message || !secret) { toast({ title: '请输入消息和密钥', variant: 'destructive' }); return; }
    try {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: algo }, false, ['sign']);
      const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
      setSignature(Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join(''));
      toast({ title: `HMAC-${algo.replace('SHA-', 'SHA-')} 签名成功` });
    } catch (err) { toast({ title: '签名失败', description: err.message, variant: 'destructive' }); }
  }, [message, secret, algo, toast]);
  return <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Shield size={20} className="text-dev-green" />
        <h2 className="text-lg font-heading font-semibold text-white">HMAC 签名生成</h2>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-mono text-dev-muted">算法</span>
        {['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'].map(a => <button key={a} onClick={() => setAlgo(a)} className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${algo === a ? 'bg-dev-green/20 text-dev-green border border-dev-green/30' : 'bg-dev-panel text-dev-muted border border-dev-border hover:text-dev-text'}`}>HMAC-{a.replace('SHA-', 'SHA-')}</button>)}
      </div>
      <CodePanel title="消息" value={message} onChange={setMessage} placeholder="输入需要签名的消息..." />
      <div>
        <span className="text-xs font-mono text-dev-muted mb-1 block">密钥</span>
        <input type="text" value={secret} onChange={e => setSecret(e.target.value)} placeholder="输入 HMAC 密钥" className="w-full px-4 py-2.5 rounded-xl bg-dev-input border border-dev-border text-dev-text font-mono text-sm focus:border-dev-green/50 focus:outline-none focus:ring-1 focus:ring-dev-green/30 placeholder:text-dev-muted/50" />
      </div>
      <ActionButton variant="primary" onClick={handleSign}>生成签名</ActionButton>
      {signature && <div className="bg-dev-input/50 rounded-xl border border-dev-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-dev-muted">HMAC-{algo.replace('SHA-', 'SHA-')} 签名</span>
            <CopyButton text={signature} />
          </div>
          <p className="text-sm font-mono text-dev-green break-all select-all">{signature}</p>
        </div>}
    </div>;
}

function UUIDTool() {
  const { toast } = useToast();
  const [uuids, setUuids] = useState([]);
  const [count, setCount] = useState(1);
  const [format, setFormat] = useState('lower');
  const generateUUID = () => {
    const result = [];
    for (let i = 0; i < count; i++) {
      const uuid = crypto.randomUUID();
      let formatted = uuid;
      if (format === 'upper') formatted = uuid.toUpperCase();
      else if (format === 'noDash') formatted = uuid.replace(/-/g, '');
      else if (format === 'brace') formatted = `{${uuid}}`;
      result.push(formatted);
    }
    setUuids(prev => [...result, ...prev]);
    toast({ title: `已生成 ${count} 个 UUID v4` });
  };
  const copyAll = () => { navigator.clipboard.writeText(uuids.join('\n')); toast({ title: '已复制全部 UUID' }); };
  return <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Fingerprint size={20} className="text-dev-green" />
        <h2 className="text-lg font-heading font-semibold text-white">UUID/GUID 生成器</h2>
        <StatusBadge type="info">v4</StatusBadge>
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-dev-muted">数量</span>
          {[1, 5, 10, 20, 50].map(n => <button key={n} onClick={() => setCount(n)} className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${count === n ? 'bg-dev-green/20 text-dev-green border border-dev-green/30' : 'bg-dev-panel text-dev-muted border border-dev-border hover:text-dev-text'}`}>{n}</button>)}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-dev-muted">格式</span>
          {[{ id: 'lower', label: '小写' }, { id: 'upper', label: '大写' }, { id: 'noDash', label: '无横线' }, { id: 'brace', label: '花括号' }].map(f => <button key={f.id} onClick={() => setFormat(f.id)} className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${format === f.id ? 'bg-dev-green/20 text-dev-green border border-dev-green/30' : 'bg-dev-panel text-dev-muted border border-dev-border hover:text-dev-text'}`}>{f.label}</button>)}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ActionButton variant="primary" onClick={generateUUID}>
          <span className="flex items-center gap-2"><RefreshCw size={14} /> 生成</span>
        </ActionButton>
        {uuids.length > 0 && <>
            <ActionButton variant="secondary" onClick={copyAll}>复制全部</ActionButton>
            <ActionButton variant="danger" onClick={() => setUuids([])}>清空</ActionButton>
          </>}
      </div>
      {uuids.length > 0 && <div className="bg-dev-input/50 rounded-xl border border-dev-border p-4 max-h-[400px] overflow-y-auto">
          {uuids.map((uuid, i) => <div key={i} className="flex items-center justify-between py-1.5 border-b border-dev-border/20 last:border-0">
              <span className="text-sm font-mono text-dev-green select-all">{uuid}</span>
              <CopyButton text={uuid} />
            </div>)}
        </div>}
    </div>;
}

function PasswordTool() {
  const { toast } = useToast();
  const [length, setLength] = useState(16);
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useDigits, setUseDigits] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [password, setPassword] = useState('');
  const [history, setHistory] = useState([]);
  const UPPERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const LOWERS = 'abcdefghijklmnopqrstuvwxyz';
  const DIGITS = '0123456789';
  const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const AMBIGUOUS = 'Il1O0o';
  const getStrength = pwd => {
    if (!pwd) return { label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (pwd.length >= 16) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;
    if (score <= 2) return { label: '弱', color: 'text-dev-orange' };
    if (score <= 4) return { label: '中', color: 'text-yellow-400' };
    if (score <= 5) return { label: '强', color: 'text-dev-green' };
    return { label: '极强', color: 'text-dev-green' };
  };
  const generate = useCallback(() => {
    let chars = '';
    if (useUpper) chars += UPPERS;
    if (useLower) chars += LOWERS;
    if (useDigits) chars += DIGITS;
    if (useSymbols) chars += SYMBOLS;
    if (!chars) { toast({ title: '请至少选择一种字符类型', variant: 'destructive' }); return; }
    if (excludeAmbiguous) chars = chars.split('').filter(c => !AMBIGUOUS.includes(c)).join('');
    const arr = crypto.getRandomValues(new Uint32Array(length));
    let pwd = '';
    for (let i = 0; i < length; i++) pwd += chars[arr[i] % chars.length];
    setPassword(pwd);
    setHistory(prev => [pwd, ...prev].slice(0, 20));
  }, [length, useUpper, useLower, useDigits, useSymbols, excludeAmbiguous, toast]);
  const strength = getStrength(password);
  return <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Dice5 size={20} className="text-dev-green" />
        <h2 className="text-lg font-heading font-semibold text-white">随机密码生成器</h2>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-dev-muted">密码长度</span>
          <span className="text-sm font-mono text-dev-green">{length}</span>
        </div>
        <input type="range" min={4} max={128} value={length} onChange={e => setLength(parseInt(e.target.value))} className="w-full h-2 rounded-full appearance-none bg-dev-border cursor-pointer accent-dev-green" />
        <div className="flex justify-between text-[10px] font-mono text-dev-muted/50 mt-1">
          <span>4</span><span>32</span><span>64</span><span>128</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[{ label: '大写字母 A-Z', checked: useUpper, onChange: setUseUpper }, { label: '小写字母 a-z', checked: useLower, onChange: setUseLower }, { label: '数字 0-9', checked: useDigits, onChange: setUseDigits }, { label: '特殊符号 !@#$%', checked: useSymbols, onChange: setUseSymbols }].map(opt => <label key={opt.label} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-dev-panel border border-dev-border cursor-pointer hover:border-dev-green/30 transition-colors">
            <input type="checkbox" checked={opt.checked} onChange={e => opt.onChange(e.target.checked)} className="rounded border-dev-border accent-dev-green" />
            <span className="text-xs font-mono text-dev-text">{opt.label}</span>
          </label>)}
      </div>
      <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-dev-panel border border-dev-border cursor-pointer hover:border-dev-green/30 transition-colors">
        <input type="checkbox" checked={excludeAmbiguous} onChange={e => setExcludeAmbiguous(e.target.checked)} className="rounded border-dev-border accent-dev-green" />
        <span className="text-xs font-mono text-dev-text">排除歧义字符 (I, l, 1, O, 0, o)</span>
      </label>
      <ActionButton variant="primary" onClick={generate}>
        <span className="flex items-center gap-2"><RefreshCw size={14} /> 生成密码</span>
      </ActionButton>
      {password && <div className="bg-dev-input/50 rounded-xl border border-dev-border p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-dev-muted">生成结果</span>
              <span className={`text-xs font-mono font-semibold ${strength.color}`}>强度: {strength.label}</span>
            </div>
            <CopyButton text={password} />
          </div>
          <p className="text-lg font-mono text-dev-green break-all select-all tracking-wider">{password}</p>
        </div>}
      {history.length > 1 && <div>
          <h3 className="text-xs font-mono uppercase tracking-wider text-dev-muted mb-2">历史记录</h3>
          <div className="bg-dev-input/30 rounded-xl border border-dev-border/50 p-3 max-h-[200px] overflow-y-auto space-y-1">
            {history.slice(1).map((pwd, i) => <div key={i} className="flex items-center justify-between py-1">
                <span className="text-xs font-mono text-dev-muted select-all">{pwd}</span>
                <CopyButton text={pwd} className="!px-2 !py-1 text-[10px]" />
              </div>)}
          </div>
        </div>}
    </div>;
}

export default function Cryptotool(props) {
  const activeTab = props?.$w?.page?.dataset?.params?.tab || 'hash';
  const [tab, setTab] = useState(activeTab);
  const navigateTo = props?.$w?.utils?.navigateTo;
  const renderContent = () => {
    switch (tab) {
      case 'hash': return <HashTool />;
      case 'aes': return <AESTool />;
      case 'rsa': return <RSATool />;
      case 'hmac': return <HMACTool />;
      case 'uuid': return <UUIDTool />;
      case 'password': return <PasswordTool />;
      default: return <HashTool />;
    }
  };
  return <div className="min-h-screen bg-dev-bg">
      <NavHeader />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <ToolHeader title="加密哈希工具" description="MD5/SHA 哈希 · AES/RSA 加解密 · HMAC 签名 · UUID/密码生成" onBack={() => navigateTo && navigateTo({ pageId: 'home', params: {} })} />
        <div className="app-tab-row">
          {TABS.map(t => {
            const Icon = t.icon;
            return <button key={t.id} onClick={() => setTab(t.id)} className={'app-tab ' + (tab === t.id ? 'app-tab-active' : '')}>
                <Icon size={16} />{t.label}
              </button>;
          })}
        </div>
        {renderContent()}
      </main>
    </div>;
}
