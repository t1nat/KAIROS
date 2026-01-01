"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { UserDisplay } from "~/components/UserDisplay";
import { SignInModal } from "~/components/SignInModal";
import { RoleSelectionModal } from "~/components/RoleSelectionModal";
import { ThemeToggle } from "~/components/ThemeToggle";
import MagicBento from "~/components/MagicBento";
import { api } from "~/trpc/react";
import {
    Calendar,
    ArrowRight,
    Zap,
    Lock,
    Sparkles,
} from "lucide-react";

import ScrollReveal from "~/components/ScrollReveal";

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface SessionData {
    user?: { name?: string | null; id?: string } | null;
}

export function HomeClient({ session }: {
    session: SessionData | null;
}) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showRoleSelection, setShowRoleSelection] = useState(false);
    const [hasAnimated, setHasAnimated] = useState(false);
    const aboutRef = useRef<HTMLElement>(null);

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


    const handleRoleSelectionComplete = () => {
        setShowRoleSelection(false);
        window.location.href = "/create";
    };

    const handleSignInClose = () => {
        setIsModalOpen(false);
        if (session?.user && userProfile !== undefined && !userProfile) {
            setTimeout(() => {
                setShowRoleSelection(true);
            }, 300);
        }
    };

    const showActionButtons = session && !showRoleSelection && userProfile !== undefined && userProfile !== null;

    return (
        <main id="main-content" className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary relative overflow-hidden">
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40">
                <div className="absolute top-0 left-0 w-[700px] h-[700px] bg-gradient-to-br from-accent-primary/30 via-brand-indigo/20 to-brand-purple/30 rounded-full blur-3xl animate-fadeIn animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-0 right-0 w-[700px] h-[700px] bg-gradient-to-tl from-brand-cyan/20 via-brand-blue/20 to-accent-secondary/30 rounded-full blur-3xl animate-fadeIn" style={{ animationDelay: '0.5s', animationDuration: '10s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-brand-teal/10 via-brand-purple/15 to-transparent rounded-full blur-2xl" />
            </div>

            <div className="relative z-10">
                <header className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-border-light shadow-lg">
                    <div className="max-w-7xl mx-auto px-6 py-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-xl flex items-center justify-center shadow-md">
                                    <Image
                                        src="/logo_white.png"
                                        alt="Kairos Logo"
                                        width={24}
                                        height={24}
                                        className="w-6 h-6 object-contain"
                                        priority
                                    />
                                </div>
                                <h1 className="text-2xl font-bold text-fg-primary font-display tracking-tight">KAIROS</h1>
                            </div>
                            
                            
                            <div className="flex items-center gap-3">
                                <ThemeToggle />
                                {session && <UserDisplay />}
                            </div>
                        </div>
                    </div>
                </header>

                <section className="pt-32 pb-20 px-6 min-h-screen flex items-center">
                    <div className="max-w-7xl mx-auto w-full">
                        <div className="flex flex-col lg:flex-row justify-between items-center gap-16 mb-8">
                           <div className="flex-1 text-center lg:text-left space-y-6">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent-primary/10 border border-accent-primary/20 rounded-full text-sm font-semibold text-accent-primary animate-slideUp">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-primary opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-primary"></span>
                                    </span>
                                    Event Planning & Coordination Platform
                                </div>
                                <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-fg-primary leading-tight tracking-tight font-display animate-slideUp" style={{ animationDelay: '0.1s' }}>
                                    KAIROS
                                </h2>
                                <p className="text-xl md:text-2xl text-fg-secondary leading-relaxed max-w-2xl mx-auto lg:mx-0 animate-slideUp" style={{ animationDelay: '0.2s' }}>
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
                                    <div className="surface-card p-6 space-y-4">
                                        <Link 
                                            href="/create" 
                                            className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-accent transition-all hover:scale-[1.02] text-lg group"
                                        >
                                            Enter Project Space
                                            <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                                        </Link>
                                        <Link 
                                            href="/publish" 
                                            className="flex items-center justify-center gap-2 px-8 py-4 bg-bg-surface border-2 border-border-medium text-fg-primary font-semibold rounded-xl hover:bg-bg-elevated hover:border-accent-primary/50 transition-all text-lg group"
                                        >
                                            View Publications
                                            <Calendar size={22} className="group-hover:rotate-12 transition-transform" />
                                        </Link>
                                    </div>
                                )}
                                
                                {!session && (
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className="animated-border-button relative flex items-center justify-center gap-2 px-10 py-5 bg-transparent text-fg-primary font-semibold rounded-2xl text-lg group"
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

                <section ref={aboutRef} className="py-20 px-6 pt-28">
                    <div className="max-w-7xl mx-auto px-6 md:px-12">
                        <div className="text-left mb-16">
                            <ScrollReveal 
                                containerClassName="text-left"
                                baseOpacity={0.1}
                                baseRotation={1}
                                blurStrength={2}
                            >
                                <h3 className="text-3xl md:text-4xl font-bold text-fg-primary mb-4 inline">
                                    A focused workspace for planning and publishing events.
                                </h3>
                            </ScrollReveal>
                            <p className="text-lg text-fg-secondary mt-4">
                                Whether you&apos;re managing:
                            </p>
                        </div>

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

                        <div className="surface-card p-8 md:p-10 mt-16">
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
                    <section className="py-20 px-6 relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/10 via-brand-indigo/10 to-brand-cyan/10"></div>
                        <div className="max-w-4xl mx-auto text-center relative z-10">
                            <div className="surface-card p-12 hover:shadow-2xl hover:shadow-accent-primary/20 transition-all duration-500 group relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/5 via-transparent to-accent-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <div className="relative">
                                    <h3 className="text-4xl md:text-5xl font-bold text-fg-primary mb-4">
                                        Ready to Transform Your Events?
                                    </h3>
                                    <p className="text-xl text-fg-secondary mb-8">
                                        Join teams worldwide coordinating seamless events with Kairos.
                                    </p>
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className="inline-flex items-center gap-2 px-10 py-5 bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-accent transition-all hover:scale-[1.02] text-lg group"
                                    >
                                        Start Planning Today
                                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                <footer className="py-12 px-6">
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

            <SignInModal isOpen={isModalOpen} onClose={handleSignInClose} />

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
                @keyframes fade-in {
                    0% { 
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    100% { 
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fade-in {
                    animation: fade-in 1s ease-out forwards;
                }
                @keyframes float-fast {
                    0%, 100% { transform: translate(0, 0) rotate(0deg); }
                    33% { transform: translate(30px, -30px) rotate(5deg); }
                    66% { transform: translate(-20px, 20px) rotate(-5deg); }
                }
                @keyframes float-faster {
                    0%, 100% { transform: translate(0, 0) rotate(0deg); }
                    33% { transform: translate(-25px, 25px) rotate(-4deg); }
                    66% { transform: translate(25px, -25px) rotate(4deg); }
                }
                @keyframes float-fastest {
                    0%, 100% { transform: translate(0, 0) rotate(0deg); }
                    50% { transform: translate(20px, -30px) rotate(3deg); }
                }
                .animate-float-fast {
                    animation: float-fast 8s ease-in-out infinite;
                }
                .animate-float-faster {
                    animation: float-faster 6s ease-in-out infinite;
                }
                .animate-float-fastest {
                    animation: float-fastest 5s ease-in-out infinite;
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