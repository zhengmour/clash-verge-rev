<h1 align="center">
  <img src="./src-tauri/icons/icon.png" alt="Clash" width="128" />
  <br>
  Continuation of <a href="https://github.com/zzzgydi/clash-verge">Clash Verge</a>
  <br>
</h1>

<h3 align="center">
A Clash Meta GUI based on <a href="https://github.com/tauri-apps/tauri">Tauri</a>.
</h3>

<p align="center">
  本仓库是 <a href="https://github.com/clash-verge-rev/clash-verge-rev">Clash Verge Rev</a> 的个人分支，
  额外内置了「Traffic 流量统计」页面。
</p>

<p align="center">
  Languages:
  <a href="./docs/README_en.md">English</a> ·
  <a href="./docs/README_es.md">Español</a> ·
  <a href="./docs/README_fa.md">فارسی</a> ·
  <a href="./docs/README_ja.md">日本語</a> ·
  <a href="./docs/README_ko.md">한국어</a> ·
  <a href="./docs/README_pt.md">Português</a> ·
  <a href="./docs/README_ru.md">Русский</a> ·
  <a href="./README.md">简体中文</a>
</p>

## Preview

| Dark                             | Light                             |
| -------------------------------- | --------------------------------- |
| ![预览](./docs/preview_dark.png) | ![预览](./docs/preview_light.png) |

## Traffic 流量统计

侧边栏「日志」之后新增的 **Traffic** 页面，把内核 `/connections` 的数据拆成四个维度，回答「流量到底花在谁身上」：

| 维度   | 说明                       |
| ------ | -------------------------- |
| 进程   | 按发起连接的应用统计       |
| 规则   | 按命中的规则统计           |
| 代理链 | 按实际使用的代理节点/链路   |
| 域名   | 按目标主机统计             |

- 今日 / 近 7 天 / 近 30 天切换，每个维度都有上传、下载、总量与连接数排行，支持关键字过滤
- 页面顶部是今日 / 近 7 天 / 近 30 天 / 本次运行的总量卡片，下面是每日流量柱状图
- 历史按天记录并保存在本机 `localStorage`（保留 30 天），不会上传到任何服务器；可以在页面上清空
- 进程维度依赖内核的进程识别：到「设置 → Clash 内核 → 查找进程模式」选择 `always`（或在配置里写 `find-process-mode: always`），否则该维度只显示「未知」

## Install

