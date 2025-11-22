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
  Info,
  X
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
        <main className="min-h-screen bg-[#181F25]">
            
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-[#222B32]/95 backdrop-blur-md border-b border-[#2A3742]">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#A343EC] rounded-lg flex items-center justify-center">
                                <Zap className="text-white" size={22} />
                            </div>
                            <h1 className="text-2xl font-bold text-[#FBF9F5]">Kairos</h1>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={scrollToAbout} 
                                className="flex items-center gap-2 px-4 py-2 text-[#E4DEEA] hover:text-[#FBF9F5] hover:bg-[#2A3742] rounded-lg font-medium transition-all duration-200"
                            >
                                <Info size={18} />
                                <span className="hidden sm:inline">About</span>
                            </button>
                            <button 
                                onClick={() => setIsGuideOpen(true)} 
                                className="flex items-center gap-2 px-4 py-2 text-[#E4DEEA] hover:text-[#FBF9F5] hover:bg-[#2A3742] rounded-lg font-medium transition-all duration-200"
                            >
                                <BookOpen size={18} />
                                <span className="hidden sm:inline">Guide</span>
                            </button>
                            {session && <UserDisplay />}
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6">
                <div className="max-w-7xl mx-auto">
                    {/* Badge */}
                    <div className="flex justify-center mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#2A3742] border border-[#A343EC]/30 text-[#A343EC] rounded-full text-sm font-medium">
                            <Zap size={16} />
                            Professional Event & Project Management
                        </div>
                    </div>

                    {/* Main Hero Content */}
                    <div className="flex flex-col lg:flex-row justify-between items-center gap-12 mb-12">
                        {/* Left Side - Text */}
                        <div className="flex-1 text-center lg:text-left">
                            <h2 className="text-6xl md:text-7xl lg:text-8xl font-extrabold text-[#FBF9F5] mb-6 leading-tight">
                                Kairos
                            </h2>
                            <p className="text-xl text-[#E4DEEA] leading-relaxed max-w-2xl mx-auto lg:mx-0">
                                A powerful platform to coordinate events, manage projects, and collaborate with your team—all in one place.
                            </p>
                        </div>

                        {/* Right Side - Actions */}
                        <div className="flex flex-col gap-4 w-full lg:w-auto lg:min-w-[300px]">
                            {session ? (
                                <>
                                    <Link 
                                        href="/create" 
                                        className="flex items-center justify-center gap-2 px-8 py-4 bg-[#A343EC] text-white font-semibold rounded-lg hover:bg-[#8B35C7] transition-all duration-300"
                                    >
                                        Enter Project Space
                                        <ArrowRight size={20} />
                                    </Link>
                                    <Link 
                                        href="/publish" 
                                        className="flex items-center justify-center gap-2 px-8 py-4 bg-[#2A3742] text-[#FBF9F5] font-semibold rounded-lg hover:bg-[#344252] transition-all duration-300 border border-[#2A3742]"
                                    >
                                        View Publications
                                        <Calendar size={20} />
                                    </Link>
                                </>
                            ) : (
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="flex items-center justify-center gap-2 px-8 py-4 bg-[#A343EC] text-white font-semibold rounded-lg hover:bg-[#8B35C7] transition-all duration-300"
                                >
                                    Log In / Sign Up
                                    <ArrowRight size={20} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* System Status */}
                    {hello && (
                        <div className="flex items-center justify-center gap-2 text-sm text-[#A3D3B4] mb-8">
                            <div className="w-2 h-2 bg-[#A3D3B4] rounded-full animate-pulse"></div>
                            System Status: {hello.greeting}
                        </div>
                    )}

                    {/* Scroll Down Button */}
                    <div className="flex justify-center">
                        <button 
                            onClick={scrollToAbout}
                            className="flex flex-col items-center text-[#E4DEEA] hover:text-[#A343EC] transition-colors"
                        >
                            <span className="text-sm font-medium mb-2">Learn More</span>
                            <ChevronDown size={24} className="animate-bounce" />
                        </button>
                    </div>
                </div>
            </section>

            {/* About Us Section */}
            <section ref={aboutRef} className="py-20 px-6 bg-[#222B32] border-y border-[#2A3742]">
                <div className="max-w-7xl mx-auto">
                    {/* Section Header */}
                    <div className="text-center mb-16">
                        <h3 className="text-4xl md:text-5xl font-bold text-[#FBF9F5] mb-4">
                            About Kairos
                        </h3>
                        <p className="text-lg text-[#E4DEEA] max-w-3xl mx-auto">
                            Kairos is designed to streamline collaboration, whether you are managing personal projects, 
                            coordinating with a team, or organizing large-scale events.
                        </p>
                    </div>

                    {/* Feature Cards */}
                    <div className="grid md:grid-cols-3 gap-6 mb-16">
                        {/* Organizations Card */}
                        <div className="bg-[#2A3742] rounded-xl border border-[#344252] hover:border-[#A343EC] transition-all duration-300 p-8">
                            <div className="w-12 h-12 bg-[#A343EC] rounded-lg flex items-center justify-center mb-6">
                                <FolderKanban className="text-white" size={24} />
                            </div>
                            <h4 className="text-xl font-bold text-[#FBF9F5] mb-3">For Organizations</h4>
                            <p className="text-[#E4DEEA] leading-relaxed">
                                Admins can create organization spaces, assign roles, manage tasks, and oversee team progress. 
                                Workers collaborate on shared documents with real-time tracking.
                            </p>
                        </div>

                        {/* Teams Card */}
                        <div className="bg-[#2A3742] rounded-xl border border-[#344252] hover:border-[#A343EC] transition-all duration-300 p-8">
                            <div className="w-12 h-12 bg-[#F8D45E] rounded-lg flex items-center justify-center mb-6">
                                <Users className="text-[#181F25]" size={24} />
                            </div>
                            <h4 className="text-xl font-bold text-[#FBF9F5] mb-3">For Teams</h4>
                            <p className="text-[#E4DEEA] leading-relaxed">
                                Join organization spaces with access codes. Complete assignments, create documents, 
                                and collaborate with password-protected files and real-time annotations.
                            </p>
                        </div>

                        {/* Personal Use Card */}
                        <div className="bg-[#2A3742] rounded-xl border border-[#344252] hover:border-[#A343EC] transition-all duration-300 p-8">
                            <div className="w-12 h-12 bg-[#A3D3B4] rounded-lg flex items-center justify-center mb-6">
                                <Shield className="text-[#181F25]" size={24} />
                            </div>
                            <h4 className="text-xl font-bold text-[#FBF9F5] mb-3">For Personal Use</h4>
                            <p className="text-[#E4DEEA] leading-relaxed">
                                Perfect for individual productivity. Create encrypted notes, manage personal tasks, 
                                and organize your workflow without any organizational overhead.
                            </p>
                        </div>
                    </div>

                    {/* Key Features */}
                    <div className="bg-[#2A3742] rounded-xl border border-[#344252] p-8">
                        <h4 className="text-2xl font-bold text-[#FBF9F5] mb-8">Key Features</h4>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-6 h-6 bg-[#A3D3B4] rounded-full flex items-center justify-center mt-1">
                                    <CheckCircle2 className="text-[#181F25]" size={16} />
                                </div>
                                <div>
                                    <h5 className="font-semibold text-[#FBF9F5] mb-2">Interactive Timeline</h5>
                                    <p className="text-sm text-[#E4DEEA]">Visual task management with real-time progress tracking</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-6 h-6 bg-[#A3D3B4] rounded-full flex items-center justify-center mt-1">
                                    <CheckCircle2 className="text-[#181F25]" size={16} />
                                </div>
                                <div>
                                    <h5 className="font-semibold text-[#FBF9F5] mb-2">Document Collaboration</h5>
                                    <p className="text-sm text-[#E4DEEA]">Create, edit, and draw on documents with team attribution</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-6 h-6 bg-[#A3D3B4] rounded-full flex items-center justify-center mt-1">
                                    <CheckCircle2 className="text-[#181F25]" size={16} />
                                </div>
                                <div>
                                    <h5 className="font-semibold text-[#FBF9F5] mb-2">Password Protection</h5>
                                    <p className="text-sm text-[#E4DEEA]">Secure sensitive files with encryption and email recovery</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-6 h-6 bg-[#A3D3B4] rounded-full flex items-center justify-center mt-1">
                                    <CheckCircle2 className="text-[#181F25]" size={16} />
                                </div>
                                <div>
                                    <h5 className="font-semibold text-[#FBF9F5] mb-2">Event Publishing</h5>
                                    <p className="text-sm text-[#E4DEEA]">Share events publicly or import from project workspaces</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            {!session && (
                <section className="py-20 px-6 bg-[#A343EC]">
                    <div className="max-w-4xl mx-auto text-center">
                        <h3 className="text-4xl md:text-5xl font-bold text-white mb-4">
                            Ready to Get Started?
                        </h3>
                        <p className="text-xl text-[#E4DEEA] mb-8">
                            Join teams already using Kairos to stay organized
                        </p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#A343EC] font-semibold rounded-lg hover:bg-[#FBF9F5] transition-all duration-300"
                        >
                            Sign Up Free
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </section>
            )}

            {/* Footer */}
            <footer className="py-12 px-6 bg-[#222B32] border-t border-[#2A3742]">
                <div className="max-w-7xl mx-auto text-center">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-[#A343EC] rounded-lg flex items-center justify-center">
                            <Zap className="text-white" size={20} />
                        </div>
                        <span className="text-xl font-bold text-[#FBF9F5]">Kairos</span>
                    </div>
                    <p className="text-[#E4DEEA]">
                        © 2024 Kairos. Professional event and project management platform.
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
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => setIsGuideOpen(false)}
                    />
                    <div className="relative bg-[#222B32] rounded-xl w-full max-w-3xl max-h-[80vh] overflow-hidden border border-[#2A3742]">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-[#2A3742] border-b border-[#344252] p-6 flex justify-between items-center">
                            <h3 className="text-2xl font-bold text-[#FBF9F5]">How To Use Kairos</h3>
                            <button 
                                onClick={() => setIsGuideOpen(false)}
                                className="p-2 text-[#E4DEEA] hover:text-[#FBF9F5] hover:bg-[#344252] rounded-lg transition"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        {/* Modal Content */}
                        <div className="overflow-y-auto max-h-[calc(80vh-88px)] p-8 space-y-8">
                            <div>
                                <h4 className="text-xl font-bold text-[#A343EC] mb-4">Getting Started</h4>
                                <ol className="list-decimal list-inside space-y-3 text-[#E4DEEA]">
                                    <li>Sign up using Google or Discord authentication</li>
                                    <li>Choose your usage type: Personal, Organization Admin, or Worker</li>
                                    <li>If joining an organization, enter the access code provided by your admin</li>
                                </ol>
                            </div>

                            <div>
                                <h4 className="text-xl font-bold text-[#F8D45E] mb-4">For Admins</h4>
                                <ul className="list-disc list-inside space-y-3 text-[#E4DEEA]">
                                    <li>Create your organization space - a unique code will be generated</li>
                                    <li>Share the code with your team members</li>
                                    <li>Assign tasks, set deadlines, and track progress</li>
                                    <li>Manage user roles and permissions</li>
                                    <li>Review worker submissions and provide feedback</li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="text-xl font-bold text-[#A3D3B4] mb-4">For Workers</h4>
                                <ul className="list-disc list-inside space-y-3 text-[#E4DEEA]">
                                    <li>View assigned tasks in the interactive timeline</li>
                                    <li>Create documents, add drawings, and collaborate</li>
                                    <li>Protect sensitive files with passwords</li>
                                    <li>Check off completed tasks to update the timeline</li>
                                    <li>Import existing documents and edit collaboratively</li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="text-xl font-bold text-[#E4DEEA] mb-4">Event Management</h4>
                                <ul className="list-disc list-inside space-y-3 text-[#E4DEEA]">
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