import React from 'react';

export const CornerFiligree: React.FC<{ className?: string }> = ({ className = '' }) => (
  <>
    <svg className={`pointer-events-none absolute top-1 left-1 w-3.5 h-3.5 text-[#d4a853]/75 ${className}`} viewBox="0 0 16 16" fill="none">
      <path d="M1 12V3C1 1.9 1.9 1 3 1H12M1 6H5V1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
    <svg className={`pointer-events-none absolute top-1 right-1 w-3.5 h-3.5 text-[#d4a853]/75 ${className}`} viewBox="0 0 16 16" fill="none">
      <path d="M15 12V3C15 1.9 14.1 1 13 1H4M15 6H11V1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
    <svg className={`pointer-events-none absolute bottom-1 left-1 w-3.5 h-3.5 text-[#d4a853]/75 ${className}`} viewBox="0 0 16 16" fill="none">
      <path d="M1 4V13C1 14.1 1.9 15 3 15H12M1 10H5V15" stroke="currentColor" strokeWidth="1.4" />
    </svg>
    <svg className={`pointer-events-none absolute bottom-1 right-1 w-3.5 h-3.5 text-[#d4a853]/75 ${className}`} viewBox="0 0 16 16" fill="none">
      <path d="M15 4V13C15 14.1 14.1 15 13 15H4M15 10H11V15" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  </>
);

export const XianxiaModalBackdrop: React.FC<{
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}> = ({ onClose, children, maxWidth = 'max-w-lg' }) => (
  <div
    onClick={onClose}
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 backdrop-blur-xs p-3 sm:p-4 cursor-pointer"
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className={`relative w-full ${maxWidth} rounded-2xl xianxia-panel p-4 sm:p-5 cursor-default max-h-[90dvh] overflow-y-auto`}
    >
      <CornerFiligree />
      {children}
      <div className="mt-2.5 text-center text-[10px] text-[#a79c82]/75">点击弹窗外空白处可关闭</div>
    </div>
  </div>
);

export const SpiritStoneIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <polygon points="12,2 19,9 12,22 5,9" fill="#38bdf8" stroke="#bae6fd" strokeWidth="1.3" />
    <polygon points="12,2 12,22 5,9" fill="#7dd3fc" opacity="0.6" />
  </svg>
);

export const SpiritFruitIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 5C8 5 5 8.5 5 13C5 17.5 9 20 12 21C15 20 19 17.5 19 13C19 8.5 16 5 12 5Z" fill="#fb7185" stroke="#fecdd3" strokeWidth="1.2" />
    <path d="M12 5C13.5 3 16.5 2.5 18 4C16 5.5 14 6 12 5Z" fill="#4ade80" />
  </svg>
);

export const BeastFoodIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="13" r="7" fill="#a855f7" stroke="#e9d5ff" strokeWidth="1.2" />
    <circle cx="10" cy="11" r="2.2" fill="#f3e8ff" opacity="0.7" />
  </svg>
);

export const PillIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="7.5" fill="#f59e0b" stroke="#fef08a" strokeWidth="1.3" />
    <path d="M8 12C9 9.5 11 8.5 14 9" stroke="#fffbeb" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const DustIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 3L14.5 9.5L21 12L14.5 14.5L12 21L9.5 14.5L3 12L9.5 9.5L12 3Z" fill="#2dd4bf" stroke="#ccfbf1" strokeWidth="1.2" />
  </svg>
);

export const BlueprintIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <rect x="4" y="4" width="16" height="16" rx="2" fill="#1e3a8a" stroke="#93c5fd" strokeWidth="1.4" />
    <path d="M8 9H16M8 13H14M8 17H12" stroke="#dbeafe" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);