请到本仓库的发布页面下载对应的安装包：[Release page](https://github.com/zhengmour/clash-verge-rev/releases)<br>
Go to the [Release page](https://github.com/zhengmour/clash-verge-rev/releases) to download the corresponding installation package<br>
本分支当前只发布 Windows x64 构建，每个版本提供两个文件（This branch publishes Windows x64 builds only, two files per release）：

| 文件                           | 说明                                                             |
| ------------------------------ | ---------------------------------------------------------------- |
| `Clash.Verge_*_x64-setup.exe`  | NSIS 安装包，创建开始菜单/桌面快捷方式，可安装系统服务             |
| `clash-verge.exe`              | 免安装的可执行文件，解压后直接运行，不写入卸载信息                 |

Supports Windows (x64/x86), Linux (x64/arm64) and macOS 11+ (intel/apple) when built from source.
源码支持 Windows (x64/x86)、Linux (x64/arm64) 和 macOS 11+ (intel/apple)。

#### 我应当怎样选择发行版

本分支只提供手动构建的版本，没有 Alpha / AutoBuild 通道；上游的稳定版、Alpha 和 AutoBuild 请到
[Clash Verge Rev](https://github.com/clash-verge-rev/clash-verge-rev/releases) 获取。

| 版本            | 特征                                   | 链接                                                                            |
| :-------------- | :------------------------------------- | :------------------------------------------------------------------------------ |
| Traffic 构建    | 上游最新 `dev` 加内置 Traffic 页面。   | [Release](https://github.com/zhengmour/clash-verge-rev/releases)                 |

#### 安装说明和常见问题，请到 [文档页](https://clash-verge-rev.github.io/) 查看

### TG 频道: [@clash_verge_rev](https://t.me/clash_verge_re)

---

## Promotion

### ✈️ [AI云边 -- 全新架构机场 ClaudeBorder](https://cruise.54678999.xyz/#/register?code=58q5UJZc)

🔥热销中使用本链接注册即送 **3 天免费试用**，每日 **1GB 流量**：👉 [点此注册](https://cruise.54678999.xyz/#/register?code=58q5UJZc)

#### AI云边 -- 全新架构机场。

- 💻 多次**技术迭代后**全新亮相。
- 🗺 全**高速稳定**正价节点。
- 🌏 **海外团队**，不跑路
- 🚀 线路**冗余**设计，**自动化运维**对抗各类封锁
- 👨‍🦲 团队架构师为**大厂**网络架构师
- 💰 极致**稳定**，亲民价**价格**
- 🌐 全面支持**流媒体及各AI访问**
- 🙋 7*12小时真人客服。解决您的各类问题。

🌐 官网：👉 [https://www.claudeborder.com](https://cruise.54678999.xyz/#/register?code=58q5UJZc)

### 🤖 [GPTKefu —— 与 Crisp 深度整合的 AI 智能客服平台](https://gptkefu.com)

- 🧠 深度理解完整对话上下文 + 图片识别，自动给出专业、精准的回复，告别机械式客服。
- ♾️ **不限回答数量**，无额度焦虑，区别于其他按条计费的 AI 客服产品。
- 💬 售前咨询、售后服务、复杂问题解答，全场景轻松覆盖，真实用户案例已验证效果。
- ⚡ 3 分钟极速接入，零门槛上手，即刻提升客服效率与客户满意度。
- 🎁 高级套餐免费试用 14 天，先体验后付费：👉 [立即试用](https://gptkefu.com)
- 📢 智能客服TG 频道：[@crisp_ai](https://t.me/crisp_ai)

---

## Features

- 基于性能强劲的 Rust 和 Tauri 2 框架
- 内置[Clash.Meta(mihomo)](https://github.com/MetaCubeX/mihomo)内核，并支持切换 `Alpha` 版本内核。
- 简洁美观的用户界面，支持自定义主题颜色、代理组/托盘图标以及 `CSS Injection`。
- 配置文件管理和增强（Merge 和 Script），配置文件语法提示。
- 系统代理和守卫、`TUN(虚拟网卡)` 模式。
- 可视化节点和规则编辑
- WebDav 配置备份和同步
- **Traffic 流量统计**：按进程 / 规则 / 代理链 / 域名统计流量，保留 30 天按天历史（本分支内置）

### FAQ

Refer to [Doc FAQ Page](https://clash-verge-rev.github.io/faq/windows.html)

### Donation

[捐助Clash Verge Rev的开发](https://github.com/sponsors/clash-verge-rev)

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md) for more details.

To run the development server, execute the following commands after all prerequisites for **Tauri** are installed:

```shell
pnpm i
pnpm run prebuild
pnpm dev
```

`pnpm dev` preserves the Development Channel's installed service state: an
existing service is used, while a previously uninstalled service remains
uninstalled and the app starts in Sidecar mode. Use `pnpm dev:service` to
explicitly install or update the isolated development service before launch,
or `pnpm dev:sidecar` to force the unprivileged Sidecar workflow.

## Contributors

- [Clash Verge Rev](https://github.com/clash-verge-rev/clash-verge-rev) 的维护者与所有贡献者：本分支的全部基础功能来自上游
- DaXia ([@zhengmour](https://github.com/zhengmour))：本分支维护者，提出「Traffic 流量统计」需求并验收
- DeepSeek Harness（deepseek-flash）：AI 编程助手，参与实现「Traffic 流量统计」页面、插件注入脚本与 Windows 构建脚本

Issue and PR welcome!

## Acknowledgement

Clash Verge rev was based on or inspired by these projects and so on:

- [clash-verge-rev/clash-verge-rev](https://github.com/clash-verge-rev/clash-verge-rev): 本仓库的上游，Clash Verge Rev 的全部基础功能由它提供。
- [lufficc/clash-traffic](https://github.com/lufficc/clash-traffic): 独立的多设备流量统计应用；本分支「Traffic」页面的信息结构与交互参考了它，页面本身是在本项目内重新实现的 React 组件。
- [zzzgydi/clash-verge](https://github.com/zzzgydi/clash-verge): A Clash GUI based on tauri. Supports Windows, macOS and Linux.
- [tauri-apps/tauri](https://github.com/tauri-apps/tauri): Build smaller, faster, and more secure desktop applications with a web frontend.
- [Dreamacro/clash](https://github.com/Dreamacro/clash): A rule-based tunnel in Go.
- [MetaCubeX/mihomo](https://github.com/MetaCubeX/mihomo): A rule-based tunnel in Go.
- [Fndroid/clash_for_windows_pkg](https://github.com/Fndroid/clash_for_windows_pkg): A Windows/macOS GUI based on Clash.
- [vitejs/vite](https://github.com/vitejs/vite): Next generation frontend tooling. It's fast!

## Privacy

Clash Verge Rev 不收集任何用户数据，配置与日志仅保存在本地。详见[隐私政策](./PRIVACY.md)。

Clash Verge Rev does not collect any user data; configuration and logs stay on
your own device. See the [Privacy Policy](./PRIVACY.md) for details.

## License

GPL-3.0 License. See [License here](./LICENSE) for details.
