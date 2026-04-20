import React, { useState } from 'react';
import { Edit2, Sparkles } from 'lucide-react';

const ProfileBuilder = () => {
  const [profile, setProfile] = useState({
    name: 'Sam R.',
    age: 20,
    major: 'CS Major',
    interests: ['Coding', 'Chess', 'Coffee', 'Gaming', 'Music', 'Art', 'Fitness', 'Drama'],
    bio: 'Enthusiastic CS major who loves coding, chess, and finding the perfect coffee blend.',
    aiSuggestion: 'Enthusiastic CS major who loves coding, chess, and finding the perfect coffee blend.',
  });

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Profile Card */}
      <div className="col-span-1 backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 overflow-hidden hover:shadow-lg transition-all">
        {/* Photo Section */}
        <div className="bg-gradient-to-br from-emerald-100 to-cyan-100 h-48 flex items-center justify-center relative border-b border-white/40">
          <div className="text-6xl">👤</div>
          <button className="absolute top-3 right-3 bg-gradient-to-r from-emerald-500 to-emerald-600 p-2 rounded-full hover:from-emerald-600 hover:to-emerald-700 transition shadow-md">
            <Edit2 size={18} className="text-white" />
          </button>
        </div>

        {/* Profile Info */}
        <div className="p-6 space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{profile.name}</h1>
            <p className="text-slate-500 text-sm">{profile.major}</p>
          </div>

          {/* Interests */}
          <div>
            <p className="text-xs text-slate-600 font-semibold mb-2">ИНТЕРЕСЫ</p>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map(interest => (
                <span
                  key={interest}
                  className="backdrop-blur-md bg-emerald-500/20 text-emerald-700 px-3 py-1 rounded-full text-xs font-medium border border-emerald-300/50"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>

          {/* About Me */}
          <div>
            <p className="text-xs text-slate-600 font-semibold mb-2">ABOUT ME (BIO)</p>
            <p className="text-sm text-slate-700 italic">"{profile.bio}"</p>
          </div>

          {/* Edit Button */}
          <button className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-2 rounded-lg font-medium transition mt-4 shadow-md">
            Редактировать профиль
          </button>
        </div>
      </div>

      {/* AI Suggestion */}
      <div className="col-span-2 backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 p-6 space-y-4 hover:shadow-lg transition-all">
        <div className="flex items-center gap-2">
          <Sparkles className="text-amber-500" size={24} />
          <h2 className="text-xl font-bold text-slate-900">AI Suggestion</h2>
        </div>

        <div className="backdrop-blur-md bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl p-4 min-h-32 space-y-4 border border-amber-300/30">
          <p className="text-slate-700">{profile.aiSuggestion}</p>

          {/* Editable Bio */}
          <div>
            <label className="block text-xs text-slate-600 font-semibold mb-2">ОПТИМИЗИРОВАННОЕ ОПИСАНИЕ</label>
            <textarea
              className="w-full backdrop-blur-md bg-white/50 border border-slate-300/50 rounded-lg p-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-400"
              rows="4"
              value={profile.aiSuggestion}
              onChange={(e) =>
                setProfile({ ...profile, aiSuggestion: e.target.value })
              }
            />
          </div>
        </div>

        <button className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition shadow-md">
          Применить
        </button>
      </div>
    </div>
  );
};

export default ProfileBuilder;
