"use client";

import React, { useEffect, useMemo, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface ScrollFloatProps {
  children: ReactNode;
  scrollContainerRef?: RefObject<HTMLElement>;
  containerClassName?: string;
  textClassName?: string;
  animationDuration?: number;
  ease?: string;
  scrollStart?: string;
  scrollEnd?: string;
  stagger?: number;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const ScrollFloat: React.FC<ScrollFloatProps> = ({
  children,
  scrollContainerRef,
  containerClassName = "",
  textClassName = "",
  animationDuration = 0.6,
  ease = "power2.out",
  scrollStart = "top bottom-=10%",
  scrollEnd = "top center+=10%",
  stagger = 0.015,
}) => {
  const containerRef = useRef<HTMLHeadingElement>(null);
  const reducedMotion = prefersReducedMotion();

  const splitText = useMemo(() => {
    const text = typeof children === "string" ? children : "";

    // Keep DOM size bounded for slow devices.
    // If text is very long, fall back to non-split rendering.
    if (text.length > 200) return text;

    return text.split("").map((char, index) => (
      <span className="inline-block char-float" key={index}>
        {char === " " ? "\u00A0" : char}
      </span>
    ));
  }, [children]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (reducedMotion) {
      const charElements = el.querySelectorAll<HTMLElement>(".char-float");
      charElements.forEach((node) => {
        node.style.opacity = "1";
        node.style.transform = "none";
        node.style.filter = "none";
        node.style.willChange = "auto";
      });
      return;
    }

    const scroller = scrollContainerRef?.current ?? window;
    const charElements = el.querySelectorAll<HTMLElement>(".char-float");
    if (!charElements.length) return;

    // Avoid animating blur/filter on low-end machines (expensive). Keep it transform+opacity only.
    gsap.set(charElements, {
      opacity: 0,
      y: 20,
      scale: 0.95,
      willChange: "opacity, transform",
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        scroller,
        start: scrollStart,
        end: scrollEnd,
        scrub: 1,
      },
    });

    tl.to(charElements, {
      duration: animationDuration,
      ease,
      opacity: 1,
      y: 0,
      scale: 1,
      stagger,
      onComplete: () => {
        charElements.forEach((node) => {
          node.style.willChange = "auto";
        });
      },
    });

    const st = tl.scrollTrigger;

    return () => {
      st?.kill();
      tl.kill();
    };
  }, [scrollContainerRef, animationDuration, ease, scrollStart, scrollEnd, stagger, reducedMotion]);

  return (
    <h2 ref={containerRef} className={`my-5 ${containerClassName}`}>
      <span className={`inline-block text-[clamp(1.6rem,4vw,3rem)] leading-[1.5] ${textClassName}`}>
        {splitText}
      </span>
    </h2>
  );
};

export default ScrollFloat;