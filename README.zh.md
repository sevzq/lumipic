<div align="center">

🌐 [English](README.md) · 中文

</div>

# LumiPic

**免费、私密、纯浏览器运行的图片工具箱 —— 每一个像素都留在你的设备上。**

[![Live](https://img.shields.io/badge/live-pic.sevzq.com-000000)](https://pic.sevzq.com/zh)
[![On-device AI](https://img.shields.io/badge/AI-100%25_%E7%AB%AF%E4%BE%A7%E8%BF%90%E8%A1%8C-7c3aed)](#技术内幕)
[![WebGPU](https://img.shields.io/badge/WebGPU-BiRefNet-c5b0f4)](#技术内幕)
[![Zero uploads](https://img.shields.io/badge/%E4%B8%8A%E4%BC%A0-%E9%9B%B6-1ea64a)](#为什么不一样)
[![License: MIT](https://img.shields.io/badge/License-MIT-3da639.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/sevzq/lumipic?style=social)](https://github.com/sevzq/lumipic/stargazers)

AI 抠图去背景、智能压缩、格式转换、精确裁剪、EXIF 清除 —— 全部在浏览器里完成。
**不上传、不注册、无水印、无限制。** 模型、编解码器、整条处理管线都跑在你自己的设备上。

**立即体验 → [pic.sevzq.com/zh](https://pic.sevzq.com/zh)**

![AI 去背景完全在浏览器内运行](assets/hero-removebg.gif)

[功能](#功能) · [为什么不一样](#为什么不一样) · [技术内幕](#技术内幕) · [本地开发](#本地开发) · [部署](#部署)

---

## 功能

| 工具 | 引擎 |
| --- | --- |
| **去背景** | BiRefNet_lite（二分图像分割 SOTA，MIT 协议）via transformers.js + WebGPU，配合快速导向滤波精修发丝级边缘 |
| **压缩** | Squoosh 同款 WASM 编码器（MozJPEG / OxiPNG / WebP / AVIF）+ TinyPNG 式调色板量化（image-q） |
| **格式转换** | 输出 PNG / JPG / WebP / AVIF —— 支持 iPhone HEIC、GIF、BMP 输入 |
| **裁剪** | 自由框选或比例预设，支持旋转/翻转，保留原始格式 |
| **清除 EXIF** | JPEG / PNG / WebP 无损容器重写 —— GPS、时间戳、设备信息全部清除，像素零改动 |

<table>
  <tr>
    <td width="50%">
      <b>压缩</b> —— 体积小 80%，肉眼无差别<br><br>
      <img src="assets/demo-compress.gif" alt="智能压缩演示" width="100%">
    </td>
    <td width="50%">
      <b>格式转换</b> —— HEIC 一步转 AVIF<br><br>
      <img src="assets/demo-convert.gif" alt="格式转换演示" width="100%">
    </td>
  </tr>
  <tr>
    <td width="50%">
      <b>裁剪</b> —— 框哪裁哪<br><br>
      <img src="assets/demo-crop.gif" alt="精确裁剪演示" width="100%">
    </td>
    <td width="50%">
      <b>清除 EXIF</b> —— 分享照片，不分享位置<br><br>
      <img src="assets/demo-exif.gif" alt="无损 EXIF 清除演示" width="100%">
    </td>
  </tr>
</table>

单次最多 60 张（每张 80 MB），滑块对比处理前后，逐张下载或打包 ZIP。
中英双语界面（`/` 与 `/zh`）。

## 为什么不一样

大多数「免费在线图片工具」会把你的照片传到服务器、排队、打水印，或者每天限量。
LumiPic 从**架构上**就做不了这些事：

- **零上传。** 图片只进入页面内的 Web Worker，永远不离开标签页。
  服务端根本没有上传接口，只提供静态文件。
- **模型自托管，无第三方 CDN。** 分割模型（`public/models/`）和 ONNX
  运行时（`public/ort/`）都由同源提供，首次访问后全部缓存 —— 断网也能用。
- **SOTA，不是玩具。** BiRefNet 是当前开源二分分割的最强模型；压缩用的是
  Squoosh 背后同一批编解码器。
- **永久免费。** 无账号、无水印、无每日额度 —— 因为没有服务器成本，也就没有收费的理由。

![零上传、100% 端侧、永久免费](assets/demo-privacy.gif)

## 技术内幕

```
拖入图片 ──▶ Web Worker（comlink RPC）
              ├─ 去背景    BiRefNet_lite fp16 · WebGPU · transformers.js
              │            └─ 导向滤波在原始分辨率精修边缘
              ├─ 压缩      MozJPEG / OxiPNG / WebP / AVIF WASM（+ image-q 调色板量化）
              ├─ 转换      HEIC / GIF / BMP 输入 → PNG / JPG / WebP / AVIF 输出
              └─ 清 EXIF   无损容器重写
                    ▼
           透明 PNG / 优化后的文件 —— 直接回到你的磁盘
```

### 为什么用 512 模型（而不是 1024）

应用只内置一份 BiRefNet_lite 计算图：**512px 重导出版**（最多 7 个 storage
buffer），能在所有 WebGPU 适配器上运行。1024px 版经过完整调查，在浏览器里会
撞上两堵互相独立的墙——**且与操作系统无关**：

1. **Storage buffer 上限** —— 图中含有巨型 `Concat`（最多 1024 个输入）和
   `Split`（32 个输出）节点，某个着色器需要 11 个 storage buffer，而 macOS
   Metal 只暴露 10 个。这一堵可以用图手术解决（`scripts/patch-onnx-webgpu.py`
   把这些节点重写成 ≤ 8 的树状结构，已验证与原模型逐像素一致），但接着是：
2. **WASM 内存墙** —— 模型的可变形卷积采样算子（`ScatterND` / `GatherND`）
   在 onnxruntime 的 WebGPU 后端里没有实现，会桥接回 CPU WASM 执行。
   1024² 分辨率下这些中间张量会耗尽 32 位 WASM 堆（`std::bad_alloc`），
   任何平台都一样——即使在适配器报告 44 个 storage buffer 的 Safari 里也复现。
   512² 则绰绰有余。

实际观感差距本来就很小：导向滤波精修始终在**原始分辨率**运行，发丝级边缘
两个档位都能保住（同一管线下 512 与 1024 的 A/B 对比只有边缘光晕的细微差异）。
访问部署站点的 `/gpu-check.html` 可查看你的适配器参数。

### 技术栈

- **Next.js 16**（App Router，standalone 输出）+ TypeScript + Tailwind CSS v4
- **Motion**（framer-motion v12）—— 弹簧物理 UI 动画
- **next-intl** —— 中英双语，基于路径的路由
- **zustand + comlink** —— 状态管理与 worker RPC
- **COOP / COEP** 响应头 —— 跨源隔离，启用多线程 WASM
- **Remotion** —— 落地页演示视频是用 React 渲染的合成（`remotion/`）

## 本地开发

```bash
pnpm install            # 同时把 ONNX 运行时复制到 public/ort
pnpm fetch:models       # 一次性下载约 95 MB 模型到 public/models
pnpm dev
```

落地页演示视频是 Remotion 合成：

```bash
pnpm demos:studio       # 实时编辑动画
pnpm demos:render       # 重新渲染所有 mp4 到 public/demos
```

## 部署

[Dockerfile](Dockerfile) 在构建时下载模型并运行 standalone Next 服务 ——
任何能跑容器的地方都能部署。以 [Railway](https://railway.app) 为例：

```bash
railway up --service web
```

`pic.sevzq.com` 是指向 Railway 服务的 Cloudflare 代理 CNAME。

## 设计

「Figma 编辑风」—— 白色画布上的黑白界面骨架，每个工具一个粉彩色块
（丁香紫 / 青柠 / 珊瑚 / 薄荷 / 奶油），Inter 字体紧凑排印，
所有出现透明度的地方都用棋盘格呈现。

## 参与贡献

欢迎 Issue 和 PR。如果 LumiPic 帮你省掉了一次上传，
**[⭐ 给仓库点个星](https://github.com/sevzq/lumipic)** —— 能帮更多人找到它。

## 协议

[MIT](LICENSE) © SevenZhang
