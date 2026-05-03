import Image from "next/image";

type MarkdownRendererProps = {
  markdown: string;
  resolvedImageSources: string[];
  headings: Array<{
    id: string;
    text: string;
    level: number;
  }>;
  title?: string;
};

type ParsedBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "blockquote"; lines: string[] }
  | { type: "code"; language: string | null; code: string }
  | { type: "image"; alt: string; src: string }
  | { type: "table"; headers: string[]; rows: string[][] };

function escapeInlineHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderInline(text: string) {
  const withCode = escapeInlineHtml(text).replace(
    /`([^`]+)`/g,
    '<code class="rounded-lg bg-stone-200/80 px-1.5 py-0.5 text-[0.92em] text-stone-900">$1</code>',
  );

  return withCode
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function renderCodeToken(token: string, text: string) {
  const className =
    token === "comment"
      ? "text-stone-400"
      : token === "string"
        ? "text-emerald-300"
        : token === "keyword"
          ? "text-amber-300"
          : token === "number"
            ? "text-sky-300"
            : "text-violet-300";

  return `<span data-token="${token}" class="${className}">${text}</span>`;
}

function highlightGenericCode(
  code: string,
  options: {
    keywords: string[];
    builtins?: string[];
    hashComments?: boolean;
  },
) {
  const placeholders: string[] = [];
  const protect = (input: string, pattern: RegExp, token: string) =>
    input.replace(pattern, (match, prefix = "", hashComment = match) => {
      const placeholder = String.fromCodePoint(0xe000 + placeholders.length);
      const content =
        token === "comment" && prefix
          ? `${prefix}${renderCodeToken(token, hashComment)}`
          : renderCodeToken(token, match);
      placeholders.push(content);
      return placeholder;
    });

  let html = escapeInlineHtml(code);

  html = protect(html, /\/\*[\s\S]*?\*\//g, "comment");
  html = protect(html, /\/\/.*$/gm, "comment");
  if (options.hashComments) {
    html = protect(html, /(^|\s)(#.*)$/gm, "comment");
  }
  html = protect(
    html,
    /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g,
    "string",
  );

  if (options.keywords.length > 0) {
    const keywordPattern = new RegExp(
      `\\b(?:${options.keywords.join("|")})\\b`,
      "gi",
    );
    html = protect(html, keywordPattern, "keyword");
  }

  if ((options.builtins?.length ?? 0) > 0) {
    const builtinPattern = new RegExp(
      `\\b(?:${options.builtins?.join("|")})\\b`,
      "g",
    );
    html = protect(html, builtinPattern, "builtin");
  }

  html = protect(html, /\b\d+(?:\.\d+)?\b/g, "number");

  return Array.from(html)
    .map((character) => {
      const placeholderIndex = character.codePointAt(0)! - 0xe000;
      return placeholderIndex >= 0 && placeholderIndex < placeholders.length
        ? placeholders[placeholderIndex]
        : character;
    })
    .join("");
}

function highlightMarkupCode(code: string) {
  const escaped = escapeInlineHtml(code);

  return escaped.replace(
    /(&lt;\/?)([A-Za-z][\w:-]*)([\s\S]*?)(\/?&gt;)/g,
    (_, open, tagName, attributes, close) => {
      const highlightedAttributes = String(attributes).replace(
        /([A-Za-z_:][-A-Za-z0-9_:.]*)(=)("(?:\\.|[^"])*"|'(?:\\.|[^'])*')/g,
        (_attrMatch, attrName, equals, attrValue) =>
          `${renderCodeToken("keyword", attrName)}${equals}${renderCodeToken("string", attrValue)}`,
      );

      return `${renderCodeToken("keyword", open)}${renderCodeToken("builtin", tagName)}${highlightedAttributes}${renderCodeToken("keyword", close)}`;
    },
  );
}

function highlightCode(code: string, language: string | null) {
  const normalizedLanguage = language?.toLowerCase() ?? "";

  if (["html", "xml", "svg", "mdx"].includes(normalizedLanguage)) {
    return highlightMarkupCode(code);
  }

  if (normalizedLanguage === "json") {
    return highlightGenericCode(code, {
      keywords: ["true", "false", "null"],
    });
  }

  if (["bash", "sh", "shell", "zsh", "powershell", "ps1"].includes(normalizedLanguage)) {
    return highlightGenericCode(code, {
      keywords: [
        "if",
        "then",
        "else",
        "fi",
        "for",
        "do",
        "done",
        "case",
        "esac",
        "function",
        "param",
      ],
      builtins: ["echo", "cd", "ls", "pwd", "export", "set"],
      hashComments: true,
    });
  }

  if (normalizedLanguage === "sql") {
    return highlightGenericCode(code, {
      keywords: [
        "select",
        "from",
        "where",
        "insert",
        "into",
        "update",
        "delete",
        "join",
        "left",
        "right",
        "inner",
        "outer",
        "on",
        "group",
        "by",
        "order",
        "having",
        "limit",
        "as",
        "and",
        "or",
        "not",
        "create",
        "table",
        "values",
      ],
    });
  }

  if (normalizedLanguage === "java") {
    return highlightGenericCode(code, {
      keywords: [
        "package",
        "import",
        "class",
        "interface",
        "enum",
        "public",
        "private",
        "protected",
        "static",
        "final",
        "void",
        "new",
        "return",
        "if",
        "else",
        "switch",
        "case",
        "for",
        "while",
        "try",
        "catch",
        "throw",
        "throws",
      ],
      builtins: ["String", "Integer", "Long", "Boolean", "System"],
    });
  }

  return highlightGenericCode(code, {
    keywords: [
      "const",
      "let",
      "var",
      "function",
      "return",
      "if",
      "else",
      "switch",
      "case",
      "for",
      "while",
      "do",
      "break",
      "continue",
      "try",
      "catch",
      "finally",
      "throw",
      "class",
      "extends",
      "implements",
      "interface",
      "type",
      "enum",
      "import",
      "export",
      "from",
      "async",
      "await",
      "new",
      "typeof",
      "instanceof",
      "true",
      "false",
      "null",
      "undefined",
    ],
    builtins: ["console", "Promise", "Array", "Object", "Map", "Set"],
  });
}

function isTableSeparatorLine(line: string) {
  const normalized = line.trim().replace(/^\||\|$/g, "");
  if (!normalized.includes("|")) {
    return false;
  }

  return normalized.split("|").every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

function parseMarkdown(markdown: string): ParsedBlock[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: ParsedBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (!line) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const language = line.slice(3).trim() || null;
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }

      blocks.push({
        type: "code",
        language,
        code: codeLines.join("\n"),
      });
      index += 1;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      index += 1;
      continue;
    }

    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      blocks.push({
        type: "image",
        alt: imageMatch[1],
        src: imageMatch[2],
      });
      index += 1;
      continue;
    }

    const nextLine = lines[index + 1]?.trim() ?? "";
    if (line.includes("|") && isTableSeparatorLine(nextLine)) {
      const headers = splitTableRow(line);
      const rows: string[][] = [];
      index += 2;

      while (index < lines.length && lines[index].trim().includes("|")) {
        const rowLine = lines[index].trim();
        if (!rowLine) {
          break;
        }

        rows.push(splitTableRow(rowLine));
        index += 1;
      }

      blocks.push({
        type: "table",
        headers,
        rows,
      });
      continue;
    }

    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith(">")) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({
        type: "blockquote",
        lines: quoteLines,
      });
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push({
        type: "list",
        items,
      });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length && lines[index].trim()) {
      const candidate = lines[index].trim();
      const following = lines[index + 1]?.trim() ?? "";
      if (
        /^(#{1,6})\s+/.test(candidate) ||
        candidate.startsWith(">") ||
        candidate.startsWith("```") ||
        /^[-*]\s+/.test(candidate) ||
        /^!\[([^\]]*)\]\(([^)]+)\)$/.test(candidate) ||
        (candidate.includes("|") && isTableSeparatorLine(following))
      ) {
        break;
      }

      paragraphLines.push(candidate);
      index += 1;
    }

    blocks.push({
      type: "paragraph",
      text: paragraphLines.join(" "),
    });
  }

  return blocks;
}

