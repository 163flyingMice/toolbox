import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BookOpen, EyeOff, Settings, Bookmark, ChevronUp, ChevronDown, Play, Pause, X, Upload, AlignJustify, Type, MoveVertical, Eye, Minimize2, Maximize2, Plus, Trash2, ListTree, Shield, Ghost, FileText, Table2 } from 'lucide-react';
import { useToast } from '@/components/ui';
import { ToolHeader, NavHeader, ActionButton } from '@/components/ToolCard.jsx';

const STOCK_PROXY_ENDPOINT = '/api/stock-quotes';

function getStockProxyEndpoint() {
  try {
    return window.MOYU_STOCK_PROXY_URL || localStorage.getItem('moyu_stock_proxy_url') || STOCK_PROXY_ENDPOINT;
  } catch {
    return STOCK_PROXY_ENDPOINT;
  }
}

function normalizeStockCode(rawCode) {
  const clean = String(rawCode || '').trim().toLowerCase().replace(/^s_/, '');
  const prefixed = clean.match(/^(sh|sz)(\d{6})$/);
  if (prefixed) return prefixed[1] + prefixed[2];
  const plain = clean.match(/^(\d{6})$/);
  if (!plain) return '';
  const code = plain[1];
  if (code.startsWith('60')) return 'sh' + code;
  if (code.startsWith('00') || code.startsWith('30')) return 'sz' + code;
  return '';
}

function normalizeStoredStocks(list) {
  const seen = new Set();
  return (Array.isArray(list) ? list : []).reduce((acc, item) => {
    const code = normalizeStockCode(item?.code);
    if (!code || seen.has(code)) return acc;
    seen.add(code);
    acc.push({
      code,
      name: item?.name || code
    });
    return acc;
  }, []);
}

function buildStockProxyUrl(codes) {
  const endpoint = getStockProxyEndpoint();
  const joiner = endpoint.includes('?') ? '&' : '?';
  return endpoint + joiner + 'codes=' + encodeURIComponent(codes.join(',')) + '&r=' + Math.random();
}

const NOVEL_BOOKS_KEY = 'moyu_books';
const NOVEL_DB_NAME = 'moyu_novel_library';
const NOVEL_DB_VERSION = 2;
const NOVEL_HANDLE_STORE = 'handles';
const NOVEL_OPFS_DIR = 'moyu_novel_files';
const NOVEL_MAX_FILE_SIZE = 200 * 1024 * 1024;
const NOVEL_CHUNK_SIZE = 384 * 1024;
const NOVEL_DEFAULT_LINE_CHARS = 34;
const NOVEL_MIN_LINE_CHARS = 10;
const NOVEL_MAX_LINE_CHARS = 56;
const NOVEL_LINE_BREAK_CHARS = '，。！？；：、,.!?;:)]}）】」』》〕〉…';
const NOVEL_CHAPTER_SCAN_SIZE = 512 * 1024;
const NOVEL_MAX_CHAPTERS = 500;
const NOVEL_CHAPTER_PATTERN = /^(?:\s*)(?:第[零〇一二三四五六七八九十百千万\d]{1,8}\s*[章节卷回部集幕][^\n]{0,48}|chapter\s+\d+[^\n]{0,48}|part\s+\d+[^\n]{0,48}|#{1,3}\s+\S.{0,60})\s*$/i;
const NOVEL_PERSISTENT_STORAGES = ['file-handle', 'opfs-file', 'indexed-file'];
const MINI_READER_CONTENT_LIMIT = 240;

function isPersistentNovelStorage(storage) {
  return NOVEL_PERSISTENT_STORAGES.includes(storage);
}

function clampReadingLineChars(value) {
  const n = Number(value) || NOVEL_DEFAULT_LINE_CHARS;
  return Math.max(NOVEL_MIN_LINE_CHARS, Math.min(NOVEL_MAX_LINE_CHARS, Math.floor(n)));
}

function estimateReadingLineChars(width, fontSize) {
  const usableWidth = Math.max(160, Number(width) || 0);
  const charWidth = Math.max(12, (Number(fontSize) || 16) * 1.08);
  return clampReadingLineChars(usableWidth / charWidth);
}

function splitTextToReadingLines(text, maxChars = NOVEL_DEFAULT_LINE_CHARS) {
  const limit = clampReadingLineChars(maxChars);
  const lines = [];
  String(text || '').split(/\r?\n/).forEach(raw => {
    let rest = raw.replace(/\s+/g, ' ').trim();
    if (!rest) return;
    while (rest.length > limit) {
      let cut = limit;
      const minCut = Math.max(1, limit - 12);
      for (let i = limit; i >= minCut; i -= 1) {
        if (NOVEL_LINE_BREAK_CHARS.includes(rest[i - 1])) {
          cut = i;
          break;
        }
      }
      lines.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trimStart();
    }
    if (rest) lines.push(rest);
  });
  return lines;
}

function isEditableTarget(target) {
  const tag = String(target?.tagName || '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
}

function getLineByteLength(line) {
  try {
    return new Blob([line]).size;
  } catch {
    return String(line || '').length;
  }
}

function extractChapterEntries(text, baseOffset = 0, limit = NOVEL_MAX_CHAPTERS, byteOffset = true) {
  const chapters = [];
  let offset = baseOffset;
  const getPartLength = part => byteOffset ? getLineByteLength(part) : String(part || '').length;
  String(text || '').split(/(\r?\n)/).forEach(part => {
    if (!part) return;
    if (part === '\n' || part === '\r\n') {
      offset += getPartLength(part);
      return;
    }
    const title = part.trim();
    if (chapters.length < limit && title.length >= 2 && title.length <= 80 && NOVEL_CHAPTER_PATTERN.test(title)) {
      chapters.push({
        id: 'ch_' + offset + '_' + chapters.length,
        title: title.replace(/^#{1,3}\s+/, ''),
        offset
      });
    }
    offset += getPartLength(part);
  });
  return chapters;
}

function getChapterIndexForOffset(chapters, offset) {
  if (!Array.isArray(chapters) || !chapters.length) return -1;
  let index = -1;
  const currentOffset = Number(offset) || 0;
  for (let i = 0; i < chapters.length; i += 1) {
    if (Number(chapters[i]?.offset) <= currentOffset) index = i;
    else break;
  }
  return index;
}

function openNovelDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('当前浏览器不支持 IndexedDB'));
      return;
    }
    const req = window.indexedDB.open(NOVEL_DB_NAME, NOVEL_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(NOVEL_HANDLE_STORE)) {
        db.createObjectStore(NOVEL_HANDLE_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('打开本地文档库失败'));
  });
}

function withNovelStore(mode, action) {
  return openNovelDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(NOVEL_HANDLE_STORE, mode);
    const store = tx.objectStore(NOVEL_HANDLE_STORE);
    let req;
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('本地文档库写入失败'));
    };
    try {
      req = action(store);
    } catch (err) {
      db.close();
      reject(err);
      return;
    }
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('本地文档库操作失败'));
  }));
}

function novelHandleKey(id) {
  return 'handle:' + id;
}

function novelFileKey(id) {
  return 'file:' + id;
}

function isNovelFileHandle(value) {
  return !!value && typeof value.getFile === 'function';
}

function isNovelCachedFile(value) {
  return !!value && typeof value.slice === 'function' && typeof value.size === 'number';
}

function putNovelFileHandle(id, handle) {
  return withNovelStore('readwrite', store => store.put(handle, novelHandleKey(id)));
}

async function getNovelFileHandle(id) {
  const handle = await withNovelStore('readonly', store => store.get(novelHandleKey(id)));
  if (isNovelFileHandle(handle)) return handle;
  const legacy = await withNovelStore('readonly', store => store.get(id));
  return isNovelFileHandle(legacy) ? legacy : null;
}

function putNovelCachedFile(id, file) {
  return withNovelStore('readwrite', store => store.put(file, novelFileKey(id)));
}

async function getNovelCachedFile(id) {
  const file = await withNovelStore('readonly', store => store.get(novelFileKey(id)));
  if (isNovelCachedFile(file)) return file;
  const legacy = await withNovelStore('readonly', store => store.get(id));
  return isNovelCachedFile(legacy) ? legacy : null;
}

function deleteNovelFileHandle(id) {
  return Promise.allSettled([
    withNovelStore('readwrite', store => store.delete(id)),
    withNovelStore('readwrite', store => store.delete(novelHandleKey(id))),
    withNovelStore('readwrite', store => store.delete(novelFileKey(id)))
  ]);
}

async function getNovelOpfsDir(options = {}) {
  if (!navigator.storage?.getDirectory) throw new Error('当前浏览器不支持本地私有文件存储');
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(NOVEL_OPFS_DIR, {
    create: !!options.create
  });
}

async function putNovelOpfsFile(id, file) {
  const dir = await getNovelOpfsDir({
    create: true
  });
  const handle = await dir.getFileHandle(id + '.txt', {
    create: true
  });
  const writable = await handle.createWritable();
  try {
    await writable.write(file);
  } finally {
    await writable.close();
  }
}

async function getNovelOpfsFile(id, name = '本地文档.txt') {
  const dir = await getNovelOpfsDir();
  const handle = await dir.getFileHandle(id + '.txt');
  const file = await handle.getFile();
  return new File([file], name, {
    type: file.type || 'text/plain',
    lastModified: file.lastModified
  });
}

async function deleteNovelOpfsFile(id) {
  try {
    const dir = await getNovelOpfsDir();
    await dir.removeEntry(id + '.txt');
  } catch {}
}

async function getNovelStoredFile(id, name = '本地文档.txt') {
  try {
    const file = await getNovelOpfsFile(id, name);
    if (file) return file;
  } catch {}
  return getNovelCachedFile(id);
}

