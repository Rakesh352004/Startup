import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#0a032a] to-[#0b052e] text-white p-4">
      <h1 className="text-5xl font-bold mb-4">404</h1>
      <p className="text-xl mb-8">Page not found</p>
      <Link 
        to="/" 
        className="bg-gradient-to-r from-purple-500 to-purple-700 text-white px-6 py-3 rounded-full hover:brightness-110 transition-all"
      >
        Return Home
      </Link>
    </div>
  );
}