import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { useAppStore } from '../App.jsx';
import { getQuest, getPath } from '../data/index.js';
import Header from '../components/Header.jsx';
import AITutor from '../components/AITutor.jsx';

export default function Quiz() {
  const { questId } = useParams();
  const navigate = useNavigate();
  useAppStore();

  const quest = getQuest(questId);
  const path = quest ? getPath(quest.pathId) : null;

  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [totalXPEarned, setTotalXPEarned] = useState(0);
  const [xpFlash, setXpFlash] = useState(null);

  useEffect(() => {
    setSelected(null);
    setShowExplanation(false);
  }, [currentQ]);

  if (!quest) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Quest not found.</p>
      </div>
    );
  }

  const question = quest.questions[currentQ];
  const isLastQuestion = currentQ === quest.questions.length - 1;
  const isCorrect = selected !== null && selected === question.correct;

  const handleSelect = (optionIndex) => {
    if (selected !== null) return;
    setSelected(optionIndex);
    setShowExplanation(true);
    const correct = optionIndex === question.correct;
    if (correct) {
      const earned = question.xpReward;
      setTotalXPEarned(prev => prev + earned);
      setXpFlash(`+${earned} XP`);
      setTimeout(() => setXpFlash(null), 1500);
    }
    setAnswers(prev => [...prev, { questionId: question.id, selected: optionIndex, correct }]);
  };

  const handleNext = () => {
    if (isLastQuestion) {
      const finalAnswers = [...answers, { questionId: question.id, selected, correct: isCorrect }];
      navigate(`/results/${questId}`, {
        state: { answers: finalAnswers, totalXPEarned }
      });
    } else {
      setCurrentQ(prev => prev + 1);
    }
  };

  const optionLabels = ['A', 'B', 'C', 'D'];
  const progressPct = ((currentQ) / quest.questions.length) * 100;

  const getOptionStyle = (idx) => {
    if (selected === null) return 'border-white/10 hover:border-cyan-500/40 hover:bg-white/5 cursor-pointer';
    if (idx === question.correct) return 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300';
    if (idx === selected && idx !== question.correct) return 'border-red-500/60 bg-red-500/10 text-red-300';
    return 'border-white/5 opacity-50';
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <AITutor courseSlug="ai-quest" />
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(`/quest/${questId}`)}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors text-sm"
          >
            <ArrowLeft size={14} />
            Exit Quest
          </button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-yellow-400 font-bold text-sm">
              <Zap size={14} />
              <span>{totalXPEarned} XP</span>
            </div>
            <span className="text-slate-500 text-sm">{currentQ + 1}/{quest.questions.length}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-white/10 rounded-full mb-8 overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${path?.gradient || 'from-cyan-400 to-violet-400'} rounded-full transition-all duration-500`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* XP Flash */}
        {xpFlash && (
          <div className="fixed top-24 right-8 z-50 text-yellow-400 font-bold text-xl pointer-events-none xp-flash">
            {xpFlash}
          </div>
        )}

        {/* Quest title */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">{quest.icon}</span>
          <div>
            <p className="text-xs text-slate-500">{quest.subtitle}</p>
            <p className="text-sm font-medium text-slate-300">{quest.title}</p>
          </div>
        </div>

        {/* Scenario box */}
        <div className="glass-card rounded-2xl p-5 mb-4 border border-cyan-500/10 bg-gradient-to-br from-cyan-950/30 to-transparent">
          <p className="text-xs font-semibold text-cyan-400 uppercase tracking-widest mb-2">Scenario</p>
          <p className="text-slate-300 leading-relaxed text-sm">{question.scenario}</p>
        </div>

        {/* Question */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white leading-relaxed mb-5">
            {question.question}
          </h2>

          <div className="space-y-3">
            {question.options.map((option, idx) => (
              <div
                key={idx}
                onClick={() => handleSelect(idx)}
                className={`option-btn flex items-start gap-3 p-4 rounded-xl border transition-all ${getOptionStyle(idx)}`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                  selected !== null && idx === question.correct
                    ? 'bg-emerald-500 text-white'
                    : selected === idx && idx !== question.correct
                    ? 'bg-red-500 text-white'
                    : 'bg-white/10 text-slate-300'
                }`}>
                  {selected !== null && idx === question.correct
                    ? <CheckCircle size={14} />
                    : selected === idx && idx !== question.correct
                    ? <XCircle size={14} />
                    : optionLabels[idx]
                  }
                </div>
                <span className="text-sm leading-relaxed pt-0.5">{option}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Explanation */}
        {showExplanation && (
          <div className={`rounded-2xl p-5 mb-6 border animate-slide-up ${
            isCorrect
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : 'bg-orange-500/10 border-orange-500/20'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {isCorrect
                ? <CheckCircle size={18} className="text-emerald-400" />
                : <XCircle size={18} className="text-orange-400" />
              }
              <span className={`font-semibold text-sm ${isCorrect ? 'text-emerald-300' : 'text-orange-300'}`}>
                {isCorrect ? `Correct! +${question.xpReward} XP` : 'Not quite — here\'s why:'}
              </span>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">{question.explanation}</p>
          </div>
        )}

        {/* Next button */}
        {selected !== null && (
          <button
            onClick={handleNext}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-cyan-500 to-violet-500 rounded-2xl font-bold text-white hover:opacity-90 transition-all active:scale-98 animate-slide-up"
          >
            {isLastQuestion ? 'See Results' : 'Next Question'}
            <ChevronRight size={18} />
          </button>
        )}

        {/* Question dots */}
        <div className="flex justify-center gap-2 mt-6">
          {quest.questions.map((_, i) => {
            const answered = answers.find(a => a.questionId === quest.questions[i].id);
            return (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentQ ? 'w-6 bg-cyan-400'
                  : answered?.correct ? 'w-3 bg-emerald-400'
                  : answered ? 'w-3 bg-red-400'
                  : 'w-3 bg-white/15'
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