function readTextFile(file) {
  if (file.text) return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => resolve(ev.target.result);
    reader.onerror = () => reject(reader.error || new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

function formatFileSize(size) {
  const n = Number(size) || 0;
  if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + 'MB';
  if (n >= 1024) return (n / 1024).toFixed(1) + 'KB';
  return n + 'B';
}

function normalizeBookEntries(list) {
  return (Array.isArray(list) ? list : []).filter(item => item?.id).map(item => {
    const legacyContent = typeof item.content === 'string' ? item.content : null;
    const storage = isPersistentNovelStorage(item.storage) ? item.storage : 'session';
    return {
      id: item.id,
      name: item.name || '未命名',
      addedAt: item.addedAt || Date.now(),
      chars: Number(item.chars) || (legacyContent ? legacyContent.length : 0),
      size: Number(item.size) || (legacyContent ? legacyContent.length : 0),
      storage,
      ...(legacyContent ? {
        content: legacyContent
      } : {})
    };
  });
}

function toBookMeta(book) {
  const legacyContent = typeof book.content === 'string' ? book.content : '';
  return {
    id: book.id,
    name: book.name,
    addedAt: book.addedAt || Date.now(),
    chars: Number(book.chars) || legacyContent.length || 0,
    size: Number(book.size) || legacyContent.length || 0,
    storage: isPersistentNovelStorage(book.storage) ? book.storage : 'session'
  };
}

function getBookStorageLabel(storage) {
  if (storage === 'file-handle') return '文件授权';
  if (storage === 'opfs-file') return '本地副本';
  if (storage === 'indexed-file') return '缓存副本';
  return '会话';
}

function createMiniReaderContent(text) {
  const normalized = String(text || '').split('\n').map(line => line.trim()).filter(Boolean).join('\n');
  if (normalized.length <= MINI_READER_CONTENT_LIMIT) return normalized;
  return normalized.slice(0, MINI_READER_CONTENT_LIMIT - 1) + '…';
}

function buildMiniQuoteKline(code, price, pct) {
  const seed = String(code || '').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const drift = (Number(pct) || 0) / 100;
  const base = Number(price) || 1;
  return Array.from({
    length: 20
  }, (_, i) => {
    const wave = Math.sin((i + seed) * 0.85) * 0.006 + Math.cos((i + seed) * 0.37) * 0.004;
    const center = base * (1 + drift * (i - 10) / 24 + wave);
    const spread = base * (0.002 + Math.abs(Math.sin(seed + i)) * 0.003);
    const o = center - spread * 0.4;
    const c = center + spread * 0.4;
    return {
      o,
      c,
      h: center + spread,
      l: center - spread
    };
  });
}

function MiniFloatReader({
  content,
  visible,
  onClose,
  onExpand
}) {
  const posRef = useRef({
    x: window.innerWidth - 230,
    y: window.innerHeight - 60
  });
  const [pos, setPos] = useState(posRef.current);
  const dragging = useRef(false);
  const offset = useRef({
    x: 0,
    y: 0
  });
  const charIdx = useRef(0);
  const [line, setLine] = useState('');
  useEffect(() => {
    if (!visible || !content) return;
    const id = setInterval(() => {
      const lines = content.split('\n').filter(l => l.trim());
      if (lines.length === 0) return;
      charIdx.current = (charIdx.current + 1) % lines.length;
      const txt = lines[charIdx.current].slice(0, 32);
      setLine(txt);
    }, 4000);
    return () => clearInterval(id);
  }, [visible, content]);
  const onDown = useCallback(e => {
    dragging.current = true;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    offset.current = {
      x: cx - posRef.current.x,
      y: cy - posRef.current.y
    };
  }, []);
  const onMove = useCallback(e => {
    if (!dragging.current) return;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const nx = Math.max(0, Math.min(window.innerWidth - 210, cx - offset.current.x));
    const ny = Math.max(0, Math.min(window.innerHeight - 50, cy - offset.current.y));
    posRef.current = {
      x: nx,
      y: ny
    };
    setPos({
      x: nx,
      y: ny
    });
  }, []);
  const onUp = useCallback(() => {
    dragging.current = false;
  }, []);
  if (!visible) return null;
  return <div style={{
    position: 'fixed',
    left: pos.x,
    top: pos.y,
    zIndex: 9999
  }} className="w-[210px] bg-[#1a1a2e]/95 border border-[#333] rounded-md shadow-lg select-none" onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}>
      <div className="flex items-center gap-1 px-2 py-1 border-b border-[#333] cursor-move">
        <span className="text-[9px] font-mono text-[#888]">log</span>
        <div className="flex-1" />
        <button onClick={onExpand} className="text-[#666] hover:text-[#aaa] p-0.5"><Maximize2 size={10} /></button>
        <button onClick={onClose} className="text-[#666] hover:text-[#aaa] p-0.5"><X size={10} /></button>
      </div>
      <div className="px-2 py-1.5 overflow-hidden">
        <p className="text-[11px] font-mono text-[#6a6a7a] whitespace-nowrap truncate">
          <span className="text-[#4a4a5a] mr-1">&gt;</span>{line || '...'}
        </p>
      </div>
    </div>;
}


function NovelReader({
  navigateTo,
  setMiniReader
}) {
  const {
    toast
  } = useToast();

  const [books, setBooks] = useState(() => {
    try {
      return normalizeBookEntries(JSON.parse(localStorage.getItem(NOVEL_BOOKS_KEY) || '[]'));
    } catch {
      return [];
    }
  });
  const [activeBookId, setActiveBookId] = useState(null);
  const sessionBookFilesRef = useRef(new Map());
  const activeBookFileRef = useRef(null);
  const restoredLastBookRef = useRef(false);
  const autoChapterScannedRef = useRef(new Set());
  const [loadingBookId, setLoadingBookId] = useState(null);

  const [content, setContent] = useState('');
  const [chunkOffset, setChunkOffset] = useState(0);
  const [chunkSize, setChunkSize] = useState(0);
  const [lineMode, setLineMode] = useState(() => localStorage.getItem('moyu_lineMode') === '1');
  const [lineIndex, setLineIndex] = useState(0);
  const [multiLineCount, setMultiLineCount] = useState(() => Number(localStorage.getItem('moyu_multiLine')) || 3);
  const [jumpLineValue, setJumpLineValue] = useState('');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [bookmarks, setBookmarks] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [showChapters, setShowChapters] = useState(false);
  const [scanningChapters, setScanningChapters] = useState(false);

  const [fontSize, setFontSize] = useState(() => {
    try {
      return parseInt(localStorage.getItem('moyu_fontSize')) || 16;
    } catch {
      return 16;
    }
  });
  const [lineHeight, setLineHeight] = useState(() => {
    try {
      return parseFloat(localStorage.getItem('moyu_lineHeight')) || 1.8;
    } catch {
      return 1.8;
    }
  });
  const [bgMode, setBgMode] = useState(() => localStorage.getItem('moyu_bgMode') || 'eye'); // eye | night | green | white
  const [stealthMode, setStealthMode] = useState(() => localStorage.getItem('moyu_reader_plain') !== '0');
  const [emergencyHide, setEmergencyHide] = useState(false);
  const [disguiseMode, setDisguiseMode] = useState(() => localStorage.getItem('moyu_disguise') || 'log'); // log | table | word
  const [miniFloatMode, setMiniFloatMode] = useState(false);
  const [miniOpacity, setMiniOpacity] = useState(() => Number(localStorage.getItem('moyu_mini_opacity')) || 0.85);
  const [miniPosition, setMiniPosition] = useState({ x: 20, y: 20 });
  const miniDragRef = useRef(null);

  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const scrollTimerRef = useRef(null);
  const contentRef = useRef(null);
  const [readingLineChars, setReadingLineChars] = useState(NOVEL_DEFAULT_LINE_CHARS);

  const [miniFloat, setMiniFloat] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const activeBook = books.find(b => b.id === activeBookId);
  const activeBookTotalSize = Number(activeBook?.size) || activeBookFileRef.current?.size || content.length || 0;
  const contentLines = useMemo(() => splitTextToReadingLines(content, readingLineChars), [content, readingLineChars]);
  const currentLine = contentLines[lineIndex] || '';

  useEffect(() => {
    const updateLineChars = () => {
      const width = (contentRef.current?.clientWidth || 0) - 48;
      setReadingLineChars(estimateReadingLineChars(width, fontSize));
    };
    updateLineChars();
    if (!contentRef.current || !window.ResizeObserver) {
      window.addEventListener('resize', updateLineChars);
      return () => window.removeEventListener('resize', updateLineChars);
    }
    const observer = new ResizeObserver(updateLineChars);
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [fontSize]);

  useEffect(() => {
    setLineIndex(index => Math.max(0, Math.min(index, Math.max(0, contentLines.length - 1))));
  }, [contentLines.length]);

  useEffect(() => {
    try {
      localStorage.setItem(NOVEL_BOOKS_KEY, JSON.stringify(books.filter(book => isPersistentNovelStorage(book.storage)).map(toBookMeta)));
    } catch {}
  }, [books]);
  useEffect(() => {
    try {
      localStorage.setItem('moyu_fontSize', String(fontSize));
    } catch {}
  }, [fontSize]);
  useEffect(() => {
    try {
      localStorage.setItem('moyu_lineHeight', String(lineHeight));
    } catch {}
  }, [lineHeight]);
  useEffect(() => {
    try {
      localStorage.setItem('moyu_bgMode', bgMode);
    } catch {}
  }, [bgMode]);
  useEffect(() => {
    try {
      localStorage.setItem('moyu_lineMode', lineMode ? '1' : '0');
    } catch {}
  }, [lineMode]);
  useEffect(() => {
    try {
      localStorage.setItem('moyu_reader_plain', stealthMode ? '1' : '0');
    } catch {}
  }, [stealthMode]);
  useEffect(() => {
    try {
      localStorage.setItem('moyu_disguise', disguiseMode);
    } catch {}
  }, [disguiseMode]);
  useEffect(() => {
    if (activeBookId) {
      try {
        localStorage.setItem('moyu_lastBook', activeBookId);
        const book = books.find(b => b.id === activeBookId);
        if (book) localStorage.setItem('moyu_lastBookName', book.name);
      } catch {}
    }
  }, [activeBookId]);

  const getReadableBookFile = useCallback(async book => {
    const cached = sessionBookFilesRef.current.get(book.id);
    if (cached) return cached;

    if (book.storage === 'file-handle') {
      let handleError = null;
      const handle = await getNovelFileHandle(book.id);
      if (handle) {
        try {
          if (handle.queryPermission) {
            let permission = await handle.queryPermission({
              mode: 'read'
            });
            if (permission !== 'granted' && handle.requestPermission) {
              permission = await handle.requestPermission({
                mode: 'read'
              });
            }
            if (permission !== 'granted') throw new Error('没有读取本地文件的授权');
          }
          const file = await handle.getFile();
          if (file.size > NOVEL_MAX_FILE_SIZE) throw new Error('文件超过 ' + formatFileSize(NOVEL_MAX_FILE_SIZE));
          sessionBookFilesRef.current.set(book.id, file);
          return file;
        } catch (err) {
          handleError = err;
        }
      }
      const file = await getNovelStoredFile(book.id, book.name + '.txt');
      if (!file) throw new Error(handleError?.message || '本地文件授权已丢失，请重新打开原文件');
      if (file.size > NOVEL_MAX_FILE_SIZE) throw new Error('文件超过 ' + formatFileSize(NOVEL_MAX_FILE_SIZE));
      sessionBookFilesRef.current.set(book.id, file);
      return file;
    }

    if (book.storage === 'opfs-file') {
      let opfsError = null;
      try {
        const file = await getNovelOpfsFile(book.id, book.name + '.txt');
        if (file.size > NOVEL_MAX_FILE_SIZE) throw new Error('文件超过 ' + formatFileSize(NOVEL_MAX_FILE_SIZE));
        sessionBookFilesRef.current.set(book.id, file);
        return file;
      } catch (err) {
        opfsError = err;
      }
      const file = await getNovelStoredFile(book.id, book.name + '.txt');
      if (!file) throw new Error(opfsError?.message || '本地副本已清理，请重新选择文件');
      if (file.size > NOVEL_MAX_FILE_SIZE) throw new Error('文件超过 ' + formatFileSize(NOVEL_MAX_FILE_SIZE));
      sessionBookFilesRef.current.set(book.id, file);
      return file;
    }

    if (book.storage === 'indexed-file') {
      const file = await getNovelStoredFile(book.id, book.name + '.txt');
      if (!file) throw new Error('本地缓存已清理，请重新选择文件');
      if (file.size > NOVEL_MAX_FILE_SIZE) throw new Error('文件超过 ' + formatFileSize(NOVEL_MAX_FILE_SIZE));
      sessionBookFilesRef.current.set(book.id, file);
      return file;
    }

    throw new Error('这本书没有保存正文，请重新选择本地文件');
  }, []);

  const loadBookChunk = useCallback(async (book, offset = 0, options = {}) => {
    setLoadingBookId(book.id);
    try {
      let text = '';
      let start = 0;
      let size = 0;
      let total = Number(book.size) || 0;

      if (typeof book.content === 'string') {
        activeBookFileRef.current = null;
        total = book.content.length;
        start = Math.max(0, Math.min(Math.floor(offset) || 0, Math.max(0, total - 1)));
        const end = Math.min(total, start + NOVEL_CHUNK_SIZE);
        text = book.content.slice(start, end);
        size = end - start;
      } else {
        const file = await getReadableBookFile(book);
        activeBookFileRef.current = file;
        total = file.size;
        start = Math.max(0, Math.min(Math.floor(offset) || 0, Math.max(0, total - 1)));
        const end = Math.min(total, start + NOVEL_CHUNK_SIZE);
        text = await readTextFile(file.slice(start, end));
        size = end - start;
      }

      const within = total ? start / total : 0;
      setActiveBookId(book.id);
      setContent(text);
      setChunkOffset(start);
      setChunkSize(size);
      const nextLineCount = splitTextToReadingLines(text, readingLineChars).length;
      const nextLineIndex = Math.max(0, Math.min(Number(options.lineIndex) || 0, Math.max(0, nextLineCount - 1)));
      setLineIndex(nextLineIndex);
      setScrollProgress(Math.min(1, Math.max(0, within)));
      let nextChapters = [];
      try {
        const bm = localStorage.getItem('moyu_bm_' + book.id);
        setBookmarks(bm ? JSON.parse(bm) : []);
      } catch {
        setBookmarks([]);
      }
      try {
        const cachedChapters = localStorage.getItem('moyu_chapters_' + book.id);
        nextChapters = cachedChapters ? JSON.parse(cachedChapters) : [];
        setChapters(nextChapters);
      } catch {
        setChapters([]);
      }
      try {
        const normalized = total ? start / total : 0;
        localStorage.setItem('moyu_lastBook', book.id);
        localStorage.setItem('moyu_lastBookName', book.name);
        localStorage.setItem('moyu_prog_' + book.id, String(Math.min(1, Math.max(0, normalized))));
        localStorage.setItem('moyu_offset_' + book.id, String(start));
        localStorage.setItem('moyu_scroll_' + book.id, String(Number.isFinite(options.scrollTop) ? options.scrollTop : 0));
        localStorage.setItem('moyu_line_' + book.id, String(nextLineIndex));
        localStorage.setItem('moyu_chapter_' + book.id, String(getChapterIndexForOffset(nextChapters, start)));
      } catch {}
      setShowLibrary(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = contentRef.current;
          if (el) {
            el.scrollTop = Number.isFinite(options.scrollTop) ? options.scrollTop : 0;
          }
        });
      });
      return true;
    } catch (err) {
      if (!options.silent) {
        toast({
          title: '无法打开',
          description: err?.message || '请重新选择本地文件',
          variant: 'destructive'
        });
      }
      return false;
    } finally {
      setLoadingBookId(null);
    }
  }, [getReadableBookFile, readingLineChars, toast]);

  const scanBookChapters = useCallback(async (book, options = {}) => {
    if (!book || scanningChapters) return [];
    setScanningChapters(true);
    try {
      const total = Number(book.size) || (typeof book.content === 'string' ? book.content.length : 0);
      const found = [];
      let offset = 0;
      while (offset < total && found.length < NOVEL_MAX_CHAPTERS) {
        let text = '';
        let size = 0;
        if (typeof book.content === 'string') {
          text = book.content.slice(offset, Math.min(total, offset + NOVEL_CHAPTER_SCAN_SIZE));
          size = text.length;
        } else {
          const file = await getReadableBookFile(book);
          const end = Math.min(file.size, offset + NOVEL_CHAPTER_SCAN_SIZE);
          text = await readTextFile(file.slice(offset, end));
          size = end - offset;
        }
        found.push(...extractChapterEntries(text, offset, NOVEL_MAX_CHAPTERS - found.length, typeof book.content !== 'string'));
        if (!size) break;
        offset += size;
      }
      const next = found.slice(0, NOVEL_MAX_CHAPTERS);
      setChapters(next);
      try {
        localStorage.setItem('moyu_chapters_' + book.id, JSON.stringify(next));
      } catch {}
      if (!next.length && !options.silent) {
        toast({
          title: '未识别到目录',
          description: '支持“第1章 / 第十章 / Chapter 1 / ## 标题”等常见格式'
        });
      }
      return next;
    } catch (err) {
      if (!options.silent) {
        toast({
          title: '目录扫描失败',
          description: err?.message || '无法读取文件',
          variant: 'destructive'
        });
      }
      return [];
    } finally {
      setScanningChapters(false);
    }
  }, [getReadableBookFile, scanningChapters, toast]);

  const selectBook = useCallback(async (book, options = {}) => {
    let offset = 0;
    let scrollTop = 0;
    try {
      const storedOffsetRaw = localStorage.getItem('moyu_offset_' + book.id);
      const hasStoredOffset = storedOffsetRaw !== null && storedOffsetRaw !== '';
      const storedOffset = Number(storedOffsetRaw);
      const storedProgress = parseFloat(localStorage.getItem('moyu_prog_' + book.id) || '0') || 0;
      offset = hasStoredOffset && Number.isFinite(storedOffset) && storedOffset >= 0 ? storedOffset : Math.floor(storedProgress * (Number(book.size) || 0));
      scrollTop = Number(localStorage.getItem('moyu_scroll_' + book.id)) || 0;
      const storedChapter = Number(localStorage.getItem('moyu_chapter_' + book.id));
      if (!hasStoredOffset && Number.isFinite(storedChapter) && storedChapter >= 0) {
        const cachedChapters = JSON.parse(localStorage.getItem('moyu_chapters_' + book.id) || '[]');
        if (cachedChapters[storedChapter]) offset = Number(cachedChapters[storedChapter].offset) || offset;
      }
    } catch {}
    let storedLineIndex = 0;
    try {
      storedLineIndex = Number(localStorage.getItem('moyu_line_' + book.id)) || 0;
    } catch {}
    await loadBookChunk(book, offset, {
      ...options,
      scrollTop,
      lineIndex: storedLineIndex
    });
  }, [loadBookChunk]);

  useEffect(() => {
    if (restoredLastBookRef.current) return;
    restoredLastBookRef.current = true;
    let cancelled = false;
    const restoreLastBook = async () => {
      const last = localStorage.getItem('moyu_lastBook');
      if (!last) return;

      // 尝试从持久化存储中找到书籍
      const book = books.find(b => b.id === last);
      if (!book) {
        // 书籍不在列表中，尝试从缓存恢复
        const cachedFile = await getNovelStoredFile(last, 'cached.txt').catch(() => null);
        if (cachedFile) {
          // 从缓存创建临时书籍
          const tempBook = {
            id: last,
            name: localStorage.getItem('moyu_lastBookName') || '缓存文件',
            addedAt: Date.now(),
            chars: 0,
            size: cachedFile.size,
            storage: 'indexed-file'
          };
          sessionBookFilesRef.current.set(last, cachedFile);
          const nextBooks = [...books, tempBook];
          setBooks(nextBooks);
          await selectBook(tempBook, { silent: true });
          return;
        }

        // 无法恢复，显示提示但不报错
        toast({
          title: '请重新选择小说',
          description: '上次阅读的小说未能自动恢复',
        });
        return;
      }

      let canRestore = true;
      if (book.storage === 'file-handle') {
        const handle = await getNovelFileHandle(book.id).catch(() => null);
        if (handle?.queryPermission) {
          const permission = await handle.queryPermission({
            mode: 'read'
          }).catch(() => 'denied');
          if (permission !== 'granted') {
            const cachedFile = await getNovelStoredFile(book.id, book.name + '.txt').catch(() => null);
            if (cachedFile) {
              sessionBookFilesRef.current.set(book.id, cachedFile);
            } else {
              canRestore = false;
            }
          }
        } else {
          const cachedFile = await getNovelStoredFile(book.id, book.name + '.txt').catch(() => null);
          if (cachedFile) {
            sessionBookFilesRef.current.set(book.id, cachedFile);
          } else {
            canRestore = false;
          }
        }
      } else if (book.storage === 'opfs-file' || book.storage === 'indexed-file') {
        const cachedFile = await getNovelStoredFile(book.id, book.name + '.txt').catch(() => null);
        if (cachedFile) {
          sessionBookFilesRef.current.set(book.id, cachedFile);
        } else {
          canRestore = false;
        }
      }

      if (cancelled) return;
      if (!canRestore) {
        toast({
          title: '需要重新选择小说',
          description: '浏览器未能恢复上次阅读的文件',
        });
        return;
      }

      if (isPersistentNovelStorage(book.storage) || typeof book.content === 'string') {
        selectBook(book, { silent: true });
      }
    };
    restoreLastBook().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [books, selectBook, toast]);

  const importBookFile = useCallback(async (file, handle) => {
    if (!file) return;
    if (file.size > NOVEL_MAX_FILE_SIZE) {
      toast({
        title: '文件过大',
        description: '请选择 ' + formatFileSize(NOVEL_MAX_FILE_SIZE) + ' 以内的文件',
        variant: 'destructive'
      });
      return;
    }
    setLoadingBookId('upload');
    try {
      const displayName = file.name.replace(/\.(txt|epub|md|log)$/i, '');
      const existingBook = books.find(book => book.name === displayName && Number(book.size) === file.size);
      if (existingBook) {
        sessionBookFilesRef.current.set(existingBook.id, file);
        let nextStorage = existingBook.storage;
        if (handle) {
          try {
            await putNovelFileHandle(existingBook.id, handle);
            nextStorage = 'file-handle';
          } catch {}
        }
        let cached = false;
        try {
          await putNovelOpfsFile(existingBook.id, file);
          cached = true;
          if (nextStorage !== 'file-handle') nextStorage = 'opfs-file';
        } catch {}
        if (!cached) try {
          await putNovelCachedFile(existingBook.id, file);
          cached = true;
          if (nextStorage !== 'file-handle') nextStorage = 'indexed-file';
        } catch {}
        const nextBook = {
          ...existingBook,
          storage: nextStorage
        };
        const nextBooks = books.map(book => book.id === existingBook.id ? nextBook : book);
        setBooks(nextBooks);
        try {
          localStorage.setItem(NOVEL_BOOKS_KEY, JSON.stringify(nextBooks.filter(book => isPersistentNovelStorage(book.storage)).map(toBookMeta)));
          localStorage.setItem('moyu_lastBook', existingBook.id);
        } catch {}
        await selectBook(nextBook);
        toast({
          title: '已恢复本地文件',
          description: displayName + ' · ' + formatFileSize(file.size) + (cached ? ' · 已缓存' : ' · 本次会话')
        });
        return;
      }
      const id = 'bk_' + Date.now();
      let storage = 'session';
      let cached = false;
      if (handle) {
        try {
          await putNovelFileHandle(id, handle);
          storage = 'file-handle';
        } catch {}
      }
      try {
        await putNovelOpfsFile(id, file);
        cached = true;
        if (storage !== 'file-handle') storage = 'opfs-file';
      } catch {}
      if (!cached) {
        try {
          await putNovelCachedFile(id, file);
          cached = true;
          if (storage !== 'file-handle') storage = 'indexed-file';
        } catch {}
      }
      if (storage === 'session' && handle) {
        toast({
          title: '仅本次会话可用',
          description: '浏览器没有允许保存本地副本，下次可能需要重新授权文件'
        });
      } else {
        try {
          localStorage.setItem('moyu_reader_cache_ok', cached ? '1' : '0');
        } catch {}
      }
      const newBook = {
        id,
        name: displayName,
        addedAt: Date.now(),
        chars: 0,
        size: file.size,
        storage
      };
      sessionBookFilesRef.current.set(id, file);
      const nextBooks = [...books, newBook];
      setBooks(nextBooks);
      try {
        localStorage.setItem(NOVEL_BOOKS_KEY, JSON.stringify(nextBooks.filter(book => isPersistentNovelStorage(book.storage)).map(toBookMeta)));
        localStorage.setItem('moyu_lastBook', id);
      } catch {}
      await loadBookChunk(newBook, 0);
      toast({
        title: storage === 'session' ? '已打开会话文件' : '已记住本地文件',
        description: newBook.name + ' · ' + formatFileSize(file.size) + (storage === 'session' ? ' · 浏览器未允许本地缓存' : '')
      });
    } catch (err) {
      toast({
        title: '读取失败',
        description: err?.message || '无法读取文件',
        variant: 'destructive'
      });
    } finally {
      setLoadingBookId(null);
    }
  }, [books, loadBookChunk, selectBook, toast]);

  const openLocalBookFile = useCallback(async () => {
    if (!window.showOpenFilePicker) {
      toast({
        title: '浏览器不支持',
        description: '请使用下方文件选择按钮打开本地文件',
        variant: 'destructive'
      });
      return;
    }
    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [{
          description: '文本文件',
          accept: {
            'text/plain': ['.txt', '.md', '.log']
          }
        }]
      });
      const file = await handle.getFile();
      await importBookFile(file, handle);
    } catch (err) {
      if (err?.name === 'AbortError') return;
      toast({
        title: '打开失败',
        description: err?.message || '无法打开本地文件',
        variant: 'destructive'
      });
    }
  }, [importBookFile, toast]);

  const handleUpload = useCallback(async e => {
    const file = e.target.files?.[0];
    try {
      await importBookFile(file, null);
    } finally {
      e.target.value = '';
    }
  }, [importBookFile]);

  const saveReadingPosition = useCallback(el => {
    if (!activeBookId) return 0;
    const maxScroll = el ? Math.max(1, el.scrollHeight - el.clientHeight) : 1;
    const scrollRatio = el ? Math.min(1, Math.max(0, el.scrollTop / maxScroll)) : 0;
    const lineRatio = contentLines.length > 1 ? lineIndex / Math.max(1, contentLines.length - 1) : 0;
    const withinChunk = lineMode ? lineRatio : scrollRatio;
    const absoluteOffset = chunkOffset + withinChunk * chunkSize;
    const prog = activeBookTotalSize ? absoluteOffset / activeBookTotalSize : 0;
    const normalized = Math.min(1, Math.max(0, prog));
    setScrollProgress(normalized);
    try {
      localStorage.setItem('moyu_prog_' + activeBookId, String(normalized));
      localStorage.setItem('moyu_offset_' + activeBookId, String(chunkOffset));
      localStorage.setItem('moyu_scroll_' + activeBookId, String(el?.scrollTop || 0));
      localStorage.setItem('moyu_line_' + activeBookId, String(lineIndex));
      localStorage.setItem('moyu_chapter_' + activeBookId, String(getChapterIndexForOffset(chapters, chunkOffset)));
    } catch {}
    return normalized;
  }, [activeBookId, activeBookTotalSize, chapters, chunkOffset, chunkSize, contentLines.length, lineIndex, lineMode]);

  useEffect(() => {
    if (!autoScroll || lineMode) return;
    const id = setInterval(() => {
      const el = contentRef.current;
      if (!el) return;
      el.scrollTop += scrollSpeed;
      saveReadingPosition(el);
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
      const hasNextChunk = activeBook && chunkOffset + chunkSize < activeBookTotalSize;
      if (atBottom && hasNextChunk && !loadingBookId) {
        loadBookChunk(activeBook, chunkOffset + chunkSize, {
          silent: true,
          scrollTop: 0
        });
      }
    }, 50);
    return () => clearInterval(id);
  }, [activeBook, activeBookTotalSize, autoScroll, chunkOffset, chunkSize, lineMode, loadBookChunk, loadingBookId, saveReadingPosition, scrollSpeed]);

  useEffect(() => {
    if (!lineMode || !activeBookId) return;
    saveReadingPosition(contentRef.current);
  }, [activeBookId, lineIndex, lineMode, saveReadingPosition]);

  const deleteBook = useCallback(id => {
    setBooks(prev => prev.filter(b => b.id !== id));
    sessionBookFilesRef.current.delete(id);
    if (activeBookId === id) {
      activeBookFileRef.current = null;
      setActiveBookId(null);
      setContent('');
      setChunkOffset(0);
      setChunkSize(0);
      setScrollProgress(0);
    }
    try {
      localStorage.removeItem('moyu_bm_' + id);
      localStorage.removeItem('moyu_prog_' + id);
      localStorage.removeItem('moyu_offset_' + id);
      localStorage.removeItem('moyu_scroll_' + id);
      localStorage.removeItem('moyu_line_' + id);
      localStorage.removeItem('moyu_chapter_' + id);
      localStorage.removeItem('moyu_chapters_' + id);
    } catch {}
    deleteNovelFileHandle(id).catch(() => {});
    deleteNovelOpfsFile(id).catch(() => {});
    autoChapterScannedRef.current.delete(id);
  }, [activeBookId]);

  useEffect(() => {
    if (!activeBook || chapters.length || scanningChapters) return;
    if (autoChapterScannedRef.current.has(activeBook.id)) return;
    autoChapterScannedRef.current.add(activeBook.id);
    scanBookChapters(activeBook, {
      silent: true
    });
  }, [activeBook, chapters.length, scanBookChapters, scanningChapters]);

  const addBookmark = useCallback(() => {
    if (!activeBookId || !contentRef.current) return;
    const el = contentRef.current;
    const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
    const withinChunk = Math.min(1, Math.max(0, el.scrollTop / maxScroll));
    const absoluteOffset = chunkOffset + withinChunk * chunkSize;
    const prog = activeBookTotalSize ? absoluteOffset / activeBookTotalSize : 0;
    const bm = {
      id: 'bm_' + Date.now(),
      progress: Math.min(1, Math.max(0, prog)),
      offset: chunkOffset,
      scrollTop: el.scrollTop,
      lineIndex,
      time: new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
    const next = [...bookmarks, bm];
    setBookmarks(next);
    try {
      localStorage.setItem('moyu_bm_' + activeBookId, JSON.stringify(next));
    } catch {}
    toast({
      title: '标记已添加'
    });
  }, [activeBookId, activeBookTotalSize, bookmarks, chunkOffset, chunkSize, lineIndex, toast]);
  const jumpToBookmark = useCallback(async bm => {
    if (activeBook && typeof bm.offset === 'number') {
      await loadBookChunk(activeBook, bm.offset, {
        scrollTop: bm.scrollTop || 0,
        lineIndex: bm.lineIndex || 0
      });
      setShowBookmarks(false);
      return;
    }
    if (contentRef.current) {
      contentRef.current.scrollTop = bm.scrollTop;
      setShowBookmarks(false);
    }
  }, [activeBook, loadBookChunk]);
  const deleteBookmark = useCallback(bmId => {
    const next = bookmarks.filter(b => b.id !== bmId);
    setBookmarks(next);
    if (activeBookId) {
      try {
        localStorage.setItem('moyu_bm_' + activeBookId, JSON.stringify(next));
      } catch {}
    }
  }, [bookmarks, activeBookId]);

  const handleScroll = useCallback(() => {
    const el = contentRef.current;
    saveReadingPosition(el);
    if (!el || !activeBook || loadingBookId) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
    if (atBottom && chunkOffset + chunkSize < activeBookTotalSize) {
      loadBookChunk(activeBook, chunkOffset + chunkSize, {
        silent: true,
        scrollTop: 0
      });
    }
  }, [activeBook, activeBookTotalSize, chunkOffset, chunkSize, loadBookChunk, loadingBookId, saveReadingPosition]);

  const readPrevChunk = useCallback(() => {
    if (!activeBook) return;
    loadBookChunk(activeBook, Math.max(0, chunkOffset - NOVEL_CHUNK_SIZE), {
      scrollTop: 0
    });
  }, [activeBook, chunkOffset, loadBookChunk]);

  const readNextChunk = useCallback(() => {
    if (!activeBook) return;
    loadBookChunk(activeBook, chunkOffset + chunkSize, {
      scrollTop: 0
    });
  }, [activeBook, chunkOffset, chunkSize, loadBookChunk]);

  const readPrevLine = useCallback(async () => {
    if (!activeBook || loadingBookId) return;
    if (lineIndex > 0) {
      const nextIndex = Math.max(0, lineIndex - 1);
      setLineIndex(nextIndex);
      if (activeBookId) {
        try {
          localStorage.setItem('moyu_line_' + activeBookId, String(nextIndex));
        } catch {}
      }
      requestAnimationFrame(() => saveReadingPosition(contentRef.current));
      return;
    }
    if (chunkOffset <= 0) return;
    const prevOffset = Math.max(0, chunkOffset - NOVEL_CHUNK_SIZE);
    const ok = await loadBookChunk(activeBook, prevOffset, {
      silent: true,
      scrollTop: 0,
      lineIndex: Number.MAX_SAFE_INTEGER
    });
    if (ok) requestAnimationFrame(() => saveReadingPosition(contentRef.current));
  }, [activeBook, activeBookId, chunkOffset, contentLines.length, lineIndex, loadBookChunk, loadingBookId, saveReadingPosition]);

  const readNextLine = useCallback(async () => {
    if (!activeBook || loadingBookId) return;
    if (lineIndex < contentLines.length - 1) {
      const nextIndex = Math.min(contentLines.length - 1, lineIndex + 1);
      setLineIndex(nextIndex);
      if (activeBookId) {
        try {
          localStorage.setItem('moyu_line_' + activeBookId, String(nextIndex));
        } catch {}
      }
      requestAnimationFrame(() => saveReadingPosition(contentRef.current));
      return;
    }
    if (chunkOffset + chunkSize >= activeBookTotalSize) return;
    await loadBookChunk(activeBook, chunkOffset + chunkSize, {
      silent: true,
      scrollTop: 0,
      lineIndex: 0
    });
  }, [activeBook, activeBookId, activeBookTotalSize, chunkOffset, chunkSize, contentLines.length, lineIndex, loadBookChunk, loadingBookId, saveReadingPosition]);

  const readPrevPage = useCallback(async () => {
    if (!activeBook || loadingBookId) return;
    const el = contentRef.current;
    if (el && el.scrollTop > 8) {
      el.scrollTop = Math.max(0, el.scrollTop - el.clientHeight * 0.85);
      saveReadingPosition(el);
      return;
    }
    if (chunkOffset <= 0) return;
    await loadBookChunk(activeBook, Math.max(0, chunkOffset - NOVEL_CHUNK_SIZE), {
      silent: true,
      scrollTop: Number.MAX_SAFE_INTEGER
    });
  }, [activeBook, chunkOffset, loadBookChunk, loadingBookId, saveReadingPosition]);

  const readNextPage = useCallback(async () => {
    if (!activeBook || loadingBookId) return;
    const el = contentRef.current;
    if (el && el.scrollTop + el.clientHeight < el.scrollHeight - 8) {
      el.scrollTop = Math.min(el.scrollHeight - el.clientHeight, el.scrollTop + el.clientHeight * 0.85);
      saveReadingPosition(el);
      return;
    }
    if (chunkOffset + chunkSize >= activeBookTotalSize) return;
    await loadBookChunk(activeBook, chunkOffset + chunkSize, {
      silent: true,
      scrollTop: 0
    });
  }, [activeBook, activeBookTotalSize, chunkOffset, chunkSize, loadBookChunk, loadingBookId, saveReadingPosition]);

  const jumpToLine = useCallback(async targetLine => {
    if (!activeBook || loadingBookId) return;
    const target = Math.max(0, Math.min(contentLines.length - 1, Number(targetLine) - 1));
    if (!Number.isFinite(target)) return;
    setLineIndex(target);
    if (activeBookId) {
      try {
        localStorage.setItem('moyu_line_' + activeBookId, String(target));
      } catch {}
    }
    requestAnimationFrame(() => saveReadingPosition(contentRef.current));
    setJumpLineValue('');
  }, [activeBook, activeBookId, contentLines.length, loadingBookId, saveReadingPosition]);

  const readNextMultiLine = useCallback(async () => {
    if (!activeBook || loadingBookId) return;
    const nextIndex = Math.min(contentLines.length - 1, lineIndex + multiLineCount);
    setLineIndex(nextIndex);
    if (activeBookId) {
      try {
        localStorage.setItem('moyu_line_' + activeBookId, String(nextIndex));
      } catch {}
    }
    requestAnimationFrame(() => saveReadingPosition(contentRef.current));
  }, [activeBook, activeBookId, contentLines.length, lineIndex, loadingBookId, multiLineCount, saveReadingPosition]);

  const readPrevMultiLine = useCallback(async () => {
    if (!activeBook || loadingBookId) return;
    const nextIndex = Math.max(0, lineIndex - multiLineCount);
    setLineIndex(nextIndex);
    if (activeBookId) {
      try {
        localStorage.setItem('moyu_line_' + activeBookId, String(nextIndex));
      } catch {}
    }
    requestAnimationFrame(() => saveReadingPosition(contentRef.current));
  }, [activeBook, activeBookId, lineIndex, loadingBookId, multiLineCount, saveReadingPosition]);

  const jumpToChapter = useCallback(async chapter => {
    if (!activeBook || !chapter) return;
    const ok = await loadBookChunk(activeBook, chapter.offset, {
      silent: true,
      scrollTop: 0,
      lineIndex: 0
    });
    if (ok) {
      setShowChapters(false);
      try {
        localStorage.setItem('moyu_chapter_' + activeBook.id, String(getChapterIndexForOffset(chapters, chapter.offset)));
        localStorage.setItem('moyu_offset_' + activeBook.id, String(chapter.offset));
        localStorage.setItem('moyu_line_' + activeBook.id, '0');
        localStorage.setItem('moyu_scroll_' + activeBook.id, '0');
      } catch {}
      requestAnimationFrame(() => saveReadingPosition(contentRef.current));
    }
  }, [activeBook, chapters, loadBookChunk, saveReadingPosition]);

  const currentChapterIndex = useMemo(() => {
    if (!chapters.length) return -1;
    let index = -1;
    for (let i = 0; i < chapters.length; i += 1) {
      if (chapters[i].offset <= chunkOffset) index = i;
      else break;
    }
    return index;
  }, [chapters, chunkOffset]);

  const jumpRelativeChapter = useCallback(direction => {
    if (!chapters.length) return;
    const fallback = direction > 0 ? -1 : chapters.length;
    const nextIndex = Math.max(0, Math.min(chapters.length - 1, (currentChapterIndex >= 0 ? currentChapterIndex : fallback) + direction));
    jumpToChapter(chapters[nextIndex]);
  }, [chapters, currentChapterIndex, jumpToChapter]);

  useEffect(() => {
    const onKeyDown = event => {
      // 紧急隐藏快捷键：ESC 或 Cmd/Ctrl+Shift+H
      if (event.key === 'Escape') {
        event.preventDefault();
        setEmergencyHide(prev => !prev);
        return;
      }
      // Mac: Cmd+Shift+H, Windows: Ctrl+Shift+H
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'h') {
        event.preventDefault();
        setEmergencyHide(prev => !prev);
        return;
      }

      if (!activeBook || loadingBookId || isEditableTarget(event.target)) return;
      // 不拦截系统快捷键（Cmd/Ctrl 组合键）
      if (event.metaKey || event.ctrlKey) return;
      const key = event.key;
      if (lineMode) {
        if (key === ' ' || key === 'PageDown') {
          event.preventDefault();
          readNextMultiLine();
        } else if (key === 'PageUp') {
          event.preventDefault();
          readPrevMultiLine();
        } else if (key === 'ArrowDown' || key === 'j' || key === 'J') {
          event.preventDefault();
          readNextLine();
        } else if (key === 'ArrowUp' || key === 'k' || key === 'K') {
          event.preventDefault();
          readPrevLine();
        } else if (key === 'ArrowRight') {
          event.preventDefault();
          jumpRelativeChapter(1);
        } else if (key === 'ArrowLeft') {
          event.preventDefault();
          jumpRelativeChapter(-1);
        } else if (key === 't' || key === 'T') {
          event.preventDefault();
          setShowChapters(value => !value);
        }
      } else {
        if (['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'j', 'J'].includes(key)) {
          event.preventDefault();
          readNextPage();
        } else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'k', 'K'].includes(key)) {
          event.preventDefault();
          readPrevPage();
        } else if (key === ']') {
          event.preventDefault();
          jumpRelativeChapter(1);
        } else if (key === '[') {
          event.preventDefault();
          jumpRelativeChapter(-1);
        } else if (key === 't' || key === 'T') {
          event.preventDefault();
          setShowChapters(value => !value);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeBook, jumpRelativeChapter, lineMode, loadingBookId, readNextLine, readNextPage, readPrevLine, readPrevPage, readNextMultiLine, readPrevMultiLine]);

  const handleHide = useCallback(() => {
    const miniContent = createMiniReaderContent(lineMode ? contentLines.slice(lineIndex, lineIndex + 8).join('\n') : content);
    if (setMiniReader) {
      setMiniReader(miniContent || '...');
    } else {
      setMiniFloat(true);
    }
    if (navigateTo) navigateTo({
      pageId: 'home',
      params: {}
    });
  }, [content, contentLines, lineIndex, lineMode, navigateTo, setMiniReader]);

  useEffect(() => {
    const hideAll = () => {
      setAutoScroll(false);
      setMiniFloat(false);
      setShowSettings(false);
      setShowBookmarks(false);
      setShowLibrary(false);
      setShowChapters(false);
    };
    window.addEventListener('moyu:hide-all', hideAll);
    return () => window.removeEventListener('moyu:hide-all', hideAll);
  }, []);

  const bgStyles = {
    eye: 'bg-[#f5f0e1] text-[#3a3a2a]',
    night: 'bg-[#1a1a2e] text-[#c8c8d0]',
    green: 'bg-[#cce8cc] text-[#2a3a2a]',
    white: 'bg-white text-[#333]'
  };
  const stealthBg = 'bg-[#0d1117] text-[#484f58]';
  const canPickLocalFile = typeof window.showOpenFilePicker === 'function';
  const chunkEnd = Math.min(activeBookTotalSize, chunkOffset + chunkSize);
  const hasPrevChunk = !!activeBook && chunkOffset > 0;
  const hasNextChunk = !!activeBook && chunkEnd < activeBookTotalSize;

  return <div className="flex flex-col h-full">
      
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <ActionButton onClick={() => setShowLibrary(true)} variant="secondary">
          <BookOpen size={14} className="mr-1" />源
        </ActionButton>
        <ActionButton onClick={() => setShowSettings(s => !s)} variant="secondary">
          <Settings size={14} className="mr-1" />设置
        </ActionButton>
        <ActionButton onClick={addBookmark} variant="secondary">
          <Bookmark size={14} className="mr-1" />标记
        </ActionButton>
        <ActionButton onClick={() => {
        setShowChapters(s => !s);
        if (activeBook && !chapters.length) scanBookChapters(activeBook);
      }} variant={showChapters ? 'primary' : 'secondary'}>
          <ListTree size={14} className="mr-1" />目录
        </ActionButton>
        <ActionButton onClick={() => setAutoScroll(s => !s)} variant={autoScroll ? 'primary' : 'secondary'}>
          {autoScroll ? <Pause size={14} className="mr-1" /> : <Play size={14} className="mr-1" />}
          {autoScroll ? '暂停' : '自动'}
        </ActionButton>
        <ActionButton onClick={() => {
        setLineMode(s => !s);
        setAutoScroll(false);
      }} variant={lineMode ? 'primary' : 'secondary'}>
          <AlignJustify size={14} className="mr-1" />{lineMode ? '整段' : '逐行'}
        </ActionButton>
        <ActionButton onClick={() => setStealthMode(s => !s)} variant={stealthMode ? 'danger' : 'secondary'}>
          {stealthMode ? <Eye size={14} className="mr-1" /> : <EyeOff size={14} className="mr-1" />}
          {stealthMode ? '标准' : '日志'}
        </ActionButton>
        <ActionButton onClick={() => setMiniFloatMode(s => !s)} variant={miniFloatMode ? 'primary' : 'secondary'}>
          <Ghost size={14} className="mr-1" />迷你
        </ActionButton>
        <ActionButton onClick={() => setEmergencyHide(s => !s)} variant={emergencyHide ? 'danger' : 'secondary'}>
          <Shield size={14} className="mr-1" />{emergencyHide ? '恢复' : '应急'}
        </ActionButton>
        <ActionButton onClick={handleHide} variant="danger">
          <Minimize2 size={14} className="mr-1" />收起
        </ActionButton>
        {activeBook && <span className="text-[10px] font-mono text-dev-muted/35">ESC应急 · {lineMode ? '↑↓ 单行 · 空格 多行 · ←→ 章节' : '←/→ 翻页 · [/] 章节'} · T 目录</span>}
      </div>

      
      {activeBook && <div className="flex items-center gap-3 mb-2">
          <span className={`text-xs font-mono ${stealthMode ? 'text-[#484f58]' : 'text-dev-muted'}`}>
            {stealthMode ? '// ' + activeBook.name.replace(/./g, c => c.charCodeAt(0).toString(16)).slice(0, 12) + '.log' : activeBook.name}
          </span>
          <span className="text-[10px] font-mono text-dev-muted/40">{getBookStorageLabel(activeBook.storage)}</span>
          <span className="text-[10px] font-mono text-dev-muted">{(scrollProgress * 100).toFixed(1)}%</span>
          <span className="text-[10px] font-mono text-dev-muted/50">{formatFileSize(chunkOffset)}-{formatFileSize(chunkEnd)} / {formatFileSize(activeBookTotalSize)}</span>
          <div className="flex items-center gap-1">
            <button onClick={readPrevChunk} disabled={!hasPrevChunk || !!loadingBookId} className="px-2 py-1 rounded border border-dev-border text-[10px] font-mono text-dev-muted hover:text-dev-text disabled:opacity-30 disabled:cursor-default">上一段</button>
            <button onClick={readNextChunk} disabled={!hasNextChunk || !!loadingBookId} className="px-2 py-1 rounded border border-dev-border text-[10px] font-mono text-dev-muted hover:text-dev-text disabled:opacity-30 disabled:cursor-default">{loadingBookId === activeBook.id ? '读取中' : '下一段'}</button>
          </div>
          {lineMode && <div className="flex items-center gap-1 flex-wrap">
              <button onClick={readPrevLine} disabled={(!hasPrevChunk && lineIndex <= 0) || !!loadingBookId} className="px-2 py-1 rounded border border-dev-border text-[10px] font-mono text-dev-muted hover:text-dev-text disabled:opacity-30 disabled:cursor-default">↑1行</button>
              <button onClick={readPrevMultiLine} disabled={(!hasPrevChunk && lineIndex <= 0) || !!loadingBookId} className="px-2 py-1 rounded border border-dev-border text-[10px] font-mono text-dev-muted hover:text-dev-text disabled:opacity-30 disabled:cursor-default">↑{multiLineCount}行</button>
              <button onClick={readNextMultiLine} disabled={(!hasNextChunk && lineIndex >= contentLines.length - 1) || !!loadingBookId} className="px-2 py-1 rounded border border-dev-border text-[10px] font-mono text-dev-muted hover:text-dev-text disabled:opacity-30 disabled:cursor-default">{loadingBookId === activeBook.id ? '...' : `↓${multiLineCount}行`}</button>
              <button onClick={readNextLine} disabled={(!hasNextChunk && lineIndex >= contentLines.length - 1) || !!loadingBookId} className="px-2 py-1 rounded border border-dev-border text-[10px] font-mono text-dev-muted hover:text-dev-text disabled:opacity-30 disabled:cursor-default">↓1行</button>
              <span className="text-[10px] font-mono text-dev-muted/50">{Math.min(lineIndex + 1, contentLines.length)} / {contentLines.length || 1}</span>
              <input type="number" min="1" max={contentLines.length || 1} value={jumpLineValue} onChange={e => setJumpLineValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && jumpToLine(jumpLineValue)} placeholder="跳转" className="w-12 px-1 py-0.5 rounded border border-dev-border bg-dev-input text-[10px] font-mono text-dev-text text-center focus:border-dev-green/50" />
              <button onClick={() => jumpToLine(jumpLineValue)} disabled={!jumpLineValue || !!loadingBookId} className="px-2 py-1 rounded border border-dev-border text-[10px] font-mono text-dev-muted hover:text-dev-text disabled:opacity-30">跳</button>
            </div>}
          {autoScroll && <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-dev-muted">速度</span>
              <input type="range" min="0.3" max="3" step="0.1" value={scrollSpeed} onChange={e => setScrollSpeed(parseFloat(e.target.value))} className="w-16 h-1 accent-dev-green" />
              <span className="text-[10px] font-mono text-dev-muted">{scrollSpeed.toFixed(1)}x</span>
            </div>}
        </div>}

      
      <div className="h-0.5 bg-dev-border rounded-full mb-2">
        <div className="h-full bg-dev-green/60 rounded-full transition-all" style={{
        width: `${scrollProgress * 100}%`
      }} />
      </div>

      
      {showSettings && <div className="bg-dev-panel border border-dev-border rounded-lg p-4 mb-3 space-y-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Type size={14} className="text-dev-muted" />
              <span className="text-xs font-mono text-dev-muted">字号</span>
              <input type="range" min="12" max="28" value={fontSize} onChange={e => setFontSize(parseInt(e.target.value))} className="w-20 h-1 accent-dev-green" />
              <span className="text-xs font-mono text-dev-text w-6">{fontSize}</span>
            </div>
            <div className="flex items-center gap-2">
              <MoveVertical size={14} className="text-dev-muted" />
              <span className="text-xs font-mono text-dev-muted">行高</span>
              <input type="range" min="1.2" max="2.8" step="0.1" value={lineHeight} onChange={e => setLineHeight(parseFloat(e.target.value))} className="w-20 h-1 accent-dev-green" />
              <span className="text-xs font-mono text-dev-text w-8">{lineHeight.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-2">
              <AlignJustify size={14} className="text-dev-muted" />
              <span className="text-xs font-mono text-dev-muted">多行</span>
              <input type="range" min="1" max="10" value={multiLineCount} onChange={e => {
                const val = parseInt(e.target.value);
                setMultiLineCount(val);
                try { localStorage.setItem('moyu_multiLine', String(val)); } catch {}
              }} className="w-20 h-1 accent-dev-green" />
              <span className="text-xs font-mono text-dev-text w-6">{multiLineCount}行</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AlignJustify size={14} className="text-dev-muted" />
            <span className="text-xs font-mono text-dev-muted mr-1">背景</span>
            {[{
          key: 'eye',
          label: '护眼',
          color: '#f5f0e1'
        }, {
          key: 'night',
          label: '夜间',
          color: '#1a1a2e'
        }, {
          key: 'green',
          label: '绿色',
          color: '#cce8cc'
        }, {
          key: 'white',
          label: '白色',
          color: '#fff'
        }].map(bg => <button key={bg.key} onClick={() => setBgMode(bg.key)} className={`w-6 h-6 rounded border-2 transition-all ${bgMode === bg.key ? 'border-dev-green scale-110' : 'border-dev-border'}`} style={{
          backgroundColor: bg.color
        }} title={bg.label} />)}
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-dev-muted" />
              <span className="text-xs font-mono text-dev-muted">伪装</span>
              {[{ key: 'log', label: '日志', icon: FileText }, { key: 'table', label: '表格', icon: Table2 }, { key: 'word', label: '文档', icon: FileText }].map(d => {
                const Icon = d.icon;
                return <button key={d.key} onClick={() => { setDisguiseMode(d.key); try { localStorage.setItem('moyu_disguise', d.key); } catch {} }} className={`px-2 py-1 rounded border text-xs font-mono flex items-center gap-1 ${disguiseMode === d.key ? 'border-dev-green text-dev-green bg-dev-green/10' : 'border-dev-border text-dev-muted hover:text-dev-text'}`}>
                  <Icon size={12} />{d.label}
                </button>;
              })}
            </div>
            <div className="flex items-center gap-2">
              <Ghost size={14} className="text-dev-muted" />
              <span className="text-xs font-mono text-dev-muted">透明</span>
              <input type="range" min="0.1" max="1" step="0.05" value={miniOpacity} onChange={e => {
                const val = parseFloat(e.target.value);
                setMiniOpacity(val);
                try { localStorage.setItem('moyu_mini_opacity', String(val)); } catch {}
              }} className="w-20 h-1 accent-dev-green" />
              <span className="text-xs font-mono text-dev-text w-8">{Math.round(miniOpacity * 100)}%</span>
            </div>
          </div>
        </div>}

      
      {showBookmarks && <div className="bg-dev-panel border border-dev-border rounded-lg p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-dev-muted uppercase tracking-wider">标记列表</span>
            <button onClick={() => setShowBookmarks(false)} className="text-dev-muted hover:text-dev-text"><X size={14} /></button>
          </div>
          {bookmarks.length === 0 ? <p className="text-xs font-mono text-dev-muted/50">暂无标记，点击上方"标记"添加</p> : <div className="space-y-1">
              {bookmarks.map(bm => <div key={bm.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-dev-hover group">
                  <Bookmark size={12} className="text-dev-green/60" />
                  <button onClick={() => jumpToBookmark(bm)} className="text-xs font-mono text-dev-text flex-1 text-left">
                    {(bm.progress * 100).toFixed(1)}% — {bm.time}
                  </button>
                  <button onClick={() => deleteBookmark(bm.id)} className="text-dev-muted/30 hover:text-dev-orange opacity-0 group-hover:opacity-100">
                    <Trash2 size={12} />
                  </button>
                </div>)}
            </div>}
        </div>}

      
      {showChapters && <div className="bg-dev-panel border border-dev-border rounded-lg p-4 mb-3">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <ListTree size={14} className="text-dev-muted" />
              <span className="text-xs font-mono text-dev-muted uppercase tracking-wider">trace index</span>
              <span className="text-[10px] font-mono text-dev-muted/40">{chapters.length || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => activeBook && scanBookChapters(activeBook)} disabled={!activeBook || scanningChapters} className="text-[10px] font-mono text-dev-muted hover:text-dev-text disabled:opacity-40">{scanningChapters ? '扫描中' : '重扫'}</button>
              <button onClick={() => setShowChapters(false)} className="text-dev-muted hover:text-dev-text"><X size={14} /></button>
            </div>
          </div>
          {scanningChapters && <p className="text-xs font-mono text-dev-muted/50 py-3">indexing local trace...</p>}
          {!scanningChapters && chapters.length === 0 && <p className="text-xs font-mono text-dev-muted/50 py-3">未识别到目录，可点击“重扫”，支持第1章 / Chapter 1 / ## 标题。</p>}
          {chapters.length > 0 && <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
              {chapters.map((chapter, index) => {
            const active = index === currentChapterIndex;
            return <button key={chapter.id || chapter.offset} onClick={() => jumpToChapter(chapter)} className={`w-full flex items-center gap-2 rounded px-2 py-1.5 text-left transition-colors ${active ? 'bg-dev-green/10 text-dev-green' : 'hover:bg-dev-hover text-dev-muted'}`}>
                    <span className="w-8 shrink-0 text-[10px] font-mono text-dev-muted/35">{String(index + 1).padStart(3, '0')}</span>
                    <span className="min-w-0 flex-1 truncate text-xs font-mono">{chapter.title}</span>
                    <span className="shrink-0 text-[10px] font-mono text-dev-muted/30">{formatFileSize(chapter.offset)}</span>
                  </button>;
          })}
            </div>}
        </div>}

      
      <div ref={contentRef} onScroll={handleScroll} onDoubleClick={() => setEmergencyHide(s => !s)} className={`flex-1 min-h-0 overflow-y-auto rounded-lg p-6 border transition-all ${miniFloatMode ? 'scale-[0.3] origin-bottom-right fixed bottom-4 right-4 w-[300px] h-[200px] z-50' : ''} ${emergencyHide ? '' : stealthMode ? stealthBg + ' border-[#21262d]' : bgStyles[bgMode] + ' border-dev-border'}`} style={{
      fontSize: miniFloatMode ? 12 : fontSize,
      lineHeight: miniFloatMode ? 1.4 : lineHeight,
      opacity: miniFloatMode ? miniOpacity : 1,
      pointerEvents: miniFloatMode ? 'auto' : 'auto'
    }}>
        {emergencyHide ? (
          // 紧急隐藏界面 - 伪装模板
          disguiseMode === 'log' ? (
            <div className="min-h-full bg-[#0d1117] text-[#8b949e] font-mono text-[13px] p-4">
              <div className="text-[#58a6ff] mb-2">$ npm run build</div>
              <div className="text-[#7ee787]">✓ Compiled successfully!</div>
              <div className="text-[#8b949e] mt-2">asset bundle.js 142.35 KiB [compared for emit]</div>
              <div className="text-[#8b949e]">asset style.css 8.27 KiB [compared for emit]</div>
              <div className="text-[#8b949e]">webpack 5.89.0 compiled successfully in 2847 ms</div>
              <div className="text-[#30363d] mt-4">[HMR] Waiting for update signal from WDS...</div>
            </div>
          ) : disguiseMode === 'table' ? (
            <div className="min-h-full bg-white text-[#333] p-2">
              <table className="w-full border-collapse text-xs">
                <thead><tr className="bg-[#f5f5f5]">
                  <th className="border border-[#ddd] p-2 font-normal">项目</th>
                  <th className="border border-[#ddd] p-2 font-normal">状态</th>
                  <th className="border border-[#ddd] p-2 font-normal">进度</th>
                  <th className="border border-[#ddd] p-2 font-normal">负责人</th>
                </tr></thead>
                <tbody>
                  {['需求分析', '设计阶段', '开发阶段', '测试阶段', '部署上线'].map((item, i) => (
                    <tr key={i}>
                      <td className="border border-[#ddd] p-2">{item}</td>
                      <td className="border border-[#ddd] p-2 text-[#52c41a]">{i < 2 ? '已完成' : i < 4 ? '进行中' : '待开始'}</td>
                      <td className="border border-[#ddd] p-2">{i < 2 ? '100%' : i < 4 ? '60%' : '0%'}</td>
                      <td className="border border-[#ddd] p-2">张{['伟', '明', '华', '强', '军'][i]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="min-h-full bg-white text-[#333] p-6" style={{ fontFamily: 'SimSun, serif' }}>
              <div className="text-center text-lg font-bold mb-4">工作日报</div>
              <div className="text-sm mb-2">日期：{new Date().toLocaleDateString('zh-CN')}</div>
              <div className="text-sm mb-4">姓名：张三</div>
              <div className="text-sm leading-relaxed">
                <p className="mb-2">一、今日工作内容：</p>
                <p className="mb-2 indent-8">1. 完成模块功能开发及单元测试；</p>
                <p className="mb-2 indent-8">2. 参与需求评审会议，讨论下阶段开发计划；</p>
                <p className="mb-2 indent-8">3. 协助解决线上问题，优化系统性能。</p>
                <p className="mb-2">二、明日工作计划：</p>
                <p className="mb-2 indent-8">1. 继续推进核心模块开发；</p>
                <p className="mb-2 indent-8">2. 编写技术文档，整理设计思路。</p>
              </div>
            </div>
          )
        ) : miniFloatMode ? (
          // 迷你悬浮模式
          <div className="min-h-full flex items-center justify-center">
            <div className="text-center">
              {contentLines.slice(lineIndex, lineIndex + 2).map((line, i) => (
                <p key={i} className="text-sm font-mono text-dev-muted/70 mb-1 truncate max-w-[200px]">{line}</p>
              ))}
            </div>
          </div>
        ) : content ? <div className="whitespace-pre-wrap break-words">
            {lineMode ? <div className="min-h-full flex flex-col" onClick={readNextMultiLine}>
                {contentLines.slice(lineIndex, lineIndex + multiLineCount).map((line, i) => (
                  <p key={i} className={`${stealthMode ? 'font-mono text-[13px] leading-7 text-[#484f58]' : ''} ${i === 0 ? '' : 'mt-1'}`}>
                    {stealthMode && <span className="text-[#30363d] mr-2 select-none">{String(lineIndex + i + 1).padStart(4, '0')}</span>}
                    {stealthMode ? '// ' : ''}{line || '...'}
                  </p>
                ))}
              </div> : stealthMode ? content.split('\n').map((line, i) => line.trim() ? <p key={i} className="font-mono text-[13px] leading-6 mb-1">
                    <span className="text-[#30363d] mr-2 select-none">{String(i + 1).padStart(4, '0')}</span>
                    <span className="text-[#484f58]">// {line}</span>
                  </p> : <div key={i} className="h-3" />) : content}
          </div> : <div className="moyu-reader-empty flex min-h-full flex-col items-center justify-center gap-5 rounded-lg border border-dashed border-dev-border bg-dev-panel/35 px-4 py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dev-green/30 bg-dev-green/10">
              <BookOpen size={30} className="text-dev-green" />
            </div>
            <div>
              <p className="text-base font-heading font-semibold text-dev-text">本地阅读源未加载</p>
              <p className="mt-1 text-xs font-mono text-dev-muted/60">会自动记住文件、章节和行号；优先保存到浏览器本地副本。</p>
            </div>
            {books.length > 0 && <div className="w-full max-w-lg space-y-2">
                <p className="text-left text-[10px] font-mono uppercase tracking-wider text-dev-muted/60">最近本地源</p>
                {books.slice().sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0)).slice(0, 3).map(book => {
              const isLoading = loadingBookId === book.id;
              return <button key={book.id} onClick={() => selectBook(book)} disabled={!!loadingBookId} className="moyu-reader-recent w-full flex items-center gap-3 rounded-lg border border-dev-border/70 bg-dev-panel px-3 py-2.5 text-left hover:bg-dev-hover disabled:opacity-50">
                    <BookOpen size={16} className="text-dev-green/70" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-mono text-dev-text">{isLoading ? '读取中...' : book.name}</span>
                      <span className="block text-[10px] font-mono text-dev-muted/55">{getBookStorageLabel(book.storage)} · {formatFileSize(book.size)}</span>
                    </span>
                    <span className="text-[10px] font-mono text-dev-muted/45">继续</span>
                  </button>;
            })}
              </div>}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {canPickLocalFile && <ActionButton onClick={openLocalBookFile} variant="primary">
                  <Upload size={14} className="mr-1" />打开文件
                </ActionButton>}
              <label className="px-4 py-2 rounded-lg bg-dev-panel text-dev-text border border-dev-border cursor-pointer hover:bg-dev-hover text-sm font-heading">
                <Upload size={14} className="mr-1 inline" />选择文件
                <input type="file" accept=".txt,.md,.log" onChange={handleUpload} className="hidden" />
              </label>
            </div>
          </div>}
      </div>

      
      {showLibrary && <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowLibrary(false)}>
          <div className="moyu-library-dialog bg-dev-panel border border-dev-border rounded-xl p-6 w-full max-w-lg max-h-[82vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-heading font-semibold text-dev-text">本地源</h3>
                <p className="mt-1 text-xs font-mono text-dev-muted/60">选择一次后会保存本地副本，下次进入自动恢复。</p>
              </div>
              <button onClick={() => setShowLibrary(false)} className="text-dev-muted hover:text-dev-text"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {canPickLocalFile && <button onClick={openLocalBookFile} className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-dev-green/40 text-dev-green cursor-pointer hover:bg-dev-green/5 text-sm">
                  <Upload size={16} />打开文件
                </button>}
              <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-dev-border text-dev-text cursor-pointer hover:bg-dev-hover text-sm">
                <Upload size={16} />选择文件
                <input type="file" accept=".txt,.md,.log" onChange={handleUpload} className="hidden" />
              </label>
            </div>
            {books.length === 0 ? <p className="text-xs font-mono text-dev-muted/50 text-center py-8">暂无本地源，请选择文件</p> : <div className="space-y-2">
                {books.map(book => {
              const isLoading = loadingBookId === book.id;
              const storageLabel = getBookStorageLabel(book.storage);
              return <div key={book.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-dev-hover group">
                    <BookOpen size={16} className="text-dev-green/60" />
                    <button onClick={() => selectBook(book)} className="flex-1 min-w-0 text-left">
                      <span className="block text-sm text-dev-text truncate">{isLoading ? '读取中...' : book.name}</span>
                      <span className="block text-[10px] font-mono text-dev-muted/50 mt-0.5">{storageLabel} · {formatFileSize(book.size)} · {book.chars ? Math.max(1, Math.round(book.chars / 1000)) + 'k字' : '按块读取'}</span>
                    </button>
                    <button onClick={() => deleteBook(book.id)} className="text-dev-muted/30 hover:text-dev-orange opacity-0 group-hover:opacity-100">
                      <Trash2 size={14} />
                    </button>
                  </div>;
            })}
              </div>}
          </div>
        </div>}

      
      <MiniFloatReader content={content} visible={miniFloat} onClose={() => setMiniFloat(false)} onExpand={() => setMiniFloat(false)} />
    </div>;
}


function StockBoard() {
  const {
    toast
  } = useToast();
  const [stocks, setStocks] = useState(() => {
    try {
      return normalizeStoredStocks(JSON.parse(localStorage.getItem('moyu_stocks') || '[]'));
    } catch {
      return [];
    }
  });
  const [addInput, setAddInput] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [pureNum, setPureNum] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('');
  const [collapsed, setCollapsed] = useState(true);
  const [quotes, setQuotes] = useState({});
  const [quoteError, setQuoteError] = useState('');
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const refreshQuotes = useCallback(async () => {
    const codes = Array.from(new Set(stocks.map(s => normalizeStockCode(s.code)).filter(Boolean)));
    if (!codes.length) {
      setQuotes({});
      return;
    }
    setLoadingQuotes(true);
    setQuoteError('');
    try {
      const res = await fetch(buildStockProxyUrl(codes), {
        cache: 'no-store',
        headers: {
          Accept: 'application/json'
        }
      });
      if (!res.ok) throw new Error('代理返回 ' + res.status);
      const data = await res.json();
      const nextQuotes = {};
      (Array.isArray(data?.quotes) ? data.quotes : []).forEach(item => {
        const code = normalizeStockCode(item.code || item.symbol);
        const price = Number(item.price);
        const prevClose = Number(item.prevClose ?? item.previousClose ?? item.yesterdayClose);
        const rawChange = Number(item.change);
        const change = Number.isFinite(rawChange) ? rawChange : Number.isFinite(prevClose) ? price - prevClose : 0;
        const rawPct = Number(item.pct ?? item.percent);
        const pct = Number.isFinite(rawPct) ? rawPct : Number.isFinite(prevClose) && prevClose !== 0 ? change / prevClose * 100 : 0;
        if (!code || !Number.isFinite(price)) return;
        nextQuotes[code] = {
          name: item.name || code,
          price,
          prevClose: Number.isFinite(prevClose) ? prevClose : null,
          change,
          pct,
          kline: buildMiniQuoteKline(code, price, pct)
        };
      });
      if (!Object.keys(nextQuotes).length) {
        throw new Error(data?.message || '没有返回可用行情');
      }
      setQuotes(nextQuotes);
      setLastUpdate(new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    } catch (e) {
      const msg = e?.message || '行情刷新失败';
      setQuoteError(msg);
      toast({
        title: '行情刷新失败',
        description: msg,
        variant: 'destructive'
      });
    } finally {
      setLoadingQuotes(false);
    }
  }, [stocks, toast]);
  useEffect(() => {
    try {
      localStorage.setItem('moyu_stocks', JSON.stringify(stocks));
      window.dispatchEvent(new CustomEvent('moyu:stocks-updated'));
    } catch {}
  }, [stocks]);
  useEffect(() => {
    if (stocks.length) {
      refreshQuotes();
    } else {
      setQuotes({});
      setQuoteError('');
    }
  }, [stocks, refreshQuotes]);
  useEffect(() => {
    if (!stocks.length) return;
    const id = setInterval(refreshQuotes, 15000);
    return () => clearInterval(id);
  }, [stocks, refreshQuotes]);
  useEffect(() => {
    const hideAll = () => {
      setShowAdd(false);
      setCollapsed(true);
    };
    window.addEventListener('moyu:hide-all', hideAll);
    return () => window.removeEventListener('moyu:hide-all', hideAll);
  }, []);
  const addStock = useCallback(() => {
    const raw = addInput.trim();
    if (!raw) return;
    const parts = raw.split(/\s+/);
    const code = normalizeStockCode(parts[0]);
    if (!code) {
      toast({
        title: '代码格式不支持',
        description: '请输入 60/00/30 开头的 6 位代码，或 sh/sz 前缀代码',
        variant: 'destructive'
      });
      return;
    }
    const name = parts.slice(1).join(' ') || code;
    if (stocks.find(s => normalizeStockCode(s.code) === code)) {
      toast({
        title: '已存在',
        description: code,
        variant: 'destructive'
      });
      return;
    }
    setStocks(prev => [...prev, {
      code,
      name
    }]);
    setAddInput('');
    setShowAdd(false);
    toast({
      title: '已添加',
      description: name
    });
  }, [addInput, stocks, toast]);
  const removeStock = useCallback(code => {
    setStocks(prev => prev.filter(s => s.code !== code));
    setQuotes(prev => {
      const n = {
        ...prev
      };
      delete n[code];
      return n;
    });
  }, []);
  const renderMiniKline = kline => {
    if (!kline || !kline.length) return null;
    const allVals = kline.flatMap(k => [k.h, k.l]);
    const mn = Math.min(...allVals);
    const mx = Math.max(...allVals);
    const range = mx - mn || 1;
    const w = 4;
    return <svg width={kline.length * w} height="28" className="opacity-50">
        {kline.map((k, i) => {
        const x = i * w;
        const yH = 28 - (k.h - mn) / range * 24;
        const yL = 28 - (k.l - mn) / range * 24;
        const yO = 28 - (k.o - mn) / range * 24;
        const yC = 28 - (k.c - mn) / range * 24;
        const isUp = k.c >= k.o;
        const color = isUp ? '#6b8a6b' : '#7a8fa0';
        return <g key={i}>
              <line x1={x + w / 2} y1={yH} x2={x + w / 2} y2={yL} stroke={color} strokeWidth="0.5" />
              <rect x={x + 0.5} y={Math.min(yO, yC)} width={w - 1} height={Math.max(1, Math.abs(yO - yC))} fill={color} />
            </g>;
      })}
      </svg>;
  };
  if (collapsed) {
    return <div className="flex items-center gap-2">
        <button onClick={() => setCollapsed(false)} className="text-xs font-mono text-dev-muted hover:text-dev-green transition-colors">
          <ChevronDown size={14} className="inline mr-1" />展开面板
        </button>
      </div>;
  }
  return <div className="space-y-3">
      
      <div className="flex items-center gap-2 flex-wrap">
        <ActionButton onClick={() => setShowAdd(s => !s)} variant="secondary">
          <Plus size={14} className="mr-1" />添加
        </ActionButton>
        <ActionButton onClick={() => !loadingQuotes && refreshQuotes()} variant="secondary">{loadingQuotes ? '刷新中' : '刷新'}</ActionButton>
        <ActionButton onClick={() => setPureNum(s => !s)} variant={pureNum ? 'primary' : 'secondary'}>
          纯数字
        </ActionButton>
        <ActionButton onClick={() => setCollapsed(true)} variant="secondary">
          <ChevronUp size={14} className="mr-1" />收起
        </ActionButton>
        {lastUpdate && <span className="text-[10px] font-mono text-dev-muted ml-auto">{lastUpdate}</span>}
      </div>

      
      {showAdd && <div className="bg-dev-panel border border-dev-border rounded-lg p-3 flex items-center gap-2">
          <input value={addInput} onChange={e => setAddInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addStock()} placeholder="代码 名称（如 sh600519 贵州茅台）" className="flex-1 px-3 py-2 rounded-lg bg-dev-input border border-dev-border text-sm font-mono text-dev-text placeholder:text-dev-muted/50 focus:outline-none focus:border-dev-green/50" />
          <ActionButton onClick={addStock} variant="primary">确定</ActionButton>
        </div>}

      {quoteError && stocks.length > 0 && <div className="px-3 py-2 rounded-lg bg-dev-orange/5 border border-dev-orange/20 text-[11px] font-mono text-dev-orange/80">
          代理状态异常：{quoteError}
        </div>}

      
      {stocks.length === 0 ? <div className="text-center py-12">
          <p className="text-sm font-mono text-dev-muted/40">暂无监控项，点击"添加"开始</p>
        </div> : <div className="space-y-1.5">
          {stocks.map(stock => {
        const q = quotes[stock.code] || quotes[normalizeStockCode(stock.code)];
        const isUp = q && q.pct >= 0;
        const pctColor = isUp ? 'text-[#7a9a7a]' : 'text-[#7a8fa0]';
        const stockName = pureNum ? stock.code : q?.name || stock.name;
        return <div key={stock.code} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-dev-panel/50 border border-dev-border/50 group hover:bg-dev-hover">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-heading text-dev-text truncate">{stockName}</span>
                    <span className="text-[10px] font-mono text-dev-muted">{stock.code}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-sm font-mono text-dev-text">{q ? q.price.toFixed(2) : '--'}</span>
                    <span className={`text-xs font-mono ${pctColor}`}>
                      {q ? (isUp ? '+' : '') + q.pct.toFixed(2) + '%' : '--'}
                    </span>
                    <span className={`text-[10px] font-mono ${pctColor}`}>
                      {q ? (isUp ? '+' : '') + q.change.toFixed(2) : ''}
                    </span>
                  </div>
                </div>
                {!pureNum && q && q.kline && <div className="opacity-60">{renderMiniKline(q.kline)}</div>}
                <button onClick={() => removeStock(stock.code)} className="text-dev-muted/20 hover:text-dev-orange opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={14} />
                </button>
              </div>;
      })}
        </div>}

      
      {pureNum && stocks.length > 0 && <div className="bg-dev-panel border border-dev-border rounded-lg p-3">
          <p className="text-[10px] font-mono text-dev-muted/30 mb-1">// data stream</p>
          {stocks.map(stock => {
        const q = quotes[stock.code];
        if (!q) return null;
        return <p key={stock.code} className="text-xs font-mono text-dev-muted leading-5">
                {stock.code} {q.price.toFixed(2)} {q.pct >= 0 ? '+' : ''}{q.pct.toFixed(2)}%
              </p>;
      })}
        </div>}
    </div>;
}


function MiniGames() {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState('idle'); // idle | playing | over
  const snakeRef = useRef([{
    x: 8,
    y: 8
  }]);
  const dirRef = useRef({
    x: 1,
    y: 0
  });
  const foodRef = useRef({
    x: 12,
    y: 8
  });
  const timerRef = useRef(null);
  const CELL = 16;
  const COLS = 20;
  const ROWS = 15;
  const placeFood = useCallback(() => {
    let pos;
    do {
      pos = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS)
      };
    } while (snakeRef.current.some(s => s.x === pos.x && s.y === pos.y));
    foodRef.current = pos;
  }, []);
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  
    ctx.strokeStyle = '#161b22';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, ROWS * CELL);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(COLS * CELL, y * CELL);
      ctx.stroke();
    }
  
    snakeRef.current.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? '#238636' : '#2ea043';
      ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
    });
  
    ctx.fillStyle = '#8b949e';
    ctx.fillRect(foodRef.current.x * CELL + 2, foodRef.current.y * CELL + 2, CELL - 4, CELL - 4);
  }, []);
  const step = useCallback(() => {
    const snake = snakeRef.current;
    const head = {
      x: snake[0].x + dirRef.current.x,
      y: snake[0].y + dirRef.current.y
    };
  
    if (head.x < 0) head.x = COLS - 1;
    if (head.x >= COLS) head.x = 0;
    if (head.y < 0) head.y = ROWS - 1;
    if (head.y >= ROWS) head.y = 0;
  
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
      setGameState('over');
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    snake.unshift(head);
    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      setScore(s => s + 10);
      placeFood();
    } else {
      snake.pop();
    }
    draw();
  }, [draw, placeFood]);
  const startGame = useCallback(() => {
    snakeRef.current = [{
      x: 8,
      y: 8
    }];
    dirRef.current = {
      x: 1,
      y: 0
    };
    placeFood();
    setScore(0);
    setGameState('playing');
    draw();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(step, 150);
  }, [step, draw, placeFood]);
  useEffect(() => {
    const handleKey = e => {
      if (gameState !== 'playing') return;
      const map = {
        ArrowUp: {
          x: 0,
          y: -1
        },
        ArrowDown: {
          x: 0,
          y: 1
        },
        ArrowLeft: {
          x: -1,
          y: 0
        },
        ArrowRight: {
          x: 1,
          y: 0
        },
        w: {
          x: 0,
          y: -1
        },
        s: {
          x: 0,
          y: 1
        },
        a: {
          x: -1,
          y: 0
        },
        d: {
          x: 1,
          y: 0
        }
      };
      const d = map[e.key];
      if (d && !(d.x === -dirRef.current.x && d.y === -dirRef.current.y)) {
        dirRef.current = d;
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState]);
  useEffect(() => {
    draw();
  }, [draw]);
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);
  useEffect(() => {
    const hideAll = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setGameState('idle');
    };
    window.addEventListener('moyu:hide-all', hideAll);
    return () => window.removeEventListener('moyu:hide-all', hideAll);
  }, []);
  return <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-dev-muted">Score: <span className="text-dev-green">{score}</span></span>
        {gameState === 'over' && <span className="text-xs font-mono text-dev-orange">Game Over</span>}
      </div>
      <canvas ref={canvasRef} width={COLS * CELL} height={ROWS * CELL} className="rounded-lg border border-dev-border/50 bg-[#0d1117] block" />
      <div className="flex items-center gap-2">
        {gameState !== 'playing' && <ActionButton onClick={startGame} variant="primary">
            {gameState === 'over' ? '重来' : '开始'}
          </ActionButton>}
        <span className="text-[10px] font-mono text-dev-muted/50">方向键/WASD 输入测试</span>
      </div>
      
      <div className="grid grid-cols-3 gap-1 w-28 sm:hidden">
        <div />
        <button onTouchStart={() => {
        if (dirRef.current.y !== 1) dirRef.current = {
          x: 0,
          y: -1
        };
      }} className="p-2 bg-dev-panel border border-dev-border rounded text-dev-muted text-center">↑</button>
        <div />
        <button onTouchStart={() => {
        if (dirRef.current.x !== 1) dirRef.current = {
          x: -1,
          y: 0
        };
      }} className="p-2 bg-dev-panel border border-dev-border rounded text-dev-muted text-center">←</button>
        <button onTouchStart={() => {
        if (dirRef.current.y !== -1) dirRef.current = {
          x: 0,
          y: 1
        };
      }} className="p-2 bg-dev-panel border border-dev-border rounded text-dev-muted text-center">↓</button>
        <button onTouchStart={() => {
        if (dirRef.current.x !== -1) dirRef.current = {
          x: 1,
          y: 0
        };
      }} className="p-2 bg-dev-panel border border-dev-border rounded text-dev-muted text-center">→</button>
      </div>
    </div>;
}


