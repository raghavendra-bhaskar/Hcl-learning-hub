import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Trophy, ChevronRight, Zap, RotateCcw, Map } from 'lucide-react';
import { getDevOpsQuest } from '../data/devopsIndex.js';
import { CertificationPanel, LabLaunchCard } from '../components/ExternalHandoff.jsx';
import { getCertification, getQuestLab } from '../data/externalLinks.js';

export default function DevOpsResults() {
  const { questId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { answers, score, xpEarned } = location.state || {};
  const quest = getDevOpsQuest(questId);

  if (!quest || score === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">No results found.</p>
          <button onClick={() => navigate('/devops-loop/paths')} className="text-orange-400 hover:underline text-sm">← Back to Paths</button>
        </div>
      </div>
    );
  }

  const total = quest.questions.length;
  const pct = Math.round((score / total) * 100);
  const isPassed = pct >= 70;

  const grade = pct === 100 ? { label: 'Perfect!', color: '#fbbf24', emoji: '🏆' }
    : pct >= 80 ? { label: 'Excellent', color: '#10b981', emoji: '🌟' }
    : pct >= 70 ? { label: 'Passed', color: '#06b6d4', emoji: '✅' }
    : { label: 'Try Again', color: '#ef4444', emoji: '💪' };

  return (
    <div className="min-h-screen pb-24">
      <header
        className="sticky top-0 z-40 backdrop-blur-md border-b border-white/5"
        style={{ background: 'rgba(3,10,20,0.88)' }}
      >
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center">
          <span className="text-xs text-orange-400 font-semibold">Quest Results</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-10">
        {/* Score card */}
        <div
          className="rounded-3xl p-10 text-center mb-8"
          style={{
            background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(239,68,68,0.05))',
            border: `1px solid ${grade.color}30`,
            boxShadow: `0 0 40px ${grade.color}10`,
          }}
        >
          <div className="text-6xl mb-4">{grade.emoji}</div>
          <h1 className="font-orbitron text-4xl font-black mb-2" style={{ color: grade.color }}>
            {grade.label}
          </h1>
          <p className="text-white text-xl font-bold mb-1">{score}/{total} correct</p>
          <p className="text-slate-400 text-sm mb-6">{quest.title}</p>

          <div className="flex justify-center gap-8">
            <div>
              <div className="font-orbitron text-2xl font-black text-yellow-400">{pct}%</div>
              <div className="text-xs text-slate-500 mt-0.5">Score</div>
            </div>
            <div>
              <div className="font-orbitron text-2xl font-black text-orange-400 flex items-center gap-1 justify-center">
                <Zap size={18} />
                {xpEarned}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">XP Earned</div>
            </div>
          </div>

          {/* Badge */}
          {isPassed && (
            <div
              className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-full text-xs font-bold"
              style={{
                background: `linear-gradient(135deg, ${grade.color}20, ${grade.color}10)`,
                border: `1px solid ${grade.color}40`,
                color: grade.color,
              }}
            >
              {quest.badge.icon} {quest.badge.name} — Badge Earned!
            </div>
          )}
        </div>

        {/* Question breakdown */}
        <div className="mb-8">
          <h2 className="font-orbitron text-sm font-bold text-white mb-4">Question Breakdown</h2>
          <div className="space-y-3">
            {quest.questions.map((q, i) => {
              const ans = answers?.[i];
              const correct = ans?.selected === q.correct;
              return (
                <div
                  key={q.id}
                  className="p-4 rounded-xl"
                  style={{
                    background: correct ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                    border: `1px solid ${correct ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0 mt-0.5">{correct ? '✅' : '❌'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium mb-1">{q.question}</p>
                      {!correct && (
                        <p className="text-emerald-400 text-xs">
                          ✓ Correct: {q.options[q.correct]}
                        </p>
                      )}
                      <p className="text-slate-500 text-[11px] leading-relaxed mt-1">{q.explanation}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Next steps — hands-on lab + formal certification in CNAPP */}
        {(getQuestLab(questId) || getCertification('devops-loop')) && (
          <div className="mb-6 space-y-3">
            <p className="text-[10px] font-black tracking-widest uppercase text-slate-500">Next Steps</p>
            {getQuestLab(questId) && <LabLaunchCard lab={getQuestLab(questId)} accent="orange" />}
            {isPassed && <CertificationPanel certification={getCertification('devops-loop')} moduleAccent="orange" />}
          </div>
        )}

        {/* Actions */}
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            onClick={() => navigate(`/devops-loop/quiz/${questId}`)}
            className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-slate-300 transition-all hover:bg-white/5"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <RotateCcw size={15} />
            Retake Quest
          </button>
          <button
            onClick={() => navigate('/devops-loop/paths')}
            className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}
          >
            <Map size={15} />
            All Paths
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
