# 一伞敦煌

敦煌纹样古伞文化馆。以传统油纸伞形制为载体，从敦煌壁画纹样中提取元素，进行新中式融合。这是现代创作，并非历史伞具或壁画原貌复原。

- Vercel 网站：https://yisan-dunhuang.vercel.app/
- GitHub Pages：https://shishujie-stone.github.io/yisan-dunhuang/

## 内容

八款敦煌纹样启发的现代伞面设计，支持旋转、开合、纹样选择和重置视角。文化区包含“缘起、形制、工艺、纹样”。文化来源见页面链接及数据中的 `_source`。

## 本地预览

运行 `python3 -m http.server 8765`，打开 `http://127.0.0.1:8765/`。请通过服务器预览，直接双击文件不能正常读取数据。

原生 HTML、CSS、JavaScript，Three.js 0.169.0 通过 CDN 加载，无需安装依赖或构建；首次访问需要联网。

`index.html` 为页面，`src/` 为模型和页面逻辑，`data/umbrellas.json` 为档案，`assets/` 为素材。AI 生成素材用于现代设计展示，不作为真实文物照片或历史复原依据。

## 自动发布

`main` 是正式发布分支。提交并推送到 `main` 后，GitHub Pages 和已关联的 Vercel 项目会分别自动部署；部署成功后，以上两个网站地址保持不变。

只在本地保存或创建 commit 不会更新网站，需要推送到 GitHub。其他分支用于开发和预览。
