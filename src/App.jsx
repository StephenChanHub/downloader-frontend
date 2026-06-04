import { useEffect, useMemo, useRef, useState } from 'react';

const SESSION_DURATION_MS = 30 * 60 * 1000;
const USER_SESSION_STORAGE_KEY = 'secure-doc-access-session';
const ADMIN_SESSION_STORAGE_KEY = 'secure-doc-admin-session';

const resources = [
  {
    id: 1,
    title: 'IELTS Preparation Guide 2024',
    size: '5.2 MB',
    date: 'Oct 12, 2023',
    icon: 'file',
    downloads: 142,
  },
  {
    id: 2,
    title: 'Q4 Financial Report - Consolidated Draft',
    size: '12.8 MB',
    date: 'Oct 10, 2023',
    icon: 'chart',
    downloads: 89,
  },
  {
    id: 3,
    title: 'User Manual v2.1.4',
    size: '1.4 MB',
    date: 'Sep 28, 2023',
    icon: 'book',
    downloads: 61,
  },
  {
    id: 4,
    title: 'NDA Template - Employee Standard',
    size: '450 KB',
    date: 'Sep 15, 2023',
    icon: 'gavel',
    downloads: 34,
  },
];

const adminFiles = [
  {
    id: 101,
    title: 'Q3 Financial Report - Final',
    downloads: 142,
  },
  {
    id: 102,
    title: 'Employee Handbook V4',
    downloads: 89,
  },
];

const copy = {
  en: {
    languageLabel: 'Language',
    languageEnglish: 'EN',
    languageChinese: '中文',
    secureDoc: 'SecureDoc',
    privateResourceAccess: 'Private Resource Access',
    adminResourceAccess: 'Administrator Resource Access',
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
    lastSyncValue: '10 min ago',
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
    maxSize: 'Max size: 50MB',
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
  },
  zh: {
    languageLabel: '语言',
    languageEnglish: 'EN',
    languageChinese: '中文',
    secureDoc: 'SecureDoc',
    privateResourceAccess: '私有资源访问',
    adminResourceAccess: '管理员资源访问',
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
    lastSyncValue: '10 分钟前',
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
    maxSize: '最大：50MB',
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
  },
};

function createTimedSession(storageKey) {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  localStorage.setItem(storageKey, JSON.stringify({ expiresAt }));
  return expiresAt;
}

function readTimedSession(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return 0;

    const session = JSON.parse(raw);
    if (!session?.expiresAt || session.expiresAt <= Date.now()) {
      localStorage.removeItem(storageKey);
      return 0;
    }

    return session.expiresAt;
  } catch {
    localStorage.removeItem(storageKey);
    return 0;
  }
}

function clearTimedSession(storageKey) {
  localStorage.removeItem(storageKey);
}

function isNonEmptyKey(key) {
  return key.trim().length > 0;
}

function formatRemainingTime(expiresAt) {
  const remainingMs = Math.max(0, expiresAt - Date.now());
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

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
    default:
      return null;
  }
}

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

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!isNonEmptyKey(key)) {
      setError(t.emptyKeyError);
      return;
    }

    setError('');
    if (isAdminMode) {
      onAdminLogin(key);
      return;
    }

    onUserLogin(key);
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
          />

          {error && <p className="form-error" role="alert">{error}</p>}

          <button className="primary-button" type="submit">
            {isAdminMode ? t.unlockAdmin : t.accessFiles} <Icon name="arrow-right" size={17} />
          </button>
        </form>
      </section>
    </main>
  );
}

function ResourceCard({ item, t }) {
  const handleDownload = (event) => {
    event.preventDefault();
    // Front-end placeholder: connect this button to your backend download endpoint.
    // The backend should verify the 30-minute access session before returning the file.
  };

  return (
    <article className="resource-card">
      <div className="resource-card__top">
        <div className="resource-icon"><Icon name={item.icon} size={25} strokeWidth={2.2} /></div>
      </div>

      <h2>{item.title}</h2>

      <div className="resource-meta">
        <span>{item.size}</span>
        <span>{item.date}</span>
      </div>

      <p className="resource-download-note">{t.readyToDownload}</p>

      <button className="outline-button resource-download-button" type="button" onClick={handleDownload}>
        <Icon name="download" size={15} strokeWidth={2.4} /> {t.download}
      </button>
    </article>
  );
}

