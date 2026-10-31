# Offer 到手对比

> 别只看月薪，算清这个 Offer 到底涨了多少。

一个面向求职者的 Offer 收入对比工具：比较不同城市、不同公司的 Offer，扣除个税、五险一金、
工作生活成本，并考虑奖金、补贴、公积金与长期保障之后，回答四个问题——

1. 每个月真正可以自由支配的钱是多少？
2. 第一年真正可以获得多少钱？
3. 稳定以后，每年真正可以获得多少钱？
4. 为了更高的现金收入，我获得或牺牲了多少公积金及长期保障？

**技术栈**：React 18 + TypeScript + Vite 5 + Tailwind CSS 3，纯前端本地计算，无需登录、无需后端。

---

## 快速开始

```bash
npm install
npm run dev      # 开发模式 http://localhost:5173
npm run build    # 构建单文件产物 dist/index.html（已内联 JS/CSS，双击即可离线打开）
npm run sanity   # 计算引擎自测（个税表 / 基数截断 / 试用期 / 差异拆解一致性 / 谈薪反推等）
```

仓库内已提供构建好的单文件版：`Offer到手对比-单文件版.html`（同内容备份在 `docs/index.html`，供 GitHub Pages 使用），直接用浏览器打开即可。

## 在线使用

- 仓库地址：<https://github.com/atwu5/offer-compare>
- 网页版（GitHub Pages，由 `docs/index.html` 提供）：<https://atwu5.github.io/offer-compare/>
  - 若链接未生效：仓库 Settings → Pages → Source 选择 `main` 分支 `/docs` 目录，保存即可。

---

## 目录结构

```
src/
├── types.ts                     # Offer / CityPolicy / OfferResult 等核心数据模型
├── data/
│   ├── cityPolicies.ts          # 城市政策数据（与计算逻辑完全分离，当前为演示数据）
│   └── defaults.ts              # 默认 Demo Offer（广州 20k vs 深圳 25k）
├── utils/
│   ├── socialInsuranceCalculator.ts   # 养老/医疗/失业：基数解析（超限明确提示）+ 年度缴费
│   ├── housingFundCalculator.ts       # 公积金：比例区间校验 + 个人/单位年度缴存
│   ├── incomeTaxCalculator.ts         # 个税：综合所得年度汇算口径 + 年度税率表
│   ├── offerCalculator.ts             # 主引擎：三个钱包、首年/稳定年、差异拆解、规则型结论
│   ├── reverseCalculator.ts           # 谈薪反推：二分法求目标实际涨幅所需最低月薪
│   └── money.ts                       # 格式化与数值工具
└── components/
    ├── OfferForm.tsx            # Offer 输入（含补贴、试用期、五险一金高级设置、生活成本）
    ├── ComparisonSummary.tsx    # 核心对比结论（名义涨薪 vs 实际涨幅）
    ├── ScenarioTable.tsx        # 保守 / 正常 / 乐观 场景对比
    ├── WalletCards.tsx          # 三个钱包：可支配现金 / 公积金账户 / 长期保障
    ├── DifferenceBreakdown.tsx  # 「为什么差这么多」瀑布账单
    ├── CalculationDetails.tsx   # 完整明细表，每行可展开「查看计算依据」
    ├── PolicyDrawer.tsx         # 城市政策参数抽屉
    └── SalaryReverseCalculator.tsx  # 谈薪反推
```

## 关键设计

- **城市政策与计算代码分离**：所有比例、基数上下限都在 `data/cityPolicies.ts` 的 `cityPolicies`
  数据结构中，更新政策只改数据、不改计算逻辑。
- **默认简单，高级可展开**：默认只填求职者知道的信息（城市、月薪、发薪月数、奖金、试用期、补贴），
  五险一金参数由城市政策自动带出；需要时再切换「我知道具体缴费基数」手动覆盖。
- **不静默截断**：缴费基数超出政策上下限时，按上下限计算并明确提示
  「你输入 40,000 元，根据当地政策，本项实际计费基数按 35,000 元计算」。
- **个税口径**：全年综合所得「年度汇算」口径（60,000 基本减除 + 五险一金个人 + 专项附加扣除 × 12），
  年终奖并入综合所得；口径在「计算依据与口径」与每条明细中均有说明，不做看似精确实则错误的模拟。
- **三个钱包**：可支配现金 / 公积金账户年度增加（个人+单位）/ 长期保障（养老基数与缴费，不折算成金额）。
  单位社保缴费只作为长期保障投入展示，不计入个人收入。
