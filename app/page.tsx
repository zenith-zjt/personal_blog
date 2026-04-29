import Link from "next/link";

import { SearchForm } from "@/components/search-form";
import { buildArticleHref } from "@/lib/content-paths";
import { getDefaultArticleSlug, listKnowledgeBases } from "@/lib/content";
import {
  getAdminPublicProfile,
  resolveProfileAvatarUrl,
} from "@/lib/admin-profile";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default async function Home() {
  const [libraries, profile] = await Promise.all([
    listKnowledgeBases(),
    getAdminPublicProfile(),
  ]);
  const featuredLibraries = await Promise.all(
    libraries.map(async (library) => ({
      ...library,
      defaultSlug: await getDefaultArticleSlug(library.slug),
    })),
  );
  const avatarUrl = resolveProfileAvatarUrl(profile.avatarUrl);

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-stone-950">
      <section className="relative flex min-h-screen overflow-hidden px-4 py-4 md:px-6 md:py-6">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#111827_0%,#27313f_44%,#d8c7a4_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,#f4f1ea_86%)]" />
        <div className="absolute left-8 top-10 h-28 w-px bg-white/35" />
        <div className="absolute bottom-20 right-8 hidden h-64 w-px bg-stone-900/20 md:block" />

        <div className="relative mx-auto grid w-full max-w-[1500px] items-center gap-10 py-12 md:py-20 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="max-w-5xl animate-[profile-rise_900ms_ease-out_both] text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.42em] text-white/60">
              Personal Blog / Knowledge Base
            </p>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-normal md:text-7xl lg:text-8xl">
              {profile.displayName}
            </h1>
            <p className="mt-6 max-w-3xl text-xl leading-9 text-white/82 md:text-3xl md:leading-[1.35]">
              {profile.signature}
            </p>

            <div className="mt-10 flex flex-wrap gap-3 text-sm text-white/82">
              <span className="rounded-lg border border-white/25 bg-white/10 px-4 py-2 backdrop-blur">
                {profile.roleLabel}
              </span>
              <span className="rounded-lg border border-white/25 bg-white/10 px-4 py-2 backdrop-blur">
                {profile.profession}
              </span>
              {profile.location ? (
                <span className="rounded-lg border border-white/25 bg-white/10 px-4 py-2 backdrop-blur">
                  {profile.location}
                </span>
              ) : null}
            </div>
          </div>

          <aside className="animate-[profile-rise_900ms_ease-out_180ms_both] border-l border-white/25 pl-6 text-white md:pl-8">
            <div className="flex items-center gap-5">
              {avatarUrl ? (
                <div
                  role="img"
                  aria-label={profile.displayName}
                  className="h-24 w-24 rounded-lg border border-white/30 bg-cover bg-center shadow-[0_24px_70px_rgba(0,0,0,0.22)]"
                  style={{ backgroundImage: `url(${avatarUrl})` }}
                />
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-lg border border-white/30 bg-white/12 text-3xl font-semibold shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
                  {getInitials(profile.displayName)}
                </div>
              )}
              <div>
                <p className="text-sm uppercase tracking-[0.32em] text-white/55">
                  Profile
                </p>
                <p className="mt-2 text-2xl font-semibold">{profile.roleLabel}</p>
              </div>
            </div>

            <p className="mt-8 text-base leading-8 text-white/76">{profile.bio}</p>

            <div className="mt-8 flex flex-wrap gap-2">
              {profile.techStack.slice(0, 8).map((item) => (
                <span
                  key={item}
                  className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/78"
                >
                  {item}
                </span>
              ))}
            </div>

            {profile.githubUrl ? (
              <a
                href={profile.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-8 inline-flex rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-stone-950"
              >
                GitHub
              </a>
            ) : null}
          </aside>

          <a
            href="#knowledge"
            className="absolute bottom-8 left-0 hidden text-xs font-semibold uppercase tracking-[0.38em] text-stone-900/70 transition hover:text-stone-950 md:block"
          >
            Scroll to notes
          </a>
        </div>
      </section>

      <section
        id="knowledge"
        className="scroll-mt-4 px-4 py-10 md:px-6 md:py-16"
      >
        <div className="mx-auto grid w-full max-w-[1500px] gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-8">
            <div className="sticky top-4 z-10 rounded-lg border border-stone-300 bg-[#fdfbf6]/95 p-4 shadow-[0_18px_45px_rgba(44,36,24,0.08)] backdrop-blur md:p-5">
              <SearchForm />
            </div>

            <section>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-stone-500">
                    Libraries
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold text-stone-950 md:text-5xl">
                    知识库
                  </h2>
                </div>
                <p className="text-sm text-stone-500">
                  {featuredLibraries.length} 个知识库
                </p>
              </div>

              <div className="mt-8 grid gap-4 xl:grid-cols-2" data-testid="library-grid">
                {featuredLibraries.map((library, index) => {
                  const href = library.defaultSlug
                    ? buildArticleHref(library.slug, library.defaultSlug)
                    : `/kb/${encodeURIComponent(library.slug)}`;

                  return (
                    <Link
                      key={library.slug}
                      href={href}
                      className="group block rounded-lg border border-stone-300 bg-[#fdfbf6] p-5 transition duration-300 hover:-translate-y-1 hover:border-stone-900 hover:shadow-[0_22px_50px_rgba(44,36,24,0.10)]"
                    >
                      <div className="flex items-start justify-between gap-5">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500">
                            {library.slug}
                          </p>
                          <h3 className="mt-3 text-2xl font-semibold leading-tight text-stone-950">
                            {library.name}
                          </h3>
                        </div>
                        <span className="rounded-lg border border-stone-300 px-3 py-1 text-xs text-stone-500">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>

                      <p className="mt-4 text-sm leading-7 text-stone-600">
                        {library.description ?? "该知识库暂无摘要说明。"}
                      </p>

                      <div className="mt-6 flex flex-wrap gap-2 text-xs text-stone-500">
                        <span className="rounded-lg border border-stone-300 bg-white px-3 py-1.5">
                          {library.articleCount} 篇文章
                        </span>
                        {library.updatedAt ? (
                          <span className="rounded-lg border border-stone-300 bg-white px-3 py-1.5">
                            更新于 {library.updatedAt}
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="rounded-lg border border-stone-300 bg-[#ebe4d8] p-6 lg:sticky lg:top-6 lg:self-start">
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-stone-500">
              About
            </p>
            <h2 className="mt-4 text-2xl font-semibold text-stone-950">
              {profile.displayName}
            </h2>
            <p className="mt-4 text-sm leading-7 text-stone-700">{profile.bio}</p>

            <dl className="mt-8 space-y-5 text-sm">
              <div>
                <dt className="text-stone-500">身份</dt>
                <dd className="mt-1 font-medium text-stone-950">{profile.roleLabel}</dd>
              </div>
              <div>
                <dt className="text-stone-500">职业</dt>
                <dd className="mt-1 font-medium text-stone-950">{profile.profession}</dd>
              </div>
              {profile.githubUrl ? (
                <div>
                  <dt className="text-stone-500">GitHub</dt>
                  <dd className="mt-1 break-all font-medium text-stone-950">
                    {profile.githubUrl}
                  </dd>
                </div>
              ) : null}
            </dl>
          </aside>
        </div>
      </section>
    </main>
  );
}
