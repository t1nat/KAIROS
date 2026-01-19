"use client";

import React, { useEffect, useRef, useMemo, type ReactNode, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ScrollRevealProps {
    children: ReactNode;
    scrollContainerRef?: RefObject<HTMLElement>;
    baseOpacity?: number;
    as?: React.ElementType;
    variant?: 'headline' | 'inherit';
    containerClassName?: string;
    textClassName?: string;
    wordAnimationEnd?: string;
}

const ScrollReveal: React.FC<ScrollRevealProps> = ({
    children,
    scrollContainerRef,
    baseOpacity = 0.15,
    as: As = 'h2',
    variant = 'headline',
    containerClassName = '',
    textClassName = '',
    wordAnimationEnd = 'center center'
}) => {
    const textRef = useRef<HTMLSpanElement>(null);

    const splitText = useMemo(() => {
        if (typeof children !== 'string') {
            return children;
        }

        const words = children.split(/\s+/).filter(Boolean);

        return words.map((word, index) => (
            <React.Fragment key={index}>
                <span className="inline-block word">{word}</span>
                {index < words.length - 1 ? ' ' : null}
            </React.Fragment>
        ));
    }, [children]);

    useEffect(() => {
        const el = textRef.current;
        if (!el) return;

        const directParent = el.parentElement;
        const triggerEl =
            directParent?.tagName === 'SPAN'
            ? directParent.parentElement ?? directParent
                : directParent ?? el;

        const scroller = scrollContainerRef?.current ?? undefined;
        const triggers: ScrollTrigger[] = [];

        const setupAnimations = () => {
            const wordElements = el.querySelectorAll<HTMLElement>('.word');
            if (wordElements.length === 0) return;

            // Set initial state
            gsap.set(wordElements, {
                opacity: baseOpacity,
                filter: 'blur(5px)',
                y: 15,
                scale: 0.95,
                rotationX: 5,
                willChange: 'opacity, filter, transform'
            });

            // Create a smooth fade-in animation that reveals words as you scroll
            const opacityTween = gsap.to(wordElements, {
                opacity: 1,
                filter: 'blur(0px)',
                y: 0,
                scale: 1,
                rotationX: 0,
                ease: 'none',
                stagger: 0.03,
                scrollTrigger: {
                    trigger: triggerEl,
                    scroller,
                    start: 'top 85%',
                    end: wordAnimationEnd,
                    scrub: 1
                }
            });

            const st = opacityTween.scrollTrigger;
            if (st) {
                triggers.push(st);
            }

            ScrollTrigger.refresh();
        };

        requestAnimationFrame(setupAnimations);

        return () => {
            triggers.forEach(trigger => trigger.kill());
        };
    }, [scrollContainerRef, baseOpacity, wordAnimationEnd]);

    return (
        <As className={`${containerClassName}`}>
            <span
                ref={textRef}
                className={`inline-block ${
                    variant === 'headline'
                        ? 'text-[clamp(1.6rem,4vw,3rem)] leading-[1.4] font-semibold'
                        : ''
                } ${textClassName}`}
            >
                {splitText}
            </span>
        </As>
    );
};

export default ScrollReveal;