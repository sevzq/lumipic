"use client";

import { useRef } from "react";
import { useLocale } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

/**
 * GSAP choreography for the landing page (Lovart-style).
 *
 * The page itself stays a server component for SEO — this wrapper finds
 * `data-fx` markers in the server-rendered children and animates them:
 *
 *  - hero: masked text rise (SplitText) + card unfold, then a scroll scrub
 *  - feature sections: masked titles, staggered copy, media slide + parallax
 *  - privacy panel: card rise + stat counters
 *  - final CTA: center-out word pop
 *
 * Everything respects `prefers-reduced-motion` via gsap.matchMedia().
 */
export function LandingFx({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const locale = useLocale();

  useGSAP(
    () => {
      const el = root.current!;
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // CJK has no word boundaries — animate per character there.
        const zh = locale === "zh";
        const splits: SplitText[] = [];
        const splitParts = (target: Element) => {
          const s = SplitText.create(target, {
            type: zh ? "chars" : "words",
            mask: zh ? "chars" : "words",
          });
          splits.push(s);
          return zh ? s.chars : s.words;
        };

        // ------------------------------------------------------- hero intro
        const heroTitle = el.querySelector("[data-fx=hero-title]");
        const heroParts = heroTitle ? splitParts(heroTitle) : [];

        gsap.set(heroParts, { yPercent: 112 });
        gsap.set(["[data-fx=hero-sub]", "[data-fx=hero-ctas] > *"], {
          autoAlpha: 0,
          y: 22,
        });
        gsap.set("[data-fx=hero-card]", {
          autoAlpha: 0,
          y: 70,
          scale: 0.94,
          rotateX: 9,
          transformPerspective: 1300,
          transformOrigin: "center 18%",
        });

        gsap
          .timeline({ defaults: { ease: "power4.out" } })
          .to(heroParts, { yPercent: 0, duration: 0.95, stagger: 0.035 }, 0.08)
          .to(
            "[data-fx=hero-sub]",
            { autoAlpha: 1, y: 0, duration: 0.7 },
            "-=0.6",
          )
          .to(
            "[data-fx=hero-ctas] > *",
            { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08 },
            "-=0.55",
          )
          .to(
            "[data-fx=hero-card]",
            { autoAlpha: 1, y: 0, scale: 1, rotateX: 0, duration: 1.15, ease: "power3.out" },
            "-=0.55",
          );

        // Gentle tilt-away as the hero clip scrolls out.
        gsap.to("[data-fx=hero-scrub]", {
          y: -36,
          rotateX: -4,
          scale: 0.975,
          transformPerspective: 1300,
          transformOrigin: "center 85%",
          ease: "none",
          scrollTrigger: {
            trigger: "[data-fx=hero-scrub]",
            start: "bottom 88%",
            end: "bottom 30%",
            scrub: 0.6,
          },
        });

        // ------------------------------------------------- feature sections
        gsap.utils.toArray<HTMLElement>("[data-fx-section]").forEach((section) => {
          const flip = section.dataset.flip === "1";
          const items = gsap.utils.toArray<HTMLElement>("[data-fx-item]", section);
          const media = section.querySelector("[data-fx=media]");
          const title = section.querySelector("[data-fx=title]");
          const parts = title ? splitParts(title) : [];

          gsap.set(parts, { yPercent: 112 });
          gsap.set(items, { autoAlpha: 0, y: 28 });
          gsap.set(media, {
            autoAlpha: 0,
            x: flip ? -72 : 72,
            y: 30,
            rotate: flip ? -2.5 : 2.5,
            scale: 0.95,
          });

          gsap
            .timeline({
              defaults: { ease: "power3.out" },
              scrollTrigger: { trigger: section, start: "top 74%", once: true },
            })
            .to(parts, { yPercent: 0, duration: 0.85, ease: "power4.out", stagger: 0.025 }, 0)
            .to(items, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.09 }, 0.1)
            .to(
              media,
              { autoAlpha: 1, x: 0, y: 0, rotate: 0, scale: 1, duration: 0.95 },
              0.15,
            );

          // Continuous depth parallax on the clip while the section crosses.
          const clip = section.querySelector("[data-fx=parallax]");
          if (clip) {
            gsap.fromTo(
              clip,
              { yPercent: 6.5 },
              {
                yPercent: -6.5,
                ease: "none",
                scrollTrigger: {
                  trigger: section,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 0.7,
                },
              },
            );
          }
        });

        // ---------------------------------------------------- privacy panel
        const privacy = el.querySelector("[data-fx=privacy-card]");
        if (privacy) {
          const blocks = gsap.utils.toArray<HTMLElement>("[data-fx=stat-block]", privacy);

          gsap.set(privacy, { autoAlpha: 0, y: 64, scale: 0.965 });
          gsap.set(blocks, { autoAlpha: 0, y: 24 });
          gsap.set("[data-fx=privacy-video]", { autoAlpha: 0, x: 48 });

          const tl = gsap
            .timeline({
              defaults: { ease: "power3.out" },
              scrollTrigger: { trigger: privacy, start: "top 78%", once: true },
            })
            .to(privacy, { autoAlpha: 1, y: 0, scale: 1, duration: 0.9 })
            .to("[data-fx=privacy-video]", { autoAlpha: 1, x: 0, duration: 0.8 }, "-=0.5")
            .to(blocks, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1 }, "-=0.6");

          // Count stats up from 0 (e.g. "100%" -> 0% … 100%).
          blocks.forEach((block) => {
            const dt = block.querySelector("[data-fx=stat]");
            const m = dt?.textContent?.match(/^([^0-9]*)(\d+)([^0-9]*)$/);
            if (!dt || !m) return;
            const [, pre, num, suf] = m;
            const proxy = { v: 0 };
            tl.to(
              proxy,
              {
                v: Number(num),
                duration: 1.1,
                ease: "power2.out",
                onUpdate() {
                  dt.textContent = `${pre}${Math.round(proxy.v)}${suf}`;
                },
              },
              "<",
            );
          });
        }

        // -------------------------------------------------------- final CTA
        const final = el.querySelector("[data-fx=final]");
        if (final) {
          const finalTitle = final.querySelector("[data-fx=final-title]");
          const parts = finalTitle ? splitParts(finalTitle) : [];

          gsap.set(parts, { yPercent: 112 });
          gsap.set("[data-fx=final-sub]", { autoAlpha: 0, y: 18 });
          gsap.set("[data-fx=final-pills] > *", { autoAlpha: 0, y: 16, scale: 0.9 });
          gsap.set("[data-fx=final-cta]", { autoAlpha: 0, y: 18, scale: 0.95 });

          gsap
            .timeline({
              defaults: { ease: "power3.out" },
              scrollTrigger: { trigger: final, start: "top 80%", once: true },
            })
            .to(parts, {
              yPercent: 0,
              duration: 0.85,
              ease: "power4.out",
              stagger: { each: 0.03, from: "center" },
            })
            .to("[data-fx=final-sub]", { autoAlpha: 1, y: 0, duration: 0.6 }, "-=0.5")
            .to(
              "[data-fx=final-pills] > *",
              {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                duration: 0.5,
                ease: "back.out(1.6)",
                stagger: { each: 0.05, from: "center" },
              },
              "-=0.45",
            )
            .to("[data-fx=final-cta]", { autoAlpha: 1, y: 0, scale: 1, duration: 0.55 }, "-=0.3");
        }

        // Media (videos) resolve their height after metadata loads.
        const onLoad = () => ScrollTrigger.refresh();
        window.addEventListener("load", onLoad);

        return () => {
          window.removeEventListener("load", onLoad);
          splits.forEach((s) => s.revert());
        };
      });
    },
    { scope: root, dependencies: [locale] },
  );

  return <div ref={root}>{children}</div>;
}
