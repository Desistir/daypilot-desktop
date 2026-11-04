# DayPilot

Windows 本地任务管理工具，采用 React、Electron 和 SQLite。支持桌面主窗口、贴边组件、静音弹窗、任务历史、次数目标、日历及本地 MCP。

公开版本首次启动为空数据库，不含任何个人任务。默认时区为 Asia/Shanghai。

## 当前状态

这是早期个人项目，尚未完成正式发布验收。尚未获得 SignPath 签名资格，也没有已签名的公开发行版。Windows 智能应用控制可能阻止未签名程序。请保留系统保护，不把当前构建描述为可信签名发行版。

## 开发

需要 Windows 10/11 x64、Node.js 24 和 npm。

```sh
npm ci
npm test
npm run build
npm start
```

`npm run portable` 生成免安装目录 `artifacts/win-unpacked`，不生成安装器。当前产物未签名；获得签名服务批准后才接入正式签名流程。保留整个运行目录。

关闭主窗口会保留托盘进程；完全退出请用托盘菜单。侧签点击图标展开，拖动空白区域后吸附屏幕边缘。开机自启由用户在设置中启用，登录后后台运行。卸载时先关闭自启、从托盘退出，再删除程序目录；数据目录单独保留，除非用户明确决定删除。

## 数据与隐私

任务数据库位于 `%APPDATA%/daypilot-desktop/daypilot.sqlite`，手动备份位于旁边的 backups。更新不重置数据库；恢复备份前完全退出桌面及 MCP 进程。未来破坏性迁移必须先备份。

应用不主动上传任务或使用云分析。MCP 仅按用户配置接入本地客户端，客户端可能读取任务，请仅连接信任的工具。完整说明见 [Privacy policy](PRIVACY.md)。

## 本地 MCP

以本地 Node 运行 `desktop/mcp.cjs`，使用 stdio。环境变量 `DAYPILOT_DB` 可指定数据库绝对路径。支持任务查询、创建、修改、逐次完成目标与备份。未知进度必须先确认。

## 质量边界

自动测试覆盖日期分级、SQLite 持久化、次数目标、MCP 和贴边几何。多屏实际拖动、Windows 10、休眠及真实重启自启仍需设备验收。七天色阶是本项目设计，不代表其他应用规范。

## Code signing policy

参见 [Code signing policy](CODE_SIGNING.md)。签名申请尚未提交，审核结果及时间均不保证。

## 许可证

本项目源码采用 MIT。第三方组件维持原许可证；图标沿用 Electron 原图标，见 [第三方说明](THIRD_PARTY_NOTICES.md)。DayPilot 是本项目名称，不代表与其他同名产品有关联。
