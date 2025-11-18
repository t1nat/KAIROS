// src/app/create/page.tsx

import Link from "next/link";
import { auth } from "~/server/auth";
import { UserDisplay } from "~/app/_components/userDisplay";
import { SideNav } from "~/app/_components/sideNav"; // Already imported

export default async function CreatePage() {
  const session = await auth();

  // If the user is not logged in, we render the page without the sidebar wrapper
  if (!session?.user) {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-[#FFFEE8] text-white">
            
            {/* User Display in Top Right Corner */}
            <div className="absolute top-8 right-8 z-10">
                <UserDisplay />
            </div>
            
            {/* Centered Content Container */}
            <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
                
                {/* Main Title for the Create Page */}
                <h1 className="text-6xl font-extrabold tracking-tight text-[#140C00] sm:text-[7rem]">
                    Access Denied
                </h1>
                
                <div className="text-center text-3xl text-[#140C00]">
                    <p className="mb-4">Please sign in to create content.</p>
                    <Link
                        href="/api/auth/signin"
                        className="rounded-full bg-white/20 px-8 py-3 text-xl text-[#140C00] font-semibold no-underline transition hover:bg-white/30"
                    >
                        Sign in
                    </Link>
                </div>
            </div>
        </main>
    );
  }

  // --- CONTENT FOR LOGGED-IN USERS (WITH SIDEBAR) ---
  return (
    // ADD: overflow-hidden to the fragment to prevent layout/scrollbar issues
    <div className="overflow-hidden"> 
      {/* 1. ADD THE SIDENAV HERE (it is position: fixed) */}
      <SideNav />

      {/* 2. WRAP MAIN CONTENT WITH ml-16 to offset the fixed w-16 SideNav */}
      <div className="ml-16">
        <main className="flex min-h-screen flex-col items-center justify-center bg-[#FFFEE8] text-white">
          
          {/* User Display in Top Right Corner (same as landing page) */}
          <div className="absolute top-8 right-8 z-10">
            <UserDisplay />
          </div>
          
          {/* Centered Content Container (same as landing page) */}
          <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
            
            {/* Main Title for the Create Page */}
            <h1 className="text-6xl font-extrabold tracking-tight text-[#140C00] sm:text-[7rem]">
              Create Content
            </h1>
            
            {/* Conditional Content based on session */}
            <div className="flex flex-col items-center justify-center gap-6">
              
              {/* Logged-in Content */}
              <>
                <p className="text-xl text-[#140C00] text-center">
                  Hello, {session.user.name}! Here you can start making something great.
                </p>
                {/* Add your actual content creation forms/elements here */}
                <div className="mt-8 p-6 bg-white/20 rounded-lg shadow-lg text-lg text-gray-800">
                  <p>This is where your creation tools will go.</p>
                  <input 
                    type="text" 
                    placeholder="Enter your idea..." 
                    className="mt-4 w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                  <button className="mt-4 w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition">
                    Publish Idea
                  </button>
                </div>
                
                {/* Link back to home or dashboard */}
                <Link 
                  href="/" 
                  className="mt-8 text-blue-600 hover:text-blue-800 underline text-lg font-semibold transition-colors"
                >
                  ← Back to Home
                </Link>
              </>
            </div>
            
          </div>
        </main>
      </div>
    </div> // Closing the new div wrapper
  );
}