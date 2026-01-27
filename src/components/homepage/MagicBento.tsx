import React, { useRef, useEffect, useState, useCallback } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FolderKanban, Users, Shield } from "lucide-react";
import ScrollReveal from "~/components/homepage/ScrollReveal";

gsap.registerPlugin(ScrollTrigger);

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface BentoCardProps {
  color?: string;
  title?: string;
  description?: string;
  label?: string;
  icon?: React.ReactNode;
  textAutoHide?: boolean;
  disableAnimations?: boolean;
}

export interface BentoProps {
  textAutoHide?: boolean;
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  disableAnimations?: boolean;
  spotlightRadius?: number;
  particleCount?: number;
  enableTilt?: boolean;
  glowColor?: string;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
}

const DEFAULT_PARTICLE_COUNT = 12;
const DEFAULT_SPOTLIGHT_RADIUS = 300;
const DEFAULT_GLOW_COLOR = '163, 67, 236';
const MOBILE_BREAKPOINT = 768;

const cardData: BentoCardProps[] = [
  {
    title: 'Organizations',
    description: 'Create dedicated spaces to assign roles and oversee progress with absolute clarity. Control the workflow in real-time.',
    label: 'Organizations',
    icon: <FolderKanban size={24} />
  },
  {
    title: 'Teams',
    description: 'Collaborate securely in real-time spaces. Unify your workflow to ensure the entire team moves in perfect sync.',
    icon: <Users size={24} />
  },
  {
    title: 'Personal Goals',
    description: 'Master your focus. Never lose important notes. Eliminate the noise to find your perfect headspace.',
    icon: <Shield size={24} />
  }
];

const createParticleElement = (x: number, y: number, color: string = DEFAULT_GLOW_COLOR): HTMLDivElement => {
  const el = document.createElement('div');
  el.className = 'particle';
  el.style.cssText = `
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(${color}, 1);
    box-shadow: 0 0 6px rgba(${color}, 0.6);
    pointer-events: none;
    z-index: 100;
    left: ${x}px;
    top: ${y}px;
  `;
  return el;
};

const calculateSpotlightValues = (radius: number) => ({
  proximity: radius * 0.5,
  fadeDistance: radius * 0.75
});

const updateCardGlowProperties = (card: HTMLElement, mouseX: number, mouseY: number, glow: number, radius: number) => {
  const rect = card.getBoundingClientRect();
  const relativeX = ((mouseX - rect.left) / rect.width) * 100;
  const relativeY = ((mouseY - rect.top) / rect.height) * 100;

  card.style.setProperty('--glow-x', `${relativeX}%`);
  card.style.setProperty('--glow-y', `${relativeY}%`);
  card.style.setProperty('--glow-intensity', glow.toString());
  card.style.setProperty('--glow-radius', `${radius}px`);
};

const ParticleCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  disableAnimations?: boolean;
  style?: React.CSSProperties;
  particleCount?: number;
  glowColor?: string;
  enableTilt?: boolean;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
  cardRef?: React.Ref<HTMLDivElement>;
}> = ({
  children,
  className = '',
  disableAnimations = false,
  style,
  particleCount = DEFAULT_PARTICLE_COUNT,
  glowColor = DEFAULT_GLOW_COLOR,
  enableTilt = true,
  clickEffect = false,
  enableMagnetism = false,
  cardRef
}) => {
  const internalCardRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement[]>([]);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const isHoveredRef = useRef(false);
  const memoizedParticles = useRef<HTMLDivElement[]>([]);
  const particlesInitialized = useRef(false);
  const magnetismAnimationRef = useRef<gsap.core.Tween | null>(null);

  const setRefs = useCallback((el: HTMLDivElement | null) => {
    internalCardRef.current = el;
    if (typeof cardRef === 'function') {
      cardRef(el);
    } else if (cardRef && 'current' in cardRef) {
      (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    }
  }, [cardRef]);

  const initializeParticles = useCallback(() => {
    if (particlesInitialized.current || !internalCardRef.current) return;

    const { width, height } = internalCardRef.current.getBoundingClientRect();
    memoizedParticles.current = Array.from({ length: particleCount }, () =>
      createParticleElement(Math.random() * width, Math.random() * height, glowColor)
    );
    particlesInitialized.current = true;
  }, [particleCount, glowColor]);

  const clearAllParticles = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    if (magnetismAnimationRef.current) {
      magnetismAnimationRef.current.kill();
      magnetismAnimationRef.current = null;
    }

    // For reliability on weak devices: remove particles immediately instead of animating teardown.
    particlesRef.current.forEach((particle) => {
      particle?.parentNode?.removeChild(particle);
    });
    particlesRef.current = [];
  }, []);

  const animateParticles = useCallback(() => {
    if (!internalCardRef.current || !isHoveredRef.current) return;

    if (!particlesInitialized.current) {
      initializeParticles();
    }

    // Cap runtime particle DOM for stability.
    const maxParticles = Math.min(particleCount, 10);

    memoizedParticles.current.slice(0, maxParticles).forEach((particle, index) => {
      const timeoutId = setTimeout(() => {
        if (!isHoveredRef.current || !internalCardRef.current) return;

        const clone = particle.cloneNode(true) as HTMLDivElement;
        internalCardRef.current.appendChild(clone);
        particlesRef.current.push(clone);

        // Use only transform/opacity animations.
        gsap.fromTo(clone, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: "power2.out" });

        gsap.to(clone, {
          x: (Math.random() - 0.5) * 60,
          y: (Math.random() - 0.5) * 60,
          duration: 1.6 + Math.random() * 0.8,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        });

        gsap.to(clone, {
          opacity: 0.25,
          duration: 1.2,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        });
      }, index * 120);

      timeoutsRef.current.push(timeoutId);
    });
  }, [initializeParticles, particleCount]);

  useEffect(() => {
    if (disableAnimations || prefersReducedMotion() || !internalCardRef.current) return;

    const element = internalCardRef.current;

    const handleMouseEnter = () => {
      isHoveredRef.current = true;
      animateParticles();

      if (enableTilt && element) {
        gsap.to(element, {
          rotateX: 5,
          rotateY: 5,
          duration: 0.3,
          ease: 'power2.out',
          transformPerspective: 1000
        });
      }
    };

    const handleMouseLeave = () => {
      isHoveredRef.current = false;
      clearAllParticles();

      if (enableTilt && element) {
        gsap.to(element, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.3,
          ease: 'power2.out'
        });
      }

      if (enableMagnetism && element) {
        gsap.to(element, {
          x: 0,
          y: 0,
          duration: 0.3,
          ease: 'power2.out'
        });
      }
    };

    let moveRaf = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (!element || (!enableTilt && !enableMagnetism)) return;

      // Throttle updates to one per frame.
      if (moveRaf) return;
      moveRaf = window.requestAnimationFrame(() => {
        moveRaf = 0;

        const rect = element.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        if (enableTilt) {
          const rotateX = ((y - centerY) / centerY) * -8;
          const rotateY = ((x - centerX) / centerX) * 8;

          gsap.to(element, {
            rotateX,
            rotateY,
            duration: 0.16,
            ease: "power2.out",
            transformPerspective: 1000,
            overwrite: "auto",
          });
        }

        if (enableMagnetism) {
          const magnetX = (x - centerX) * 0.04;
          const magnetY = (y - centerY) * 0.04;

          magnetismAnimationRef.current = gsap.to(element, {
            x: magnetX,
            y: magnetY,
            duration: 0.25,
            ease: "power2.out",
            overwrite: "auto",
          });
        }
      });
    };

    const handleClick = (e: MouseEvent) => {
      if (!clickEffect || !element) return;

      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const maxDistance = Math.max(
        Math.hypot(x, y),
        Math.hypot(x - rect.width, y),
        Math.hypot(x, y - rect.height),
        Math.hypot(x - rect.width, y - rect.height)
      );

      const ripple = document.createElement('div');
      ripple.style.cssText = `
        position: absolute;
        width: ${maxDistance * 2}px;
        height: ${maxDistance * 2}px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(${glowColor}, 0.4) 0%, rgba(${glowColor}, 0.2) 30%, transparent 70%);
        left: ${x - maxDistance}px;
        top: ${y - maxDistance}px;
        pointer-events: none;
        z-index: 1000;
      `;

      element.appendChild(ripple);

      gsap.fromTo(
        ripple,
        {
          scale: 0,
          opacity: 1
        },
        {
          scale: 1,
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out',
          onComplete: () => ripple.remove()
        }
      );
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('click', handleClick);

    return () => {
      isHoveredRef.current = false;
      element.removeEventListener("mouseenter", handleMouseEnter);
      element.removeEventListener("mouseleave", handleMouseLeave);
      element.removeEventListener("mousemove", handleMouseMove);
      element.removeEventListener("click", handleClick);
      clearAllParticles();
      if (moveRaf) window.cancelAnimationFrame(moveRaf);
    };
  }, [animateParticles, clearAllParticles, disableAnimations, enableTilt, enableMagnetism, clickEffect, glowColor]);

  return (
    <div
      ref={setRefs}
      className={`${className} relative overflow-hidden`}
      style={{ ...style, position: 'relative', overflow: 'hidden' }}
    >
      {children}
    </div>
  );
};

