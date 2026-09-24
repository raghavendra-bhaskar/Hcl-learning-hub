import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getDevOpsQuest } from '../data/devopsIndex.js';
import {
  DEVOPS_SOLUTION_CENTER,
  DEVOPS_VIDEO_LINKS,
  DEVOPS_QUEST_MORE_VIDEOS,
} from '../data/devopsSolutionCenter.js';
import SolutionCenterOverview from '../components/SolutionCenterOverview.jsx';
import { getEmbedUrl, resolvePlayableUrl } from '../lib/learningResourceEmbeds.js';

function getYouTubeSearchEmbedUrl(url) {
  try {
    const parsed = new URL(url);
    const query = parsed.searchParams.get('search_query');
    return query ? `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}&autoplay=1` : null;
  } catch {
    return null;
  }
}

// ── Shared grid constants (same as AI Quest SolutionCenter) ──────────────────
const COL_X = [0, 35, 165, 300, 435, 565, 695];
const ROW_Y = [0, 75, 190, 305];
const NW = 112, NH = 64;

function nc(node) {
  return { x: COL_X[node.col], y: ROW_Y[node.row] };
}

function edgePoints(fn, tn) {
  const fc = nc(fn), tc = nc(tn);
  const dx = tc.x - fc.x, dy = tc.y - fc.y;
  let sx, sy, tx, ty;
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) { sx = fc.x + NW / 2; sy = fc.y; tx = tc.x - NW / 2; ty = tc.y; }
    else         { sx = fc.x - NW / 2; sy = fc.y; tx = tc.x + NW / 2; ty = tc.y; }
  } else {
    if (dy >= 0) { sx = fc.x; sy = fc.y + NH / 2; tx = tc.x; ty = tc.y - NH / 2; }
    else         { sx = fc.x; sy = fc.y - NH / 2; tx = tc.x; ty = tc.y + NH / 2; }
  }
  return { sx, sy, tx, ty };
}

