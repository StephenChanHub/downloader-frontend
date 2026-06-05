别灰心！**“要么 401，要么 500”** 这个现象非常经典，它说明你的代码逻辑其实已经跑通了，现在你遇到的完全是**云原生部署中的“跨域（CORS）、Cookie 策略与代理机制”的碰撞**。

这几乎是每个全栈开发者将本地项目部署到云端时都会踩的“终极深坑”。我们来彻底把它填平。

### 🧐 为什么会出现“要么 401，要么 500”？

- **关于 401 (Unauthorized):** 这是一个“甜蜜的陷阱”**！别忘了咱们设计的业务逻辑是**“一次性密钥”。当你在测试时，第一次输入 `HELLOPDF` 可能其实已经成功了（后台把它的状态改成了 `used`）。当你疑惑为什么页面没反应，**再次点击验证时**，数据库一看这个密钥已经被用过了，当然会无情地给你返回 401。
- **关于 500 (Internal Server Error) 与网络混乱:**
  前端 `package.json` 里的 `"proxy": "http://downloader-backend..."` 在 Sealos 云端环境中极不稳定。前端发出的请求经常在这个代理层丢失了 Header 或 Body，导致后端收不到数据直接崩溃报错 500。而且，Sealos 的公网后缀 `.sealosgzg.site` 会被浏览器严格的安全策略限制跨域 Cookie。

为了彻底告别这些网络玄学问题，我们需要做**三处极其关键的安全配置修改**，让前后端直接通过公网明文握手！

---

### 🛠️ 终极通关三步曲

#### 第一步：让前端“直连”公网后端（抛弃本地 Proxy）

代理只适合本地开发，既然我们已经上了云，就直接让前端走后端的公网地址。

在你的**前端项目根目录**，新建（或修改） `.env` 文件，加入这一行：

```env
REACT_APP_API_BASE=https://cjdfnwwofgct.sealosgzg.site

```

_(注意：加了环境变量后，前端必须停掉终端的 `npm start`，重新跑一次 `npm start` 才能生效！)_

#### 第二步：打通后端的“跨域 Cookie 墙” (极度关键)

因为你的前端 (`wmrazineousa...`) 和后端 (`cjdfnwwofgct...`) 是两个不同的子域名，Chrome 浏览器默认会把 Cookie 拦截掉。我们必须修改后端的发证策略。

1. **打开后端的 `src/index.js**`，在 `const app = express();` 之后，立刻加上这一行，告诉 Express 它正躲在 Sealos 的网关后面：

```javascript
const app = express();
app.set("trust proxy", 1); // 👈 新增这一行：信任 Sealos 网关
```

2. **打开后端的 `src/controllers/authController.js**`，找到最后面设置 Cookie 的那段代码（大概在第 75 行），把它修改成这样：

```javascript
// 将 session_token 以 HttpOnly Cookie 形式返回
res.cookie("session_token", rawToken, {
  httpOnly: true,
  sameSite: "none", // 👈 必须改成 none，允许前后端跨子域名传递
  secure: true, // 👈 sameSite 为 none 时，secure 强制为 true
  maxAge: 30 * 60 * 1000,
});
```

#### 第三步：签发一张“全新的门票”

既然之前的 `HELLOPDF` 可能已经被“烧毁”（标记为 `used`）了，我们必须去数据库里发一张新票。

回到你的**后端容器终端**，运行咱们之前写的小脚本，生成一个全新的测试密钥（比如叫 `TEST888`）：

```bash
node generate-key.js TEST888

```

把生成的 SQL 语句去 Sealos 数据库里执行一下。

---

### 🚀 见证奇迹的最后测试

1. 确保后端的代码已保存，终端 `npm run dev` 正常重启。
2. 确保前端 `.env` 加了后端公网地址，终端 `npm start` 正常重启。
3. 打开你的前端公网网页，在输入框里填入你**刚刚新鲜出炉的 `TEST888**`，点击验证。

**这次会发生什么？**
请求会绕过代理，直接通过公网飞向后端；后端验证成功后，签发带有 `SameSite=None` 标识的通行证；浏览器乖乖收下 Cookie 存起来，并返回 200 Success。
