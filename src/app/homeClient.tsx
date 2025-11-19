// src/app/HomeClient.tsx

"use client";

import Link from "next/link";
import { useState } from "react";
import { UserDisplay } from "./_components/userDisplay";
import { SignInModal } from "./_components/signInModal";
import { 
  ChevronRight, 
  Calendar, 
  FolderKanban, 
  Users, 
  CheckCircle2,
  Zap,
  Shield,
  ArrowRight
} from "lucide-react";

// Define a type for the session data passed from the server
interface SessionData {
    user?: { name?: string | null } | null;
}

// Professional Design System
const GRADIENT_BG = "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50";
const CARD_STYLE = "bg-white rounded-2xl shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300";
const PRIMARY_BUTTON = "inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105";
const SECONDARY_BUTTON = "inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-slate-50 transition-all duration-300 border-2 border-indigo-600";
const FEATURE_CARD = "bg-white p-6 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all duration-300";

// This component receives server-fetched data as props
export function HomeClient({ hello, session, latestPost }: {
    hello: { greeting: string | null } | null;
    session: SessionData | null;
    latestPost: React.ReactNode;
}) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <main className={`min-h-screen ${GRADIENT_BG}`}>
            
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                            <Zap className="text-white" size={24} />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">EventFlow</h1>
                    </div>
                    <UserDisplay />
                </div>
            </header>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        
                        {/* Left Column - Hero Content */}
                        <div className="space-y-8">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                                <Zap size={16} />
                                Professional Event & Project Management
                            </div>
                            
                            <h2 className="text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
                                Organize Events.<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                                    Manage Projects.
                                </span>
                            </h2>
                            
                            <p className="text-xl text-slate-600 leading-relaxed">
                                A powerful platform to coordinate events, manage projects, and collaborate with your team—all in one place.
                            </p>

                            {/* CTA Buttons */}
                            <div className="flex flex-wrap gap-4">
                                {session ? (
                                    <>
                                        <Link href="/create?action=new_project" className={PRIMARY_BUTTON}>
                                            Create Project
                                            <ArrowRight size={20} />
                                        </Link>
                                        <Link href="/publish" className={SECONDARY_BUTTON}>
                                            View Events
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setIsModalOpen(true)}
                                            className={PRIMARY_BUTTON}
                                        >
                                            Sign In
                                            <ArrowRight size={20} />
                                        </button>
                                        <Link href="/publish" className={SECONDARY_BUTTON}>
                                            Browse Public Events
                                        </Link>
                                    </>
                                )}
                            </div>

                            {/* tRPC Status Badge */}
                            {hello && (
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    System Status: {hello.greeting}
                                </div>
                            )}
                        </div>

                        {/* Right Column - Feature Showcase */}
                        <div className={`${CARD_STYLE} p-8`}>
                            <div className="space-y-6">
                                <h3 className="text-2xl font-bold text-slate-900">
                                    {session ? `Welcome back, ${session.user?.name}!` : "What You Can Do"}
                                </h3>
                                
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
                                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <Calendar className="text-white" size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-900">Create Events</h4>
                                            <p className="text-sm text-slate-600 mb-2">Plan and organize events with ease. Share with your team and track engagement.</p>
                                            {session && (
                                                <Link href="/publish" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                                                    Go to Events →
                                                </Link>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
                                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <FolderKanban className="text-white" size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-900">Manage Projects</h4>
                                            <p className="text-sm text-slate-600 mb-2">Track tasks, assign work, and visualize progress with interactive timelines.</p>
                                            {session && (
                                                <Link href="/create?action=new_project" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                                                    Go to Projects →
                                                </Link>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                                        <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <Users className="text-white" size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-900">Collaborate</h4>
                                            <p className="text-sm text-slate-600 mb-2">Invite team members, share access, and work together in real-time.</p>
                                            {session && (
                                                <Link href="/create?action=new_note" className="text-sm font-medium text-purple-600 hover:text-purple-700">
                                                    Create Note →
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 px-6 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h3 className="text-4xl font-bold text-slate-900 mb-4">
                            Everything You Need
                        </h3>
                        <p className="text-xl text-slate-600">
                            Powerful features to help you stay organized and productive
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className={FEATURE_CARD}>
                            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                                <CheckCircle2 className="text-indigo-600" size={24} />
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 mb-2">Task Management</h4>
                            <p className="text-slate-600">
                                Create, assign, and track tasks with priorities and due dates. Visual timelines keep everyone aligned.
                            </p>
                        </div>

                        <div className={FEATURE_CARD}>
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                                <Shield className="text-purple-600" size={24} />
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 mb-2">Secure Sharing</h4>
                            <p className="text-slate-600">
                                Control who can view or edit your projects. Encrypted notes keep sensitive information safe.
                            </p>
                        </div>

                        <div className={FEATURE_CARD}>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                                <Zap className="text-blue-600" size={24} />
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 mb-2">Real-time Updates</h4>
                            <p className="text-slate-600">
                                See changes instantly. Comment, react, and collaborate with your team in real-time.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Latest Activity Section */}
            {session?.user && latestPost && (
                <section className="py-20 px-6">
                    <div className="max-w-4xl mx-auto">
                        <div className={`${CARD_STYLE} p-8`}>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                                    <Calendar className="text-white" size={20} />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900">Recent Activity</h3>
                            </div>
                            {latestPost}
                        </div>
                    </div>
                </section>
            )}

            {/* CTA Section */}
            {!session && (
                <section className="py-20 px-6 bg-gradient-to-br from-indigo-600 to-purple-600">
                    <div className="max-w-4xl mx-auto text-center">
                        <h3 className="text-4xl font-bold text-white mb-4">
                            Ready to Get Started?
                        </h3>
                        <p className="text-xl text-indigo-100 mb-8">
                            Join thousands of teams already using EventFlow to stay organized
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
            <footer className="py-12 px-6 bg-slate-900">
                <div className="max-w-7xl mx-auto text-center">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                            <Zap className="text-white" size={20} />
                        </div>
                        <span className="text-xl font-bold text-white">EventFlow</span>
                    </div>
                    <p className="text-slate-400">
                        © 2024 EventFlow. Professional event and project management platform.
                    </p>
                </div>
            </footer>

            {/* Sign In Modal */}
            <SignInModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </main>
    );
}