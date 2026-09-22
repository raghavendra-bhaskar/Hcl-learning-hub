import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { TUTORIAL_SLIDES } from '../data/dialogs.js';

export default function TutorialModal({ onComplete }) {
  const [slide, setSlide] = useState(0);
  const current = TUTORIAL_SLIDES[slide];
  const isLast = slide === TUTORIAL_SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl animate-scale-in">
        {/* Title bar */}
        <div className="flex justify-center mb-4">
          <div className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full text-white font-bold text-sm tracking-widest shadow-lg shadow-cyan-500/30">
            TUTORIAL
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-0">
            {/* Image panel */}
            <div className="sm:w-48 bg-gradient-to-br from-cyan-100 to-teal-50 flex items-center justify-center p-8 shrink-0">
              <div className="text-7xl animate-float select-none">{current.image}</div>
            </div>

            {/* Content */}
            <div className="flex-1 p-7">
              <h2
                className="font-bold text-lg mb-1 tracking-wide"
                style={{ color: '#1a7aad', borderBottom: '2px solid #f97316', paddingBottom: '4px', display: 'inline-block' }}
              >
                {current.title.toUpperCase()}
              </h2>
              <p className="text-slate-600 mt-4 text-sm leading-relaxed">{current.content}</p>

              {current.hint && (
                <div className="mt-4 p-3 bg-cyan-50 rounded-xl border border-cyan-200">
                  <p className="text-xs text-cyan-700">
                    <span className="font-bold">💡 HINT: </span>{current.hint}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-between px-7 py-4 border-t border-slate-100 bg-slate-50">
            {/* Dots */}
            <div className="flex gap-2">
              {TUTORIAL_SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  className={`rounded-full transition-all ${
                    i === slide ? 'w-5 h-2.5 bg-cyan-500' : 'w-2.5 h-2.5 bg-slate-300 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>

            {/* Continue button */}
            <button
              onClick={() => isLast ? onComplete() : setSlide(s => s + 1)}
              className="flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold text-sm rounded-xl shadow-lg hover:opacity-90 transition-all active:scale-95"
            >
              {isLast ? 'START EXPLORING' : 'CONTINUE'}
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-3 opacity-60">
          {slide + 1} of {TUTORIAL_SLIDES.length}
        </p>
      </div>
    </div>
  );
}
