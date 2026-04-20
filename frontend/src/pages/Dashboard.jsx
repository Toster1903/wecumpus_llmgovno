import React from 'react';
import { MapPin, Users, Calendar, Home, Search, Bell, User } from 'lucide-react';

const Dashboard = () => {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="backdrop-blur-xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-3xl border border-white/60 p-8 hover:shadow-lg transition-all">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">Welcome back, Sam! 👋</h1>
        <p className="text-slate-600">Найди идеального соседа или напарника</p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Find Taxi Buddy */}
        <div className="backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 p-6 space-y-4 hover:shadow-lg transition-all">
          <h2 className="text-xl font-bold text-slate-900">Find a Taxi Buddy</h2>
          <div className="bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg h-32 flex items-center justify-center border border-cyan-200/50">
            <MapPin className="text-cyan-600" size={32} />
          </div>
          <button className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-2 rounded-lg font-medium transition shadow-md">
            Campus to Station? Join Now!
          </button>
        </div>

        {/* Community Hub */}
        <div className="backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 p-6 space-y-4 hover:shadow-lg transition-all">
          <h2 className="text-xl font-bold text-slate-900">Community Hub</h2>
          <div className="flex gap-2">
            <div className="flex-1 backdrop-blur-md bg-emerald-500/10 rounded-lg p-3 text-center border border-emerald-300/50">
              <div className="text-2xl mb-1">🎮</div>
              <p className="text-xs text-slate-700">Gaming club</p>
            </div>
            <div className="flex-1 backdrop-blur-md bg-purple-500/10 rounded-lg p-3 text-center border border-purple-300/50">
              <div className="text-2xl mb-1">♟️</div>
              <p className="text-xs text-slate-700">Chess enthusiasts</p>
            </div>
          </div>
        </div>

        {/* Room Info */}
        <div className="backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 p-6 space-y-4 hover:shadow-lg transition-all">
          <h2 className="text-xl font-bold text-slate-900">Room Info</h2>
          <div className="space-y-3">
            <div className="backdrop-blur-md bg-slate-900/10 rounded-lg p-3 border border-slate-300/50">
              <p className="text-xs text-slate-700">Дорм 4Б - Комната 211</p>
            </div>
            <div className="backdrop-blur-md bg-emerald-500/10 rounded-lg p-3 border border-emerald-300/50">
              <p className="text-xs text-emerald-700">✓ Keys status active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Sections */}
      <div className="grid grid-cols-3 gap-6">
        <div className="backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 p-6 hover:shadow-lg transition-all">
          <h3 className="text-lg font-bold mb-4 text-slate-900">Community Hub</h3>
          <div className="space-y-2 text-slate-700 text-sm">
            <p>🎮 Gaming club</p>
            <p>♟️ Chess enthusiasts</p>
          </div>
        </div>

        <div className="backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 p-6 hover:shadow-lg transition-all">
          <h3 className="text-lg font-bold mb-4 text-slate-900">Upcoming Events</h3>
          <div className="space-y-2 text-slate-700 text-sm">
            <p>📚 Campus Hackathon</p>
            <p className="text-xs text-slate-500">Завтра, 23:00</p>
            <p>🎵 Concert</p>
            <p className="text-xs text-slate-500">Чт 23:00 - 3:00 AM</p>
          </div>
        </div>

        <div className="backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 p-6 hover:shadow-lg transition-all">
          <h3 className="text-lg font-bold mb-4 text-slate-900">Recent Connections</h3>
          <div className="space-y-2 text-slate-700 text-sm">
            <p>• Maya Chen</p>
            <p>• Alex Smith</p>
            <p>• Jordan Lee</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
