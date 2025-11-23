import React, { useEffect, useRef, useMemo, type ReactNode, type RefObject, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Use useLayoutEffect or check for 'undefined' to safely register plugin on client side
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// Define the expected props for the ScrollReveal component
interface ScrollRevealProps {
    // Allows any React child, but the text splitting logic will only run if children is a string.
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
    // Use a generic HTMLElement ref for flexibility
    const containerRef = useRef<HTMLElement>(null);
    
    // Check if children is a string and split it for animation. 
    // If not a string (e.g., a component), return children directly.
    const splitContent = useMemo(() => {
        // Handle cases where children is a component or not a string
        if (typeof children !== 'string') {
            return children;
        }

        const text = children;
        return text.split(/(\s+)/).map((word, index) => {
            // If it's whitespace, render it directly
            if (word.match(/^\s+$/)) {
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

        // Determine the scroller (either provided ref or the window)
        const scroller = scrollContainerRef?.current ?? window;
        
        // Check if we need to run word animation (only if children was a string)
        const isStringContent = typeof children === 'string';

        // Use gsap.context for easy cleanup
        let ctx: gsap.Context;
        
        try {
             // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            ctx = gsap.context(() => {
                const wordElements = el.querySelectorAll<HTMLElement>('.word');
                const targetElement = isStringContent ? wordElements : el;

                // 1. Rotation Animation (Applies to the container)
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                gsap.fromTo(
                    el,
                    { transformOrigin: '0% 50%', rotate: baseRotation },
                    {
                        ease: 'none',
                        rotate: 0,
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
                        scrollTrigger: {
                            trigger: el,
                            scroller,
                            start: 'top bottom',
                            end: rotationEnd,
                            scrub: true
                        }
                    }
                );
                
                // 2. Opacity and Blur Animations (Apply to words or the container)
                // Note: The word animations will only run if wordElements is populated
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                gsap.fromTo(
                    targetElement,
                    { opacity: baseOpacity, willChange: 'opacity, filter' },
                    {
                        ease: 'none',
                        opacity: 1,
                        // Stagger only works on a list of elements (words)
                        stagger: isStringContent ? 0.05 : 0, 
                         // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
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
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                    gsap.fromTo(
                        targetElement,
                        { filter: `blur(${blurStrength}px)` },
                        {
                            ease: 'none',
                            filter: 'blur(0px)',
                            stagger: isStringContent ? 0.05 : 0,
                             // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
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
            }, el); // <- Scope the context to the element

        } catch(error) {
            console.error("GSAP ScrollReveal error:", error);
            // Fallback for cleanup in case of error
             // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            ctx?.revert();
        }

        return () => {
            // Cleanup: remove all GSAP logic tied to this component instance
             // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            ctx?.revert();
        };
    }, [children, scrollContainerRef, enableBlur, baseRotation, baseOpacity, rotationEnd, wordAnimationEnd, blurStrength]);

    // Render the children, wrapped in a div/p only if it was a string and split,
    // otherwise render the children directly inside the container ref.
    return (
        // Use a generic wrapper like 'div' instead of 'h2' to avoid semantic issues when wrapping non-heading content like MagicBento.
        <div ref={containerRef} className={containerClassName}>
            {typeof children === 'string' ? (
                // Only wrap with <p> and apply text styling if it was a string that was split
                <p className={`text-[clamp(1.6rem,4vw,3rem)] leading-[1.5] font-semibold ${textClassName}`}>
                    {splitContent}
                </p>
            ) : (
                // If the child is a complex component (like MagicBento), render it directly
                splitContent
            )}
        </div>
    );
};

export default ScrollReveal;