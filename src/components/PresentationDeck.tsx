import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { X, Box } from 'lucide-react';
import { ACCENT_HEX, SLIDES } from '../data/slides';
import { SlideStage } from '../three/SlideStage';
import { SceneClickResult, SceneControlState } from '../three/types';
import { sceneUsesModels } from '../three/sceneModels';
import { SlideOverlay } from './SlideOverlay';
import { BottomDock } from './BottomDock';
import { OverviewModal } from './OverviewModal';
import {
  clampSlideIndex,
  formatSlideCounter,
  getTransitionKind,
  nextSlideIndex,
  parseNumericJumpBuffer,
  prevSlideIndex,
} from '../utils/presentationLogic';

function getInitialSlideIndex(): number {
  if (typeof window === 'undefined') return 0;
  const params = new URLSearchParams(window.location.search);
  const slideParam = params.get('slide');
  if (slideParam) {
    const parsed = Number.parseInt(slideParam, 10);
    if (!Number.isNaN(parsed)) return clampSlideIndex(parsed - 1, SLIDES.length);
  }
  if (params.get('autostart') === '1') {
    return 1;
  }
  return 0;
}

const DEFAULT_CONTROL_STATE: SceneControlState = {
  exploded: false,
  cadWireframe: false,
  cncAxesVisible: false,
  weldStage: 0,
  sheetBendAngle: 45,
  engineRpmMultiplier: 1.0,
  caliperOpenNorm: 0.65,
  robotSpeed: 1.0,
  selectedObjectIndex: -1,
  pointerNDC: new THREE.Vector2(0, 0),
  hoveredMeshName: null,
};

const ACT_LABELS: Record<number, string> = {
  1: 'Giới thiệu',
  2: 'Khám phá nghề',
  3: 'Hiểu biết nghề',
};

