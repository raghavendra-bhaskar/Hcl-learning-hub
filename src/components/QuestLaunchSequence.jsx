import { useEffect, useState } from 'react';
import { ArrowRight, Check, SkipForward, Sparkles, Zap } from 'lucide-react';

export default function QuestLaunchSequence({ quest, module = 'ai', cta = 'Enter Quest', onComplete }) {
  const [ready, setReady] = useState(false);
  const isDevOps = module === 'devops';
  const isDb = module === 'db';
  const accent = isDevOps ? 'orange' : 'cyan';

  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => setReady(true), reducedMotion ? 100 : 3600);
    const onKey = (event) => {
      if (event.key === 'Escape') onComplete();
      if (event.key === 'Enter' && ready) onComplete();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [onComplete, ready]);

  return (
    <div className={`quest-launch quest-launch-${accent}`} role="dialog" aria-label={`Launching ${quest.title}`}>
      <div className="quest-launch-grid" />
      <div className="quest-launch-scan" />

      <div className="quest-launch-topbar">
        <div className="quest-launch-brand">
          <span className="quest-launch-brand-mark">HCL</span>
          <span>Software Learning Hub</span>
        </div>
        <button onClick={onComplete} className="quest-launch-skip" aria-label="Skip launch animation">
          Skip
          <SkipForward size={15} />
        </button>
      </div>

      <div className="quest-launch-stage">
        <div className="quest-launch-status">
          <span className="quest-launch-status-dot" />
          {isDevOps ? 'DevOps Loop mission' : isDb ? `${quest.subtitle || 'Course'} mission` : 'AI mission'}
        </div>

        <div className="quest-launch-title-block">
          <p>{quest.subtitle}</p>
          <h1>{quest.title}</h1>
        </div>

        <div className="quest-launch-horizon" aria-hidden="true">
          <div className="quest-launch-skyline quest-launch-skyline-back" />
          <div className="quest-launch-skyline quest-launch-skyline-front" />
          <div className="quest-launch-path" />
          <div className="quest-launch-beacon">
            <span className="quest-launch-beacon-ring" />
            <span className="quest-launch-guide">{isDevOps ? '🛠️' : '🧭'}</span>
          </div>
          <div className="quest-launch-commander">
            <span>🧑‍🚀</span>
            <i className="quest-launch-shadow" />
          </div>
        </div>

        <div className="quest-launch-console">
          <div className="quest-launch-progress-row">
            <span>{ready ? 'Mission ready' : 'Initializing quest systems'}</span>
            <strong>{ready ? '100%' : 'SYNCING'}</strong>
          </div>
          <div className="quest-launch-progress">
            {Array.from({ length: 16 }, (_, index) => (
              <span key={index} style={{ '--segment': index }} />
            ))}
          </div>
        </div>

        <div className={`quest-launch-assignment ${ready ? 'is-ready' : ''}`}>
          <div className="quest-launch-assignment-icon">{quest.icon}</div>
          <div className="quest-launch-assignment-copy">
            <span>Assignment received</span>
            <strong>{quest.description}</strong>
          </div>
          <div className="quest-launch-reward">
            <Zap size={15} />
            {quest.xp != null ? `${quest.xp} XP` : 'Mission'}
          </div>
          <div className="quest-launch-check"><Check size={16} /></div>
        </div>

        <button
          onClick={onComplete}
          disabled={!ready}
          className={`quest-launch-enter ${ready ? 'is-ready' : ''}`}
        >
          {ready ? <Sparkles size={17} /> : null}
          {ready ? cta : 'Preparing Mission'}
          {ready ? <ArrowRight size={17} /> : null}
        </button>
      </div>
    </div>
  );
}
