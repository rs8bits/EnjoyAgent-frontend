# 文件处理与成果交付：本地浏览器验收

验收日期：2026-11-03。环境：本地 Chrome、Vue/Vite、Spring Boot、Docker Sandbox Manager、PostgreSQL、Redis、MinIO。

使用独立数据库 schema、虚构演示用户及销售数据；模型调用使用仅监听本机的确定性 OpenAI 兼容模拟服务，不使用真实模型密钥。文档处理、SQL、容器生命周期和存储均调用实际服务。

## 验收结果

| 场景 | 操作与验证 | 结果 |
| --- | --- | --- |
| 登录与页面导航 | 从登录页进入演示工作区，打开文件工作台、聊天工作台和工作流画布 | 通过 |
| CSV 分组汇总 | 浏览器选中 sales.csv，运行 Excel / CSV 分析，按 category 分组，对 amount 求和 | 通过：华东 2000、华北 900、华南 1500，合计 4400 |
| 执行结果 | 浏览器打开任务详情，检查 stdout、stderr、退出码、耗时、CPU 和采样峰值内存 | 通过：退出码 0，734 ms，CPU 0.420 s，采样峰值内存 45.1 MB；数值仅代表本次运行 |
| 成果清单 | 查看 result.csv、result.xlsx、summary.json 及文件类型、大小和生成步骤 | 通过 |
| 表格预览 | 浏览器点击 result.xlsx 的预览按钮 | 通过：展示三行汇总结果 |
| 原文件下载 | 浏览器点击“下载原文件”，读取本地下载的 result.xlsx 校验内容 | 通过：三组数据及总额一致 |
| 聊天附件与成果展示 | 接口准备带 sales.csv 附件的会话并完成真实沙箱工具调用，浏览器打开历史会话 | 通过：显示输入附件、分析回复和可预览/下载的成果卡片 |
| 沙箱工作流 | 浏览器点击“运行测试”，执行开始 → Python 读取文件 → SQL 分组汇总 → 交付分析成果 | 通过：两次沙箱任务成功，最终输出含三个成果，执行历史显示成功 |
| 浏览器错误日志 | 检查上述页面操作期间采集的控制台 error 日志 | 未发现错误 |

## 范围与限制

- 输入为四行虚构销售记录。本次浏览器验收重点是任务执行、资源展示、预览、下载及工作流串联；PDF、LibreOffice 等处理能力的接口和容器验收脚本位于后端仓库 `scripts/`，不由这些截图证明。
- Chrome 扩展未启用“Allow access to file URLs”，自动附件上传被扩展阻止。因此本轮未完成浏览器文件选择器上传验收；附件由接口上传后用于会话展示和真实沙箱执行。未改动浏览器扩展权限。

## 截图

- [文件工作台](../images/file-delivery-workspace.jpg)
- [任务日志与成果](../images/sandbox-task-details.jpg)
- [Excel 预览](../images/artifact-table-preview.jpg)
- [工作流执行](../images/sandbox-workflow-run.jpg)
