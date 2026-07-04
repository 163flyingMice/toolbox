import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, X, Pin, Sparkles } from 'lucide-react';
import { ToolCard, NavHeader } from '@/components/ToolCard.jsx';
import { TOOLS, CATEGORIES, searchTools, getToolsByCategory, getPinnedIds, savePinnedIds, getToolKey } from '@/components/ToolRegistry.jsx';

export default function Home(props) {
  const navigateTo = props.$w.utils.navigateTo;
  const homeTraceContent = props.$w.utils.homeTraceContent || '';
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedIds, setPinnedIds] = useState(() => getPinnedIds());
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [traceIndex, setTraceIndex] = useState(0);

  const hasSearch = searchQuery.trim().length > 0;
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const revealExtendedTools = [':ext', ':local', ':lab', '摸鱼', '摸鱼工具'].includes(normalizedSearch);
  const filteredTools = useMemo(() => {
    if (revealExtendedTools) return TOOLS.filter(tool => tool.category === 'moyu');
    const result = searchTools(searchQuery);
    return result.filter(tool => tool.category !== 'moyu');
  }, [revealExtendedTools, searchQuery]);

  const pinnedTools = useMemo(() => TOOLS.filter(t => t.category !== 'moyu' && pinnedIds.includes(getToolKey(t))), [pinnedIds]);

  const groupedCategories = useMemo(() => {
    return CATEGORIES.map(cat => ({ ...cat, tools: getToolsByCategory(cat.id).filter(t => filteredTools.includes(t)) })).filter(cat => cat.tools.length > 0);
  }, [filteredTools]);
  const visibleGroupedCategories = useMemo(() => {
    if (revealExtendedTools) return groupedCategories;
    return groupedCategories.filter(cat => cat.id !== 'moyu');
  }, [groupedCategories, revealExtendedTools]);

  const handleToolClick = useCallback(tool => {
    const params = {};
    if (tool.tab) params.tab = tool.tab;
    navigateTo({ pageId: tool.id, params });
  }, [navigateTo]);

  const togglePin = useCallback(tool => {
    const key = getToolKey(tool);
    setPinnedIds(prev => {
      const next = prev.includes(key) ? prev.filter(id => id !== key) : [...prev, key];
      savePinnedIds(next);
      return next;
    });
  }, []);

  const toggleCollapse = useCallback(catId => {
    setCollapsedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  }, []);

  const currentHour = new Date().getHours();
  const greeting = currentHour < 6 ? '夜深了' : currentHour < 12 ? '早上好' : currentHour < 18 ? '下午好' : '晚上好';
  const hasPinned = pinnedTools.length > 0 && !hasSearch;
  const visibleToolCount = TOOLS.filter(t => t.category !== 'moyu').length;
  const visibleCategoryCount = CATEGORIES.filter(cat => cat.id !== 'moyu').length;
  const homeTraceLines = useMemo(() => homeTraceContent.split('\n').map(line => line.trim()).filter(Boolean), [homeTraceContent]);
  const homeTraceLine = homeTraceLines[traceIndex] || homeTraceLines[0] || '';

  useEffect(() => { setTraceIndex(0); }, [homeTraceContent]);

  const nextTraceLine = useCallback(() => {
    setTraceIndex(index => homeTraceLines.length ? (index + 1) % homeTraceLines.length : 0);
  }, [homeTraceLines.length]);

  const openTraceSource = useCallback(() => {
    navigateTo({ pageId: 'moyutool', params: { tab: 'reader' } });
  }, [navigateTo]);

  return <div className="min-h-screen bg-dev-bg app-home-page">
      <NavHeader />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="app-home-hero mb-8 relative overflow-hidden rounded-xl border border-dev-border bg-dev-panel p-6 sm:p-8">
          <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px w-10 bg-dev-green/50" />
                <span className="text-xs font-mono uppercase tracking-[0.3em] text-dev-green">Developer Toolkit</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-3 leading-tight tracking-tight">
                {greeting}，开发者
              </h1>
              <p className="text-dev-muted text-base max-w-xl leading-relaxed">
                常用开发、调试、编码与运维工具集中入口，打开即可使用。
              </p>
            </div>
            <div className="app-home-stats flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 rounded-lg border border-dev-border bg-dev-input px-3 py-2 text-sm font-mono text-dev-muted">
                <div className="w-1.5 h-1.5 rounded-full bg-dev-green animate-pulse" />
                <span>{visibleToolCount} 个工具在线</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-dev-border bg-dev-input px-3 py-2 text-sm font-mono text-dev-muted">
                <Sparkles size={14} className="text-dev-orange" />
                <span>{visibleCategoryCount} 个分类</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-dev-border bg-dev-input px-3 py-2 text-sm font-mono text-dev-muted">
                <Pin size={14} className="text-dev-green" />
                <span>已收藏 {pinnedIds.length} 个</span>
              </div>
            </div>
          </div>
        </div>

        <div className="app-home-search mb-8">
          <div className="relative max-w-2xl">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-dev-muted" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="搜索工具名称、标签或描述..." className="w-full pl-12 pr-10 py-3.5 rounded-xl bg-dev-panel border border-dev-border text-dev-text font-mono text-sm placeholder:text-dev-muted/50 focus:outline-none focus:border-dev-green/50 focus:ring-1 focus:ring-dev-green/30 transition-colors" />
            {hasSearch && <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-dev-muted hover:text-dev-text transition-colors">
                <X size={16} />
              </button>}
          </div>
          {homeTraceLine && <button onClick={nextTraceLine} onDoubleClick={openTraceSource} title="trace" className="mt-3 flex max-w-2xl items-center gap-2 rounded-lg border border-dev-border/40 bg-dev-panel/50 px-3 py-2 text-left font-mono text-[11px] text-dev-muted/45 transition-colors hover:border-dev-border hover:text-dev-muted">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-dev-green/30" />
              <span className="shrink-0 text-dev-muted/35">trace</span>
              <span className="min-w-0 flex-1 truncate">{homeTraceLine}</span>
              <span className="hidden shrink-0 text-dev-muted/25 sm:inline">{homeTraceLines.length ? String(traceIndex + 1).padStart(2, '0') + '/' + String(homeTraceLines.length).padStart(2, '0') : '00/00'}</span>
            </button>}
          {hasSearch && <p className="text-xs font-mono text-dev-muted mt-2 ml-1">
              找到 {filteredTools.length} 个匹配工具
            </p>}
        </div>

        {hasPinned && <div className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <Pin size={14} className="text-dev-green" />
              <span className="text-sm font-heading font-semibold text-dev-text">我的收藏</span>
              <span className="text-[10px] font-mono text-dev-muted bg-dev-panel px-2 py-0.5 rounded border border-dev-border">
                {pinnedTools.length}
              </span>
              <div className="h-px flex-1 bg-dev-border/50" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pinnedTools.map(tool => {
                const key = getToolKey(tool);
                return <ToolCard key={key} icon={tool.icon} title={tool.title} description={tool.description} accentColor={tool.accentColor} category={tool.category} showPin isPinned={true} onPinToggle={() => togglePin(tool)} onClick={() => handleToolClick(tool)} />;
              })}
            </div>
          </div>}

        {hasSearch ? (
          filteredTools.length > 0 ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTools.map(tool => {
                const key = getToolKey(tool);
                return <ToolCard key={key} icon={tool.icon} title={tool.title} description={tool.description} accentColor={tool.accentColor} category={tool.category} showPin isPinned={pinnedIds.includes(getToolKey(tool))} onPinToggle={() => togglePin(tool)} onClick={() => handleToolClick(tool)} />;
              })}
            </div> : <div className="text-center py-20">
              <div className="text-dev-muted/30 text-5xl mb-4 font-mono">∅</div>
              <p className="text-dev-muted text-sm font-mono">未找到匹配 "{searchQuery}" 的工具</p>
              <p className="text-dev-muted/50 text-xs font-mono mt-2">试试其他关键词</p>
            </div>
        ) : (
          <div className="space-y-8">
            {visibleGroupedCategories.map(cat => {
              const CatIcon = cat.icon;
              const isCollapsed = collapsedCategories[cat.id];
              return <div key={cat.id}>
                  <button onClick={() => toggleCollapse(cat.id)} className="flex items-center gap-3 mb-4 w-full group">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center ${cat.color === 'orange' ? 'bg-dev-orange/10 text-dev-orange' : 'bg-dev-green/10 text-dev-green'}`}>
                      <CatIcon size={15} />
                    </div>
                    <span className="text-sm font-heading font-semibold text-dev-text group-hover:text-dev-green transition-colors">
                      {cat.label}
                    </span>
                    <span className="text-[10px] font-mono text-dev-muted bg-dev-panel px-2 py-0.5 rounded border border-dev-border">
                      {cat.tools.length}
                    </span>
                    <div className="h-px flex-1 bg-dev-border/50" />
                    <span className="text-xs font-mono text-dev-muted group-hover:text-dev-green transition-colors">
                      {isCollapsed ? '展开' : '收起'}
                    </span>
                  </button>
                  {!isCollapsed && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {cat.tools.map(tool => {
                        const key = getToolKey(tool);
                        return <ToolCard key={key} icon={tool.icon} title={tool.title} description={tool.description} accentColor={tool.accentColor} category={tool.category} showPin isPinned={pinnedIds.includes(getToolKey(tool))} onPinToggle={() => togglePin(tool)} onClick={() => handleToolClick(tool)} />;
                      })}
                    </div>}
                </div>;
            })}
          </div>
        )}

        <div className="mt-16 pt-6 border-t border-dev-border/50">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-dev-green/20 rounded flex items-center justify-center">
                <span className="text-dev-green font-mono font-bold text-[10px]">&lt;/&gt;</span>
              </div>
              <span className="text-sm font-heading text-dev-muted">程序员工具箱</span>
            </div>
            <span className="text-xs font-mono text-dev-muted/50">所有工具均在浏览器本地运行。</span>
          </div>
        </div>
      </main>
    </div>;
}
