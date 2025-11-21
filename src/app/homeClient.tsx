// src/app/homeClient.tsx
"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { UserDisplay } from "./_components/userDisplay";
import { SignInModal } from "./_components/signInModal";
import { RoleSelectionModal } from "./_components/roleSelectionModal";
import { api } from "~/trpc/react";
import { 
  ChevronDown,
  Calendar, 
  FolderKanban, 
  Users, 
  CheckCircle2,
  Zap,
  Shield,
  ArrowRight,
  BookOpen,
  Info
} from "lucide-react";

interface SessionData {
    user?: { name?: string | null; id?: string } | null;
}

export function HomeClient({ hello, session }: {
    hello: { greeting: string | null } | null;
    session: SessionData | null;
}) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [showRoleSelection, setShowRoleSelection] = useState(false);
    const aboutRef = useRef<HTMLElement>(null);

    const { data: userProfile } = api.user.getProfile.useQuery(undefined, {
        enabled: !!session?.user,
    });

    useEffect(() => {
        if (session?.user && userProfile !== undefined && !userProfile) {
            setShowRoleSelection(true);
        }
    }, [session, userProfile]);

    const scrollToAbout = () => {
        aboutRef.current?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    };

    const handleRoleSelectionComplete = () => {
        setShowRoleSelection(false);
        window.location.reload();
    };

    return (
        <main className="min-h-screen bg-[rgb(var(--bg-primary))]">
            
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-[rgb(var(--bg-primary))]/80 backdrop-blur-md border-b border-[rgb(var(--border-light))]">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <Zap className="text-white" size={24} />
                        </div>
                        <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))]">EventFlow</h1>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <button 
                            onClick={scrollToAbout} 
                            className="flex items-center gap-2 px-4 py-2 text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] font-medium transition-all duration-200"
                        >
                            <Info size={18} />
                            About Us
                        </button>
                        <button 
                            onClick={() => setIsGuideOpen(true)} 
                            className="flex items-center gap-2 px-4 py-2 text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] font-medium transition-all duration-200"
                        >
                            <BookOpen size={18} />
                            How To Guide
                        </button>
                        {session && <UserDisplay />}
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-[rgb(var(--accent-primary))]/10 border border-[rgb(var(--accent-primary))]/20 text-[rgb(var(--accent-primary))] rounded-full text-sm font-medium mb-8 backdrop-blur-sm">
                        <Zap size={16} />
                        Professional Event & Project Management
                    </div>
                    
                    <h2 className="text-5xl lg:text-6xl font-bold text-[rgb(var(--text-primary))] leading-tight mb-6">
                        Organize Events.<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                            Manage Projects.
                        </span>
                    </h2>
                    
                    <p className="text-xl text-[rgb(var(--text-secondary))] leading-relaxed mb-12 max-w-2xl mx-auto">
                        A powerful platform to coordinate events, manage projects, and collaborate with your team—all in one place.
                    </p>

                    {session ? (
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link 
                                href="/create" 
                                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all duration-300 shadow-lg shadow-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/70 hover:scale-105"
                            >
                                Enter Project Space
                                <ArrowRight size={20} />
                            </Link>
                            <Link 
                                href="/publish" 
                                className="inline-flex items-center gap-2 px-8 py-4 bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-primary))] font-semibold rounded-xl hover:bg-[rgb(var(--bg-tertiary))] transition-all duration-300 border-2 border-[rgb(var(--border-light))] hover:border-[rgb(var(--border-medium))]"
                            >
                                View Publications
                                <Calendar size={20} />
                            </Link>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all duration-300 shadow-lg shadow-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/70 hover:scale-105"
                        >
                            Log In / Sign Up
                            <ArrowRight size={20} />
                        </button>
                    )}

                    {hello && (
                        <div className="flex items-center justify-center gap-2 text-sm text-[rgb(var(--text-secondary))] mt-8">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                            System Status: {hello.greeting}
                        </div>
                    )}

                    <button 
                        onClick={scrollToAbout}
                        className="mt-16 inline-flex flex-col items-center text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--accent-primary))] transition-colors animate-bounce"
                    >
                        <span className="text-sm font-medium mb-2">Learn More</span>
                        <ChevronDown size={24} />
                    </button>
                </div>
            </section>

            {/* About Us Section */}
            <section ref={aboutRef} className="py-20 px-6 bg-[rgb(var(--bg-secondary))]/30 backdrop-blur-xl border-y border-[rgb(var(--border-light))]">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h3 className="text-4xl font-bold text-[rgb(var(--text-primary))] mb-4">
                            About EventFlow
                        </h3>
                        <p className="text-xl text-[rgb(var(--text-secondary))] max-w-3xl mx-auto">
                            EventFlow is designed to streamline collaboration, whether you are managing personal projects, 
                            coordinating with a team, or organizing large-scale events.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 mb-16">
                        <div className="bg-[rgb(var(--bg-primary))] rounded-2xl shadow-lg border border-[rgb(var(--border-light))] hover:border-[rgb(var(--accent-primary))]/50 transition-all duration-300 p-8">
                            <div className="w-12 h-12 bg-[rgb(var(--accent-primary))]/10 rounded-lg flex items-center justify-center mb-4">
                                <FolderKanban className="text-[rgb(var(--accent-primary))]" size={24} />
                            </div>
                            <h4 className="text-xl font-bold text-[rgb(var(--text-primary))] mb-3">For Organizations</h4>
                            <p className="text-[rgb(var(--text-secondary))]">
                                Admins can create organization spaces, assign roles, manage tasks, and oversee team progress. 
                                Workers collaborate on shared documents with real-time tracking.
                            </p>
                        </div>

                        <div className="bg-[rgb(var(--bg-primary))] rounded-2xl shadow-lg border border-[rgb(var(--border-light))] hover:border-purple-500/50 transition-all duration-300 p-8">
                            <div className="w-12 h-12 bg-purple-600/10 rounded-lg flex items-center justify-center mb-4">
                                <Users className="text-purple-600" size={24} />
                            </div>
                            <h4 className="text-xl font-bold text-[rgb(var(--text-primary))] mb-3">For Teams</h4>
                            <p className="text-[rgb(var(--text-secondary))]">
                                Join organization spaces with access codes. Complete assignments, create documents, 
                                and collaborate with password-protected files and real-time annotations.
                            </p>
                        </div>

                        <div className="bg-[rgb(var(--bg-primary))] rounded-2xl shadow-lg border border-[rgb(var(--border-light))] hover:border-blue-500/50 transition-all duration-300 p-8">
                            <div className="w-12 h-12 bg-blue-600/10 rounded-lg flex items-center justify-center mb-4">
                                <Shield className="text-blue-600" size={24} />
                            </div>
                            <h4 className="text-xl font-bold text-[rgb(var(--text-primary))] mb-3">For Personal Use</h4>
                            <p className="text-[rgb(var(--text-secondary))]">
                                Perfect for individual productivity. Create encrypted notes, manage personal tasks, 
                                and organize your workflow without any organizational overhead.
                            </p>
                        </div>
                    </div>

                    <div className="bg-[rgb(var(--bg-primary))] rounded-2xl shadow-lg border border-[rgb(var(--border-light))] p-8">
                        <h4 className="text-2xl font-bold text-[rgb(var(--text-primary))] mb-6">Key Features</h4>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="text-emerald-500 flex-shrink-0 mt-1" size={20} />
                                <div>
                                    <h5 className="font-semibold text-[rgb(var(--text-primary))] mb-1">Interactive Timeline</h5>
                                    <p className="text-sm text-[rgb(var(--text-secondary))]">Visual task management with real-time progress tracking</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="text-emerald-500 flex-shrink-0 mt-1" size={20} />
                                <div>
                                    <h5 className="font-semibold text-[rgb(var(--text-primary))] mb-1">Document Collaboration</h5>
                                    <p className="text-sm text-[rgb(var(--text-secondary))]">Create, edit, and draw on documents with team attribution</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="text-emerald-500 flex-shrink-0 mt-1" size={20} />
                                <div>
                                    <h5 className="font-semibold text-[rgb(var(--text-primary))] mb-1">Password Protection</h5>
                                    <p className="text-sm text-[rgb(var(--text-secondary))]">Secure sensitive files with encryption and email recovery</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="text-emerald-500 flex-shrink-0 mt-1" size={20} />
                                <div>
                                    <h5 className="font-semibold text-[rgb(var(--text-primary))] mb-1">Event Publishing</h5>
                                    <p className="text-sm text-[rgb(var(--text-secondary))]">Share events publicly or import from project workspaces</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            {!session && (
                <section className="py-20 px-6 bg-gradient-to-br from-indigo-600 to-purple-600">
                    <div className="max-w-4xl mx-auto text-center">
                        <h3 className="text-4xl font-bold text-white mb-4">
                            Ready to Get Started?
                        </h3>
                        <p className="text-xl text-indigo-100 mb-8">
                            Join teams already using EventFlow to stay organized
                        </p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-slate-50 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                        >
                            Sign Up Free
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </section>
            )}

            {/* Footer */}
            <footer className="py-12 px-6 bg-[rgb(var(--bg-secondary))] border-t border-[rgb(var(--border-light))]">
                <div className="max-w-7xl mx-auto text-center">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                            <Zap className="text-white" size={20} />
                        </div>
                        <span className="text-xl font-bold text-[rgb(var(--text-primary))]">EventFlow</span>
                    </div>
                    <p className="text-[rgb(var(--text-secondary))]">
                        © 2024 EventFlow. Professional event and project management platform.
                    </p>
                </div>
            </footer>

            <SignInModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            <RoleSelectionModal 
                isOpen={showRoleSelection} 
                onComplete={handleRoleSelectionComplete} 
            />

            {/* How To Guide Modal */}
            {isGuideOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => setIsGuideOpen(false)}
                    />
                    <div className="relative bg-[rgb(var(--bg-primary))] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-y-auto border border-[rgb(var(--border-light))]">
                        <div className="sticky top-0 bg-[rgb(var(--bg-primary))] border-b border-[rgb(var(--border-light))] p-6 flex justify-between items-center">
                            <h3 className="text-2xl font-bold text-[rgb(var(--text-primary))]">How To Use EventFlow</h3>
                            <button 
                                onClick={() => setIsGuideOpen(false)}
                                className="p-2 text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-secondary))] rounded-lg transition"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-8 space-y-8">
                            <div>
                                <h4 className="text-xl font-bold text-[rgb(var(--accent-primary))] mb-3">Getting Started</h4>
                                <ol className="list-decimal list-inside space-y-2 text-[rgb(var(--text-secondary))]">
                                    <li>Sign up using Google or Discord authentication</li>
                                    <li>Choose your usage type: Personal, Organization Admin, or Worker</li>
                                    <li>If joining an organization, enter the access code provided by your admin</li>
                                </ol>
                            </div>

                            <div>
                                <h4 className="text-xl font-bold text-[rgb(var(--accent-primary))] mb-3">For Admins</h4>
                                <ul className="list-disc list-inside space-y-2 text-[rgb(var(--text-secondary))]">
                                    <li>Create your organization space - a unique code will be generated</li>
                                    <li>Share the code with your team members</li>
                                    <li>Assign tasks, set deadlines, and track progress</li>
                                    <li>Manage user roles and permissions</li>
                                    <li>Review worker submissions and provide feedback</li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="text-xl font-bold text-[rgb(var(--accent-primary))] mb-3">For Workers</h4>
                                <ul className="list-disc list-inside space-y-2 text-[rgb(var(--text-secondary))]">
                                    <li>View assigned tasks in the interactive timeline</li>
                                    <li>Create documents, add drawings, and collaborate</li>
                                    <li>Protect sensitive files with passwords</li>
                                    <li>Check off completed tasks to update the timeline</li>
                                    <li>Import existing documents and edit collaboratively</li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="text-xl font-bold text-[rgb(var(--accent-primary))] mb-3">Event Management</h4>
                                <ul className="list-disc list-inside space-y-2 text-[rgb(var(--text-secondary))]">
                                    <li>Browse nearby events or create your own</li>
                                    <li>Import event information from project workspaces</li>
                                    <li>Share events publicly or with specific groups</li>
                                    <li>Track RSVPs and engagement</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}