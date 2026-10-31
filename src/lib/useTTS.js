import { useState, useEffect, useRef, useCallback } from 'react';

const SUPPORTED = typeof window !== 'undefined' && 'speechSynthesis' in window;

/**
 * useTTS — browser SpeechSynthesis hook.
 * Provides speak / toggle / cancel helpers and tracks the currently spoken word index.
 */
export function useTTS() {
  const [speaking, setSpeaking]   = useState(false);
  const [paused, setPaused]       = useState(false);
  const [wordIdx, setWordIdx]     = useState(-1);
  const [words, setWords]         = useState([]);
  const [rate, setRate]           = useState(1);
  const uttRef = useRef(null);

  const cancel = useCallback(() => {
    if (!SUPPORTED) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
    setWordIdx(-1);
  }, []);

  const speak = useCallback((text) => {
    if (!SUPPORTED || !text) return;
    window.speechSynthesis.cancel();

    const wordList = text.trim().split(/\s+/).filter(Boolean);
    setWords(wordList);
    setWordIdx(0);

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate  = rate;
    uttRef.current = utter;

    utter.onstart = () => { setSpeaking(true); setPaused(false); };
    utter.onend   = () => { setSpeaking(false); setPaused(false); setWordIdx(-1); };
    utter.onerror = (e) => { if (e.error !== 'interrupted') { setSpeaking(false); setPaused(false); } };
    utter.onboundary = (e) => {
      if (e.name !== 'word') return;
      const before = text.slice(0, e.charIndex);
      const idx    = before.trim().split(/\s+/).filter(Boolean).length;
      setWordIdx(idx);
    };

    window.speechSynthesis.speak(utter);
    setSpeaking(true);
  }, [rate]);

  const toggle = useCallback(() => {
    if (!SUPPORTED) return;
    if (paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    } else if (speaking) {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  }, [speaking, paused]);

  // Re-speak at new rate when rate changes mid-utterance
  const changeRate = useCallback((newRate) => {
    setRate(newRate);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { if (SUPPORTED) window.speechSynthesis.cancel(); }, []);

  return { speak, cancel, toggle, speaking, paused, words, wordIdx, rate, changeRate, supported: SUPPORTED };
}