export const PresentationDeck: React.FC = () => {
  const [slideIndex, setSlideIndex] = useState<number>(getInitialSlideIndex);
  const [transitionType, setTransitionType] = useState<string>('default');
  const [navDirection, setNavDirection] = useState<'forward' | 'backward'>('forward');
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlState, setControlState] = useState<SceneControlState>(DEFAULT_CONTROL_STATE);
  const [feedbackBanner, setFeedbackBanner] = useState<SceneClickResult | null>(null);
  const [zoomedPhoto, setZoomedPhoto] = useState<{ src: string; caption: string } | null>(null);

  const numericBufferRef = useRef<string>('');
  const numericTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const deckRootRef = useRef<HTMLDivElement | null>(null);

  const currentSlide = SLIDES[slideIndex];
  const isDark = currentSlide.theme === 'dark';
  const accentHex = ACCENT_HEX[currentSlide.accent];

  const navigateToIndex = useCallback(
    (nextIdx: number) => {
      const clamped = clampSlideIndex(nextIdx, SLIDES.length);
      if (clamped === slideIndex) return;
      const fromId = SLIDES[slideIndex].id;
      const toId = SLIDES[clamped].id;
      const forward = clamped > slideIndex || (slideIndex === SLIDES.length - 1 && clamped === 0);
      setNavDirection(forward ? 'forward' : 'backward');
      const kind = getTransitionKind(Math.min(fromId, toId), Math.max(fromId, toId));
      setTransitionType(kind);
      setSlideIndex(clamped);
      setFeedbackBanner(null);
      setZoomedPhoto(null);
      setControlState((prev) => ({
        ...prev,
        exploded: false,
        selectedObjectIndex: -1,
        cadWireframe: false,
        cncAxesVisible: false,
      }));
    },
    [slideIndex],
  );

  const handleNext = useCallback(() => {
    navigateToIndex(nextSlideIndex(slideIndex, SLIDES.length));
  }, [navigateToIndex, slideIndex]);

  const handlePrev = useCallback(() => {
    navigateToIndex(prevSlideIndex(slideIndex, SLIDES.length));
  }, [navigateToIndex, slideIndex]);

  const handleToggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await (deckRootRef.current ?? document.documentElement).requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen denial in restricted iframe/headless contexts
    }
  }, []);

  const handleUpdateControl = useCallback((patch: Partial<SceneControlState>) => {
    setControlState((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleSceneClickFeedback = useCallback(
    (result: SceneClickResult) => {
      if (typeof result.targetSlide === 'number') {
        navigateToIndex(result.targetSlide - 1);
        return;
      }
      if (typeof result.selectedIndex === 'number') {
        setControlState((prev) => ({
          ...prev,
          selectedObjectIndex:
            prev.selectedObjectIndex === result.selectedIndex ? -1 : result.selectedIndex!,
        }));
      }
      setFeedbackBanner(result);
    },
    [navigateToIndex],
  );

  // Auto-dismiss the 3D click feedback toast.
  useEffect(() => {
    if (!feedbackBanner) return;
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setFeedbackBanner(null), 4200);
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, [feedbackBanner]);

  useEffect(() => {
    document.body.dataset.slide = String(currentSlide.id);
    document.body.dataset.layout = currentSlide.layout;
  }, [currentSlide.id, currentSlide.layout]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement | null)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') {
        return;
      }

      if (e.key === 'Escape') {
        if (zoomedPhoto) {
          setZoomedPhoto(null);
          return;
        }
        if (overviewOpen) {
          setOverviewOpen(false);
          return;
        }
      }

      if (overviewOpen || zoomedPhoto) return;

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Home') {
        e.preventDefault();
        navigateToIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        navigateToIndex(SLIDES.length - 1);
      } else if (e.key === 'o' || e.key === 'O') {
        setOverviewOpen((v) => !v);
      } else if (e.key === 'f' || e.key === 'F') {
        handleToggleFullscreen();
      } else if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((v) => !v);
      } else if (/^\d$/.test(e.key)) {
        numericBufferRef.current = (numericBufferRef.current + e.key).slice(-2);
        if (numericTimerRef.current) window.clearTimeout(numericTimerRef.current);
        numericTimerRef.current = window.setTimeout(() => {
          numericBufferRef.current = '';
        }, 1600);
      } else if (e.key === 'Enter' && numericBufferRef.current.length > 0) {
        const idx = parseNumericJumpBuffer(numericBufferRef.current, SLIDES.length);
        numericBufferRef.current = '';
        if (idx !== null) navigateToIndex(idx);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [overviewOpen, zoomedPhoto, handleNext, handlePrev, navigateToIndex, handleToggleFullscreen]);

  const progressPct = ((slideIndex + 1) / SLIDES.length) * 100;

  return (
    <main
      ref={deckRootRef}
      data-testid="presentation-deck"
      data-slide-id={currentSlide.id}
      onTouchStart={(e) => {
        touchStartXRef.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchStartXRef.current === null) return;
        const dx = (e.changedTouches[0]?.clientX ?? touchStartXRef.current) - touchStartXRef.current;
        touchStartXRef.current = null;
        if (dx < -55) handleNext();
        else if (dx > 55) handlePrev();
      }}
      className="relative w-full h-full overflow-hidden select-none transition-colors duration-700"
      style={{
        backgroundColor: isDark
          ? '#3D3028'
          : currentSlide.theme === 'linen'
          ? '#F5EDE3'
          : currentSlide.theme === 'peach'
          ? '#FCEEE4'
          : '#FFF9F2',
      }}
    >
      {/* Top progress track */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 right-0 h-1 z-40"
        style={{ backgroundColor: isDark ? 'rgba(255,245,237,0.14)' : 'rgba(45,37,32,0.08)' }}
      >
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%`, backgroundColor: accentHex }}
        />
      </div>

      {/* Quiet top chrome: act label (left) & slide counter (right) */}
      <header className="pointer-events-none fixed top-3.5 left-5 right-5 sm:left-8 sm:right-8 z-30 flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold">
        <span
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${
            isDark
              ? 'text-[#EFE4DA] bg-[#2B211B]/55 border-[#FFF5ED]/12'
              : 'text-[#5C534B] bg-[#FFFFFF]/70 border-[#2D2520]/10'
          }`}
        >
          <span
            aria-hidden="true"
            className="anim-accent-pulse inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: accentHex }}
          />
          {ACT_LABELS[currentSlide.act] ?? currentSlide.actTitle}
        </span>

        <div className="flex items-center gap-2">
          {sceneUsesModels(currentSlide.sceneId) && (
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider ${
                isDark
                  ? 'text-[#FFF5ED]/85 bg-[#2B211B]/55 border-[#FFF5ED]/12'
                  : 'text-[#5C534B] bg-[#FFFFFF]/70 border-[#2D2520]/10'
              }`}
              title="Cảnh này có mô hình 3D thật — kéo để xoay"
            >
              <Box className="w-3.5 h-3.5" style={{ color: accentHex }} />
              3D
            </span>
          )}
          <span
            data-testid="slide-counter"
            className={`t-mono font-bold px-3 py-1 rounded-full border ${
              isDark
                ? 'text-[#FFF5ED] bg-[#2B211B]/55 border-[#FFF5ED]/12'
                : 'text-[#2D2520] bg-[#FFFFFF]/70 border-[#2D2520]/10'
            }`}
          >
            {formatSlideCounter(slideIndex, SLIDES.length)}
          </span>
        </div>
      </header>

      {/* Full-bleed 3D WebGL stage */}
      <SlideStage
        slide={currentSlide}
        navDirection={navDirection}
        controlState={controlState}
        onSceneClickFeedback={handleSceneClickFeedback}
      />

      {/* Semantic Vietnamese slide content overlay */}
      <SlideOverlay
        slide={currentSlide}
        transitionType={transitionType}
        navDirection={navDirection}
        controlState={controlState}
        feedbackBanner={feedbackBanner}
        onUpdateControl={handleUpdateControl}
        onJumpToSlide={(targetSlideId) => navigateToIndex(targetSlideId - 1)}
        onInspectPhoto={(photo) => setZoomedPhoto(photo)}
      />

      {/* Compact collapsible bottom control dock */}
      <BottomDock
        slide={currentSlide}
        slideIndex={slideIndex}
        totalSlides={SLIDES.length}
        collapsed={dockCollapsed}
        isFullscreen={isFullscreen}
        controlState={controlState}
        onToggleCollapse={() => setDockCollapsed((v) => !v)}
        onPrev={handlePrev}
        onNext={handleNext}
        onOpenOverview={() => setOverviewOpen(true)}
        onToggleFullscreen={handleToggleFullscreen}
        onUpdateControl={handleUpdateControl}
      />

      {/* 23-slide overview grid */}
      <OverviewModal
        open={overviewOpen}
        slides={SLIDES}
        currentIndex={slideIndex}
        onSelectSlide={(idx) => navigateToIndex(idx)}
        onClose={() => setOverviewOpen(false)}
      />

      {/* Interactive real-world photo lightbox */}
      {zoomedPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={zoomedPhoto.caption}
          data-testid="photo-lightbox"
          onClick={() => setZoomedPhoto(null)}
          className="fixed inset-0 z-50 bg-[#1A1410]/88 flex items-center justify-center p-4 sm:p-8"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="anim-photo-modal relative max-w-4xl w-full rounded-2xl overflow-hidden border border-[#FFF5ED]/20 bg-[#2B211B] shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setZoomedPhoto(null)}
              aria-label="Đóng ảnh phóng to"
              className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-[#1A1410]/82 text-[#FFF5ED] text-xs sm:text-sm font-semibold border border-[#FFF5ED]/20 hover:bg-[#E87B5A] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Đóng (Esc)</span>
            </button>
            <div className="bg-[#1D1612] flex items-center justify-center max-h-[76vh]">
              <img
                src={zoomedPhoto.src}
                alt={zoomedPhoto.caption}
                className="w-full max-h-[76vh] object-contain"
              />
            </div>
            <div className="px-5 py-3.5 bg-[#2B211B] border-t border-[#FFF5ED]/12">
              <p className="text-sm sm:text-base font-medium text-[#FFF5ED]">
                {zoomedPhoto.caption}
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
