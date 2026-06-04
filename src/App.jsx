import { useEffect, useMemo, useRef, useState } from 'react';

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
    accessFiles: 'Access Files',
    unlockAdmin: 'Access Admin',
    adminEntrance: 'Admin entrance',
    availableResourcesLine1: 'Available',
    availableResourcesLine2: 'Resources',
    resourcesDescription: 'All documents are encrypted. Enter the file key to download.',
    filterByName: 'Filter by name...',
    filterByNameAria: 'Filter by name',
    downloadAll: 'DOWNLOAD ALL',
    downloadKey: 'FILE KEY',
    enterFileKey: 'Enter file key',
    download: 'DOWNLOAD',
    totalFiles: 'Total Files',
    totalSize: 'Total Size',
    lastSync: 'Last Sync',
    lastSyncValue: '10 min ago',
    backToLogin: 'Back to login',
    resourcesGridAria: 'Available resources',
    adminConsole: 'Admin Console',
    securityLevel: 'Security Level 4',
    adminNavigation: 'Admin navigation',
    vault: 'Vault',
    uploadNewPdf: 'Upload New PDF',
    signOut: 'Sign Out',
    uploadResource: 'Upload Resource',
    uploadDescription: 'All uploaded documents are encrypted and require a download key.',
    documentTitle: 'DOCUMENT TITLE',
    documentTitlePlaceholder: 'e.g., Annual Report',
    downloadKeyPlaceholder: 'Set file download key',
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
    accessFiles: '访问文件',
    unlockAdmin: '进入管理后台',
    adminEntrance: '管理员入口',
    availableResourcesLine1: '可用',
    availableResourcesLine2: '资源',
    resourcesDescription: '所有文档均已加密，填写文件密钥后才可下载。',
    filterByName: '按名称筛选...',
    filterByNameAria: '按名称筛选',
    downloadAll: '全部下载',
    downloadKey: '文件密钥',
    enterFileKey: '请输入文件密钥',
    download: '下载',
    totalFiles: '文件总数',
    totalSize: '文件总大小',
    lastSync: '最近同步',
    lastSyncValue: '10 分钟前',
    backToLogin: '返回登录',
    resourcesGridAria: '可用资源',
    adminConsole: '管理控制台',
    securityLevel: '安全等级 4',
    adminNavigation: '管理员导航',
    vault: '保险库',
    uploadNewPdf: '上传新 PDF',
    signOut: '退出登录',
    uploadResource: '上传资源',
    uploadDescription: '所有上传文档默认加密，下载时必须填写密钥。',
    documentTitle: '文档标题',
    documentTitlePlaceholder: '例如：年度报告',
    downloadKeyPlaceholder: '设置文件下载密钥',
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
    case 'users':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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

function AccessPill({ type, t, small = false }) {
  const icon = type === 'shared' ? 'users' : 'lock';
  return (
    <span className={`access-pill ${small ? 'access-pill--small' : ''}`}>
      <Icon name={icon} size={small ? 12 : 13} strokeWidth={2.3} />
      {t.accessLabels[type]}
    </span>
  );
}

function LoginPage({ onNavigate, t }) {
  const [mode, setMode] = useState('user');
  const [key, setKey] = useState('••••••••••••');
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
    }
  };

  const handleSubmit = () => {
    onNavigate(isAdminMode ? 'admin' : 'resources');
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

        <label className="form-label" htmlFor="accessKey">
          {isAdminMode ? t.enterAdminKey : t.enterAccessKey}
        </label>
        <input
          id="accessKey"
          className="text-input"
          value={key}
          onChange={(event) => setKey(event.target.value)}
          type="password"
          aria-label={isAdminMode ? t.adminKeyAria : t.accessKeyAria}
          autoComplete={isAdminMode ? 'current-password' : 'off'}
        />

        <button className="primary-button" onClick={handleSubmit}>
          {isAdminMode ? t.unlockAdmin : t.accessFiles} <Icon name="arrow-right" size={17} />
        </button>
      </section>
    </main>
  );
}

function ResourceCard({ item, t }) {
  const [fileKey, setFileKey] = useState('');

  const handleDownload = (event) => {
    event.preventDefault();
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

      <form className="resource-key-form" onSubmit={handleDownload}>
        <label className="file-key-field">
          <span>{t.downloadKey}</span>
          <input
            value={fileKey}
            onChange={(event) => setFileKey(event.target.value)}
            placeholder={t.enterFileKey}
            type="password"
            autoComplete="off"
          />
        </label>
        <button className="outline-button" type="submit" disabled={!fileKey.trim()}>
          <Icon name="download" size={15} strokeWidth={2.4} /> {t.download}
        </button>
      </form>
    </article>
  );
}

function ResourcesPage({ onNavigate, t }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return resources;
    return resources.filter((resource) => resource.title.toLowerCase().includes(keyword));
  }, [query]);

  return (
    <main className="resources-page">
      <aside className="resources-sidebar">
        <h1>{t.availableResourcesLine1}<br />{t.availableResourcesLine2}</h1>
        <p>{t.resourcesDescription}</p>

        <label className="filter-box">
          <Icon name="filter" size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.filterByName}
            aria-label={t.filterByNameAria}
          />
        </label>

        <button className="primary-button download-all">
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

        <button className="text-nav" onClick={() => onNavigate('login')}>{t.backToLogin}</button>
      </aside>

      <section className="resources-grid" aria-label={t.resourcesGridAria}>
        {filtered.map((item) => (
          <ResourceCard key={item.id} item={item} t={t} />
        ))}
      </section>
    </main>
  );
}

function AdminPage({ onNavigate, t }) {
  const [title, setTitle] = useState('');
  const [downloadKey, setDownloadKey] = useState('');
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
          <button className="signout-button" onClick={() => onNavigate('login')}>
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

          <form className="upload-card" onSubmit={(event) => event.preventDefault()}>
            <label className="form-label" htmlFor="documentTitle">{t.documentTitle}</label>
            <input
              id="documentTitle"
              className="text-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t.documentTitlePlaceholder}
            />

            <label className="form-label" htmlFor="downloadKey">{t.downloadKey}</label>
            <input
              id="downloadKey"
              className="text-input"
              value={downloadKey}
              onChange={(event) => setDownloadKey(event.target.value)}
              placeholder={t.downloadKeyPlaceholder}
              type="password"
              autoComplete="off"
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
  const [page, setPage] = useState('login');
  const [lang, setLang] = useState(() => localStorage.getItem('secure-doc-language') || 'en');
  const t = copy[lang];

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    localStorage.setItem('secure-doc-language', lang);
  }, [lang]);

  return (
    <>
      <LanguageSwitch lang={lang} onLanguageChange={setLang} t={t} />
      {page === 'admin' && <AdminPage onNavigate={setPage} t={t} />}
      {page === 'resources' && <ResourcesPage onNavigate={setPage} t={t} />}
      {page === 'login' && <LoginPage onNavigate={setPage} t={t} />}
    </>
  );
}
