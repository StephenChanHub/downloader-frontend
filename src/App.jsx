import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { adminLogin, adminListFiles, adminUploadFile, adminDeleteFile } from './api/admin';
import { verifyAccessKey } from './api/auth';
import { fetchFileList, downloadFile } from './api/files';
import { formatFileSize, formatRemainingTime } from './utils/format';

// ---- constants ------------------------------------------------------------

const SESSION_DURATION_MS = 30 * 60 * 1000; // user cookie session
const ADMIN_SESSION_MS = 24 * 60 * 60 * 1000; // admin JWT
const USER_SESSION_STORAGE_KEY = 'secure-doc-access-session';
const ADMIN_SESSION_STORAGE_KEY = 'secure-doc-admin-session';

// ---- local-storage session helpers ----------------------------------------

function persistUserSession(expiresAtISO) {
  const expiresAt = Date.parse(expiresAtISO) || Date.now() + SESSION_DURATION_MS;
  localStorage.setItem(USER_SESSION_STORAGE_KEY, JSON.stringify({ expiresAt }));
  return expiresAt;
}

function readUserSession() {
  try {
    const raw = localStorage.getItem(USER_SESSION_STORAGE_KEY);
    if (!raw) return 0;
    const { expiresAt } = JSON.parse(raw);
    if (!expiresAt || expiresAt <= Date.now()) {
      localStorage.removeItem(USER_SESSION_STORAGE_KEY);
      return 0;
    }
    return expiresAt;
  } catch {
    localStorage.removeItem(USER_SESSION_STORAGE_KEY);
    return 0;
  }
}

function persistAdminSession() {
  const expiresAt = Date.now() + ADMIN_SESSION_MS;
  localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify({ expiresAt }));
  return expiresAt;
}

function readAdminSession() {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    if (!raw) return 0;
    const { expiresAt } = JSON.parse(raw);
    if (!expiresAt || expiresAt <= Date.now()) {
      localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
      return 0;
    }
    return expiresAt;
  } catch {
    localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    return 0;
  }
}

function clearUserSession() {
  localStorage.removeItem(USER_SESSION_STORAGE_KEY);
}

function clearAdminSession() {
  localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  localStorage.removeItem('admin_token');
}

function isNonEmptyKey(key) {
  return key.trim().length > 0;
}

function createRandomSyncMinutes() {
  return Math.floor(Math.random() * (24 * 60 - 1)) + 1;
}

function formatSyncTime(minutesAgo, lang) {
  if (minutesAgo < 60) {
    return lang === 'zh'
      ? `${minutesAgo} 分钟前`
      : `${minutesAgo} min ago`;
  }
  const hoursAgo = Math.floor(minutesAgo / 60);
  return lang === 'zh' ? `${hoursAgo} 小时前` : `${hoursAgo} h ago`;
}

// ---- i18n -----------------------------------------------------------------