function WeatherCalendar() {
  const today = new Date();
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const weatherData = Array.from({
    length: 4
  }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const types = ['晴', '多云', '阴', '小雨'];
    return {
      date: d,
      day: d.getDate(),
      weekday: weekDays[d.getDay()],
      type: types[Math.floor(Math.random() * types.length)],
      temp: 22 + Math.floor(Math.random() * 10)
    };
  });

  const yi = ['写代码', '提交PR', '修Bug', '上线', '重构'];
  const ji = ['删库', '改配置', '发版', '碰旧代码', '改需求'];
  return <div className="space-y-4">
      
      <div className="grid grid-cols-4 gap-2">
        {weatherData.map((w, i) => <div key={i} className={`rounded-lg border border-dev-border/50 p-3 text-center ${i === 0 ? 'bg-dev-green/5 border-dev-green/20' : 'bg-dev-panel/50'}`}>
            <p className="text-[10px] font-mono text-dev-muted">{i === 0 ? '今天' : '周' + w.weekday}</p>
            <p className="text-xs font-mono text-dev-text mt-1">{w.type}</p>
            <p className="text-sm font-heading text-dev-text mt-0.5">{w.temp}°</p>
          </div>)}
      </div>
      
      <div className="bg-dev-panel border border-dev-border/50 rounded-lg p-4">
        <p className="text-xs font-mono text-dev-muted mb-2">{today.getFullYear()}/{today.getMonth() + 1}/{today.getDate()} 周{weekDays[today.getDay()]}</p>
        <div className="grid grid-cols-7 gap-1 text-center">
          {weekDays.map(d => <span key={d} className="text-[10px] font-mono text-dev-muted/50 py-1">{d}</span>)}
          {(() => {
          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
          const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
          const cells = [];
          for (let i = 0; i < firstDay; i++) cells.push(<span key={'e' + i} />);
          for (let d = 1; d <= daysInMonth; d++) {
            const isToday = d === today.getDate();
            cells.push(<span key={d} className={`text-xs font-mono py-0.5 ${isToday ? 'bg-dev-green/20 text-dev-green rounded' : 'text-dev-muted'}`}>
                  {d}
                </span>);
          }
          return cells;
        })()}
        </div>
      </div>
      
      <div className="bg-dev-panel border border-dev-border/50 rounded-lg p-4">
        <p className="text-xs font-mono text-dev-muted mb-2">// 今日黄历</p>
        <div className="flex gap-6">
          <div>
            <span className="text-[10px] font-mono text-dev-green/60">宜</span>
            <div className="mt-1 space-y-0.5">
              {yi.map(y => <p key={y} className="text-xs font-mono text-dev-green/40">{y}</p>)}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-mono text-dev-orange/60">忌</span>
            <div className="mt-1 space-y-0.5">
              {ji.map(j => <p key={j} className="text-xs font-mono text-dev-orange/40">{j}</p>)}
            </div>
          </div>
        </div>
      </div>
    </div>;
}


