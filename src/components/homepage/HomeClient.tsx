"use client";

import Image from "next/image";
import { useState, useRef, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { SignInModal } from "~/components/auth/SignInModal";
import { LanguageSwitcher } from "~/components/layout/LanguageSwitcher";
import MagicBento from "~/components/homepage/MagicBento";
import {
    ArrowRight,
    Zap,
    Lock,
    Sparkles,
    Calendar,
} from "lucide-react";

import ScrollReveal from "~/components/homepage/ScrollReveal";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ─── Utility hooks & helpers ─── */

function useThemeColorTick(): number {
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const el = document.documentElement;
        const obs = new MutationObserver(() => setTick((t: number) => t + 1));
        obs.observe(el, { attributes: true, attributeFilter: ["class", "data-accent", "style"] });
        return () => obs.disconnect();
    }, []);
    return tick;
}

function parseRgbTriplet(raw: string): [number, number, number] | null {
    const parts = raw.trim().split(/[\s,]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const r = Number(parts[0]), g = Number(parts[1]), b = Number(parts[2]);
    if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null;
    return [r, g, b];
}

function getCssVarRgb(varName: string): [number, number, number] | null {
    if (typeof document === "undefined") return null;
    return parseRgbTriplet(getComputedStyle(document.documentElement).getPropertyValue(varName));
}

function rotateHue(rgb: [number, number, number], degrees: number): [number, number, number] {
    const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
    }
    h = (h + degrees / 360 + 1) % 1;
    const hue2rgb = (p: number, q: number, t: number) => {
        let tt = t;
        if (tt < 0) tt += 1;
        if (tt > 1) tt -= 1;
        if (tt < 1 / 6) return p + (q - p) * 6 * tt;
        if (tt < 1 / 2) return q;
        if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
        return p;
    };
    if (s === 0) { const gray = Math.round(l * 255); return [gray, gray, gray]; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    return [
        Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
        Math.round(hue2rgb(p, q, h) * 255),
        Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
    ];
}

const DEFAULT_PRIMARY: [number, number, number] = [139, 92, 246];

/* ─── Component ─── */

export function HomeClient() {
    const { resolvedTheme } = useTheme();
    const t = useTranslations("home");
    const [themeMounted, setThemeMounted] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const heroRef = useRef<HTMLDivElement>(null);
    const aboutRef = useRef<HTMLElement>(null);
    const subtitleRef = useRef<HTMLParagraphElement>(null);
    const whyTeamsCardsRef = useRef<HTMLDivElement[]>([]);

    const colorTick = useThemeColorTick();

    useEffect(() => { setThemeMounted(true); setIsClient(true); }, []);

    /* ─── GSAP entrance animation (bottom → top stagger) ─── */
    useEffect(() => {
        if (!heroRef.current) return;
        const ctx = gsap.context(() => {
            const children = heroRef.current!.querySelectorAll("[data-reveal]");
            gsap.fromTo(
                children,
                { opacity: 0, y: 60, filter: "blur(8px)", scale: 0.96 },
                { opacity: 1, y: 0, filter: "blur(0px)", scale: 1, duration: 0.9, ease: "power3.out", stagger: 0.12 },
            );
        });
        return () => ctx.revert();
    }, []);

    /* ─── "Why Teams" cards GSAP ─── */
    useEffect(() => {
        if (!whyTeamsCardsRef.current.length) return;
        const ctx = gsap.context(() => {
            gsap.set(whyTeamsCardsRef.current, { opacity: 0, filter: "blur(10px)", y: 60, scale: 0.85 });
            gsap.set([whyTeamsCardsRef.current[0], whyTeamsCardsRef.current[2]], { x: -60 });
            gsap.set([whyTeamsCardsRef.current[1], whyTeamsCardsRef.current[3]], { x: 60 });
            gsap.to(whyTeamsCardsRef.current, {
                opacity: 1, filter: "blur(0px)", x: 0, y: 0, scale: 1,
                duration: 1, ease: "back.out(1.4)", stagger: 0.12,
                scrollTrigger: {
                    trigger: whyTeamsCardsRef.current[0]?.parentElement,
                    start: "top 80%",
                    toggleActions: "play none none none",
                },
            });
        });
        return () => ctx.revert();
    }, []);

    /* ─── Subtitle scroll animation ─── */
    useEffect(() => {
        if (!subtitleRef.current) return;
        const ctx = gsap.context(() => {
            gsap.fromTo(
                subtitleRef.current,
                { opacity: 0, filter: "blur(5px)", y: 30, scale: 0.9 },
                {
                    opacity: 1, filter: "blur(0px)", y: 0, scale: 1,
                    duration: 0.8, ease: "back.out(1.7)",
                    scrollTrigger: { trigger: subtitleRef.current, start: "top 85%", scrub: 1 },
                },
            );
        });
        return () => ctx.revert();
    }, []);

    const isDarkTheme = themeMounted ? resolvedTheme === "dark" : false;
    const logoSrc = isDarkTheme ? "/logo_white.png" : "/logo_purple.png";

    /* ─── Circle gradients ─── */
    const circleGradients = useMemo(() => {
        if (!isClient) return { circle1: "", circle2: "", circle3: "", circle4: "" };
        const primary = getCssVarRgb("--accent-primary") ?? DEFAULT_PRIMARY;
        const a1 = rotateHue(primary, -20), a2 = rotateHue(primary, 10);
        const a3 = rotateHue(primary, -45), a4 = rotateHue(primary, -10);
        const toRgb = (c: [number, number, number]) => `${c[0]}, ${c[1]}, ${c[2]}`;
        const opSet = isDarkTheme ? [0.28, 0.25, 0.20, 0.18] : [0.22, 0.18, 0.14, 0.12];
        return {
            circle1: `radial-gradient(circle at 40% 40%, rgba(${toRgb(primary)}, ${opSet[0]}), rgba(${toRgb(a1)}, ${(opSet[0] ?? 0) * 0.5}), transparent 65%)`,
            circle2: `radial-gradient(circle at 60% 60%, rgba(${toRgb(a2)}, ${opSet[1]}), rgba(${toRgb(a3)}, ${(opSet[1] ?? 0) * 0.5}), transparent 65%)`,
            circle3: `radial-gradient(circle at 50% 50%, rgba(${toRgb(a3)}, ${opSet[2]}), rgba(${toRgb(primary)}, ${(opSet[2] ?? 0) * 0.5}), transparent 55%)`,
            circle4: `radial-gradient(circle at 50% 50%, rgba(${toRgb(a4)}, ${opSet[3]}), rgba(${toRgb(a1)}, ${(opSet[3] ?? 0) * 0.4}), transparent 60%)`,
        };
    }, [isDarkTheme, colorTick, isClient]);

    const whyTeamsData = [
        { icon: <Zap size={20} />, colorClass: "text-success", bgClass: "bg-success/5 hover:bg-success/10", iconBg: "bg-success/10", titleKey: "streamlinedWorkflow" as const, descKey: "streamlinedWorkflowDesc" as const },
        { icon: <Sparkles size={20} />, colorClass: "text-accent-primary", bgClass: "bg-accent-primary/5 hover:bg-accent-primary/10", iconBg: "bg-accent-primary/10", titleKey: "beautifulPublications" as const, descKey: "beautifulPublicationsDesc" as const },
        { icon: <Lock size={20} />, colorClass: "text-warning", bgClass: "bg-warning/5 hover:bg-warning/10", iconBg: "bg-warning/10", titleKey: "secureReliable" as const, descKey: "secureReliableDesc" as const },
        { icon: <Calendar size={20} />, colorClass: "text-info", bgClass: "bg-info/5 hover:bg-info/10", iconBg: "bg-info/10", titleKey: "smartScheduling" as const, descKey: "smartSchedulingDesc" as const },
    ];

    return (
        <main id="main-content" className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary relative overflow-hidden">
            {/* ─── Inline keyframes ─── */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes circle-drift-1 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    25% { transform: translate(50px, -35px) scale(1.04); }
                    50% { transform: translate(25px, 45px) scale(0.96); }
                    75% { transform: translate(-40px, 15px) scale(1.02); }
                }
                @keyframes circle-drift-2 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    25% { transform: translate(-45px, 35px) scale(0.97); }
                    50% { transform: translate(-20px, -45px) scale(1.03); }
                    75% { transform: translate(40px, -20px) scale(0.98); }
                }
                @keyframes circle-drift-3 {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); }
                    33% { transform: translate(calc(-50% + 35px), calc(-50% - 30px)) scale(1.03); }
                    66% { transform: translate(calc(-50% - 30px), calc(-50% + 25px)) scale(0.97); }
                }
                @keyframes circle-drift-4 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    30% { transform: translate(-35px, -40px) scale(1.03); }
                    60% { transform: translate(40px, 30px) scale(0.97); }
                }
                @keyframes gentle-fade-in {
                    0% { opacity: 0; } 100% { opacity: 1; }
                }
                .fc-1 { animation: gentle-fade-in 1.2s ease-out forwards, circle-drift-1 10s ease-in-out infinite; animation-delay: 0s, 0s; }
                .fc-2 { animation: gentle-fade-in 1.2s ease-out forwards, circle-drift-2 12s ease-in-out infinite; animation-delay: .15s, 0s; }
                .fc-3 { animation: gentle-fade-in 1.2s ease-out forwards, circle-drift-3 8s ease-in-out infinite; animation-delay: .3s, 0s; }
                .fc-4 { animation: gentle-fade-in 1.2s ease-out forwards, circle-drift-4 14s ease-in-out infinite; animation-delay: .2s, 0s; }
                @keyframes pulse-ring {
                    0% { transform: scaleX(1); opacity: 0.6; }
                    50% { transform: scaleX(1.05); opacity: 0.3; }
                    100% { transform: scaleX(1); opacity: 0.6; }
                }
            ` }} />

            {/* ─── Floating background circles ─── */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="fc-1 absolute -top-[150px] -left-[150px] w-[550px] h-[550px] sm:w-[700px] sm:h-[700px] lg:w-[850px] lg:h-[850px] rounded-full blur-3xl opacity-0" style={isClient ? { background: circleGradients.circle1 } : undefined} />
                <div className="fc-2 absolute -bottom-[150px] -right-[150px] w-[550px] h-[550px] sm:w-[700px] sm:h-[700px] lg:w-[850px] lg:h-[850px] rounded-full blur-3xl opacity-0" style={isClient ? { background: circleGradients.circle2 } : undefined} />
                <div className="fc-3 absolute top-1/2 left-1/2 w-[450px] h-[450px] sm:w-[550px] sm:h-[550px] lg:w-[650px] lg:h-[650px] rounded-full blur-3xl opacity-0" style={isClient ? { background: circleGradients.circle3 } : undefined} />
                <div className="fc-4 absolute -top-[100px] -right-[100px] w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] lg:w-[600px] lg:h-[600px] rounded-full blur-3xl opacity-0" style={isClient ? { background: circleGradients.circle4 } : undefined} />
            </div>

            {/* ─── Content ─── */}
            <div className="relative z-10">
                {/* ─── Header ─── */}
                <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-bg-primary/60 border-b border-white/[0.06]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-lg bg-bg-surface/80 dark:bg-gradient-to-br dark:from-accent-primary dark:to-accent-secondary">
                                    <Image src={logoSrc} alt="Kairos Logo" width={24} height={24} className="w-5 h-5 sm:w-6 sm:h-6 object-contain" priority />
                                </div>
                                <h1 className="text-xl sm:text-2xl font-bold text-fg-primary font-display tracking-tight">KAIROS</h1>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3">
                                <LanguageSwitcher variant="compact" />
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="px-4 py-2 text-sm font-medium rounded-xl bg-accent-primary text-white hover:opacity-90 transition-all duration-200 shadow-md shadow-accent-primary/20 hover:shadow-lg hover:shadow-accent-primary/30 hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    {t("signIn")}
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* ─── Hero ─── */}
                <section className="pt-24 sm:pt-32 pb-14 sm:pb-20 px-4 sm:px-6 min-h-screen flex items-center">
                    <div ref={heroRef} className="max-w-7xl mx-auto w-full">
                        <div className="flex flex-col items-center justify-center gap-8 text-center">
                            <div className="space-y-6 max-w-4xl">
                                {/* Tagline pill */}
                                <div data-reveal="true" className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-primary/10 border border-accent-primary/20 backdrop-blur-sm">
                                    <Sparkles size={14} className="text-accent-primary" />
                                    <span className="text-xs sm:text-sm font-medium text-accent-primary tracking-wide">{t("heroTagline")}</span>
                                </div>

                                {/* Title */}
                                <h2 data-reveal="true" className="text-5xl sm:text-6xl lg:text-8xl font-bold leading-[0.95] tracking-tight font-display relative kairos-title">
                                    <span className="relative inline-block kairos-title-gradient">
                                        KAIROS
                                        <div className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-accent-primary to-accent-secondary rounded-full" style={{ animation: "pulse-ring 3s ease-in-out infinite" }} />
                                    </span>
                                </h2>

                                {/* Subtitle */}
                                <p data-reveal="true" className="text-lg sm:text-xl md:text-2xl text-fg-secondary leading-relaxed max-w-2xl mx-auto">
                                    {t("subtitle")}{" "}
                                    <span className="text-fg-tertiary">{t("description")}</span>
                                </p>
                            </div>

                            {/* CTA */}
                            <div data-reveal="true" className="flex flex-col sm:flex-row gap-3 w-full max-w-md justify-center">
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="kairos-glass-button flex items-center justify-center gap-2 px-8 sm:px-10 py-4 sm:py-5 text-fg-primary font-semibold rounded-2xl transition-all text-base sm:text-lg group"
                                >
                                    <span className="relative z-10">{t("signIn")}</span>
                                    <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>

                            {/* Trust badge */}
                            <p data-reveal="true" className="text-xs text-fg-quaternary tracking-widest uppercase mt-4">{t("trustedBy")}</p>
                        </div>
                    </div>
                </section>

                {/* ─── About / Features ─── */}
                <section ref={aboutRef} className="py-14 sm:py-20 px-4 sm:px-6 pt-20 sm:pt-28">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-12">
                            <ScrollReveal containerClassName="text-center max-w-4xl mx-auto" baseOpacity={0.1} wordAnimationEnd="center center">
                                {t("aboutHeadline")}
                            </ScrollReveal>
                            <p ref={subtitleRef} className="text-lg text-fg-secondary mt-6 opacity-0">
                                {t("aboutSubtitle")}
                            </p>
                        </div>

                        <div className="mt-8">
                            <MagicBento textAutoHide={false} enableStars={false} enableSpotlight={true} enableBorderGlow={true} enableTilt={false} enableMagnetism={false} clickEffect={false} spotlightRadius={300} particleCount={0} glowColor="139, 92, 246" />
                        </div>

                        {/* Why Teams Choose Kairos */}
                        <div className="mt-12 sm:mt-16 w-full max-w-[1200px] mx-auto">
                            <h4 className="text-2xl md:text-3xl font-bold text-fg-primary mb-8">{t("whyTeams")}</h4>
                            <div className="grid md:grid-cols-2 gap-5">
                                {whyTeamsData.map((card, i) => (
                                    <div
                                        key={card.titleKey}
                                        ref={(el) => { if (el) whyTeamsCardsRef.current[i] = el; }}
                                        className={`group flex items-start gap-4 p-5 rounded-2xl ${card.bgClass} backdrop-blur-sm border border-white/[0.06] transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}
                                    >
                                        <div className={`flex-shrink-0 w-11 h-11 ${card.iconBg} rounded-xl flex items-center justify-center mt-0.5 group-hover:scale-110 transition-transform duration-300`}>
                                            <span className={card.colorClass}>{card.icon}</span>
                                        </div>
                                        <div>
                                            <h5 className="text-lg font-semibold text-fg-primary mb-1">{t(card.titleKey)}</h5>
                                            <p className="text-fg-secondary text-sm leading-relaxed">{t(card.descKey)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Bottom CTA */}
                        <div className="mt-16 text-center">
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="inline-flex items-center gap-2 px-8 py-4 bg-accent-primary text-white font-semibold rounded-2xl hover:opacity-90 transition-all duration-200 shadow-lg shadow-accent-primary/25 hover:shadow-xl hover:shadow-accent-primary/35 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {t("getStarted")}
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                </section>

                {/* ─── Footer ─── */}
                <footer className="py-8 px-4 sm:px-6 border-t border-white/[0.06]">
                    <div className="max-w-7xl mx-auto flex items-center justify-center text-xs text-fg-quaternary">
                        <span>&copy; {new Date().getFullYear()} KAIROS</span>
                    </div>
                </footer>
            </div>

            <SignInModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </main>
    );
}
