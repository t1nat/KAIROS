"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { UserDisplay } from "~/components/layout/UserDisplay";
import { SignInModal } from "~/components/auth/SignInModal";
import { RoleSelectionModal } from "~/components/auth/RoleSelectionModal";
import MagicBento from "~/components/homepage/MagicBento";
import { api } from "~/trpc/react";
import {
    Calendar,
    ArrowRight,
    Zap,
    Lock,
    Sparkles,
} from "lucide-react";

import ScrollReveal from "~/components/homepage/ScrollReveal";

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface SessionData {
    user?: { name?: string | null; id?: string } | null;
}

function useThemeColorTick(): number {
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const el = document.documentElement;

        const obs = new MutationObserver(() => setTick((t: number) => t + 1));
        obs.observe(el, {
            attributes: true,
            attributeFilter: ["class", "data-accent", "style"],
        });

        return () => obs.disconnect();
    }, []);

    return tick;
}

function parseRgbTriplet(raw: string): [number, number, number] | null {
    const cleaned = raw.trim();
    if (!cleaned) return null;

    const parts = cleaned.split(/[\s,]+/).filter(Boolean);
    if (parts.length < 3) return null;

    const r = Number(parts[0]);
    const g = Number(parts[1]);
    const b = Number(parts[2]);
    if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null;

    return [r, g, b];
}

function getCssVarRgb(varName: string): [number, number, number] | null {
    if (typeof document === "undefined") return null;
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName);
    return parseRgbTriplet(value);
}

function rotateHue(rgb: [number, number, number], degrees: number): [number, number, number] {
    const r = rgb[0] / 255;
    const g = rgb[1] / 255;
    const b = rgb[2] / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
    }

    h = (h + degrees / 360 + 1) % 1;

    const hue2rgb = (p: number, q: number, t: number): number => {
        let tt = t;
        if (tt < 0) tt += 1;
        if (tt > 1) tt -= 1;
        if (tt < 1 / 6) return p + (q - p) * 6 * tt;
        if (tt < 1 / 2) return q;
        if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
        return p;
    };

    if (s === 0) {
        const gray = Math.round(l * 255);
        return [gray, gray, gray];
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    return [
        Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
        Math.round(hue2rgb(p, q, h) * 255),
        Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
    ];
}

// Default purple fallback
const DEFAULT_PRIMARY: [number, number, number] = [139, 92, 246];