function MemoPad() {
  const [memos, setMemos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('moyu_memos') || '[]');
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  useEffect(() => {
    try {
      localStorage.setItem('moyu_memos', JSON.stringify(memos));
    } catch {}
  }, [memos]);
  const addMemo = useCallback(() => {
    if (!input.trim()) return;
    setMemos(prev => [{
      id: 'm_' + Date.now(),
      text: input.trim(),
      time: new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }, ...prev]);
    setInput('');
  }, [input]);
  const deleteMemo = useCallback(id => {
    setMemos(prev => prev.filter(m => m.id !== id));
  }, []);
  return <div className="space-y-3">
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addMemo()} placeholder="记点什么..." className="flex-1 px-3 py-2 rounded-lg bg-dev-input border border-dev-border text-sm font-mono text-dev-text placeholder:text-dev-muted/50 focus:outline-none focus:border-dev-green/50" />
        <ActionButton onClick={addMemo} variant="primary"><Plus size={14} /></ActionButton>
      </div>
      {memos.length === 0 ? <p className="text-xs font-mono text-dev-muted/40 text-center py-6">暂无备忘</p> : <div className="space-y-1.5">
          {memos.map(m => <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dev-panel/50 border border-dev-border/50 group">
              <span className="text-[10px] font-mono text-dev-muted/30 mr-1">//</span>
              <span className="text-sm font-mono text-dev-muted flex-1">{m.text}</span>
              <span className="text-[10px] font-mono text-dev-muted/30">{m.time}</span>
              <button onClick={() => deleteMemo(m.id)} className="text-dev-muted/20 hover:text-dev-orange opacity-0 group-hover:opacity-100">
                <Trash2 size={12} />
              </button>
            </div>)}
        </div>}
    </div>;
}


