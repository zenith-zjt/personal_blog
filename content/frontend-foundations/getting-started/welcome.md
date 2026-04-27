---
title: 欢迎页搭建说明
description: 介绍知识库首页、内容树和资源目录约定。
updatedAt: 2026-04-27
---

# 欢迎页搭建说明

这个示例文章用于验证阶段 1 的三项核心能力：

1. 能扫描 Markdown 文件
2. 能生成知识库树结构
3. 能把相对图片路径解析到同级 `resource` 目录

![结构图](arch-diagram.svg)

## 图片规则

当 Markdown 中使用 `![说明](arch-diagram.svg)` 这样的相对路径时，系统默认去当前文章同级的 `resource` 目录下寻找资源。

