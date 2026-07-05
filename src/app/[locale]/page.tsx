import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LandingFx } from "@/components/landing/LandingFx";
import { DemoVideo } from "@/components/landing/DemoVideo";
import { CheckIcon, TOOL_ICONS } from "@/components/icons";
import { TOOLS } from "@/lib/tools";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "home", "");
}

const DEMO_SRC: Record<string, string> = {
  "remove-bg": "/demos/hero-removebg.mp4",
  compress: "/demos/demo-compress.mp4",
  convert: "/demos/demo-convert.mp4",
  crop: "/demos/demo-crop.mp4",
  "strip-exif": "/demos/demo-exif.mp4",
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("hero");
  const tl = await getTranslations("landing");
  const tt = await getTranslations("tools");

  // CJK titles are fixed-width glyphs — fluid size keeps them on one line.
  const zh = locale === "zh";
  const sectionTitle = zh
    ? "display mt-3 text-[28px] leading-[1.12] md:whitespace-nowrap md:text-[clamp(24px,3.1vw,40px)]"
    : "display mt-3 text-[30px] leading-[1.08] sm:text-[40px]";

  return (
    <LandingFx>
      {/* ---------------------------------------------------------- hero */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="pt-14 text-center sm:pt-20">
          <h1
            data-fx="hero-title"
            className="display mx-auto mt-3.5 max-w-3xl text-[40px] sm:text-[64px]"
          >
            {t("titleA")}
            <span className="relative mx-1 inline-block whitespace-nowrap rounded-2xl bg-block-lilac px-2.5 sm:px-3.5">
              {t("titleB")}
            </span>
          </h1>
          <p
            data-fx="hero-sub"
            className="mx-auto mt-5 max-w-xl text-balance text-[15px] leading-relaxed text-ink-soft sm:text-[16.5px]"
          >
            {t("subtitle")}
          </p>
          <div
            data-fx="hero-ctas"
            className="mt-7 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              href="/remove-bg"
              className="rounded-full bg-black px-6 py-3 text-[14.5px] font-semibold text-white transition-transform hover:scale-[1.03] active:scale-[0.97]"
            >
              {tl("ctaPrimary")}
            </Link>
            <a
              href="#features"
              className="rounded-full border border-hairline bg-white px-6 py-3 text-[14.5px] font-semibold text-black transition-colors hover:bg-surface-soft"
            >
              {tl("ctaSecondary")}
            </a>
          </div>
        </div>

        {/* hero demo clip — unfolds on load, tilts away on scroll */}
        <div className="mx-auto mt-12 max-w-5xl pb-20 sm:mt-14 sm:pb-28">
          <div data-fx="hero-scrub">
            <div
              data-fx="hero-card"
              className="overflow-hidden rounded-[28px] border border-hairline shadow-[0_30px_80px_rgba(0,0,0,0.10)] sm:rounded-[36px]"
            >
              <DemoVideo
                src={DEMO_SRC["remove-bg"]}
                ratio="16 / 9"
                className="block w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ feature sections */}
      <div id="features" className="border-t border-hairline-soft">
        {TOOLS.map((tool, i) => {
          const Icon = TOOL_ICONS[tool.mode];
          const flip = i % 2 === 1;
          return (
            <section
              key={tool.mode}
              data-fx-section
              data-flip={flip ? "1" : undefined}
              className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-24"
            >
              <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
                <div className={flip ? "md:order-2" : ""}>
                  <p data-fx-item className="eyebrow text-black/50">
                    {tl(`sections.${tool.mode}.eyebrow`)}
                  </p>
                  <h2 data-fx="title" className={sectionTitle}>
                    {tl(`sections.${tool.mode}.title`)}
                  </h2>
                  <p
                    data-fx-item
                    className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft"
                  >
                    {tl(`sections.${tool.mode}.desc`)}
                  </p>
                  <ul className="mt-6 space-y-2.5">
                    {(["b1", "b2", "b3"] as const).map((b) => (
                      <li
                        key={b}
                        data-fx-item
                        className="flex items-start gap-2.5 text-[14px] font-medium text-black/75"
                      >
                        <span
                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                          style={{ background: tool.hue }}
                        >
                          <CheckIcon size={11} className="text-black" />
                        </span>
                        {tl(`sections.${tool.mode}.${b}`)}
                      </li>
                    ))}
                  </ul>
                  <div data-fx-item className="mt-8">
                    <Link
                      href={tool.path}
                      className="inline-flex items-center gap-2 rounded-full bg-black px-5.5 py-2.5 text-[13.5px] font-semibold text-white transition-transform hover:scale-[1.03] active:scale-[0.97]"
                    >
                      <Icon size={15} />
                      {tl(`sections.${tool.mode}.cta`)}
                    </Link>
                  </div>
                </div>

                <div data-fx="media" className={flip ? "md:order-1" : ""}>
                  <div
                    className="rounded-[28px] p-3.5 sm:rounded-[34px] sm:p-5"
                    style={{ background: tool.hue }}
                  >
                    <div data-fx="parallax">
                      <DemoVideo
                        src={DEMO_SRC[tool.mode]}
                        ratio="8 / 5"
                        className="block w-full rounded-[18px] border border-black/10 shadow-[0_18px_50px_rgba(0,0,0,0.12)] sm:rounded-[22px]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* --------------------------------------------------- privacy panel */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 sm:pb-24">
        <div
          data-fx="privacy-card"
          className="overflow-hidden rounded-[32px] bg-block-navy text-white sm:rounded-[40px]"
        >
          <div className="grid items-center gap-8 p-7 sm:p-12 md:grid-cols-2 md:gap-14">
            <div>
              <p className="eyebrow text-white/50">{tl("privacy.eyebrow")}</p>
              <h2 className="display mt-3 text-[30px] leading-[1.08] text-white sm:text-[42px]">
                {tl("privacy.title")}
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/65">
                {tl("privacy.desc")}
              </p>
              <dl className="mt-8 grid grid-cols-3 gap-4">
                {(["s1", "s2", "s3"] as const).map((s) => (
                  <div key={s} data-fx="stat-block">
                    <dt
                      data-fx="stat"
                      className="display text-[26px] text-white sm:text-[34px]"
                    >
                      {tl(`privacy.${s}`)}
                    </dt>
                    <dd className="mt-1.5 text-[12px] leading-snug text-white/55">
                      {tl(`privacy.${s}l`)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <div data-fx="privacy-video">
              <DemoVideo
                src="/demos/demo-privacy.mp4"
                ratio="8 / 5"
                className="block w-full rounded-[20px] border border-white/10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- final CTA */}
      <section
        data-fx="final"
        className="mx-auto max-w-6xl px-4 pb-20 text-center sm:px-6 sm:pb-28"
      >
        <h2 data-fx="final-title" className="display text-[34px] sm:text-[52px]">
          {tl("final.title")}
        </h2>
        <p data-fx="final-sub" className="mt-3 text-[15px] text-ink-soft">
          {tl("final.sub")}
        </p>
        <div
          data-fx="final-pills"
          className="mt-7 flex flex-wrap items-center justify-center gap-2.5"
        >
          {TOOLS.map((tool) => {
            const Icon = TOOL_ICONS[tool.mode];
            return (
              <Link
                key={tool.mode}
                href={tool.path}
                className="flex items-center gap-2 rounded-full border border-hairline bg-white px-4.5 py-2.5 text-[13.5px] font-semibold text-black transition-colors hover:border-black"
              >
                <Icon size={15} />
                {tt(`${tool.mode}.name`)}
              </Link>
            );
          })}
        </div>
        <div data-fx="final-cta" className="mt-6">
          <Link
            href="/remove-bg"
            className="inline-block rounded-full bg-black px-8 py-3.5 text-[15px] font-semibold text-white transition-transform hover:scale-[1.03] active:scale-[0.97]"
          >
            {tl("final.cta")}
          </Link>
        </div>
      </section>
    </LandingFx>
  );
}
