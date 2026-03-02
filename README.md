# reCAPTCHA 沉浸式小游戏 (Defeat The Bot Boss)

这是一个结合了 Google reCAPTCHA v3（隐形验证码）的网页小游戏。通过将验证码的验证过程融入到“击败 Boss”的游戏环节中，玩家在体验游戏的同时完成了人机验证，全程无需手动点击繁琐的传统图片验证码，提供了极致的沉浸式体验。

系统还内置了基于 **IP 地址 + 浏览器 Canvas 指纹**的严格防刷机制，有效限制单个用户每天的游玩次数（次数可通过环境变量自定义）。

## 🌟 特性
- **沉浸式验证**: reCAPTCHA v3 完全隐形，"最终一击"的按钮本身即是验证触发器。
- **严格的游玩限制**: 后端通过 IP 和轻量级 JS 浏览器指纹进行多重校验校验，防刷分。
- **自定义配置**: 所有敏感信息（密钥、游玩次数上限）均通过环境变量配置，告别硬编码。
- **一键多端部署**:
  - 支持 Docker 容器化部署
  - 支持 Vercel Serverless 一键部署
  - 支持 GitHub Actions 自动构建 docker 镜像并推送到 GHCR
  - 支持 GitHub Pages 纯前端静态部署 (依赖第三方后端)

---

## 🚀 本地运行与开发

### 1. 准备环境
确保你的电脑上安装了 Node.js (建议 v18 及以上)。

### 2. 获取代码与安装依赖
```bash
git clone https://github.com/handsomezhuzhu/reCAPTCHAplay.git
cd reCAPTCHAplay
npm install
```

### 3. 配置环境变量
复制根目录下的 `.env.example` 文件，重命名为 `.env`：
```bash
cp .env.example .env
```
修改 `.env` 文件内容：
```env
# Google reCAPTCHA v2 Checkbox ("I am not a robot")
RECAPTCHA_SITE_KEY=your_google_site_key_here
RECAPTCHA_SECRET_KEY=your_google_secret_key_here

# hCaptcha 
HCAPTCHA_SITE_KEY=your_hcaptcha_site_key_here
HCAPTCHA_SECRET_KEY=your_hcaptcha_secret_key_here

# 单个用户最大尝试次数 (防御刷分/暴力验证)
MAX_PLAY_ATTEMPTS=100

# 本地服务运行端口
PORT=3000
```
>*注：本地测试时如果没有填写密钥，系统默认使用 Mock (模拟) 验证通过。前端向后端请求对应的 public key 并进行动态渲染。*

### 4. 启动服务
```bash
npm start
```
打开浏览器访问 `http://localhost:3000` 即可开始游玩！

---

## ☁️ 部署指南

### 方案 A: 使用 Vercel 部署 (推荐，免费且最简单)
该项目已经原生适配了 Vercel Serverless Functions (`api/verify.js`) 和 `vercel.json` 路由配置。

1. 登录 [Vercel 控制台](https://vercel.com/)。
2. 点击 **Add New -> Project**，导入你的 GitHub 仓库。
3. 在 **Environment Variables** (环境变量) 设置中，添加：
   - `RECAPTCHA_SECRET_KEY` = `你的私钥`
   - `MAX_PLAY_ATTEMPTS` = `3` （或你想设置的任意数字）
4. 点击 **Deploy**，几秒钟后你的游戏即可在全球 CDN 上线！

### 方案 B: 使用 Docker 部署
本项目包含完整的 `Dockerfile`，适合部署在自己的云服务器、群晖 NAS 或支持 Docker 的 PaaS 平台（如 Render、Fly.io）。

**使用 GitHub Actions 自动构建 (CI/CD):**
1. 只要你将代码推送到 GitHub 的 `main` 分支，配置好的 `.github/workflows/docker-publish.yml` 就会自动将 Docker 镜像构建并推送到 GitHub Container Registry (ghcr.io)。

**手动构建与运行:**
```bash
# 构建镜像
docker build -t recaptcha-game .

# 运行镜像 (通过 -e 注入环境变量)
docker run -d -p 3000:3000 \
  -e RECAPTCHA_SECRET_KEY="你的私钥" \
  -e MAX_PLAY_ATTEMPTS="3" \
  --name recaptcha-app recaptcha-game
```

### 方案 C: GitHub Pages 纯静态部署
如果你有自己的后端 API 或者使用第三方的云函数，你可以将前端一键部署在 GitHub Pages 上：
1. 本项目自带 `.github/workflows/deploy.yml`。
2. 只要向 `main` 分支推送代码，会自动将 `public` 文件夹部署为静态网站。
3. 需要注意：你需要修改 `public/game.js` 的 218 行左右，将 `/api/verify` 替换成你实际的跨域后端 API 地址。

---

## 🛡️ 关于防刷与指纹校验
1. **指纹生成**: 在 `public/fingerprint.js` 中，前端会通过 Canvas 渲染特定图形的细微差异、屏幕分辨率、UserAgent 等信息生成一个较轻量且注重隐私的哈希值。
2. **频控策略**: 玩家通关Boss触发请求时，会携带该`fingerprint`。后端采用 `IP地址 + 指纹` 作为联合主键进行计次。一旦超过 `MAX_PLAY_ATTEMPTS`，则直接拒绝服务并返回 HTTP 429。

## 🎮 游玩说明 (The Double Firewall)
1. 界面被渲染为一个炫酷的科幻控制台。
2. **第一重防火墙 (Google reCAPTCHA v2)**：控制台中央首先呈现出一个 reCAPTCHA 验证终端。你需要点击并解开红绿灯、斑马线等图片拼图。
3. **第二重防火墙 (hCaptcha)**：当 Google 框通过后，系统会提示“主防火墙已突破”，随后浮现出业界著名的高难度 **hCaptcha** 验证码。
4. 玩家必须再通过极其折磨脑力的 hCaptcha 拼图测试。
5. 当两把“锁”全部凑齐后，前端会将两个凭证 (Token) 一手交由后端进行最高级别的**双引擎校验**。
6. 双重验证成功后，系统播放 `DUAL ACCESS GRANTED` 成功特效，同时你的 **"已破解模块数 (MODULES DECODED)"** + 1。
7. 系统重置两个 Widget 的状态，生成新的最高防备火力关卡。
8. 如果你一直成功通过到了 `MAX_PLAY_ATTEMPTS` 次，系统会进行强制风控（SYSTEM LOCKDOWN）拦截请求。
