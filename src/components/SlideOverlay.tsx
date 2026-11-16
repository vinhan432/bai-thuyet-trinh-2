import React, { useState } from 'react';
import {
  Check,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Wrench,
  ShieldCheck,
  MapPin,
  Maximize2,
} from 'lucide-react';
import { ACCENT_HEX, SlideData } from '../data/slides';
import { PHOTOS } from '../assets/photos';
import { SceneClickResult, SceneControlState } from '../three/types';
import { SpringCounter } from './SpringCounter';

interface SlideOverlayProps {
  slide: SlideData;
  transitionType: string;
  navDirection: 'forward' | 'backward';
  controlState: SceneControlState;
  feedbackBanner: SceneClickResult | null;
  onUpdateControl: (patch: Partial<SceneControlState>) => void;
  onJumpToSlide: (slideId: number) => void;
  onInspectPhoto: (photo: { src: string; caption: string }) => void;
}

const PhotoInset: React.FC<{
  photoKey: NonNullable<SlideData['photoKey']>;
  caption?: string;
  className?: string;
  isDark?: boolean;
  onInspect?: (photo: { src: string; caption: string }) => void;
}> = ({ photoKey, caption, className = '', isDark = false, onInspect }) => {
  const [errored, setErrored] = useState(false);
  const src = PHOTOS[photoKey];
  const resolvedCaption = caption ?? 'Hình ảnh thực tế nghề cơ khí';

  const frameCls = isDark
    ? 'border-[#FFF5ED]/20 bg-[#2B211B]'
    : 'border-[#2D2520]/14 bg-[#F5EDE3]';

  if (errored) {
    return (
      <figure className={`overflow-hidden rounded-xl border ${frameCls} ${className}`}>
        <div className="w-full h-full min-h-[100px] flex flex-col items-center justify-center p-4 text-center bg-[#F5EDE3] text-[#463E37]">
          <Wrench className="w-6 h-6 text-[#E87B5A] mb-1" />
          <span className="text-sm font-medium">{resolvedCaption}</span>
        </div>
      </figure>
    );
  }

  const content = (
    <>
      <img
        src={src}
        alt={resolvedCaption}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setErrored(true)}
        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1D1612]/88 via-[#1D1612]/42 to-transparent px-3 pt-6 pb-2 flex items-end justify-between gap-2"
      >
        <span className="text-[11px] sm:text-xs font-medium text-[#FFF5ED] leading-tight line-clamp-1 text-left">
          {resolvedCaption}
        </span>
        {onInspect && (
          <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#FFF5ED]/18 text-[#FFF5ED] group-hover:bg-[#E87B5A] transition-colors">
            <Maximize2 className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </>
  );

  if (onInspect) {
    return (
      <figure className={`group relative overflow-hidden rounded-xl border ${frameCls} ${className}`}>
        <button
          type="button"
          onClick={() => onInspect({ src, caption: resolvedCaption })}
          aria-label={`Phóng to ảnh: ${resolvedCaption}`}
          title="Nhấn để phóng to ảnh thực tế"
          className="relative block w-full h-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E87B5A]"
        >
          {content}
        </button>
      </figure>
    );
  }

  return (
    <figure className={`group relative overflow-hidden rounded-xl border ${frameCls} ${className}`}>
      {content}
    </figure>
  );
};

export const SlideOverlay: React.FC<SlideOverlayProps> = ({
  slide,
  transitionType,
  navDirection,
  controlState,
  feedbackBanner,
  onUpdateControl,
  onJumpToSlide,
  onInspectPhoto,
}) => {
  const accentHex = ACCENT_HEX[slide.accent];
  const isDark = slide.theme === 'dark';
  const animClass =
    transitionType === 'bounce'
      ? 'anim-slide-bounce'
      : transitionType === 'morph'
      ? 'anim-slide-morph'
      : transitionType === 'darkReveal'
      ? 'anim-slide-dark'
      : navDirection === 'backward'
      ? 'anim-slide-backward'
      : 'anim-slide-forward';

  const cardBg = isDark
    ? 'glass-card-dark text-[#FFF5ED] border-[#FFF5ED]/16'
    : 'glass-card text-[#2D2520] border-[#2D2520]/12';

  const headingCls = isDark ? 'text-[#FFF5ED]' : 'text-[#2D2520]';
  const bodyCls = isDark ? 'text-[#EFE4DA]' : 'text-[#463E37]';
  const cardBodyCls = isDark ? 'text-[#E6D9CE]' : 'text-[#463E37]';

  // Helper to render clickable 3D feedback card cleanly at top-center
  const renderFeedbackToast = () => {
    if (!feedbackBanner) return null;
    return (
      <div
        role="status"
        className={`anim-toast pointer-events-auto max-w-sm rounded-xl border px-4 py-2.5 shadow-md ${cardBg}`}
      >
        <p className="text-xs font-bold" style={{ color: accentHex }}>
          {feedbackBanner.title}
        </p>
        <p className={`text-xs mt-0.5 leading-snug ${bodyCls}`}>{feedbackBanner.description}</p>
      </div>
    );
  };

  // Layout-specific rendering across all 23 archetypes
  switch (slide.layout) {
    // 01: Full-bleed 3D right + Editorial left in semi-transparent acrylic frame
    case 'full-bleed-hero':
      return (
        <div key={slide.id} className={`pointer-events-none absolute inset-0 flex items-center px-5 sm:px-12 lg:px-20 pt-12 pb-24 ${animClass}`}>
          <div className="pointer-events-auto acrylic-panel max-w-xl lg:max-w-[640px] rounded-3xl px-6 py-6 sm:px-9 sm:py-8 anim-stagger">
            <p className="t-eyebrow mb-3 sm:mb-4" style={{ color: accentHex }}>
              {slide.eyebrow}
            </p>
            <h1 className="t-hero text-[#2D2520]">{slide.title}</h1>
            <p className="mt-4 sm:mt-6 text-base sm:text-xl leading-relaxed text-[#3D342D] max-w-xl">
              {slide.subtitle}
            </p>
            <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onJumpToSlide(2)}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 sm:py-4 rounded-xl bg-[#E87B5A] text-white font-semibold text-base shadow-md hover:bg-[#d66c4c] transition-colors cursor-pointer"
              >
                <span>Bắt đầu khám phá</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium text-[#5C534B]">{slide.hint}</span>
            </div>
          </div>
        </div>
      );

    // 02: Centered Pull-Quote + Small 3D bottom-right in semi-transparent acrylic frame
    case 'pull-quote':
      return (
        <div key={slide.id} className={`pointer-events-none absolute inset-0 flex flex-col justify-center px-5 sm:px-14 lg:px-20 pt-12 pb-24 ${animClass}`}>
          <div className="pointer-events-auto acrylic-panel max-w-2xl lg:max-w-[740px] rounded-3xl px-6 py-6 sm:px-9 sm:py-8 anim-stagger">
            <p className="t-eyebrow mb-3 sm:mb-4" style={{ color: accentHex }}>
              {slide.eyebrow}
            </p>
            <h2 className="t-slide-title text-[#2D2520] mb-3">{slide.title}</h2>
            <blockquote className="t-quote text-[#2D2520]">“{slide.quote}”</blockquote>
            <p className="mt-5 sm:mt-7 text-lg sm:text-2xl font-semibold text-[#C9633F]">
              {slide.attribution}
            </p>
            {slide.hint && <p className="mt-3 text-sm font-medium text-[#5C534B]">{slide.hint}</p>}
          </div>
        </div>
      );

    // 03, 09: Split Left Text + 3D Right
    case 'split-left-text':
    case 'split-left-text-cnc':
      return (
        <div key={slide.id} className={`pointer-events-none absolute inset-0 flex items-start md:items-center px-5 sm:px-12 lg:px-16 pt-12 md:pt-8 pb-36 sm:pb-24 slide-scroll overflow-y-auto md:overflow-hidden ${animClass}`}>
          <div className="pointer-events-auto w-full max-w-lg lg:max-w-[540px] space-y-4 rounded-2xl bg-[#FFF9F2]/90 md:bg-transparent p-4 md:p-0 anim-stagger">
            <p className="t-eyebrow" style={{ color: accentHex }}>
              {slide.eyebrow}
            </p>
            <h2 className={`t-slide-title ${headingCls}`}>{slide.title}</h2>
            <p className={`text-base sm:text-lg leading-relaxed ${bodyCls}`}>{slide.body}</p>

            {slide.stats && (
              <div className="grid grid-cols-3 gap-3 pt-1">
                {slide.stats.map((st) => (
                  <div key={st.label} className={`rounded-xl border p-3.5 shadow-sm ${cardBg}`}>
                    <SpringCounter
                      target={st.value}
                      prefix={st.prefix}
                      suffix={st.suffix}
                      className="text-xl sm:text-2xl block"
                      style={{ color: ACCENT_HEX[st.accent ?? slide.accent] }}
                    />
                    <span className="text-xs sm:text-[13px] text-[#463E37] block mt-1 leading-snug">{st.label}</span>
                  </div>
                ))}
              </div>
            )}

            {slide.items && (
              <div className="space-y-2.5 pt-0.5">
                {slide.items.map((item) => (
                  <div
                    key={item.title}
                    className={`card-accent card-lift rounded-xl border px-4 py-3 pl-4 shadow-sm ${cardBg}`}
                    style={{ ['--card-accent' as string]: ACCENT_HEX[item.accent ?? slide.accent] }}
                  >
                    <h3
                      className="text-sm sm:text-base font-bold"
                      style={{ color: ACCENT_HEX[item.accent ?? slide.accent] }}
                    >
                      {item.title}
                    </h3>
                    <p className={`text-sm mt-1 leading-relaxed ${cardBodyCls}`}>{item.description}</p>
                  </div>
                ))}
              </div>
            )}

            {slide.photoKey && (
              <PhotoInset
                photoKey={slide.photoKey}
                caption={slide.photoCaption}
                isDark={isDark}
                onInspect={onInspectPhoto}
                className="h-28 sm:h-32 w-full shadow-sm"
              />
            )}

            {slide.funFact && (
              <p className="text-sm italic text-[#C8603B] pt-0.5 font-medium">{slide.funFact}</p>
            )}
            {renderFeedbackToast()}
          </div>
        </div>
      );

    // 04: Everyday Carousel Objects (Top header + Bottom interactive selector cards)
    case 'carousel-objects':
      return (
        <div key={slide.id} className={`pointer-events-none absolute inset-0 flex flex-col justify-between px-6 sm:px-14 pt-11 pb-28 sm:pb-24 ${animClass}`}>
          <div className="max-w-2xl">
            <p className="t-eyebrow" style={{ color: accentHex }}>
              {slide.eyebrow}
            </p>
            <h2 className="t-slide-title text-[#2D2520] mt-1">{slide.title}</h2>
            <p className="text-base sm:text-lg text-[#463E37] mt-1.5">{slide.subtitle}</p>
          </div>

          <div className="pointer-events-auto grid grid-cols-2 lg:grid-cols-4 gap-3.5 max-w-6xl anim-stagger">
            {slide.items?.map((item, idx) => {
              const active = controlState.selectedObjectIndex === idx;
              const col = ACCENT_HEX[item.accent ?? 'tangerine'];
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() =>
                    onUpdateControl({ selectedObjectIndex: active ? -1 : idx })
                  }
                  className={`card-lift text-left rounded-2xl border p-4 hover:-translate-y-0.5 shadow-sm cursor-pointer ${cardBg} ${
                    active ? 'ring-2' : ''
                  }`}
                  style={active ? { borderColor: col, boxShadow: `0 8px 24px ${col}33` } : undefined}
                >
                  <span className="text-sm sm:text-base font-bold block" style={{ color: col }}>
                    {item.title}
                  </span>
                  <p className="text-xs sm:text-sm text-[#463E37] mt-1 leading-relaxed">{item.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      );

    // 05: 5-Step Production Process Timeline
    case 'timeline-process':
      return (
        <div key={slide.id} className={`pointer-events-none absolute inset-0 flex flex-col justify-between px-6 sm:px-12 pt-10 pb-28 sm:pb-24 ${animClass}`}>
          <div className="max-w-2xl">
            <p className="t-eyebrow" style={{ color: accentHex }}>{slide.eyebrow}</p>
            <h2 className="t-slide-title text-[#2D2520] mt-1">{slide.title}</h2>
            <p className="text-base sm:text-lg text-[#463E37] mt-1.5">{slide.subtitle}</p>
          </div>

          <div className="pointer-events-auto grid grid-cols-2 md:grid-cols-5 gap-3 anim-stagger">
            {slide.items?.map((step, idx) => {
              const active = controlState.selectedObjectIndex === idx;
              const col = ACCENT_HEX[step.accent ?? 'coral'];
              return (
                <button
                  key={step.title}
                  type="button"
                  onClick={() => onUpdateControl({ selectedObjectIndex: active ? -1 : idx })}
                  className={`card-lift text-left rounded-xl border p-3.5 shadow-sm hover:-translate-y-0.5 cursor-pointer ${cardBg}`}
                  style={active ? { borderColor: col, boxShadow: `0 8px 22px ${col}33` } : undefined}
                >
                  <span className="text-sm font-bold block" style={{ color: col }}>
                    {step.title}
                  </span>
                  <p className="text-xs sm:text-sm text-[#463E37] mt-1 leading-relaxed">{step.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      );

    // 06: Career Map Radial Cluster
    case 'radial-map':
      return (
        <div key={slide.id} className={`pointer-events-none absolute inset-0 flex flex-col justify-between px-6 sm:px-12 pt-10 pb-28 sm:pb-24 ${animClass}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-xl">
              <p className="t-eyebrow" style={{ color: accentHex }}>{slide.eyebrow}</p>
              <h2 className="t-slide-title text-[#2D2520] mt-1">{slide.title}</h2>
              <p className="text-sm sm:text-base text-[#463E37] mt-1.5">{slide.hint}</p>
            </div>
            {renderFeedbackToast()}
          </div>

          <div className="pointer-events-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 anim-stagger">
            {slide.items?.map((cluster) => {
              const col = ACCENT_HEX[cluster.accent ?? 'coral'];
              return (
                <button
                  key={cluster.title}
                  type="button"
                  onClick={() => cluster.targetSlide && onJumpToSlide(cluster.targetSlide)}
                  className={`card-lift text-left rounded-xl border p-3.5 shadow-sm hover:-translate-y-1 cursor-pointer ${cardBg}`}
                >
                  <span className="text-sm font-bold block" style={{ color: col }}>
                    {cluster.title}
                  </span>
                  <p className="text-xs sm:text-[13px] text-[#463E37] mt-1 leading-snug">{cluster.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      );

    // 07, 12, 14: Split 3D Left + Text/Cards/Checklist Right
    case 'split-right-text':
    case 'split-right-assembly':
    case 'split-right-checklist':
      return (
        <div key={slide.id} className={`pointer-events-none absolute inset-0 flex items-start md:items-center justify-end px-4 sm:px-12 lg:px-16 pt-12 md:pt-8 pb-36 sm:pb-24 slide-scroll overflow-y-auto md:overflow-hidden ${animClass}`}>
          <div className="pointer-events-auto w-full max-w-lg lg:max-w-[540px] space-y-3.5 rounded-2xl bg-[#FFF9F2]/90 md:bg-transparent p-4 md:p-0 anim-stagger">
            <p className="t-eyebrow" style={{ color: accentHex }}>{slide.eyebrow}</p>
            <h2 className={`t-slide-title ${headingCls}`}>{slide.title}</h2>
            <p className={`text-base sm:text-lg leading-relaxed ${bodyCls}`}>{slide.body}</p>

            {slide.stats && (
              <div className={`rounded-xl border px-4 py-3 inline-flex items-baseline gap-3 shadow-sm ${cardBg}`}>
                <SpringCounter
                  target={slide.stats[0].value}
                  suffix={slide.stats[0].suffix}
                  className="text-2xl sm:text-3xl"
                  style={{ color: ACCENT_HEX[slide.stats[0].accent ?? slide.accent] }}
                />
                <span className="text-sm font-medium text-[#463E37]">{slide.stats[0].label}</span>
              </div>
            )}

            {slide.items && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {slide.items.map((item) => (
                  <div key={item.title} className={`rounded-xl border p-3.5 shadow-sm ${cardBg}`}>
                    <h3 className="text-sm font-bold" style={{ color: accentHex }}>
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#463E37] mt-1 leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            )}

            {slide.checklist && (
              <ul className={`rounded-xl border p-4 space-y-2 shadow-sm ${cardBg}`}>
                {slide.checklist.map((row) => (
                  <li key={row} className="flex items-start gap-2.5 text-sm text-[#2D2520] leading-snug">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-[#E87B5A]" />
                    <span>{row}</span>
                  </li>
                ))}
              </ul>
            )}

            {slide.photoKey && (
              <PhotoInset
                photoKey={slide.photoKey}
                caption={slide.photoCaption}
                isDark={isDark}
                onInspect={onInspectPhoto}
                className="h-32 sm:h-36 w-full shadow-sm"
              />
            )}

            {slide.safetyNote && (
              <div className="rounded-xl border border-[#E87B5A]/50 bg-[#FCEEE4] px-4 py-3 flex items-start gap-2.5 text-sm text-[#2D2520]">
                <AlertTriangle className="w-4 h-4 text-[#E87B5A] shrink-0 mt-0.5" />
                <span>{slide.safetyNote}</span>
              </div>
            )}

            {slide.funFact && <p className="text-sm italic text-[#463E37]">{slide.funFact}</p>}
            {slide.hint && <p className="text-sm font-semibold text-[#5E9B70]">{slide.hint}</p>}
            {renderFeedbackToast()}
          </div>
        </div>
      );

    // 08: Top 3D Lathe Stage + Bottom 3-Column Text + Workshop Photo
    case 'top-stage-columns':
      return (
        <div key={slide.id} className={`pointer-events-none absolute inset-0 flex flex-col justify-between px-6 sm:px-14 pt-10 pb-28 sm:pb-24 ${animClass}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-xl">
              <p className="t-eyebrow" style={{ color: accentHex }}>{slide.eyebrow}</p>
              <h2 className="t-slide-title text-[#2D2520] mt-1">{slide.title}</h2>
            </div>
            {slide.photoKey && (
              <PhotoInset
                photoKey={slide.photoKey}
                caption={slide.photoCaption}
                onInspect={onInspectPhoto}
                className="hidden md:block w-60 h-32 pointer-events-auto shadow-md"
              />
            )}
          </div>

          <div className="pointer-events-auto space-y-3 max-w-6xl mx-auto w-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 anim-stagger">
              {slide.items?.map((col) => (
                <div key={col.title} className={`rounded-2xl border p-4 sm:p-5 shadow-sm ${cardBg}`}>
                  <h3
                    className="text-base sm:text-lg font-bold"
                    style={{ color: ACCENT_HEX[col.accent ?? 'coral'] }}
                  >
                    {col.title}
                  </h3>
                  <p className="text-sm sm:text-[15px] text-[#463E37] mt-1.5 leading-relaxed">
                    {col.description}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-sm italic text-center text-[#463E37]">{slide.funFact}</p>
          </div>
        </div>
      );

    // 10: Dark Sparks Overlay (Welder)
    case 'dark-sparks-overlay':
      return (
        <div key={slide.id} className={`pointer-events-none absolute inset-0 flex items-start md:items-center px-5 sm:px-14 pt-12 md:pt-8 pb-36 sm:pb-24 slide-scroll overflow-y-auto md:overflow-hidden ${animClass}`}>
          <div className={`pointer-events-auto max-w-lg rounded-2xl border p-5 sm:p-6 shadow-xl space-y-3 anim-stagger ${cardBg}`}>
            <p className="t-eyebrow" style={{ color: accentHex }}>{slide.eyebrow}</p>
            <h2 className="t-slide-title text-[#FFF5ED]">{slide.title}</h2>
            <p className="text-sm sm:text-base text-[#EFE4DA] leading-relaxed">{slide.body}</p>

            <div className="space-y-2">
              {slide.items?.map((t) => (
                <div key={t.title} className="rounded-xl bg-[#3D3028]/95 border border-[#FFF5ED]/12 px-4 py-2.5">
                  <div className="text-sm font-bold" style={{ color: ACCENT_HEX[t.accent ?? 'honey'] }}>
                    {t.title}
                  </div>
                  <div className="text-xs sm:text-sm text-[#EFE4DA] mt-0.5 leading-relaxed">{t.description}</div>
                </div>
              ))}
            </div>

            {slide.photoKey && (
              <PhotoInset
                photoKey={slide.photoKey}
                caption={slide.photoCaption}
                isDark
                onInspect={onInspectPhoto}
                className="h-28 sm:h-32 w-full shadow-md"
              />
            )}

            {slide.safetyNote && (
              <div className="rounded-xl border border-[#E87B5A]/65 bg-[#E87B5A]/18 px-4 py-2.5 flex items-start gap-2.5 text-xs sm:text-sm text-[#FFF5ED]">
                <ShieldCheck className="w-5 h-5 text-[#E87B5A] shrink-0 mt-0.5" />
                <span>{slide.safetyNote}</span>
              </div>
            )}
          </div>
        </div>
      );

    // 11: Diagonal Composition (Sheet Metal Bend)
    case 'diagonal-bend':
      return (
        <div key={slide.id} className={`pointer-events-none absolute inset-0 flex flex-col justify-between items-end px-6 sm:px-14 pt-10 pb-28 sm:pb-24 ${animClass}`}>
          <div className="w-full flex justify-end">
            {slide.photoKey && (
              <PhotoInset
                photoKey={slide.photoKey}
                caption={slide.photoCaption}
                onInspect={onInspectPhoto}
                className="hidden md:block w-64 h-36 pointer-events-auto shadow-md"
              />
            )}
          </div>

          <div className="pointer-events-auto acrylic-panel max-w-xl w-full rounded-2xl p-5 sm:p-6 space-y-4 anim-stagger">
            <p className="t-eyebrow" style={{ color: accentHex }}>{slide.eyebrow}</p>
            <h2 className="t-slide-title text-[#2D2520]">{slide.title}</h2>
            <p className="text-base sm:text-lg text-[#463E37] leading-relaxed">{slide.body}</p>

            <div className="grid grid-cols-3 gap-3">
              {slide.items?.map((proc) => (
                <div key={proc.title} className={`rounded-xl border p-3.5 shadow-sm ${cardBg}`}>
                  <h3 className="text-sm font-bold text-[#E87B5A]">{proc.title}</h3>
                  <p className="text-xs sm:text-sm text-[#463E37] mt-1 leading-snug">{proc.description}</p>
                </div>
              ))}
            </div>

            {slide.stats && (
              <div className={`rounded-xl border px-4 py-3 flex items-center justify-between shadow-sm ${cardBg}`}>
                <span className="text-sm font-medium text-[#463E37]">{slide.stats[0].label}</span>
                <SpringCounter
                  target={slide.stats[0].value}
                  suffix={slide.stats[0].suffix}
                  className="text-xl text-[#E87B5A]"
                />
              </div>
            )}
          </div>
        </div>
      );

    // 13: 3 Vertical Panels (Maintenance)
    case 'three-panels':
      return (
        <div key={slide.id} className={`pointer-events-none absolute inset-0 flex flex-col justify-between px-6 sm:px-12 pt-10 pb-28 sm:pb-24 ${animClass}`}>
          <div className="max-w-2xl">
            <p className="t-eyebrow" style={{ color: accentHex }}>{slide.eyebrow}</p>
            <h2 className="t-slide-title text-[#2D2520] mt-1">{slide.title}</h2>
            <p className="text-base sm:text-lg text-[#463E37] mt-1.5">{slide.body}</p>
          </div>

          <div className="pointer-events-auto grid grid-cols-1 md:grid-cols-3 gap-4 anim-stagger">
            {slide.items?.map((panel) => (
              <div key={panel.title} className={`rounded-2xl border p-5 shadow-sm ${cardBg}`}>
                <h3
                  className="text-base sm:text-lg font-bold"
                  style={{ color: ACCENT_HEX[panel.accent ?? 'sage'] }}
                >
                  {panel.title}
                </h3>
                <p className="text-sm sm:text-[15px] text-[#463E37] mt-2 leading-relaxed">
                  {panel.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      );

    // 15: Centered Caliper + Surrounding Callout Cards
    case 'centered-caliper':
      return (
        <div key={slide.id} className={`pointer-events-none absolute inset-0 flex flex-col justify-between px-6 sm:px-12 pt-10 pb-28 sm:pb-24 ${animClass}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-md">
              <p className="t-eyebrow" style={{ color: accentHex }}>{slide.eyebrow}</p>
              <h2 className="t-slide-title text-[#2D2520] mt-1">{slide.title}</h2>
              <p className="text-base sm:text-lg text-[#463E37] mt-1.5">{slide.body}</p>
            </div>
            <div className="flex items-start gap-3">
              {slide.stats && (
                <div className={`rounded-2xl border px-5 py-3.5 shadow-sm ${cardBg}`}>
                  <SpringCounter
                    target={slide.stats[0].value}
                    prefix={slide.stats[0].prefix}
                    suffix={slide.stats[0].suffix}
                    className="text-2xl text-[#6AADCF] block"
                  />
                  <span className="text-xs sm:text-sm font-medium text-[#463E37]">{slide.stats[0].label}</span>
                </div>
              )}
              {slide.photoKey && (
                <PhotoInset
                  photoKey={slide.photoKey}
                  caption={slide.photoCaption}
                  onInspect={onInspectPhoto}
                  className="hidden md:block w-56 h-30 pointer-events-auto shadow-md"
                />
              )}
            </div>
          </div>

          <div className="pointer-events-auto grid grid-cols-1 md:grid-cols-3 gap-3.5 anim-stagger">
            {slide.items?.map((tool) => (
              <div key={tool.title} className={`rounded-xl border p-4 shadow-sm ${cardBg}`}>
                <h3 className="text-base font-bold text-[#4D93B8]">{tool.title}</h3>
                <p className="text-sm text-[#463E37] mt-1 leading-relaxed">{tool.description}</p>
              </div>
            ))}
          </div>
        </div>
      );

    // 16: Dark Robot Overlay (Bottom-Right Frosted-Tone Card)
    case 'dark-robot-overlay':
      return (
        <div key={slide.id} className={`pointer-events-none absolute inset-0 flex flex-col justify-between px-6 sm:px-14 pt-10 pb-28 sm:pb-24 ${animClass}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="t-eyebrow" style={{ color: accentHex }}>{slide.eyebrow}</p>
              <h2 className="t-slide-title text-[#FFF5ED] mt-1">{slide.title}</h2>
            </div>
            <div className="flex items-start gap-3">
              {renderFeedbackToast()}
              {slide.photoKey && (
                <PhotoInset
                  photoKey={slide.photoKey}
                  caption={slide.photoCaption}
                  isDark
                  onInspect={onInspectPhoto}
                  className="hidden md:block w-60 h-32 pointer-events-auto shadow-md"
                />
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <div className={`pointer-events-auto max-w-lg rounded-2xl border p-5 sm:p-6 shadow-xl space-y-3.5 anim-stagger ${cardBg}`}>
              <p className="text-base text-[#EFE4DA] leading-relaxed">{slide.body}</p>
              <div className="grid grid-cols-2 gap-3">
                {slide.stats?.map((st) => (
                  <div key={st.label} className="rounded-xl bg-[#3D3028]/95 border border-[#FFF5ED]/12 p-3.5">
                    <SpringCounter
                      target={st.value}
                      prefix={st.prefix}
                      suffix={st.suffix}
                      className="text-xl sm:text-2xl block"
                      style={{ color: ACCENT_HEX[st.accent ?? 'lavender'] }}
                    />
                    <span className="text-xs sm:text-sm text-[#EFE4DA] mt-1 block">{st.label}</span>
                  </div>
                ))}
              </div>
              {slide.items?.map((it) => (
                <div key={it.title} className="text-sm text-[#EFE4DA] leading-relaxed">
                  <strong className="text-[#FFF5ED]">{it.title}: </strong>
                  {it.description}
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    // 17: Dual-Tone Fusion (Mechatronics)
    case 'dual-tone-fusion':
      return (
        <div key={slide.id} className={`pointer-events-none absolute inset-0 flex items-start md:items-center px-5 sm:px-14 pt-12 md:pt-8 pb-36 sm:pb-24 slide-scroll overflow-y-auto md:overflow-hidden ${animClass}`}>
          <div className="pointer-events-auto max-w-xl space-y-2.5 rounded-2xl bg-[#FFF9F2]/90 md:bg-transparent p-4 md:p-0 anim-stagger">
            <p className="t-eyebrow" style={{ color: accentHex }}>{slide.eyebrow}</p>
            <h2 className="t-slide-title text-[#2D2520]">{slide.title}</h2>
            {slide.formula && (
              <div className="rounded-xl border border-[#82C9B5]/65 bg-[#FFFFFF]/96 px-4 py-2.5 text-sm sm:text-base font-bold text-[#2D2520] shadow-sm">
                {slide.formula}
              </div>
            )}
            <p className="text-sm sm:text-base text-[#463E37] leading-relaxed">{slide.body}</p>
            <div className="space-y-2">
              {slide.items?.map((ex) => (
                <div key={ex.title} className={`rounded-xl border px-4 py-2.5 shadow-sm ${cardBg}`}>
                  <span className="text-sm font-bold text-[#2D2520]">{ex.title}</span>
                  <p className="text-xs sm:text-sm text-[#463E37] mt-0.5 leading-snug">{ex.description}</p>
                </div>
              ))}
            </div>
            {slide.photoKey && (
              <PhotoInset
                photoKey={slide.photoKey}
                caption={slide.photoCaption}
                onInspect={onInspectPhoto}
                className="h-26 sm:h-28 w-full shadow-sm"
              />
            )}
            {slide.stats && (
              <div className={`rounded-xl border px-4 py-2.5 flex items-center gap-3 shadow-sm ${cardBg}`}>
                <SpringCounter
                  target={slide.stats[0].value}
                  prefix={slide.stats[0].prefix}
                  suffix={slide.stats[0].suffix}
                  className="text-2xl text-[#4AA58C]"
                />
                <span className="text-sm font-medium text-[#463E37]">{slide.stats[0].label}</span>
              </div>
            )}
          </div>
        </div>
      );

    // 18: 3 Comparison Cards Below 3 Floating 3D Objects
    case 'comparison-triptych':
      return (
        <div key={slide.id} className={`pointer-events-none absolute inset-0 flex flex-col justify-between px-6 sm:px-12 pt-10 pb-28 sm:pb-24 ${animClass}`}>
          <div className="max-w-2xl">
            <p className="t-eyebrow" style={{ color: accentHex }}>{slide.eyebrow}</p>
            <h2 className="t-slide-title text-[#2D2520] mt-1">{slide.title}</h2>
            <p className="text-base sm:text-lg text-[#463E37] mt-1.5">{slide.subtitle}</p>
          </div>

          <div className="pointer-events-auto grid grid-cols-1 md:grid-cols-3 gap-4 anim-stagger">
            {slide.items?.map((card) => (
              <div key={card.title} className={`rounded-2xl border p-5 shadow-sm ${cardBg}`}>
                <div
                  className="h-1.5 w-14 rounded-full mb-3"
                  style={{ backgroundColor: ACCENT_HEX[card.accent ?? 'coral'] }}
                />
                <h3 className="text-lg font-bold text-[#2D2520]">{card.title}</h3>
                <p className="text-sm sm:text-[15px] text-[#463E37] mt-2 leading-relaxed">
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      );

    // 19: Workplaces Panorama + 5 Interactive Location Cards
    case 'workplaces-panorama':
      return (
        <div key={slide.id} className={`pointer-events-none absolute inset-0 flex flex-col justify-between px-6 sm:px-12 pt-10 pb-28 sm:pb-24 ${animClass}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-xl">
              <p className="t-eyebrow" style={{ color: accentHex }}>{slide.eyebrow}</p>
              <h2 className="t-slide-title text-[#2D2520] mt-1">{slide.title}</h2>
              <p className="text-base text-[#463E37] mt-1.5">{slide.subtitle}</p>
            </div>
            {slide.photoKey && (
              <PhotoInset
                photoKey={slide.photoKey}
                caption={slide.photoCaption ?? 'Dây chuyền sản xuất công nghiệp hiện đại'}
                onInspect={onInspectPhoto}
                className="hidden md:block w-64 h-34 pointer-events-auto shadow-md"
              />
            )}
          </div>

          <div className="pointer-events-auto grid grid-cols-2 lg:grid-cols-5 gap-3 anim-stagger">
            {slide.items?.map((loc, idx) => {
              const active = controlState.selectedObjectIndex === idx;
              return (
                <button
                  key={loc.title}
                  type="button"
                  onClick={() => onUpdateControl({ selectedObjectIndex: active ? -1 : idx })}
                  className={`card-lift text-left rounded-xl border p-3.5 shadow-sm hover:-translate-y-0.5 cursor-pointer ${cardBg} ${
                    active ? 'ring-2 ring-[#EAB042]' : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-sm font-bold text-[#2D2520]">
                    <MapPin className="w-4 h-4 text-[#E87B5A] shrink-0" />
                    <span>{loc.title}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#463E37] mt-1 leading-snug">{loc.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      );

    // 20: 2x3 Tools Grid
    case 'tools-grid':
      return (
        <div key={slide.id} className={`pointer-events-none absolute inset-0 flex flex-col justify-between px-6 sm:px-12 pt-10 pb-28 sm:pb-24 ${animClass}`}>
          <div className="max-w-xl">
            <p className="t-eyebrow" style={{ color: accentHex }}>{slide.eyebrow}</p>
            <h2 className="t-slide-title text-[#2D2520] mt-1">{slide.title}</h2>
            <p className="text-base text-[#463E37] mt-1.5">{slide.subtitle}</p>
          </div>

          <div className="pointer-events-auto grid grid-cols-2 md:grid-cols-3 gap-3.5 max-w-6xl anim-stagger">
            {slide.items?.map((tool) => (
              <div key={tool.title} className={`rounded-2xl border p-4 sm:p-5 shadow-sm ${cardBg}`}>
                <h3
                  className="text-base font-bold"
                  style={{ color: ACCENT_HEX[tool.accent ?? 'sky'] }}
                >
                  {tool.title}
                </h3>
                <p className="text-sm text-[#463E37] mt-1 leading-relaxed">{tool.description}</p>
              </div>
            ))}
          </div>
        </div>
      );

    // 21: 6 Hexagonal Skills
    case 'hex-skills':
      return (
        <div key={slide.id} className={`pointer-events-none absolute inset-0 flex flex-col justify-between px-6 sm:px-12 pt-10 pb-28 sm:pb-24 ${animClass}`}>
          <div className="max-w-xl">
            <p className="t-eyebrow" style={{ color: accentHex }}>{slide.eyebrow}</p>
            <h2 className="t-slide-title text-[#2D2520] mt-1">{slide.title}</h2>
            <p className="text-sm sm:text-base text-[#463E37] mt-1.5">{slide.hint}</p>
          </div>

          <div className="pointer-events-auto grid grid-cols-2 md:grid-cols-3 gap-3 max-w-6xl anim-stagger">
            {slide.items?.map((skill, idx) => {
              const active = controlState.selectedObjectIndex === idx;
              const col = ACCENT_HEX[skill.accent ?? 'sage'];
              return (
                <button
                  key={skill.title}
                  type="button"
                  onClick={() => onUpdateControl({ selectedObjectIndex: active ? -1 : idx })}
                  className={`card-lift text-left rounded-xl border p-4 shadow-sm hover:-translate-y-0.5 cursor-pointer ${cardBg}`}
                  style={active ? { borderColor: col, boxShadow: `0 8px 22px ${col}33` } : undefined}
                >
                  <span className="text-sm sm:text-base font-bold block" style={{ color: col }}>
                    {skill.title}
                  </span>
                  <p className="text-xs sm:text-sm text-[#463E37] mt-1 leading-snug">
                    {skill.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      );

    // 22: Dark Vertical Timeline Future
    case 'dark-timeline-future':
      return (
        <div key={slide.id} className={`pointer-events-none absolute inset-0 flex items-start md:items-center px-5 sm:px-14 pt-12 md:pt-8 pb-36 sm:pb-24 slide-scroll overflow-y-auto md:overflow-hidden ${animClass}`}>
          <div className="pointer-events-auto max-w-xl space-y-3 anim-stagger">
            <p className="t-eyebrow" style={{ color: accentHex }}>{slide.eyebrow}</p>
            <h2 className="t-slide-title text-[#FFF5ED]">{slide.title}</h2>

            <div className="space-y-2.5">
              {slide.items?.map((ms) => (
                <div key={ms.title} className={`rounded-xl border px-4 py-3 shadow-sm ${cardBg}`}>
                  <div className="text-sm sm:text-base font-bold" style={{ color: ACCENT_HEX[ms.accent ?? 'honey'] }}>
                    {ms.title}
                  </div>
                  <p className="text-xs sm:text-sm text-[#EFE4DA] mt-1 leading-relaxed">{ms.description}</p>
                </div>
              ))}
            </div>

            {slide.photoKey && (
              <PhotoInset
                photoKey={slide.photoKey}
                caption={slide.photoCaption}
                isDark
                onInspect={onInspectPhoto}
                className="h-28 sm:h-32 w-full shadow-md"
              />
            )}

            <p className="text-sm sm:text-base italic text-[#EFE4DA] pt-0.5 leading-relaxed">{slide.body}</p>
          </div>
        </div>
      );

    // 23: Dark Finale Quote + Hero Gear Callback
    case 'dark-finale':
      return (
        <div key={slide.id} className={`pointer-events-none absolute inset-0 flex flex-col justify-center px-5 sm:px-14 lg:px-20 pt-12 pb-24 ${animClass}`}>
          <div className="pointer-events-auto acrylic-panel-dark max-w-2xl rounded-3xl px-6 py-6 sm:px-9 sm:py-8 space-y-4 sm:space-y-5 anim-stagger">
            <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#E87B5A]">
              <Sparkles className="w-4 h-4" />
              <span>{slide.eyebrow}</span>
            </div>
            <blockquote className="t-quote text-[#FFF5ED]">“{slide.quote}”</blockquote>
            <div className="h-1 w-28 rounded-full bg-[#E87B5A]" />
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#FFF5ED]">{slide.title}</h2>
            <p className="text-sm sm:text-base text-[#EFE4DA]">{slide.attribution}</p>
          </div>
        </div>
      );

    default:
      return null;
  }
};
