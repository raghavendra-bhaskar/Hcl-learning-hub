import { useState } from 'react';

const PHASES = [
  {
    num: '1',
    label: 'Learn',
    color: 'bg-cyan-500',
    textColor: 'text-cyan-400',
    borderColor: 'border-cyan-500',
    title: 'UNDERSTAND THE THEORY AND FUNDAMENTALS OF THE AI CONCEPT',
    bullets: [
      'Architecture diagram for visual understanding',
      'Step-by-step breakdown of each component',
      'Concept explanations with real-world context',
    ],
  },
  {
    num: '2',
    label: 'Practice',
    color: 'bg-yellow-400',
    textColor: 'text-yellow-400',
    borderColor: 'border-yellow-400',
    title: 'GAIN HANDS-ON EXPERIENCE THROUGH GUIDED QUIZ QUESTIONS',
    bullets: [
      'Scenario-based multiple-choice questions',
      'Immediate feedback with detailed explanations',
      'Earn XP for every correct answer',
    ],
  },
  {
    num: '3',
    label: 'DIY',
    color: 'bg-emerald-400',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-400',
    title: 'APPLY ACQUIRED KNOWLEDGE TO SOLVE CHALLENGES INDEPENDENTLY',
    bullets: [
      'Challenge-based bonus questions to test mastery',
      'Detailed explanations for each decision',
      'Unlock the quest badge on completion',
    ],
  },
];

export default function SolutionCenterOverview({ onContinue }) {
  const [dontShow, setDontShow] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className="w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl relative"
        style={{
          background: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 100%)',
          border: '1px solid rgba(249,115,22,0.5)',
          boxShadow: '0 0 40px rgba(249,115,22,0.15), inset 0 0 40px rgba(0,0,0,0.3)',
        }}
      >
        {/* Corner decorations (matching Cloud Quest sci-fi frame) */}
        <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-orange-500/60 rounded-tl" />
        <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-orange-500/60 rounded-tr" />
        <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-orange-500/60 rounded-bl" />
        <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-orange-500/60 rounded-br" />

        {/* Title */}
        <div className="text-center pt-10 pb-6">
          <h2 className="text-2xl font-bold" style={{ color: '#f97316', letterSpacing: '0.05em' }}>
            Solution Center Overview
          </h2>
        </div>

        {/* Rainbow gradient bar */}
        <div className="h-1 mx-8 rounded-full mb-8" style={{ background: 'linear-gradient(to right, #06b6d4, #f59e0b, #10b981)' }} />

        {/* Three-column phases */}
        <div className="grid grid-cols-3 gap-4 px-8 pb-8">
          {PHASES.map((phase) => (
            <div
              key={phase.num}
              className="rounded-xl p-5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {/* Phase badge */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-r-full font-black text-lg text-white ${phase.color}`}
                  style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)' }}
                >
                  <span>{phase.num}</span>
                </div>
                <span className={`font-bold text-base ${phase.textColor}`}>{phase.label}</span>
              </div>

              {/* Content */}
              <p className={`text-xs font-bold mb-3 leading-tight ${phase.textColor}`}>
                {phase.title}
              </p>
              <ul className="space-y-2">
                {phase.bullets.map((b, i) => (
                  <li key={i} className="text-xs text-slate-400 leading-relaxed">
                    — {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-8 pb-8">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div
              onClick={() => setDontShow(d => !d)}
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                dontShow ? 'border-orange-500 bg-orange-500' : 'border-slate-400 bg-transparent'
              }`}
            >
              {dontShow && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
            <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">Do not show again</span>
          </label>

          <button
            onClick={() => onContinue(dontShow)}
            className="px-10 py-3 rounded-lg font-bold text-white text-sm tracking-wider transition-all hover:opacity-90 active:scale-95"
            style={{ background: '#f97316', boxShadow: '0 4px 20px rgba(249,115,22,0.4)' }}
          >
            CONTINUE
          </button>
        </div>
      </div>
    </div>
  );
}
