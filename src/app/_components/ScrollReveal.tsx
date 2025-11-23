import React, { useRef, useMemo, type ReactNode, type RefObject, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Define the expected props for the ScrollReveal component
export interface ScrollRevealProps {
    children: ReactNode;
    scrollContainerRef?: RefObject<HTMLElement>;
    enableBlur?: boolean;
    baseOpacity?: number;
    baseRotation?: number;
    baseY?: number;
    blurStrength?: number;
    containerClassName?: string;
    textClassName?: string;
    rotationEnd?: string;
    wordAnimationEnd?: string;
    staggerDelay?: number;
    ease?: string;
}

const ScrollReveal: React.FC<ScrollRevealProps> = ({
    children,
    scrollContainerRef,
    enableBlur = true,
    baseOpacity = 0.1,
    baseRotation = 3,
    baseY = 0,
    blurStrength = 4,
    containerClassName = '',
    textClassName = '',
    rotationEnd = 'bottom bottom',
    wordAnimationEnd = 'bottom bottom',
    staggerDelay = 0,
    ease = 'none'
}) => {
    // Use a generic HTMLElement ref for flexibility
    const containerRef = useRef<HTMLElement>(null);
    
    // Check if children is a string and split it for animation. 
    // If not a string, return children directly.
    const splitTextChildren = useMemo(() => {
        // Handle cases where children is a component or not a string
        if (typeof children !== 'string') {
            return children;
        }

        const text = children;
        const whitespaceRegex = /^\s+$/;
        return text.split(/(\s+)/).map((word, index) => {
            // If it's whitespace, render it directly
            // Using test() or direct comparison (word.trim() === '') is better here.
            if (whitespaceRegex.test(word)) { 
                return <span key={index} className="whitespace-pre">{word}</span>;
            }
            // Otherwise wrap the word
            return (
                <span className="inline-block word" key={index}>
                    {word}
                </span>
            );
        });
    }, [children]);

    // Use useLayoutEffect for GSAP animations to prevent FOUC (Flash of unstyled content)
    useLayoutEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        // Uses nullish coalescing `??` for safer type assertion
        const scroller = scrollContainerRef?.current ?? window;

        // Initial setup with delay
        const initialProps: gsap.TweenVars = { 
            transformOrigin: '0% 50%', 
            rotate: baseRotation,
            opacity: baseOpacity
        };

        // Add baseY if it's not zero
        if (baseY !== 0) {
            initialProps.y = baseY;
        }

        // Set initial state
        gsap.set(el, initialProps);

        // Animate to final state with delay
        const animationProps: gsap.TweenVars = {
            ease: ease,
            rotate: 0,
            opacity: 1,
            delay: staggerDelay
        };

        if (baseY !== 0) {
            animationProps.y = 0;
        }

        // For scroll-triggered animations (if rotationEnd is provided)
        if (rotationEnd && rotationEnd !== 'bottom bottom') {
            animationProps.scrollTrigger = {
                trigger: el,
                scroller,
                start: 'top bottom',
                end: rotationEnd,
                scrub: true
            };
        }

        gsap.to(el, animationProps);

        // Animation for individual words (only if text was split)
        const wordElements = el.querySelectorAll<HTMLElement>('.word');
        if (wordElements.length > 0) { 
            // Opacity Animation
            gsap.fromTo(
                wordElements,
                { opacity: baseOpacity, willChange: 'opacity' },
                {
                    ease: ease || 'none',
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

            // Blur Animation (if enabled)
            if (enableBlur) {
                gsap.fromTo(
                    wordElements,
                    { filter: `blur(${blurStrength}px)` },
                    {
                        ease: ease || 'none',
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
        }

        return () => {
            // Cleanup: Kill all ScrollTriggers associated with this element to prevent memory leaks
            ScrollTrigger.getAll().forEach(trigger => {
                if (trigger.trigger === el) {
                    trigger.kill();
                }
            });
            // Kill tweens of the main element to prevent conflicts on re-render
            gsap.killTweensOf(el);
        };
    }, [scrollContainerRef, enableBlur, baseRotation, baseOpacity, baseY, rotationEnd, wordAnimationEnd, blurStrength, staggerDelay, ease, children]);

    // Render the children
    return (
        <h2 ref={containerRef as RefObject<HTMLHeadingElement>} className={`my-5 ${containerClassName}`}>
            <span className={`inline-block text-[clamp(1.6rem,4vw,3rem)] leading-[1.5] font-semibold ${textClassName}`}>
                {splitTextChildren}
            </span>
        </h2>
    );
};

export default ScrollReveal;