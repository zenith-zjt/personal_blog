"use client";

import type { DragEvent } from "react";
import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  adminDeleteSelectedNodeAction,
  adminMoveTreeNodeAction,
  type AdminUploadFormState,
} from "@/app/admin-archive-portal/actions";
import {
  AdminCreateDirectoryForm,
  AdminCreateKnowledgeBaseForm,
} from "@/components/admin-structure-forms";
import { AdminTreeUploadForm } from "@/components/admin-tree-upload-form";
import type {
  AdminSelectionKind,
  KnowledgeBaseSummary,
  TreeNode,
} from "@/lib/content";

type TreeFlashStatus = "success" | "error";

type LibraryTree = KnowledgeBaseSummary & {
  tree: TreeNode[];
};

type DragState = {
  relativePath: string;
  nodeKind: AdminSelectionKind;
  parentPath: string;
};

type AdminTreeWorkspaceProps = {
  adminBasePath: string;
  libraries: LibraryTree[];
  selectedPath: string;
  selectedKind: AdminSelectionKind;
  status?: TreeFlashStatus;
  message?: string;
};

const initialState: AdminUploadFormState = {
  message: "",
  success: false,
};

function buildSelectionHref(adminBasePath: string, selected: string, kind: AdminSelectionKind) {
  const searchParams = new URLSearchParams();

  if (selected) {
    searchParams.set("selected", selected);
  }

  searchParams.set("kind", kind);
  return `${adminBasePath}/tree?${searchParams.toString()}`;
}

function joinLibraryPath(librarySlug: string, nodePath: string) {
  return nodePath ? `${librarySlug}/${nodePath}` : librarySlug;
}

function getParentPath(relativePath: string, nodeKind: AdminSelectionKind) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");

  if (nodeKind === "library") {
    return "";
  }

  const parts = normalized.split("/").filter(Boolean);
  return parts.slice(0, -1).join("/");
}

function canSortNode(nodeKind: AdminSelectionKind) {
  return nodeKind === "library" || nodeKind === "directory" || nodeKind === "article";
}

function canDeleteNode(nodeKind: AdminSelectionKind) {
  return (
    nodeKind === "library" ||
    nodeKind === "directory" ||
    nodeKind === "assets" ||
    nodeKind === "article" ||
    nodeKind === "asset"
  );
}

function canDragNode(nodeKind: AdminSelectionKind) {
  return canSortNode(nodeKind);
}

function getSelectionSummary(kind: AdminSelectionKind) {
  if (kind === "library") {
    return "当前选中知识库根目录，可继续上传 Markdown、新建文件夹、调整排序或删除整个知识库。";
  }

  if (kind === "directory") {
    return "当前选中普通目录，可上传 Markdown、创建子文件夹，并且支持同级目录排序。";
  }

  if (kind === "assets") {
    return "当前选中文章 .assets 资源目录，支持多图上传，也可以直接删除整个文章资源目录。";
  }

  if (kind === "article") {
    return "当前选中文章文件，可在同一目录下调整顺序，前台展示顺序会同步更新。";
  }

  return "当前选中资源文件，可删除文件本身。";
}