// ── DevOps Loop orange-themed Architecture Diagram ───────────────────────────
function DevOpsArchDiagram({ nodes, edges, highlight, onNodeClick, nodeStepMap }) {
  const nodeById = {};
  nodes.forEach(n => { nodeById[n.id] = n; });

  // Group by (from, label). Show label on the LONGEST edge (best empty real estate);
  // other edges in the group render as subtle bundle backdrops.
  const edgeLen = (e) => {
    const a = nodeById[e.from], b = nodeById[e.to];
    if (!a || !b) return 0;
    const p = nc(a), q = nc(b);
    return Math.hypot(q.x - p.x, q.y - p.y);
  };
  const shownLabelIdx = new Map();
  const labelCounts = {};
  edges.forEach((e, i) => {
    if (!e.label) return;
    const k = `${e.from}::${e.label}`;
    labelCounts[k] = (labelCounts[k] || 0) + 1;
    const prev = shownLabelIdx.get(k);
    if (prev === undefined || edgeLen(e) > edgeLen(edges[prev])) {
      shownLabelIdx.set(k, i);
    }
  });
  const isBundleEdge = (e, i) => {
    if (!e.label) return false;
    const k = `${e.from}::${e.label}`;
    return labelCounts[k] > 1 && shownLabelIdx.get(k) !== i;
  };

  return (
    <svg viewBox="-35 15 790 350" className="w-full h-auto max-h-full"
      preserveAspectRatio="xMidYMid meet">
      <defs>
        <marker id="darr" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
          <polygon points="0,0 9,3.5 0,7" fill="#c2410c" />
        </marker>
        <marker id="darr-d" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
          <polygon points="0,0 9,3.5 0,7" fill="#a8a29e" />
        </marker>
        <marker id="darr-b" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0,0 8,3 0,6" fill="rgba(194,65,12,0.55)" />
        </marker>
        <filter id="dglow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="dglow-text" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Grid background dots (orange tint) */}
      {Array.from({ length: 12 }, (_, r) =>
        Array.from({ length: 23 }, (_, c) => (
          <circle key={`${r}-${c}`} cx={c * 37 - 30} cy={r * 32 + 18} r="1" fill="rgba(249,115,22,0.05)" />
        ))
      )}

      {/* Bundle lines first — subtle backdrop for de-duplicated groups */}
      {edges.map((e, i) => {
        if (!isBundleEdge(e, i)) return null;
        const fn = nodeById[e.from], tn = nodeById[e.to];
        if (!fn || !tn) return null;
        const { sx, sy, tx, ty } = edgePoints(fn, tn);
        return (
          <line key={`b-${i}`} x1={sx} y1={sy} x2={tx} y2={ty}
            stroke="rgba(194,65,12,0.55)" strokeWidth={1.4}
            markerEnd="url(#darr-b)"
          />
        );
      })}

      {/* Labeled + dashed edges — LINES ONLY (chips rendered after nodes) */}
      {edges.map((e, i) => {
        if (isBundleEdge(e, i)) return null;
        const fn = nodeById[e.from], tn = nodeById[e.to];
        if (!fn || !tn) return null;
        const { sx, sy, tx, ty } = edgePoints(fn, tn);
        const isDash = !!e.dashed;
        const eColor = isDash ? '#a8a29e' : '#c2410c';
        const aId = isDash ? 'darr-d' : 'darr';
        return (
          <line key={i} x1={sx} y1={sy} x2={tx} y2={ty}
            stroke={eColor} strokeWidth={isDash ? 1.5 : 2}
            strokeDasharray={isDash ? '5,4' : undefined}
            markerEnd={`url(#${aId})`}
            opacity={isDash ? 0.8 : 1}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map(n => {
        const { x, y } = nc(n);
        const isH = highlight.includes(n.id);
        const hasStep = nodeStepMap && (n.id in nodeStepMap);
        const x0 = x - NW / 2, y0 = y - NH / 2;
        return (
          <g key={n.id} onClick={() => hasStep && onNodeClick && onNodeClick(n.id)}
            style={{ cursor: hasStep ? 'pointer' : 'default' }}>
            {hasStep && !isH && (
              <rect x={x0 - 3} y={y0 - 3} width={NW + 6} height={NH + 6} rx={9}
                fill="none" stroke="rgba(249,115,22,0.18)" strokeWidth="1" strokeDasharray="3,3" />
            )}
            {isH && (
              <rect x={x0 - 5} y={y0 - 5} width={NW + 10} height={NH + 10} rx={10}
                fill="none" stroke="rgba(249,115,22,0.7)" strokeWidth="2" filter="url(#dglow)" />
            )}
            <rect x={x0} y={y0} width={NW} height={NH} rx={7}
              fill={isH ? '#1c0f05' : '#100a05'}
              stroke={isH ? '#c2410c' : '#3f2a1a'} strokeWidth={isH ? 1.5 : 1}
            />
            <text x={x} y={y0 + 20} textAnchor="middle" fontSize="18" dominantBaseline="middle">
              {n.icon}
            </text>
            <text x={x} y={y0 + NH - 11} textAnchor="middle"
              fill={isH ? '#fb923c' : '#d6d3d1'} fontSize="8.2"
              fontFamily="'Courier New', monospace" fontWeight={isH ? 'bold' : '600'}
              dominantBaseline="middle" filter={isH ? 'url(#dglow-text)' : undefined}>
              {n.label}
            </text>
          </g>
        );
      })}

      {/* Step badges — top-right corner so they don't cover node labels */}
      {nodes.filter(n => highlight.includes(n.id)).map(n => {
        const { x, y } = nc(n);
        return (
          <g key={`badge-${n.id}`} transform={`translate(${x + NW / 2 - 8}, ${y - NH / 2 + 8})`}>
            <circle cx="0" cy="0" r="7" fill="#c2410c" stroke="#100a05" strokeWidth="2" filter="url(#dglow)" />
          </g>
        );
      })}

      {/* Edge label chips — rendered LAST so they float above nodes and lines */}
      {edges.map((e, i) => {
        const showLabel = !!e.label && shownLabelIdx.get(`${e.from}::${e.label}`) === i;
        if (!showLabel) return null;
        const fn = nodeById[e.from], tn = nodeById[e.to];
        if (!fn || !tn) return null;
        const { sx, sy, tx, ty } = edgePoints(fn, tn);
        const isDash = !!e.dashed;
        const t = typeof e.labelT === 'number' ? e.labelT : 0.5;
        const px0 = sx + (tx - sx) * t;
        const py0 = sy + (ty - sy) * t;
        const len = Math.hypot(tx - sx, ty - sy) || 1;
        // Unit perpendicular biased so chip sits above (or left of) the line.
        let ux = -(ty - sy) / len, uy = (tx - sx) / len;
        if (uy > 0) { ux = -ux; uy = -uy; }
        const OFF = 20;
        const labelX = px0 + ux * OFF;
        const labelY = py0 + uy * OFF;
        const labelW = e.label.length * 5.4 + 14;
        return (
          <g key={`chip-${i}`}>
            <rect x={labelX - labelW / 2} y={labelY - 8} width={labelW} height={15} rx={4}
              fill="#0f0803"
              stroke={isDash ? 'rgba(214,211,209,0.7)' : 'rgba(251,146,60,0.85)'} strokeWidth="1" />
            <text x={labelX} y={labelY + 2.6} textAnchor="middle"
              fill={isDash ? '#f5f5f4' : '#fed7aa'} fontSize="9.5"
              fontFamily="'Courier New', monospace" fontWeight="700" letterSpacing="0.4">
              {e.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Chevron tab (same shape as AI Quest, orange-themed) ──────────────────────
function Tab({ num, label, active, first, last }) {
  const bg    = active ? 'rgba(249,115,22,0.12)' : '#0d0704';
  const border = active ? 'rgba(249,115,22,0.6)' : 'rgba(41,37,36,0.8)';
  const textColor = active ? '#fb923c' : '#44403c';
  const pl = first ? '14px' : '22px';
  const pr = last  ? '14px' : '22px';
  const clip = first
    ? 'polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)'
    : last
    ? 'polygon(14px 0, 100% 0, 100% 100%, 14px 100%, 0 50%)'
    : 'polygon(14px 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 14px 100%, 0 50%)';

  return (
    <div className="flex items-center gap-1.5 py-2 text-xs font-bold transition-all"
      style={{ background: bg, border: `1px solid ${border}`, color: textColor, paddingLeft: pl, paddingRight: pr, clipPath: clip, marginLeft: first ? 0 : '-10px' }}>
      <span style={{ color: active ? '#c2410c' : '#292524' }}>{num}</span>
      {label}
    </div>
  );
}

// ── Overview modal (orange-themed wrapper around shared SolutionCenterOverview) ─
const SEEN_KEY = 'devops-loop-sc-seen';

// ── Main DevOpsSolutionCenter Page ───────────────────────────────────────────
export default function DevOpsSolutionCenter() {
  const { questId } = useParams();
  const navigate    = useNavigate();
  const quest = getDevOpsQuest(questId);
  const data  = DEVOPS_SOLUTION_CENTER[questId];

  const [showOverview, setShowOverview] = useState(() => !localStorage.getItem(SEEN_KEY));
  const [step,      setStep]      = useState(0);
  const [videoInfo, setVideoInfo] = useState(null);

  useEffect(() => {
    if (!quest || !data) navigate(`/devops-loop/quiz/${questId}`);
  }, [data, navigate, quest, questId]);

  const openVideo = (label) => {
    const url = DEVOPS_VIDEO_LINKS[label];
    if (!url) return;
    const resource = { type: 'youtube', label, url };
    setVideoInfo({ label, url: resolvePlayableUrl(resource), embedUrl: getEmbedUrl(resource, { autoplay: true }) });
  };

  const openMoreVideos = () => {
    const url = DEVOPS_QUEST_MORE_VIDEOS[questId];
    if (!url) return;
    const label = 'More Videos — ' + (quest?.title || questId);
    const resource = { type: 'playlist', label, url };
    setVideoInfo({ label, url: resolvePlayableUrl(resource), embedUrl: getEmbedUrl(resource, { autoplay: true }) });
  };

  if (!quest || !data) {
    return null;
  }

  const steps = data.steps;
  const total = steps.length;
  const current = steps[step];
  const isFirst = step === 0;
  const isLast  = step === total - 1;

  const nodeStepMap = {};
  steps.forEach((s, i) => {
    (s.highlight || []).forEach(nodeId => {
      if (!(nodeId in nodeStepMap)) nodeStepMap[nodeId] = i;
    });
  });

  const handleNodeClick = (nodeId) => {
    const t = nodeStepMap[nodeId];
    if (t !== undefined) { setStep(t); setVideoInfo(null); }
  };

  const handleStartQuiz = () => navigate(`/devops-loop/quiz/${questId}`);

  // ── Orange sci-fi frame colors ──────────────────────────────────────────
  const ACCENT = 'rgba(249,115,22,0.35)';

  return (
    <>
      {showOverview && (
        <SolutionCenterOverview
          onContinue={(dontShow) => {
            if (dontShow) localStorage.setItem(SEEN_KEY, '1');
            setShowOverview(false);
          }}
        />
      )}

      <div className="fixed inset-0 flex flex-col select-none"
        style={{ background: 'linear-gradient(160deg, #0a0300 0%, #0d0502 100%)' }}>

        {/* Sci-fi orange border frame */}
        <div className="absolute inset-2 pointer-events-none rounded-xl"
          style={{ border: `1.5px solid ${ACCENT}`, boxShadow: 'inset 0 0 40px rgba(249,115,22,0.03)' }} />

        {/* Corner accents */}
        {['top-4 left-4', 'top-4 right-4', 'bottom-4 left-4', 'bottom-4 right-4'].map((pos, i) => (
          <div key={i} className={`absolute ${pos} w-5 h-5 pointer-events-none`}
            style={{
              borderTop:    i < 2  ? '2px solid rgba(249,115,22,0.6)' : 'none',
              borderBottom: i >= 2 ? '2px solid rgba(249,115,22,0.6)' : 'none',
              borderLeft:   i % 2 === 0 ? '2px solid rgba(249,115,22,0.6)' : 'none',
              borderRight:  i % 2 === 1 ? '2px solid rgba(249,115,22,0.6)' : 'none',
            }} />
        ))}

        {/* ── TOP BAR ── */}
        <div className="flex items-center gap-4 px-7 pt-5 pb-2">
          <button onClick={() => navigate('/devops-loop/paths')}
            className="flex items-center gap-1.5 text-xs font-bold transition-all hover:opacity-80 flex-shrink-0"
            style={{ color: '#fb923c', fontFamily: "'Courier New', monospace" }}>
            <ArrowLeft size={14} /> BACK
          </button>
          <div className="w-px h-4 flex-shrink-0" style={{ background: 'rgba(249,115,22,0.3)' }} />
          <h1 className="font-bold text-lg tracking-wide flex-1 truncate"
            style={{ color: '#fb923c', fontFamily: "'Courier New', monospace", textShadow: '0 0 12px rgba(249,115,22,0.4)' }}>
            {quest.title}
          </h1>
          {/* Step dots */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {steps.map((_, i) => (
              <button key={i} onClick={() => setStep(i)} className="rounded-full transition-all duration-200"
                style={{
                  width: i === step ? '20px' : '6px', height: '6px',
                  background: i < step ? '#c2410c' : i === step ? '#fb923c' : 'rgba(255,255,255,0.15)',
                }} />
            ))}
            <span className="text-xs ml-1 flex-shrink-0"
              style={{ color: 'rgba(249,115,22,0.6)', fontFamily: "'Courier New', monospace" }}>
              {step + 1}/{total}
            </span>
          </div>
        </div>

        {/* ── CONTENT AREA ── */}
        <div className="flex flex-1 overflow-hidden px-5 pb-3 gap-5 min-h-0">

          {/* LEFT PANEL */}
          <div className="w-64 flex-shrink-0 flex flex-col gap-4 py-1 overflow-y-auto">

            {/* Solution Request box */}
            <div className="rounded-xl p-4 flex-shrink-0"
              style={{ background: '#0a0300', border: '1px solid #292118' }}>
              <p className="text-xs font-bold mb-2 tracking-widest"
                style={{ color: '#fb923c', fontFamily: "'Courier New', monospace" }}>
                Scenario
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                {data.solutionRequest.slice(0, 200)}{data.solutionRequest.length > 200 ? '…' : ''}
              </p>
            </div>

            {/* Step counter ◄ N/Total ► */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => { if (!isFirst) setStep(s => s - 1); }} disabled={isFirst}
                className="w-9 h-9 rounded flex items-center justify-center text-sm font-bold transition-all disabled:opacity-20"
                style={{ border: '2px solid rgba(249,115,22,0.6)', color: '#fb923c', background: 'rgba(249,115,22,0.05)', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%)' }}>
                ◄
              </button>

              <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-xl text-white flex-shrink-0"
                style={{ background: 'radial-gradient(circle, #c2410c, #9a3412)', border: '3px solid rgba(251,146,60,0.5)', boxShadow: '0 0 16px rgba(194,65,12,0.5)' }}>
                {step + 1}
              </div>

              <span className="text-slate-400 text-sm font-bold" style={{ fontFamily: "'Courier New', monospace" }}>
                /{total}
              </span>

              <button onClick={() => { if (!isLast) setStep(s => s + 1); }} disabled={isLast}
                className="w-9 h-9 rounded flex items-center justify-center text-sm font-bold transition-all disabled:opacity-20"
                style={{ border: '2px solid rgba(249,115,22,0.6)', color: '#fb923c', background: 'rgba(249,115,22,0.05)', clipPath: 'polygon(8px 0, 100% 0, 100% 100%, 8px 100%, 0 50%)' }}>
                ►
              </button>
            </div>

            {/* Step text */}
            <p className="text-sm text-slate-300 leading-relaxed flex-shrink-0">{current.text}</p>

            {/* Video link button */}
            {current.link && (
              <button onClick={() => openVideo(current.link)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold transition-all hover:bg-orange-500/10 active:scale-95 flex-shrink-0"
                style={{ border: '1px solid rgba(249,115,22,0.4)', background: '#0a0300', color: '#fb923c', fontFamily: "'Courier New', monospace", cursor: 'pointer' }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]"
                  style={{ border: '1px solid rgba(249,115,22,0.6)', background: 'rgba(249,115,22,0.1)' }}>
                  ▶
                </div>
                {current.link}
                <span className="ml-auto text-[9px] opacity-50">↗</span>
              </button>
            )}

            {/* "Refer for more details" IBM docs link */}
            <a href="https://www.ibm.com/docs/en/devops-loop" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] transition-all hover:bg-orange-500/5 flex-shrink-0"
              style={{ border: '1px solid rgba(249,115,22,0.2)', color: '#78716c', fontFamily: "'Courier New', monospace" }}>
              <span className="opacity-60">📖</span>
              Refer for more details ↗
            </a>
          </div>

          {/* CENTER: Architecture Diagram OR Video Panel */}
          <div className="flex-1 rounded-xl overflow-hidden flex items-center justify-center min-w-0 relative"
            style={{ background: '#06020a', border: '1px solid #1c1208' }}>

            {videoInfo ? (
              <div className="w-full h-full flex flex-col" style={{ background: '#0a0400' }}>
                {/* Video header */}
                <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
                  style={{ borderBottom: '1px solid rgba(249,115,22,0.2)', background: 'rgba(249,115,22,0.05)' }}>
                  <span className="text-xs font-bold tracking-widest"
                    style={{ color: '#fb923c', fontFamily: "'Courier New', monospace" }}>
                    ▶ {videoInfo.label}
                  </span>
                  <button onClick={() => setVideoInfo(null)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-black transition-all hover:scale-110 active:scale-95"
                    style={{ background: 'rgba(249,115,22,0.8)', border: '1px solid rgba(249,115,22,0.6)' }}>
                    ✕
                  </button>
                </div>

                {/* Video content */}
                {videoInfo.embedUrl ? (
                  <iframe key={videoInfo.embedUrl} src={videoInfo.embedUrl} className="flex-1 w-full"
                    allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen
                    title={videoInfo.label} style={{ border: 'none' }} />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
                    <div className="text-6xl">🎬</div>
                    <div>
                      <p className="text-white font-bold text-lg mb-2">{videoInfo.label}</p>
                      <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                        YouTube search results can't be embedded directly.
                        Click below to open the curated results in a new tab.
                      </p>
                    </div>
                    <button onClick={() => window.open(videoInfo.url, '_blank', 'noopener,noreferrer')}
                      className="flex items-center gap-3 px-8 py-3 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 active:scale-95"
                      style={{ background: 'linear-gradient(135deg, #c2410c, #9a3412)', boxShadow: '0 0 20px rgba(194,65,12,0.4)' }}>
                      <span className="text-xl">▶</span>
                      Open on YouTube
                    </button>
                    <button onClick={() => setVideoInfo(null)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                      ← Back to diagram
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full min-h-[360px] p-2">
                <DevOpsArchDiagram
                  nodes={data.nodes}
                  edges={data.edges}
                  highlight={current.highlight || []}
                  onNodeClick={handleNodeClick}
                  nodeStepMap={nodeStepMap}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── BOTTOM BAR ── */}
        <div className="flex items-center gap-4 px-5 py-2.5"
          style={{ borderTop: '1px solid rgba(249,115,22,0.15)', background: 'rgba(5,2,0,0.8)' }}>

          {/* More Videos */}
          <button onClick={openMoreVideos}
            className="flex items-center gap-2 px-4 py-2 rounded text-xs font-bold flex-shrink-0 transition-all hover:bg-orange-500/10 active:scale-95"
            style={{ border: '1px solid rgba(249,115,22,0.35)', background: '#0a0300', color: '#fb923c', fontFamily: "'Courier New', monospace", cursor: 'pointer' }}>
            <span className="text-[10px]">▶</span>
            More Videos
          </button>

          {/* Learn / Practice / DIY tabs */}
          <div className="flex items-center flex-1 justify-center">
            <div className="w-8 h-8 rounded flex items-center justify-center text-sm mr-3 flex-shrink-0"
              style={{ border: '1px solid rgba(249,115,22,0.25)', color: '#fb923c' }}>
              📌
            </div>
            <div className="flex items-center">
              <Tab num="1" label="Learn"    active={true}  first={true}  last={false} />
              <Tab num="2" label="Practice" active={false} first={false} last={false} />
              <Tab num="3" label="DIY"      active={false} first={false} last={true}  />
            </div>
          </div>

          {/* Start Quiz */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {isLast
              ? <span className="text-xs text-emerald-400 animate-pulse" style={{ fontFamily: "'Courier New', monospace" }}>✓ Learning complete!</span>
              : <span className="text-xs text-stone-600" style={{ fontFamily: "'Courier New', monospace" }}>Read all {total} steps to prepare</span>
            }
            <button onClick={handleStartQuiz}
              className="px-6 py-2 rounded text-sm font-bold text-white transition-all active:scale-95"
              style={{
                background: isLast ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'linear-gradient(135deg, #c2410c, #9a3412)',
                border: `1px solid ${isLast ? 'rgba(249,115,22,0.4)' : 'rgba(194,65,12,0.3)'}`,
                boxShadow: isLast ? '0 0 16px rgba(249,115,22,0.4)' : '0 0 12px rgba(194,65,12,0.3)',
                fontFamily: "'Courier New', monospace",
              }}>
              {isLast ? '► Start Quiz' : 'Skip to Quiz'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
