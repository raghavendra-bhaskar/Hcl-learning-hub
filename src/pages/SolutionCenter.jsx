import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getQuest } from '../data/index.js';
import { SOLUTION_CENTER, VIDEO_LINKS, QUEST_MORE_VIDEOS } from '../data/solutionCenter.js';
import SolutionCenterOverview from '../components/SolutionCenterOverview.jsx';

// ── Architecture Diagram SVG Component ──────────────────────────────────────
const COL_X = [0, 78, 192, 312, 430, 548, 665];  // indexed by col (1-6)
const ROW_Y = [0, 72, 186, 296];                   // indexed by row (1-3)
const NW = 96, NH = 56;

function nc(node) {
  return { x: COL_X[node.col], y: ROW_Y[node.row] };
}

function edgePoints(fn, tn) {
  const fc = nc(fn), tc = nc(tn);
  const dx = tc.x - fc.x, dy = tc.y - fc.y;
  let sx, sy, tx, ty;

  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) { sx = fc.x + NW / 2; sy = fc.y; tx = tc.x - NW / 2; ty = tc.y; }
    else          { sx = fc.x - NW / 2; sy = fc.y; tx = tc.x + NW / 2; ty = tc.y; }
  } else {
    if (dy >= 0) { sx = fc.x; sy = fc.y + NH / 2; tx = tc.x; ty = tc.y - NH / 2; }
    else          { sx = fc.x; sy = fc.y - NH / 2; tx = tc.x; ty = tc.y + NH / 2; }
  }
  return { sx, sy, tx, ty };
}