const copy = {
  en: {
    languageLabel: 'Language',
    languageEnglish: 'EN',
    languageChinese: '中文',
    secureDoc: 'SecureDoc',
    privateResourceAccess: 'Private Resource Access',
    adminResourceAccess: 'Administrator Resource Access',
    adminVerification: 'Administrator Verification',
    adminVerificationDescription: 'Enter the administrator key to open file management.',
    verifyAdmin: 'Verify Admin Key',
    cancel: 'Cancel',
    enterAccessKey: 'ENTER YOUR ACCESS KEY',
    enterAdminKey: 'ENTER ADMIN KEY',
    accessKeyAria: 'Access key',
    adminKeyAria: 'Admin key',
    accessKeyPlaceholder: 'Enter access key',
    adminKeyPlaceholder: 'Enter administrator key',
    accessFiles: 'Access Files',
    unlockAdmin: 'Access Admin',
    emptyKeyError: 'Please enter a valid key.',
    adminEntrance: 'Admin entrance',
    availableResourcesLine1: 'Available',
    availableResourcesLine2: 'Resources',
    resourcesDescription: 'Access verified. One key unlocks all encrypted files for 30 minutes.',
    filterByName: 'Filter by name...',
    filterByNameAria: 'Filter by name',
    downloadAll: 'DOWNLOAD ALL',
    download: 'DOWNLOAD',
    totalFiles: 'Total Files',
    totalSize: 'Total Size',
    lastSync: 'Last Sync',
    syncMinutesAgo: 'min ago',
    syncHoursAgo: 'h ago',
    downloadsBadge: 'downloads',
    backToLogin: 'Lock & return to login',
    resourcesGridAria: 'Available resources',
    accessSessionActive: 'Access Session Active',
    keyValidFor: 'Key valid for',
    sessionNote: 'No need to enter the key again while the 30-minute session is active.',
    sessionExpired: 'Your access key has expired. Please verify again.',
    readyToDownload: 'Encrypted file unlocked for this session.',
    adminConsole: 'Admin Console',
    securityLevel: 'Security Level 4',
    adminNavigation: 'Admin navigation',
    vault: 'Vault',
    uploadNewPdf: 'Upload New PDF',
    signOut: 'Sign Out',
    uploadResource: 'Upload Resource',
    uploadDescription: 'Uploaded documents are protected by the site-level access key session.',
    documentTitle: 'DOCUMENT TITLE',
    documentTitlePlaceholder: 'e.g., Annual Report',
    filePayload: 'FILE PAYLOAD',
    dropZoneText: 'Click to browse or drag',
    dropZonePdf: 'PDF here',
    maxSize: 'Max size: 100MB',
    processUpload: 'Process Upload',
    resourceManagement: 'Resource Management',
    managementDescription: 'Encrypted files currently distributed.',
    searchResources: 'Search resources...',
    searchResourcesAria: 'Search resources',
    managementTableAria: 'Resource management table',
    tableTitle: 'TITLE',
    tableDownloads: 'DOWNLOADS',
    tableActions: 'ACTIONS',
    deleteFile: 'Delete',
    deleteConfirm: 'Are you sure you want to delete "{title}"? This action cannot be undone.',
    uploadSuccess: 'File uploaded successfully.',
    uploadError: 'Upload failed.',
    deleteSuccess: 'File deleted.',
    deleteError: 'Delete failed.',
    loadError: 'Failed to load files.',
    loginError: 'Login failed.',
    networkError: 'Network error. Please check your connection.',
    noFiles: 'No files available.',
    noFilesAdmin: 'No files in the vault yet. Upload your first PDF above.',
    downloading: 'Downloading...',
    uploading: 'Uploading...',
  },
  zh: {
    languageLabel: '语言',
    languageEnglish: 'EN',
    languageChinese: '中文',
    secureDoc: 'SecureDoc',
    privateResourceAccess: '私有资源访问',
    adminResourceAccess: '管理员资源访问',
    adminVerification: '管理员验证',
    adminVerificationDescription: '请输入管理员密钥，验证成功后进入文件管理页面。',
    verifyAdmin: '验证管理员密钥',
    cancel: '取消',
    enterAccessKey: '输入访问密钥',
    enterAdminKey: '输入管理员密钥',
    accessKeyAria: '访问密钥',
    adminKeyAria: '管理员密钥',
    accessKeyPlaceholder: '请输入访问密钥',
    adminKeyPlaceholder: '请输入管理员密钥',
    accessFiles: '访问文件',
    unlockAdmin: '进入管理后台',
    emptyKeyError: '请输入有效密钥。',
    adminEntrance: '管理员入口',
    availableResourcesLine1: '可用',
    availableResourcesLine2: '资源',
    resourcesDescription: '访问已验证，一个密钥可在 30 分钟内解锁所有加密文件。',
    filterByName: '按名称筛选...',
    filterByNameAria: '按名称筛选',
    downloadAll: '全部下载',
    download: '下载',
    totalFiles: '文件总数',
    totalSize: '文件总大小',
    lastSync: '最近同步',
    syncMinutesAgo: '分钟前',
    syncHoursAgo: '小时前',
    downloadsBadge: '次下载',
    backToLogin: '锁定并返回登录',
    resourcesGridAria: '可用资源',
    accessSessionActive: '访问会话已激活',
    keyValidFor: '密钥剩余有效期',
    sessionNote: '30 分钟会话有效期内，无需再次输入密钥。',
    sessionExpired: '访问密钥已过期，请重新验证。',
    readyToDownload: '当前会话已解锁该加密文件。',
    adminConsole: '管理控制台',
    securityLevel: '安全等级 4',
    adminNavigation: '管理员导航',
    vault: '保险库',
    uploadNewPdf: '上传新 PDF',
    signOut: '退出登录',
    uploadResource: '上传资源',
    uploadDescription: '上传文档将由网站级访问密钥会话统一保护。',
    documentTitle: '文档标题',
    documentTitlePlaceholder: '例如：年度报告',
    filePayload: '文件载荷',
    dropZoneText: '点击浏览或拖拽',
    dropZonePdf: 'PDF 到此处',
    maxSize: '最大：100MB',
    processUpload: '处理上传',
    resourceManagement: '资源管理',
    managementDescription: '当前正在分发的加密文件。',
    searchResources: '搜索资源...',
    searchResourcesAria: '搜索资源',
    managementTableAria: '资源管理表格',
    tableTitle: '标题',
    tableDownloads: '下载次数',
    tableActions: '操作',
    deleteFile: '删除',
    deleteConfirm: '确定要删除"{title}"吗？此操作不可撤销。',
    uploadSuccess: '文件上传成功。',
    uploadError: '上传失败。',
    deleteSuccess: '文件已删除。',
    deleteError: '删除失败。',
    loadError: '加载文件失败。',
    loginError: '登录失败。',
    networkError: '网络错误，请检查网络连接。',
    noFiles: '暂无可用文件。',
    noFilesAdmin: '保险库中暂无文件，请上传您的第一个 PDF。',
    downloading: '下载中...',
    uploading: '上传中...',
  },
};

