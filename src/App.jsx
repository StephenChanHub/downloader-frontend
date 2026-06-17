import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { adminLogin, adminListFiles, adminUploadFileWithProgress, adminUpdateFile, adminDeleteFile, adminGetDownloadLogs } from './api/admin';
import { verifyAccessKey } from './api/auth';
import { fetchFileList, downloadFile } from './api/files';
import { formatFileSize, formatRemainingTime } from './utils/format';

// ---- constants ------------------------------------------------------------

const ADMIN_SESSION_MS = 24 * 60 * 60 * 1000; // admin JWT
const USER_SESSION_STORAGE_KEY = 'secure-doc-access-session';
const ADMIN_SESSION_STORAGE_KEY = 'secure-doc-admin-session';

// ---- local-storage session helpers ----------------------------------------

function persistUserSession(expiresAtISO) {
  // Backend now sends the precise expires_at — use it directly.
  // If missing/invalid, expire immediately to force re-login.
  const expiresAt = Date.parse(expiresAtISO) || Date.now();
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

function getFileExt(file) {
  // Prefer server-side magic-byte detection
  if (file.detected_type) return file.detected_type;
  if (file.mime_type === 'application/pdf') return 'PDF';
  if (file.mime_type && file.mime_type !== 'application/octet-stream') {
    const m = file.mime_type.split('/')[1];
    if (m) return m.toUpperCase();
  }
  // Fall back to filename extension
  const name = file.original_name || file.title || '';
  const dot = name.lastIndexOf('.');
  return dot > -1 ? name.slice(dot + 1).toUpperCase() : '?';
}

function isArchiveType(file) {
  const ext = getFileExt(file);
  return !['PDF', '?'].includes(ext);
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
    availableResources: 'Resources Unlocked',
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
    backToLogin: 'Sign out & enter new key',
    resourcesGridAria: 'Available resources',
    accessSessionActive: 'Access Session Active',
    keyValidFor: 'Key valid for',
    sessionNote: 'Please complete downloads within the session window. Closing the browser may invalidate your key.',
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
    folderName: 'FOLDER NAME',
    folderNamePlaceholder: 'e.g., math_course, english_docs',
    folderNameHint: 'Files are physically stored together; folder name is a logical tag for access control.',
    filePayload: 'FILE PAYLOAD',
    dropZoneText: 'Click to browse or drag',
    dropZonePdf: 'files here',
    maxSize: 'PDF, ZIP, RAR, 7z, GZ, TAR, BZ2, XZ · Max 500MB',
    processUpload: 'Process Upload',
    updateInfo: 'Update Info',
    cancelEdit: 'Cancel Edit',
    editHint: 'Double-click a file icon to edit its metadata here.',
    resourceManagement: 'Resource Management',
    managementDescription: 'Encrypted files currently distributed.',
    searchResources: 'Search resources...',
    searchResourcesAria: 'Search resources',
    managementTableAria: 'Resource management table',
    tableTitle: 'TITLE',
    tableSize: 'SIZE',
    tableFolder: 'FOLDER',
    tableDownloads: 'DOWNLOADS',
    tableActions: 'ACTIONS',
    storageAvailable: 'free of 10 GB',
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
    preview: 'PREVIEW',
    closePreview: 'Close preview',
    prevPage: 'Previous page',
    nextPage: 'Next page',
    pageInfo: '{start}–{end} of {total}',
    dashboard: 'Dashboard',
    totalStorage: 'Total Storage',
    todayVisitors: "Today's Visitors",
    todayDownloads: 'Today\'s Downloads',
    topDownloads: 'Top Downloads',
    rank: 'RANK',
    dashboardDesc: 'System overview and key metrics at a glance.',
    noStats: 'Unable to load statistics.',
    downloadLogs: 'Download Logs',
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
    availableResources: '资源已解锁',
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
    backToLogin: '退出并输入新密钥',
    resourcesGridAria: '可用资源',
    accessSessionActive: '访问会话已激活',
    keyValidFor: '密钥剩余有效期',
    sessionNote: '请在密钥有效期内完成下载，尽量一次性下载完毕。关闭浏览器可能导致密钥失效。',
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
    folderName: '所属文件夹',
    folderNamePlaceholder: '例如：math_course、english_docs',
    folderNameHint: '文件物理存储在一起；文件夹名仅作为访问控制的逻辑标签。',
    filePayload: '文件载荷',
    dropZoneText: '点击浏览或拖拽',
    dropZonePdf: '文件到此处',
    maxSize: '支持 PDF、ZIP、RAR、7z、GZ、TAR、BZ2、XZ · 最大 500MB',
    processUpload: '处理上传',
    updateInfo: '更新信息',
    cancelEdit: '取消编辑',
    editHint: '双击文件图标可在此处编辑其元数据。',
    resourceManagement: '资源管理',
    managementDescription: '当前正在分发的加密文件。',
    searchResources: '搜索资源...',
    searchResourcesAria: '搜索资源',
    managementTableAria: '资源管理表格',
    tableTitle: '标题',
    tableSize: '大小',
    tableFolder: '文件夹',
    tableDownloads: '下载次数',
    tableActions: '操作',
    storageAvailable: '可用 / 共 10 GB',
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
    preview: '预览',
    closePreview: '关闭预览',
    prevPage: '上一页',
    nextPage: '下一页',
    pageInfo: '第 {start}–{end} 条，共 {total} 条',
    dashboard: '仪表盘',
    totalStorage: '总存储空间',
    todayVisitors: '今日访客',
    todayDownloads: '今日下载',
    topDownloads: '热门下载',
    rank: '排名',
    dashboardDesc: '系统概览与关键指标一览。',
    noStats: '无法加载统计数据。',
    downloadLogs: '下载日志',
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
    case 'eye':
      return (
        <svg {...common}>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'chevron-left':
      return (
        <svg {...common}>
          <path d="m15 18-6-6 6-6" />
        </svg>
      );
    case 'chevron-right':
      return (
        <svg {...common}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      );
    case 'database':
      return (
        <svg {...common}>
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'trending-up':
      return (
        <svg {...common}>
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      );
    case 'award':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="6" />
          <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
        </svg>
      );
    case 'layout-dashboard':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="8" height="8" rx="1" />
          <rect x="13" y="3" width="8" height="8" rx="1" />
          <rect x="3" y="13" width="8" height="8" rx="1" />
          <rect x="13" y="13" width="8" height="8" rx="1" />
        </svg>
      );
    case 'folder':
      return (
        <svg {...common}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'folder-open':
      return (
        <svg {...common}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          <path d="M2 11h20" />
        </svg>
      );
    case 'chevron-down':
      return (
        <svg {...common}>
          <path d="m6 9 6 6 6-6" />
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

function PreviewModal({ file, t, onClose }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;

    async function loadPdf() {
      setLoading(true);
      setLoadError('');
      try {
        // 1. Fetch the PDF through our authenticated wrapper (carries Cookie)
        const res = await downloadFile(file.id);

        // 2. Convert response body to an in-memory Blob
        const blob = await res.blob();

        if (cancelled) return;

        // 3. Create a local blob: URL that the iframe can render natively
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.message || 'Failed to load PDF');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (file?.id) {
      loadPdf();
    }

    // 4. Clean up: revoke the blob URL to prevent memory leaks
    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [file?.id]);

  // ESC key & body scroll lock
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="preview-overlay" role="presentation" onMouseDown={onClose}>
      <div
        className="preview-modal"
        role="dialog"
        aria-modal="true"
        aria-label={file.title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="preview-header">
          <h2>{file.title}</h2>
          <button
            className="icon-button preview-close"
            onClick={onClose}
            aria-label={t.closePreview}
          >
            ✕
          </button>
        </div>
        <div className="preview-body">
          {loading && (
            <div className="preview-loading">
              <Icon name="spinner" size={28} />
              <span>{t.downloading}</span>
            </div>
          )}
          {loadError && (
            <div className="preview-loading">
              <p className="form-error" role="alert">{loadError}</p>
            </div>
          )}
          {pdfUrl && !loading && (
            <iframe
              src={pdfUrl}
              title={file.title}
              sandbox="allow-scripts allow-same-origin"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, total, pageSize, onPageChange, t }) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  // Build visible page numbers
  const pages = [];
  const maxVisible = 5;
  let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  const info = t.pageInfo
    .replace('{start}', start)
    .replace('{end}', end)
    .replace('{total}', total);

  return (
    <div className="pagination">
      <span className="pagination-info">{info}</span>
      <div className="pagination-controls">
        <button
          className="pagination-arrow"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label={t.prevPage}
        >
          <Icon name="chevron-left" size={16} />
        </button>

        {startPage > 1 && (
          <>
            <button className="pagination-num" onClick={() => onPageChange(1)}>1</button>
            {startPage > 2 && <span className="pagination-ellipsis">…</span>}
          </>
        )}

        {pages.map((p) => (
          <button
            key={p}
            className={`pagination-num ${p === page ? 'is-active' : ''}`}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="pagination-ellipsis">…</span>}
            <button className="pagination-num" onClick={() => onPageChange(totalPages)}>{totalPages}</button>
          </>
        )}

        <button
          className="pagination-arrow"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label={t.nextPage}
        >
          <Icon name="chevron-right" size={16} />
        </button>
      </div>
    </div>
  );
}

function ResourceCard({ item, t, onPreview }) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const abortRef = useRef(null);

  const handleCancelDownload = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  };

  const handleDownload = async (event) => {
    event.preventDefault();
    setError('');
    setDownloading(true);
    setProgress(0);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await downloadFile(item.id, controller.signal);
      const contentLength = parseInt(res.headers.get('Content-Length') || '0', 10);

      // Stream the response body to track real-time progress
      const reader = res.body.getReader();
      const chunks = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (contentLength > 0) {
          setProgress(Math.round((received / contentLength) * 100));
        }
      }

      const blob = new Blob(chunks);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = res.headers.get('content-disposition') || '';
      const match = disposition.match(/filename\*=UTF-8''(.+)/);
      if (match) {
        a.download = decodeURIComponent(match[1]);
      } else {
        // Derive extension from mime_type or original_name — never blindly append .pdf
        const ext = getFileExt(item).toLowerCase();
        const name = item.original_name || item.title || 'download';
        a.download = name.includes('.') ? name : `${name}.${ext}`;
      }
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setDownloading(false);
      setProgress(0);
      abortRef.current = null;
    }
  };

  return (
    <article className="resource-card">
      <div className="resource-card__top">
        <div className="resource-icon"><Icon name="file" size={25} strokeWidth={2.2} /></div>
        <span className={`file-type-badge ${isArchiveType(item) ? 'file-type-badge--archive' : ''}`}>{getFileExt(item)}</span>
        <span className="resource-card__size">{formatFileSize(item.size)}</span>
        {item.download_count > 0 && (
          <span className="download-count-badge">{item.download_count} {t.downloadsBadge}</span>
        )}
      </div>

      <h2>{item.title}</h2>

      {item.description && (
        <p className="resource-card__desc">{item.description}</p>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="resource-card-actions">
        <button
          className="outline-button resource-preview-button"
          type="button"
          onClick={() => onPreview(item)}
          disabled={downloading}
        >
          <Icon name="eye" size={15} strokeWidth={2.4} /> {t.preview}
        </button>
        {downloading ? (
          <div className="download-progress">
            <div className="download-progress__track">
              <div
                className="download-progress__fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="download-progress__pct">{progress}%</span>
            <button
              className="download-cancel-btn"
              type="button"
              onClick={handleCancelDownload}
              title="Cancel download"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            className="outline-button resource-download-button"
            type="button"
            onClick={handleDownload}
          >
            <Icon name="download" size={15} strokeWidth={2.4} /> {t.download}
          </button>
        )}
      </div>
    </article>
  );
}

function ResourcesPage({ onLock, onAdminLogin, t, sessionExpiresAt, lastSyncMinutesAgo, lang }) {
  const PAGE_SIZE = 20;

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [files, setFiles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminGateOpen, setAdminGateOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const debounceRef = useRef(null);
  const secretTitleClicksRef = useRef([]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Debounced server-side search
  const handleSearchChange = (value) => {
    setSearchInput(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 350);
  };

  // Load files from API with pagination & search
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchFileList({ page, limit: PAGE_SIZE, search });
        if (!cancelled) {
          // Backend may return a plain array (no pagination) or { total, files }
          if (Array.isArray(data)) {
            setFiles(data);
            setTotal(data.length);
          } else {
            setFiles(data.files || []);
            setTotal(data.total || 0);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || t.loadError);
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
  }, [page, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const resourceTotals = useMemo(() => {
    const totalBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);
    return {
      fileCount: total,
      totalSize: '—',
      pageBytes: formatFileSize(totalBytes),
    };
  }, [files, total]);

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
          {t.availableResources}
        </h1>

        <div className="session-card">
          <span>{t.accessSessionActive}</span>
          <strong>{t.keyValidFor}: {formatRemainingTime(sessionExpiresAt - Date.now())}</strong>
          <small>{t.sessionNote}</small>
        </div>

        <label className="filter-box">
          <Icon name="search" size={18} />
          <input
            value={searchInput}
            onChange={(event) => handleSearchChange(event.target.value)}
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
              <dd>{resourceTotals.pageBytes}</dd>
            </div>
            <div>
              <dt>{t.lastSync}</dt>
              <dd>{formatSyncTime(lastSyncMinutesAgo, lang)}</dd>
            </div>
          </dl>
        </div>

        <button className="text-nav" onClick={onLock}>{t.backToLogin}</button>
      </aside>

      <div className="resources-main">
        <section className="resources-grid" aria-label={t.resourcesGridAria}>
          {loading && <p className="resources-empty">{t.downloading}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          {!loading && !error && files.length === 0 && (
            <p className="resources-empty">{t.noFiles}</p>
          )}
          {files.map((item) => (
            <ResourceCard key={item.id} item={item} t={t} onPreview={setPreviewFile} />
          ))}
        </section>

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          t={t}
        />
      </div>

      {adminGateOpen && (
        <AdminGateModal
          t={t}
          onCancel={() => setAdminGateOpen(false)}
          onAdminLogin={onAdminLogin}
        />
      )}

      {previewFile && (
        <PreviewModal
          file={previewFile}
          t={t}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </main>
  );
}

const AdminPage = memo(function AdminPage({ onSignOut, t }) {
  const [adminView, setAdminView] = useState('dashboard');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [folderName, setFolderName] = useState('');
  const [search, setSearch] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [downloadLogs, setDownloadLogs] = useState(null);
  const [logsLoading, setLogsLoading] = useState(true);
  const [editingFileId, setEditingFileId] = useState(null);
  const [collapsedFolders, setCollapsedFolders] = useState(new Set());
  const fileInputRef = useRef(null);

  // Use refs for callback props so loadFiles stays stable across renders
  const onSignOutRef = useRef(onSignOut);
  onSignOutRef.current = onSignOut;
  const tRef = useRef(t);
  tRef.current = t;

  const loadFiles = useCallback(async () => {
    setError('');
    try {
      const data = await adminListFiles();
      setFiles(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.status === 401) {
        onSignOutRef.current();
        return;
      }
      setError(err.message || tRef.current.loadError);
    } finally {
      setLoading(false);
    }
  }, []); // Stable — no more re-fetch on every App tick

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Storage computed from actual files (always reliable)
  const totalUsed = useMemo(
    () => files.reduce((sum, f) => sum + (f.size || 0), 0),
    [files],
  );
  const STORAGE_CAPACITY = 10 * 1024 * 1024 * 1024; // 10 GB

  // Load download logs
  useEffect(() => {
    let cancelled = false;
    async function loadLogs() {
      setLogsLoading(true);
      try {
        const data = await adminGetDownloadLogs();
        if (!cancelled) setDownloadLogs(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setDownloadLogs(null);
      } finally {
        if (!cancelled) setLogsLoading(false);
      }
    }
    loadLogs();
    return () => { cancelled = true; };
  }, []);

  const isEditing = editingFileId !== null;

  const handleDoubleClickFile = (file) => {
    setEditingFileId(file.id);
    setTitle(file.title || '');
    setDescription(file.description || '');
    setFolderName(file.folder_name || '');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploadError('');
    setUploadProgress(0);
  };

  const cancelEdit = () => {
    setEditingFileId(null);
    setTitle('');
    setDescription('');
    setFolderName('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploadError('');
  };

  const handleSubmitForm = async (event) => {
    event.preventDefault();
    setUploadError('');
    setUploading(true);

    try {
      if (isEditing) {
        // Update existing file metadata
        const updates = {};
        if (title.trim()) updates.title = title.trim();
        if (description.trim()) updates.description = description.trim();
        if (folderName.trim()) updates.folder_name = folderName.trim();

        const updated = await adminUpdateFile(editingFileId, updates);
        setFiles((prev) => prev.map((f) => (f.id === editingFileId ? updated : f)));
        cancelEdit();
      } else {
        // Upload new file
        if (!selectedFile) {
          setUploadError(t.emptyKeyError);
          setUploading(false);
          return;
        }
        setUploadProgress(0);
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (title.trim()) formData.append('title', title.trim());
        if (description.trim()) formData.append('description', description.trim());
        formData.append('folder_name', folderName.trim() || 'default');

        await adminUploadFileWithProgress(formData, setUploadProgress);
        setTitle('');
        setDescription('');
        setFolderName('');
        setSelectedFile(null);
        setUploadProgress(0);
        setEditingFileId(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        await loadFiles();
      }
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

  // Group files by folder_name, sorted alphabetically
  const folderGroups = useMemo(() => {
    const groups = {};
    filteredFiles.forEach((f) => {
      const key = f.folder_name || 'default';
      if (!groups[key]) groups[key] = [];
      groups[key].push(f);
    });
    return Object.keys(groups)
      .sort()
      .map((name) => ({
        name,
        files: groups[name],
        totalSize: groups[name].reduce((sum, f) => sum + (f.size || 0), 0),
      }));
  }, [filteredFiles]);

  const toggleFolder = (folderName) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderName)) {
        next.delete(folderName);
      } else {
        next.add(folderName);
      }
      return next;
    });
  };

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <div>
          <h1>{t.adminConsole}</h1>
          <p>{t.securityLevel}</p>

          <nav className="admin-nav" aria-label={t.adminNavigation}>
            <button
              className={`admin-nav__item ${adminView === 'dashboard' ? 'admin-nav__item--active' : ''}`}
              onClick={() => setAdminView('dashboard')}
            >
              <Icon name="layout-dashboard" size={22} /> {t.dashboard}
            </button>
            <button
              className={`admin-nav__item ${adminView === 'vault' ? 'admin-nav__item--active' : ''}`}
              onClick={() => setAdminView('vault')}
            >
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

      {/* ---- Dashboard View ---- */}
      {adminView === 'dashboard' && (
        <section className="admin-content admin-content--dashboard">
          <header className="dashboard-header">
            <h2>{t.dashboard}</h2>
            <p>{t.dashboardDesc}</p>
          </header>

          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--storage">
                <Icon name="database" size={24} />
              </div>
              <div className="stat-card__body">
                <span className="stat-card__label">{t.totalStorage}</span>
                <strong className="stat-card__value">{formatFileSize(totalUsed)}</strong>
                <span className="stat-card__sub">
                  {formatFileSize(Math.max(0, STORAGE_CAPACITY - totalUsed))} {t.storageAvailable}
                </span>
                <div className="storage-bar">
                  <div
                    className="storage-bar__fill"
                    style={{ width: `${Math.min(100, (totalUsed / STORAGE_CAPACITY) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-log-table">
            <div className="dashboard-top-header">
              <Icon name="download" size={20} />
              <h3>{t.downloadLogs || 'Download Logs / 下载日志'}</h3>
            </div>
            {logsLoading && <p style={{ padding: 24 }}>{t.downloading}</p>}
            {!logsLoading && !downloadLogs && <p style={{ padding: 24 }}>{t.noStats}</p>}
            {!logsLoading && downloadLogs && downloadLogs.length === 0 && (
              <p style={{ padding: 24 }}>{t.noFiles}</p>
            )}
            {!logsLoading && downloadLogs && downloadLogs.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>IP</th>
                    <th>Key ID / 密钥</th>
                    <th>File / 文件</th>
                    <th>Time / 时间</th>
                  </tr>
                </thead>
                <tbody>
                  {downloadLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="log-ip">{log.ip || '—'}</td>
                      <td>
                        <span className="folder-tag">{log.key_prefix || log.key_id || '—'}</span>
                      </td>
                      <td>
                        <span className="admin-file-title">
                          <Icon name="file" size={18} />
                          {log.file_title || '—'}
                        </span>
                      </td>
                      <td className="log-time">{log.downloaded_at ? new Date(log.downloaded_at).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {/* ---- Vault View ---- */}
      {adminView === 'vault' && (
        <section className="admin-content">
          <div className="upload-section">
            <header>
              <h2>{t.uploadResource}</h2>
              <p>{t.uploadDescription}</p>
            </header>

            <form className="upload-card upload-card--compact" onSubmit={handleSubmitForm}>
              {isEditing && (
                <div className="edit-banner">
                  <Icon name="file" size={16} />
                  <span>{t.editHint}</span>
                </div>
              )}

              <label className="form-label" htmlFor="documentTitle">{t.documentTitle}</label>
              <input
                id="documentTitle"
                className="text-input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t.documentTitlePlaceholder}
                maxLength={200}
              />

              <label className="form-label" htmlFor="documentDescription">DESCRIPTION / 描述</label>
              <textarea
                id="documentDescription"
                className="text-input"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional description / notes"
                rows={3}
                maxLength={2000}
                style={{ height: 'auto', padding: '8px 13px', resize: 'vertical' }}
              />

              <label className="form-label" htmlFor="folderName">{t.folderName}</label>
              <input
                id="folderName"
                className="text-input"
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
                placeholder={t.folderNamePlaceholder}
                maxLength={50}
              />
              <small className="folder-hint">{t.folderNameHint}</small>

              {!isEditing && (
                <>
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
                      accept=".pdf,.zip,.rar,.7z,.gz,.tar,.bz2,.xz,.tgz"
                      hidden
                      onChange={handleFileChange}
                    />
                  </button>
                </>
              )}

              {uploadError && <p className="form-error" role="alert">{uploadError}</p>}

              {uploading && !isEditing && (
                <div className="upload-progress">
                  <div className="upload-progress__track">
                    <div
                      className="upload-progress__fill"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <span className="upload-progress__pct">{uploadProgress}%</span>
                </div>
              )}

              <div className="form-actions">
                {isEditing && (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={cancelEdit}
                    disabled={uploading}
                  >
                    {t.cancelEdit}
                  </button>
                )}
                <button
                  className="primary-button process-button"
                  type="submit"
                  disabled={uploading || (!isEditing && !selectedFile)}
                >
                  {uploading ? (
                    <><Icon name="spinner" size={17} /> {t.uploading}</>
                  ) : isEditing ? (
                    t.updateInfo
                  ) : (
                    t.processUpload
                  )}
                </button>
              </div>
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

            {error && <p className="form-error" style={{ padding: 16 }} role="alert">{error}</p>}
            {loading && <p style={{ padding: 16 }}>{t.downloading}</p>}
            {!loading && !error && files.length === 0 && (
              <p style={{ padding: 16 }}>{t.noFilesAdmin}</p>
            )}
            <div className="folder-groups-area">
            {files.length > 0 && folderGroups.map((group) => {
              const isCollapsed = collapsedFolders.has(group.name);
              return (
                <div className="folder-group" key={group.name}>
                  <button
                    type="button"
                    className="folder-group__header"
                    onClick={() => toggleFolder(group.name)}
                    aria-expanded={!isCollapsed}
                  >
                    <Icon name={isCollapsed ? 'chevron-right' : 'chevron-down'} size={16} strokeWidth={2.5} />
                    <Icon name={isCollapsed ? 'folder' : 'folder-open'} size={18} strokeWidth={2.2} />
                    <span className="folder-group__name">{group.name}</span>
                    <span className="folder-group__count">({group.files.length})</span>
                    <span className="folder-group__size">{formatFileSize(group.totalSize)}</span>
                  </button>
                  {!isCollapsed && (
                    <div className="folder-group__body">
                      <table>
                        <thead>
                          <tr>
                            <th>{t.tableTitle}</th>
                            <th>{t.tableSize}</th>
                            <th>{t.tableDownloads}</th>
                            <th>{t.tableActions}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.files.map((file) => (
                            <tr key={file.id}>
                              <td>
                                <div className="admin-file-cell">
                                  <span
                                    className="admin-file-icon"
                                    onDoubleClick={() => handleDoubleClickFile(file)}
                                    title={t.editHint}
                                  >
                                    <Icon name="file" size={18} />
                                  </span>
                                  <span
                                    className="admin-file-title"
                                    title={file.description || undefined}
                                  >
                                    <span className={`file-type-badge file-type-badge--sm ${isArchiveType(file) ? 'file-type-badge--archive' : ''}`}>{getFileExt(file)}</span>
                                    {file.title}
                                  </span>
                                </div>
                              </td>
                              <td className="admin-file-size">{formatFileSize(file.size)}</td>
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
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        </section>
      )}
    </main>
  );
});

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

  const t = useMemo(() => copy[lang], [lang]);
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

  const handleUserLogin = useCallback(async (key) => {
    const data = await verifyAccessKey(key);
    const expiresAt = persistUserSession(data.expires_at);
    setAccessExpiresAt(expiresAt);
    setPage('resources');
  }, []);

  // ---- admin login --------------------------------------------------------

  const handleAdminLogin = useCallback(async (adminKey) => {
    if (!isNonEmptyKey(adminKey)) return;
    await adminLogin(adminKey);
    const expiresAt = persistAdminSession();
    setAdminExpiresAt(expiresAt);
    setPage('admin');
  }, []);

  // ---- lock / sign out ----------------------------------------------------

  const handleLockUserSession = useCallback(() => {
    clearUserSession();
    setAccessExpiresAt(0);
    setPage('login');
  }, []);

  const handleAdminSignOut = useCallback(() => {
    clearAdminSession();
    setAdminExpiresAt(0);
    setPage('login');
  }, []);

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
