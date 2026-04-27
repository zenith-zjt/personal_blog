"use client";

type SearchFormProps = {
  initialQuery?: string;
  placeholder?: string;
  compact?: boolean;
};

export function SearchForm({
  initialQuery = "",
  placeholder = "搜索文章标题、文件名、路径或正文关键词",
  compact = false,
}: SearchFormProps) {
  return (
    <form
      action="/search"
      className={`flex w-full items-center gap-3 rounded-full border border-stone-300/80 bg-white/90 shadow-[0_14px_35px_rgba(44,36,24,0.08)] ${
        compact ? "px-3 py-2" : "px-4 py-3"
      }`}
      role="search"
      aria-label="文章搜索"
    >
      <input
        type="search"
        name="q"
        defaultValue={initialQuery}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400"
      />
      <button
        type="submit"
        className={`rounded-full bg-stone-900 px-4 text-sm font-medium text-stone-50 transition hover:bg-stone-700 ${
          compact ? "py-2" : "py-2.5"
        }`}
      >
        搜索
      </button>
    </form>
  );
}
