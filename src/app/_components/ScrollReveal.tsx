// ScrollReveal.tsx
"use client";

import React, { useEffect, useRef, useMemo, type ReactNode, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Fix: Suppress unsafe access/call errors for registerPlugin, which is standard GSAP setup
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
gsap.registerPlugin(ScrollTrigger);

interface ScrollRevealProps {
    children: ReactNode;
    scrollContainerRef?: RefObject<HTMLElement>;
    enableBlur?: boolean;
    baseOpacity?: number;
    baseRotation?: number;
    blurStrength?: number;
    containerClassName?: string;
    textClassName?: string;
    rotationEnd?: string;
    wordAnimationEnd?: string;
}

const ScrollReveal: React.FC<ScrollRevealProps> = ({
    children,
    scrollContainerRef,
    enableBlur = true,
    baseOpacity = 0.1,
    baseRotation = 3,
    blurStrength = 4,
    containerClassName = '',
    textClassName = '',
    rotationEnd = 'bottom bottom',
    wordAnimationEnd = 'bottom bottom'
}) => {
    const containerRef = useRef<HTMLHeadingElement>(null);

    const splitText = useMemo(() => {
        if (typeof children !== 'string') {
            return children;
        }

        return children.split(/\s+/).map((word, index) => {
            if (!word) return null;
            return (
                <span className="inline-block word" key={index}>
                    {word}{' '}
                </span>
            );
        });
    }, [children]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        // Uses nullish coalescing `??` for safer type assertion
        const scroller = scrollContainerRef?.current ?? window;

        // Fix: Suppress unsafe access/call errors for gsap.fromTo
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        gsap.fromTo(
            el,
            { transformOrigin: '0% 50%', rotate: baseRotation },
            {
                ease: 'none',
                rotate: 0,
                scrollTrigger: {
                    trigger: el,
                    scroller, // scroller is correctly typed as HTMLElement | Window
                    start: 'top bottom',
                    end: rotationEnd,
                    scrub: true
                }
            }
        );

        const wordElements = el.querySelectorAll<HTMLElement>('.word');
        if (wordElements.length === 0) return;

        // Fix: Suppress unsafe access/call errors for gsap.fromTo
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        gsap.fromTo(
            wordElements,
            { opacity: baseOpacity, willChange: 'opacity' },
            {
                ease: 'none',
                opacity: 1,
                stagger: 0.05,
                scrollTrigger: {
                    trigger: el,
                    scroller,
                    start: 'top bottom-=20%',
                    end: wordAnimationEnd,
                    scrub: true
                }
            }
        );

        if (enableBlur) {
            // Fix: Suppress unsafe access/call errors for gsap.fromTo
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            gsap.fromTo(
                wordElements,
                { filter: `blur(${blurStrength}px)` },
                {
                    ease: 'none',
                    filter: 'blur(0px)',
                    stagger: 0.05,
                    scrollTrigger: {
                        trigger: el,
                        scroller,
                        start: 'top bottom-=20%',
                        end: wordAnimationEnd,
                        scrub: true
                    }
                }
            );
        }

        return () => {
            // Fix: Suppress unsafe errors and explicitly return `void` (no value) to satisfy no-unsafe-return.
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
            ScrollTrigger.getAll().forEach(trigger => trigger.kill());
        };
    }, [scrollContainerRef, enableBlur, baseRotation, baseOpacity, rotationEnd, wordAnimationEnd, blurStrength]);

    return (
        <h2 ref={containerRef} className={`my-5 ${containerClassName}`}>
            <span className={`inline-block text-[clamp(1.6rem,4vw,3rem)] leading-[1.5] font-semibold ${textClassName}`}>
                {splitText}
            </span>
        </h2>
    );
};

export default ScrollReveal;