const GlobalSpotlight: React.FC<{
  gridRef: React.RefObject<HTMLDivElement | null>;
  disableAnimations?: boolean;
  enabled?: boolean;
  spotlightRadius?: number;
  glowColor?: string;
}> = ({
  gridRef,
  disableAnimations = false,
  enabled = true,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  glowColor = DEFAULT_GLOW_COLOR
}) => {
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const isInsideSection = useRef(false);

  useEffect(() => {
    if (disableAnimations || prefersReducedMotion() || !gridRef?.current || !enabled) return;

    const spotlight = document.createElement('div');
    spotlight.className = 'global-spotlight';
    spotlight.style.cssText = `
      position: fixed;
      width: 800px;
      height: 800px;
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle,
        rgba(${glowColor}, 0.15) 0%,
        rgba(${glowColor}, 0.08) 15%,
        rgba(${glowColor}, 0.04) 25%,
        rgba(${glowColor}, 0.02) 40%,
        rgba(${glowColor}, 0.01) 65%,
        transparent 70%
      );
      z-index: 200;
      opacity: 0;
      transform: translate(-50%, -50%);
      mix-blend-mode: screen;
    `;
    document.body.appendChild(spotlight);
    spotlightRef.current = spotlight;

    let moveRaf = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const spotlightElement = spotlightRef.current;
      const gridElement = gridRef.current;
      if (!spotlightElement || !gridElement) return;

      if (moveRaf) return;
      moveRaf = window.requestAnimationFrame(() => {
        moveRaf = 0;

      const section = gridElement.closest('.bento-section');
      const rect = section?.getBoundingClientRect();
      const mouseInside =
        rect && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;

      isInsideSection.current = mouseInside ?? false;
      const cards = gridElement.querySelectorAll('.card');

      if (!mouseInside) {
        gsap.to(spotlightElement, {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.out'
        });
        cards.forEach(card => {
          (card as HTMLElement).style.setProperty('--glow-intensity', '0');
        });
        return;
      }

      const { proximity, fadeDistance } = calculateSpotlightValues(spotlightRadius);
      let minDistance = Infinity;

      cards.forEach(card => {
        const cardElement = card as HTMLElement;
        const cardRect = cardElement.getBoundingClientRect();
        const centerX = cardRect.left + cardRect.width / 2;
        const centerY = cardRect.top + cardRect.height / 2;
        const distance =
          Math.hypot(e.clientX - centerX, e.clientY - centerY) - Math.max(cardRect.width, cardRect.height) / 2;
        const effectiveDistance = Math.max(0, distance);

        minDistance = Math.min(minDistance, effectiveDistance);

        let glowIntensity = 0;
        if (effectiveDistance <= proximity) {
          glowIntensity = 1;
        } else if (effectiveDistance <= fadeDistance) {
          glowIntensity = (fadeDistance - effectiveDistance) / (fadeDistance - proximity);
        }

        updateCardGlowProperties(cardElement, e.clientX, e.clientY, glowIntensity, spotlightRadius);
      });

      gsap.to(spotlightElement, {
        left: e.clientX,
        top: e.clientY,
        duration: 0.1,
        ease: 'power2.out'
      });

      const targetOpacity =
        minDistance <= proximity
          ? 0.8
          : minDistance <= fadeDistance
            ? ((fadeDistance - minDistance) / (fadeDistance - proximity)) * 0.8
            : 0;

       gsap.to(spotlightElement, {
         opacity: targetOpacity,
         duration: targetOpacity > 0 ? 0.2 : 0.5,
         ease: "power2.out",
         overwrite: "auto",
       });
     });
   };

    const handleMouseLeave = () => {
      isInsideSection.current = false;
      gridRef.current?.querySelectorAll('.card').forEach(card => {
        (card as HTMLElement).style.setProperty('--glow-intensity', '0');
      });
      const spotlightElement = spotlightRef.current;
      if (spotlightElement) {
        gsap.to(spotlightElement, {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.out'
        });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      if (moveRaf) window.cancelAnimationFrame(moveRaf);
      const spotlightElement = spotlightRef.current;
      spotlightElement?.parentNode?.removeChild(spotlightElement);
    };
  }, [gridRef, disableAnimations, enabled, spotlightRadius, glowColor]);

  return null;
};

