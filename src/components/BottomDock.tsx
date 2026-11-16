import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Grid2x2,
  Maximize2,
  Minimize2,
  Layers,
  Box,
  Compass,
  RotateCcw,
} from 'lucide-react';
import { SlideData } from '../data/slides';
import { SceneControlState } from '../three/types';
import { computeCaliperMm } from '../utils/presentationLogic';

interface BottomDockProps {
  slide: SlideData;
  slideIndex: number;
  totalSlides: number;
  collapsed: boolean;
  isFullscreen: boolean;
  controlState: SceneControlState;
  onToggleCollapse: () => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenOverview: () => void;
  onToggleFullscreen: () => void;
  onUpdateControl: (patch: Partial<SceneControlState>) => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  slide,
  slideIndex,
  totalSlides,
  collapsed,
  isFullscreen,
  controlState,
  onToggleCollapse,
  onPrev,
  onNext,
  onOpenOverview,
  onToggleFullscreen,
  onUpdateControl,
}) => {
  const isDark = slide.theme === 'dark';

  const dockSurface = isDark
    ? 'bg-[#2B211B]/95 text-[#FFF5ED] border-[#FFF5ED]/14'
    : 'bg-[#FFFFFF]/96 text-[#2D2520] border-[#2D2520]/12';

  const subtleBtn = isDark
    ? 'hover:bg-[#FFF5ED]/10 text-[#FFF5ED]'
    : 'hover:bg-[#2D2520]/8 text-[#2D2520]';

  // 44px tall on touch widths, compact on desktop.
  const iconBtn = `h-11 w-11 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer ${subtleBtn}`;
  const chipBtn = 'h-11 px-4 sm:h-9 sm:px-3.5 inline-flex items-center gap-1.5 rounded-lg text-xs sm:text-[13px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer';

  return (
    <div
      className="fixed bottom-3 inset-x-0 z-30 flex flex-col items-center px-2 pointer-events-none"
      style={{
        transform: collapsed ? 'translateY(calc(100% - 30px))' : 'translateY(0)',
        transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* Collapse / expand handle */}
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Mở thanh điều khiển' : 'Thu gọn thanh điều khiển'}
        className={`pointer-events-auto mb-1 inline-flex items-center gap-1.5 px-3.5 h-11 sm:h-7 rounded-t-lg border text-xs font-semibold shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${dockSurface}`}
      >
        {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        <span>{collapsed ? 'Mở điều khiển' : 'Thu gọn (H)'}</span>
      </button>

      {/* Main compact horizontal dock */}
      <div
        className={`pointer-events-auto max-w-full flex flex-wrap items-center justify-center gap-1.5 sm:gap-3 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl border shadow-lg backdrop-blur-sm ${dockSurface}`}
      >
        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrev}
            disabled={slideIndex === 0}
            aria-label="Trang trước"
            className={`${iconBtn} disabled:opacity-35`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="t-mono text-xs sm:text-[13px] font-bold px-2 whitespace-nowrap select-none">
            {String(slideIndex + 1).padStart(2, '0')} / {String(totalSlides).padStart(2, '0')}
          </span>
          <button
            type="button"
            onClick={onNext}
            aria-label="Trang tiếp theo"
            className={`${chipBtn} bg-[#E87B5A] text-white hover:bg-[#d86b4a]`}
          >
            <span>{slideIndex === totalSlides - 1 ? 'Về đầu' : 'Tiếp'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Slide-specific controls */}
        {(slide.interactiveKind === 'explode-assembly' || slide.interactiveKind === 'explode-engine') && (
          <div className="flex items-center gap-2 pl-2 border-l border-current/12">
            <button
              type="button"
              onClick={() => onUpdateControl({ exploded: !controlState.exploded })}
              className={`${chipBtn} ${
                controlState.exploded
                  ? 'bg-[#7DB58E] text-white'
                  : 'bg-[#2D2520] text-[#FFF5ED] hover:bg-[#4A3F35]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{controlState.exploded ? 'Lắp ráp' : 'Tháo rời'}</span>
            </button>

            {slide.interactiveKind === 'explode-engine' && (
              <label className="hidden md:flex items-center gap-2 text-xs sm:text-[13px] font-medium whitespace-nowrap">
                <span>Vòng tua: {controlState.engineRpmMultiplier.toFixed(1)}x</span>
                <input
                  type="range"
                  min={0.3}
                  max={2.4}
                  step={0.1}
                  value={controlState.engineRpmMultiplier}
                  onChange={(e) => onUpdateControl({ engineRpmMultiplier: Number(e.target.value) })}
                  className="warm-slider w-20"
                  aria-label="Tốc độ động cơ"
                />
              </label>
            )}
          </div>
        )}

        {slide.interactiveKind === 'cad-toggle' && (
          <div className="flex items-center pl-2 border-l border-current/12">
            <button
              type="button"
              onClick={() => onUpdateControl({ cadWireframe: !controlState.cadWireframe })}
              className={`${chipBtn} bg-[#6AADCF] text-white hover:bg-[#5799bc]`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>{controlState.cadWireframe ? 'Chế độ Thực tế' : 'Bản vẽ ↔ Thực tế'}</span>
            </button>
          </div>
        )}

        {slide.interactiveKind === 'cnc-axes' && (
          <div className="flex items-center pl-2 border-l border-current/12">
            <button
              type="button"
              onClick={() => onUpdateControl({ cncAxesVisible: !controlState.cncAxesVisible })}
              className={`${chipBtn} ${
                controlState.cncAxesVisible
                  ? 'bg-[#A78EC4] text-white'
                  : 'bg-[#6AADCF] text-white hover:bg-[#5799bc]'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{controlState.cncAxesVisible ? 'Ẩn trục X-Y-Z' : 'Xem trục X-Y-Z'}</span>
            </button>
          </div>
        )}

        {slide.interactiveKind === 'sheet-bend' && (
          <label className="flex items-center gap-2 pl-2 border-l border-current/12 text-xs sm:text-[13px] font-semibold whitespace-nowrap">
            <span>
              Góc chấn: <span className="t-mono">{controlState.sheetBendAngle}°</span>
            </span>
            <input
              type="range"
              min={0}
              max={90}
              step={1}
              value={controlState.sheetBendAngle}
              onChange={(e) => onUpdateControl({ sheetBendAngle: Number(e.target.value) })}
              className="warm-slider w-24 sm:w-28"
              aria-label="Góc uốn tôn"
            />
          </label>
        )}

        {slide.interactiveKind === 'caliper-slider' && (
          <label className="flex items-center gap-2 pl-2 border-l border-current/12 text-xs sm:text-[13px] font-semibold whitespace-nowrap">
            <span>
              Đo: <span className="t-mono text-[#6AADCF]">{computeCaliperMm(controlState.caliperOpenNorm)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={controlState.caliperOpenNorm}
              onChange={(e) => onUpdateControl({ caliperOpenNorm: Number(e.target.value) })}
              className="warm-slider w-24 sm:w-28"
              aria-label="Độ mở thước kẹp"
            />
          </label>
        )}

        {slide.interactiveKind === 'robot-speed' && (
          <label className="flex items-center gap-2 pl-2 border-l border-current/12 text-xs sm:text-[13px] font-semibold whitespace-nowrap">
            <span>
              Tốc độ: <span className="t-mono">{controlState.robotSpeed.toFixed(1)}x</span>
            </span>
            <input
              type="range"
              min={0.4}
              max={2.0}
              step={0.1}
              value={controlState.robotSpeed}
              onChange={(e) => onUpdateControl({ robotSpeed: Number(e.target.value) })}
              className="warm-slider w-24"
              aria-label="Tốc độ robot"
            />
          </label>
        )}

        {slide.interactiveKind === 'everyday-select' && controlState.selectedObjectIndex !== -1 && (
          <button
            type="button"
            onClick={() => onUpdateControl({ selectedObjectIndex: -1 })}
            className={`${chipBtn} bg-[#F2994A] text-white`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Xem tất cả</span>
          </button>
        )}

        {/* Utility actions */}
        <div className="flex items-center gap-1 pl-2 border-l border-current/12">
          <button
            type="button"
            onClick={onOpenOverview}
            aria-label="Tổng quan tất cả trang (O)"
            className={`h-11 px-3 sm:h-9 sm:px-2.5 inline-flex items-center gap-1.5 rounded-lg text-xs sm:text-[13px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${subtleBtn}`}
          >
            <Grid2x2 className="w-4 h-4" />
            <span className="hidden sm:inline">Tổng quan</span>
          </button>
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình (F)'}
            className={iconBtn}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
