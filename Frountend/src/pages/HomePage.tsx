import React from "react";
import { Link } from "react-router-dom";
import background from "../background.jpg";

export default function HomePage() {
  return (
    <div 
      className="relative h-screen w-full text-white font-sans overflow-hidden"
      style={{
        backgroundImage: `url(${background})`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/50">
        {/* Main Content */}
        <div className="h-full w-full pt-16 overflow-y-auto">
          {/* Hero Section */}
          <section className="text-center px-4 max-w-5xl mx-auto py-20">
            <h1 
              className="text-5xl md:text-6xl font-bold mb-6 leading-tight"
              style={{
                background: "linear-gradient(to right,#cceeff, #0087efff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Navigate Your Startup 
              <br />
              Journey with AI
            </h1>
            <div className="text-xl text-gray-300 mb-8">
              <p>Validate ideas, find your team, and generate roadmaps – all in one place.</p> 
              <p>Let AI guide your path from concept to success.</p>
            </div>
            <Link
              to="/idea-validation"
              className="bg-[#0087FF] hover:bg-[#0075e0] text-white px-8 py-3 rounded-full text-lg font-semibold inline-block transition-colors shadow-lg hover:shadow-blue-500/20"
            >
              Get Started Free
            </Link>
          </section>

          {/* Features Section */}
          <section className="px-4 max-w-5xl mx-auto py-20">
            <div className="text-center mb-20">
              <h2 
                className="text-5xl font-bold mb-4 leading-snug"
                style={{
                  background: "linear-gradient(to right,#cceeff, #0087efff)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Everything you need to launch successfully
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Our AI-powered platform provides all the tools and insights you
                need to turn your startup idea into reality.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Idea Validator Card */}
              <div className="bg-[#1c0f4c] p-8 rounded-xl border border-[#2a1b6e] hover:border-blue-500 transition-all hover:shadow-lg hover:shadow-blue-500/10">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold">Idea Validator</h3>
                </div>
                <p className="text-gray-400 mb-6">
                  AI-powered research & scoring system to assess your startup idea.
                </p>
                
                <ul className="space-y-4">
                  <li className="flex items-center">
                    <div className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-sm flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 10">
                        <path d="M1 5L4.5 9L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span className="ml-3 text-gray-300">Market analysis</span>
                  </li>
                  <li className="flex items-center">
                    <div className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-sm flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 10">
                        <path d="M1 5L4.5 9L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span className="ml-3 text-gray-300">Competitor research</span>
                  </li>
                  <li className="flex items-center">
                    <div className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-sm flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 10">
                        <path d="M1 5L4.5 9L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span className="ml-3 text-gray-300">Viability scoring</span>
                  </li>
                  <li className="flex items-center">
                    <div className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-sm flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 10">
                        <path d="M1 5L4.5 9L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span className="ml-3 text-gray-300">Risk assessment</span>
                  </li>
                </ul>
              </div>

              {/* Team Builder Card */}
              <div className="bg-[#1c0f4c] p-8 rounded-xl border border-[#2a1b6e] hover:border-blue-500 transition-all hover:shadow-lg hover:shadow-blue-500/10">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold">Team Builder</h3>
                </div>
                <p className="text-gray-400 mb-6">
                  Find the right people based on skill & vision alignment.
                </p>
                
                <ul className="space-y-4">
                  <li className="flex items-center">
                    <div className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-sm flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 10">
                        <path d="M1 5L4.5 9L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span className="ml-3 text-gray-300">Skill matching</span>
                  </li>
                  <li className="flex items-center">
                    <div className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-sm flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 10">
                        <path d="M1 5L4.5 9L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span className="ml-3 text-gray-300">Vision alignment</span>
                  </li>
                  <li className="flex items-center">
                    <div className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-sm flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 10">
                        <path d="M1 5L4.5 9L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span className="ml-3 text-gray-300">Cultural fit</span>
                  </li>
                  <li className="flex items-center">
                    <div className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-sm flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 10">
                        <path d="M1 5L4.5 9L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span className="ml-3 text-gray-300">Remote friendly</span>
                  </li>
                </ul>
              </div>

              {/* Roadmap Generator Card */}
              <div className="bg-[#1c0f4c] p-8 rounded-xl border border-[#2a1b6e] hover:border-blue-500 transition-all hover:shadow-lg hover:shadow-blue-500/10">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold">Roadmap Generator</h3>
                </div>
                <p className="text-gray-400 mb-6">
                  Get an actionable startup roadmap based on your goals.
                </p>
                
                <ul className="space-y-4">
                  <li className="flex items-center">
                    <div className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-sm flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 10">
                        <path d="M1 5L4.5 9L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span className="ml-3 text-gray-300">Milestone planning</span>
                  </li>
                  <li className="flex items-center">
                    <div className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-sm flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 10">
                        <path d="M1 5L4.5 9L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span className="ml-3 text-gray-300">Resource allocation</span>
                  </li>
                  <li className="flex items-center">
                    <div className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-sm flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 10">
                        <path d="M1 5L4.5 9L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span className="ml-3 text-gray-300">Timeline optimization</span>
                  </li>
                  <li className="flex items-center">
                    <div className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-sm flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 10">
                        <path d="M1 5L4.5 9L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span className="ml-3 text-gray-300">Progress tracking</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}