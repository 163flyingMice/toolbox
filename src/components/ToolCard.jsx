import React, { useState } from 'react';
import { Copy, Check, Pin, PinOff } from 'lucide-react';
import { getToolKey, getPinnedIds, savePinnedIds, CATEGORIES } from '@/components/ToolRegistry.jsx';

export function ToolCard({ icon: Icon, title, description, accentColor, category, onClick, showPin = false, isPinned = false, onPinToggle }) {
  const cat = CATEGORIES.find(c => c.id === category);
  return <button onClick={onClick} className="app-tool-card group relative min-h-[156px] bg-dev-panel/90 border border-dev-border/80 rounded-xl p-5 text-left transition-all duration-200 hover:border-dev-green/35 hover:bg-dev-panel hover:shadow-[0_14px_40px_rgba(0,0,0,0.22)] focus:outline-none focus:ring-2 focus:ring-dev-green/40">
      {cat && <div className="absolute top-4 right-4 flex items-center gap-2">
          {showPin && <span onClick={e => { e.stopPropagation(); onPinToggle && onPinToggle(); }} className={`p-1 rounded transition-colors duration-200 ${isPinned ? 'text-dev-green hover:text-dev-green/70' : 'text-dev-muted/30 hover:text-dev-muted/60 opacity-0 group-hover:opacity-100'}`}>
              {isPinned ? <Pin size={14} /> : <PinOff size={14} />}
            </span>}
          <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md border ${cat.color === 'orange' ? 'text-dev-orange/70 border-dev-orange/20 bg-dev-orange/5' : 'text-dev-green/70 border-dev-green/20 bg-dev-green/5'}`}>
            {cat.label}
          </span>
        </div>}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-colors duration-200 ${accentColor === 'orange' ? 'bg-dev-orange/10 text-dev-orange group-hover:bg-dev-orange/15' : 'bg-dev-green/10 text-dev-green group-hover:bg-dev-green/15'}`}>
        <Icon size={20} />
      </div>
      <h3 className="text-base font-heading font-semibold text-white mb-1.5 pr-16 leading-snug">{title}</h3>
      <p className="text-xs text-dev-muted leading-relaxed line-clamp-2">{description}</p>
      <div className="absolute bottom-4 right-4 h-1.5 w-6 rounded-full bg-dev-border/70 group-hover:bg-dev-green/60 transition-colors duration-200" />
    </button>;
}

export function CopyButton({ text, className }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setCopied(false); }
  };
  return <button onClick={handleCopy} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 ${copied ? 'bg-dev-green/20 text-dev-green' : 'bg-dev-panel text-dev-muted hover:text-dev-text hover:bg-dev-hover border border-dev-border'} ${className || ''}`}>
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? '已复制' : '复制'}
    </button>;
}

export function ToolHeader({ title, description, onBack }) {
  return <div className="mb-8">
      <button onClick={onBack} className="flex items-center gap-2 text-dev-muted hover:text-dev-green transition-colors duration-200 mb-6 text-sm font-mono">
        <span>←</span>
        <span>返回工具箱</span>
      </button>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-1 h-7 bg-dev-green/80 rounded-full" />
        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">{title}</h1>
      </div>
      <p className="text-dev-muted ml-5 text-sm leading-relaxed max-w-3xl">{description}</p>
    </div>;
}

export function CodePanel({ title, value, onChange, placeholder, readOnly, className }) {
  return <div className={`flex flex-col ${className || ''}`}>
      {title && <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono uppercase tracking-wider text-dev-muted">{title}</span>
          {!readOnly && value && <button onClick={() => onChange('')} className="text-xs font-mono text-dev-muted hover:text-dev-orange transition-colors">
              清空
            </button>}
        </div>}
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} readOnly={readOnly} className={`flex-1 min-h-[300px] p-4 rounded-xl border font-mono text-sm leading-relaxed resize-none transition-colors duration-200 ${readOnly ? 'bg-dev-input/50 text-dev-green border-dev-border cursor-default' : 'bg-dev-input text-dev-text border-dev-border focus:border-dev-green/50 focus:outline-none focus:ring-1 focus:ring-dev-green/30 placeholder:text-dev-muted/50'}`} />
    </div>;
}

export function ActionBar({ children }) {
  return <div className="flex items-center gap-3 flex-wrap">{children}</div>;
}

export function ActionButton({ children, onClick, variant, className }) {
  const base = 'inline-flex items-center justify-center px-4 py-2 rounded-lg font-heading font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-dev-green/30 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = { primary: 'bg-dev-green/10 text-dev-green border border-dev-green/30 hover:bg-dev-green/20', secondary: 'bg-dev-panel text-dev-text border border-dev-border hover:bg-dev-hover', danger: 'bg-dev-orange/10 text-dev-orange border border-dev-orange/30 hover:bg-dev-orange/20' };
  return <button onClick={onClick} className={`${base} ${variants[variant || 'primary']} ${className || ''}`}>{children}</button>;
}

export function StatusBadge({ type, children }) {
  const styles = { success: 'bg-dev-green/10 text-dev-green border-dev-green/30', error: 'bg-dev-orange/10 text-dev-orange border-dev-orange/30', info: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono border ${styles[type] || styles.info}`}>{children}</span>;
}

export function NavHeader() {
  return <header className="border-b border-dev-border/50 bg-dev-bg/85 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-dev-green/15 border border-dev-green/20 rounded-lg flex items-center justify-center">
            <span className="text-dev-green font-mono font-bold text-sm">&lt;/&gt;</span>
          </div>
          <span className="font-heading font-bold text-white text-lg">DevToolkit</span>
          <span className="text-[10px] font-mono text-dev-muted bg-dev-panel px-2 py-0.5 rounded border border-dev-border ml-1">v1.0</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-dev-muted hidden sm:inline">程序员工具箱</span>
          <div className="w-2 h-2 rounded-full bg-dev-green animate-pulse" />
        </div>
      </div>
    </header>;
}