function VideoFeed() {
  const feeds = [{
    id: 1,
    title: '10个让人相见恨晚的Git技巧',
    author: '@dev_tips',
    likes: '3.2w',
    tag: '技术'
  }, {
    id: 2,
    title: '为什么你的代码总是出Bug？',
    author: '@code_master',
    likes: '2.8w',
    tag: '思考'
  }, {
    id: 3,
    title: '前端性能优化实战指南',
    author: '@fe_guru',
    likes: '1.5w',
    tag: '教程'
  }, {
    id: 4,
    title: 'VS Code 插件推荐2026',
    author: '@tools_fan',
    likes: '4.1w',
    tag: '工具'
  }, {
    id: 5,
    title: '程序员如何避免颈椎病',
    author: '@healthy_dev',
    likes: '5.6w',
    tag: '健康'
  }, {
    id: 6,
    title: 'TypeScript 5.8 新特性速览',
    author: '@ts_news',
    likes: '2.1w',
    tag: '技术'
  }, {
    id: 7,
    title: '远程办公效率翻倍的秘诀',
    author: '@remote_pro',
    likes: '3.7w',
    tag: '职场'
  }, {
    id: 8,
    title: 'Docker Compose 最佳实践',
    author: '@ops_daily',
    likes: '1.9w',
    tag: '运维'
  }];
  const [page, setPage] = useState(0);
  const item = feeds[page % feeds.length];
  const tagColors = {
    '技术': 'text-dev-green/60',
    '思考': 'text-dev-orange/60',
    '教程': 'text-dev-green/60',
    '工具': 'text-dev-orange/60',
    '健康': 'text-dev-green/60',
    '职场': 'text-dev-orange/60',
    '运维': 'text-dev-green/60'
  };
  return <div className="space-y-3">
      <div className="bg-dev-panel border border-dev-border/50 rounded-lg p-5 min-h-[160px] flex flex-col justify-between">
        <div>
          <span className={`text-[10px] font-mono ${tagColors[item.tag] || 'text-dev-muted'}`}>#{item.tag}</span>
          <h4 className="text-base font-heading text-dev-text mt-2 leading-relaxed">{item.title}</h4>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs font-mono text-dev-muted">{item.author}</span>
            <span className="text-[10px] font-mono text-dev-muted/40">♥ {item.likes}</span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <span className="text-[10px] font-mono text-dev-muted/30">{page + 1} / {feeds.length}</span>
          <div className="flex gap-2">
            <ActionButton onClick={() => setPage(p => Math.max(0, p - 1))} variant="secondary">上一个</ActionButton>
            <ActionButton onClick={() => setPage(p => (p + 1) % feeds.length)} variant="primary">下一个</ActionButton>
          </div>
        </div>
      </div>
    </div>;
}