function ArchDiagram({ nodes, edges, highlight, onNodeClick, nodeStepMap }) {
  const nodeById = {};
  nodes.forEach(n => { nodeById[n.id] = n; });

  return (
    <svg viewBox="0 0 740 370" className="w-full h-full" style={{ maxHeight: '100%' }}>
      <defs>
        <marker id="arr" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
          <polygon points="0,0 9,3.5 0,7" fill="#0891b2" />
        </marker>
        <marker id="arr-d" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
          <polygon points="0,0 9,3.5 0,7" fill="#334155" />
        </marker>
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow-text" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Grid background dots */}
      {Array.from({ length: 12 }, (_, r) =>
        Array.from({ length: 20 }, (_, c) => (
          <circle key={`${r}-${c}`} cx={c * 37 + 10} cy={r * 32 + 10} r="1" fill="rgba(6,182,212,0.06)" />
        ))
      )}

      {/* Edges */}
      {edges.map((e, i) => {
        const fn = nodeById[e.from], tn = nodeById[e.to];
        if (!fn || !tn) return null;
        const { sx, sy, tx, ty } = edgePoints(fn, tn);
        const mx = (sx + tx) / 2, my = (sy + ty) / 2;
        const isDash = !!e.dashed;
        const eColor = isDash ? '#1e3a4a' : '#0e7490';
        const aId = isDash ? 'arr-d' : 'arr';

        return (
          <g key={i}>
            <line
              x1={sx} y1={sy} x2={tx} y2={ty}
              stroke={eColor} strokeWidth={isDash ? 1.5 : 2}
              strokeDasharray={isDash ? '5,4' : undefined}
              markerEnd={`url(#${aId})`}
            />
            {e.label && (
              <text x={mx} y={my - 8} fill="#334155" fontSize="8" textAnchor="middle"
                fontFamily="'Courier New', monospace">
                {e.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Nodes */}
      {nodes.map(n => {
        const { x, y } = nc(n);
        const isH = highlight.includes(n.id);
        const hasStep = nodeStepMap && (n.id in nodeStepMap);
        const x0 = x - NW / 2, y0 = y - NH / 2;

        return (
          <g
            key={n.id}
            onClick={() => hasStep && onNodeClick && onNodeClick(n.id)}
            style={{ cursor: hasStep ? 'pointer' : 'default' }}
          >
            {/* Hover ring for clickable nodes */}
            {hasStep && !isH && (
              <rect
                x={x0 - 3} y={y0 - 3} width={NW + 6} height={NH + 6} rx={9}
                fill="none" stroke="rgba(6,182,212,0.18)" strokeWidth="1"
                strokeDasharray="3,3"
              />
            )}
            {isH && (
              <rect
                x={x0 - 5} y={y0 - 5} width={NW + 10} height={NH + 10} rx={10}
                fill="none" stroke="rgba(6,182,212,0.7)" strokeWidth="2"
                filter="url(#glow)"
              />
            )}
            <rect
              x={x0} y={y0} width={NW} height={NH} rx={7}
              fill={isH ? '#061b2b' : '#050c15'}
              stroke={isH ? '#0891b2' : '#1e3a4a'}
              strokeWidth={isH ? 1.5 : 1}
            />
            <text x={x} y={y0 + 20} textAnchor="middle" fontSize="18" dominantBaseline="middle">
              {n.icon}
            </text>
            <text
              x={x} y={y0 + NH - 11}
              textAnchor="middle"
              fill={isH ? '#22d3ee' : '#475569'}
              fontSize="7.5"
              fontFamily="'Courier New', monospace"
              fontWeight={isH ? 'bold' : 'normal'}
              dominantBaseline="middle"
              filter={isH ? 'url(#glow-text)' : undefined}
            >
              {n.label.length > 14 ? n.label.slice(0, 13) + '…' : n.label}
            </text>
          </g>
        );
      })}

      {/* Step number badge floating in center of diagram — shown on active highlight nodes */}
      {nodes.filter(n => highlight.includes(n.id)).map((n, i) => {
        const { x, y } = nc(n);
        return (
          <g key={`badge-${n.id}`} transform={`translate(${x + NW / 2 - 10}, ${y + NH / 2 - 10})`}>
            <circle cx="0" cy="0" r="11"
              fill="#0891b2" stroke="#050c15" strokeWidth="2"
              filter="url(#glow)" />
          </g>
        );
      })}
    </svg>
  );
}

// ── Tab arrow shape (chevron tabs matching Cloud Quest) ──────────────────────
function Tab({ num, label, active, first, last }) {
  const bg = active ? 'rgba(6,182,212,0.12)' : '#070f17';
  const border = active ? 'rgba(6,182,212,0.6)' : 'rgba(30,58,74,0.8)';
  const textColor = active ? '#22d3ee' : '#475569';
  const pl = first ? '14px' : '22px';
  const pr = last  ? '14px' : '22px';
  const clip = first
    ? 'polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)'
    : last
    ? 'polygon(14px 0, 100% 0, 100% 100%, 14px 100%, 0 50%)'
    : 'polygon(14px 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 14px 100%, 0 50%)';

  return (
    <div
      className="flex items-center gap-1.5 py-2 text-xs font-bold transition-all"
      style={{ background: bg, border: `1px solid ${border}`, color: textColor, paddingLeft: pl, paddingRight: pr, clipPath: clip, marginLeft: first ? 0 : '-10px' }}
    >
      <span style={{ color: active ? '#0891b2' : '#334155' }}>{num}</span>
      {label}
    </div>
  );
}

// ── Main SolutionCenter Page ─────────────────────────────────────────────────
export default function SolutionCenter() {
  const { questId } = useParams();
  const navigate = useNavigate();
  const quest = getQuest(questId);
  const data = SOLUTION_CENTER[questId];

  const seenKey = 'ai-quest-sc-seen';
  const [showOverview, setShowOverview] = useState(() => !localStorage.getItem(seenKey));
  const [step, setStep] = useState(0);
  const [videoInfo, setVideoInfo] = useState(null); // { label, url, embedUrl }

  const openVideo = (label) => {
    const url = VIDEO_LINKS[label];
    if (!url) return;
    const watchMatch = url.match(/youtube\.com\/watch\?v=([^&]+)/);
    const embedUrl = watchMatch ? `https://www.youtube.com/embed/${watchMatch[1]}?autoplay=1` : null;
    setVideoInfo({ label, url, embedUrl });
  };

  const openMoreVideos = () => {
    const url = QUEST_MORE_VIDEOS[questId];
    if (!url) return;
    setVideoInfo({ label: 'More Videos — ' + quest.title, url, embedUrl: null });
  };

  if (!quest || !data) {
    navigate(`/quiz/${questId}`);
    return null;
  }

  const steps = data.steps;
  const total = steps.length;
  const current = steps[step];
  const isFirst = step === 0;
  const isLast = step === total - 1;

  // Build nodeId → stepIndex map so diagram nodes are clickable
  const nodeStepMap = {};
  steps.forEach((s, i) => {
    (s.highlight || []).forEach(nodeId => {
      if (!(nodeId in nodeStepMap)) nodeStepMap[nodeId] = i;
    });
  });

  const handleNodeClick = (nodeId) => {
    const targetStep = nodeStepMap[nodeId];
    if (targetStep !== undefined) {
      setStep(targetStep);
      setVideoInfo(null);
    }
  };

  const handleStart = () => navigate(`/quiz/${questId}`);

  return (
    <>
      {showOverview && (
        <SolutionCenterOverview
          onContinue={(dontShow) => {
            if (dontShow) localStorage.setItem(seenKey, '1');
            setShowOverview(false);
          }}
        />
      )}

      <div
        className="fixed inset-0 flex flex-col select-none"
        style={{ background: 'linear-gradient(160deg, #020b14 0%, #030d1c 100%)' }}
      >
        {/* Sci-fi cyan border frame */}
        <div className="absolute inset-2 pointer-events-none rounded-xl" style={{ border: '1.5px solid rgba(6,182,212,0.35)', boxShadow: 'inset 0 0 40px rgba(6,182,212,0.03)' }} />
        {/* Corner accents */}
        {['top-4 left-4', 'top-4 right-4', 'bottom-4 left-4', 'bottom-4 right-4'].map((pos, i) => (
          <div key={i} className={`absolute ${pos} w-5 h-5 pointer-events-none`}
            style={{
              borderTop: i < 2 ? '2px solid rgba(6,182,212,0.6)' : 'none',
              borderBottom: i >= 2 ? '2px solid rgba(6,182,212,0.6)' : 'none',
              borderLeft: i % 2 === 0 ? '2px solid rgba(6,182,212,0.6)' : 'none',
              borderRight: i % 2 === 1 ? '2px solid rgba(6,182,212,0.6)' : 'none',
            }}
          />
        ))}

        {/* ── TOP BAR ── */}
        <div className="flex items-center gap-4 px-7 pt-5 pb-2">
          <button
            onClick={() => navigate('/paths')}
            className="flex items-center gap-1.5 text-xs font-bold transition-all hover:opacity-80 flex-shrink-0"
            style={{ color: '#22d3ee', fontFamily: "'Courier New', monospace" }}
          >
            <ArrowLeft size={14} />
            BACK
          </button>
          <div className="w-px h-4 flex-shrink-0" style={{ background: 'rgba(6,182,212,0.3)' }} />
          <h1
            className="font-bold text-lg tracking-wide flex-1 truncate"
            style={{ color: '#22d3ee', fontFamily: "'Courier New', monospace", textShadow: '0 0 12px rgba(34,211,238,0.4)' }}
          >
            {quest.title}
          </h1>
          {/* Step progress dots */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className="rounded-full transition-all duration-200"
                style={{
                  width: i === step ? '20px' : '6px',
                  height: '6px',
                  background: i < step ? '#0891b2' : i === step ? '#22d3ee' : 'rgba(255,255,255,0.15)',
                }}
              />
            ))}
            <span className="text-xs ml-1 flex-shrink-0" style={{ color: 'rgba(6,182,212,0.6)', fontFamily: "'Courier New', monospace" }}>
              {step + 1}/{total}
            </span>
          </div>
        </div>

        {/* ── CONTENT AREA ── */}
        <div className="flex flex-1 overflow-hidden px-5 pb-3 gap-5 min-h-0">

          {/* LEFT PANEL */}
          <div className="w-64 flex-shrink-0 flex flex-col gap-4 py-1 overflow-y-auto">

            {/* Solution Request box */}
            <div
              className="rounded-xl p-4 flex-shrink-0"
              style={{ background: '#040c14', border: '1px solid #1a3344' }}
            >
              <p
                className="text-xs font-bold mb-2 tracking-widest"
                style={{ color: '#22d3ee', fontFamily: "'Courier New', monospace" }}
              >
                Solution Request
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                {data.solutionRequest.slice(0, 180)}{data.solutionRequest.length > 180 ? '…' : ''}
              </p>
            </div>

            {/* Step counter: ◄ N /Total ► */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => { if (!isFirst) setStep(s => s - 1); }}
                disabled={isFirst}
                className="w-9 h-9 rounded flex items-center justify-center text-sm font-bold transition-all disabled:opacity-20"
                style={{
                  border: '2px solid rgba(6,182,212,0.6)',
                  color: '#22d3ee',
                  background: 'rgba(6,182,212,0.05)',
                  clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%)',
                }}
              >
                ◄
              </button>

              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-black text-xl text-white flex-shrink-0"
                style={{
                  background: 'radial-gradient(circle, #0891b2, #0369a1)',
                  border: '3px solid rgba(34,211,238,0.5)',
                  boxShadow: '0 0 16px rgba(8,145,178,0.5)',
                }}
              >
                {step + 1}
              </div>
              <span className="text-slate-400 text-sm font-bold" style={{ fontFamily: "'Courier New', monospace" }}>
                /{total}
              </span>

              <button
                onClick={() => { if (!isLast) setStep(s => s + 1); }}
                disabled={isLast}
                className="w-9 h-9 rounded flex items-center justify-center text-sm font-bold transition-all disabled:opacity-20"
                style={{
                  border: '2px solid rgba(6,182,212,0.6)',
                  color: '#22d3ee',
                  background: 'rgba(6,182,212,0.05)',
                  clipPath: 'polygon(8px 0, 100% 0, 100% 100%, 8px 100%, 0 50%)',
                }}
              >
                ►
              </button>
            </div>

            {/* Step description text */}
            <p className="text-sm text-slate-300 leading-relaxed flex-shrink-0">
              {current.text}
            </p>

            {/* Video/resource link */}
            {current.link && (
              <button
                onClick={() => openVideo(current.link)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold transition-all hover:bg-cyan-500/10 active:scale-95 flex-shrink-0"
                style={{
                  border: '1px solid rgba(6,182,212,0.4)',
                  background: '#040c14',
                  color: '#22d3ee',
                  fontFamily: "'Courier New', monospace",
                  cursor: 'pointer',
                }}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]"
                  style={{ border: '1px solid rgba(6,182,212,0.6)', background: 'rgba(6,182,212,0.1)' }}
                >
                  ▶
                </div>
                {current.link}
                <span className="ml-auto text-[9px] opacity-50">↗</span>
              </button>
            )}
          </div>

          {/* CENTER: Architecture Diagram OR Video Panel */}
          <div
            className="flex-1 rounded-xl overflow-hidden flex items-center justify-center min-w-0 relative"
            style={{ background: '#030a12', border: '1px solid #1a3344' }}
          >
            {videoInfo ? (
              /* ── In-frame Video Panel ── */
              <div className="w-full h-full flex flex-col" style={{ background: '#030e18' }}>
                {/* Video panel header */}
                <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
                  style={{ borderBottom: '1px solid rgba(6,182,212,0.2)', background: 'rgba(6,182,212,0.05)' }}>
                  <span className="text-xs font-bold tracking-widest"
                    style={{ color: '#22d3ee', fontFamily: "'Courier New', monospace" }}>
                    ▶ {videoInfo.label}
                  </span>
                  <button
                    onClick={() => setVideoInfo(null)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-black transition-all hover:scale-110 active:scale-95"
                    style={{ background: 'rgba(6,182,212,0.8)', border: '1px solid rgba(6,182,212,0.6)' }}
                  >
                    ✕
                  </button>
                </div>

                {/* Video content */}
                {videoInfo.embedUrl ? (
                  /* Embeddable YouTube video */
                  <iframe
                    key={videoInfo.embedUrl}
                    src={videoInfo.embedUrl}
                    className="flex-1 w-full"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    title={videoInfo.label}
                    style={{ border: 'none' }}
                  />
                ) : (
                  /* YouTube search — cannot be embedded; show styled card */
                  <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
                    <div className="text-6xl">🎬</div>
                    <div>
                      <p className="text-white font-bold text-lg mb-2">{videoInfo.label}</p>
                      <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                        YouTube search results can't be embedded directly.
                        Click below to open the curated search results in a new tab.
                      </p>
                    </div>
                    <button
                      onClick={() => window.open(videoInfo.url, '_blank', 'noopener,noreferrer')}
                      className="flex items-center gap-3 px-8 py-3 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 active:scale-95"
                      style={{
                        background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                        boxShadow: '0 0 20px rgba(220,38,38,0.4)',
                      }}
                    >
                      <span className="text-xl">▶</span>
                      Open on YouTube
                    </button>
                    <button
                      onClick={() => setVideoInfo(null)}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      ← Back to diagram
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* ── Architecture Diagram ── */
              <div className="w-full h-full p-4">
                <ArchDiagram
                  nodes={data.nodes}
                  edges={data.edges}
                  highlight={current.highlight}
                  onNodeClick={handleNodeClick}
                  nodeStepMap={nodeStepMap}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── BOTTOM BAR ── */}
        <div
          className="flex items-center gap-4 px-5 py-2.5"
          style={{ borderTop: '1px solid rgba(6,182,212,0.15)', background: 'rgba(3,6,12,0.8)' }}
        >
          {/* More Videos */}
          <button
            onClick={openMoreVideos}
            className="flex items-center gap-2 px-4 py-2 rounded text-xs font-bold flex-shrink-0 transition-all hover:bg-cyan-500/10 active:scale-95"
            style={{
              border: '1px solid rgba(6,182,212,0.35)',
              background: '#040c14',
              color: '#22d3ee',
              fontFamily: "'Courier New', monospace",
              cursor: 'pointer',
            }}
          >
            <span className="text-[10px]">▶</span>
            More Videos
          </button>

          {/* Learn > Practice > DIY tab bar */}
          <div className="flex items-center flex-1 justify-center">
            {/* Bookmark icon */}
            <div
              className="w-8 h-8 rounded flex items-center justify-center text-sm mr-3 flex-shrink-0"
              style={{ border: '1px solid rgba(6,182,212,0.25)', color: '#22d3ee' }}
            >
              📌
            </div>
            <div className="flex items-center">
              <Tab num="1" label="Learn"    active={true}  first={true}  last={false} />
              <Tab num="2" label="Practice" active={false} first={false} last={false} />
              <Tab num="3" label="DIY"      active={false} first={false} last={true}  />
            </div>
          </div>

          {/* Start Quiz section */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {isLast && (
              <span className="text-xs text-emerald-400 animate-pulse" style={{ fontFamily: "'Courier New', monospace" }}>
                ✓ Learning complete!
              </span>
            )}
            {!isLast && (
              <span className="text-xs text-slate-600" style={{ fontFamily: "'Courier New', monospace" }}>
                Read all {total} steps to prepare
              </span>
            )}
            <button
              onClick={handleStart}
              className="px-6 py-2 rounded text-sm font-bold text-white transition-all active:scale-95"
              style={{
                background: isLast
                  ? 'linear-gradient(135deg, #f97316, #ea580c)'
                  : 'linear-gradient(135deg, #0891b2, #0369a1)',
                border: `1px solid ${isLast ? 'rgba(249,115,22,0.4)' : 'rgba(34,211,238,0.3)'}`,
                boxShadow: isLast ? '0 0 16px rgba(249,115,22,0.4)' : '0 0 12px rgba(8,145,178,0.3)',
                fontFamily: "'Courier New', monospace",
              }}
            >
              {isLast ? '► Start Quiz' : 'Skip to Quiz'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
