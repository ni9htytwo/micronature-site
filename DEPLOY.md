# microNature 双语站点 · 部署说明

Issue 2026.08 · 本目录即最终成品，可直接作为仓库根目录内容上传。

---

## 一、这个包是什么

六页中文加六页英文，共十二个 HTML，配六个共用的 CSS 与 JS。所有文件都是最新版，五个批次里的历次改动已经全部合并进来，不需要再从任何一批消息里补文件。

```
micronature-site/            ← 内容对应仓库根目录
├─ index.html                MN-00  架构与主张
├─ about.html                MN-02  我们
├─ environmentaffordance.html EA-01 产品
├─ insight.html              MN-A1  思考
├─ atlas.html                EA-03  场景图鉴
├─ map.html                  EA-02  地图样例
│
├─ site.css                  全站样式，新增 .nav-lang 语言开关
├─ site.js                   全站脚本，按 <html lang> 切 UI 文案与术语表
├─ atlas.js                  场景图鉴脚本，同样按 lang 切文案
├─ demo.css                  未改动
├─ atlas.css                 未改动
├─ atlas-base.css            未改动
│
├─ en/                       英文版，必须是根目录下的子目录
│  ├─ index.html
│  ├─ about.html
│  ├─ environmentaffordance.html
│  ├─ insight.html
│  ├─ atlas.html
│  └─ map.html
│
├─ check_site.py             上线前自检脚本，只读
└─ DEPLOY.md                 本文件
```

`check_site.py` 与 `DEPLOY.md` 上传与否都行，留着不影响页面。

---

## 二、必须遵守的两条结构约定

**其一，`en/` 必须是子目录，不能把英文页平铺到根目录。**英文页通过 `../site.css`、`../site.js`、`../atlas.js` 引用样式与脚本，一旦移到根目录，这些相对路径全部指向上一级，样式会整体丢失。

**其二，六个 CSS/JS 只有一份，中英共用。**不要在 `en/` 里再放一份副本。`site.js` 与 `atlas.js` 读取页面的 `<html lang>` 属性决定用中文还是英文文案，两份副本会造成后续维护时改了一份忘了另一份。

---

## 三、上传步骤

1. 备份现有仓库，或者先开一个分支。
2. 把本目录下的六个 HTML、六个 CSS/JS 覆盖到仓库根目录。
3. 把 `en/` 整个目录放到仓库根目录下。
4. 在仓库根目录执行 `python3 check_site.py`，确认输出末行为「全部通过，可以上传」。
5. 提交并推送。GitHub Pages 会自动重新发布。

覆盖前后文件数对照：仓库根目录应从 12 个文件（6 HTML + 6 CSS/JS）变成 12 个文件加一个 `en/` 目录。除 `en/` 外没有新增任何文件，也没有删除任何文件。

---

## 四、上线后逐项确认

打开 `https://<你的域名或 GitHub Pages 地址>/`，按下列顺序看一遍。

1. 导航条右端出现「中 / EN」开关，与其余栏目之间有一条竖细线。
2. 点 EN，跳到 `/en/index.html`，样式正常，正文全英文。
3. 在英文页点「中」，跳回对应的中文页，而不是回首页。
4. 六个页面逐一往返一次，确认没有一页跳错目标。
5. 打开 `/en/map.html`，点四个本体按钮各一次，确认主图、矩阵、数据表、统计与图签栏全部刷新为英文，判定分布应为
   WR-220 六可用两有条件七不可用、QR-X4 九可用一有条件五不可用、UAV-M6 二可用三有条件二不可用八不适用、CL-P2 二可用十三不适用。
6. 打开 `/en/atlas.html`，滚到 DS-04，拖动三个滑块，确认画布上的读数与判定说明是英文。
7. 打开 `/en/atlas.html` 的 DS-02，点播放，确认动画按钮显示 Pause 而不是「暂停」。
8. 手机上打开任一英文页，确认导航条可横向滚动、语言开关不被挤掉。

第 5、6、7 三项是这次改动风险最集中的地方，务必实际点一遍。

---

## 五、还没做的事

**hreflang 目前是相对路径。**每个页面头部有三行 `<link rel="alternate" hreflang=...>`，现在填的是 `index.html`、`en/index.html` 这类相对地址。域名固定之后建议换成绝对 URL，搜索引擎对绝对地址的识别更稳。十二个页面各改三行。

**三处中文原稿的问题尚未处理。**这三处英文版已各自绕开或按理解处理，中文版还是原样：

- `environmentaffordance.html` 第 03 节正文写「兼容鸿蒙」，但 `site.js` 术语表里「国产 CPU 全架构」那一条只写到 UOS 与麒麟 OS，两处口径不一致。
- `environmentaffordance.html` 第 05 节「检修间隙逐条实测」可以两读，英文版按「检修通道的间隙尺寸」处理。
- `insight.html` 的 A1 小节标题写「三条不同步的曲线」，正文第一段说的是「两条曲线」，FIG.A1 画的也是两条。

**`.nojekyll` 可加可不加。**本站没有以下划线开头的文件或目录，不加也能正常发布。加上可以略微加快 Pages 构建。
