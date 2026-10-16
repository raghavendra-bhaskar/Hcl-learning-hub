import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from './LoginPage.jsx';
import { api } from '../lib/api.js';
import { Check, ChevronLeft, ChevronRight, Save, Upload, X } from 'lucide-react';
import { useAppStore } from '../App.jsx';
import {
  AVATAR_PRESETS, SKIN_TONES, BADGE_COLORS, ACCESSORY_OPTIONS, DEFAULT_AVATAR,
} from '../data/avatars.js';
import AvatarDisplay from '../components/AvatarDisplay.jsx';
import TutorialModal from '../components/TutorialModal.jsx';

const TABS = [
  { id: 'character', label: 'Character', icon: '🧑' },
  { id: 'skin',      label: 'Skin Tone', icon: '🎨' },
  { id: 'accessory', label: 'Accessory', icon: '✨' },
  { id: 'color',     label: 'Color',     icon: '🌈' },
];

export default function AvatarEditor() {
  const navigate = useNavigate();
  const { playerName, setPlayerName, avatar: savedAvatar, setAvatar, tutorialShown, markTutorialShown, theme } = useAppStore();
  const [showTutorial, setShowTutorial] = useState(false);

  const [nameInput, setNameInput] = useState(playerName || getAuth()?.name || '');
  const [avatar, setLocalAvatar] = useState(savedAvatar || DEFAULT_AVATAR);
  const [activeTab, setActiveTab] = useState('character');
  const [previewIndex, setPreviewIndex] = useState(
    AVATAR_PRESETS.findIndex(p => p.id === avatar.presetId) || 0
  );
  const [nameError, setNameError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const currentPreset = AVATAR_PRESETS[previewIndex];
  const currentBadge = BADGE_COLORS.find(b => b.id === avatar.badgeColorId) || BADGE_COLORS[0];
  const isLight = theme === 'light';

  const updateAvatar = (patch) => setLocalAvatar(prev => ({ ...prev, ...patch }));

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setUploadError('Please upload a JPEG or PNG image.');
      e.target.value = '';
      return;
    }
    if (file.size > 800 * 1024) {
      setUploadError('Image is too large. Max 800 KB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateAvatar({ customImage: reader.result });
      setUploadError('');
    };
    reader.onerror = () => setUploadError('Could not read that file.');
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearCustomImage = () => updateAvatar({ customImage: null });

  const handlePrev = () => {
    const idx = (previewIndex - 1 + AVATAR_PRESETS.length) % AVATAR_PRESETS.length;
    setPreviewIndex(idx);
    updateAvatar({ presetId: AVATAR_PRESETS[idx].id });
  };

  const handleNext = () => {
    const idx = (previewIndex + 1) % AVATAR_PRESETS.length;
    setPreviewIndex(idx);
    updateAvatar({ presetId: AVATAR_PRESETS[idx].id });
  };

  const handleSave = async () => {
    const name = nameInput.trim();
    if (name.length < 2) { setNameError('Minimum 2 characters'); return; }
    if (name.length > 20) { setNameError('Maximum 20 characters'); return; }
    setPlayerName(name);
    setAvatar(avatar);
    try { await api.post('/me/avatar-done', { avatar, playerName: name }); } catch {}
    if (!tutorialShown && !savedAvatar) {
      setShowTutorial(true);
    } else {
      navigate('/courses');
    }
  };

  return (
    <>
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: isLight ? 'linear-gradient(160deg, #f0f9ff 0%, #f8fafc 58%, #eef2ff 100%)' : undefined }}>
      {/* Stars background */}
      <div className="fixed inset-0 pointer-events-none">
        {Array.from({ length: 60 }, (_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
              width: `${Math.random() * 2 + 1}px`, height: `${Math.random() * 2 + 1}px`,
              background: isLight ? 'rgba(148,163,184,0.35)' : '#ffffff',
              opacity: isLight ? 0.4 : 0.4,
              animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-medium mb-4 ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}
            style={{ borderColor: isLight ? 'rgba(6,182,212,0.24)' : 'rgba(6,182,212,0.30)', background: isLight ? 'rgba(6,182,212,0.10)' : 'rgba(6,182,212,0.10)' }}>
            ✨ Avatar Creator
          </div>
          <h1 className={`font-orbitron text-4xl font-black bg-clip-text text-transparent mb-2 ${isLight ? 'bg-gradient-to-r from-cyan-700 to-violet-700' : 'bg-gradient-to-r from-cyan-400 to-violet-400'}`}>
            Create Your Commander
          </h1>
          <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Choose your appearance. You can change it anytime later.</p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left panel — editor */}
          <div className="lg:col-span-3 glass-card rounded-3xl border overflow-hidden" style={{ background: isLight ? 'rgba(255,255,255,0.88)' : undefined, borderColor: isLight ? 'rgba(100,116,139,0.16)' : 'rgba(255,255,255,0.05)', boxShadow: isLight ? '0 18px 60px rgba(15,23,42,0.10)' : undefined }}>
            {/* Tab bar */}
            <div className="flex" style={{ borderBottom: isLight ? '1px solid rgba(100,116,139,0.12)' : '1px solid rgba(255,255,255,0.05)' }}>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-semibold uppercase tracking-wider transition-all ${
                    activeTab === tab.id
                      ? (isLight ? 'bg-cyan-500/10 text-cyan-700 border-b-2 border-cyan-600' : 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400')
                      : isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/90' : 'text-slate-500 hover:text-slate-300 hover:bg-white/3'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span className="hidden sm:block">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="p-6 min-h-[340px]">
              {/* ── CHARACTER PRESETS ── */}
              {activeTab === 'character' && (
                <div>
                  <p className={`text-xs uppercase tracking-widest mb-4 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Choose Your Class</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {uploadError && (
                    <p className="text-red-400 text-xs mb-3">{uploadError}</p>
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    {/* Bring-your-own tile — always first */}
                    <div
                      className={`relative rounded-2xl p-4 border transition-all text-center ${
                        avatar.customImage
                          ? `border-cyan-400/60 bg-cyan-500/10 ${currentBadge.glow} shadow-lg`
                          : 'border-dashed border-cyan-500/40 bg-cyan-500/5 hover:border-cyan-400/60 hover:bg-cyan-500/10'
                      }`}
                    >
                      {avatar.customImage ? (
                        <>
                          <button
                            onClick={clearCustomImage}
                            title="Remove custom image"
                            className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center z-10"
                          >
                            <X size={11} />
                          </button>
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center z-10">
                            <Check size={10} className="text-white" />
                          </div>
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            title="Replace image"
                            className="block w-full"
                          >
                            <img
                              src={avatar.customImage}
                              alt="Your class"
                              className="w-14 h-14 object-cover rounded-xl mx-auto mb-2"
                            />
                          </button>
                          <input
                            type="text"
                            value={avatar.customClassName || ''}
                            onChange={e => updateAvatar({ customClassName: e.target.value.slice(0, 24) })}
                            placeholder="Name your class"
                            maxLength={24}
                            className={`w-full bg-transparent border-b focus:border-cyan-400/60 text-xs text-center focus:outline-none py-1 ${isLight ? 'border-slate-300 text-slate-700 placeholder-slate-400' : 'border-white/10 text-slate-200 placeholder-slate-600'}`}
                          />
                          <p className={`text-[10px] mt-1 leading-tight ${isLight ? 'text-slate-500' : 'text-slate-600'}`}>Tap image to replace</p>
                        </>
                      ) : (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full group flex flex-col items-center"
                        >
                          <div className="w-14 h-14 rounded-xl border border-dashed border-slate-500 flex items-center justify-center mx-auto mb-2 text-slate-400 group-hover:border-cyan-400 group-hover:text-cyan-400 transition-colors">
                            <Upload size={22} />
                          </div>
                          <p className={`text-xs font-semibold leading-tight ${isLight ? 'text-cyan-700' : 'text-cyan-300'}`}>Upload Your own Avatar</p>
                          <p className={`text-[10px] mt-1 leading-tight ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Upload PNG or JPEG</p>
                        </button>
                      )}
                    </div>

                    {AVATAR_PRESETS.map((preset, idx) => (
                      <button
                        key={preset.id}
                        onClick={() => { setPreviewIndex(idx); updateAvatar({ presetId: preset.id, customImage: null, customClassName: null }); }}
                        className={`relative group rounded-2xl p-4 border transition-all text-center ${
                          avatar.presetId === preset.id && !avatar.customImage
                            ? `border-cyan-400/60 bg-cyan-500/10 ${currentBadge.glow} shadow-lg`
                            : isLight ? 'border-slate-200 hover:border-slate-300 hover:bg-slate-50' : 'border-white/8 hover:border-white/20 hover:bg-white/3'
                        }`}
                      >
                        {avatar.presetId === preset.id && !avatar.customImage && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center">
                            <Check size={10} className="text-white" />
                          </div>
                        )}
                        <div className="text-3xl mb-2">{preset.emoji}</div>
                        <p className={`text-xs font-semibold leading-tight ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{preset.label}</p>
                        <p className={`text-[10px] mt-1 leading-tight hidden group-hover:block ${isLight ? 'text-slate-500' : 'text-slate-600'}`}>{preset.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SKIN TONE ── */}
              {activeTab === 'skin' && (
                <div>
                  <p className={`text-xs uppercase tracking-widest mb-4 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Skin Tone</p>
                  <div className="grid grid-cols-6 gap-3 mb-6">
                    {SKIN_TONES.map(tone => (
                      <button
                        key={tone.id}
                        onClick={() => updateAvatar({ skinTone: tone.color })}
                        title={tone.label}
                        className={`aspect-square rounded-xl border-2 transition-all hover:scale-110 active:scale-95 ${
                          avatar.skinTone === tone.color
                            ? 'border-white ring-2 ring-cyan-400/60 scale-110'
                            : 'border-white/20'
                        }`}
                        style={{ backgroundColor: tone.color }}
                      />
                    ))}
                  </div>
                  <div className="glass-card rounded-xl p-4 border" style={{ background: isLight ? 'rgba(248,250,252,0.9)' : undefined, borderColor: isLight ? 'rgba(100,116,139,0.12)' : 'rgba(255,255,255,0.05)' }}>
                    <p className={`text-xs mb-2 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Selected</p>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg border" style={{ backgroundColor: avatar.skinTone, borderColor: isLight ? 'rgba(100,116,139,0.18)' : 'rgba(255,255,255,0.20)' }} />
                      <span className={`text-sm font-mono ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{avatar.skinTone}</span>
                      <span className={`text-xs ml-auto ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                        {SKIN_TONES.find(t => t.color === avatar.skinTone)?.label || 'Custom'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── ACCESSORIES ── */}
              {activeTab === 'accessory' && (
                <div>
                  <p className={`text-xs uppercase tracking-widest mb-4 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Accessories</p>
                  <div className="grid grid-cols-4 gap-3">
                    {ACCESSORY_OPTIONS.map(acc => (
                      <button
                        key={acc.id}
                        onClick={() => updateAvatar({ accessoryId: acc.id })}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                          avatar.accessoryId === acc.id
                            ? 'border-cyan-400/60 bg-cyan-500/10'
                            : isLight ? 'border-slate-200 hover:border-slate-300 hover:bg-slate-50' : 'border-white/8 hover:border-white/20 hover:bg-white/3'
                        }`}
                      >
                        {avatar.accessoryId === acc.id && (
                          <div className="absolute w-3 h-3" />
                        )}
                        <span className="text-2xl">{acc.emoji || '∅'}</span>
                        <span className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{acc.label}</span>
                        {avatar.accessoryId === acc.id && (
                          <Check size={12} className="text-cyan-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── COLOR THEME ── */}
              {activeTab === 'color' && (
                <div>
                  <p className={`text-xs uppercase tracking-widest mb-4 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Avatar Color Theme</p>
                  <div className="grid grid-cols-2 gap-3">
                    {BADGE_COLORS.map(bc => (
                      <button
                        key={bc.id}
                        onClick={() => updateAvatar({ badgeColorId: bc.id })}
                        className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                          avatar.badgeColorId === bc.id
                            ? `${bc.border} ${isLight ? 'bg-slate-50' : 'bg-white/5'} shadow-lg ${bc.glow}`
                            : isLight ? 'border-slate-200 hover:border-slate-300 hover:bg-slate-50' : 'border-white/8 hover:border-white/20 hover:bg-white/3'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${bc.gradient} shrink-0 flex items-center justify-center`}>
                          {avatar.badgeColorId === bc.id && <Check size={14} className="text-white" />}
                        </div>
                        <div className="text-left">
                          <p className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{bc.label}</p>
                          <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Color Theme</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right panel — preview */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Preview card */}
            <div className="glass-card rounded-3xl border p-8 flex flex-col items-center gap-6 flex-1" style={{ background: isLight ? 'rgba(255,255,255,0.88)' : undefined, borderColor: isLight ? 'rgba(100,116,139,0.16)' : 'rgba(255,255,255,0.05)', boxShadow: isLight ? '0 18px 60px rgba(15,23,42,0.10)' : undefined }}>
              <p className={`text-xs uppercase tracking-widest w-full text-center ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Preview</p>

              {/* Character preview with navigation arrows */}
              <div className="flex items-center gap-4 w-full justify-center">
                <button
                  onClick={handlePrev}
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/10'}`}
                  style={{ background: isLight ? 'rgba(248,250,252,0.92)' : 'rgba(255,255,255,0.05)', borderColor: isLight ? 'rgba(100,116,139,0.16)' : 'rgba(255,255,255,0.10)' }}
                >
                  <ChevronLeft size={18} className={isLight ? 'text-slate-600' : 'text-slate-400'} />
                </button>

                  {/* Large avatar preview */}
                  <div className="relative flex flex-col items-center gap-3">
                    {/* Glow ring */}
                    <div className={`w-36 h-36 rounded-3xl bg-gradient-to-br ${currentBadge.gradient} p-0.5 shadow-2xl ${currentBadge.glow}`}>
                      <div
                        className="w-full h-full rounded-[22px] flex flex-col items-center justify-center gap-1 relative overflow-hidden"
                        style={{ backgroundColor: avatar.skinTone + '18', backdropFilter: 'blur(8px)' }}
                      >
                        {/* Shimmer overlay */}
                        <div className="absolute inset-0 shimmer opacity-30" />
                        {avatar.customImage ? (
                          <img
                            src={avatar.customImage}
                            alt="Commander"
                            className="absolute inset-0 w-full h-full object-cover z-10"
                          />
                        ) : (
                          <span className="text-6xl select-none leading-none z-10">{currentPreset.emoji}</span>
                        )}
                        {/* Accessory */}
                        {ACCESSORY_OPTIONS.find(a => a.id === avatar.accessoryId)?.emoji && (
                          <span className="absolute top-1 right-1 text-xl z-20">
                            {ACCESSORY_OPTIONS.find(a => a.id === avatar.accessoryId).emoji}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-center">
                      <p className={`font-semibold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {avatar.customImage
                          ? (avatar.customClassName?.trim() || 'Your Class')
                          : currentPreset.label}
                      </p>
                      <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                        {avatar.customImage ? 'Custom uploaded image' : currentPreset.description}
                      </p>
                    </div>

                  {/* Skin tone dot */}
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: avatar.skinTone, borderColor: isLight ? 'rgba(100,116,139,0.18)' : 'rgba(255,255,255,0.20)' }} />
                    <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${currentBadge.gradient}`} />
                  </div>
                </div>

                <button
                  onClick={handleNext}
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/10'}`}
                  style={{ background: isLight ? 'rgba(248,250,252,0.92)' : 'rgba(255,255,255,0.05)', borderColor: isLight ? 'rgba(100,116,139,0.16)' : 'rgba(255,255,255,0.10)' }}
                >
                  <ChevronRight size={18} className={isLight ? 'text-slate-600' : 'text-slate-400'} />
                </button>
              </div>

              {/* Character index dots */}
              <div className="flex gap-1.5">
                {AVATAR_PRESETS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setPreviewIndex(i); updateAvatar({ presetId: AVATAR_PRESETS[i].id }); }}
                    className={`rounded-full transition-all ${
                      i === previewIndex
                        ? `w-5 h-1.5 bg-gradient-to-r ${currentBadge.gradient}`
                        : isLight ? 'w-1.5 h-1.5 bg-slate-300 hover:bg-slate-400' : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Name input + save */}
            <div className="glass-card rounded-2xl border p-5" style={{ background: isLight ? 'rgba(255,255,255,0.88)' : undefined, borderColor: isLight ? 'rgba(100,116,139,0.16)' : 'rgba(255,255,255,0.05)', boxShadow: isLight ? '0 18px 60px rgba(15,23,42,0.10)' : undefined }}>
              <label className={`text-xs uppercase tracking-widest block mb-3 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>
                Commander Name
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={e => { setNameInput(e.target.value); setNameError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="Enter your name..."
                maxLength={20}
                className={`w-full border rounded-xl px-4 py-3 focus:outline-none transition-all text-sm ${isLight ? 'bg-white text-slate-900 placeholder-slate-400' : 'bg-white/5 text-white placeholder-slate-600'} ${
                  nameError ? 'border-red-500/50 focus:border-red-400' : isLight ? 'border-slate-200 focus:border-cyan-500/50' : 'border-white/10 focus:border-cyan-500/50'
                }`}
              />
              {nameError ? (
                <p className="text-red-400 text-xs mt-1.5">{nameError}</p>
              ) : (
                <p className={`text-xs mt-1.5 ${isLight ? 'text-slate-500' : 'text-slate-600'}`}>{nameInput.length}/20 characters</p>
              )}

              {savedAvatar ? (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button
                    onClick={() => navigate(-1)}
                    className={`flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold border transition-all active:scale-95 ${isLight ? 'text-slate-700 border-slate-200 hover:bg-slate-100' : 'text-slate-300 border-white/10 hover:bg-white/5'}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className={`flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition-all active:scale-95 ${
                      nameInput.trim().length >= 2
                        ? `bg-gradient-to-r ${currentBadge.gradient} hover:opacity-90 shadow-lg ${currentBadge.glow}`
                        : isLight ? 'bg-slate-200 text-slate-400 opacity-70 cursor-not-allowed' : 'bg-white/10 opacity-50 cursor-not-allowed'
                    }`}
                    disabled={nameInput.trim().length < 2}
                  >
                    <Save size={16} />
                    Save Changes
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSave}
                  className={`w-full mt-4 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition-all active:scale-95 ${
                    nameInput.trim().length >= 2
                      ? `bg-gradient-to-r ${currentBadge.gradient} hover:opacity-90 shadow-lg ${currentBadge.glow}`
                      : isLight ? 'bg-slate-200 text-slate-400 opacity-70 cursor-not-allowed' : 'bg-white/10 opacity-50 cursor-not-allowed'
                  }`}
                  disabled={nameInput.trim().length < 2}
                >
                  <Save size={16} />
                  Launch Mission!
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

    {showTutorial && (
      <TutorialModal
        onComplete={() => {
          markTutorialShown();
          setShowTutorial(false);
          try { sessionStorage.setItem('hcl-first-launch', '1'); } catch {}
          navigate('/courses');
        }}
      />
    )}
    </>
  );
}
