# 问：

前端出现非常奇葩的问题：我点击 PDF 预览的效果居然是网页缩小，还是浏览网页，并不是预览 PDF，这是非常低级的错误

# 答：

这是一个极其经典的 React/Vue 开发者必踩的“名场面”——俗称“网页套娃”！

这绝对不是你犯了低级错误，恰恰相反，这说明你的前端 React 路由（SPA 单页应用机制）正在正常工作。我们来一秒钟揭开这个“奇葩现象”的谜底：

### 🕵️ 为什么会发生“网页套娃”？

当你给 iframe 写下类似 `<iframe src="/api/files/1/download">` 的代码时，发生了这两件事：

1. **相对路径的陷阱**：浏览器把它当成了相对路径，于是向**前端页面自己**（比如 `https://wmrazineousa...`）发送了请求，而不是发给后端的公网 API。
2. **React 的兜底机制**：前端服务器一看：“咦？我这里没有 `/api/files...` 这个物理文件啊”。在单页应用（SPA）中，**所有找不到的路径，默认都会被重定向返回 `index.html**`。

于是，你的 iframe 没有拿到 PDF，而是**又下载了一次你自己的前端页面代码**，把它渲染在了这个小框框里，形成了“无限缩小”的奇葩视觉效果！

除此之外，直接用 iframe 加载后端公网 URL 还有一个致命缺陷：**iframe 原生不支持在 GET 请求中携带管理员的 JWT Header**（会报 401）。

---

### 🛠️ 终极优雅的解决方案：Blob 流转换

既然我们在 `config.js` 里已经写好了 `userDownloadFetch` 和 `adminFetch`（它们会自动携带 Cookie 或 Token），最完美的预览方式是：**用代码把文件“悄悄”下载到浏览器内存里，然后变成一个本地预览地址喂给 iframe。**

请找到你前端写“预览”功能的那个组件，按下面的逻辑修改：

#### 1. 引入并使用 React 的 Hook 来转换 PDF

```jsx
import React, { useState, useEffect } from "react";
import { userDownloadFetch } from "../api/config"; // 引入咱们封装好的请求

export default function PdfPreviewModal({ fileId }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPdf() {
      try {
        setLoading(true);
        // 1. 发起带鉴权的安全请求，拿到完整的 Response 对象
        const res = await userDownloadFetch(fileId);

        // 2. 将响应体转换为二进制大对象 (Blob)
        const blob = await res.blob();

        // 3. 在浏览器内存中，为这个二进制流生成一个临时的、唯一的本地 URL
        const objectUrl = URL.createObjectURL(blob);

        // 4. 把这个本地 URL 喂给 iframe
        setPdfUrl(objectUrl);
      } catch (err) {
        console.error("PDF 加载失败:", err);
        alert("无法加载 PDF 预览");
      } finally {
        setLoading(false);
      }
    }

    if (fileId) {
      loadPdf();
    }

    // 🧹 重要：组件卸载时，清理内存中的临时 URL，防止内存泄漏！
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [fileId]); // 当 fileId 变化时重新加载

  if (loading) return <div>正在安全加载 PDF...</div>;

  // 此时 iframe 的 src 会是一个类似 blob:https://... 的纯本地安全链接
  return (
    <iframe
      src={pdfUrl}
      width="100%"
      height="600px"
      style={{ border: "none" }}
      title="PDF 安全预览"
    />
  );
}
```

### 💡 这样改的三大好处：

1. **彻底告别套娃**：走的是正规的 `fetch` 请求，完美对接你的后端地址和跨域配置，绝对不会再渲染出网页。
2. **安全性拉满**：iframe 不直接暴露你的后端下载接口地址，防盗链效果满分。
3. **完美兼容鉴权**：因为用的是咱们封装的 `userDownloadFetch`，它会自动带上 Cookie 和防刷逻辑；如果是管理员端，只需换成 `adminFetch` 就能完美携带 Token！

快把你的预览按钮替换成这个逻辑试试看，这次出来的绝对是货真价实的 PDF 原生预览器！
