import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="glass-strong rounded-2xl p-12 max-w-2xl mx-auto hover-lift">
          <h1 className="text-7xl font-bold gradient-text mb-4">
            FLYON
          </h1>
          <p className="text-xl text-white/80 mb-8">
            Personal web platform for drone and FPV drone owners
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/login"
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-8 py-3 glass text-white border-2 border-white/30 rounded-lg hover:bg-white/10 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
