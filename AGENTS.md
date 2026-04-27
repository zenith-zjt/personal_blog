# Personal Blog Project Agents Guide

## Scope

This repository is a personal blog and knowledge-base product built with Next.js App Router.
When the user asks for documentation-only work, do not change application code unless explicitly requested.

## Next.js Rule

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. APIs, conventions, and file structure may all differ from your training data.
Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.
Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

Current local framework baseline:
- `next@16.2.4`
- `react@19.2.4`
- `react-dom@19.2.4`

Default architecture assumptions:
- Use `app/` and App Router conventions.
- Prefer Server Components by default.
- Use Route Handlers in `app/**/route.ts` for HTTP APIs.
- Keep non-route utilities in private folders such as `_lib`, `_components`, `_services`.

## Product Context

The product has two major surfaces:
- Public frontend for article and knowledge-base browsing. No login is required.
- Hidden admin backend for a single administrator account.

Core content model:
- A knowledge base is a directory tree.
- Articles are Markdown files.
- Article images are read from a sibling `resource/` folder by default.
- The `resource/` folder must be excluded from frontend tree navigation.

## Admin Constraints

- There is only one administrator account.
- Default credential baseline is `admin / admin`.
- The backend must provide password and username change capability.
- The backend entry must not be exposed in public navigation, footer, sitemap copy, or obvious page links.
- Article creation is file upload based only. Do not design or implement a rich text editor unless the user explicitly changes scope.

## Content and File Rules

- Treat Markdown files as the source of truth for article content.
- Preserve nested directory structure because it drives the knowledge-base tree.
- Uploaded images should remain colocated with their article through the sibling `resource/` directory convention.
- Any tree-building logic must filter out `resource` folders from visible navigation while still resolving image assets from them.

## Frontend Design Rule

When building or changing UI, use the `frontend-design` skill guidance:
- Avoid generic blog layouts.
- The public knowledge-base view should feel closer to a documentation workspace or IDE file tree than a marketing blog.
- Typography, spacing, color, and motion should be intentional and distinctive.
- Preserve usability on desktop and mobile.

## Delivery Rule

Before editing code or architecture-sensitive docs:
1. Inspect repository structure.
2. Read the relevant local Next.js docs under `node_modules/next/dist/docs/`.
3. Check for existing project docs in `docs/`.
4. Avoid reverting unrelated user changes.