const BentoCardGrid: React.FC<{
  children: React.ReactNode;
  gridRef?: React.RefObject<HTMLDivElement | null>;
}> = ({ children, gridRef }) => (
  <div
    className="bento-section w-full select-none relative"
    ref={gridRef}
  >
    {children}
  </div>
);

const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

let isStylesInjected = false;

const GlobalBentoStyles: React.FC<{ glowColor: string }> = ({ glowColor }) => {
  useEffect(() => {
    if (isStylesInjected) return;

    const styleTag = document.createElement('style');
    styleTag.setAttribute('data-bento-styles', 'true');
    styleTag.innerHTML = `
      .bento-section {
        --glow-x: 50%;
        --glow-y: 50%;
        --glow-intensity: 0;
        --glow-radius: 200px;
        --glow-color: ${glowColor};
        --border-color: rgb(var(--border-light) / 0.45);
        --surface: rgb(var(--bg-surface));
        --surface-2: rgb(var(--bg-secondary));
        --text: rgb(var(--text-primary));
      }
      
      .kairos-card-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1.75rem;
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
        padding: 0;
        box-sizing: border-box;
      }
      
      @media (max-width: 1024px) {
        .kairos-card-grid {
          grid-template-columns: repeat(2, 1fr);
          max-width: 800px;
        }
      }
      
      @media (max-width: 767px) {
        .kairos-card-grid {
          grid-template-columns: 1fr;
          max-width: 480px;
          gap: 1rem;
        }
      }
      
      .card--border-glow::after {
        content: '';
        position: absolute;
        inset: 0;
        padding: 2px;
        background: radial-gradient(var(--glow-radius) circle at var(--glow-x) var(--glow-y),
            rgba(${glowColor}, calc(var(--glow-intensity) * 0.8)) 0%,
            rgba(${glowColor}, calc(var(--glow-intensity) * 0.4)) 30%,
            transparent 60%);
        border-radius: inherit;
        mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        mask-composite: subtract;
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        pointer-events: none;
        transition: opacity 0.3s ease;
        z-index: 1;
      }
      
      .card--border-glow:hover::after {
        opacity: 1;
      }
      
      .card--border-glow:hover {
        box-shadow: 0 4px 20px rgba(${glowColor}, 0.2);
      }
      
      .particle::before {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        background: rgba(${glowColor}, 0.2);
        border-radius: 50%;
        z-index: -1;
      }
    `;

    document.head.appendChild(styleTag);
    isStylesInjected = true;

    return () => {
      // Keep styles injected
    };
  }, [glowColor]); 

  return null;
};

