# 个人博客知识库系统设计规范

## 1. 设计目标

本文档定义系统的信息架构、交互规范、视觉方向、技术实现约束与数据组织规范。技术方案基于 `Next.js 16 App Router`，视觉方向遵循 `frontend-design` skill 的要求，避免做成普通营销页或传统流水博客。

## 2. 设计总原则

- 以知识库为主入口，而不是时间流。
- 导航优先，内容次之，减少“找文章”的成本。
- 前台像文档工作台，后台像轻量内容控制台。
- 界面应克制、专业、偏工具化，而不是花哨资讯站。
- 视觉上应接近“编辑器左栏 + 阅读主区”的工作流体验。

## 3. 视觉方向

建议风格：`editorial workspace`

关键词：
- 安静
- 结构化
- 专注
- 理性
- 可读性优先

视觉建议：
- 使用带个性的衬线标题字体搭配中性正文无衬线字体。
- 颜色以纸感浅底或轻灰底为主，辅以深墨色文字和有限强调色。
- 树形导航的交互反馈应清晰，但不要做成重后台系统风格。
- 页面层次主要依赖留白、边界线、缩进和字重，而不是大面积艳色块。

明确避免：
- 紫白渐变 SaaS 风。
- 大卡片瀑布流博客风。
- 过度营销化 Hero。
- 默认系统字体和毫无辨识度的模板布局。

## 4. 信息架构

## 4.1 前台结构

建议路由结构：

```text
/
/kb/[library]
/kb/[library]/[[...slug]]
/search
```

说明：
- `/`：知识库集合首页。
- `/kb/[library]`：某知识库根页，可展示简介与默认文档。
- `/kb/[library]/[[...slug]]`：文章详情路由，支持多级目录。
- `/search`：独立搜索页，或由顶栏搜索面板承载。

## 4.2 后台结构

建议隐藏后台使用非语义化独立路径，不在前台暴露。

建议路由结构：

```text
/admin-archive-portal/login
/admin-archive-portal
/admin-archive-portal/upload
/admin-archive-portal/tree
/admin-archive-portal/account
```

说明：
- 后台路径不建议使用公开导航可猜测入口如 `/admin`。
- 具体路径可在开发阶段最终确定，但必须固定且不在前台暴露。

## 5. 页面规范

## 5.1 知识库首页

页面目标：
- 让用户先选知识库，再进文章。

页面构成：
- 顶部品牌区。
- 搜索入口。
- 知识库列表区。
- 最近更新或推荐阅读区。

交互规则：
- 卡片或列表都可以，但重点是快速识别知识库主题。
- 支持显示文章数量和更新时间。

## 5.2 知识库详情页

页面布局建议：
- 左侧：树形导航。
- 中间：文章正文。
- 顶部或右上：搜索、面包屑、文章元信息。

交互规则：
- 左侧导航宽度固定或可拖拽为后续增强项。
- 当前路径自动展开。
- 移动端左栏改为抽屉。

## 5.3 搜索

交互形态建议：
- 顶部全局搜索输入框。
- 桌面端可弹出命令面板式结果层。
- 移动端建议使用独立搜索页或全屏层。

结果字段：
- 文章标题
- 所属知识库
- 所属目录
- 摘要片段

## 5.4 后台上传页

页面目标：
- 极简且稳定，不做编辑器。

页面构成：
- 目标知识库/目录选择器
- Markdown 文件上传区
- 图片资源上传区
- 上传结果反馈区

规则：
- 必须明确展示支持的文件类型。
- 明确提示图片默认归档到同级 `resource` 目录。

## 5.5 后台知识库树页

页面目标：
- 帮管理员确认当前内容结构与资源目录关系。

规则：
- 后台树允许显示 `resource`。
- 目录、Markdown、图片资源三类节点样式应有区分。

## 5.6 后台账号页

页面目标：
- 允许管理员更新用户名与密码。

规则：
- 修改密码必须要求旧密码。
- 显示密码强度或规则提示。

## 6. 文件结构规范

建议内容目录：

```text
content/
  [knowledge-base]/
    [sub-dir]/
      article.md
      resource/
        image.png
```

