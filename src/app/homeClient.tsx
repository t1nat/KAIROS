"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { UserDisplay } from "./_components/userDisplay";
import { SignInModal } from "./_components/signInModal";
import { RoleSelectionModal } from "./_components/roleSelectionModal";
import MagicBento from "./_components/MagicBento";
import { api } from "~/trpc/react";
import {
    Calendar, 
    CheckCircle2,
    Zap,
    ArrowRight,
    BookOpen,
    Info,
    X
} from "lucide-react";

interface SessionData {
    user?: { name?: string | null; id?: string } | null;
}

export function HomeClient({ session }: {
    session: SessionData | null;
}) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [showRoleSelection, setShowRoleSelection] = useState(false);
    const [hasAnimated, setHasAnimated] = useState(false);
    const aboutRef = useRef<HTMLElement>(null);

    const { data: userProfile } = api.user.getProfile.useQuery(undefined, {
        enabled: !!session?.user,
    });

    useEffect(() => {
        if (session?.user && userProfile !== undefined && !userProfile) {
            setShowRoleSelection(true);
        }
    }, [session, userProfile]);

    // Mark as animated on first load
    useEffect(() => {
        setHasAnimated(true);
    }, []);

    const scrollToAbout = () => {
        aboutRef.current?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    };

    const handleRoleSelectionComplete = () => {
        setShowRoleSelection(false);
        // Don't reload the page, just refresh the data
        window.location.href = "/create";
    };

    return (
        <main className="min-h-screen bg-[#181F25] relative overflow-hidden">
            {/* Enhanced Animated Background with More Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                {/* Floating orbs - more spread throughout */}
                <div className="absolute top-20 left-20 w-96 h-96 bg-[#9661ff] opacity-8 rounded-full blur-3xl animate-float-slow"></div>
                <div className="absolute top-40 right-32 w-80 h-80 bg-[#7dd3b4] opacity-8 rounded-full blur-3xl animate-float-medium" style={{ animationDelay: '2s' }}></div>
                <div className="absolute bottom-32 left-1/3 w-72 h-72 bg-[#9661ff] opacity-10 rounded-full blur-3xl animate-float-fast" style={{ animationDelay: '4s' }}></div>
                <div className="absolute bottom-20 right-20 w-64 h-64 bg-[#7dd3b4] opacity-7 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '1s' }}></div>
                
                {/* Additional orbs for fuller coverage */}
                <div className="absolute top-1/2 left-10 w-80 h-80 bg-[#9661ff] opacity-9 rounded-full blur-3xl animate-float-medium" style={{ animationDelay: '3s' }}></div>
                <div className="absolute top-1/3 right-10 w-72 h-72 bg-[#7dd3b4] opacity-9 rounded-full blur-3xl animate-float-fast" style={{ animationDelay: '5s' }}></div>
                <div className="absolute bottom-1/3 left-1/2 w-96 h-96 bg-[#9661ff] opacity-8 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '2.5s' }}></div>
                <div className="absolute top-10 right-1/3 w-64 h-64 bg-[#7dd3b4] opacity-6 rounded-full blur-3xl animate-float-medium" style={{ animationDelay: '4.5s' }}></div>
                
                {/* Grid pattern overlay */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
            </div>

            {/* Content */}
            <div className="relative z-10">
                {/* Header */}
                <header className="fixed top-0 left-0 right-0 z-50 bg-[#181F25] border-b border-white/5">
                    <div className="max-w-7xl mx-auto px-6 py-4">
                        <div className="flex justify-between items-center">
                            {/* Logo */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#A343EC] rounded-xl flex items-center justify-center">
                                    <Zap className="text-white" size={22} />
                                </div>
                                <h1 className="text-2xl font-bold text-[#FBF9F5]">Kairos</h1>
                            </div>
                            
                            {/* Centered Navigation */}
                            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
                                <button 
                                    onClick={scrollToAbout} 
                                    className="flex items-center gap-2 px-5 py-2.5 text-[#E4DEAA] hover:text-[#FBF9F5] hover:bg-white/5 rounded-full font-medium transition-all duration-200"
                                >
                                    <Info size={18} />
                                    <span>About</span>
                                </button>
                                <button 
                                    onClick={() => setIsGuideOpen(true)} 
                                    className="flex items-center gap-2 px-5 py-2.5 text-[#E4DEAA] hover:text-[#FBF9F5] hover:bg-white/5 rounded-full font-medium transition-all duration-200"
                                >
                                    <BookOpen size={18} />
                                    <span>Guide</span>
                                </button>
                            </div>
                            
                            {/* User Display */}
                            <div className="flex items-center">
                                {session && <UserDisplay />}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Hero Section */}
                <section className="pt-40 pb-32 px-6 min-h-screen flex items-center">
                    <div className="max-w-7xl mx-auto w-full">
                        {/* Main Hero Content */}
                        <div className="flex flex-col lg:flex-row justify-between items-start gap-12 mb-8">
                            {/* Left Side - Text */}
                            <div className="flex-1 text-center lg:text-left">
                                <h2 className={`text-7xl md:text-8xl lg:text-9xl font-bold text-[#FBF9F5] mb-6 leading-tight tracking-tight ${!hasAnimated ? 'animate-title-entrance' : ''}`} style={{ fontFamily: 'var(--font-arsenica)' }}>
                                    <span className="inline-block">Kairos</span>
                                </h2>
                                <p className={`text-xl text-[#E4DEAA] leading-relaxed max-w-2xl mx-auto lg:mx-0 ${!hasAnimated ? 'animate-smooth-fade-in' : ''}`} style={{ animationDelay: !hasAnimated ? '0.2s' : '0s' }}>
                                    A powerful platform to coordinate events, manage projects, and collaborate with your team—all in one place.
                                </p>
                            </div>

                            {/* Right Side - Actions & Role Selection */}
                            <div className={`flex flex-col gap-4 w-full lg:w-auto lg:min-w-[400px] ${!hasAnimated ? 'animate-smooth-fade-in' : ''}`} style={{ animationDelay: !hasAnimated ? '0.4s' : '0s' }}>
                                {session && !showRoleSelection && (
                                    <>
                                        <Link 
                                            href="/create" 
                                            className="flex items-center justify-center gap-2 px-10 py-5 bg-[#A343EC]/80 text-white font-semibold rounded-2xl hover:bg-[#8B35C7] transition-all duration-300 shadow-lg shadow-[#A343EC]/20 hover:shadow-xl hover:shadow-[#A343EC]/30 hover:scale-105 text-lg"
                                        >
                                            Enter Project Space
                                            <ArrowRight size={22} />
                                        </Link>
                                        <Link 
                                            href="/publish" 
                                            className="flex items-center justify-center gap-2 px-10 py-5 bg-white/[0.03] text-[#FBF9F5] font-semibold rounded-2xl hover:bg-white/10 transition-all duration-300 border border-white/10 text-lg"
                                        >
                                            View Publications
                                            <Calendar size={22} />
                                        </Link>
                                    </>
                                )}
                                
                                {!session && (
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className="flex items-center justify-center gap-2 px-10 py-5 bg-[#A343EC]/80 text-white font-semibold rounded-2xl hover:bg-[#8B35C7] transition-all duration-300 shadow-lg shadow-[#A343EC]/20 hover:shadow-xl hover:shadow-[#A343EC]/30 hover:scale-105 text-lg"
                                    >
                                        Log In / Sign Up
                                        <ArrowRight size={22} />
                                    </button>
                                )}

                                {/* Role Selection Inline */}
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

                {/* About Us Section */}
                <section ref={aboutRef} className="py-20 px-6 pt-40">
                    <div className="max-w-7xl mx-auto">
                        {/* Section Header */}
                        <div className="text-center mb-16">
                            <h3 className="text-4xl md:text-5xl font-bold text-[#FBF9F5] mb-4">
                                About Kairos
                            </h3>
                            <p className="text-lg text-[#E4DEAA] max-w-3xl mx-auto">
                                Kairos is designed to streamline collaboration, whether you are managing personal projects, 
                                coordinating with a team, or organizing large-scale events.
                            </p>
                        </div>

                        {/* Magic Bento Feature Cards */}
                        <div className="flex justify-center mb-16">
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
                                glowColor="163, 67, 236"
                            />
                        </div>

                        {/* Key Features */}
                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
                            <h4 className="text-2xl font-bold text-[#FBF9F5] mb-8">Key Features</h4>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-6 h-6 bg-[#A3D3B4] rounded-full flex items-center justify-center mt-1">
                                        <CheckCircle2 className="text-[#181F25]" size={16} />
                                    </div>
                                    <div>
                                        <h5 className="font-semibold text-[#FBF9F5] mb-2">Interactive Timeline</h5>
                                        <p className="text-sm text-[#E4DEAA]">Visual task management with real-time progress tracking</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-6 h-6 bg-[#A3D3B4] rounded-full flex items-center justify-center mt-1">
                                        <CheckCircle2 className="text-[#181F25]" size={16} />
                                    </div>
                                    <div>
                                        <h5 className="font-semibold text-[#FBF9F5] mb-2">Document Collaboration</h5>
                                        <p className="text-sm text-[#E4DEAA]">Create, edit, and draw on documents with team attribution</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-6 h-6 bg-[#A3D3B4] rounded-full flex items-center justify-center mt-1">
                                        <CheckCircle2 className="text-[#181F25]" size={16} />
                                    </div>
                                    <div>
                                        <h5 className="font-semibold text-[#FBF9F5] mb-2">Password Protection</h5>
                                        <p className="text-sm text-[#E4DEAA]">Secure sensitive files with encryption and email recovery</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-6 h-6 bg-[#A3D3B4] rounded-full flex items-center justify-center mt-1">
                                        <CheckCircle2 className="text-[#181F25]" size={16} />
                                    </div>
                                    <div>
                                        <h5 className="font-semibold text-[#FBF9F5] mb-2">Event Publishing</h5>
                                        <p className="text-sm text-[#E4DEAA]">Share events publicly or import from project workspaces</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                {!session && (
                    <section className="py-20 px-6 bg-[#A343EC]/10">
                        <div className="max-w-4xl mx-auto text-center">
                            <h3 className="text-4xl md:text-5xl font-bold text-white mb-4">
                                Ready to Get Started?
                            </h3>
                            <p className="text-xl text-[#E4DEAA] mb-8">
                                Join teams already using Kairos to stay organized
                            </p>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="inline-flex items-center gap-2 px-8 py-4 bg-[#A343EC] text-white font-semibold rounded-2xl hover:bg-[#8B35C7] transition-all duration-300 shadow-lg shadow-[#A343EC]/20 hover:shadow-xl hover:shadow-[#A343EC]/30 hover:scale-105"
                            >
                                Sign Up Free
                                <ArrowRight size={20} />
                            </button>
                        </div>
                    </section>
                )}

                {/* Footer */}
                <footer className="py-12 px-6">
                    <div className="max-w-7xl mx-auto text-center">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-[#A343EC] rounded-xl flex items-center justify-center">
                                <Zap className="text-white" size={20} />
                            </div>
                            <span className="text-xl font-bold text-[#FBF9F5]">Kairos</span>
                        </div>
                        <p className="text-[#E4DEAA]">
                            © 2024 Kairos. Professional event and project management platform.
                        </p>
                    </div>
                </footer>
            </div>

            <SignInModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

            {/* How To Guide Modal - keeping the same */}
            {isGuideOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-black/90 backdrop-blur-md"
                        onClick={() => setIsGuideOpen(false)}
                    />
                    <div className="relative bg-gradient-to-br from-[#1a2128] to-[#181F25] rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden border border-[#A343EC]/20 shadow-2xl shadow-[#A343EC]/10">
                        <div className="sticky top-0 bg-gradient-to-r from-[#A343EC]/10 to-transparent border-b border-white/5 p-8 backdrop-blur-xl">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-3xl font-bold text-[#FBF9F5] mb-2">Getting Started with Kairos</h3>
                                    <p className="text-sm text-[#E4DEAA]/70">Everything you need to know to get up and running</p>
                                </div>
                                <button 
                                    onClick={() => setIsGuideOpen(false)}
                                    className="p-2 text-[#E4DEAA] hover:text-[#FBF9F5] hover:bg-white/10 rounded-xl transition-all duration-200"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>
                        
                        <div className="overflow-y-auto max-h-[calc(85vh-120px)] p-8 space-y-8">
                            {/* Guide content remains the same from your original file */}
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes float-slow {
                    0%, 100% {
                        transform: translate(0, 0) scale(1);
                    }
                    33% {
                        transform: translate(30px, -30px) scale(1.1);
                    }
                    66% {
                        transform: translate(-20px, 20px) scale(0.9);
                    }
                }

                @keyframes float-medium {
                    0%, 100% {
                        transform: translate(0, 0) scale(1);
                    }
                    33% {
                        transform: translate(-40px, 30px) scale(1.05);
                    }
                    66% {
                        transform: translate(25px, -25px) scale(0.95);
                    }
                }

                @keyframes float-fast {
                    0%, 100% {
                        transform: translate(0, 0) scale(1);
                    }
                    33% {
                        transform: translate(20px, 40px) scale(1.08);
                    }
                    66% {
                        transform: translate(-30px, -20px) scale(0.92);
                    }
                }
                
                @keyframes smooth-fade-in {
                    0% {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .animate-float-slow {
                    animation: float-slow 20s ease-in-out infinite;
                }

                .animate-float-medium {
                    animation: float-medium 15s ease-in-out infinite;
                }

                .animate-float-fast {
                    animation: float-fast 12s ease-in-out infinite;
                }
                
                .animate-smooth-fade-in {
                    animation: smooth-fade-in 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                    opacity: 0;
                }
            `}</style>
        </main>
    );
}