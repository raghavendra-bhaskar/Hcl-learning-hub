import { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Home, User } from 'lucide-react';
import { useAppStore } from '../App.jsx';

const ITEMS = [
  { id: 'back',    Icon: ChevronLeft, label: 'Back',    act: (nav) => nav(-1),         paths: null },
  { id: 'home',    Icon: Home,        label: 'Home',    act: (nav) => nav('/courses'), paths: ['/courses', '/'] },
  { id: 'profile', Icon: User,        label: 'Profile', act: (nav) => nav('/avatar'),  paths: ['/avatar'] },
];

export default function GlassNavbar() {
  const navigate      = useNavigate();
  const { pathname }  = useLocation();
  const store         = useAppStore();
  const isLight       = store?.theme === 'light';
  const containerRef  = useRef(null);
  const btnRefs       = useRef([]);
  const [pill, setPill] = useState({ left: 6, width: 80, visible: false });

  const activeIdx = ITEMS.findIndex(
    (item) => item.paths?.some((p) => p === pathname || pathname.startsWith(p + '/'))
  );

  useEffect(() => {
    const update = () => {
      const btn       = btnRefs.current[activeIdx];
      const container = containerRef.current;
      if (!btn || !container || activeIdx < 0) {
        setPill((prev) => ({ ...prev, visible: false }));
        return;
      }
      const cRect = container.getBoundingClientRect();
      const bRect = btn.getBoundingClientRect();
      setPill({ left: bRect.left - cRect.left, width: bRect.width, visible: true });
    };
    update();
  }, [activeIdx, pathname]);

  const d = isLight ? {
    bg:          'rgba(241,245,249,0.78)',
    border:      '1px solid rgba(0,0,0,0.09)',
    shadow:      '0 8px 32px rgba(15,23,42,0.14), inset 0 1px 0 rgba(255,255,255,0.65)',
    pill:        'rgba(255,255,255,0.75)',
    pillBorder:  '1px solid rgba(0,0,0,0.08)',
    pillShadow:  'inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 10px rgba(0,0,0,0.1)',
    active:      'rgba(15,23,42,0.88)',
    inactive:    'rgba(15,23,42,0.32)',
  } : {
    bg:          'rgba(8,15,35,0.62)',
    border:      '1px solid rgba(255,255,255,0.1)',
    shadow:      '0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.07)',
    pill:        'rgba(255,255,255,0.15)',
    pillBorder:  '1px solid rgba(255,255,255,0.22)',
    pillShadow:  'inset 0 1px 0 rgba(255,255,255,0.22), 0 2px 12px rgba(0,0,0,0.25)',
    active:      'rgba(255,255,255,0.95)',
    inactive:    'rgba(255,255,255,0.36)',
  };

  return (
    <nav
      ref={containerRef}
      aria-label="Main navigation"
      style={{
        position: 'fixed',
        bottom: 28,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        padding: '6px',
        borderRadius: 60,
        background: d.bg,
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        border: d.border,
        boxShadow: d.shadow,
      }}
    >
      {/* Liquid glass sliding indicator */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 6,
          left: pill.left,
          width: pill.width,
          height: 'calc(100% - 12px)',
          borderRadius: 50,
          background: d.pill,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: d.pillBorder,
          boxShadow: d.pillShadow,
          transition: 'left 0.42s cubic-bezier(0.4,0,0.2,1), width 0.42s cubic-bezier(0.4,0,0.2,1), opacity 0.28s ease',
          opacity: pill.visible ? 1 : 0,
          pointerEvents: 'none',
        }}
      />

      {ITEMS.map((item, i) => {
        const isActive = i === activeIdx;
        const { Icon } = item;
        return (
          <button
            key={item.id}
            ref={(el) => { btnRefs.current[i] = el; }}
            onClick={() => item.act(navigate)}
            title={item.label}
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 18px',
              borderRadius: 50,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: isActive ? d.active : d.inactive,
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              letterSpacing: isActive ? '0.01em' : 0,
              transition: 'color 0.3s ease, font-weight 0.2s ease',
              whiteSpace: 'nowrap',
              lineHeight: 1,
            }}
          >
            <Icon size={16} strokeWidth={isActive ? 2.4 : 1.8} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