解释：
- 一级目录映射知识库。
- 多级子目录映射树节点。
- `.md` 文件映射可阅读文章。
- `resource` 为文章图片资源目录。

前台树展示规则：
- 展示知识库目录
- 展示普通子目录
- 展示 Markdown 文章
- 排除 `resource`

后台树展示规则：
- 展示知识库目录
- 展示普通子目录
- 展示 Markdown 文章
- 展示 `resource`

## 7. Markdown 解析规范

- 文章正文源文件为 Markdown。
- 图片默认从文章同级 `resource` 目录读取。
- 当 Markdown 中存在图片相对引用时，应优先按当前文章目录上下文解析。
- 若后续允许 frontmatter，应至少支持：
  - `title`
  - `description`
  - `date`
  - `updatedAt`
  - `tags`

建议对缺失 frontmatter 的兼容策略：
- `title` 默认取首个一级标题，若无则取文件名。

## 8. 数据与状态规范

核心视图数据：
- KnowledgeBase：知识库元信息
- TreeNode：目录树节点
- ArticleMeta：文章摘要信息
- ArticleDetail：文章详情
- AdminProfile：管理员凭证信息

建议字段：

```text
KnowledgeBase
- id
- slug
- name
- description
- articleCount
- updatedAt

TreeNode
- id
- name
- type(directory | article | resource)
- path
- children
- hiddenInFrontend

ArticleMeta
- title
- slug
- path
- knowledgeBase
- summary
- updatedAt

ArticleDetail
- title
- content
- toc
- path
- updatedAt
- assetsBasePath
```

## 9. 技术实现规范

基于本地 Next.js 16 文档，采用以下约束：

- 使用 `app/` 路由体系。
- 页面路由由 `page.tsx` 提供。
- HTTP 接口由 `route.ts` 提供。
- 后台认证、上传、树查询建议走 Route Handlers。
- 默认优先 Server Components，只在交互必要处使用 Client Components。
- 非路由实现代码放在私有目录如 `_lib`、`_components`、`_services`。

推荐目录草案：

```text
app/
  (public)/
    page.tsx
    kb/
      [library]/
        [[...slug]]/
          page.tsx
    search/
      page.tsx
  admin-archive-portal/
    login/
      page.tsx
    upload/
      page.tsx
    tree/
      page.tsx
    account/
      page.tsx
  api/
    admin/
      login/
        route.ts
      upload/
        route.ts
      tree/
        route.ts
      account/
        route.ts
```

说明：
- `(public)` 可用于组织前台路由且不影响 URL。
- 后台单独分段，避免与前台共享布局和导航。

## 10. 安全规范

- 前台不显示后台入口。
- 后台仅允许单管理员访问。
- 默认 `admin / admin` 只作为初始化凭证。
- 系统应明确引导管理员尽快修改默认凭证。
- 后台所有接口都必须校验登录态。
- 上传接口必须限制文件类型、大小和目标路径。

## 11. 可用性规范

- 树形导航需要有清晰展开态、收起态、当前选中态。
- 搜索输入需支持键盘操作。
- 页面正文排版应确保长文阅读舒适。
- 移动端需保证文章阅读优先，导航次级展开。

## 12. 响应式规范

- 桌面端：三段式优先，左树中正文为核心。
- 平板端：左树可收窄，正文保持主导。
- 手机端：导航抽屉化，正文全宽展示。

## 13. 无障碍与基础 SEO

- 导航树需支持语义化层级与键盘可达。
- 搜索控件应具备可读标签。
- 文章页需输出清晰标题和描述元信息。
- 预留 `sitemap` 与 `robots` 的实现位置。

## 14. 设计验收标准

- 首页默认进入知识库集合，而非普通博客流。
- 知识库详情明显采用“树导航 + 阅读区”结构。
- 前台树不显示 `resource`。
- 后台树可显示 `resource`。
- 后台路径不在前台可见区域暴露。
- 上传页无在线编辑器，仅保留文件上传能力。
- 整体风格呈现为结构化知识工作台，而不是通用模板博客。
