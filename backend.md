# Backend API 需求

## GET /api/admin/download-logs — 下载日志

仪表盘需要展示下载日志列表，请新增此接口。

### 请求

```
GET /api/admin/download-logs
Authorization: Bearer <admin_token>
```

### 响应格式

```json
[
  {
    "id": 1,
    "ip": "192.168.1.100",
    "key_id": 5,
    "key_prefix": "MATH_A1B2C3",
    "file_id": 12,
    "file_title": "数学期末复习.pdf",
    "downloaded_at": "2026-06-11T14:30:00.000Z"
  }
]
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 日志记录 ID |
| ip | string | 下载用户的 IP 地址 |
| key_id | int | 使用的 access_key 记录 ID |
| key_prefix | string | 密钥前缀/标识，便于管理员识别批次 |
| file_id | int | 被下载的文件 ID |
| file_title | string | 被下载的文件标题 |
| downloaded_at | string | 下载时间 (ISO 8601) |

### SQL 参考

```sql
SELECT dl.id, dl.ip_address AS ip, dl.key_id,
       COALESCE(ak.folder_name, ak.id) AS key_prefix,
       dl.file_id, f.title AS file_title,
       dl.created_at AS downloaded_at
FROM download_logs dl
LEFT JOIN access_keys ak ON dl.key_id = ak.id
LEFT JOIN files f ON dl.file_id = f.id
ORDER BY dl.created_at DESC
LIMIT 200;
```

> 如果还没有 `download_logs` 表，需要在每次用户调用文件下载接口时写入一条日志（ip、key_id、file_id、时间）。