export function MarkdownRenderer({
  markdown,
  resolvedImageSources,
  headings,
  title,
}: MarkdownRendererProps) {
  const blocks = parseMarkdown(markdown);
  const firstHeading = blocks.find(
    (block): block is Extract<ParsedBlock, { type: "heading" }> =>
      block.type === "heading",
  );
  const firstHeadingIndex = firstHeading ? blocks.indexOf(firstHeading) : -1;
  const shouldSkipFirstTitle = Boolean(title && firstHeading?.text === title);
  const resolvedBlocks = blocks.map((block, index) => {
    if (block.type !== "image") {
      return block;
    }

    const imageOffset = blocks
      .slice(0, index + 1)
      .filter((candidate) => candidate.type === "image").length - 1;

    return {
      ...block,
      resolvedSrc: resolvedImageSources[imageOffset] ?? block.src,
    };
  });
  let visibleHeadingCursor = 0;

  return (
    <div className="space-y-6 text-[15px] leading-8 text-stone-700 md:text-[17px]">
      {resolvedBlocks.map((block, blockIndex) => {
        if (block.type === "heading") {
          if (shouldSkipFirstTitle && blockIndex === firstHeadingIndex) {
            return null;
          }

          const currentHeadingId =
            headings[visibleHeadingCursor]?.id ?? `heading-${visibleHeadingCursor}`;
          visibleHeadingCursor += 1;

          if (block.level === 1) {
            return (
              <h3
                id={currentHeadingId}
                key={`heading-${blockIndex}`}
                className="scroll-mt-8 text-3xl font-semibold text-stone-900"
              >
                {block.text}
              </h3>
            );
          }

          if (block.level === 2) {
            return (
              <h4
                id={currentHeadingId}
                key={`heading-${blockIndex}`}
                className="scroll-mt-8 pt-4 text-2xl font-semibold text-stone-900"
              >
                {block.text}
              </h4>
            );
          }

          return (
            <h5
              id={currentHeadingId}
              key={`heading-${blockIndex}`}
              className="scroll-mt-8 pt-3 text-lg font-semibold text-stone-800"
            >
              {block.text}
            </h5>
          );
        }

        if (block.type === "paragraph") {
          return (
            <p
              key={`paragraph-${blockIndex}`}
              dangerouslySetInnerHTML={{ __html: renderInline(block.text) }}
            />
          );
        }

        if (block.type === "list") {
          return (
            <ul key={`list-${blockIndex}`} className="space-y-3 pl-6">
              {block.items.map((item) => (
                <li
                  key={item}
                  className="list-disc"
                  dangerouslySetInnerHTML={{ __html: renderInline(item) }}
                />
              ))}
            </ul>
          );
        }

        if (block.type === "blockquote") {
          return (
            <blockquote
              key={`quote-${blockIndex}`}
              className="rounded-[28px] border border-stone-300 bg-[#f7f1e7] px-6 py-5 text-stone-700"
            >
              {block.lines.map((quoteLine) => (
                <p
                  key={quoteLine}
                  dangerouslySetInnerHTML={{ __html: renderInline(quoteLine) }}
                />
              ))}
            </blockquote>
          );
        }

        if (block.type === "code") {
          return (
            <div
              key={`code-${blockIndex}`}
              className="overflow-hidden rounded-[28px] border border-stone-800 bg-[#1c212c]"
            >
              <div className="border-b border-stone-700 px-5 py-3 text-xs uppercase tracking-[0.32em] text-stone-400">
                {block.language ?? "code"}
              </div>
              <pre className="overflow-x-auto px-5 py-5 text-sm leading-7 text-stone-100">
                <code
                  dangerouslySetInnerHTML={{
                    __html: highlightCode(block.code, block.language),
                  }}
                />
              </pre>
            </div>
          );
        }

        if (block.type === "table") {
          return (
            <div
              key={`table-${blockIndex}`}
              className="overflow-hidden rounded-[28px] border border-stone-300 bg-white shadow-[0_20px_40px_rgba(44,36,24,0.08)]"
            >
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-sm md:text-base">
                  <thead className="bg-stone-100 text-stone-900">
                    <tr>
                      {block.headers.map((header, headerIndex) => (
                        <th
                          key={`${header}-${headerIndex}`}
                          className="border-b border-stone-200 px-5 py-4 font-semibold"
                          dangerouslySetInnerHTML={{ __html: renderInline(header) }}
                        />
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr
                        key={`row-${rowIndex}`}
                        className="odd:bg-white even:bg-stone-50/70"
                      >
                        {block.headers.map((_, cellIndex) => (
                          <td
                            key={`cell-${rowIndex}-${cellIndex}`}
                            className="border-b border-stone-200 px-5 py-4 align-top"
                            dangerouslySetInnerHTML={{
                              __html: renderInline(row[cellIndex] ?? ""),
                            }}
                          />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        return (
          <figure
            key={`image-${blockIndex}`}
            className="overflow-hidden rounded-[30px] border border-stone-300 bg-white shadow-[0_20px_40px_rgba(44,36,24,0.08)]"
          >
            <Image
              src={block.resolvedSrc}
              alt={block.alt || "article image"}
              width={1280}
              height={720}
              unoptimized
              className="h-auto w-full"
            />
            {block.alt ? (
              <figcaption className="border-t border-stone-200 px-5 py-3 text-sm text-stone-500">
                {block.alt}
              </figcaption>
            ) : null}
          </figure>
        );
      })}
    </div>
  );
}