function TreeNodeList({
  nodes,
  adminBasePath,
  librarySlug,
  selectedPath,
  selectedKind,
  dragging,
  dropTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  nodes: TreeNode[];
  adminBasePath: string;
  librarySlug: string;
  selectedPath: string;
  selectedKind: AdminSelectionKind;
  dragging: DragState | null;
  dropTarget: string | null;
  onDragStart: (payload: DragState) => void;
  onDragEnd: () => void;
  onDragOver: (targetPath: string, targetKind: AdminSelectionKind, event: DragEvent) => void;
  onDrop: (targetPath: string, targetKind: AdminSelectionKind, event: DragEvent) => void;
}) {
  return (
    <ul className="space-y-2 border-l border-stone-300/80 pl-4 text-sm text-stone-700">
      {nodes.map((node) => {
        const fullPath = joinLibraryPath(librarySlug, node.path);
        const nodeKind = node.type;
        const isSelected = selectedPath === fullPath && selectedKind === nodeKind;
        const isDragging = dragging?.relativePath === fullPath;
        const isDropTarget = dropTarget === fullPath;

        return (
          <li key={node.id} data-testid={`tree-node-${encodeURIComponent(fullPath)}`}>
            <div
              draggable={canDragNode(nodeKind)}
              onDragStart={() =>
                onDragStart({
                  relativePath: fullPath,
                  nodeKind,
                  parentPath: getParentPath(fullPath, nodeKind),
                })
              }
              onDragEnd={onDragEnd}
              onDragOver={(event) => onDragOver(fullPath, nodeKind, event)}
              onDrop={(event) => onDrop(fullPath, nodeKind, event)}
              className={`rounded-2xl border px-3 py-2 transition ${
                isSelected
                  ? "border-stone-900 bg-stone-900 text-white shadow-[0_12px_30px_rgba(28,23,17,0.16)]"
                  : isDropTarget
                    ? "border-amber-500 bg-amber-50 text-stone-900"
                    : "border-transparent bg-white/70 text-stone-800"
              } ${isDragging ? "opacity-50" : ""}`}
            >
              <Link
                href={buildSelectionHref(adminBasePath, fullPath, nodeKind)}
                scroll={false}
                className="flex min-w-0 items-center gap-3"
              >
                <span
                  className={`text-[10px] uppercase tracking-[0.28em] ${
                    isSelected ? "text-stone-200" : "text-stone-400"
                  }`}
                >
                  {nodeKind}
                </span>
                <span className={`min-w-0 flex-1 break-all ${isSelected ? "text-white" : "text-stone-800"}`}>
                  {node.name}
                </span>
                {canDragNode(nodeKind) ? (
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                      isSelected
                        ? "bg-white text-black"
                        : "border border-stone-300 bg-white text-stone-600"
                    }`}
                  >
                    拖动
                  </span>
                ) : null}
              </Link>
            </div>

            {node.children && node.children.length > 0 ? (
              <div className="mt-2">
                <TreeNodeList
                  nodes={node.children}
                  adminBasePath={adminBasePath}
                  librarySlug={librarySlug}
                  selectedPath={selectedPath}
                  selectedKind={selectedKind}
                  dragging={dragging}
                  dropTarget={dropTarget}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function AdminTreeWorkspace({
  adminBasePath,
  libraries,
  selectedPath,
  selectedKind,
  status,
  message,
}: AdminTreeWorkspaceProps) {
  const router = useRouter();
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const [moveState, moveAction] = useActionState(
    adminMoveTreeNodeAction as (
      state: AdminUploadFormState,
      payload: FormData,
    ) => Promise<AdminUploadFormState>,
    initialState,
  );
  const [deleteState, deleteAction] = useActionState(
    adminDeleteSelectedNodeAction as (
      state: AdminUploadFormState,
      payload: FormData,
    ) => Promise<AdminUploadFormState>,
    initialState,
  );

  const moveFormRef = useRef<HTMLFormElement>(null);
  const movePathRef = useRef<HTMLInputElement>(null);
  const moveKindRef = useRef<HTMLInputElement>(null);
  const moveDirectionRef = useRef<HTMLInputElement>(null);
  const moveTargetRef = useRef<HTMLInputElement>(null);
  const moveTargetKindRef = useRef<HTMLInputElement>(null);

  const deleteFormRef = useRef<HTMLFormElement>(null);
  const deletePathRef = useRef<HTMLInputElement>(null);
  const deleteKindRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (moveState.redirectTo) {
      router.replace(moveState.redirectTo, { scroll: false });
    }
  }, [moveState.redirectTo, router]);

  useEffect(() => {
    if (deleteState.redirectTo) {
      router.replace(deleteState.redirectTo, { scroll: false });
    }
  }, [deleteState.redirectTo, router]);

  const expandedLibrarySlug =
    selectedPath.split("/")[0] || libraries[0]?.slug || "";
  const canCreateDirectory = selectedKind === "library" || selectedKind === "directory";
  const uploadMode = selectedKind === "article" ? "assets" : canCreateDirectory ? "directory" : null;
  const uploadTargetPath =
    selectedKind === "article"
      ? selectedPath.replace(/\.md$/, ".assets")
      : selectedPath;

  const submitMove = (options: {
    relativePath: string;
    nodeKind: AdminSelectionKind;
    direction?: "up" | "down";
    targetPath?: string;
    targetKind?: AdminSelectionKind;
  }) => {
    if (!moveFormRef.current || !movePathRef.current || !moveKindRef.current || !moveDirectionRef.current || !moveTargetRef.current || !moveTargetKindRef.current) {
      return;
    }

    movePathRef.current.value = options.relativePath;
    moveKindRef.current.value = options.nodeKind;
    moveDirectionRef.current.value = options.direction ?? "";
    moveTargetRef.current.value = options.targetPath ?? "";
    moveTargetKindRef.current.value = options.targetKind ?? "";
    moveFormRef.current.requestSubmit();
  };

  const submitDelete = (relativePath: string, nodeKind: AdminSelectionKind) => {
    if (!deleteFormRef.current || !deletePathRef.current || !deleteKindRef.current) {
      return;
    }

    deletePathRef.current.value = relativePath;
    deleteKindRef.current.value = nodeKind;
    deleteFormRef.current.requestSubmit();
  };

  const handleDelete = () => {
    if (!selectedPath || !canDeleteNode(selectedKind)) {
      return;
    }

    const confirmed = window.confirm(`确认删除当前${selectedKind}：${selectedPath}？此操作不可撤销。`);
    if (!confirmed) {
      return;
    }

    submitDelete(selectedPath, selectedKind);
  };

  const handleDragOver = (
    targetPath: string,
    targetKind: AdminSelectionKind,
    event: DragEvent,
  ) => {
    if (!dragging) {
      return;
    }

    const sameLibrary =
      dragging.relativePath.split("/")[0] === targetPath.split("/")[0];
    const sameParent = dragging.parentPath === getParentPath(targetPath, targetKind);
    const sameLevelMixed =
      sameParent &&
      (dragging.nodeKind === "article" || dragging.nodeKind === "directory") &&
      (targetKind === "article" || targetKind === "directory");
    const articleToContainer =
      dragging.nodeKind === "article" &&
      (targetKind === "directory" || targetKind === "library") &&
      sameLibrary;
    const valid =
      dragging.relativePath !== targetPath &&
      canDragNode(dragging.nodeKind) &&
      (sameLevelMixed || articleToContainer);

    if (!valid) {
      return;
    }

    event.preventDefault();
    setDropTarget(targetPath);
  };

  const handleDrop = (
    targetPath: string,
    targetKind: AdminSelectionKind,
    event: DragEvent,
  ) => {
    event.preventDefault();

    if (!dragging) {
      return;
    }

    const sameLibrary =
      dragging.relativePath.split("/")[0] === targetPath.split("/")[0];
    const sameParent = dragging.parentPath === getParentPath(targetPath, targetKind);
    const sameLevelMixed =
      sameParent &&
      (dragging.nodeKind === "article" || dragging.nodeKind === "directory") &&
      (targetKind === "article" || targetKind === "directory");
    const articleToContainer =
      dragging.nodeKind === "article" &&
      (targetKind === "directory" || targetKind === "library") &&
      sameLibrary;
    const valid =
      dragging.relativePath !== targetPath &&
      canDragNode(dragging.nodeKind) &&
      (sameLevelMixed || articleToContainer);

    setDropTarget(null);

    if (!valid) {
      setDragging(null);
      return;
    }

    submitMove({
      relativePath: dragging.relativePath,
      nodeKind: dragging.nodeKind,
      targetPath,
      targetKind,
    });
    setDragging(null);
  };

  return (
    <>
      <form action={moveAction} ref={moveFormRef} className="hidden">
        <input ref={movePathRef} type="hidden" name="relativePath" />
        <input ref={moveKindRef} type="hidden" name="nodeKind" />
        <input ref={moveDirectionRef} type="hidden" name="direction" />
        <input ref={moveTargetRef} type="hidden" name="targetPath" />
        <input ref={moveTargetKindRef} type="hidden" name="targetKind" />
      </form>

      <form action={deleteAction} ref={deleteFormRef} className="hidden">
        <input ref={deletePathRef} type="hidden" name="relativePath" />
        <input ref={deleteKindRef} type="hidden" name="nodeKind" />
      </form>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <div className="rounded-[30px] border border-stone-300/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(249,246,240,0.88))] p-6 shadow-[0_30px_90px_rgba(44,36,24,0.08)] md:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-stone-500">
                  Knowledge Base
                </p>
                <h2 className="mt-3 text-3xl font-semibold">新增知识库</h2>
              </div>
            </div>

            <div className="mt-6 max-w-xl">
              <AdminCreateKnowledgeBaseForm />
            </div>
          </div>

          <div className="rounded-[30px] border border-stone-300/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(249,246,240,0.88))] p-6 shadow-[0_30px_90px_rgba(44,36,24,0.08)] md:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-stone-500">
                  Tree View
                </p>
                <h2 className="mt-3 text-3xl font-semibold">当前知识库树</h2>
              </div>
              <p className="text-sm text-stone-500">共 {libraries.length} 个知识库</p>
            </div>

            {message ? (
              <div
                className={`mt-6 rounded-2xl px-4 py-3 text-sm ${
                  status === "error"
                    ? "border border-red-200 bg-red-50 text-red-700"
                    : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
                role={status === "error" ? "alert" : "status"}
              >
                {message}
              </div>
            ) : null}

            <p className="mt-6 text-sm leading-7 text-stone-500">
              目录和文章支持拖动排序，但只能在同一父级目录和同一类型内调整。右侧工作栏同时提供上移和下移按钮。
            </p>

            <div className="mt-8 space-y-5" data-testid="admin-tree-view">
              {libraries.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-stone-300 bg-white/70 px-5 py-8 text-sm leading-7 text-stone-500">
                  当前没有可展示的知识库，先创建一个知识库再继续管理内容。
                </div>
              ) : null}

              {libraries.map((library) => {
                const isExpanded = expandedLibrarySlug === library.slug;
                const isSelected = selectedPath === library.slug && selectedKind === "library";

                return (
                  <section
                    key={library.slug}
                    data-testid={`library-panel-${library.slug}`}
                  >
                    <div
                      draggable
                      onDragStart={() =>
                        setDragging({
                          relativePath: library.slug,
                          nodeKind: "library",
                          parentPath: "",
                        })
                      }
                      onDragEnd={() => {
                        setDragging(null);
                        setDropTarget(null);
                      }}
                      onDragOver={(event) => handleDragOver(library.slug, "library", event)}
                      onDrop={(event) => handleDrop(library.slug, "library", event)}
                      className={`rounded-[26px] border transition ${
                        dropTarget === library.slug
                          ? "border-amber-500 bg-amber-50"
                          : isExpanded
                            ? "border-stone-900 bg-stone-900 text-white shadow-[0_18px_50px_rgba(28,23,17,0.14)]"
                            : "border-stone-300 bg-stone-50 text-stone-900 hover:border-stone-500 hover:bg-white"
                      }`}
                    >
                      <Link
                        href={buildSelectionHref(adminBasePath, library.slug, "library")}
                        scroll={false}
                        className="group block px-5 py-5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className={`truncate text-lg font-semibold ${isExpanded ? "text-white" : "text-stone-900"} ${isSelected ? "underline decoration-stone-300 decoration-2 underline-offset-4" : ""}`}>
                              {library.name}
                            </h3>
                            <p className={`mt-2 text-sm ${isExpanded ? "text-stone-200" : "text-stone-500"}`}>
                              {library.slug}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                isExpanded
                                  ? "bg-white text-black"
                                  : "border border-stone-300 bg-white text-stone-700"
                              }`}
                            >
                              根目录
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                isExpanded
                                  ? "border border-white/30 bg-white/10 text-white"
                                  : "border border-stone-300 bg-white text-stone-600"
                              }`}
                            >
                              拖动
                            </span>
                          </div>
                        </div>
                      </Link>
                    </div>

                    {isExpanded ? (
                      <div
                        className="mt-4 rounded-[24px] border border-stone-300/80 bg-white/65 p-4"
                        data-testid={`library-tree-${library.slug}`}
                      >
                        <TreeNodeList
                          nodes={library.tree}
                          adminBasePath={adminBasePath}
                          librarySlug={library.slug}
                          selectedPath={selectedPath}
                          selectedKind={selectedKind}
                          dragging={dragging}
                          dropTarget={dropTarget}
                          onDragStart={setDragging}
                          onDragEnd={() => {
                            setDragging(null);
                            setDropTarget(null);
                          }}
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                        />
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="rounded-[30px] border border-stone-300/70 bg-[#f7f0e5] p-6 shadow-[0_30px_90px_rgba(44,36,24,0.08)] md:p-8">
          <p className="text-[11px] uppercase tracking-[0.32em] text-stone-500">
            当前选中
          </p>
          <h2 className="mt-3 break-all text-2xl font-semibold">
            {selectedPath || "未选择目标"}
          </h2>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            {selectedPath ? getSelectionSummary(selectedKind) : "请先在左侧选择知识库、目录、文章或资源文件。"}
          </p>

          {selectedPath && canSortNode(selectedKind) ? (
            <div className="mt-8 rounded-[24px] border border-stone-300/70 bg-white/75 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-stone-500">
                Sort
              </p>
              <h3 className="mt-3 text-lg font-semibold">顺序调整</h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={Boolean(moveState.redirectTo)}
                  data-testid="move-selected-up"
                  onClick={() =>
                    submitMove({
                      relativePath: selectedPath,
                      nodeKind: selectedKind,
                      direction: "up",
                    })
                  }
                  className="rounded-full border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-900 transition hover:bg-stone-100"
                >
                  上移
                </button>
                <button
                  type="button"
                  disabled={Boolean(moveState.redirectTo)}
                  data-testid="move-selected-down"
                  onClick={() =>
                    submitMove({
                      relativePath: selectedPath,
                      nodeKind: selectedKind,
                      direction: "down",
                    })
                  }
                  className="rounded-full border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-900 transition hover:bg-stone-100"
                >
                  下移
                </button>
              </div>
            </div>
          ) : null}

          {selectedPath && canDeleteNode(selectedKind) ? (
            <div className="mt-8 rounded-[24px] border border-red-200 bg-red-50/80 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-red-500">
                Danger Zone
              </p>
              <h3 className="mt-3 text-lg font-semibold text-stone-900">删除当前节点</h3>
              <p className="mt-3 text-sm leading-7 text-stone-600">
                删除知识库或文件夹会递归移除其下全部内容，系统会先弹出二次确认。
              </p>
              <button
                type="button"
                onClick={handleDelete}
                data-testid="delete-selected-node"
                className="mt-4 w-full rounded-full bg-red-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-red-700"
              >
                删除当前{selectedKind === "library" ? "知识库" : "节点"}
              </button>
            </div>
          ) : null}

          {canCreateDirectory && selectedPath ? (
            <div className="mt-8 rounded-[24px] border border-stone-300/70 bg-white/75 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-stone-500">
                Folder
              </p>
              <h3 className="mt-3 text-lg font-semibold">新建文件夹</h3>
              <div className="mt-4">
                <AdminCreateDirectoryForm targetDirectory={selectedPath} />
              </div>
            </div>
          ) : null}

          <div className="mt-8">
            {selectedPath && uploadMode ? (
              <AdminTreeUploadForm
                key={`${selectedKind}:${selectedPath}`}
                mode={uploadMode}
                targetPath={uploadTargetPath}
              />
            ) : (
              <div className="rounded-[24px] border border-dashed border-stone-300 bg-white/70 px-4 py-8 text-sm leading-7 text-stone-500">
                选择知识库根目录、普通目录或文章后，可在这里执行上传操作。
              </div>
            )}
          </div>
        </aside>
      </section>
    </>
  );
}