const TABS = [{
  key: 'reader',
  label: 'Trace',
  icon: BookOpen
}, {
  key: 'stock',
  label: 'Metric',
  icon: ChevronUp
}, {
  key: 'mini',
  label: 'Canvas',
  icon: Play
}, {
  key: 'video',
  label: 'Stream',
  icon: AlignJustify
}];
const MINI_TABS = [{
  key: 'game',
  label: '渲染'
}, {
  key: 'weather',
  label: '日历'
}, {
  key: 'memo',
  label: '备忘'
}];
export default function Moyutool(props) {
  const navigateTo = props.$w.utils.navigateTo;
  const navigateBack = props.$w.utils.navigateBack;
  const setMiniReader = props.$w.utils.setMiniReader;
  const initialTab = props.$w.page.dataset.params?.tab || 'reader';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [miniTab, setMiniTab] = useState('game');
  const renderContent = () => {
    switch (activeTab) {
      case 'reader':
        return <NovelReader navigateTo={navigateTo} setMiniReader={setMiniReader} />;
      case 'stock':
        return <StockBoard />;
      case 'mini':
        return <div className="space-y-4">
            <div className="app-tab-row !mb-4">
              {MINI_TABS.map(t => <button key={t.key} onClick={() => setMiniTab(t.key)} className={'app-tab !px-3 !py-1.5 !text-xs ' + (miniTab === t.key ? 'app-tab-active' : '')}>
                  {t.label}
                </button>)}
            </div>
            {miniTab === 'game' && <MiniGames />}
            {miniTab === 'weather' && <WeatherCalendar />}
            {miniTab === 'memo' && <MemoPad />}
          </div>;
      case 'video':
        return <VideoFeed />;
      default:
        return <NovelReader navigateTo={navigateTo} setMiniReader={setMiniReader} />;
    }
  };
  return <div className="min-h-screen bg-dev-bg">
      <NavHeader />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <ToolHeader title="实验面板" description="本地 Trace、Metric Probe、Canvas 检查、Text Stream" onBack={navigateBack} />

        
        <div className="app-tab-row">
          {TABS.map(tab => {
          const Icon = tab.icon;
          return <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={'app-tab ' + (activeTab === tab.key ? 'app-tab-active' : '')}>
                <Icon size={14} />{tab.label}
              </button>;
        })}
        </div>

        
        <div className="min-h-[500px]">
          {renderContent()}
        </div>

        
        <div className="mt-12 pt-4 border-t border-dev-border/30">
          <p className="text-[10px] font-mono text-dev-muted/15 leading-relaxed">
            本页模块均在浏览器本地运行；指标数据来自后端代理，仅用于信息展示，不构成任何建议。
          </p>
        </div>
      </main>
    </div>;
}