- **首年 vs 稳定年**：首年计入试用期折扣、签字费、一次性补贴；稳定年排除所有一次性项目。
- **每一条结果可解释**：明细表每行展开可见「基数 × 比例 = 金额」、参数、政策版本、数据更新时间与来源。
- **多 Offer 预留**：数据模型为 `offers: []` 数组，MVP 界面仅渲染 A / B。

## ⚠️ 政策数据状态（重要）

当前内置的广州 / 深圳 / 上海 / 北京 / 杭州 / 珠海 / 成都政策参数均为 **演示数据（未核验）**，
页面多处有明确标注，请勿作为真实缴费依据。

接入真实政策的步骤（只改 `src/data/cityPolicies.ts`）：

1. 从当地人社局 / 住房公积金中心官网获取当年政策原文；
2. 更新对应城市的比例与基数，并填写 `effectiveDate / updatedAt / sources`；
3. 将该城市的 `demo: false`、`verified: true`；
4. 无需改动任何计算代码。

## 已实现功能（对照需求）

**P0 全部完成**：Offer A/B 输入、城市选择、月薪、发薪月份、奖金（金额/月数）、试用期折扣、
五险一金（默认估算 + 手动基数）、个人所得税、工作成本、首年收入、稳定年收入、可支配收入、
公积金账户增加、名义涨薪、实际涨薪、差异拆解、查看计算依据、城市政策抽屉、
交换/重置、实时计算、响应式适配、错误处理（缺工资/异常月份/超限/无政策城市/过期提示）。

**P1 已完成**：保守/正常/乐观场景、多个现金补贴（发放方式/持续/确定性/确认计入）、
谈薪反推（二分法）、人才补贴（作为「可能获得」补贴，默认不计入、勾选确认后才计入）。
Offer C 已在数据模型层预留，界面暂未开放。

---

## 抖音小程序版（`douyin-miniprogram` 分支）

在 Web 版之外，本分支新增了同一产品的抖音小程序实现：**计算引擎与 Web 版逐字同源，UI 用抖音小程序原生 DSL 重写**。

### 目录结构

```
miniprogram/            # 抖音开发者工具直接打开的目录（编译产物 + 模板，打开即可运行）
miniprogram-src/        # TypeScript 源码（页面逻辑 + 计算引擎副本）
├── engine/             # 与 src/{types.ts, utils, data} 逐字同源的计算引擎
├── typings/mini.d.ts   # 抖音小程序最小环境声明
├── pages/index/        # 主页面：Offer 输入 + 实时对比结果（单页长滚动，与 Web 版结构一致）
└── pages/policy/       # 城市政策参数页
scripts/sanity.mini.ts  # 针对小程序引擎副本的自测（npm run mini:sanity）
```

### 快速开始

1. 在抖音开放平台注册小程序，获取 appid；
2. 用「抖音开发者工具」导入本仓库的 `miniprogram/` 目录；
3. 把 `miniprogram/project.config.json` 里的 `appid` 换成自己的 appid；
4. 预览 / 真机调试即可。全部计算在端上本地完成，无网络请求、无登录。

### 开发流程

```bash
# 修改 miniprogram-src/ 下的 TS 源码后：
npm run mini:build     # tsc 编译到 miniprogram/（同时做全量类型检查）
npm run mini:sanity    # 计算引擎自测（与 Web 版 sanity 同一套断言）
```

`miniprogram/**/*.js` 是 tsc 构建产物，随仓库提交，保证开发者工具打开即可运行；**不要手改**，
统一改 `miniprogram-src/` 后重新 build。

### 与 Web 版的功能对照

- **已实现**：Offer A/B 全量输入（城市 / 月薪 / 发薪月数 / 固定与浮动奖金 / 试用期 / 五险一金估算与手动基数 /
  公积金比例 / 专项附加扣除 / 多补贴 / 生活成本）、交换与重置、三场景 × 首年 / 稳定年切换、核心结论、
  场景表、三个钱包、差异瀑布、可展开的完整明细与计算依据、谈薪反推、计算口径说明、城市政策页。
- **差异**：政策原文外链改为「复制链接」到剪贴板（小程序环境限制）；输入暂不做本地缓存（与 Web 版行为一致）；
  政策数据仍为演示数据（见上文「政策数据状态」）。

### 引擎同步说明

`miniprogram-src/engine/` 是 `src/` 计算引擎的逐字拷贝。修改 Web 版引擎逻辑后，需要把改动同步到该副本并
重新 `npm run mini:build`。本分支同时修复了 `fmtWan` 的万元换算错误（此前 21 万会被显示为「¥2.1万」），
该修复对 Web 版与小程序版同时生效。
