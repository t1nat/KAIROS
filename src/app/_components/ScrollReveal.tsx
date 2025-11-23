// ScrollReveal.tsx
"use client";

import React, { useEffect, useRef, useMemo, type ReactNode, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';


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

        const scroller = scrollContainerRef?.current ?? undefined;
        const triggers: ScrollTrigger[] = [];

        // Wait for DOM to be ready
        const setupAnimations = () => {
            // Rotation animation
            const rotationTween = gsap.fromTo(
                el,
                { transformOrigin: '0% 50%', rotate: baseRotation },
                {
                    ease: 'none',
                    rotate: 0,
                    scrollTrigger: {
                        trigger: el,
                        scroller,
                        start: 'top bottom',
                        end: rotationEnd,
                        scrub: true
                    }
                }
            );
            if (rotationTween.scrollTrigger) {
                triggers.push(rotationTween.scrollTrigger as ScrollTrigger);
            }

            const wordElements = el.querySelectorAll<HTMLElement>('.word');
            if (wordElements.length === 0) return;

            // Opacity animation
            const opacityTween = gsap.fromTo(
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
            if (opacityTween.scrollTrigger) {
                triggers.push(opacityTween.scrollTrigger as ScrollTrigger);
            }

            // Blur animation
            if (enableBlur) {
                const blurTween = gsap.fromTo(
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
                if (blurTween.scrollTrigger) {
                    triggers.push(blurTween.scrollTrigger as ScrollTrigger);
                }
            }

            ScrollTrigger.refresh();
        };

        requestAnimationFrame(setupAnimations);

        return () => {
            triggers.forEach(trigger => trigger.kill());
        };
    }, [scrollContainerRef, enableBlur, baseRotation, baseOpacity, rotationEnd, wordAnimationEnd, blurStrength]);

    return (
        <h2 ref={containerRef} className={`my-5 will-change-transform ${containerClassName}`}>
            <span className={`inline-block text-[clamp(1.6rem,4vw,3rem)] leading-[1.5] font-semibold ${textClassName}`}>
                {splitText}
            </span>
        </h2>
    );
};

export default ScrollReveal; 