// ---- icons ----------------------------------------------------------------

function Icon({ name, size = 18, strokeWidth = 2.2 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  switch (name) {
    case 'lock':
      return (
        <svg {...common}>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          <path d="M12 15v2" />
        </svg>
      );
    case 'file':
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8" />
          <path d="M8 17h6" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 17V11" />
          <path d="M12 17V7" />
          <path d="M16 17v-4" />
        </svg>
      );
    case 'book':
      return (
        <svg {...common}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z" />
          <path d="M8 2v15" />
        </svg>
      );
    case 'gavel':
      return (
        <svg {...common}>
          <path d="M14 13 5 4" />
          <path d="m7 2 9 9" />
          <path d="m16 8 3-3" />
          <path d="m10 14 7 7" />
          <path d="M5 11 2 14" />
          <path d="m2 14 5 5" />
        </svg>
      );
    case 'download':
      return (
        <svg {...common}>
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
      );
    case 'filter':
      return (
        <svg {...common}>
          <path d="M4 6h16" />
          <path d="M7 12h10" />
          <path d="M10 18h4" />
        </svg>
      );
    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...common}>
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 15H6L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      );
    case 'upload':
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M12 18V11" />
          <path d="m8 15 4-4 4 4" />
        </svg>
      );
    case 'signout':
      return (
        <svg {...common}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      );
    case 'arrow-right':
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      );
    case 'spinner':
      return (
        <svg {...common}>
          <path d="M12 2v4" />
          <path d="M12 18v4" />
          <path d="M4.93 4.93l2.83 2.83" />
          <path d="M16.24 16.24l2.83 2.83" />
          <path d="M2 12h4" />
          <path d="M18 12h4" />
          <path d="M4.93 19.07l2.83-2.83" />
          <path d="M16.24 7.76l2.83-2.83" />
        </svg>
      );
    default:
      return null;
  }
}

// ---- components -----------------------------------------------------------

function LanguageSwitch({ lang, onLanguageChange, t }) {
  return (
    <div className="language-switch" aria-label={t.languageLabel}>
      <button
        type="button"
        className={lang === 'zh' ? 'is-active' : ''}
        onClick={() => onLanguageChange('zh')}
        aria-pressed={lang === 'zh'}
      >
        {t.languageChinese}
      </button>
      <span aria-hidden="true" />
      <button
        type="button"
        className={lang === 'en' ? 'is-active' : ''}
        onClick={() => onLanguageChange('en')}
        aria-pressed={lang === 'en'}
      >
        {t.languageEnglish}
      </button>
    </div>
  );
}

