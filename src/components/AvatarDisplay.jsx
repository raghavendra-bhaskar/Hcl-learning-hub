import { AVATAR_PRESETS, BADGE_COLORS, ACCESSORY_OPTIONS } from '../data/avatars.js';

export default function AvatarDisplay({ avatar, size = 'md', showName = false, name = '', className = '' }) {
  if (!avatar) return null;

  const preset = AVATAR_PRESETS.find(p => p.id === avatar.presetId) || AVATAR_PRESETS[0];
  const badgeColor = BADGE_COLORS.find(b => b.id === avatar.badgeColorId) || BADGE_COLORS[0];
  const accessory = ACCESSORY_OPTIONS.find(a => a.id === avatar.accessoryId) || ACCESSORY_OPTIONS[0];

  const sizes = {
    xs:  { outer: 'w-8 h-8',   emoji: 'text-base',  accessory: 'text-[8px]',  ring: 'ring-1' },
    sm:  { outer: 'w-10 h-10', emoji: 'text-xl',    accessory: 'text-[10px]', ring: 'ring-1' },
    md:  { outer: 'w-14 h-14', emoji: 'text-3xl',   accessory: 'text-xs',     ring: 'ring-2' },
    lg:  { outer: 'w-20 h-20', emoji: 'text-4xl',   accessory: 'text-sm',     ring: 'ring-2' },
    xl:  { outer: 'w-28 h-28', emoji: 'text-5xl',   accessory: 'text-base',   ring: 'ring-2' },
    '2xl': { outer: 'w-40 h-40', emoji: 'text-7xl', accessory: 'text-xl',     ring: 'ring-4' },
  };

  const s = sizes[size] || sizes.md;

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className={`relative ${s.outer} shrink-0`}>
        {/* Outer ring / glow */}
        <div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${badgeColor.gradient} ${s.ring} ring-white/10 shadow-lg ${badgeColor.glow}`}
        />
        {/* Background fill based on skin tone */}
        <div
          className="absolute inset-0.5 rounded-xl flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: avatar.skinTone + '22' }}
        >
          {avatar.customImage ? (
            <img
              src={avatar.customImage}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className={`${s.emoji} select-none leading-none`}>{preset.emoji}</span>
          )}
        </div>
        {/* Accessory overlay */}
        {accessory.emoji && (
          <div className={`absolute -top-1 -right-1 ${s.accessory} leading-none select-none`}>
            {accessory.emoji}
          </div>
        )}
      </div>
      {showName && name && (
        <span className="text-xs font-medium text-slate-300 text-center leading-tight max-w-[80px] truncate">
          {name}
        </span>
      )}
    </div>
  );
}