function ResourcesPage({ onLock, t, sessionExpiresAt }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return resources;
    return resources.filter((resource) => resource.title.toLowerCase().includes(keyword));
  }, [query]);

  const handleDownloadAll = () => {
    // Front-end placeholder: request a batch download from your backend.
    // The backend should reject the request when the access session is expired.
  };

  return (
    <main className="resources-page">
      <aside className="resources-sidebar">
        <h1>{t.availableResourcesLine1}<br />{t.availableResourcesLine2}</h1>
        <p>{t.resourcesDescription}</p>

        <div className="session-card">
          <span>{t.accessSessionActive}</span>
          <strong>{t.keyValidFor}: {formatRemainingTime(sessionExpiresAt)}</strong>
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

        <button className="primary-button download-all" onClick={handleDownloadAll}>
          <Icon name="download" size={18} /> {t.downloadAll}
        </button>

        <div className="stats-panel">
          <dl>
            <div>
              <dt>{t.totalFiles}</dt>
              <dd>12</dd>
            </div>
            <div>
              <dt>{t.totalSize}</dt>
              <dd>84.5 MB</dd>
            </div>
            <div>
              <dt>{t.lastSync}</dt>
              <dd>{t.lastSyncValue}</dd>
            </div>
          </dl>
        </div>

        <button className="text-nav" onClick={onLock}>{t.backToLogin}</button>
      </aside>

      <section className="resources-grid" aria-label={t.resourcesGridAria}>
        {filtered.map((item) => (
          <ResourceCard key={item.id} item={item} t={t} />
        ))}
      </section>
    </main>
  );
}

function AdminPage({ onSignOut, t }) {
  const [title, setTitle] = useState('');
  const [search, setSearch] = useState('');
  const fileInputRef = useRef(null);

  const filteredFiles = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return adminFiles;
    return adminFiles.filter((file) => file.title.toLowerCase().includes(keyword));
  }, [search]);

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
          <button className="secondary-button">{t.uploadNewPdf}</button>
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

          <form className="upload-card upload-card--compact" onSubmit={(event) => event.preventDefault()}>
            <label className="form-label" htmlFor="documentTitle">{t.documentTitle}</label>
            <input
              id="documentTitle"
              className="text-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t.documentTitlePlaceholder}
            />

            <label className="form-label">{t.filePayload}</label>
            <button
              type="button"
              className="drop-zone"
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon name="upload" size={34} />
              <span>{t.dropZoneText}<br />{t.dropZonePdf}</span>
              <small>{t.maxSize}</small>
              <input ref={fileInputRef} type="file" accept="application/pdf" hidden />
            </button>

            <button className="primary-button process-button" type="submit">{t.processUpload}</button>
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
                    <td>{file.downloads}</td>
                    <td>
                      <button className="icon-button" aria-label={`${t.deleteFile} ${file.title}`}>
                        <Icon name="trash" size={19} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const [lang, setLang] = useState(() => localStorage.getItem('secure-doc-language') || 'en');
  const [tick, setTick] = useState(Date.now());
  const [accessExpiresAt, setAccessExpiresAt] = useState(() => readTimedSession(USER_SESSION_STORAGE_KEY));
  const [adminExpiresAt, setAdminExpiresAt] = useState(() => readTimedSession(ADMIN_SESSION_STORAGE_KEY));
  const [page, setPage] = useState(() => {
    if (readTimedSession(ADMIN_SESSION_STORAGE_KEY)) return 'admin';
    if (readTimedSession(USER_SESSION_STORAGE_KEY)) return 'resources';
    return 'login';
  });

  const t = copy[lang];
  const isAccessValid = accessExpiresAt > tick;
  const isAdminValid = adminExpiresAt > tick;

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    localStorage.setItem('secure-doc-language', lang);
  }, [lang]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick(Date.now());
      setAccessExpiresAt(readTimedSession(USER_SESSION_STORAGE_KEY));
      setAdminExpiresAt(readTimedSession(ADMIN_SESSION_STORAGE_KEY));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (page === 'resources' && !isAccessValid) {
      setPage('login');
    }

    if (page === 'admin' && !isAdminValid) {
      setPage('login');
    }
  }, [isAccessValid, isAdminValid, page]);

  const handleUserLogin = () => {
    const expiresAt = createTimedSession(USER_SESSION_STORAGE_KEY);
    setAccessExpiresAt(expiresAt);
    setPage('resources');
  };

  const handleAdminLogin = () => {
    const expiresAt = createTimedSession(ADMIN_SESSION_STORAGE_KEY);
    setAdminExpiresAt(expiresAt);
    setPage('admin');
  };

  const handleLockUserSession = () => {
    clearTimedSession(USER_SESSION_STORAGE_KEY);
    setAccessExpiresAt(0);
    setPage('login');
  };

  const handleAdminSignOut = () => {
    clearTimedSession(ADMIN_SESSION_STORAGE_KEY);
    setAdminExpiresAt(0);
    setPage('login');
  };

  return (
    <>
      <LanguageSwitch lang={lang} onLanguageChange={setLang} t={t} />
      {page === 'admin' && isAdminValid && <AdminPage onSignOut={handleAdminSignOut} t={t} />}
      {page === 'resources' && isAccessValid && (
        <ResourcesPage onLock={handleLockUserSession} t={t} sessionExpiresAt={accessExpiresAt} />
      )}
      {page === 'login' && <LoginPage onUserLogin={handleUserLogin} onAdminLogin={handleAdminLogin} t={t} />}
    </>
  );
}
