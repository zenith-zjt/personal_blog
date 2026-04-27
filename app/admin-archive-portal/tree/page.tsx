import type { Metadata } from "next";

import { AdminShell } from "@/components/admin-shell";
import { requireAdminSession } from "@/lib/admin-auth";
import { getAdminKnowledgeBaseTrees, type TreeNode } from "@/lib/content";

export const metadata: Metadata = {
  title: "知识库树 | 个人博客知识库",
  description: "后台知识库树查看页。",
};

function TreeNodeList({ nodes }: { nodes: TreeNode[] }) {
  return (
    <ul className="space-y-2 border-l border-stone-300/80 pl-4 text-sm text-stone-700">
      {nodes.map((node) => (
        <li key={node.id}>
          <div className="flex items-center gap-3 rounded-2xl bg-white/70 px-3 py-2">
            <span className="text-[10px] uppercase tracking-[0.28em] text-stone-400">
              {node.type}
            </span>
            <span>{node.name}</span>
          </div>
          {node.children && node.children.length > 0 ? (
            <div className="mt-2">
              <TreeNodeList nodes={node.children} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default async function AdminTreePage() {
  await requireAdminSession();
  const libraries = await getAdminKnowledgeBaseTrees();

  return (
    <AdminShell
      title="后台知识库树结构"
      description="这里展示后台可见的完整知识库文件结构，包含前台隐藏但资源解析需要依赖的 `resource` 目录。"
      currentPath="tree"
    >
      <section className="rounded-[30px] border border-stone-300/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(249,246,240,0.88))] p-6 shadow-[0_30px_90px_rgba(44,36,24,0.08)] md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-stone-500">
              Tree View
            </p>
            <h2 className="mt-3 text-3xl font-semibold">当前知识库树</h2>
          </div>
          <p className="text-sm text-stone-500">
            共 {libraries.length} 个知识库
          </p>
        </div>

        <div className="mt-8 space-y-8" data-testid="admin-tree-view">
          {libraries.map((library) => (
            <section key={library.slug}>
              <div className="mb-4 rounded-[24px] border border-stone-300 bg-stone-50 px-4 py-4">
                <h3 className="text-lg font-semibold text-stone-900">
                  {library.name}
                </h3>
                <p className="mt-2 text-sm text-stone-500">{library.slug}</p>
              </div>
              <TreeNodeList nodes={library.tree} />
            </section>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