function LoginPage({ onUserLogin, onAdminLogin, t }) {
  const [mode, setMode] = useState('user');
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const secretClicksRef = useRef([]);
  const isAdminMode = mode === 'admin';

  const revealAdminLogin = () => {
    const now = Date.now();
    secretClicksRef.current = [...secretClicksRef.current, now].filter(
      (time) => now - time < 1800,
    );
    if (secretClicksRef.current.length >= 5) {
      secretClicksRef.current = [];
      setMode('admin');
      setKey('');
      setError('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isNonEmptyKey(key)) {
      setError(t.emptyKeyError);
      return;
    }
    setError('');
    setLoading(true);

    try {
      if (isAdminMode) {
        await onAdminLogin(key);
      } else {
        await onUserLogin(key);
      }
    } catch (err) {
      setError(err.message || t.loginError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section
        className={`login-card ${isAdminMode ? 'login-card--admin' : ''}`}
        aria-label={`${t.secureDoc} ${isAdminMode ? t.adminResourceAccess : t.privateResourceAccess}`}
      >
        <div
          className="login-lock login-lock-trigger"
          onClick={revealAdminLogin}
          onMouseDown={(event) => event.preventDefault()}
        >
          <Icon name="lock" size={38} strokeWidth={2.1} />
        </div>
        <h1>{t.secureDoc}</h1>
        <p>{isAdminMode ? t.adminResourceAccess : t.privateResourceAccess}</p>

        <form onSubmit={handleSubmit}>
          <label className="form-label" htmlFor="accessKey">
            {isAdminMode ? t.enterAdminKey : t.enterAccessKey}
          </label>
          <input
            id="accessKey"
            className="text-input"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            type="password"
            placeholder={isAdminMode ? t.adminKeyPlaceholder : t.accessKeyPlaceholder}
            aria-label={isAdminMode ? t.adminKeyAria : t.accessKeyAria}
            autoComplete={isAdminMode ? 'current-password' : 'off'}
            disabled={loading}
          />

          {error && <p className="form-error" role="alert">{error}</p>}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? (
              <Icon name="spinner" size={17} />
            ) : (
              <>
                {isAdminMode ? t.unlockAdmin : t.accessFiles} <Icon name="arrow-right" size={17} />
              </>
            )}
          </button>
        </form>
      </section>
    </main>
  );
}

function AdminGateModal({ t, onCancel, onAdminLogin }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isNonEmptyKey(key)) {
      setError(t.emptyKeyError);
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onAdminLogin(key);
    } catch (err) {
      setError(err.message || t.loginError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-gate-overlay" role="presentation" onMouseDown={onCancel}>
      <section
        className="admin-gate-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adminGateTitle"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="admin-gate-icon"><Icon name="lock" size={30} /></div>
        <h2 id="adminGateTitle">{t.adminVerification}</h2>
        <p>{t.adminVerificationDescription}</p>

        <form onSubmit={handleSubmit}>
          <label className="form-label" htmlFor="resourceAdminKey">{t.enterAdminKey}</label>
          <input
            id="resourceAdminKey"
            className="text-input"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            type="password"
            placeholder={t.adminKeyPlaceholder}
            aria-label={t.adminKeyAria}
            autoComplete="current-password"
            autoFocus
            disabled={loading}
          />

          {error && <p className="form-error" role="alert">{error}</p>}

          <div className="admin-gate-actions">
            <button className="secondary-button" type="button" onClick={onCancel} disabled={loading}>
              {t.cancel}
            </button>
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? <Icon name="spinner" size={15} /> : t.verifyAdmin}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ResourceCard({ item, t }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async (event) => {
    event.preventDefault();
    setError('');
    setDownloading(true);

    try {
      const res = await downloadFile(item.id);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Use the original filename from Content-Disposition if available,
      // otherwise fall back to title + .pdf
      const disposition = res.headers.get('content-disposition') || '';
      const match = disposition.match(/filename\*=UTF-8''(.+)/);
      a.download = match ? decodeURIComponent(match[1]) : `${item.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <article className="resource-card">
      <div className="resource-card__top">
        <div className="resource-icon"><Icon name="file" size={25} strokeWidth={2.2} /></div>
        {item.download_count > 0 && (
          <span className="download-count-badge">{item.download_count} {t.downloadsBadge}</span>
        )}
      </div>

      <h2>{item.title}</h2>

      <div className="resource-meta resource-meta--single">
        <span>{formatFileSize(item.size)}</span>
      </div>

      <p className="resource-download-note">{t.readyToDownload}</p>

      {error && <p className="form-error" role="alert">{error}</p>}

      <button
        className="outline-button resource-download-button"
        type="button"
        onClick={handleDownload}
        disabled={downloading}
      >
        {downloading ? (
          <Icon name="spinner" size={15} strokeWidth={2.4} />
        ) : (
          <Icon name="download" size={15} strokeWidth={2.4} />
        )}{' '}
        {downloading ? t.downloading : t.download}
      </button>
    </article>
  );
}

function ResourcesPage({ onLock, onAdminLogin, t, sessionExpiresAt, lastSyncMinutesAgo, lang }) {
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminGateOpen, setAdminGateOpen] = useState(false);
  const secretTitleClicksRef = useRef([]);

  // Load files from API on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchFileList();
        if (!cancelled) setFiles(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || t.loadError);
          // 401 means session expired — parent will redirect
          if (err.status === 401) {
            onLock();
            return;
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return files;
    return files.filter((f) => f.title.toLowerCase().includes(keyword));
  }, [files, query]);

  const resourceTotals = useMemo(() => {
    const totalBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);
    return {
      fileCount: files.length,
      totalSize: formatFileSize(totalBytes),
    };
  }, [files]);

  const revealAdminGate = () => {
    const now = Date.now();
    secretTitleClicksRef.current = [...secretTitleClicksRef.current, now].filter(
      (time) => now - time < 1800,
    );
    if (secretTitleClicksRef.current.length >= 5) {
      secretTitleClicksRef.current = [];
      setAdminGateOpen(true);
    }
  };

  const handleDownloadAll = () => {
    files.forEach((f) => {
      // Delay each download slightly to avoid browser blocking
      setTimeout(() => {
        downloadFile(f.id)
          .then((res) => res.blob())
          .then((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${f.title}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          })
          .catch(() => {
            // Silently skip errors during batch download
          });
      }, 200);
    });
  };

  return (
    <main className="resources-page">
      <aside className="resources-sidebar">
        <h1
          className="hidden-admin-title"
          onClick={revealAdminGate}
          onMouseDown={(event) => event.preventDefault()}
        >
          {t.availableResourcesLine1}<br />{t.availableResourcesLine2}
        </h1>
        <p>{t.resourcesDescription}</p>

        <div className="session-card">
          <span>{t.accessSessionActive}</span>
          <strong>{t.keyValidFor}: {formatRemainingTime(sessionExpiresAt - Date.now())}</strong>
          <small>{t.sessionNote}</small>
        </div>

        <label className="filter-box">
          <Icon name="filter" size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.filterByName}
            aria-label={t.filterByNameAria}
          />
        </label>

        <button className="primary-button download-all" onClick={handleDownloadAll} disabled={files.length === 0}>
          <Icon name="download" size={18} /> {t.downloadAll}
        </button>

        <div className="stats-panel">
          <dl>
            <div>
              <dt>{t.totalFiles}</dt>
              <dd>{resourceTotals.fileCount}</dd>
            </div>
            <div>
              <dt>{t.totalSize}</dt>
              <dd>{resourceTotals.totalSize}</dd>
            </div>
            <div>
              <dt>{t.lastSync}</dt>
              <dd>{formatSyncTime(lastSyncMinutesAgo, lang)}</dd>
            </div>
          </dl>
        </div>

        <button className="text-nav" onClick={onLock}>{t.backToLogin}</button>
      </aside>

      <section className="resources-grid" aria-label={t.resourcesGridAria}>
        {loading && <p className="resources-empty">{t.downloading}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <p className="resources-empty">{t.noFiles}</p>
        )}
        {filtered.map((item) => (
          <ResourceCard key={item.id} item={item} t={t} />
        ))}
      </section>

      {adminGateOpen && (
        <AdminGateModal
          t={t}
          onCancel={() => setAdminGateOpen(false)}
          onAdminLogin={onAdminLogin}
        />
      )}
    </main>
  );
}

function AdminPage({ onSignOut, t }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const loadFiles = useCallback(async () => {
    setError('');
    try {
      const data = await adminListFiles();
      setFiles(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.status === 401) {
        onSignOut();
        return;
      }
      setError(err.message || t.loadError);
    } finally {
      setLoading(false);
    }
  }, [onSignOut, t]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setUploadError(t.emptyKeyError);
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (title.trim()) formData.append('title', title.trim());
      if (description.trim()) formData.append('description', description.trim());

      await adminUploadFile(formData);
      setTitle('');
      setDescription('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadFiles();
    } catch (err) {
      if (err.status === 401) {
        onSignOut();
        return;
      }
      setUploadError(err.message || t.uploadError);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (file) => {
    const msg = t.deleteConfirm.replace('{title}', file.title);
    if (!window.confirm(msg)) return;

    try {
      await adminDeleteFile(file.id);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch (err) {
      if (err.status === 401) {
        onSignOut();
        return;
      }
      alert(err.message || t.deleteError);
    }
  };

  const handleFileChange = (event) => {
    const f = event.target.files?.[0];
    setSelectedFile(f || null);
    setUploadError('');
    // Auto-fill title from filename if empty
    if (f && !title.trim()) {
      const name = f.name.replace(/\.pdf$/i, '');
      setTitle(name);
    }
  };

  const filteredFiles = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return files;
    return files.filter((f) => f.title.toLowerCase().includes(keyword));
  }, [files, search]);

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <div>
          <h1>{t.adminConsole}</h1>
          <p>{t.securityLevel}</p>

          <nav className="admin-nav" aria-label={t.adminNavigation}>
            <button className="admin-nav__item admin-nav__item--active">
              <Icon name="lock" size={22} /> {t.vault}
            </button>
          </nav>
        </div>

        <div className="admin-bottom">
          <button className="secondary-button" onClick={() => fileInputRef.current?.click()}>
            {t.uploadNewPdf}
          </button>
          <button className="signout-button" onClick={onSignOut}>
            <Icon name="signout" size={17} /> {t.signOut}
          </button>
        </div>
      </aside>

      <section className="admin-content">
        <div className="upload-section">
          <header>
            <h2>{t.uploadResource}</h2>
            <p>{t.uploadDescription}</p>
          </header>

          <form className="upload-card upload-card--compact" onSubmit={handleUpload}>
            <label className="form-label" htmlFor="documentTitle">{t.documentTitle}</label>
            <input
              id="documentTitle"
              className="text-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t.documentTitlePlaceholder}
            />

            <label className="form-label" htmlFor="documentDescription">DESCRIPTION / 描述</label>
            <textarea
              id="documentDescription"
              className="text-input"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional description / notes"
              rows={3}
              style={{ height: 'auto', padding: '8px 13px', resize: 'vertical' }}
            />

            <label className="form-label">{t.filePayload}</label>
            <button
              type="button"
              className="drop-zone"
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon name="upload" size={34} />
              {selectedFile ? (
                <span>{selectedFile.name}</span>
              ) : (
                <span>{t.dropZoneText}<br />{t.dropZonePdf}</span>
              )}
              <small>{t.maxSize}</small>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                hidden
                onChange={handleFileChange}
              />
            </button>

            {uploadError && <p className="form-error" role="alert">{uploadError}</p>}

            <button
              className="primary-button process-button"
              type="submit"
              disabled={uploading || !selectedFile}
            >
              {uploading ? <Icon name="spinner" size={17} /> : t.processUpload}
            </button>
          </form>
        </div>

        <div className="management-section">
          <div className="management-head">
            <div>
              <h2>{t.resourceManagement}</h2>
              <p>{t.managementDescription}</p>
            </div>
            <label className="admin-search">
              <Icon name="search" size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.searchResources}
                aria-label={t.searchResourcesAria}
              />
            </label>
          </div>

          <div className="table-card" role="region" aria-label={t.managementTableAria}>
            {error && <p className="form-error" style={{ padding: 16 }} role="alert">{error}</p>}
            {loading && <p style={{ padding: 16 }}>{t.downloading}</p>}
            {!loading && !error && files.length === 0 && (
              <p style={{ padding: 16 }}>{t.noFilesAdmin}</p>
            )}
            {files.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>{t.tableTitle}</th>
                    <th>{t.tableDownloads}</th>
                    <th>{t.tableActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map((file) => (
                    <tr key={file.id}>
                      <td>
                        <span className="admin-file-title">
                          <Icon name="file" size={18} /> {file.title}
                        </span>
                      </td>
                      <td>{file.download_count ?? 0}</td>
                      <td>
                        <button
                          className="icon-button"
                          aria-label={`${t.deleteFile} ${file.title}`}
                          onClick={() => handleDelete(file)}
                        >
                          <Icon name="trash" size={19} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

// ---- root app -------------------------------------------------------------

export default function App() {
  const [lang, setLang] = useState(() => localStorage.getItem('secure-doc-language') || 'en');
  const [tick, setTick] = useState(Date.now());
  const [lastSyncMinutesAgo] = useState(createRandomSyncMinutes);
  const [accessExpiresAt, setAccessExpiresAt] = useState(() => {
    if (readAdminSession()) return 0;
    return readUserSession();
  });
  const [adminExpiresAt, setAdminExpiresAt] = useState(() => readAdminSession());
  const [page, setPage] = useState(() => {
    if (readAdminSession()) return 'admin';
    if (readUserSession()) return 'resources';
    return 'login';
  });

  const t = copy[lang];
  const isAccessValid = accessExpiresAt > tick;
  const isAdminValid = adminExpiresAt > tick;

  // Persist language
  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    localStorage.setItem('secure-doc-language', lang);
  }, [lang]);

  // Tick for countdown timers
  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick(Date.now());
      setAccessExpiresAt(readUserSession());
      setAdminExpiresAt(readAdminSession());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Redirect when session expires
  useEffect(() => {
    if (page === 'resources' && !isAccessValid) {
      setPage('login');
    }
    if (page === 'admin' && !isAdminValid) {
      setPage('login');
    }
  }, [isAccessValid, isAdminValid, page]);

  // ---- user login ---------------------------------------------------------

  const handleUserLogin = async (key) => {
    const data = await verifyAccessKey(key);
    const expiresAt = persistUserSession(data.expires_at);
    setAccessExpiresAt(expiresAt);
    setPage('resources');
  };

  // ---- admin login --------------------------------------------------------

  const handleAdminLogin = async (adminKey) => {
    if (!isNonEmptyKey(adminKey)) return;
    await adminLogin(adminKey);
    const expiresAt = persistAdminSession();
    setAdminExpiresAt(expiresAt);
    setPage('admin');
  };

  // ---- lock / sign out ----------------------------------------------------

  const handleLockUserSession = () => {
    clearUserSession();
    setAccessExpiresAt(0);
    setPage('login');
  };

  const handleAdminSignOut = () => {
    clearAdminSession();
    setAdminExpiresAt(0);
    setPage('login');
  };

  // ---- render -------------------------------------------------------------

  return (
    <>
      <LanguageSwitch lang={lang} onLanguageChange={setLang} t={t} />
      {page === 'admin' && isAdminValid && <AdminPage onSignOut={handleAdminSignOut} t={t} />}
      {page === 'resources' && isAccessValid && (
        <ResourcesPage
          onLock={handleLockUserSession}
          onAdminLogin={handleAdminLogin}
          t={t}
          sessionExpiresAt={accessExpiresAt}
          lastSyncMinutesAgo={lastSyncMinutesAgo}
          lang={lang}
        />
      )}
      {page === 'login' && (
        <LoginPage onUserLogin={handleUserLogin} onAdminLogin={handleAdminLogin} t={t} />
      )}
    </>
  );
}
