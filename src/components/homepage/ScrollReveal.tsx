"use client";

import React, { useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface ScrollRevealProps {
  children: ReactNode;
  scrollContainerRef?: RefObject<HTMLElement>;
  baseOpacity?: number;
  as?: React.ElementType;
  variant?: "headline" | "inherit";
  containerClassName?: string;
  textClassName?: string;
  wordAnimationEnd?: string;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  scrollContainerRef,
  baseOpacity = 0.15,
  as: As = "h2",
  variant = "headline",
  containerClassName = "",
  textClassName = "",
  wordAnimationEnd = "center center",
}) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = prefersReducedMotion();

  const splitText = useMemo(() => {
    if (typeof children !== "string") return children;

    const words = children.split(/\s+/).filter(Boolean);

    return words.map((word, index) => (
      <React.Fragment key={index}>
        <span className="inline-block word">{word}</span>
        {index < words.length - 1 ? " " : null}
      </React.Fragment>
    ));
  }, [children]);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    // If animations are disabled, render content immediately in a readable state.
    if (reducedMotion) {
      const wordElements = el.querySelectorAll<HTMLElement>(".word");
      if (wordElements.length) {
        wordElements.forEach((node) => {
          node.style.opacity = "1";
          node.style.filter = "none";
          node.style.transform = "none";
          node.style.willChange = "auto";
        });
      }
      return;
    }

    const directParent = el.parentElement;
    const triggerEl =
      directParent?.tagName === "SPAN" ? directParent.parentElement ?? directParent : directParent ?? el;

    const scroller = scrollContainerRef?.current ?? undefined;

    let st: ScrollTrigger | null = null;

    const setupAnimations = () => {
      const wordElements = el.querySelectorAll<HTMLElement>(".word");
      if (wordElements.length === 0) return;

      // Make the initial state inexpensive for weak GPUs: avoid animating filter/blur.
      gsap.set(wordElements, {
        opacity: baseOpacity,
        y: 10,
        scale: 0.98,
        willChange: "opacity, transform",
      });

      const tween = gsap.to(wordElements, {
        opacity: 1,
        y: 0,
        scale: 1,
        ease: "none",
        stagger: 0.03,
        scrollTrigger: {
          trigger: triggerEl,
          scroller,
          start: "top 85%",
          end: wordAnimationEnd,
          scrub: 1,
        },
        onComplete: () => {
          // Release will-change to reduce long-term memory usage.
          wordElements.forEach((node) => {
            node.style.willChange = "auto";
          });
        },
      });

      st = tween.scrollTrigger ?? null;
      ScrollTrigger.refresh();
    };

    const rafId = window.requestAnimationFrame(setupAnimations);

    return () => {
      window.cancelAnimationFrame(rafId);
      st?.kill();
      st = null;
    };
  }, [scrollContainerRef, baseOpacity, wordAnimationEnd, reducedMotion]);

  return (
    <As className={`${containerClassName}`}>
      <span
        ref={textRef}
        className={`inline-block ${
          variant === "headline" ? "text-[clamp(1.6rem,4vw,3rem)] leading-[1.4] font-semibold" : ""
        } ${textClassName}`}
      >
        {splitText}
      </span>
    </As>
  );
};

export default ScrollReveal;