import React from 'react';
import { X } from 'lucide-react';
import { ACCENT_HEX, SlideData } from '../data/slides';

interface OverviewModalProps {
  open: boolean;
  slides: SlideData[];
  currentIndex: number;
  onSelectSlide: (index: number) => void;
  onClose: () => void;
}

const ACT_META: Record<number, { label: string; blurb: string }> = {
  1: { label: 'Phần I · Giới thiệu', blurb: 'Cơ khí là gì và quanh các bạn những gì' },
  2: { label: 'Phần II · Khám phá nghề nghiệp', blurb: '11 nghề cơ khí chi tiết' },
  3: { label: 'Phần III · Hiểu biết nghề nghiệp', blurb: 'So sánh, kỹ năng và tương lai' },
};

export const OverviewModal: React.FC<OverviewModalProps> = ({
  open,
  slides,
  currentIndex,
  onSelectSlide,
  onClose,
}) => {
  if (!open) return null;

  const acts = [1, 2, 3];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tổng quan 23 trang trình bày"
      className="fixed inset-0 z-50 bg-[#2D2520]/94 overflow-y-auto px-4 sm:px-8 py-6 sm:py-10 slide-scroll slide-scroll-dark"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 pb-6 border-b border-[#FFF5ED]/15">
          <div>
            <p className="t-eyebrow text-[#E87B5A]">BẢN ĐỒ TRÌNH BÀY · 23 TRANG</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#FFF5ED] mt-1">
              Giới thiệu các nghề trong lĩnh vực cơ khí
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng tổng quan"
            className="h-11 px-4 inline-flex items-center gap-2 rounded-xl bg-[#FFF5ED]/12 text-[#FFF5ED] text-sm font-semibold hover:bg-[#FFF5ED]/20 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Đóng (Esc)</span>
          </button>
        </div>

        {acts.map((act) => {
          const actSlides = slides
            .map((slide, idx) => ({ slide, idx }))
            .filter(({ slide }) => slide.act === act);
          if (actSlides.length === 0) return null;
          const meta = ACT_META[act];
          return (
            <section key={act} className="mt-8">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-[#FFF5ED]">{meta.label}</h3>
                <span className="text-sm text-[#DECFC3]">{meta.blurb}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-2">
                {actSlides.map(({ slide, idx }) => {
                  const isCurrent = idx === currentIndex;
                  const accentHex = ACCENT_HEX[slide.accent];
                  const isDark = slide.theme === 'dark';

                  return (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => {
                        onSelectSlide(idx);
                        onClose();
                      }}
                      className={`group text-left rounded-2xl p-4 border transition-all duration-200 hover:-translate-y-1 cursor-pointer ${
                        isDark
                          ? 'bg-[#3D3028] text-[#FFF5ED] border-[#FFF5ED]/15 hover:border-[#FFF5ED]/30'
                          : 'bg-[#FFF9F2] text-[#2D2520] border-[#2D2520]/10 hover:border-[#2D2520]/25'
                      } ${isCurrent ? 'ring-2 ring-[#E87B5A]' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs mb-2">
                        <span className="t-mono font-bold" style={{ color: accentHex }}>
                          {String(slide.id).padStart(2, '0')}
                        </span>
                        <span className={isDark ? 'text-[#DECFC3]' : 'text-[#8A7F76]'}>
                          {slide.shortTitle.split('·')[0].trim()}
                        </span>
                      </div>
                      <h4 className="font-bold text-base leading-snug line-clamp-2">
                        {slide.shortTitle}
                      </h4>
                      <p
                        className={`text-xs mt-1.5 line-clamp-2 leading-relaxed ${
                          isDark ? 'text-[#DECFC3]' : 'text-[#5C534B]'
                        }`}
                      >
                        {slide.title}
                      </p>
                      <div
                        className="h-1 w-10 rounded-full mt-3 transition-all duration-200 group-hover:w-16"
                        style={{ backgroundColor: accentHex }}
                      />
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
