import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Zap } from 'lucide-react';
import { useAppStore } from '../App.jsx';
import { getDevOpsQuest } from '../data/devopsIndex.js';
import AITutor from '../components/AITutor.jsx';

export default function DevOpsQuiz() {
  const { questId } = useParams();
  const navigate = useNavigate();
  const { completeDevOpsQuest } = useAppStore();
  const quest = getDevOpsQuest(questId);

  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState([]);

  if (!quest) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Quest not found.</p>
          <button onClick={() => navigate('/devops-loop/paths')} className="text-orange-400 hover:underline text-sm">← Back to Paths</button>
        </div>
      </div>
    );
  }

  const question = quest.questions[current];
  const isLast = current === quest.questions.length - 1;
  const progress = ((current + (revealed ? 1 : 0)) / quest.questions.length) * 100;

  const handleSelect = (idx) => {
    if (revealed) return;
    setSelected(idx);
  };

  const handleReveal = () => {
    if (selected === null) return;
    setRevealed(true);
  };

  const handleNext = () => {
    const newAnswers = [...answers, { questionId: question.id, selected, correct: question.correct }];
    setAnswers(newAnswers);

    if (isLast) {
      const score = newAnswers.filter(a => a.selected === a.correct).length;
      const xpEarned = Math.round(quest.xp * (score / quest.questions.length));
      completeDevOpsQuest(questId, score, xpEarned, quest.badge);
      navigate(`/devops-loop/results/${questId}`, {
        state: { answers: newAnswers, quest, score, xpEarned },
      });
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setRevealed(false);
    }
  };

  const isCorrect = revealed && selected === question.correct;
  const isWrong = revealed && selected !== question.correct;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header
        className="sticky top-0 z-40 backdrop-blur-md border-b border-white/5"
        style={{ background: 'rgba(3,10,20,0.88)' }}
      >
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(`/devops-loop/quest/${questId}`)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            Exit
          </button>
          <div className="flex-1 mx-4">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #f97316, #ef4444)' }}
              />
            </div>
          </div>
          <span className="text-xs text-slate-400 shrink-0">{current + 1}/{quest.questions.length}</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-10">
        <AITutor courseSlug="devops-loop" />
        {/* Quest info */}
        <div className="flex items-center gap-3 mb-8">
          <span className="text-2xl">{quest.icon}</span>
          <div>
            <p className="text-orange-400 text-xs font-bold">{quest.subtitle}</p>
            <p className="text-white text-sm font-semibold">{quest.title}</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-yellow-400 text-xs font-bold">
            <Zap size={13} />
            {quest.xp} XP
          </div>
        </div>

        {/* Scenario */}
        <div
          className="rounded-2xl p-5 mb-6"
          style={{ background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.2)' }}
        >
          <p className="text-slate-300 text-sm leading-relaxed">{question.scenario}</p>
        </div>

        {/* Question */}
        <h2 className="text-white font-bold text-lg mb-5">{question.question}</h2>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {question.options.map((opt, idx) => {
            let borderColor = 'rgba(255,255,255,0.08)';
            let bg = 'rgba(255,255,255,0.02)';
            let textColor = '#94a3b8';

            if (selected === idx && !revealed) {
              borderColor = 'rgba(249,115,22,0.5)';
              bg = 'rgba(249,115,22,0.1)';
              textColor = '#fed7aa';
            }
            if (revealed && idx === question.correct) {
              borderColor = 'rgba(16,185,129,0.5)';
              bg = 'rgba(16,185,129,0.1)';
              textColor = '#6ee7b7';
            }
            if (revealed && selected === idx && idx !== question.correct) {
              borderColor = 'rgba(239,68,68,0.5)';
              bg = 'rgba(239,68,68,0.1)';
              textColor = '#fca5a5';
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={revealed}
                className="w-full text-left px-5 py-4 rounded-xl text-sm font-medium transition-all"
                style={{ background: bg, border: `1px solid ${borderColor}`, color: textColor, cursor: revealed ? 'default' : 'pointer' }}
              >
                <span className="font-bold mr-3" style={{ color: textColor === '#94a3b8' ? '#475569' : textColor }}>
                  {String.fromCharCode(65 + idx)}.
                </span>
                {opt}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {revealed && (
          <div
            className="rounded-2xl p-5 mb-6"
            style={{
              background: isCorrect ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${isCorrect ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}
          >
            <p className="font-bold text-sm mb-2" style={{ color: isCorrect ? '#6ee7b7' : '#fca5a5' }}>
              {isCorrect ? '✅ Correct!' : '❌ Incorrect'}
            </p>
            <p className="text-slate-400 text-xs leading-relaxed">{question.explanation}</p>
          </div>
        )}

        {/* Action button */}
        {!revealed ? (
          <button
            onClick={handleReveal}
            disabled={selected === null}
            className="w-full py-4 rounded-2xl font-bold text-white text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}
          >
            Check Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white text-sm transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)', boxShadow: '0 0 24px rgba(249,115,22,0.3)' }}
          >
            {isLast ? '🏆 Finish Quest' : 'Next Question'}
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