const MagicBento: React.FC<BentoProps> = ({
  textAutoHide: _textAutoHide = false,
  enableStars = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  disableAnimations = false,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  particleCount = DEFAULT_PARTICLE_COUNT,
  enableTilt = false,
  glowColor = DEFAULT_GLOW_COLOR,
  clickEffect = true,
  enableMagnetism = true
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isMobile = useMobileDetection();
  const shouldDisableAnimations = disableAnimations || isMobile;

  const iconTokens = [
    {
      bg: 'rgb(var(--accent-primary) / 0.16)',
      border: 'rgb(var(--accent-primary) / 0.28)',
      fg: 'rgb(var(--accent-primary))'
    },
    {
      bg: 'rgb(var(--warning-light))',
      border: 'rgb(var(--warning) / 0.30)',
      fg: 'rgb(var(--warning))'
    },
    {
      bg: 'rgb(var(--success-light))',
      border: 'rgb(var(--success) / 0.30)',
      fg: 'rgb(var(--success))'
    }
  ];

  // Enhanced GSAP scroll animations for cards - smooth fade in with scroll
  useEffect(() => {
    if (shouldDisableAnimations || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      // Cheap initial state: transform+opacity only.
      gsap.set(cardRefs.current, {
        opacity: 0,
        y: 28,
        scale: 0.96,
        transformOrigin: "center bottom",
      });

      const gridTl = gsap.timeline({
        scrollTrigger: {
          trigger: gridRef.current,
          start: "top 80%",
          end: "center center",
          scrub: 0.8,
          toggleActions: "play none none reverse",
          markers: false,
        },
      });

      gridTl.to(cardRefs.current, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.7,
        ease: "power2.out",
        stagger: 0,
        onComplete: () => {
          cardRefs.current.forEach((el) => {
            if (!el) return;
            (el as HTMLElement).style.willChange = "auto";
          });
        },
      });

      if (gridRef.current) {
        gsap.to(gridRef.current, {
          y: -20,
          ease: "none",
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.5,
          },
        });
      }
    }, gridRef);

    return () => ctx.revert();
  }, [shouldDisableAnimations]);

  const renderCardContent = (card: BentoCardProps, index: number) => (
    <div className="flex flex-col gap-5 relative z-10">
      <div
        style={{
          width: '48px',
          height: '48px',
          backgroundColor: iconTokens[index]?.bg,
          border: `1px solid ${iconTokens[index]?.border}`,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: iconTokens[index]?.fg
        }}
      >
        {card.icon}
      </div>
      <div>
        <h4 className="text-xl font-bold text-fg-primary mb-3">
          <ScrollReveal as="span" variant="inherit" baseOpacity={0.15}>
            {card.title ?? ''}
          </ScrollReveal>
        </h4>
        <p className="text-fg-secondary leading-relaxed text-sm">
          <ScrollReveal as="span" variant="inherit" baseOpacity={0.15}>
            {card.description ?? ''}
          </ScrollReveal>
        </p>
      </div>
    </div>
  );

  return (
    <>
      <GlobalBentoStyles glowColor={glowColor} />

      {enableSpotlight && (
        <GlobalSpotlight
          gridRef={gridRef}
          disableAnimations={shouldDisableAnimations}
          enabled={enableSpotlight}
          spotlightRadius={spotlightRadius}
          glowColor={glowColor}
        />
      )}

      <BentoCardGrid gridRef={gridRef}>
        <div className="kairos-card-grid">
          {cardData.map((card, index) => {
            const baseClassName = `card flex flex-col justify-between relative min-h-[240px] w-full p-7 rounded-2xl border border-solid overflow-hidden transition-all duration-300 ease-in-out ${
              enableBorderGlow ? 'card--border-glow' : ''
            }`;

            const cardStyle = {
              backgroundImage: 'linear-gradient(180deg, var(--surface) 0%, var(--surface-2) 100%)',
              borderColor: 'var(--border-color)',
              color: 'var(--text)',
              backdropFilter: 'blur(8px)',
              '--glow-x': '50%',
              '--glow-y': '50%',
              '--glow-intensity': '0',
              '--glow-radius': '200px'
            } as React.CSSProperties;

            if (enableStars) {
              return (
                <ParticleCard
                  key={index}
                  className={baseClassName}
                  style={cardStyle}
                  disableAnimations={shouldDisableAnimations}
                  particleCount={particleCount}
                  glowColor={glowColor}
                  enableTilt={enableTilt}
                  clickEffect={clickEffect}
                  enableMagnetism={enableMagnetism}
                  cardRef={(el) => { cardRefs.current[index] = el; }}
                >
                  {renderCardContent(card, index)}
                </ParticleCard>
              );
            }

            return (
              <div 
                key={index} 
                className={baseClassName} 
                style={cardStyle}
                ref={(el) => { cardRefs.current[index] = el; }}
              >
                {renderCardContent(card, index)}
              </div>
            );
          })}
        </div>
      </BentoCardGrid>
    </>
  );
};

export default MagicBento;