export function HomeClient({ session }: {
    session: SessionData | null;
}) {
    const searchParams = useSearchParams();
    const isSwitchingAccount = searchParams?.get("switchAccount") === "1";
    const { resolvedTheme } = useTheme();
    const [themeMounted, setThemeMounted] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showRoleSelection, setShowRoleSelection] = useState(false);
    const [hasAnimated, setHasAnimated] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const aboutRef = useRef<HTMLElement>(null);
    const subtitleRef = useRef<HTMLParagraphElement>(null);
    const projectSpaceButtonRef = useRef<HTMLAnchorElement>(null);
    const whyTeamsCardsRef = useRef<HTMLDivElement[]>([]);
    
    // Watch for accent color changes
    const colorTick = useThemeColorTick();

    const { data: userProfile, isLoading: isProfileLoading, refetch: refetchUserProfile } = api.user.getProfile.useQuery(undefined, {
        enabled: !!session?.user,
    });

    useEffect(() => {
        if (session?.user && userProfile !== undefined && !isProfileLoading) {
            // Show role selection ONLY for true first-time users, not when switching accounts
            // Treat null/undefined usageMode consistently and avoid race conditions.
            const hasUsageMode = userProfile?.usageMode != null;
            const hasOrganizations = (userProfile?.organizations?.length ?? 0) > 0;
            let isFirstTimeUser = !hasUsageMode && !hasOrganizations;

            // If we have a createdAt timestamp, only treat accounts created very recently
            // as first-time. This prevents showing the modal for existing users whose
            // profile may temporarily appear without usageMode during loading.
            const createdAtRaw = userProfile?.createdAt;

            // If we have a createdAt timestamp, only treat accounts created very recently
            // as first-time. This prevents showing the modal for existing users whose
            // profile may temporarily appear without usageMode during loading.
            if (isFirstTimeUser && createdAtRaw) {
                const createdAt = typeof createdAtRaw === "string" ? new Date(createdAtRaw) : createdAtRaw;
                const ageMs = Date.now() - createdAt.getTime();
                const FIVE_MINUTES = 5 * 60 * 1000;
                // Consider account "new" only if created within last 5 minutes
                isFirstTimeUser = ageMs >= 0 && ageMs < FIVE_MINUTES;
            }

            // Respect a client-side flag so the modal doesn't keep reappearing
            const hasShownFlag = typeof window !== "undefined" && window.localStorage?.getItem("kairos_role_selection_shown") === "1";

            if (!isSwitchingAccount && isFirstTimeUser && !hasShownFlag) {
                // Mark as shown so we don't repeatedly show it
                try { window.localStorage?.setItem("kairos_role_selection_shown", "1"); } catch {}
                setShowRoleSelection(true);
            }
        }
    }, [session, userProfile, isProfileLoading, isSwitchingAccount]);

    useEffect(() => {
        setHasAnimated(true);
    }, []);

    useEffect(() => {
        setThemeMounted(true);
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (searchParams?.get("switchAccount") === "1") {
            setIsModalOpen(true);
        }
    }, [searchParams]);

    // Animate Why Teams Choose Kairos cards with blurred fade in
    useEffect(() => {
        if (!whyTeamsCardsRef.current.length) return;

        const ctx = gsap.context(() => {
            // Set initial states for dynamic entrance from below
            gsap.set(whyTeamsCardsRef.current, {
                opacity: 0,
                filter: 'blur(10px)',
                y: 60,
                scale: 0.8,
                rotationY: 20,
                transformOrigin: 'center bottom'
            });

            // Left cards (0 and 2) slide from left with additional offset
            gsap.set([whyTeamsCardsRef.current[0], whyTeamsCardsRef.current[2]], {
                x: -80
            });

            // Right cards (1 and 3) slide from right with additional offset
            gsap.set([whyTeamsCardsRef.current[1], whyTeamsCardsRef.current[3]], {
                x: 80
            });

            // Animate all cards with dynamic effects
            gsap.to(whyTeamsCardsRef.current, {
                opacity: 1,
                filter: 'blur(0px)',
                x: 0,
                y: 0,
                scale: 1,
                rotationY: 0,
                duration: 1.2,
                ease: 'back.out(1.7)',
                stagger: 0.15,
                scrollTrigger: {
                    trigger: whyTeamsCardsRef.current[0]?.parentElement,
                    start: 'top 80%',
                    toggleActions: 'play none none none',
                    markers: false
                }
            });
        });

        return () => ctx.revert();
    }, []);

 useEffect(() => {
    if (!subtitleRef.current) return;

    const ctx = gsap.context(() => {
        gsap.fromTo(
            subtitleRef.current,
            {
                opacity: 0,
                filter: 'blur(5px)',
                y: 30,
                scale: 0.9,
                rotationX: 20
            },
            {
                opacity: 1,
                filter: 'blur(0px)',
                y: 0,
                scale: 1,
                rotationX: 0,
                duration: 0.8,
                ease: 'back.out(1.7)',
                scrollTrigger: {
                    trigger: subtitleRef.current,
                    start: 'top 85%',
                    scrub: 1,
                    toggleActions: 'play none none reverse'
                }
            }
        );
    });

    return () => ctx.revert();
}, []);

    const handleRoleSelectionComplete = async () => {
        setShowRoleSelection(false);
        try { window.localStorage?.setItem("kairos_role_selection_shown", "1"); } catch {}
        await refetchUserProfile();
        window.location.href = "/create";
    };

    const handleSignInClose = () => {
        setIsModalOpen(false);

        if (session?.user) {
            // Auto-scroll to project space button after successful login
            // Role selection modal will be shown by useEffect once profile data loads
            setTimeout(() => {
                projectSpaceButtonRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 300);
        }
    };

    const showActionButtons = session && !showRoleSelection && userProfile !== undefined && userProfile !== null && userProfile.usageMode !== null;
    const isDarkTheme = themeMounted ? resolvedTheme === "dark" : false;
    const logoSrc = isDarkTheme ? "/logo_white.png" : "/logo_purple.png";

    // Generate circle gradients - shifted towards pink/purple and lowered opacity
    const circleGradients = useMemo(() => {
        if (!isClient) {
            // Return empty strings during SSR to avoid hydration mismatch
            return {
                circle1: '',
                circle2: '',
                circle3: '',
                circle4: '',
            };
        }

        // Read the primary accent color from CSS variables
        const primary = getCssVarRgb("--accent-primary") ?? DEFAULT_PRIMARY;
        
        // Generate analogous colors - shifted towards purple/magenta to avoid yellow
        const analog1 = rotateHue(primary, -20); // Shift towards purple
        const analog2 = rotateHue(primary, 10);  // Shift towards deep magenta
        const analog3 = rotateHue(primary, -45); // Shift towards violet
        const analog4 = rotateHue(primary, -10); // Subtle shift left
        
        const toRgb = (c: [number, number, number]) => `${c[0]}, ${c[1]}, ${c[2]}`;
        
        // Opacities lowered here
        if (isDarkTheme) {
            return {
                circle1: `radial-gradient(circle at 40% 40%, rgba(${toRgb(primary)}, 0.28), rgba(${toRgb(analog1)}, 0.15), transparent 65%)`,
                circle2: `radial-gradient(circle at 60% 60%, rgba(${toRgb(analog2)}, 0.25), rgba(${toRgb(analog3)}, 0.12), transparent 65%)`,
                circle3: `radial-gradient(circle at 50% 50%, rgba(${toRgb(analog3)}, 0.20), rgba(${toRgb(primary)}, 0.10), transparent 55%)`,
                circle4: `radial-gradient(circle at 50% 50%, rgba(${toRgb(analog4)}, 0.18), rgba(${toRgb(analog1)}, 0.08), transparent 60%)`,
            };
        } else {
            return {
                circle1: `radial-gradient(circle at 40% 40%, rgba(${toRgb(primary)}, 0.22), rgba(${toRgb(analog1)}, 0.10), transparent 65%)`,
                circle2: `radial-gradient(circle at 60% 60%, rgba(${toRgb(analog2)}, 0.18), rgba(${toRgb(analog3)}, 0.08), transparent 65%)`,
                circle3: `radial-gradient(circle at 50% 50%, rgba(${toRgb(analog3)}, 0.14), rgba(${toRgb(primary)}, 0.06), transparent 55%)`,
                circle4: `radial-gradient(circle at 50% 50%, rgba(${toRgb(analog4)}, 0.12), rgba(${toRgb(analog1)}, 0.05), transparent 60%)`,
            };
        }
    
    }, [isDarkTheme, colorTick, isClient]);

    return (
        <main id="main-content" className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary relative overflow-hidden">
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes circle-drift-1 {
                    0%, 100% { 
                        transform: translate(0, 0) scale(1);
                    }
                    25% { 
                        transform: translate(50px, -35px) scale(1.04);
                    }
                    50% { 
                        transform: translate(25px, 45px) scale(0.96);
                    }
                    75% { 
                        transform: translate(-40px, 15px) scale(1.02);
                    }
                }
                @keyframes circle-drift-2 {
                    0%, 100% { 
                        transform: translate(0, 0) scale(1);
                    }
                    25% { 
                        transform: translate(-45px, 35px) scale(0.97);
                    }
                    50% { 
                        transform: translate(-20px, -45px) scale(1.03);
                    }
                    75% { 
                        transform: translate(40px, -20px) scale(0.98);
                    }
                }
                @keyframes circle-drift-3 {
                    0%, 100% { 
                        transform: translate(-50%, -50%) scale(1);
                    }
                    33% { 
                        transform: translate(calc(-50% + 35px), calc(-50% - 30px)) scale(1.03);
                    }
                    66% { 
                        transform: translate(calc(-50% - 30px), calc(-50% + 25px)) scale(0.97);
                    }
                }
                @keyframes circle-drift-4 {
                    0%, 100% { 
                        transform: translate(0, 0) scale(1);
                    }
                    30% { 
                        transform: translate(-35px, -40px) scale(1.03);
                    }
                    60% { 
                        transform: translate(40px, 30px) scale(0.97);
                    }
                }
                @keyframes gentle-fade-in {
                    0% { 
                        opacity: 0;
                    }
                    100% { 
                        opacity: 1;
                    }
                }
                .floating-circle-1 {
                    animation: gentle-fade-in 1.2s ease-out forwards, circle-drift-1 10s ease-in-out infinite;
                    animation-delay: 0s, 0s;
                }
                .floating-circle-2 {
                    animation: gentle-fade-in 1.2s ease-out forwards, circle-drift-2 12s ease-in-out infinite;
                    animation-delay: 0.15s, 0s;
                }
                .floating-circle-3 {
                    animation: gentle-fade-in 1.2s ease-out forwards, circle-drift-3 8s ease-in-out infinite;
                    animation-delay: 0.3s, 0s;
                }
                .floating-circle-4 {
                    animation: gentle-fade-in 1.2s ease-out forwards, circle-drift-4 14s ease-in-out infinite;
                    animation-delay: 0.2s, 0s;
                }
            ` }} />

            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                {/* Primary accent - top left */}
                <div 
                    className="floating-circle-1 absolute -top-[150px] -left-[150px] w-[550px] h-[550px] sm:w-[700px] sm:h-[700px] lg:w-[850px] lg:h-[850px] rounded-full blur-3xl opacity-0"
                    style={isClient ? { background: circleGradients.circle1 } : undefined}
                />
                {/* Analogous color - bottom right */}
                <div 
                    className="floating-circle-2 absolute -bottom-[150px] -right-[150px] w-[550px] h-[550px] sm:w-[700px] sm:h-[700px] lg:w-[850px] lg:h-[850px] rounded-full blur-3xl opacity-0"
                    style={isClient ? { background: circleGradients.circle2 } : undefined}
                />
                {/* Accent blend - center */}
                <div 
                    className="floating-circle-3 absolute top-1/2 left-1/2 w-[450px] h-[450px] sm:w-[550px] sm:h-[550px] lg:w-[650px] lg:h-[650px] rounded-full blur-3xl opacity-0"
                    style={isClient ? { background: circleGradients.circle3 } : undefined}
                />
                {/* Subtle analogous - top right */}
                <div 
                    className="floating-circle-4 absolute -top-[100px] -right-[100px] w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] lg:w-[600px] lg:h-[600px] rounded-full blur-3xl opacity-0"
                    style={isClient ? { background: circleGradients.circle4 } : undefined}
                />
            </div>

            <div className="relative z-10">
                <header className="fixed top-0 left-0 right-0 z-50 topbar-solid shadow-lg">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-lg bg-bg-surface/80 dark:bg-gradient-to-br dark:from-accent-primary dark:to-accent-secondary">
                                    <Image
                                        src={logoSrc}
                                        alt="Kairos Logo"
                                        width={24}
                                        height={24}
                                        className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                                        priority
                                    />
                                </div>
                                <h1 className="text-xl sm:text-2xl font-bold text-fg-primary font-display tracking-tight">KAIROS</h1>
                            </div>
                            
                            
                            <div className="flex items-center gap-3">
                                {session && <UserDisplay />}
                            </div>
                        </div>
                    </div>
                </header>

                <section className="pt-24 sm:pt-32 pb-14 sm:pb-20 px-4 sm:px-6 min-h-screen flex items-center">
                    <div className="max-w-7xl mx-auto w-full">
                        <div className="flex flex-col items-center justify-center gap-8 text-center">
                           <div className="space-y-6 max-w-4xl">

                                <h2
                                  className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight tracking-tight font-display animate-slideUp relative kairos-title"
                                  style={{ animationDelay: "0.1s" }}
                                >
                                  <span className="relative inline-block kairos-title-gradient">
                                    KAIROS
                                    <div
                                      className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-accent-primary to-accent-secondary rounded-full kairos-underline"
                                      style={{ animationDelay: "1.05s" }}
                                    />
                                    <div
                                      className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-accent-primary to-accent-secondary rounded-full opacity-60 animate-pulse kairos-underline"
                                      style={{ animationDelay: "1.25s" }}
                                    />
                                  </span>
                                </h2>

                                <p
                                  className="text-lg sm:text-xl md:text-2xl text-fg-secondary leading-relaxed animate-slideUp"
                                  style={{ animationDelay: "0.2s" }}
                                >
                                  Where great ideas come to life. The workspace where teams align and launch moments that matter.
                                </p>

                                <div
                                  className="flex flex-wrap gap-4 text-sm text-fg-tertiary justify-center animate-slideUp"
                                  style={{ animationDelay: "0.3s" }}
                                />
                            </div>
                            <div className={`flex flex-col gap-4 w-full max-w-md justify-center ${!hasAnimated ? 'animate-smooth-fade-in' : ''}`} style={{ animationDelay: !hasAnimated ? '0.4s' : '0s' }}>
                                {showActionButtons && (
                                    <div className="space-y-4">
                                        <Link 
                                            ref={projectSpaceButtonRef}
                                            href="/create" 
                                            className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 font-semibold rounded-xl transition-all hover:scale-[1.02] text-base sm:text-lg group bg-accent-primary text-white shadow-lg shadow-accent-primary/30 hover:shadow-xl hover:shadow-accent-primary/40"
                                        >
                                            Enter Project Space
                                            <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                                        </Link>
                                        <Link 
                                            href="/publish" 
                                            className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 text-fg-primary font-semibold rounded-xl hover:bg-bg-elevated/50 transition-all text-base sm:text-lg group shadow-md hover:shadow-lg"
                                        >
                                            View Publications
                                            <Calendar size={22} className="group-hover:rotate-12 transition-transform" />
                                        </Link>
                                    </div>
                                )}
                                
                                {!session && (
                                  <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="kairos-glass-button flex items-center justify-center gap-2 px-8 sm:px-10 py-4 sm:py-5 text-fg-primary font-semibold rounded-xl transition-all text-base sm:text-lg group"
                                  >
                                    <span className="relative z-10">Log In / Sign Up</span>
                                    <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                                  </button>
                                )}

                                {showRoleSelection && !isSwitchingAccount && (
                                    <RoleSelectionModal
                                        isOpen={showRoleSelection}
                                        onComplete={handleRoleSelectionComplete}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <section ref={aboutRef} className="py-14 sm:py-20 px-4 sm:px-6 pt-20 sm:pt-28">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-12">
                            <ScrollReveal 
                                containerClassName="text-center max-w-4xl mx-auto"
                                baseOpacity={0.1}
                                wordAnimationEnd="center center"
                            >
                                A focused workspace for planning and publishing events.
                            </ScrollReveal>
                            <p 
                                ref={subtitleRef}
                                className="text-lg text-fg-secondary mt-6 opacity-0"
                            >
                                Whether you&apos;re managing:
                            </p>
                        </div>

                        <div className="mt-8">
                            <MagicBento 
                                textAutoHide={false}
                                enableStars={false}
                                enableSpotlight={true}
                                enableBorderGlow={true}
                                enableTilt={false}
                                enableMagnetism={false}
                                clickEffect={false}
                                spotlightRadius={300}
                                particleCount={0}
                                glowColor="139, 92, 246"
                            />
                        </div>


                        <div className="mt-12 sm:mt-16 w-full max-w-[1200px] mx-auto">
                            <h4 className="text-2xl md:text-3xl font-bold text-fg-primary mb-8">Why Teams Choose Kairos</h4>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div ref={(el) => { if (el) whyTeamsCardsRef.current[0] = el; }} className="flex items-start gap-4 p-4 rounded-xl bg-success/5 hover:bg-success/8 transition-colors group shadow-md hover:shadow-lg">
                                    <div className="flex-shrink-0 w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center mt-1 group-hover:scale-110 transition-transform">
                                        <Zap size={20} className="text-success" />
                                    </div>
                                    <div>
                                        <h5 className="text-lg font-semibold text-fg-primary mb-1">Streamlined Workflow</h5>
                                        <p className="text-fg-secondary">Plan, track, and publish events from a single, intuitive interface.</p>
                                    </div>
                                </div>
                                <div ref={(el) => { if (el) whyTeamsCardsRef.current[1] = el; }} className="flex items-start gap-4 p-4 rounded-xl bg-accent-primary/5 hover:bg-accent-primary/8 transition-colors group shadow-md hover:shadow-lg">
                                    <div className="flex-shrink-0 w-10 h-10 bg-accent-primary/10 rounded-xl flex items-center justify-center mt-1 group-hover:scale-110 transition-transform">
                                        <Sparkles size={20} className="text-accent-primary" />
                                    </div>
                                    <div>
                                        <h5 className="text-lg font-semibold text-fg-primary mb-1">Beautiful Publications</h5>
                                        <p className="text-fg-secondary">Create stunning event pages that match your brand identity.</p>
                                    </div>
                                </div>
                                <div ref={(el) => { if (el) whyTeamsCardsRef.current[2] = el; }} className="flex items-start gap-4 p-4 rounded-xl bg-warning/5 hover:bg-warning/8 transition-colors group shadow-md hover:shadow-lg">
                                    <div className="flex-shrink-0 w-10 h-10 bg-warning/10 rounded-xl flex items-center justify-center mt-1 group-hover:scale-110 transition-transform">
                                        <Lock size={20} className="text-warning" />
                                    </div>
                                    <div>
                                        <h5 className="text-lg font-semibold text-fg-primary mb-1">Secure & Reliable</h5>
                                        <p className="text-fg-secondary">Your data is protected with enterprise-grade security measures.</p>
                                    </div>
                                </div>
                                <div ref={(el) => { if (el) whyTeamsCardsRef.current[3] = el; }} className="flex items-start gap-4 p-4 rounded-xl bg-info/5 hover:bg-info/8 transition-colors group shadow-md hover:shadow-lg">
                                    <div className="flex-shrink-0 w-10 h-10 bg-info/10 rounded-xl flex items-center justify-center mt-1 group-hover:scale-110 transition-transform">
                                        <Calendar size={20} className="text-info" />
                                    </div>
                                    <div>
                                        <h5 className="text-lg font-semibold text-fg-primary mb-1">Smart Scheduling</h5>
                                        <p className="text-fg-secondary">Effortlessly manage timelines and coordinate across teams.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
            <SignInModal isOpen={isModalOpen} onClose={handleSignInClose} />
        </main>
    );
}