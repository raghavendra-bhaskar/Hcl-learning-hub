import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Zap, Target, Award, Check } from 'lucide-react';
import { NPCS, QUEST_DIALOGS } from '../data/dialogs.js';

function NpcAvatar({ npc, isActive }) {
  return (
    <div className={`flex flex-col items-center gap-2 transition-all duration-300 ${isActive ? 'scale-100 opacity-100' : 'scale-90 opacity-35'}`}>
      <div className={`w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-gradient-to-br ${npc.color} flex items-center justify-center text-5xl shadow-xl relative overflow-hidden`}>
        <div className="absolute inset-0 shimmer opacity-20" />
        {isActive && (
          <div className="absolute inset-0 rounded-2xl ring-2 ring-white/30 ring-offset-0" />
        )}
        <span className="relative z-10">{npc.emoji}</span>
      </div>
      <div
        className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-gradient-to-r ${npc.color} text-white shadow-md transition-all ${isActive ? 'opacity-100' : 'opacity-50'}`}
      >
        {npc.name}
      </div>
      <div className={`text-[10px] transition-all ${isActive ? 'text-slate-400' : 'text-slate-600'}`}>{npc.role}</div>
    </div>
  );
}

export default function QuestBrief({ quest, onClose, onStart }) {
  const [step, setStep] = useState(0);

  const dialogData = QUEST_DIALOGS[quest.id];

  useEffect(() => {
    if (!dialogData) onStart();
  }, []);

  if (!dialogData) return null;

  const npcIds = dialogData.npcs;
  const npc0 = NPCS[npcIds[0]];
  const npc1 = NPCS[npcIds[1]] || npc0;
  const steps = dialogData.steps;
  const total = steps.length;
  const current = steps[step];
  const currentNpc = NPCS[current.npc] || npc0;
  const isFirst = step === 0;
  const isLast = step === total - 1;

  const handleNext = () => { if (!isLast) setStep(s => s + 1); };
  const handlePrev = () => { if (!isFirst) setStep(s => s - 1); };

  // Progressive objective unlock: objective i checks when step >= ceil((i+1) * total / (N+1))
  const objectives = quest.questions;
  const isObjChecked = (i) => step >= Math.ceil((i + 1) * total / (objectives.length + 1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-5xl bg-space-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-scale-in">

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-space-800/50">
          <div className="flex items-center gap-2">
            <span className="text-lg">{quest.icon}</span>
            <span className="text-sm font-semibold text-slate-300 tracking-widest">ASSIGNMENT BRIEF</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row">
          {/* ── LEFT: NPC Dialog Area ── */}
          <div className="flex-1 flex flex-col p-6 min-h-[440px]">

            {/* NPC Characters row */}
            <div className="flex items-end justify-center gap-10 mb-5">
              <NpcAvatar npc={npc0} isActive={current.npc === npc0.id} />
              {npc1.id !== npc0.id && (
                <NpcAvatar npc={npc1} isActive={current.npc === npc1.id} />
              )}
            </div>

            {/* Speech bubble — matching Cloud Quest: name banner + portrait thumbnail + text */}
            <div className="flex-1 flex flex-col justify-center">
              <div
                className="relative rounded-2xl border border-white/10 shadow-xl overflow-hidden"
                style={{ backgroundColor: currentNpc.bubble + 'dd' }}
              >
                {/* Bubble pointer (triangle at top) */}
                <div
                  className="absolute -top-2 left-10 w-4 h-4 rotate-45 border-l border-t border-white/10"
                  style={{ backgroundColor: currentNpc.bubble + 'dd' }}
                />

                {/* Name banner (like Cloud Quest's orange name strip) */}
                <div className={`px-4 py-2 bg-gradient-to-r ${currentNpc.color} flex items-center gap-2`}>
                  <span className="text-sm font-black text-white tracking-widest uppercase">{currentNpc.name}</span>
                </div>

                {/* Content row: portrait thumbnail on left, text on right */}
                <div className="flex items-start gap-4 p-4">
                  {/* NPC portrait thumbnail — the small face portrait inside the bubble */}
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${currentNpc.color} flex items-center justify-center text-2xl shrink-0 shadow-md border-2 border-white/20`}
                  >
                    {currentNpc.emoji}
                  </div>

                  {/* Dialog text */}
                  <p className="text-slate-100 text-sm md:text-base leading-relaxed pt-0.5 flex-1">
                    {current.text}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation — PREVIOUS | dots + counter | NEXT | ACCEPT(last step) */}
            <div className="flex items-center gap-2 mt-5">
              <button
                onClick={handlePrev}
                disabled={isFirst}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-white/10 bg-emerald-700/80 hover:bg-emerald-600 text-white text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-white/10"
              >
                <ChevronLeft size={15} />
                PREVIOUS
              </button>

              {/* Step counter + dots */}
              <div className="flex-1 flex items-center justify-center gap-1">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={`rounded-full transition-all duration-200 ${
                      i === step
                        ? `w-5 h-2 bg-white`
                        : i < step
                        ? 'w-2 h-2 bg-emerald-400/70'
                        : 'w-2 h-2 bg-white/20 hover:bg-white/40'
                    }`}
                  />
                ))}
                <span className="text-sm font-bold text-white ml-2 tabular-nums">
                  <span className="text-white">{step + 1}</span>
                  <span className="text-slate-400">/{total}</span>
                </span>
              </div>

              {/* NEXT button — always visible, disabled on last step */}
              <button
                onClick={handleNext}
                disabled={isLast}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-white/10"
              >
                NEXT
                <ChevronRight size={15} />
              </button>

              {/* ACCEPT button — only on last step (orange, matching Cloud Quest) */}
              {isLast && (
                <button
                  onClick={onStart}
                  className="flex items-center gap-1 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold shadow-lg shadow-orange-500/30 transition-all animate-scale-in"
                >
                  ACCEPT
                  <Check size={15} />
                </button>
              )}
            </div>
          </div>

          {/* ── RIGHT: Assignment Panel ── */}
          <div className="w-full md:w-72 bg-white flex flex-col text-slate-800">
            {/* Assignment header — teal, matching Cloud Quest */}
            <div className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 flex items-center justify-center">
              <p className="text-white font-black text-sm tracking-widest uppercase">Assignment</p>
            </div>

            <div className="p-5 flex-1 space-y-4 overflow-y-auto">
              {/* Title + orange underline */}
              <div>
                <h3 className="font-black text-slate-800 text-sm leading-snug mb-0.5 uppercase tracking-wide"
                  style={{ borderBottom: '2px solid #f97316', paddingBottom: '4px', display: 'inline-block' }}>
                  {quest.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-2">{quest.description}</p>
              </div>

              {/* Learning Objectives with progressive checkmarks */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Target size={12} className="text-slate-600" />
                  <p className="text-xs font-black text-slate-700 uppercase tracking-widest">Learning Objectives</p>
                </div>
                <ul className="space-y-2">
                  {objectives.map((q, i) => {
                    const checked = isObjChecked(i);
                    return (
                      <li key={i} className={`flex items-start gap-2 text-xs leading-relaxed transition-all duration-500 ${checked ? 'text-slate-700' : 'text-slate-500'}`}>
                        <span className={`shrink-0 mt-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all duration-500 ${
                          checked ? 'bg-teal-500' : 'border border-slate-300 bg-transparent'
                        }`}>
                          {checked && <Check size={9} className="text-white" strokeWidth={3} />}
                        </span>
                        <span>{q.question.length > 65 ? q.question.slice(0, 65) + '…' : q.question}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="h-px bg-slate-200" />

              {/* Assignment Rewards */}
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <Award size={12} className="text-slate-600" />
                  <p className="text-xs font-black text-slate-700 uppercase tracking-widest">Assignment Rewards</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${quest.badge.color} flex items-center justify-center text-lg shadow-sm`}>
                      {quest.badge.icon}
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Badge</p>
                      <p className="text-xs font-bold text-slate-700">{quest.badge.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-9 h-9 rounded-xl bg-yellow-50 border border-yellow-200 flex items-center justify-center">
                      <Zap size={15} className="text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">XP</p>
                      <p className="text-xs font-bold text-yellow-600">×{quest.xp}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-200" />

              {/* Meta */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Difficulty</span>
                  <span className={`font-semibold ${quest.difficultyColor}`}>{quest.difficulty}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Duration</span>
                  <span className="text-slate-600 font-medium">{quest.timeEstimate}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Questions</span>
                  <span className="text-slate-600 font-medium">{quest.questions.length}</span>
                </div>
              </div>
            </div>

            {/* Skip */}
            <div className="p-3 border-t border-slate-200">
              <button
                onClick={onStart}
                className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors py-1.5 rounded-lg hover:bg-slate-50"
              >
                Skip Brief → Go to Quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
