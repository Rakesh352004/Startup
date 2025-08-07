import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#0a032a] text-white font-sans pt-16">
      {/* Hero Section */}
      <section className="text-center px-4 max-w-4xl mx-auto py-20">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          Navigate Your Startup Journey with AI
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Validate ideas, find your team, and generate roadmaps – all in one place.
        </p>
        <Link 
          to={isAuthenticated ? "/dashboard" : "/register"} 
          className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-full text-lg font-semibold inline-block"
        >
          Get Started Free
        </Link>
      </section>

      {/* Features Section */}
      <section className="px-4 max-w-6xl mx-auto py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Everything you need to launch successfully</h2>
          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
            Our AI-powered platform provides all the tools and insights you need to turn your startup idea into reality.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-[#1c0f4c] p-6 rounded-xl border border-purple-800">
            <h3 className="text-xl font-bold mb-3">Idea Validator</h3>
            <p className="text-gray-400">
              AI-powered research & scoring system to assess your startup idea with market analysis and feasibility scoring.
            </p>
          </div>
          <div className="bg-[#1c0f4c] p-6 rounded-xl border border-purple-800">
            <h3 className="text-xl font-bold mb-3">Team Builder</h3>
            <p className="text-gray-400">
              Find the right people based on skill & vision alignment. Connect with co-founders and early employees.
            </p>
          </div>
          <div className="bg-[#1c0f4c] p-6 rounded-xl border border-purple-800">
            <h3 className="text-xl font-bold mb-3">Roadmap Generator</h3>
            <p className="text-gray-400">
              Get an actionable startup roadmap based on your goals, timeline, and available resources.
            </p>
          </div>
        </div>
      </section>

      {/* AI Assistant Section */}
      <section className="px-4 max-w-4xl mx-auto py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Meet your AI Startup Assistant</h2>
          <p className="text-xl text-gray-300 mb-12">
            See how our AI helps validate your startup idea in real-time
          </p>
        </div>
        
        <div className="bg-[#1c0f4c] rounded-xl p-6 border border-purple-800 mb-8">
          <div className="flex items-center gap-2 text-green-400 mb-4">
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <span className="font-mono">AI Validator Terminal</span>
          </div>
          <div className="bg-[#0a032a] p-4 rounded-lg mb-4">
            <p className="text-cyan-300">&gt; I want to start a food delivery app for college students!</p>
          </div>
          <div className="bg-[#0a032a] p-4 rounded-lg">
            <p className="text-white">🔍 Analyzing market opportunity...</p>
            <p className="text-white">🧠 Evaluating competition landscape...</p>
            <p className="text-white">💡 Generating actionable insights...</p>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-[#1c0f4c] p-6 rounded-xl border border-purple-800">
            <h3 className="text-xl font-bold mb-3 text-purple-300">Natural Language Processing</h3>
            <p className="text-gray-400">
              Describe your idea in plain English and get instant, actionable feedback.
            </p>
          </div>
          <div className="bg-[#1c0f4c] p-6 rounded-xl border border-purple-800">
            <h3 className="text-xl font-bold mb-3 text-purple-300">Market Analysis</h3>
            <p className="text-gray-400">
              Get comprehensive market size, competition, and opportunity analysis.
            </p>
          </div>
          <div className="bg-[#1c0f4c] p-6 rounded-xl border border-purple-800">
            <h3 className="text-xl font-bold mb-3 text-purple-300">Actionable Insights</h3>
            <p className="text-gray-400">
              Receive specific recommendations and next steps for your startup journey.
            </p>
          </div>
        </div>
      </section>

      {/* Newsletter & Footer */}
      <section className="px-4 max-w-4xl mx-auto py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Stay ahead of the startup curve</h2>
          <p className="text-xl text-gray-300 mb-8">
            Get weekly insights, startup tips, and early access to new features. Join 25,000+ entrepreneurs.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-2 max-w-md mx-auto">
            <input 
              type="email" 
              placeholder="Enter your email" 
              className="px-5 py-3 rounded-full sm:rounded-l-full sm:rounded-r-none bg-[#1c0f4c] border border-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 flex-grow"
            />
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full sm:rounded-r-full sm:rounded-l-none">
              Subscribe
            </button>
          </div>
        </div>
        
        <footer className="border-t border-gray-700 pt-12 pb-8">
          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-2">
              <div className="text-xl font-bold text-purple-400 mb-4">Startup GPS</div>
              <p className="text-gray-400">
                Navigate your startup journey with AI-powered tools for validation, team building, and roadmap generation.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-3">Company</h4>
              <ul className="text-gray-400 space-y-2">
                <li><Link to="/about" className="hover:text-purple-300">About</Link></li>
                <li><Link to="/blog" className="hover:text-purple-300">Blog</Link></li>
                <li><Link to="/careers" className="hover:text-purple-300">Careers</Link></li>
                <li><Link to="/contact" className="hover:text-purple-300">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-3">Product</h4>
              <ul className="text-gray-400 space-y-2">
                <li><Link to="/features" className="hover:text-purple-300">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-purple-300">Pricing</Link></li>
                <li><Link to="/api" className="hover:text-purple-300">API Docs</Link></li>
                <li><Link to="/integrations" className="hover:text-purple-300">Integrations</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-3">Resources</h4>
              <ul className="text-gray-400 space-y-2">
                <li><Link to="/help" className="hover:text-purple-300">Help Center</Link></li>
                <li><Link to="/community" className="hover:text-purple-300">Community</Link></li>
                <li><Link to="/guide" className="hover:text-purple-300">Startup Guide</Link></li>
                <li><Link to="/templates" className="hover:text-purple-300">Templates</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500">© 2024 Startup GPS. All rights reserved.</p>
            <div className="flex gap-4">
              <Link to="/privacy" className="text-gray-500 hover:text-purple-300">Privacy</Link>
              <Link to="/terms" className="text-gray-500 hover:text-purple-300">Terms</Link>
              <Link to="/faq" className="text-gray-500 hover:text-purple-300">FAQ</Link>
            </div>
          </div>
        </footer>
      </section>
    </div>
  );
}