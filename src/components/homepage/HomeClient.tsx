"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

// Hook to watch for theme/accent changes on document element
function useThemeColorTick(): number {
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const el = document.documentElement;

        const obs = new MutationObserver(() => setTick((t) => t + 1));
        obs.observe(el, {
            attributes: true,
            attributeFilter: ["class", "data-accent", "style"],
        });

        return () => obs.disconnect();
    }, []);

    return tick;
}

// Parse RGB triplet from CSS variable value like "139 92 246"
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

// Get RGB triplet from CSS variable
function getCssVarRgb(varName: string): [number, number, number] | null {
    if (typeof document === "undefined") return null;
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName);
    return parseRgbTriplet(value);
}

// Rotate hue of an RGB color
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
    const router = useRouter();
    const searchParams = useSearchParams();
    const { resolvedTheme } = useTheme();
    const [themeMounted, setThemeMounted] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showRoleSelection, setShowRoleSelection] = useState(false);
    const [hasAnimated, setHasAnimated] = useState(false);
    const aboutRef = useRef<HTMLElement>(null);
    const subtitleRef = useRef<HTMLParagraphElement>(null);
    
    // Watch for accent color changes
    const colorTick = useThemeColorTick();

    const { data: userProfile, isLoading: isProfileLoading } = api.user.getProfile.useQuery(undefined, {
        enabled: !!session?.user,
    });

    useEffect(() => {
        if (session?.user && userProfile !== undefined && !userProfile && !isProfileLoading) {
            setShowRoleSelection(true);
        }
    }, [session, userProfile, isProfileLoading]);

    useEffect(() => {
        setHasAnimated(true);
    }, []);

    useEffect(() => {
        setThemeMounted(true);
    }, []);

    useEffect(() => {
        if (searchParams.get("switchAccount") === "1") {
            setIsModalOpen(true);
        }
    }, [searchParams]);

    // Animate the subtitle "Whether you're managing:" in sync with the cards
    useEffect(() => {
        if (!subtitleRef.current) return;

        const ctx = gsap.context(() => {
            gsap.fromTo(
                subtitleRef.current,
                { opacity: 0, y: 20 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.6,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: subtitleRef.current,
                        start: 'top 85%',
                        toggleActions: 'play none none none'
                    }
                }
            );
        });

        return () => ctx.revert();
    }, []);

    const handleRoleSelectionComplete = () => {
        setShowRoleSelection(false);
        window.location.href = "/create";
    };

    const handleSignInClose = () => {
        setIsModalOpen(false);

        if (searchParams.get("switchAccount") === "1") {
            router.replace("/");
        }

        if (session?.user && userProfile !== undefined && !userProfile) {
            setTimeout(() => {
                setShowRoleSelection(true);
            }, 300);
        }
    };

    const showActionButtons = session && !showRoleSelection && userProfile !== undefined && userProfile !== null;
    const isDarkTheme = themeMounted ? resolvedTheme === "dark" : false;
    const logoSrc = isDarkTheme ? "/logo_white.png" : "/logo_purple.png";

    // Generate circle gradients - using ANALOGOUS colors (close to accent)
    const circleGradients = useMemo(() => {
        // Read the primary accent color from CSS variables
        const primary = getCssVarRgb("--accent-primary") ?? DEFAULT_PRIMARY;
        
        // Generate analogous colors - small hue shifts for harmonious palette
        const analog1 = rotateHue(primary, 25);    // Slight shift right
        const analog2 = rotateHue(primary, -25);   // Slight shift left
        const analog3 = rotateHue(primary, 40);    // A bit more shift
        const analog4 = rotateHue(primary, -15);   // Subtle shift
        
        const toRgb = (c: [number, number, number]) => `${c[0]}, ${c[1]}, ${c[2]}`;
        
        if (isDarkTheme) {
            return {
                circle1: `radial-gradient(circle at 40% 40%, rgba(${toRgb(primary)}, 0.22), rgba(${toRgb(analog1)}, 0.12), transparent 65%)`,
                circle2: `radial-gradient(circle at 60% 60%, rgba(${toRgb(analog2)}, 0.18), rgba(${toRgb(analog3)}, 0.10), transparent 65%)`,
                circle3: `radial-gradient(circle at 50% 50%, rgba(${toRgb(analog3)}, 0.14), rgba(${toRgb(primary)}, 0.08), transparent 55%)`,
                circle4: `radial-gradient(circle at 50% 50%, rgba(${toRgb(analog4)}, 0.12), rgba(${toRgb(analog1)}, 0.06), transparent 60%)`,
            };
        } else {
            return {
                circle1: `radial-gradient(circle at 40% 40%, rgba(${toRgb(primary)}, 0.18), rgba(${toRgb(analog1)}, 0.10), transparent 65%)`,
                circle2: `radial-gradient(circle at 60% 60%, rgba(${toRgb(analog2)}, 0.14), rgba(${toRgb(analog3)}, 0.08), transparent 65%)`,
                circle3: `radial-gradient(circle at 50% 50%, rgba(${toRgb(analog3)}, 0.10), rgba(${toRgb(primary)}, 0.06), transparent 55%)`,
                circle4: `radial-gradient(circle at 50% 50%, rgba(${toRgb(analog4)}, 0.10), rgba(${toRgb(analog1)}, 0.05), transparent 60%)`,
            };
        }
    
    }, [isDarkTheme, colorTick]);

    return (
        <main id="main-content" className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary relative overflow-hidden">
            {/* Global styles for floating circle animations */}
            <style jsx global>{`
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
            `}</style>

            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                {/* Primary accent - top left */}
                <div 
                    className="floating-circle-1 absolute -top-[150px] -left-[150px] w-[550px] h-[550px] sm:w-[700px] sm:h-[700px] lg:w-[850px] lg:h-[850px] rounded-full blur-3xl opacity-0"
                    style={{ background: circleGradients.circle1 }}
                />
                {/* Analogous color - bottom right */}
                <div 
                    className="floating-circle-2 absolute -bottom-[150px] -right-[150px] w-[550px] h-[550px] sm:w-[700px] sm:h-[700px] lg:w-[850px] lg:h-[850px] rounded-full blur-3xl opacity-0"
                    style={{ background: circleGradients.circle2 }}
                />
                {/* Accent blend - center */}
                <div 
                    className="floating-circle-3 absolute top-1/2 left-1/2 w-[450px] h-[450px] sm:w-[550px] sm:h-[550px] lg:w-[650px] lg:h-[650px] rounded-full blur-3xl opacity-0"
                    style={{ background: circleGradients.circle3 }}
                />
                {/* Subtle analogous - top right */}
                <div 
                    className="floating-circle-4 absolute -top-[100px] -right-[100px] w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] lg:w-[600px] lg:h-[600px] rounded-full blur-3xl opacity-0"
                    style={{ background: circleGradients.circle4 }}
                />
            </div>

            <div className="relative z-10">
                <header className="fixed top-0 left-0 right-0 z-50 topbar-solid border-b border-border-light/30 shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-md border border-border-light/60 bg-bg-surface/80 dark:bg-gradient-to-br dark:from-accent-primary dark:to-accent-secondary dark:border-transparent">
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
                        <div className="flex flex-col lg:flex-row justify-between items-center gap-10 lg:gap-16 mb-8">
                           <div className="flex-1 text-center lg:text-left space-y-6">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent-primary/10 border border-accent-primary/20 rounded-full text-sm font-semibold text-accent-primary animate-slideUp">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-primary opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-primary"></span>
                                    </span>
                                    Event Planning & Coordination Platform
                                </div>
                                <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-fg-primary leading-tight tracking-tight font-display animate-slideUp" style={{ animationDelay: '0.1s' }}>
                                    KAIROS
                                </h2>
                                <p className="text-lg sm:text-xl md:text-2xl text-fg-secondary leading-relaxed max-w-2xl mx-auto lg:mx-0 animate-slideUp" style={{ animationDelay: '0.2s' }}>
                                    The all-in-one platform for seamless event coordination, team collaboration, and project timelines.
                                </p>
                                <div className="flex flex-wrap gap-4 text-sm text-fg-tertiary animate-slideUp" style={{ animationDelay: '0.3s' }}>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-event-active rounded-full"></div>
                                        Live RSVP Tracking
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-event-upcoming rounded-full"></div>
                                        Timeline Management
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-event-completed rounded-full"></div>
                                        Team Collaboration
                                    </div>
                                </div>
                            </div>
                            <div className={`flex flex-col gap-4 w-full lg:w-auto lg:min-w-[420px] justify-center ${!hasAnimated ? 'animate-smooth-fade-in' : ''}`} style={{ animationDelay: !hasAnimated ? '0.4s' : '0s' }}>
                                {showActionButtons && (
                                    <div className="surface-card p-5 sm:p-6 space-y-4">
                                        <Link 
                                            href="/create" 
                                            className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 font-semibold rounded-xl shadow-md hover:shadow-xl transition-all hover:scale-[1.02] text-base sm:text-lg group bg-slate-900 dark:bg-bg-surface dark:border-2 dark:border-border-medium text-white dark:text-fg-primary hover:bg-slate-800 dark:hover:bg-bg-elevated dark:hover:border-accent-primary/50 border-transparent"
                                        >
                                            Enter Project Space
                                            <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                                        </Link>
                                        <Link 
                                            href="/publish" 
                                            className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 bg-bg-surface border-2 border-border-medium text-fg-primary font-semibold rounded-xl hover:bg-bg-elevated hover:border-accent-primary/50 transition-all text-base sm:text-lg group"
                                        >
                                            View Publications
                                            <Calendar size={22} className="group-hover:rotate-12 transition-transform" />
                                        </Link>
                                    </div>
                                )}
                                
                                {!session && (
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className="animated-border-button relative flex items-center justify-center gap-2 px-8 sm:px-10 py-4 sm:py-5 bg-transparent text-fg-primary font-semibold rounded-2xl text-base sm:text-lg group"
                                        style={{
                                            boxSizing: 'border-box'
                                        }}
                                    >
                                        <span className="relative z-10">Log In / Sign Up</span>
                                    </button>
                                )}

                                {showRoleSelection && (
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


                        <div className="surface-card p-5 sm:p-8 md:p-10 mt-12 sm:mt-16 w-full max-w-[1200px] mx-auto">
                            <h4 className="text-2xl md:text-3xl font-bold text-fg-primary mb-8">Why Teams Choose Kairos</h4>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="flex items-start gap-4 p-4 rounded-xl bg-success/5 border border-success/20 hover:bg-success/10 transition-colors group">
                                    <div className="flex-shrink-0 w-10 h-10 bg-success/20 rounded-xl flex items-center justify-center mt-1 group-hover:scale-110 transition-transform">
                                        <Calendar className="text-success" size={20} />
                                    </div>
                                    <div>
                                        <h5 className="font-semibold text-fg-primary mb-2">Interactive Timeline</h5>
                                        <p className="text-sm text-fg-secondary">Visualize the flow. Manage tasks and track progress at a glance.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-4 rounded-xl bg-success/5 border border-success/20 hover:bg-success/10 transition-colors group">
                                    <div className="flex-shrink-0 w-10 h-10 bg-success/20 rounded-xl flex items-center justify-center mt-1 group-hover:scale-110 transition-transform">
                                        <Zap className="text-success" size={20} />
                                    </div>
                                    <div>
                                        <h5 className="font-semibold text-fg-primary mb-2">Event Publishing</h5>
                                        <p className="text-sm text-fg-secondary">Go live. Turn internal project plans into public events in seconds.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-4 rounded-xl bg-warning/5 border border-warning/20 hover:bg-warning/10 transition-colors group">
                                    <div className="flex-shrink-0 w-10 h-10 bg-warning/20 rounded-xl flex items-center justify-center mt-1 group-hover:scale-110 transition-transform">
                                        <Lock className="text-warning" size={20} />
                                    </div>
                                    <div>
                                        <h5 className="font-semibold text-fg-primary mb-2">Secure Team Access</h5>
                                        <p className="text-sm text-fg-secondary">Secure your organization with roles and access codes.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-4 rounded-xl bg-accent-primary/5 border border-accent-primary/20 hover:bg-accent-primary/10 transition-colors group">
                                    <div className="flex-shrink-0 w-10 h-10 bg-accent-primary/20 rounded-xl flex items-center justify-center mt-1 group-hover:scale-110 transition-transform">
                                        <Sparkles className="text-accent-primary" size={20} />
                                    </div>
                                    <div>
                                        <h5 className="font-semibold text-fg-primary mb-2">Unified Workspace</h5>
                                        <p className="text-sm text-fg-secondary">Projects, notes, timelines, and events in one place.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {!session && (
                    <section className="py-14 sm:py-20 px-4 sm:px-6 relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/10 via-accent-secondary/10 to-accent-tertiary/10"></div>
                        <div className="max-w-4xl mx-auto text-center relative z-10">
                            <div className="surface-card p-6 sm:p-10 md:p-12 hover:shadow-2xl hover:shadow-accent-primary/20 transition-all duration-500 group relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/5 via-transparent to-accent-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <div className="relative">
                                    <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold text-fg-primary mb-4">
                                        Ready to Transform Your Events?
                                    </h3>
                                    <p className="text-lg sm:text-xl text-fg-secondary mb-8">
                                        Join teams worldwide coordinating seamless events with Kairos.
                                    </p>
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className="inline-flex items-center gap-2 px-7 sm:px-10 py-4 sm:py-5 bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-accent transition-all hover:scale-[1.02] text-base sm:text-lg group"
                                    >
                                        Start Planning Today
                                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                <footer className="py-12 px-4 sm:px-6">
                    <div className="max-w-7xl mx-auto text-center">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <span className="text-xl font-bold text-fg-primary font-display tracking-tight">Kairos</span>
                        </div>
                        <p className="text-fg-secondary">
                            © 2025 Kairos.
                        </p>
                    </div>
                </footer>
            </div>

            <SignInModal
                isOpen={isModalOpen}
                onClose={handleSignInClose}
                initialEmail={searchParams.get("email") ?? undefined}
            />

            <style jsx>{`
                @keyframes hero-fade-in {
                    0% { 
                        opacity: 0;
                        transform: translateY(20px);
                        filter: blur(8px);
                    }
                    100% { 
                        opacity: 1;
                        transform: translateY(0);
                        filter: blur(0px);
                    }
                }
                @keyframes hero-float {
                    0% { 
                        transform: translateY(-8px);
                    }
                    50% { 
                        transform: translateY(8px);
                    }
                    100% {
                        transform: translateY(-8px);
                    }
                }
                .animate-hero-fade-in {
                    animation: hero-fade-in 1.5s ease-out forwards;
                    opacity: 0;
                }
                .animate-hero-fade-in-delayed {
                    animation: hero-fade-in 1.5s ease-out 0.3s forwards;
                    opacity: 0;
                }
                @keyframes border-circulation {
                    0%, 100% { 
                        background-position: 0% 50%; 
                    }
                    50% { 
                        background-position: 100% 50%; 
                    }
                }
                .animated-border-button {
                    position: relative;
                    isolation: isolate;
                }
                .animated-border-button::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: inherit;
                    padding: 2px;
                    background: linear-gradient(
                        90deg,
                        rgba(163, 67, 236, 0.8),
                        rgba(125, 211, 180, 0.8),
                        rgba(228, 222, 170, 0.8),
                        rgba(163, 67, 236, 0.8)
                    );
                    background-size: 200% 200%;
                    -webkit-mask: 
                        linear-gradient(#fff 0 0) content-box, 
                        linear-gradient(#fff 0 0);
                    -webkit-mask-composite: xor;
                    mask: 
                        linear-gradient(#fff 0 0) content-box, 
                        linear-gradient(#fff 0 0);
                    mask-composite: exclude;
                    animation: border-circulation 3s linear infinite;
                    z-index: -1;
                }
                .animated-border-button:hover {
                    background: rgba(163, 67, 236, 0.1);
                }
                .animated-border-button:hover::before {
                    animation-duration: 1.5s;
                }
            `}</style>
        </main>
    );
}