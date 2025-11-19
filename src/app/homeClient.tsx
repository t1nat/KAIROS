// src/app/homeClient.tsx

"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { UserDisplay } from "./_components/userDisplay";
import { SignInModal } from "./_components/signInModal";
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
    user?: { name?: string | null } | null;
}

const GRADIENT_BG = "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50";
const CARD_STYLE = "bg-white rounded-2xl shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300";
const PRIMARY_BUTTON = "inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105";
const NAV_BUTTON = "inline-flex items-center gap-2 px-4 py-2 text-slate-700 hover:text-indigo-600 font-medium transition-all duration-200";

export function HomeClient({ hello, session }: {
    hello: { greeting: string | null } | null;
    session: SessionData | null;
}) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const aboutRef = useRef<HTMLElement>(null);

    const scrollToAbout = () => {
        aboutRef.current?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    };

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
                    
                    {/* Navigation */}
                    <div className="flex items-center gap-6">
                        <button onClick={scrollToAbout} className={NAV_BUTTON}>
                            <Info size={18} />
                            About Us
                        </button>
                        <button onClick={() => setIsGuideOpen(true)} className={NAV_BUTTON}>
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
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-8">
                        <Zap size={16} />
                        Professional Event & Project Management
                    </div>
                    
                    <h2 className="text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-6">
                        Organize Events.<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                            Manage Projects.
                        </span>
                    </h2>
                    
                    <p className="text-xl text-slate-600 leading-relaxed mb-12 max-w-2xl mx-auto">
                        A powerful platform to coordinate events, manage projects, and collaborate with your team—all in one place.
                    </p>

                    {/* CTA Button */}
                    {session ? (
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/create" className={PRIMARY_BUTTON}>
                                Enter Project Space
                                <ArrowRight size={20} />
                            </Link>
                            <Link href="/publish" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-slate-50 transition-all duration-300 border-2 border-indigo-600">
                                View Publications
                                <Calendar size={20} />
                            </Link>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className={PRIMARY_BUTTON}
                        >
                            Log In / Sign Up
                            <ArrowRight size={20} />
                        </button>
                    )}

                    {/* Status */}
                    {hello && (
                        <div className="flex items-center justify-center gap-2 text-sm text-slate-500 mt-8">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            System Status: {hello.greeting}
                        </div>
                    )}

                    {/* Scroll Indicator */}
                    <button 
                        onClick={scrollToAbout}
                        className="mt-16 inline-flex flex-col items-center text-slate-400 hover:text-indigo-600 transition-colors animate-bounce"
                    >
                        <span className="text-sm font-medium mb-2">Learn More</span>
                        <ChevronDown size={24} />
                    </button>
                </div>
            </section>

            {/* About Us Section */}
            <section ref={aboutRef} className="py-20 px-6 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h3 className="text-4xl font-bold text-slate-900 mb-4">
                            About EventFlow
                        </h3>
                        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                            EventFlow is designed to streamline collaboration, whether you&#39;re managing personal projects, 
                            coordinating with a team, or organizing large-scale events.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 mb-16">
                        <div className={`${CARD_STYLE} p-8`}>
                            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                                <FolderKanban className="text-indigo-600" size={24} />
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 mb-3">For Organizations</h4>
                            <p className="text-slate-600">
                                Admins can create organization spaces, assign roles, manage tasks, and oversee team progress. 
                                Workers collaborate on shared documents with real-time tracking.
                            </p>
                        </div>

                        <div className={`${CARD_STYLE} p-8`}>
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                                <Users className="text-purple-600" size={24} />
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 mb-3">For Teams</h4>
                            <p className="text-slate-600">
                                Join organization spaces with access codes. Complete assignments, create documents, 
                                and collaborate with password-protected files and real-time annotations.
                            </p>
                        </div>

                        <div className={`${CARD_STYLE} p-8`}>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                                <Shield className="text-blue-600" size={24} />
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 mb-3">For Personal Use</h4>
                            <p className="text-slate-600">
                                Perfect for individual productivity. Create encrypted notes, manage personal tasks, 
                                and organize your workflow without any organizational overhead.
                            </p>
                        </div>
                    </div>

                    {/* Key Features */}
                    <div className={`${CARD_STYLE} p-8`}>
                        <h4 className="text-2xl font-bold text-slate-900 mb-6">Key Features</h4>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="text-green-600 flex-shrink-0 mt-1" size={20} />
                                <div>
                                    <h5 className="font-semibold text-slate-900 mb-1">Interactive Timeline</h5>
                                    <p className="text-sm text-slate-600">Visual task management with real-time progress tracking</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="text-green-600 flex-shrink-0 mt-1" size={20} />
                                <div>
                                    <h5 className="font-semibold text-slate-900 mb-1">Document Collaboration</h5>
                                    <p className="text-sm text-slate-600">Create, edit, and draw on documents with team attribution</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="text-green-600 flex-shrink-0 mt-1" size={20} />
                                <div>
                                    <h5 className="font-semibold text-slate-900 mb-1">Password Protection</h5>
                                    <p className="text-sm text-slate-600">Secure sensitive files with encryption and email recovery</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="text-green-600 flex-shrink-0 mt-1" size={20} />
                                <div>
                                    <h5 className="font-semibold text-slate-900 mb-1">Event Publishing</h5>
                                    <p className="text-sm text-slate-600">Share events publicly or import from project workspaces</p>
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

            {/* How To Guide Modal */}
            {isGuideOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                        onClick={() => setIsGuideOpen(false)}
                    />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
                            <h3 className="text-2xl font-bold text-slate-900">How To Use EventFlow</h3>
                            <button 
                                onClick={() => setIsGuideOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                            >
                                ×
                            </button>
                        </div>
                        <div className="p-8 space-y-8">
                            <div>
                                <h4 className="text-xl font-bold text-slate-900 mb-3">Getting Started</h4>
                                <ol className="list-decimal list-inside space-y-2 text-slate-600">
                                    <li>Sign up using Google or Discord authentication</li>
                                    <li>Choose your usage type: Personal, Organization Admin, or Worker</li>
                                    <li>If joining an organization, enter the access code provided by your admin</li>
                                </ol>
                            </div>

                            <div>
                                <h4 className="text-xl font-bold text-slate-900 mb-3">For Admins</h4>
                                <ul className="list-disc list-inside space-y-2 text-slate-600">
                                    <li>Create your organization space - a unique code will be generated</li>
                                    <li>Share the code with your team members</li>
                                    <li>Assign tasks, set deadlines, and track progress</li>
                                    <li>Manage user roles and permissions</li>
                                    <li>Review worker submissions and provide feedback</li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="text-xl font-bold text-slate-900 mb-3">For Workers</h4>
                                <ul className="list-disc list-inside space-y-2 text-slate-600">
                                    <li>View assigned tasks in the interactive timeline</li>
                                    <li>Create documents, add drawings, and collaborate</li>
                                    <li>Protect sensitive files with passwords</li>
                                    <li>Check off completed tasks to update the timeline</li>
                                    <li>Import existing documents and edit collaboratively</li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="text-xl font-bold text-slate-900 mb-3">Event Management</h4>
                                <ul className="list-disc list-inside space-y-2 text-slate-600">
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