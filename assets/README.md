# 敦煌古伞项目正式素材清单

本目录是后续网页引用的统一入口，共20张正式图片（PNG / WebP），另保留1张旧背景。按实际画面内容命名，全小写英文、数字及连字符，不含空格。文件名、manifest.json及本清单保持一致。原assets/目录保留原稿、历史版本、提示词和制作说明。

## 设计思路

伞面采用有洞窟出处的敦煌纹样进行现代圆形改编，不称为敦煌古伞或壁画原样复原。八款分别标注来源洞窟和时期，配色与构图调整属于设计。

伞面使用统一2048×2048画布，圆心(1024,1024)，直径1720像素，四边各164像素透明边，纯平面，无伞体、人物、文字或水印。对称服从各自题材，不将单龙、单狮或不同瓣数结构强称为八重对称。

材质是可四向平铺的1024×1024竹、木基础色贴图；当前背景为1672×941石窟柔光氛围图，另保留2560×1440旧背景；分享封面是1200×630逆光油纸伞，左侧留白；工艺插画是八张1024×1024敦煌配色工艺示意，保留各步骤主体，不作为某个朝代的工艺实录。工艺图中包含匠人，封面包含完整伞体，与平面伞面贴图用途不同。

## 引用方式

manifest.json中的path相对于本目录。后续网页应使用清单中的路径，禁止从文件名推测或拼写另一套名称。编号是稳定索引，中文名称用于界面展示。

|编号|名称|准确相对路径|尺寸|
|---|---|---|---|
|P01|三兔莲华|`patterns/mogao-407-three-hares-lotus.png`|2048×2048|
|P02|忍冬缠枝|`patterns/mogao-285-honeysuckle.png`|2048×2048|
|P03|盘茎莲华|`patterns/mogao-390-stemmed-lotus.webp`|2048×2048|
|P04|青空卷莲|`patterns/mogao-329-cloud-lotus.png`|2048×2048|
|P05|葡萄石榴|`patterns/mogao-209-grape-pomegranate.png`|2048×2048|
|P06|盛唐团花|`patterns/mogao-320-composite-flower.png`|2048×2048|
|P07|狮子莲华|`patterns/mogao-85-lion-lotus.png`|2048×2048|
|P08|团龙鹦鹉|`patterns/mogao-61-dragon-parrots.png`|2048×2048|
|T01|竹材质|`textures/bamboo-rib.webp`|1024×1024|
|T02|木材质|`textures/wood-handle.webp`|1024×1024|
|C01|选竹|`craft/bamboo-selection.webp`|1024×1024|
|C02|劈竹|`craft/bamboo-splitting.webp`|1024×1024|
|C03|钻孔|`craft/rib-drilling.webp`|1024×1024|
|C04|穿线组架|`craft/frame-assembly.webp`|1024×1024|
|C05|裱纸|`craft/paper-mounting.webp`|1024×1024|
|C06|绘纹|`craft/pattern-painting.webp`|1024×1024|
|C07|刷桐油|`craft/tung-oil-coating.webp`|1024×1024|
|C08|晾晒|`craft/umbrella-drying.webp`|1024×1024|
|B01|敦煌石窟内柔光背景|`misc/dunhuang-cave-interior-background.webp`|1672×941|
|S01|敦煌分享封面|`misc/dunhuang-umbrella-cover.webp`|1200×630|

## 校验

每张图片已重新解码并核对尺寸。8张伞面纹样已将圆外白底改为透明，圆心(1024,1024)、直径1720像素；圆边做平滑过渡，圆内原有颜色和细节保留。其他素材未改动。manifest.json中的SHA-256已更新为当前文件的校验值。

处理前的8张原图及原清单已完整备份至 `[local-backup-not-published]`，并验证备份可读取且与处理前文件一致。不要直接运行旧的生成或标准化脚本覆盖这里的正式文件；后续替换需同步更新清单及校验值。

## 2026-10-19 上线前压缩

超过500000字节的14张图片已转换为WebP，尺寸不变。盘茎莲华使用无损压缩，RGBA像素完全一致；其余13张使用质量92的高质量压缩。透明区域保留。7张原本较小的PNG未修改。旧背景保留为 `misc/dunhuang-desert-background.webp`，不作为当前B01。

原图备份：`[local-backup-not-published]`，已校验可读取且与压缩前文件逐一一致。manifest中的source为历史原稿标识，运行时只读取path。
