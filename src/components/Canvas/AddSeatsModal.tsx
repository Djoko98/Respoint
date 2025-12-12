import React, { useMemo, useState } from 'react';
import Modal from '../common/Modal';
import { useLanguage } from '../../context/LanguageContext';

interface AddSeatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (guides: {
    top?: number; right?: number; bottom?: number; left?: number;
    topVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
    rightVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
    bottomVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
    leftVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
    cornerTL?: boolean; cornerTR?: boolean; cornerBR?: boolean; cornerBL?: boolean;
    cornerTLVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
    cornerTRVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
    cornerBRVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
    cornerBLVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
    circleCount?: number;
    circleStartDeg?: number;
    circleVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
    circleVariants?: Array<'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU'>;
    // New optional overrides
    chairWidthPx?: number;
    chairHeightPx?: number;
    chairSpacingPx?: number;
    // Per-seat sizes per side
    topSeatSizes?: Array<{ w?: number; h?: number }>;
    rightSeatSizes?: Array<{ w?: number; h?: number }>;
    bottomSeatSizes?: Array<{ w?: number; h?: number }>;
    leftSeatSizes?: Array<{ w?: number; h?: number }>;
    // Per-corner explicit sizes
    cornerTLWidthPx?: number; cornerTLHeightPx?: number;
    cornerTRWidthPx?: number; cornerTRHeightPx?: number;
    cornerBRWidthPx?: number; cornerBRHeightPx?: number;
    cornerBLWidthPx?: number; cornerBLHeightPx?: number;
    // Per-seat sizes for circular tables
    circleSeatSizes?: Array<{ w?: number; h?: number }>;
  }) => void;
  table: {
    id: string;
    type?: 'rectangle' | 'circle' | 'chair';
    width?: number;
    height?: number;
    rotation?: number;
    chairGuides?: {
      top?: number; right?: number; bottom?: number; left?: number;
      topVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
      rightVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
      bottomVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
      leftVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
      cornerTL?: boolean; cornerTR?: boolean; cornerBR?: boolean; cornerBL?: boolean;
      cornerTLVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
      cornerTRVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
      cornerBRVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
      cornerBLVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
      circleCount?: number; circleStartDeg?: number; circleVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU'; circleVariants?: Array<'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU'>;
      // Optional overrides mirrored from onSave
      chairWidthPx?: number; chairHeightPx?: number; chairSpacingPx?: number;
      topSeatSizes?: Array<{ w?: number; h?: number }>;
      rightSeatSizes?: Array<{ w?: number; h?: number }>;
      bottomSeatSizes?: Array<{ w?: number; h?: number }>;
      leftSeatSizes?: Array<{ w?: number; h?: number }>;
      cornerTLWidthPx?: number; cornerTLHeightPx?: number;
      cornerTRWidthPx?: number; cornerTRHeightPx?: number;
      cornerBRWidthPx?: number; cornerBRHeightPx?: number;
      cornerBLWidthPx?: number; cornerBLHeightPx?: number;
    };
  } | null;
}

const GRID_BG_DARK = `
  linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
  linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)
`;
const GRID_BG_LIGHT = `
  linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
  linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)
`;

type SimpleOption = { value: string; label: string };

interface VariantDropdownProps {
  value: string;
  options: SimpleOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  isLight: boolean;
  getOptionDisabled?: (value: string) => boolean;
}

const VariantDropdown: React.FC<VariantDropdownProps> = ({
  value,
  options,
  onChange,
  disabled,
  isLight,
  getOptionDisabled,
}) => {
  const [open, setOpen] = React.useState(false);
  const [openUp, setOpenUp] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const selected = options.find(o => o.value === value) || options[0];

  // Close when clicking outside
  React.useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      const node = containerRef.current;
      if (!node) return;
      if (event.target instanceof Node && !node.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const baseEnabled =
    isLight
      ? 'bg-white border-gray-300 text-gray-900 hover:border-blue-400 hover:text-blue-500'
      : 'bg-[#0A1929] border-gray-800 text-gray-100 hover:border-blue-400 hover:text-blue-400';

  const baseDisabled =
    isLight
      ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
      : 'bg-[#020617] border-gray-800 text-gray-500 cursor-not-allowed';

  return (
    <div ref={containerRef} className="relative inline-block text-xs w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen(prev => {
            const next = !prev;
            if (!next) return next;
            try {
              const node = containerRef.current;
              if (node && typeof window !== 'undefined') {
                const rect = node.getBoundingClientRect();

                // Pronađi najbližeg scrollable roditelja (overflow-y: auto/scroll)
                let scrollParent: HTMLElement | null = null;
                let el: HTMLElement | null = node.parentElement;
                while (el) {
                  const style = window.getComputedStyle(el);
                  const overflowY = style.overflowY;
                  if (overflowY === 'auto' || overflowY === 'scroll') {
                    scrollParent = el;
                    break;
                  }
                  el = el.parentElement;
                }

                const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
                let topLimit = 0;
                let bottomLimit = viewportHeight;
                if (scrollParent) {
                  const spRect = scrollParent.getBoundingClientRect();
                  topLimit = spRect.top;
                  bottomLimit = spRect.bottom;
                }

                const spaceBelow = bottomLimit - rect.bottom;
                const spaceAbove = rect.top - topLimit;

                // Procena visine menija prema broju opcija (oko 32px po stavci + padding),
                // sa gornjom granicom da ne preteramo.
                const estimatedMenuHeight = Math.min(260, options.length * 32 + 16);
                const margin = 8;
                const canOpenDown = spaceBelow >= estimatedMenuHeight + margin;
                const canOpenUp = spaceAbove >= estimatedMenuHeight + margin;
                if (canOpenDown || (!canOpenUp && spaceBelow >= spaceAbove)) {
                  setOpenUp(false);
                } else if (canOpenUp) {
                  setOpenUp(true);
                } else {
                  // Nema dovoljno prostora ni gore ni dole – biraj smer sa više mesta.
                  setOpenUp(spaceAbove > spaceBelow);
                }
              } else {
                setOpenUp(false);
              }
            } catch {
              setOpenUp(false);
            }
            return next;
          });
        }}
        className={
          'w-full px-2.5 py-1.5 rounded border flex items-center justify-between gap-2 transition-colors ' +
          (disabled ? baseDisabled : baseEnabled)
        }
      >
        <span className="truncate">{selected?.label}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && !disabled && (
        <div
          className={
            'absolute z-30 w-full rounded-md border shadow-lg ' +
            (openUp ? 'bottom-full mb-1 ' : 'top-full mt-1 ') +
            (isLight ? 'bg-white border-gray-200' : 'bg-[#020617] border-gray-800')
          }
        >
          <div className="max-h-64 overflow-y-auto statistics-scrollbar py-1">
            {options.map(opt => {
              const isSelected = opt.value === value;
              const isDisabled = !!getOptionDisabled?.(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isDisabled}
                  className={
                    'w-full px-2.5 py-1.5 text-left text-[11px] flex items-center justify-between gap-2 transition-colors ' +
                    (isDisabled
                      ? (isLight ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 cursor-not-allowed')
                      : isSelected
                        ? (isLight ? 'bg-blue-50 text-blue-600 font-medium' : 'bg-blue-500/10 text-blue-300 font-medium')
                        : (isLight ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-200 hover:bg-[#0B1D33]'))
                  }
                  onClick={() => {
                    if (isDisabled) return;
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const AddSeatsModal: React.FC<AddSeatsModalProps> = ({ isOpen, onClose, onSave, table }) => {
  const { t, currentLanguage } = useLanguage();
  const isSR = currentLanguage === 'srb' || (typeof currentLanguage === 'string' && (currentLanguage as any).startsWith?.('sr'));
  const isLight = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light';
  const mutedTextClass = isLight ? 'text-gray-600' : 'text-gray-300';
  const labelTextClass = isLight ? 'text-gray-800' : 'text-gray-200';
  const smallBtnClass = isLight
    ? 'px-1.5 py-0.5 text-xs rounded bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300'
    : 'px-1.5 py-0.5 text-xs rounded bg-gray-700 hover:bg-gray-600 text-white border border-gray-600';
  const numberInputClass = isLight
    ? 'w-12 px-1 py-0.5 text-xs rounded bg-white border border-gray-300 text-center text-gray-900'
    : 'w-12 px-1 py-0.5 text-xs rounded bg-gray-800 border border-gray-700 text-center';
  // Match Guestbook footer buttons
  const saveBtnClass = 'px-4 py-1.5 text-blue-400 text-sm rounded hover:bg-blue-500/10 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed';
  const cancelBtnClass = isLight
    ? 'px-3 py-1.5 text-gray-700 text-sm rounded hover:bg-gray-100 transition-colors'
    : 'px-3 py-1.5 text-gray-300 text-sm rounded hover:bg-gray-800 transition-colors';
  // Grid constants for capacity calculation
  const GRID = 10;
  const CHAIR_SPAN = 3; // cells along table edge for standard chair
  const GAP = 1;        // one grid cell gap between chairs
  const initial = table?.chairGuides || {};
  const [top, setTop] = useState<number>(initial.top || 0);
  const [right, setRight] = useState<number>(initial.right || 0);
  const [bottom, setBottom] = useState<number>(initial.bottom || 0);
  const [left, setLeft] = useState<number>(initial.left || 0);
  // Per-side variants (default 'standard')
  const [topVariant, setTopVariant] = useState<'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU'>(initial.topVariant || 'standard');
  const [rightVariant, setRightVariant] = useState<'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU'>(initial.rightVariant || 'standard');
  const [bottomVariant, setBottomVariant] = useState<'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU'>(initial.bottomVariant || 'standard');
  const [leftVariant, setLeftVariant] = useState<'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU'>(initial.leftVariant || 'standard');
  const [cornerTL, setCornerTL] = useState<boolean>(!!initial.cornerTL);
  const [cornerTR, setCornerTR] = useState<boolean>(!!initial.cornerTR);
  const [cornerBR, setCornerBR] = useState<boolean>(!!initial.cornerBR);
  const [cornerBL, setCornerBL] = useState<boolean>(!!initial.cornerBL);
  const [cornerTLVariant, setCornerTLVariant] = useState<'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU'>(initial.cornerTLVariant || 'standard');
  const [cornerTRVariant, setCornerTRVariant] = useState<'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU'>(initial.cornerTRVariant || 'standard');
  const [cornerBRVariant, setCornerBRVariant] = useState<'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU'>(initial.cornerBRVariant || 'standard');
  const [cornerBLVariant, setCornerBLVariant] = useState<'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU'>(initial.cornerBLVariant || 'standard');
  // Circle-specific
  const [circleCount, setCircleCount] = useState<number>(initial.circleCount || 0);
  const [circleStartDeg, setCircleStartDeg] = useState<number>(initial.circleStartDeg || 0);
  const [circleVariant, setCircleVariant] = useState<'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU'>(initial.circleVariant || 'standard');
  const [circleVariants, setCircleVariants] = useState<Array<'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU'>>(
    Array.from({ length: initial.circleCount || 0 }, (_, i) => (initial as any).circleVariants?.[i] || (initial.circleVariant || 'standard'))
  );
  const initialBoothEnabled = useMemo(
    () => (initial as any).circleVariants?.some((v: any) => v === 'boothCurved' || v === 'boothU') || false,
    []
  );
  const [circleBoothEnabled, setCircleBoothEnabled] = useState<boolean>(initialBoothEnabled);
  // Global chair size and spacing (applies to all non-booth variants)
  const [chairWidthPx, setChairWidthPx] = useState<number>(
    Number.isFinite((initial as any).chairWidthPx) ? Number((initial as any).chairWidthPx) : GRID * 3
  );
  const [chairHeightPx, setChairHeightPx] = useState<number>(
    Number.isFinite((initial as any).chairHeightPx) ? Number((initial as any).chairHeightPx) : GRID * 1
  );
  const [chairSpacingPx, setChairSpacingPx] = useState<number>(
    Number.isFinite((initial as any).chairSpacingPx) ? Number((initial as any).chairSpacingPx) : GRID * 0.5
  );
  // Per-seat size overrides (stored in px, index-aligned with seats on that side)
  const [topSeatSizes, setTopSeatSizes] = useState<Array<{ w?: number; h?: number }>>(initial.topSeatSizes || []);
  const [rightSeatSizes, setRightSeatSizes] = useState<Array<{ w?: number; h?: number }>>(initial.rightSeatSizes || []);
  const [bottomSeatSizes, setBottomSeatSizes] = useState<Array<{ w?: number; h?: number }>>(initial.bottomSeatSizes || []);
  const [leftSeatSizes, setLeftSeatSizes] = useState<Array<{ w?: number; h?: number }>>(initial.leftSeatSizes || []);
  // Per-corner explicit sizes (px)
  const [cornerTLWidthPx, setCornerTLWidthPx] = useState<number | undefined>((initial as any).cornerTLWidthPx);
  const [cornerTLHeightPx, setCornerTLHeightPx] = useState<number | undefined>((initial as any).cornerTLHeightPx);
  const [cornerTRWidthPx, setCornerTRWidthPx] = useState<number | undefined>((initial as any).cornerTRWidthPx);
  const [cornerTRHeightPx, setCornerTRHeightPx] = useState<number | undefined>((initial as any).cornerTRHeightPx);
  const [cornerBRWidthPx, setCornerBRWidthPx] = useState<number | undefined>((initial as any).cornerBRWidthPx);
  const [cornerBRHeightPx, setCornerBRHeightPx] = useState<number | undefined>((initial as any).cornerBRHeightPx);
  const [cornerBLWidthPx, setCornerBLWidthPx] = useState<number | undefined>((initial as any).cornerBLWidthPx);
  const [cornerBLHeightPx, setCornerBLHeightPx] = useState<number | undefined>((initial as any).cornerBLHeightPx);
  // Circular tables – per-seat sizes
  const [circleSeatSizes, setCircleSeatSizes] = useState<Array<{ w?: number; h?: number }>>(
    (initial as any).circleSeatSizes || []
  );
  const [initialSnapshot, setInitialSnapshot] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);
  type SelectedSeat =
    | { kind: 'side'; side: 'top' | 'right' | 'bottom' | 'left'; index: number }
    | { kind: 'corner'; corner: 'tl' | 'tr' | 'br' | 'bl' }
    | { kind: 'circle'; index: number };
  const [selectedSeat, setSelectedSeat] = useState<SelectedSeat | null>(null);

  // Sync local state when modal opens or when a different table is targeted, or when table size/rotation changes
  React.useEffect(() => {
    const init = table?.chairGuides || {};
    const isCircle = table?.type === 'circle';
    const normalizeCircleVariant = (v?: any): 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU' => {
      const base = (v || 'standard') as any;
      // On circular tables allow only semi-circular booth, not U-booth
      if (base === 'boothU') return 'boothCurved';
      return base;
    };
    const normalizeRectSideVariant = (v?: any): 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU' => {
      const base = (v || 'standard') as any;
      // On rectangular table sides allow U-booth (map any curved to U)
      if (base === 'boothCurved') return 'boothU';
      return base;
    };
    const normalizeRectCornerVariant = (v?: any): 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU' => {
      const base = (v || 'standard') as any;
      // On corners we DO NOT allow U-booth – fall back to standard
      if (base === 'boothU') return 'standard';
      if (base === 'boothCurved') return 'standard';
      return base;
    };

    setTop(init.top || 0);
    setRight(init.right || 0);
    setBottom(init.bottom || 0);
    setLeft(init.left || 0);
    setTopVariant(isCircle ? 'standard' : normalizeRectSideVariant(init.topVariant));
    setRightVariant(isCircle ? 'standard' : normalizeRectSideVariant(init.rightVariant));
    setBottomVariant(isCircle ? 'standard' : normalizeRectSideVariant(init.bottomVariant));
    setLeftVariant(isCircle ? 'standard' : normalizeRectSideVariant(init.leftVariant));
    setCornerTL(!!init.cornerTL);
    setCornerTR(!!init.cornerTR);
    setCornerBR(!!init.cornerBR);
    setCornerBL(!!init.cornerBL);
    setCornerTLVariant(isCircle ? 'standard' : normalizeRectCornerVariant(init.cornerTLVariant));
    setCornerTRVariant(isCircle ? 'standard' : normalizeRectCornerVariant(init.cornerTRVariant));
    setCornerBRVariant(isCircle ? 'standard' : normalizeRectCornerVariant(init.cornerBRVariant));
    setCornerBLVariant(isCircle ? 'standard' : normalizeRectCornerVariant(init.cornerBLVariant));

    const baseCircleVariant = normalizeCircleVariant(init.circleVariant);
    const cCount = init.circleCount || 0;
    setCircleCount(cCount);
    setCircleStartDeg(init.circleStartDeg || 0);
    setCircleVariant(isCircle ? baseCircleVariant : normalizeRectSideVariant(init.circleVariant));
    setCircleVariants(
      Array.from({ length: cCount }, (_: any, i: number) =>
        isCircle
          ? normalizeCircleVariant(init.circleVariants?.[i] || baseCircleVariant)
          : normalizeRectSideVariant(init.circleVariants?.[i] || init.circleVariant || 'standard')
      )
    );
    setChairWidthPx(Number.isFinite((init as any).chairWidthPx) ? Number((init as any).chairWidthPx) : GRID * 3);
    setChairHeightPx(Number.isFinite((init as any).chairHeightPx) ? Number((init as any).chairHeightPx) : GRID * 1);
    setChairSpacingPx(Number.isFinite((init as any).chairSpacingPx) ? Number((init as any).chairSpacingPx) : GRID * 0.5);
    setTopSeatSizes((init as any).topSeatSizes || []);
    setRightSeatSizes((init as any).rightSeatSizes || []);
    setBottomSeatSizes((init as any).bottomSeatSizes || []);
    setLeftSeatSizes((init as any).leftSeatSizes || []);
    setCornerTLWidthPx((init as any).cornerTLWidthPx);
    setCornerTLHeightPx((init as any).cornerTLHeightPx);
    setCornerTRWidthPx((init as any).cornerTRWidthPx);
    setCornerTRHeightPx((init as any).cornerTRHeightPx);
    setCornerBRWidthPx((init as any).cornerBRWidthPx);
    setCornerBRHeightPx((init as any).cornerBRHeightPx);
    setCornerBLWidthPx((init as any).cornerBLWidthPx);
    setCornerBLHeightPx((init as any).cornerBLHeightPx);
    setCircleSeatSizes((init as any).circleSeatSizes || []);
    setSelectedSeat(null);

    // Take a snapshot of normalized state to track changes
    const snapshot = JSON.stringify({
      top: init.top || 0,
      right: init.right || 0,
      bottom: init.bottom || 0,
      left: init.left || 0,
      topVariant: isCircle ? 'standard' : normalizeRectSideVariant(init.topVariant),
      rightVariant: isCircle ? 'standard' : normalizeRectSideVariant(init.rightVariant),
      bottomVariant: isCircle ? 'standard' : normalizeRectSideVariant(init.bottomVariant),
      leftVariant: isCircle ? 'standard' : normalizeRectSideVariant(init.leftVariant),
      cornerTL: !!init.cornerTL,
      cornerTR: !!init.cornerTR,
      cornerBR: !!init.cornerBR,
      cornerBL: !!init.cornerBL,
      cornerTLVariant: isCircle ? 'standard' : normalizeRectCornerVariant(init.cornerTLVariant),
      cornerTRVariant: isCircle ? 'standard' : normalizeRectCornerVariant(init.cornerTRVariant),
      cornerBRVariant: isCircle ? 'standard' : normalizeRectCornerVariant(init.cornerBRVariant),
      cornerBLVariant: isCircle ? 'standard' : normalizeRectCornerVariant(init.cornerBLVariant),
      circleCount: isCircle ? (init.circleCount || 0) : 0,
      circleStartDeg: isCircle ? (init.circleStartDeg || 0) : 0,
      circleVariant: isCircle ? baseCircleVariant : 'standard',
      circleVariants: isCircle
        ? Array.from({ length: cCount }, (_: any, i: number) =>
            normalizeCircleVariant(init.circleVariants?.[i] || baseCircleVariant)
          )
        : [],
      chairWidthPx: Number.isFinite((init as any).chairWidthPx) ? Number((init as any).chairWidthPx) : GRID * 3,
      chairHeightPx: Number.isFinite((init as any).chairHeightPx) ? Number((init as any).chairHeightPx) : GRID * 1,
      chairSpacingPx: Number.isFinite((init as any).chairSpacingPx) ? Number((init as any).chairSpacingPx) : GRID * 0.5,
      topSeatSizes: (init as any).topSeatSizes || [],
      rightSeatSizes: (init as any).rightSeatSizes || [],
      bottomSeatSizes: (init as any).bottomSeatSizes || [],
      leftSeatSizes: (init as any).leftSeatSizes || [],
      cornerTLWidthPx: (init as any).cornerTLWidthPx,
      cornerTLHeightPx: (init as any).cornerTLHeightPx,
      cornerTRWidthPx: (init as any).cornerTRWidthPx,
      cornerTRHeightPx: (init as any).cornerTRHeightPx,
      cornerBRWidthPx: (init as any).cornerBRWidthPx,
      cornerBRHeightPx: (init as any).cornerBRHeightPx,
      cornerBLWidthPx: (init as any).cornerBLWidthPx,
      cornerBLHeightPx: (init as any).cornerBLHeightPx,
      circleSeatSizes: (init as any).circleSeatSizes || []
    });
    setInitialSnapshot(snapshot);
    setHasChanges(false);
  }, [isOpen, table?.id, table?.width, table?.height, table?.rotation]);

  // Derived change detection
  const currentSnapshot = JSON.stringify({
    top,
    right,
    bottom,
    left,
    topVariant,
    rightVariant,
    bottomVariant,
    leftVariant,
    cornerTL,
    cornerTR,
    cornerBR,
    cornerBL,
    cornerTLVariant,
    cornerTRVariant,
    cornerBRVariant,
    cornerBLVariant,
    circleCount: table?.type === 'circle' ? circleCount : 0,
    circleStartDeg: table?.type === 'circle' ? circleStartDeg : 0,
    circleVariant: table?.type === 'circle' ? circleVariant : 'standard',
    circleVariants: table?.type === 'circle' ? circleVariants : [],
    chairWidthPx,
    chairHeightPx,
    chairSpacingPx,
    topSeatSizes,
    rightSeatSizes,
    bottomSeatSizes,
    leftSeatSizes,
    cornerTLWidthPx,
    cornerTLHeightPx,
    cornerTRWidthPx,
    cornerTRHeightPx,
    cornerBRWidthPx,
    cornerBRHeightPx,
    cornerBLWidthPx,
    cornerBLHeightPx,
    circleSeatSizes
  });

  React.useEffect(() => {
    if (!initialSnapshot) {
      setHasChanges(false);
      return;
    }
    setHasChanges(currentSnapshot !== initialSnapshot);
  }, [currentSnapshot, initialSnapshot]);

  // If counts or enabled corners change such that the selected seat no longer exists, clear selection
  React.useEffect(() => {
    if (!selectedSeat) return;
    if (selectedSeat.kind === 'side') {
      const count =
        selectedSeat.side === 'top' ? top
        : selectedSeat.side === 'right' ? right
        : selectedSeat.side === 'bottom' ? bottom
        : left;
      if ((selectedSeat.index ?? 0) >= (count || 0)) {
        setSelectedSeat(null);
      }
    } else if (selectedSeat.kind === 'circle') {
      if (selectedSeat.index >= (circleCount || 0)) {
        setSelectedSeat(null);
      }
    } else if (selectedSeat.kind === 'corner') {
      const enabled =
        selectedSeat.corner === 'tl' ? cornerTL
        : selectedSeat.corner === 'tr' ? cornerTR
        : selectedSeat.corner === 'br' ? cornerBR
        : cornerBL;
      if (!enabled) {
        setSelectedSeat(null);
      }
    }
  }, [selectedSeat, top, right, bottom, left, circleCount, cornerTL, cornerTR, cornerBR, cornerBL]);

  // Capacity calculation (per side).
  // Za pravougaone stolove koristimo realnu širinu + razmak između stolica,
  // tako da se stolice ne preklapaju i da veće stolice smanjuju kapacitet.
  const tableWCells = Math.round(Math.max(1, (table?.width || GRID * 6)) / GRID);
  const tableHCells = Math.round(Math.max(1, (table?.height || GRID * 4)) / GRID);

  const computeMaxForSide = (
    side: 'top' | 'right' | 'bottom' | 'left',
    widthPx: number,
    heightPx: number,
    spacingPx: number,
    vTop: typeof topVariant,
    vRight: typeof rightVariant,
    vBottom: typeof bottomVariant,
    vLeft: typeof leftVariant
  ) => {
    const alongCells = (side === 'top' || side === 'bottom') ? tableWCells : tableHCells;
    const alongPx = alongCells * GRID;
    const baseWidthPx = widthPx || GRID * 3;
    const baseHeightPx = heightPx || GRID * 1;
    const variantForSide =
      side === 'top' ? vTop
      : side === 'right' ? vRight
      : side === 'bottom' ? vBottom
      : vLeft;

    // Ako je U / polukružni separe na pravougaonoj strani – dozvoli bar 1 element,
    // ali nikada više, jer geometrijski zauzima celu stranu.
    if (variantForSide === 'boothCurved' || variantForSide === 'boothU') {
      return alongPx > 0 ? 1 : 0;
    }

    // Efektivna širina jedne stolice duž stranice:
    let spanPxAlong: number;
    switch (variantForSide) {
      case 'barstool':
        spanPxAlong = Math.max(baseWidthPx, baseHeightPx);
        break;
      default:
        spanPxAlong = baseWidthPx;
        break;
    }
    const gapPx = Math.max(0, spacingPx || 0);
    // Pakovanje bez preklapanja za raspored koji koristi:
    //   step = (L - (N-1)*gap) / (N+1)
    //   Δcentar = step + gap
    // Uslov bez preklapanja: Δcentar >= span  =>
    //   step + gap >= span  =>
    //   (L - (N-1)*gap)/(N+1) + gap >= span  =>
    //   N <= (L + 2*gap) / span - 1
    if (spanPxAlong <= 0) return 0;
    const raw = (alongPx + 2 * gapPx) / spanPxAlong - 1;
    return Math.max(0, Math.floor(raw));
  };

  const maxFor = (side: 'top' | 'right' | 'bottom' | 'left') =>
    computeMaxForSide(
      side,
      chairWidthPx,
      chairHeightPx,
      chairSpacingPx,
      topVariant,
      rightVariant,
      bottomVariant,
      leftVariant
    );
  const maxTop = maxFor('top');
  const maxRight = maxFor('right');
  const maxBottom = maxFor('bottom');
  const maxLeft = maxFor('left');

  // For rectangular tables, detect if postoji jedan aktivan U separe
  // i koje strane stola on "zauzima" (uvek ukupno tri strane).
  const activeRectUSide: 'top' | 'right' | 'bottom' | 'left' | null =
    table?.type === 'circle'
      ? null
      : (() => {
          if (topVariant === 'boothU' && (top || 0) > 0) return 'top';
          if (rightVariant === 'boothU' && (right || 0) > 0) return 'right';
          if (bottomVariant === 'boothU' && (bottom || 0) > 0) return 'bottom';
          if (leftVariant === 'boothU' && (left || 0) > 0) return 'left';
          return null;
        })();

  const rectUSideOccupies = (side: 'top' | 'right' | 'bottom' | 'left'): boolean => {
    if (!activeRectUSide) return false;
    if (side === activeRectUSide) return true;
    // U na gornjoj/donjoj strani koristi i levo i desno
    if (activeRectUSide === 'top' || activeRectUSide === 'bottom') {
      return side === 'left' || side === 'right';
    }
    // U na levoj/desnoj strani koristi i gore i dole
    if (activeRectUSide === 'left' || activeRectUSide === 'right') {
      return side === 'top' || side === 'bottom';
    }
    return false;
  };

  // Ako je broj stolica na pravougaonoj strani 0 ili je strana zauzeta U separeom,
  // resetuj varijantu na "standard" (da disabled dropdown uvek bude na default).
  React.useEffect(() => {
    if (table?.type === 'circle') return;
    const sides: Array<{
      name: 'top' | 'right' | 'bottom' | 'left';
      count: number;
      variant: typeof topVariant;
      setter: (v: typeof topVariant) => void;
    }> = [
      { name: 'top', count: top || 0, variant: topVariant, setter: setTopVariant },
      { name: 'right', count: right || 0, variant: rightVariant, setter: setRightVariant },
      { name: 'bottom', count: bottom || 0, variant: bottomVariant, setter: setBottomVariant },
      { name: 'left', count: left || 0, variant: leftVariant, setter: setLeftVariant },
    ];
    sides.forEach(({ name, count, variant, setter }) => {
      const occupiedByU = !!activeRectUSide && rectUSideOccupies(name) && activeRectUSide !== name;
      if ((count <= 0 || occupiedByU) && variant !== 'standard') {
        setter('standard');
      }
    });
  }, [table?.type, top, right, bottom, left, topVariant, rightVariant, bottomVariant, leftVariant, activeRectUSide]);

  // Provera da li globalno povećanje W/H stolica još uvek dozvoljava
  // trenutni broj stolica po svakoj strani pravougaonog stola.
  const canApplyGlobalSizeChange = (deltaW: number, deltaH: number): boolean => {
    // Smanjenje veličine je uvek dozvoljeno.
    if (deltaW <= 0 && deltaH <= 0) return true;
    if (!table) return true;

    // Kružni sto – ograniči globalno povećanje širine tako da
    // stolice ne počnu da se preklapaju na slobodnom luku.
    if (table.type === 'circle') {
      // Visina (H) kod kružnog stola ne utiče na preklapanje po obodu.
      if (deltaW <= 0) return true;
      const baseW = chairWidthPx || GRID * 3;
      const newW = Math.max(4, baseW + deltaW);

      const count = circleCount || 0;
      if (count <= 0) return true;

      // Ako bi nova globalna širina bila veća nego što geometrija
      // dozvoljava za bilo koji slot, blokiramo povećanje.
      for (let i = 0; i < count; i++) {
        const allowed = clampCircleSeatWidth(i, newW);
        if (allowed + 0.0001 < newW) {
          return false;
        }
      }
      return true;
    }
    const newW = Math.max(4, (chairWidthPx || GRID * 3) + deltaW);
    const newH = Math.max(4, (chairHeightPx || GRID * 1) + deltaH);
    const spacingPx = Math.max(0, chairSpacingPx || 0);

    const newMaxTop = computeMaxForSide('top', newW, newH, spacingPx, topVariant, rightVariant, bottomVariant, leftVariant);
    const newMaxRight = computeMaxForSide('right', newW, newH, spacingPx, topVariant, rightVariant, bottomVariant, leftVariant);
    const newMaxBottom = computeMaxForSide('bottom', newW, newH, spacingPx, topVariant, rightVariant, bottomVariant, leftVariant);
    const newMaxLeft = computeMaxForSide('left', newW, newH, spacingPx, topVariant, rightVariant, bottomVariant, leftVariant);

    if ((top || 0) > newMaxTop) return false;
    if ((right || 0) > newMaxRight) return false;
    if ((bottom || 0) > newMaxBottom) return false;
    if ((left || 0) > newMaxLeft) return false;
    return true;
  };

  // Provera da li novo globalno povećanje razmaka između stolica
  // (Spacing) još uvek dozvoljava trenutni broj stolica po stranama.
  const canApplySpacingChange = (delta: number): boolean => {
    if (delta <= 0) return true;
    if (!table) return true;

    // Pravougaoni sto – postojeća logika po stranama.
    if (table.type !== 'circle') {
      const newSpacing = Math.max(0, (chairSpacingPx || 0) + delta);
      const newMaxTop = computeMaxForSide('top', chairWidthPx, chairHeightPx, newSpacing, topVariant, rightVariant, bottomVariant, leftVariant);
      const newMaxRight = computeMaxForSide('right', chairWidthPx, chairHeightPx, newSpacing, topVariant, rightVariant, bottomVariant, leftVariant);
      const newMaxBottom = computeMaxForSide('bottom', chairWidthPx, chairHeightPx, newSpacing, topVariant, rightVariant, bottomVariant, leftVariant);
      const newMaxLeft = computeMaxForSide('left', chairWidthPx, chairHeightPx, newSpacing, topVariant, rightVariant, bottomVariant, leftVariant);

      if ((top || 0) > newMaxTop) return false;
      if ((right || 0) > newMaxRight) return false;
      if ((bottom || 0) > newMaxBottom) return false;
      if ((left || 0) > newMaxLeft) return false;
      return true;
    }

    // Kružni sto – tretiramo "spacing" kao dodatni bezbedni razmak po luku:
    // povećavamo ga dokle god bi sve stolice mogle da stanu bez sudara
    // (koristimo istu geometriju kao za clampCircleSeatWidth).
    const count = circleCount || 0;
    if (count <= 0) return true;

    const newSpacing = Math.max(0, (chairSpacingPx || 0) + delta);

    for (let i = 0; i < count; i++) {
      const baseEntry = circleSeatSizes[i];
      const baseWidth = baseEntry && Number.isFinite(baseEntry.w as any)
        ? Math.max(4, Number(baseEntry.w))
        : Math.max(4, chairWidthPx);

      // Efektivna širina = osnovna širina + 2 * spacing (odstojanje levo/desno).
      const virtualWidth = baseWidth + 2 * newSpacing;
      const allowed = clampCircleSeatWidth(i, virtualWidth);
      if (allowed + 0.0001 < virtualWidth) {
        // Ako bi "teorijska" širina sa ovim spacing‑om probila geometriju,
        // ne dozvoljavamo dalje povećanje spacing‑a.
        return false;
      }
    }

    return true;
  };

  // Kada se menja veličina jedne stolice na pravougaonoj strani,
  // ograniči širinu tako da se ne preklapa sa susednim stolicama
  // (koristimo istu geometriju kao i autoGenerateChairsForTable).
  const clampSideSeatWidth = (
    side: 'top' | 'right' | 'bottom' | 'left',
    index: number,
    proposedWidthPx: number
  ): number => {
    if (!table || table.type === 'circle') return Math.max(4, proposedWidthPx);
    const count =
      side === 'top' ? (top || 0)
      : side === 'right' ? (right || 0)
      : side === 'bottom' ? (bottom || 0)
      : (left || 0);
    if (count <= 0) return Math.max(4, proposedWidthPx);

    const length =
      side === 'top' || side === 'bottom'
        ? Math.max(1, table.width || GRID * 6)
        : Math.max(1, table.height || GRID * 4);

    const spacingPx = Math.max(0, chairSpacingPx || 0);
    const step = (length - spacingPx * Math.max(0, count - 1)) / (count + 1);
    const centerDelta = step + spacingPx;

    const getSeatWidthAt = (idx: number): number => {
      if (idx < 0 || idx >= count) return chairWidthPx;
      const arr =
        side === 'top' ? topSeatSizes
        : side === 'right' ? rightSeatSizes
        : side === 'bottom' ? bottomSeatSizes
        : leftSeatSizes;
      const entry = Array.isArray(arr) ? arr[idx] : undefined;
      const w = entry && Number.isFinite(entry.w as any)
        ? Math.max(4, Number(entry.w))
        : Math.max(4, chairWidthPx);
      return w;
    };

    let maxAllowed = proposedWidthPx;
    const leftIdx = index - 1;
    const rightIdx = index + 1;

    if (leftIdx >= 0) {
      const wLeft = getSeatWidthAt(leftIdx);
      maxAllowed = Math.min(maxAllowed, 2 * centerDelta - wLeft);
    }
    if (rightIdx < count) {
      const wRight = getSeatWidthAt(rightIdx);
      maxAllowed = Math.min(maxAllowed, 2 * centerDelta - wRight);
    }

    // Ako su susedi već "preveliki" i izraz padne ispod minimuma,
    // ne dozvoljavamo dodatno širenje.
    return Math.max(4, maxAllowed);
  };

  // Ograničenje širine jedne stolice na kružnom stolu tako da se ne
  // preklapa sa susednim stolicama niti "ulazi" u polukružni separe.
  const clampCircleSeatWidth = (
    index: number,
    proposedWidthPx: number
  ): number => {
    if (!table || table.type !== 'circle') return Math.max(4, proposedWidthPx);
    const count = circleCount || 0;
    if (count <= 0) return Math.max(4, proposedWidthPx);

    const wPx = Math.max(1, table.width || GRID * 8);
    const hPx = Math.max(1, table.height || GRID * 8);
    const r = Math.max(wPx, hPx) / 2;
    if (r <= 0) return Math.max(4, proposedWidthPx);

    const n = Math.max(0, Math.min(64, Number(circleCount) || 0));
    const rawVariants: ChairVariant[] = Array.from(
      { length: n },
      (_, i) => (circleVariants[i] || circleVariant) as ChairVariant
    );
    const perSeat = applyCircleHalfArcRule(
      n,
      rawVariants,
      circleStartDeg || 0
    );

    // Centri separea (polukružni i U) određuju blokirane polovine kruga.
    const arcCenters: number[] = [];
    for (let i = 0; i < n; i++) {
      const v = perSeat[i];
      if (v === 'boothCurved' || v === 'boothU') {
        const angleDeg = (circleStartDeg || 0) + (360 * i / n);
        arcCenters.push(normalizeAngle(angleDeg));
      }
    }

    // Napravi intervale blokiranih lukova (±90° oko svakog separea).
    const blocked: Array<{ start: number; end: number }> = [];
    const pushInterval = (start: number, end: number) => {
      const s = normalizeAngle(start);
      const e = normalizeAngle(end);
      if (s === e) return;
      if (s < e) {
        blocked.push({ start: s, end: e });
      } else {
        blocked.push({ start: s, end: 360 });
        blocked.push({ start: 0, end: e });
      }
    };
    for (const c of arcCenters) {
      pushInterval(c - 90, c + 90);
    }
    if (blocked.length) {
      blocked.sort((a, b) => a.start - b.start);
    }

    // Slobodni lukovi = komplement blokiranih u [0, 360).
    const freeArcs: Array<{ start: number; end: number }> = [];
    if (!blocked.length) {
      freeArcs.push({ start: 0, end: 360 });
    } else {
      let cursor = 0;
      for (const iv of blocked) {
        if (iv.start > cursor) {
          freeArcs.push({ start: cursor, end: iv.start });
        }
        cursor = Math.max(cursor, iv.end);
      }
      if (cursor < 360) {
        freeArcs.push({ start: cursor, end: 360 });
      }
    }

    const totalFreeAngle = freeArcs.reduce((sum, iv) => sum + (iv.end - iv.start), 0);
    const totalFreeArcLen = (totalFreeAngle * Math.PI / 180) * r;

    // Broj "običnih" stolica (koje stoje na slobodnoj polovini).
    const m = perSeat.filter(v => v !== 'boothCurved' && v !== 'boothU').length;
    if (m <= 0 || totalFreeArcLen <= 0) return Math.max(4, proposedWidthPx);

    // U rasporedu koristimo šemu (m + 1) praznina na slobodnom luku,
    // pa je realno rastojanje centara susednih stolica približno:
    //   S ≈ totalFreeArcLen / (m + 1)
    // Da bismo sigurno izbegli preklapanje,
    // širina jedne stolice ne sme biti veća od S.
    const safeCenterArcLen = totalFreeArcLen / (m + 1);
    const maxAllowed = Math.min(proposedWidthPx, safeCenterArcLen);
    return Math.max(4, maxAllowed);
  };

  const preview = useMemo(() => {
    const w = Math.max(60, table?.width || 120);
    const h = Math.max(40, table?.height || 80);
    const rotDeg = (table?.rotation || 0) % 360;
    const rot = rotDeg * Math.PI / 180;
    // Compute rotated bounding box dimensions to ensure it fits the preview when rotated
    const rotatedW = table?.type === 'circle' ? w : Math.abs(w * Math.cos(rot)) + Math.abs(h * Math.sin(rot));
    const rotatedH = table?.type === 'circle' ? h : Math.abs(w * Math.sin(rot)) + Math.abs(h * Math.cos(rot));
    return { w, h, rotDeg, rotatedW, rotatedH };
  }, [table?.type, table?.width, table?.height, table?.rotation]);

  const handleSave = () => {
    // Clamp against computed maxima for rectangles; circles handled separately
    const clampedTop = table?.type === 'circle' ? 0 : Math.min(maxTop, Math.max(0, Number(top) || 0));
    const clampedRight = table?.type === 'circle' ? 0 : Math.min(maxRight, Math.max(0, Number(right) || 0));
    const clampedBottom = table?.type === 'circle' ? 0 : Math.min(maxBottom, Math.max(0, Number(bottom) || 0));
    const clampedLeft = table?.type === 'circle' ? 0 : Math.min(maxLeft, Math.max(0, Number(left) || 0));

    // Ako je postavljen U separe na nekoj strani pravougaonog stola,
    // on zauzima tri strane: baznu + dve susedne. Samo ta jedna strana
    // sme da ima count > 0 za U, ostale zauzete strane se čiste.
    let effTop = clampedTop;
    let effRight = clampedRight;
    let effBottom = clampedBottom;
    let effLeft = clampedLeft;
    let effTopVariant = topVariant;
    let effRightVariant = rightVariant;
    let effBottomVariant = bottomVariant;
    let effLeftVariant = leftVariant;

    if (table?.type === 'rectangle' && activeRectUSide) {
      const ensureAtLeastOne = (v: number) => (v <= 0 ? 1 : v);
      if (activeRectUSide === 'top') effTop = ensureAtLeastOne(effTop);
      if (activeRectUSide === 'right') effRight = ensureAtLeastOne(effRight);
      if (activeRectUSide === 'bottom') effBottom = ensureAtLeastOne(effBottom);
      if (activeRectUSide === 'left') effLeft = ensureAtLeastOne(effLeft);

      (['top', 'right', 'bottom', 'left'] as const).forEach((side) => {
        if (side === activeRectUSide) return;
        if (!rectUSideOccupies(side)) return;
        if (side === 'top') effTop = 0;
        if (side === 'right') effRight = 0;
        if (side === 'bottom') effBottom = 0;
        if (side === 'left') effLeft = 0;
      });

      // Uvek imamo najviše jedan U po stolu – ako je neka druga strana
      // ostala sa varijantom boothU, vrati je na standard.
      if (activeRectUSide !== 'top' && effTopVariant === 'boothU') effTopVariant = 'standard';
      if (activeRectUSide !== 'right' && effRightVariant === 'boothU') effRightVariant = 'standard';
      if (activeRectUSide !== 'bottom' && effBottomVariant === 'boothU') effBottomVariant = 'standard';
      if (activeRectUSide !== 'left' && effLeftVariant === 'boothU') effLeftVariant = 'standard';
    }
    // Circle capacity: limit by diameter in grid cells
    const circleMaxBySize = Math.round(Math.min(
      Math.round(Math.max(1, (table?.width || GRID * 8)) / GRID),
      Math.round(Math.max(1, (table?.height || GRID * 8)) / GRID)
    ));
    const requestedCircleCount = Math.max(0, Math.min(64, Number(circleCount) || 0));
    const finalCircleCount = table?.type === 'circle' ? Math.min(circleMaxBySize, requestedCircleCount) : 0;
    const rawFinalCircleVariants: ChairVariant[] = Array.from(
      { length: finalCircleCount },
      (_, i) => (circleVariants[i] || circleVariant) as ChairVariant
    );
    const clampSize = (v: number | undefined): number | undefined => {
      if (!Number.isFinite(v as any)) return undefined;
      const n = Math.max(4, Math.round(Number(v)));
      return n;
    };
    const buildPerSideSizes = (
      arr: Array<{ w?: number; h?: number }>,
      count: number
    ): Array<{ w?: number; h?: number }> | undefined => {
      const out: Array<{ w?: number; h?: number }> = [];
      for (let i = 0; i < count; i++) {
        const src = arr[i];
        if (!src) {
          out.push({});
          continue;
        }
        const w = clampSize(src.w);
        const h = clampSize(src.h);
        out.push({
          ...(w != null ? { w } : {}),
          ...(h != null ? { h } : {})
        });
      }
      if (!out.length) return undefined;
      if (out.every(e => e.w == null && e.h == null)) return undefined;
      return out;
    };
    const buildCircleSizes = (
      arr: Array<{ w?: number; h?: number }>,
      count: number
    ): Array<{ w?: number; h?: number }> | undefined => {
      return buildPerSideSizes(arr, count);
    };

    const topSizes = buildPerSideSizes(topSeatSizes, Math.max(0, Math.min(32, clampedTop)));
    const rightSizes = buildPerSideSizes(rightSeatSizes, Math.max(0, Math.min(32, clampedRight)));
    const bottomSizes = buildPerSideSizes(bottomSeatSizes, Math.max(0, Math.min(32, clampedBottom)));
    const leftSizes = buildPerSideSizes(leftSeatSizes, Math.max(0, Math.min(32, clampedLeft)));
    const circleSizes = buildCircleSizes(circleSeatSizes, finalCircleCount);

    onSave({
      top: Math.max(0, Math.min(32, effTop)),
      right: Math.max(0, Math.min(32, effRight)),
      bottom: Math.max(0, Math.min(32, effBottom)),
      left: Math.max(0, Math.min(32, effLeft)),
      topVariant: effTopVariant,
      rightVariant: effRightVariant,
      bottomVariant: effBottomVariant,
      leftVariant: effLeftVariant,
      cornerTL,
      cornerTR,
      cornerBR,
      cornerBL,
      cornerTLVariant,
      cornerTRVariant,
      cornerBRVariant,
      cornerBLVariant,
      chairWidthPx: Math.max(4, Math.round(Number(chairWidthPx) || GRID * 3)),
      chairHeightPx: Math.max(4, Math.round(Number(chairHeightPx) || GRID * 1)),
      chairSpacingPx: Math.max(0, Math.round(Number(chairSpacingPx) || GRID * 0.5)),
      // Persist per-seat and per-corner overrides where present
      topSeatSizes: topSizes,
      rightSeatSizes: rightSizes,
      bottomSeatSizes: bottomSizes,
      leftSeatSizes: leftSizes,
      cornerTLWidthPx: clampSize(cornerTLWidthPx),
      cornerTLHeightPx: clampSize(cornerTLHeightPx),
      cornerTRWidthPx: clampSize(cornerTRWidthPx),
      cornerTRHeightPx: clampSize(cornerTRHeightPx),
      cornerBRWidthPx: clampSize(cornerBRWidthPx),
      cornerBRHeightPx: clampSize(cornerBRHeightPx),
      cornerBLWidthPx: clampSize(cornerBLWidthPx),
      cornerBLHeightPx: clampSize(cornerBLHeightPx),
      ...(table?.type === 'circle'
        ? {
            circleCount: finalCircleCount,
            circleStartDeg: ((Number(circleStartDeg) % 360) + 360) % 360,
            circleVariant,
            circleVariants: applyCircleHalfArcRule(
              finalCircleCount,
              rawFinalCircleVariants,
              ((Number(circleStartDeg) % 360) + 360) % 360
            ),
            circleSeatSizes: circleSizes
          }
        : {})
    });
    onClose();
  };

  if (!table) return null;

  // Scale table into preview area using grid-true scaling (cell-based)
  const previewBoxRef = React.useRef<HTMLDivElement | null>(null);
  const [measuredW, setMeasuredW] = useState<number>(420);
  React.useEffect(() => {
    const measure = () => {
      if (previewBoxRef.current) {
        const w = previewBoxRef.current.clientWidth || 420;
        if (Math.abs(w - measuredW) > 1) setMeasuredW(w);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  const boxW = measuredW;
  const boxH = 300;
  const margin = 80;
  // Table size in grid cells
  const tableCellsW = Math.max(1, (table?.width || 120) / GRID);
  const tableCellsH = Math.max(1, (table?.height || 80) / GRID);
  // Rotated bounding-box in grid cells (approx)
  const rot = (table?.rotation || 0) * Math.PI / 180;
  const rotatedCellsW = table?.type === 'circle'
    ? tableCellsW
    : Math.abs(tableCellsW * Math.cos(rot)) + Math.abs(tableCellsH * Math.sin(rot));
  const rotatedCellsH = table?.type === 'circle'
    ? tableCellsH
    : Math.abs(tableCellsW * Math.sin(rot)) + Math.abs(tableCellsH * Math.cos(rot));
  // Include estimated chair thickness (in grid cells) so chairs don't overflow
  const GAP_CELLS = 0.15;
  const normalThicknessCells = (variant: string) => {
    switch (variant) {
      case 'barstool':
        return 3;
      case 'boothCurved':
        // Polukružni separe je nešto “deblji” od standarda u preview skaliranju
        return 3;
      case 'boothU':
        // U separe je znatno dublji – računaj više ćelija da sve stane u okvir preview‑a
        return 6;
      default:
        return 1;
    }
  };
  let extraCells = 0;
  if (table?.type === 'circle') {
    if ((circleCount || 0) > 0) {
      const n = Math.max(0, Number(circleCount) || 0);
      const perSeat = Array.from({ length: n }, (_, i) => circleVariants?.[i] || circleVariant);
      const hasBooth = perSeat.some(v => v === 'boothCurved' || v === 'boothU');
      const thick = hasBooth ? normalThicknessCells('boothU') : normalThicknessCells('standard');
      extraCells = Math.max(extraCells, thick / 2 + GAP_CELLS);
    }
  } else {
    // Sides: half thickness is enough, since they extend straight out
    if ((top || 0) > 0) extraCells = Math.max(extraCells, normalThicknessCells(topVariant) / 2 + GAP_CELLS);
    if ((bottom || 0) > 0) extraCells = Math.max(extraCells, normalThicknessCells(bottomVariant) / 2 + GAP_CELLS);
    if ((left || 0) > 0) extraCells = Math.max(extraCells, normalThicknessCells(leftVariant) / 2 + GAP_CELLS);
    if ((right || 0) > 0) extraCells = Math.max(extraCells, normalThicknessCells(rightVariant) / 2 + GAP_CELLS);
    // Corners: they go dijagonalno, pa uzmi celu debljinu da ne ispadnu iz preview okvira
    if (cornerTL) extraCells = Math.max(extraCells, normalThicknessCells(cornerTLVariant) + GAP_CELLS);
    if (cornerTR) extraCells = Math.max(extraCells, normalThicknessCells(cornerTRVariant) + GAP_CELLS);
    if (cornerBR) extraCells = Math.max(extraCells, normalThicknessCells(cornerBRVariant) + GAP_CELLS);
    if (cornerBL) extraCells = Math.max(extraCells, normalThicknessCells(cornerBLVariant) + GAP_CELLS);
  }
  const rotatedCellsWWithChairs = rotatedCellsW + 2 * extraCells;
  const rotatedCellsHWithChairs = rotatedCellsH + 2 * extraCells;
  // Choose preview cell size so everything fits with margins
  const baseCellPx = Math.min(
    (boxW - margin) / Math.max(1, rotatedCellsWWithChairs),
    (boxH - margin) / Math.max(1, rotatedCellsHWithChairs)
  );
  const zoomOut = 0.85; // slightly smaller for headroom
  const cellPx = baseCellPx * zoomOut;
  const drawW = tableCellsW * cellPx;
  const drawH = tableCellsH * cellPx;
  const gapEdge = Math.max(1, Math.round(cellPx * 0.15));

  // Procena kapaciteta kružnog stola po dimenziji, uvek paran broj (8, 10, ...).
  const getCircleCapacity = (): number => {
    if (!table || table.type !== 'circle') return 0;
    const raw = Math.floor(Math.min(tableCellsW, tableCellsH));
    if (raw <= 0) return 0;
    // Forcira paran broj mesta da bismo imali “polovine” stola.
    return raw % 2 === 1 ? raw - 1 : raw;
  };

  // Maksimalan broj stolica na slobodnoj polovini stola (polovina kapaciteta).
  // Takođe koristi se za broj mesta koje separe zauzima.
  // Standardni sto (kapacitet 8): 4 stolice / separe zauzima 4 mesta
  // Duplo veći (kapacitet 16): 8 stolica / separe zauzima 8 mesta
  const getBoothHalfCapacity = (): number => {
    const capacity = getCircleCapacity();
    return Math.max(1, Math.floor(capacity / 2));
  };

  // Kada postoji polukružni separe na kružnom stolu, broj "Around" slotova
  // mora biti ograničen tako da:
  // - ukupan broj “seat units” (separe = polovina kapaciteta, stolica = 1) ne pređe kapacitet,
  // - ako postoji separe, preostali slotovi se ponašaju kao da postoji samo
  //   slobodna polovina stola (skalira se sa veličinom stola).
  const clampCircleCountBySeatCapacity = (requested: number): number => {
    const base = Math.max(0, Math.min(64, requested));
    if (!table || table.type !== 'circle') return base;

    const capacity = getCircleCapacity();
    if (capacity <= 0) return 0;

    const currentN = Math.max(0, Number(circleCount) || 0);
    let numBooths = 0;
    if (currentN > 0) {
      const currentVariants: ChairVariant[] = Array.from(
        { length: currentN },
        (_, i) => (circleVariants[i] || circleVariant) as ChairVariant
      );
      const eff = applyCircleHalfArcRule(
        currentN,
        currentVariants,
        circleStartDeg || 0
      );
      numBooths = eff.filter(
        v => v === 'boothCurved' || v === 'boothU'
      ).length;
    }

    // Osnovni limit po kapacitetu.
    let maxSlots = capacity;

    if (numBooths > 0) {
      // Svaki separe zauzima polovinu kapaciteta (skalira se sa veličinom stola).
      const boothUnits = getBoothHalfCapacity();
      const freeSeats = Math.max(0, capacity - boothUnits * numBooths);
      // Maksimalan broj slotova = broj separea + broj preostalih sedišta.
      maxSlots = Math.max(numBooths, Math.min(capacity, numBooths + freeSeats));
    }

    const hardLimit = Math.max(0, Math.min(64, maxSlots));
    return Math.min(base, hardLimit);
  };

  // Kada se fizička veličina kružnog stola promeni (npr. resize na platnu),
  // automatski "odsecamo" višak slotova (Around) koji više ne mogu da stanu
  // po novom kapacitetu, i čistimo višak varijanti/override dimenzija.
  React.useEffect(() => {
    if (!table || table.type !== 'circle') return;
    setCircleCount(prevCount => {
      const current = Math.max(0, Number(prevCount) || 0);
      const clamped = clampCircleCountBySeatCapacity(current);
      if (clamped === current) return prevCount;

      setCircleVariants(prevVars => {
        const next = prevVars.slice(0, clamped);
        while (next.length < clamped) next.push(circleVariant);
        return next;
      });
      setCircleSeatSizes(prevSizes => prevSizes.slice(0, clamped));
      return clamped;
    });
  }, [table?.type, table?.width, table?.height, circleVariant, clampCircleCountBySeatCapacity]);

  const renderGuideTicks = (side: 'top' | 'right' | 'bottom' | 'left', count: number) => {
    const n = Math.max(0, Math.min(32, Number(count) || 0));
    if (n <= 0) return null;
    const ticks = [];
    for (let i = 1; i <= n; i++) {
      const frac = i / (n + 1);
      let style: React.CSSProperties = {};
      const len = 16; // longer for better visibility
      const thickness = 4; // thicker guide ticks
      switch (side) {
        case 'top':
          style = { left: `${frac * 100}%`, top: `0%`, width: `${thickness}px`, height: `${len}px`, transform: 'translateX(-50%)', background: 'rgba(56,189,248,0.95)' };
          break;
        case 'bottom':
          style = { left: `${frac * 100}%`, bottom: `0%`, width: `${thickness}px`, height: `${len}px`, transform: 'translateX(-50%)', background: 'rgba(56,189,248,0.95)' };
          break;
        case 'left':
          style = { top: `${frac * 100}%`, left: `0%`, height: `${thickness}px`, width: `${len}px`, transform: 'translateY(-50%)', background: 'rgba(56,189,248,0.95)' };
          break;
        case 'right':
          style = { top: `${frac * 100}%`, right: `0%`, height: `${thickness}px`, width: `${len}px`, transform: 'translateY(-50%)', background: 'rgba(56,189,248,0.95)' };
          break;
      }
      ticks.push(<div key={`${side}-${i}`} style={style} className="absolute" />);
    }
    return ticks;
  };

  const sectionClass = isLight
    ? 'bg-white border border-gray-200 rounded-md shadow-sm'
    : 'bg-[#0A1929] border border-gray-800 rounded-md shadow';

  const sectionHeaderClass = isLight
    ? 'text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-3'
    : 'text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-3';

  // Use the shared ResPoint select styling so dropdowns match the rest of the UI
  const selectClass = 'respoint-select w-full text-xs';

  const rectSideVariantOptions = [
    { value: 'standard', label: isSR ? 'Standardna stolica' : 'Standard' },
    { value: 'barstool', label: isSR ? 'Barska stolica' : 'Bar stool' },
    { value: 'boothU', label: isSR ? 'U separe' : 'U booth' },
  ] as const;

  // For corners we forbid U-booth
  const rectCornerVariantOptions = [
    { value: 'standard', label: isSR ? 'Standardna stolica' : 'Standard' },
    { value: 'barstool', label: isSR ? 'Barska stolica' : 'Bar stool' },
  ] as const;

  const circleVariantOptions = [
    { value: 'standard', label: isSR ? 'Standardna stolica' : 'Standard' },
    { value: 'barstool', label: isSR ? 'Barska stolica' : 'Bar stool' },
    { value: 'boothCurved', label: isSR ? 'Polukružni separe' : 'Semi-circular booth' },
  ] as const;

  type ChairVariant = 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';

  const normalizeAngle = (deg: number): number => ((deg % 360) + 360) % 360;

  // Ako postoji separe – on se drži fiksno (boothCurved) i zadržavamo maksimalno jedan.
  // Polja za sedista na slobodnoj polovini se kontrolišu preko circleCount (broj sedista + 1 za separe).
  // Maksimalan broj slotova = 1 (separe) + polovina kapaciteta (skalira se sa veličinom stola).
  React.useEffect(() => {
    if (table?.type !== 'circle') return;
    const hasBooth = circleBoothEnabled;
    const maxBoothSlots = 1 + getBoothHalfCapacity();
    const desiredCount = hasBooth ? Math.min(Math.max(1, circleCount || 1), maxBoothSlots) : Math.max(0, circleCount || 0);
    if (circleCount !== desiredCount) {
      setCircleCount(desiredCount);
    }
    // Obezbedi da ako je separe uključen, indeks 0 bude separe i varijante postojeće dužine.
    if (hasBooth) {
      setCircleVariants(prev => {
        const next = prev.slice(0, desiredCount);
        while (next.length < desiredCount) next.push(circleVariant);
        next[0] = 'boothCurved';
        return next;
      });
      setCircleSeatSizes(prev => prev.slice(0, desiredCount));
    } else {
      // Bez separea: ukloni eventualni booth i dozvoli normalan raspored.
      setCircleVariants(prev => {
        const next = prev.map(v => (v === 'boothCurved' || v === 'boothU') ? 'standard' : v);
        return next;
      });
    }
  }, [table?.type, table?.width, table?.height, circleCount, circleBoothEnabled, circleVariant, normalizeAngle, getBoothHalfCapacity]);

  /**
   * Za kružne stolove: polukružni i U separe (boothCurved / boothU) ne smeju
   * da se preklapaju. Dozvoljavamo najviše po jedan takav separe u svakoj
   * polovini stola (tj. centri razdvojeni bar 180°). Ako ima više pokušaja,
   * višak se automatski spušta na "standard" stolicu.
   */
  const applyCircleHalfArcRule = (
    count: number,
    variants: ChairVariant[],
    startDeg: number
  ): ChairVariant[] => {
    if (count <= 0) return [];
    const n = Math.min(count, variants.length);
    const out = variants.slice(0, n);
    type ArcInfo = { index: number; angle: number };
    const arcs: ArcInfo[] = [];
    for (let i = 0; i < n; i++) {
      const v = out[i];
      if (v === 'boothCurved' || v === 'boothU') {
        const angle = normalizeAngle(startDeg + (360 * i / n));
        arcs.push({ index: i, angle });
      }
    }
    if (arcs.length <= 1) return out;
    arcs.sort((a, b) => a.angle - b.angle);
    const kept: ArcInfo[] = [];
    for (const arc of arcs) {
      let ok = true;
      for (const k of kept) {
        const diff = Math.abs(arc.angle - k.angle);
        const delta = Math.min(diff, 360 - diff);
        if (delta < 180 - 0.001) { // moraju biti bar 180° razmaknuti
          ok = false;
          break;
        }
      }
      if (ok) kept.push(arc);
    }
    const allowed = new Set(kept.map(a => a.index));
    for (const arc of arcs) {
      if (!allowed.has(arc.index)) {
        out[arc.index] = 'standard';
      }
    }
    return out;
  };

  // Efektivna "mesta" po kružnom stolu: standard/barstool = 1, polukružni/U separe = polovina kapaciteta.
  // Skalira se sa veličinom stola (standardni sto: 4, duplo veći: 8, itd.)
  const circleSeatUnitsForVariant = (v: ChairVariant): number =>
    v === 'boothCurved' || v === 'boothU' ? getBoothHalfCapacity() : 1;

  // Ukupan broj mesta na kružnom stolu koji zaista mogu da se zauzmu
  // datim rasporedom (polukružni separe blokira svoju polovinu kruga).
  const computeCircleSeatUnitsEffective = (
    count: number,
    variants: ChairVariant[],
    startDeg: number
  ): number => {
    if (count <= 0) return 0;
    const n = Math.min(count, variants.length);
    // Primeni pravilo "najviše jedan separe po polovini"
    const eff = applyCircleHalfArcRule(n, variants.slice(0, n), startDeg);

    let booths = 0;
    let singles = 0;
    for (let i = 0; i < n; i++) {
      const v = eff[i] || 'standard';
      if (v === 'boothCurved' || v === 'boothU') {
        booths += 1;
      } else {
        singles += 1;
      }
    }
    // Svaki separe = polovina kapaciteta mesta, svaka standard/barstool stolica = 1 mesto.
    return booths * getBoothHalfCapacity() + singles;
  };

  const isCircleVariantAllowedForSeat = (seatIndex: number, candidate: ChairVariant): boolean => {
    if (!table || table.type !== 'circle') return true;
    const n = Math.max(0, Math.min(64, Number(circleCount) || 0));
    if (n <= 0 || seatIndex < 0 || seatIndex >= n) return true;

    // Ograničenje: samo jedan separe (boothCurved/U) na kružnom stolu.
    // Prvo izračunaj koliko trenutno ima separea (osim na ovom indeksu).
    let currentBooths = 0;
    for (let i = 0; i < n; i++) {
      if (i === seatIndex) continue;
      const v = (circleVariants[i] || circleVariant) as ChairVariant;
      if (v === 'boothCurved' || v === 'boothU') currentBooths++;
    }

    const isCandidateBooth = candidate === 'boothCurved' || candidate === 'boothU';
    if (!isCandidateBooth) {
      // Standard / barstool su uvek dozvoljeni.
      return true;
    }

    // Ako već postoji separe na drugom slotu – zabrani novi.
    return currentBooths === 0;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isSR ? 'Dodaj stolice' : 'Add seats'}
      size="xl"
      fullScreen
      contentScrollable={false}
      hideHeaderBorder
    >
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto statistics-scrollbar p-4 text-xs">
        {/* Hide number input spinners in all browsers */}
        <style>
          {`
            /* Chrome, Safari, Edge, Opera */
            input[type=number]::-webkit-outer-spin-button,
            input[type=number]::-webkit-inner-spin-button {
              -webkit-appearance: none;
              margin: 0;
            }
            /* Firefox */
            input[type=number] {
              -moz-appearance: textfield;
            }
          `}
        </style>
        <div className="space-y-4 max-w-5xl mx-auto">
          {/* Preview card */}
          <div className={`${sectionClass} p-4`}>
            <div className={sectionHeaderClass}>{t('preview')}</div>
            <div
              ref={previewBoxRef}
              className="rounded-md border relative w-full"
              style={{
                height: `${boxH}px`,
                backgroundImage: isLight ? GRID_BG_LIGHT : GRID_BG_DARK,
                backgroundSize: `${cellPx}px ${cellPx}px`,
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)'
              }}
              onClick={() => setSelectedSeat(null)}
            >
              {/* Rotated group (table + chairs) */}
              <div
                className="absolute left-1/2 top-1/2"
                style={{
                  width: `${drawW}px`,
                  height: `${drawH}px`,
                  transform: `translate(-50%, -50%) rotate(${preview.rotDeg}deg)`,
                  transformOrigin: 'center'
                }}
              >
                {/* Table body */}
                <div
                  className="absolute left-1/2 top-1/2"
                  style={{
                    width: `${drawW}px`,
                    height: `${drawH}px`,
                    transform: 'translate(-50%, -50%)',
                    borderRadius: table?.type === 'circle' ? '9999px' : '8px',
                    background: '#ffffff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.35)'
                  }}
                />
                {/* Guides */}
                <div className="absolute inset-0 pointer-events-none">
                  {table?.type === 'circle' ? (
                    (() => {
                      const n = Math.max(0, Math.min(64, Number(circleCount) || 0));
                      if (n <= 0) return null;

                      const rawVariants: ChairVariant[] = Array.from(
                        { length: n },
                        (_, i) => (circleVariants[i] || circleVariant) as ChairVariant
                      );
                      const effVariants = applyCircleHalfArcRule(
                        n,
                        rawVariants,
                        circleStartDeg || 0
                      );

                      const ticks: React.ReactNode[] = [];
                      const centerX = drawW / 2;
                      const centerY = drawH / 2;
                      const radius = Math.min(drawW, drawH) / 2;
                      const tickLen = 14;
                      const thick = 2;

                      // 1) Pronađi centre svih separea (polukružni i U) – oni definišu blokirane polovine kruga.
                      const arcCenters: number[] = [];
                      for (let i = 0; i < n; i++) {
                        const v = effVariants[i];
                        if (v === 'boothCurved' || v === 'boothU') {
                          const aDeg = (circleStartDeg || 0) + (360 * i / n);
                          arcCenters.push(normalizeAngle(aDeg));
                        }
                      }

                      // Izgradi blokirane intervale oko svakog separea (±90°).
                      const buildBlockedIntervals = (): Array<{ start: number; end: number }> => {
                        const intervals: Array<{ start: number; end: number }> = [];
                        const pushInterval = (start: number, end: number) => {
                          const s = normalizeAngle(start);
                          const e = normalizeAngle(end);
                          if (s === e) return;
                          if (s < e) {
                            intervals.push({ start: s, end: e });
                          } else {
                            intervals.push({ start: s, end: 360 });
                            intervals.push({ start: 0, end: e });
                          }
                        };

                        for (const c of arcCenters) {
                          pushInterval(c - 90, c + 90);
                        }

                        if (!intervals.length) return [];

                        intervals.sort((a, b) => a.start - b.start);
                        const merged: Array<{ start: number; end: number }> = [];
                        let cur = { ...intervals[0] };
                        for (let i = 1; i < intervals.length; i++) {
                          const iv = intervals[i];
                          if (iv.start <= cur.end) {
                            cur.end = Math.max(cur.end, iv.end);
                          } else {
                            merged.push(cur);
                            cur = { ...iv };
                          }
                        }
                        merged.push(cur);
                        return merged;
                      };

                      const blocked = buildBlockedIntervals();

                      const isAngleBlocked = (angleDeg: number): boolean => {
                        for (const iv of blocked) {
                          if (angleDeg >= iv.start && angleDeg <= iv.end) return true;
                        }
                        return false;
                      };

                      // 2) Izračunaj slobodne lukove (komplement blokiranih u [0, 360)).
                      const freeArcs: Array<{ start: number; end: number }> = [];
                      if (!blocked.length) {
                        freeArcs.push({ start: 0, end: 360 });
                      } else {
                        let cursor = 0;
                        for (const iv of blocked) {
                          if (iv.start > cursor) {
                            freeArcs.push({ start: cursor, end: iv.start });
                          }
                          cursor = Math.max(cursor, iv.end);
                        }
                        if (cursor < 360) {
                          freeArcs.push({ start: cursor, end: 360 });
                        }
                      }

                      const totalFreeAngle = freeArcs.reduce((sum, iv) => sum + (iv.end - iv.start), 0);
                      const seatAngles: Array<number | null> = Array.from({ length: n }, () => null);

                      // 3) Prvo crtamo tick-ove za same separee – po jedan tick u centru separea.
                      for (let i = 0; i < n; i++) {
                        const v = effVariants[i];
                        if (v === 'boothCurved' || v === 'boothU') {
                          const angleDeg = (circleStartDeg || 0) + (360 * i / n);
                          const a = angleDeg * Math.PI / 180;
                          const x = centerX + Math.cos(a) * radius;
                          const y = centerY + Math.sin(a) * radius;
                          const style: React.CSSProperties = {
                            position: 'absolute',
                            left: `${x}px`,
                            top: `${y}px`,
                            width: `${thick}px`,
                            height: `${tickLen}px`,
                            transform: `translate(-50%, 0%) rotate(${angleDeg + 90}deg)`,
                            transformOrigin: '50% 0%',
                            background: 'rgba(56,189,248,0.95)'
                          };
                          ticks.push(<div key={`c-booth-${i}`} style={style} />);
                        }
                      }

                      // 4) Skupljamo indekse za obične stolice (standard / barstool).
                      const seatIndices: number[] = [];
                      for (let i = 0; i < n; i++) {
                        const v = effVariants[i];
                        if (v !== 'boothCurved' && v !== 'boothU') {
                          seatIndices.push(i);
                        }
                      }

                      const m = seatIndices.length;
                      if (m > 0) {
                        // Izračunaj konkretne uglove slotova za sve obične stolice.
                        if (!arcCenters.length) {
                          // Nema separea – klasično rasporedi po punom krugu.
                          for (let idx = 0; idx < m; idx++) {
                            const i = seatIndices[idx];
                            seatAngles[i] = normalizeAngle((circleStartDeg || 0) + (360 * i / n));
                          }
                        } else {
                          // Postoji separe: rasporedi stolice RELATIVNO u odnosu na separe.
                          // Slobodna polovina je uvek centrirana na boothAngle + 180°.
                          // Stolice se raspoređuju od boothAngle + 90° do boothAngle + 270°.
                          // Ovo osigurava da se sve stolice rotiraju zajedno sa separetom.
                          const boothAngle = arcCenters[0]; // uzimamo prvi (i jedini) separe
                          for (let idx = 0; idx < m; idx++) {
                            const i = seatIndices[idx];
                            // Rasporedi stolice ravnomerno u slobodnom luku (180°)
                            // počevši od boothAngle + 90°
                            const offsetInFreeArc = ((idx + 1) / (m + 1)) * 180;
                            const finalAngle = boothAngle + 90 + offsetInFreeArc;
                            seatAngles[i] = normalizeAngle(finalAngle);
                          }
                        }

                        // Renderuj tick-ove na istim uglovima koje koriste stolice.
                        for (const i of seatIndices) {
                          const angleDeg = seatAngles[i] ?? ((circleStartDeg || 0) + (360 * i / n));
                          const a = angleDeg * Math.PI / 180;
                          const x = centerX + Math.cos(a) * radius;
                          const y = centerY + Math.sin(a) * radius;
                          const style: React.CSSProperties = {
                            position: 'absolute',
                            left: `${x}px`,
                            top: `${y}px`,
                            width: `${thick}px`,
                            height: `${tickLen}px`,
                            transform: `translate(-50%, 0%) rotate(${angleDeg + 90}deg)`,
                            transformOrigin: '50% 0%',
                            background: 'rgba(56,189,248,0.95)'
                          };
                          ticks.push(<div key={`c-seat-${i}`} style={style} />);
                        }
                      }

                      return ticks;
                    })()
                  ) : (
                    <>
                      {renderGuideTicks('top', (() => {
                        if (activeRectUSide && rectUSideOccupies('top')) return 0;
                        if (topVariant === 'boothU') return 0;
                        return top;
                      })())}
                      {renderGuideTicks('right', (() => {
                        if (activeRectUSide && rectUSideOccupies('right')) return 0;
                        if (rightVariant === 'boothU') return 0;
                        return right;
                      })())}
                      {renderGuideTicks('bottom', (() => {
                        if (activeRectUSide && rectUSideOccupies('bottom')) return 0;
                        if (bottomVariant === 'boothU') return 0;
                        return bottom;
                      })())}
                      {renderGuideTicks('left', (() => {
                        if (activeRectUSide && rectUSideOccupies('left')) return 0;
                        if (leftVariant === 'boothU') return 0;
                        return left;
                      })())}
                      {/* Corner ticks */}
                      {cornerTL && (
                        <div className="absolute" style={{ left: '0%', top: '0%', width: '10px', height: '10px', transform: 'translate(-50%, -50%)', background: 'rgba(56,189,248,0.95)', borderRadius: '2px' }} />
                      )}
                      {cornerTR && (
                        <div className="absolute" style={{ left: '100%', top: '0%', width: '10px', height: '10px', transform: 'translate(-50%, -50%)', background: 'rgba(56,189,248,0.95)', borderRadius: '2px' }} />
                      )}
                      {cornerBR && (
                        <div className="absolute" style={{ left: '100%', top: '100%', width: '10px', height: '10px', transform: 'translate(-50%, -50%)', background: 'rgba(56,189,248,0.95)', borderRadius: '2px' }} />
                      )}
                      {cornerBL && (
                        <div className="absolute" style={{ left: '0%', top: '100%', width: '10px', height: '10px', transform: 'translate(-50%, -50%)', background: 'rgba(56,189,248,0.95)', borderRadius: '2px' }} />
                      )}
                    </>
                  )}
                </div>
                {/* Chairs preview */}
                {(() => {
                  const nodes: React.ReactNode[] = [];
                  const chairColor = isLight ? '#CBD5E1' : '#64748B';
                  const isSeatSelected = (id: SelectedSeat | null, candidate: SelectedSeat): boolean => {
                    if (!id) return false;
                    if (id.kind !== candidate.kind) return false;
                    if (id.kind === 'side' && candidate.kind === 'side') {
                      return id.side === candidate.side && id.index === candidate.index;
                    }
                    if (id.kind === 'corner' && candidate.kind === 'corner') {
                      return id.corner === candidate.corner;
                    }
                    if (id.kind === 'circle' && candidate.kind === 'circle') {
                      return id.index === candidate.index;
                    }
                    return false;
                  };
                 const GRID_PX = GRID;
                 const getDims = (
                   variant: string,
                   overridePx?: { w?: number; h?: number }
                 ) => {
                   const baseW = overridePx?.w != null ? overridePx.w : chairWidthPx;
                   const baseH = overridePx?.h != null ? overridePx.h : chairHeightPx;
                   switch (variant) {
                     case 'barstool': {
                       // Always render bar stool as a perfect circle in preview
                       const sidePx = Math.max(baseW, baseH);
                       const side = (sidePx / GRID_PX) * cellPx;
                       return { w: side, h: side };
                     }
                     case 'boothCurved':
                       return { w: 4 * cellPx, h: 2 * cellPx };
                     case 'boothU': {
                       // For U-separé we sometimes pass explicit preview-sized dims (already in px).
                       // If overridePx is provided, treat it as preview dimensions directly.
                       if (overridePx?.w != null && overridePx?.h != null) {
                         return { w: overridePx.w, h: overridePx.h };
                       }
                       // Fallback: square with fixed preview size.
                       return { w: 4 * cellPx, h: 4 * cellPx };
                     }
                     default:
                       return {
                         w: (baseW / GRID_PX) * cellPx,
                         h: (baseH / GRID_PX) * cellPx
                       };
                   }
                 };
                  const placeChair = (
                    cx: number,
                    cy: number,
                    variant: string,
                    rotDeg: number,
                    key: string,
                    seatId: SelectedSeat | null,
                    overrideDimsPx?: { w?: number; h?: number }
                  ) => {
                    const { w, h } = getDims(variant, overrideDimsPx);
                    const selectable =
                      !!seatId && variant !== 'boothCurved' && variant !== 'boothU';
                    const selected = selectable && isSeatSelected(selectedSeat, seatId);
                    if (variant === 'barstool') {
                      nodes.push(
                        <div
                          key={key}
                          className={`absolute ${
                            selected
                              ? 'ring-2 ring-sky-400 ring-offset-[1px] ring-offset-transparent rounded-full cursor-pointer'
                              : selectable
                                ? 'cursor-pointer'
                                : ''
                          }`}
                          style={{
                            left: `${cx}px`,
                            top: `${cy}px`,
                            width: `${w}px`,
                            height: `${h}px`,
                            transform: `translate(-50%, -50%) rotate(${rotDeg}deg)`,
                            transformOrigin: 'center'
                          }}
                          onClick={
                            selectable
                              ? (e) => {
                                  e.stopPropagation();
                                  setSelectedSeat(prev =>
                                    isSeatSelected(prev, seatId) ? null : seatId
                                  );
                                }
                              : undefined
                          }
                        >
                          <div
                            style={{
                              position: 'absolute',
                              left: '50%',
                              top: '50%',
                              width: '70%',
                              height: '70%',
                              transform: 'translate(-50%, -50%)',
                              borderRadius: '9999px',
                              backgroundColor: chairColor
                            }}
                          />
                        </div>
                      );
                      return;
                    }
                    if (variant === 'boothCurved') {
                      const id = `booth-curved-prev-${key}`;
                      nodes.push(
                        <div
                          key={key}
                          className="absolute"
                          style={{
                            left: `${cx}px`,
                            top: `${cy}px`,
                            width: `${w}px`,
                            height: `${h}px`,
                            transform: `translate(-50%, -50%) rotate(${rotDeg}deg)`,
                            transformOrigin: 'center'
                          }}
                        >
                          <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                            <defs>
                              <mask id={id}>
                                <rect x="0" y="0" width="100" height="50" fill="black" />
                                <path d="M 0 50 A 50 50 0 0 1 100 50 L 0 50 Z" fill="white" />
                                <path d={`M 14 50 A 36 36 0 0 1 86 50 L 14 50 Z`} fill="black" />
                              </mask>
                            </defs>
                            <rect x="0" y="0" width="100" height="50" fill={chairColor} mask={`url(#${id})`} />
                          </svg>
                        </div>
                      );
                      return;
                    }
                    if (variant === 'boothU') {
                      const id = `booth-u-prev-${key}`;
                      // U separe na pravougaonom stolu – imitiraj Canvas SVG:
                      // debljina zida je procenat širine/visine samog U‑separea
                      // (isto kao što Canvas koristi table.width/height za booth-u-mask-*).
                      const outerW = w;
                      const outerH = h;
                      const wallPxPreview = (30 / GRID_PX) * cellPx; // ≈ RECT_U_WALL_PX u preview skali
                      const leftW = (wallPxPreview / Math.max(1, outerW)) * 100;
                      const rightW = leftW;
                      const topH = (wallPxPreview / Math.max(1, outerH)) * 100;
                      nodes.push(
                        <div
                          key={key}
                          className="absolute"
                          style={{
                            left: `${cx}px`,
                            top: `${cy}px`,
                            width: `${w}px`,
                            height: `${h}px`,
                            transform: `translate(-50%, -50%) rotate(${rotDeg}deg)`,
                            transformOrigin: 'center'
                          }}
                        >
                          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                            <defs>
                              <mask id={id}>
                                <rect x="0" y="0" width="100" height="100" fill="black" />
                                {/* Leva ruka */}
                                <rect x="0" y="0" width={leftW} height="100" fill="white" />
                                {/* Desna ruka */}
                                <rect x={100 - rightW} y="0" width={rightW} height="100" fill="white" />
                                {/* Gornji segment */}
                                <rect x="0" y="0" width="100" height={topH} fill="white" />
                              </mask>
                            </defs>
                            <rect x="0" y="0" width="100" height="100" fill={chairColor} mask={`url(#${id})`} />
                          </svg>
                        </div>
                      );
                      return;
                    }
                    // Standard rectangle
                    nodes.push(
                      <div
                        key={key}
                        className={`absolute ${
                          selected
                            ? 'ring-2 ring-sky-400 ring-offset-[1px] ring-offset-transparent rounded-md cursor-pointer'
                            : selectable
                              ? 'cursor-pointer'
                              : ''
                        }`}
                        style={{
                          left: `${cx}px`,
                          top: `${cy}px`,
                          width: `${w}px`,
                          height: `${h}px`,
                          transform: `translate(-50%, -50%) rotate(${rotDeg}deg)`,
                          transformOrigin: 'center',
                          zIndex: selected ? 10 : 1
                        }}
                        onClick={
                          selectable
                            ? (e) => {
                                e.stopPropagation();
                                setSelectedSeat(prev =>
                                  isSeatSelected(prev, seatId) ? null : seatId
                                );
                              }
                            : undefined
                        }
                      >
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: 6,
                            backgroundColor: chairColor,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.25)'
                          }}
                        />
                      </div>
                    );
                  };
                  if (table?.type === 'circle') {
                    const n = Math.max(0, Math.min(64, Number(circleCount) || 0));
                    if (n > 0) {
                      const R = Math.min(drawW, drawH) / 2;
                      const rawVariants: ChairVariant[] = Array.from(
                        { length: n },
                        (_, i) => (circleVariants[i] || circleVariant) as ChairVariant
                      );
                      const perSeat = applyCircleHalfArcRule(
                        n,
                        rawVariants,
                        circleStartDeg || 0
                      );

                      const addCurvedArc = (angleDeg: number, thicknessPx: number, key: string) => {
                        const innerR = R; // flush to table edge
                        const outerR = innerR + thicknessPx;
                        const box = outerR * 2;
                        const innerRatio = (innerR / outerR) * 50;
                        const left = 50 - innerRatio;
                        const right = 50 + innerRatio;
                        const id = `circle-booth-arc-${key}`;
                        nodes.push(
                          <div
                            key={key}
                            className="absolute"
                            style={{
                              left: `${drawW / 2}px`,
                              top: `${drawH / 2}px`,
                              width: `${box}px`,
                              height: `${box}px`,
                              transform: `translate(-50%, -50%) rotate(${angleDeg + 90}deg)`,
                              transformOrigin: 'center'
                            }}
                          >
                            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                              <defs>
                                <mask id={id}>
                                  <rect x="0" y="0" width="100" height="100" fill="black" />
                                  {/* Outer semicircle */}
                                  <path d="M 0 50 A 50 50 0 0 1 100 50 L 0 50 Z" fill="white" />
                                  {/* Inner cut-out semicircle computed to be flush with table */}
                                  <path d={`M ${left} 50 A ${innerRatio} ${innerRatio} 0 0 1 ${right} 50 L ${left} 50 Z`} fill="black" />
                                </mask>
                              </defs>
                              <rect x="0" y="0" width="100" height="100" fill={chairColor} mask={`url(#${id})`} />
                            </svg>
                          </div>
                        );
                      };

                      // 1) Izračunaj centre svih separea (polukružni i U) – oni definišu blokirane polovine kruga.
                      const arcCenters: number[] = [];
                      for (let i = 0; i < n; i++) {
                        const v = perSeat[i];
                        if (v === 'boothCurved' || v === 'boothU') {
                          const angleDeg = (circleStartDeg || 0) + (360 * i / n);
                          arcCenters.push(normalizeAngle(angleDeg));
                        }
                      }

                      // Pomoćna funkcija: konstruisanje blokiranih intervala [start, end] u [0, 360).
                      const buildBlockedIntervals = (): Array<{ start: number; end: number }> => {
                        const intervals: Array<{ start: number; end: number }> = [];
                        const pushInterval = (start: number, end: number) => {
                          const s = normalizeAngle(start);
                          const e = normalizeAngle(end);
                          if (s === e) return;
                          if (s < e) {
                            intervals.push({ start: s, end: e });
                          } else {
                            intervals.push({ start: s, end: 360 });
                            intervals.push({ start: 0, end: e });
                          }
                        };

                        for (const c of arcCenters) {
                          pushInterval(c - 90, c + 90);
                        }

                        if (!intervals.length) return [];

                        // Sortiraj i spoji preklapajuće intervale.
                        intervals.sort((a, b) => a.start - b.start);
                        const merged: Array<{ start: number; end: number }> = [];
                        let cur = { ...intervals[0] };
                        for (let i = 1; i < intervals.length; i++) {
                          const iv = intervals[i];
                          if (iv.start <= cur.end) {
                            cur.end = Math.max(cur.end, iv.end);
                          } else {
                            merged.push(cur);
                            cur = { ...iv };
                          }
                        }
                        merged.push(cur);
                        return merged;
                      };

                      const blocked = buildBlockedIntervals();

                      const isAngleBlocked = (angleDeg: number): boolean => {
                        for (const iv of blocked) {
                          if (angleDeg >= iv.start && angleDeg <= iv.end) return true;
                        }
                        return false;
                      };

                      // 2) Izračunaj slobodne lukove (komplement blokiranih u [0, 360)).
                      const freeArcs: Array<{ start: number; end: number }> = [];
                      if (!blocked.length) {
                        freeArcs.push({ start: 0, end: 360 });
                      } else {
                        let cursor = 0;
                        for (const iv of blocked) {
                          if (iv.start > cursor) {
                            freeArcs.push({ start: cursor, end: iv.start });
                          }
                          cursor = Math.max(cursor, iv.end);
                        }
                        if (cursor < 360) {
                          freeArcs.push({ start: cursor, end: 360 });
                        }
                      }

                      const totalFreeAngle = freeArcs.reduce((sum, iv) => sum + (iv.end - iv.start), 0);
                      const seatAngles: Array<number | null> = Array.from({ length: n }, () => null);

                      // 3) Prvo iscrtaj sve separe-e na njihovim pozicijama (koristi efektivne varijante).
                      for (let i = 0; i < n; i++) {
                        const v = perSeat[i];
                        const angleDeg = (circleStartDeg || 0) + (360 * i / n);
                        if (v === 'boothCurved') {
                          addCurvedArc(angleDeg, 2 * cellPx, `c-arc-${i}`);
                        } else if (v === 'boothU') {
                          addCurvedArc(angleDeg, 4 * cellPx, `c-arc-u-${i}`);
                        }
                      }

                      // 4) Pripremi indekse za obične stolice (standard / barstool).
                      const seatIndices: number[] = [];
                      for (let i = 0; i < n; i++) {
                        const v = perSeat[i];
                        if (v !== 'boothCurved' && v !== 'boothU') {
                          seatIndices.push(i);
                        }
                      }

                      const m = seatIndices.length;
                      if (m > 0) {
                        if (!arcCenters.length) {
                          // Nema separea – klasično rasporedi po punom krugu.
                          for (let idx = 0; idx < m; idx++) {
                            const i = seatIndices[idx];
                            const angleDeg = (circleStartDeg || 0) + (360 * i / n);
                            seatAngles[i] = angleDeg;
                          }
                        } else {
                          // Postoji separe: rasporedi stolice RELATIVNO u odnosu na separe.
                          // Slobodna polovina je uvek centrirana na boothAngle + 180°.
                          // Stolice se raspoređuju od boothAngle + 90° do boothAngle + 270°.
                          // Ovo osigurava da se sve stolice rotiraju zajedno sa separetom.
                          const boothAngle = arcCenters[0]; // uzimamo prvi (i jedini) separe
                          for (let idx = 0; idx < m; idx++) {
                            const i = seatIndices[idx];
                            // Rasporedi stolice ravnomerno u slobodnom luku (180°)
                            // počevši od boothAngle + 90°
                            const offsetInFreeArc = ((idx + 1) / (m + 1)) * 180;
                            const finalAngle = boothAngle + 90 + offsetInFreeArc;
                            seatAngles[i] = normalizeAngle(finalAngle);
                          }
                        }

                        // 5) Postavi stolice tačno na zapamćene uglove (slotove).
                        for (const i of seatIndices) {
                          const v = perSeat[i];
                          const angleDeg = seatAngles[i] ?? ((circleStartDeg || 0) + (360 * i / n));
                          const a = angleDeg * Math.PI / 180;
                          const seatId: SelectedSeat = { kind: 'circle', index: i };
                          const overridePx = circleSeatSizes[i] || undefined;
                          const { h } = getDims(v, overridePx);
                          const offset = h / 2 + gapEdge;
                          const cx = drawW / 2 + Math.cos(a) * (R + offset);
                          const cy = drawH / 2 + Math.sin(a) * (R + offset);
                          placeChair(cx, cy, v, angleDeg + 90, `c-${i}`, seatId, overridePx);
                        }
                      }
                    }
                  } else {
                    // Rectangle sides
                    const halfW = drawW / 2;
                    const halfH = drawH / 2;
                    const marginOut = gapEdge; // small gap for side chairs
                    const cornerMarginOut = Math.max(1, Math.round(gapEdge * 0.45)); // corners sit a bit bliže stolu
                    const sideData: Array<{ side: 'top'|'right'|'bottom'|'left'; count: number; variant: string }> = [
                      { side: 'top', count: Math.max(0, top || 0), variant: topVariant },
                      { side: 'right', count: Math.max(0, right || 0), variant: rightVariant },
                      { side: 'bottom', count: Math.max(0, bottom || 0), variant: bottomVariant },
                      { side: 'left', count: Math.max(0, left || 0), variant: leftVariant }
                    ];
                    sideData.forEach(({ side, count, variant }) => {
                      let effectiveCount = count;
                      // Ako postoji U separe, on troši tri strane:
                      // baznu + dve susedne. Na tim zauzetim stranama više
                      // ne prikazujemo dodatne stolice.
                      if (table?.type === 'rectangle' && activeRectUSide) {
                        if (side !== activeRectUSide && rectUSideOccupies(side)) {
                          effectiveCount = 0;
                        }
                        // Na samoj U strani uvek crtamo najviše jedan U.
                        if (side === activeRectUSide && variant === 'boothU' && effectiveCount > 0) {
                          effectiveCount = 1;
                        }
                      }
                      if (effectiveCount <= 0) return;
                      // spacing in preview coordinates
                      const sPx = Math.max(0, (chairSpacingPx / GRID) * cellPx);
                      const stepPxTop = (drawW - Math.max(0, (effectiveCount - 1)) * sPx) / (effectiveCount + 1);
                      const stepPxSide = (drawH - Math.max(0, (effectiveCount - 1)) * sPx) / (effectiveCount + 1);
                      for (let i = 1; i <= effectiveCount; i++) {
                        const index = i - 1;
                        const baseOverride =
                          variant === 'boothU'
                            ? undefined
                            : side === 'top' ? topSeatSizes[index]
                              : side === 'right' ? rightSeatSizes[index]
                              : side === 'bottom' ? bottomSeatSizes[index]
                              : leftSeatSizes[index];
                        // Standard dimenzije (sa per-seat override za ne‑U varijante)
                        let dims = getDims(variant, baseOverride);
                        let renderOverride: { w?: number; h?: number } | undefined = baseOverride;
                        // Za U separe na svim pravougaonim stranama, skaliraj dimenzije kao na platnu:
                        // - za top/bottom: širina = width + 2*wall, visina = height + wall
                        // - za left/right: širina = height + 2*wall, visina = width + wall
                        const wallPxPreview = (30 / GRID) * cellPx; // RECT_U_WALL_PX u preview skali
                        if (variant === 'boothU') {
                          const isVerticalSide = side === 'left' || side === 'right';
                          const sepW = (isVerticalSide ? drawH : drawW) + 2 * wallPxPreview;
                          const sepH = (isVerticalSide ? drawW : drawH) + wallPxPreview;
                          dims = { w: sepW, h: sepH };
                          // getDims za boothU koristi override direktno (u preview pikselima)
                          renderOverride = { w: sepW, h: sepH };
                        }
                        const w = dims.w, h = dims.h;
                        const seatId: SelectedSeat | null =
                          variant === 'boothU'
                            ? null
                            : { kind: 'side', side, index };
                        if (side === 'top') {
                          const x = stepPxTop * i + sPx * (i - 1);
                          const cx = x - halfW;
                          const centerY = variant === 'boothU'
                            ? (drawH / 2) - (wallPxPreview / 2)
                            : - (h / 2) - marginOut;
                          // Open side toward table (below) => 0deg
                          placeChair(halfW + cx, centerY, variant, 0, `t-${i}`, seatId, renderOverride);
                        } else if (side === 'bottom') {
                          const x = stepPxTop * i + sPx * (i - 1);
                          const cx = x - halfW;
                          const centerY = variant === 'boothU'
                            ? (drawH / 2) + (wallPxPreview / 2)
                            : drawH + (h / 2) + marginOut;
                          // Open side toward table (above) => 180deg
                          placeChair(halfW + cx, centerY, variant, 180, `b-${i}`, seatId, renderOverride);
                        } else if (side === 'left') {
                          const y = stepPxSide * i + sPx * (i - 1);
                          const cy = y - halfH;
                          let centerX = - (h / 2) - marginOut;
                          let centerY = halfH + cy;
                          if (variant === 'boothU') {
                            // Simetrično ponašanje kao za gornju/donju stranu:
                            // centar U separea je pomeren za pola debljine zida od centra stola ka levoj strani
                            centerX = (drawW / 2) - wallPxPreview / 2;
                            centerY = drawH / 2;
                          }
                          // Open side toward table (right) => rotate 270deg (-90)
                          placeChair(centerX, centerY, variant, 270, `l-${i}`, seatId, renderOverride);
                        } else if (side === 'right') {
                          const y = stepPxSide * i + sPx * (i - 1);
                          const cy = y - halfH;
                          let centerX = drawW + (h / 2) + marginOut;
                          let centerY = halfH + cy;
                          if (variant === 'boothU') {
                            // Simetrično ponašanje kao za gornju/donju stranu:
                            // centar U separea je pomeren za pola debljine zida od centra stola ka desnoj strani
                            centerX = (drawW / 2) + wallPxPreview / 2;
                            centerY = drawH / 2;
                          }
                          // Open side toward table (left) => rotate 90deg
                          placeChair(centerX, centerY, variant, 90, `r-${i}`, seatId, renderOverride);
                        }
                      }
                    });
                    // Corners – rotate to match actual canvas placement (wide side towards table corner)
                    const cornerNodes: Array<{ enabled: boolean; key: string; x: number; y: number; rot: number; variant: string; corner: 'tl' | 'tr' | 'br' | 'bl' }> = [
                      // Ovi uglovi prate isti ugao kao u autoGenerateChairsForTable (Canvas.tsx):
                      // tl: -45°, tr: 45°, br: 135°, bl: -135°
                      { enabled: !!cornerTL, key: 'ctl', x: - (cellPx / 2) - cornerMarginOut, y: - (cellPx / 2) - cornerMarginOut, rot: -45, variant: cornerTLVariant, corner: 'tl' },
                      { enabled: !!cornerTR, key: 'ctr', x: drawW + (cellPx / 2) + cornerMarginOut, y: - (cellPx / 2) - cornerMarginOut, rot: 45, variant: cornerTRVariant, corner: 'tr' },
                      { enabled: !!cornerBR, key: 'cbr', x: drawW + (cellPx / 2) + cornerMarginOut, y: drawH + (cellPx / 2) + cornerMarginOut, rot: 135, variant: cornerBRVariant, corner: 'br' },
                      { enabled: !!cornerBL, key: 'cbl', x: - (cellPx / 2) - cornerMarginOut, y: drawH + (cellPx / 2) + cornerMarginOut, rot: -135, variant: cornerBLVariant, corner: 'bl' }
                    ];
                    cornerNodes.forEach(c => {
                      if (!c.enabled) return;
                      const overridePx =
                        c.corner === 'tl'
                          ? { w: cornerTLWidthPx, h: cornerTLHeightPx }
                          : c.corner === 'tr'
                            ? { w: cornerTRWidthPx, h: cornerTRHeightPx }
                            : c.corner === 'br'
                              ? { w: cornerBRWidthPx, h: cornerBRHeightPx }
                              : { w: cornerBLWidthPx, h: cornerBLHeightPx };
                      const dims = getDims(c.variant, overridePx);
                      const seatId: SelectedSeat = { kind: 'corner', corner: c.corner };
                      placeChair(c.x, c.y, c.variant, c.rot, c.key, seatId, overridePx);
                    });
                  }
                  return nodes;
                })()}
              </div>
            </div>
          </div>

          {/* General settings */}
          <div className={`${sectionClass} p-4`}>
            <div className={sectionHeaderClass}>
              {isSR ? 'Opšta podešavanja' : 'General'}
            </div>
            <div className={`${mutedTextClass} mb-3`}>
              {table?.type === 'circle'
                ? (isSR
                    ? 'Odaberi koliko stolica može da se rasporedi oko stola. Stolice će se poravnavati po jednako raspoređenim vodilicama oko kruga.'
                    : 'Choose how many chairs can be drawn around the table. Chairs will snap to evenly spaced guide ticks around the circle.')
                : (isSR
                    ? 'Odaberi koliko stolica može da se rasporedi na svakoj strani. Stolice će se poravnavati po jednako raspoređenim vodilicama na toj strani.'
                    : 'Choose how many chairs can be drawn on each side. Chairs will snap to evenly spaced guide ticks on that side.')}
            </div>
            <div className={`${mutedTextClass} text-[11px] mb-2`}>
              {(() => {
                if (selectedSeat) {
                  if (selectedSeat.kind === 'side') {
                    const side = selectedSeat.side;
                    const sideLabel = isSR
                      ? side === 'top'
                        ? 'gore'
                        : side === 'right'
                          ? 'desno'
                          : side === 'bottom'
                            ? 'dole'
                            : 'levo'
                      : side;
                    return isSR
                      ? `Izabrana stolica: ${sideLabel} #${(selectedSeat.index ?? 0) + 1}`
                      : `Selected seat: ${side} #${(selectedSeat.index ?? 0) + 1}`;
                  } else if (selectedSeat.kind === 'corner') {
                    const cornerCode = selectedSeat.corner.toUpperCase();
                    return isSR
                      ? `Izabrana stolica: ugao ${cornerCode}`
                      : `Selected seat: corner ${cornerCode}`;
                  } else {
                    return isSR
                      ? `Izabrana stolica: krug #${selectedSeat.index + 1}`
                      : `Selected seat: circle #${selectedSeat.index + 1}`;
                  }
                }
                return isSR
                  ? 'Izabrana stolica: nijedna (sve stolice)'
                  : 'Selected seat: none (all seats)';
              })()}
            </div>
            <div className="space-y-3">
              {/* Chair size */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col w-32">
                  <div className={labelTextClass}>
                    {isSR ? 'Veličina stolice' : 'Chair size'}
                  </div>
                  <div className={`${mutedTextClass} text-[10px] mt-0.5`}>
                    {selectedSeat
                      ? (isSR ? 'Menja samo izabranu stolicu' : 'Affects selected seat only')
                      : (isSR ? 'Menja sve stolice' : 'Affects all seats')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={mutedTextClass}>W</span>
                  <div className="flex items-center gap-1">
                    <button
                      className={smallBtnClass}
                      type="button"
                      onClick={() => {
                        const delta = -2;
                        if (!selectedSeat) {
                          setChairWidthPx(w => Math.max(4, (w || 0) + delta));
                          // Global change → clear all per-seat overrides so everything follows new base
                          setTopSeatSizes([]);
                          setRightSeatSizes([]);
                          setBottomSeatSizes([]);
                          setLeftSeatSizes([]);
                          setCircleSeatSizes([]);
                          setCornerTLWidthPx(undefined);
                          setCornerTRWidthPx(undefined);
                          setCornerBRWidthPx(undefined);
                          setCornerBLWidthPx(undefined);
                        } else {
                          const applyDelta = (current: number | undefined) =>
                            Math.max(4, (current ?? chairWidthPx) + delta);
                          if (selectedSeat.kind === 'side') {
                            const idx = selectedSeat.index;
                            if (selectedSeat.side === 'top') {
                              setTopSeatSizes(prev => {
                                const next = prev.slice();
                                const base = next[idx] || {};
                                const proposed = applyDelta(base.w);
                                const clamped = clampSideSeatWidth('top', idx, proposed);
                                next[idx] = { ...base, w: clamped };
                                return next;
                              });
                            } else if (selectedSeat.side === 'right') {
                              setRightSeatSizes(prev => {
                                const next = prev.slice();
                                const base = next[idx] || {};
                                const proposed = applyDelta(base.w);
                                const clamped = clampSideSeatWidth('right', idx, proposed);
                                next[idx] = { ...base, w: clamped };
                                return next;
                              });
                            } else if (selectedSeat.side === 'bottom') {
                              setBottomSeatSizes(prev => {
                                const next = prev.slice();
                                const base = next[idx] || {};
                                const proposed = applyDelta(base.w);
                                const clamped = clampSideSeatWidth('bottom', idx, proposed);
                                next[idx] = { ...base, w: clamped };
                                return next;
                              });
                            } else {
                              setLeftSeatSizes(prev => {
                                const next = prev.slice();
                                const base = next[idx] || {};
                                const proposed = applyDelta(base.w);
                                const clamped = clampSideSeatWidth('left', idx, proposed);
                                next[idx] = { ...base, w: clamped };
                                return next;
                              });
                            }
                          } else if (selectedSeat.kind === 'circle') {
                            const idx = selectedSeat.index;
                            setCircleSeatSizes(prev => {
                              const next = prev.slice();
                              const base = next[idx] || {};
                              const proposed = applyDelta(base.w);
                              const clamped = clampCircleSeatWidth(idx, proposed);
                              next[idx] = { ...base, w: clamped };
                              return next;
                            });
                          } else if (selectedSeat.kind === 'corner') {
                            const applyCorner = (cur: number | undefined) => applyDelta(cur);
                            if (selectedSeat.corner === 'tl') setCornerTLWidthPx(applyCorner);
                            if (selectedSeat.corner === 'tr') setCornerTRWidthPx(applyCorner);
                            if (selectedSeat.corner === 'br') setCornerBRWidthPx(applyCorner);
                            if (selectedSeat.corner === 'bl') setCornerBLWidthPx(applyCorner);
                          }
                        }
                      }}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={4}
                      readOnly
                      value={(() => {
                        if (!selectedSeat) return chairWidthPx;
                        if (selectedSeat.kind === 'side') {
                          const idx = selectedSeat.index;
                          const arr =
                            selectedSeat.side === 'top' ? topSeatSizes
                            : selectedSeat.side === 'right' ? rightSeatSizes
                            : selectedSeat.side === 'bottom' ? bottomSeatSizes
                            : leftSeatSizes;
                          const entry = arr[idx];
                          return entry?.w ?? chairWidthPx;
                        }
                        if (selectedSeat.kind === 'circle') {
                          const entry = circleSeatSizes[selectedSeat.index];
                          return entry?.w ?? chairWidthPx;
                        }
                        if (selectedSeat.kind === 'corner') {
                          if (selectedSeat.corner === 'tl') return cornerTLWidthPx ?? chairWidthPx;
                          if (selectedSeat.corner === 'tr') return cornerTRWidthPx ?? chairWidthPx;
                          if (selectedSeat.corner === 'br') return cornerBRWidthPx ?? chairWidthPx;
                          return cornerBLWidthPx ?? chairWidthPx;
                        }
                        return chairWidthPx;
                      })()}
                      className={numberInputClass}
                    />
                    <button
                      className={smallBtnClass}
                      type="button"
                      onClick={() => {
                        const delta = 2;
                        if (!selectedSeat) {
                          if (!canApplyGlobalSizeChange(delta, 0)) return;
                          setChairWidthPx(w => Math.max(4, (w || 0) + delta));
                          // Global change → clear all per-seat overrides so everything follows new base
                          setTopSeatSizes([]);
                          setRightSeatSizes([]);
                          setBottomSeatSizes([]);
                          setLeftSeatSizes([]);
                          setCircleSeatSizes([]);
                          setCornerTLWidthPx(undefined);
                          setCornerTRWidthPx(undefined);
                          setCornerBRWidthPx(undefined);
                          setCornerBLWidthPx(undefined);
                        } else {
                          const applyDelta = (current: number | undefined) =>
                            Math.max(4, (current ?? chairWidthPx) + delta);
                          if (selectedSeat.kind === 'side') {
                            const idx = selectedSeat.index;
                            if (selectedSeat.side === 'top') {
                              setTopSeatSizes(prev => {
                                const next = prev.slice();
                                const base = next[idx] || {};
                                const proposed = applyDelta(base.w);
                                const clamped = clampSideSeatWidth('top', idx, proposed);
                                next[idx] = { ...base, w: clamped };
                                return next;
                              });
                            } else if (selectedSeat.side === 'right') {
                              setRightSeatSizes(prev => {
                                const next = prev.slice();
                                const base = next[idx] || {};
                                const proposed = applyDelta(base.w);
                                const clamped = clampSideSeatWidth('right', idx, proposed);
                                next[idx] = { ...base, w: clamped };
                                return next;
                              });
                            } else if (selectedSeat.side === 'bottom') {
                              setBottomSeatSizes(prev => {
                                const next = prev.slice();
                                const base = next[idx] || {};
                                const proposed = applyDelta(base.w);
                                const clamped = clampSideSeatWidth('bottom', idx, proposed);
                                next[idx] = { ...base, w: clamped };
                                return next;
                              });
                            } else {
                              setLeftSeatSizes(prev => {
                                const next = prev.slice();
                                const base = next[idx] || {};
                                const proposed = applyDelta(base.w);
                                const clamped = clampSideSeatWidth('left', idx, proposed);
                                next[idx] = { ...base, w: clamped };
                                return next;
                              });
                            }
                          } else if (selectedSeat.kind === 'circle') {
                            const idx = selectedSeat.index;
                            setCircleSeatSizes(prev => {
                              const next = prev.slice();
                              const base = next[idx] || {};
                              const proposed = applyDelta(base.w);
                              const clamped = clampCircleSeatWidth(idx, proposed);
                              next[idx] = { ...base, w: clamped };
                              return next;
                            });
                          } else if (selectedSeat.kind === 'corner') {
                            const applyCorner = (cur: number | undefined) => applyDelta(cur);
                            if (selectedSeat.corner === 'tl') setCornerTLWidthPx(applyCorner);
                            if (selectedSeat.corner === 'tr') setCornerTRWidthPx(applyCorner);
                            if (selectedSeat.corner === 'br') setCornerBRWidthPx(applyCorner);
                            if (selectedSeat.corner === 'bl') setCornerBLWidthPx(applyCorner);
                          }
                        }
                      }}
                    >
                      +
                    </button>
                  </div>
                  <span className={mutedTextClass}>H</span>
                  <div className="flex items-center gap-1">
                    <button
                      className={smallBtnClass}
                      type="button"
                      onClick={() => {
                        const delta = -2;
                        if (!selectedSeat) {
                          setChairHeightPx(h => Math.max(4, (h || 0) + delta));
                          // Global change → clear all per-seat overrides so everything follows new base
                          setTopSeatSizes([]);
                          setRightSeatSizes([]);
                          setBottomSeatSizes([]);
                          setLeftSeatSizes([]);
                          setCircleSeatSizes([]);
                          setCornerTLHeightPx(undefined);
                          setCornerTRHeightPx(undefined);
                          setCornerBRHeightPx(undefined);
                          setCornerBLHeightPx(undefined);
                        } else {
                          const applyDelta = (current: number | undefined) =>
                            Math.max(4, (current ?? chairHeightPx) + delta);
                          if (selectedSeat.kind === 'side') {
                            const idx = selectedSeat.index;
                            if (selectedSeat.side === 'top') {
                              setTopSeatSizes(prev => {
                                const next = prev.slice();
                                const base = next[idx] || {};
                                next[idx] = { ...base, h: applyDelta(base.h) };
                                return next;
                              });
                            } else if (selectedSeat.side === 'right') {
                              setRightSeatSizes(prev => {
                                const next = prev.slice();
                                const base = next[idx] || {};
                                next[idx] = { ...base, h: applyDelta(base.h) };
                                return next;
                              });
                            } else if (selectedSeat.side === 'bottom') {
                              setBottomSeatSizes(prev => {
                                const next = prev.slice();
                                const base = next[idx] || {};
                                next[idx] = { ...base, h: applyDelta(base.h) };
                                return next;
                              });
                            } else {
                              setLeftSeatSizes(prev => {
                                const next = prev.slice();
                                const base = next[idx] || {};
                                next[idx] = { ...base, h: applyDelta(base.h) };
                                return next;
                              });
                            }
                          } else if (selectedSeat.kind === 'circle') {
                            const idx = selectedSeat.index;
                            setCircleSeatSizes(prev => {
                              const next = prev.slice();
                              const base = next[idx] || {};
                              next[idx] = { ...base, h: applyDelta(base.h) };
                              return next;
                            });
                          } else if (selectedSeat.kind === 'corner') {
                            const applyCorner = (cur: number | undefined) => applyDelta(cur);
                            if (selectedSeat.corner === 'tl') setCornerTLHeightPx(applyCorner);
                            if (selectedSeat.corner === 'tr') setCornerTRHeightPx(applyCorner);
                            if (selectedSeat.corner === 'br') setCornerBRHeightPx(applyCorner);
                            if (selectedSeat.corner === 'bl') setCornerBLHeightPx(applyCorner);
                          }
                        }
                      }}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={4}
                      readOnly
                      value={(() => {
                        if (!selectedSeat) return chairHeightPx;
                        if (selectedSeat.kind === 'side') {
                          const idx = selectedSeat.index;
                          const arr =
                            selectedSeat.side === 'top' ? topSeatSizes
                            : selectedSeat.side === 'right' ? rightSeatSizes
                            : selectedSeat.side === 'bottom' ? bottomSeatSizes
                            : leftSeatSizes;
                          const entry = arr[idx];
                          return entry?.h ?? chairHeightPx;
                        }
                        if (selectedSeat.kind === 'circle') {
                          const entry = circleSeatSizes[selectedSeat.index];
                          return entry?.h ?? chairHeightPx;
                        }
                        if (selectedSeat.kind === 'corner') {
                          if (selectedSeat.corner === 'tl') return cornerTLHeightPx ?? chairHeightPx;
                          if (selectedSeat.corner === 'tr') return cornerTRHeightPx ?? chairHeightPx;
                          if (selectedSeat.corner === 'br') return cornerBRHeightPx ?? chairHeightPx;
                          return cornerBLHeightPx ?? chairHeightPx;
                        }
                        return chairHeightPx;
                      })()}
                      className={numberInputClass}
                    />
                    <button
                      className={smallBtnClass}
                      type="button"
                      onClick={() => {
                        const delta = 2;
                        if (!selectedSeat) {
                          if (!canApplyGlobalSizeChange(0, delta)) return;
                          setChairHeightPx(h => Math.max(4, (h || 0) + delta));
                          // Global change → clear all per-seat overrides so everything follows new base
                          setTopSeatSizes([]);
                          setRightSeatSizes([]);
                          setBottomSeatSizes([]);
                          setLeftSeatSizes([]);
                          setCircleSeatSizes([]);
                          setCornerTLHeightPx(undefined);
                          setCornerTRHeightPx(undefined);
                          setCornerBRHeightPx(undefined);
                          setCornerBLHeightPx(undefined);
                        } else {
                          const applyDelta = (current: number | undefined) =>
                            Math.max(4, (current ?? chairHeightPx) + delta);
                          if (selectedSeat.kind === 'side') {
                            const idx = selectedSeat.index;
                            if (selectedSeat.side === 'top') {
                              setTopSeatSizes(prev => {
                                const next = prev.slice();
                                const base = next[idx] || {};
                                next[idx] = { ...base, h: applyDelta(base.h) };
                                return next;
                              });
                            } else if (selectedSeat.side === 'right') {
                              setRightSeatSizes(prev => {
                                const next = prev.slice();
                                const base = next[idx] || {};
                                next[idx] = { ...base, h: applyDelta(base.h) };
                                return next;
                              });
                            } else if (selectedSeat.side === 'bottom') {
                              setBottomSeatSizes(prev => {
                                const next = prev.slice();
                                const base = next[idx] || {};
                                next[idx] = { ...base, h: applyDelta(base.h) };
                                return next;
                              });
                            } else {
                              setLeftSeatSizes(prev => {
                                const next = prev.slice();
                                const base = next[idx] || {};
                                next[idx] = { ...base, h: applyDelta(base.h) };
                                return next;
                              });
                            }
                          } else if (selectedSeat.kind === 'circle') {
                            const idx = selectedSeat.index;
                            setCircleSeatSizes(prev => {
                              const next = prev.slice();
                              const base = next[idx] || {};
                              next[idx] = { ...base, h: applyDelta(base.h) };
                              return next;
                            });
                          } else if (selectedSeat.kind === 'corner') {
                            const applyCorner = (cur: number | undefined) => applyDelta(cur);
                            if (selectedSeat.corner === 'tl') setCornerTLHeightPx(applyCorner);
                            if (selectedSeat.corner === 'tr') setCornerTRHeightPx(applyCorner);
                            if (selectedSeat.corner === 'br') setCornerBRHeightPx(applyCorner);
                            if (selectedSeat.corner === 'bl') setCornerBLHeightPx(applyCorner);
                          }
                        }
                      }}
                    >
                      +
                    </button>
                  </div>
                  <div className={`${mutedTextClass} text-xs ml-2`}>px</div>
                </div>
              </div>

              {/* Spacing */}
              <div className="flex items-center justify-between gap-3">
                <div className={`${labelTextClass} w-24`}>
                  {isSR ? 'Razmak' : 'Spacing'}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      className={smallBtnClass}
                      onClick={() => setChairSpacingPx(s => Math.max(0, (s || 0) - 2))}
                      type="button"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={chairSpacingPx}
                      readOnly
                      className={numberInputClass}
                    />
                    <button
                      className={smallBtnClass}
                      onClick={() => {
                        const delta = 2;
                        if (!canApplySpacingChange(delta)) return;
                        setChairSpacingPx(s => Math.max(0, (s || 0) + delta));
                      }}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                  <div className={`${mutedTextClass} text-xs ml-2`}>
                    {isSR ? 'px između stolica' : 'px between chairs'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Arrangement settings */}
          <div className={`${sectionClass} p-4`}>
            <div className={sectionHeaderClass}>
              {table?.type === 'circle'
                ? (isSR ? 'Stolice oko stola' : 'Seats around table')
                : (isSR ? 'Stolice po stranama i uglovima' : 'Seats by side & corners')}
            </div>
            {table?.type === 'circle' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      id="circle-booth-enabled"
                      type="button"
                      onClick={() => {
                        const enabled = !circleBoothEnabled;
                        setCircleBoothEnabled(enabled);
                        if (enabled) {
                          // ensure at least 1 slot (the booth) + default 2 seats
                          const seatCount = Math.max(0, Math.min(2, clampCircleCountBySeatCapacity(3) - 1));
                          const total = 1 + seatCount;
                          setCircleCount(total);
                          setCircleVariants(prev => {
                            const next = prev.slice(0, total);
                            while (next.length < total) next.push(circleVariant);
                            next[0] = 'boothCurved';
                            return next;
                          });
                          // Offset startuje na 0° kada se doda separe (može dalje da se rotira).
                          setCircleStartDeg(0);
                          setCircleSeatSizes(prev => prev.slice(0, total));
                        } else {
                          // drop booth
                          const total = Math.max(0, circleCount - 1);
                          setCircleCount(total);
                          setCircleVariants(prev => {
                            const next = prev.slice(0, total).map(v =>
                              v === 'boothCurved' || v === 'boothU' ? 'standard' : v
                            );
                            return next;
                          });
                          setCircleSeatSizes(prev => prev.slice(0, total));
                        }
                      }}
                      className={
                        circleBoothEnabled
                          ? 'w-4 h-4 rounded-full border border-blue-400 bg-blue-400 flex items-center justify-center'
                          : 'w-4 h-4 rounded-full border border-gray-500 bg-transparent flex items-center justify-center'
                      }
                      aria-pressed={circleBoothEnabled}
                    >
                      <span className={circleBoothEnabled ? 'text-[10px] text-[#ffffff]' : 'text-[10px] text-transparent'}>
                        ✓
                      </span>
                    </button>
                    <label htmlFor="circle-booth-enabled" className={`${labelTextClass} text-xs select-none`}>
                      {isSR ? 'Dodaj separe (donja strana)' : 'Add booth (bottom side)'}
                    </label>
                  </div>
                  <div className={`${mutedTextClass} text-[10px] ml-3`}>
                    {(() => {
                      if (table?.type !== 'circle') return null;
                      const capacity = getCircleCapacity();
                      const totalSlots = Math.max(0, Number(circleCount) || 0);
                      return isSR
                        ? `Slotovi: ${totalSlots}${capacity ? ` / ${capacity}` : ''}`
                        : `Slots: ${totalSlots}${capacity ? ` / ${capacity}` : ''}`;
                    })()}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className={`${labelTextClass} w-36`}>
                    {circleBoothEnabled
                      ? (isSR ? 'Stolice na slobodnoj polovini' : 'Seats on free half')
                      : (isSR ? 'Oko stola' : 'Around')}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className={smallBtnClass}
                      onClick={() => {
                        const maxFreeHalf = getBoothHalfCapacity();
                        const seatCount = circleBoothEnabled ? Math.max(0, circleCount - 1) : circleCount;
                        const nextSeat = Math.max(0, (seatCount || 0) - 1);
                        const total = circleBoothEnabled ? Math.min(1 + nextSeat, 1 + maxFreeHalf) : nextSeat;
                        setCircleCount(total);
                        setCircleVariants(v => {
                          const next = v.slice(0, total);
                          while (next.length < total) next.push(circleVariant);
                          if (circleBoothEnabled && total > 0) next[0] = 'boothCurved';
                          return next;
                        });
                        setCircleSeatSizes(prev => prev.slice(0, total));
                      }}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={circleBoothEnabled ? 1 : 0}
                      max={circleBoothEnabled ? 1 + getBoothHalfCapacity() : clampCircleCountBySeatCapacity(Math.round(Math.min(tableCellsW, tableCellsH)))}
                      value={circleCount}
                      onChange={(e) => {
                        const maxFreeHalf = getBoothHalfCapacity();
                        const raw = parseInt(e.target.value || '0', 10) || 0;
                        let total = circleBoothEnabled ? Math.max(1, Math.min(1 + maxFreeHalf, raw)) : Math.max(0, raw);
                        const clamped = clampCircleCountBySeatCapacity(total);
                        total = circleBoothEnabled ? Math.max(1, Math.min(1 + maxFreeHalf, clamped)) : clamped;
                        setCircleCount(total);
                        setCircleVariants(prev => {
                          const next = prev.slice(0, total);
                          while (next.length < total) next.push(circleVariant);
                          if (circleBoothEnabled && total > 0) next[0] = 'boothCurved';
                          return next;
                        });
                        setCircleSeatSizes(prev => prev.slice(0, total));
                      }}
                      className={numberInputClass}
                    />
                    <button
                      className={smallBtnClass}
                      onClick={() => {
                        const maxFreeHalf = getBoothHalfCapacity();
                        const seatCount = circleBoothEnabled ? Math.max(0, circleCount - 1) : circleCount;
                        const nextSeat = circleBoothEnabled ? Math.min(maxFreeHalf, seatCount + 1) : seatCount + 1;
                        const totalRequested = circleBoothEnabled ? 1 + nextSeat : nextSeat;
                        const d = clampCircleCountBySeatCapacity(totalRequested);
                        const total = circleBoothEnabled ? Math.min(1 + maxFreeHalf, Math.max(1, d)) : d;
                        setCircleCount(total);
                        setCircleVariants(prev => {
                          const next = prev.slice(0, total);
                          while (next.length < total) next.push(circleVariant);
                          if (circleBoothEnabled && total > 0) next[0] = 'boothCurved';
                          return next;
                        });
                        setCircleSeatSizes(prev => prev.slice(0, total));
                      }}
                    >
                      +
                    </button>
                  </div>
                  <div className={`${mutedTextClass} text-[10px] ml-3`}>
                    {(() => {
                      if (table?.type !== 'circle') return null;
                      const capacity = getCircleCapacity();
                      const n = Math.max(0, Math.min(64, Number(circleCount) || 0));
                      if (n <= 0) {
                        return isSR
                          ? `Stolice: 0${capacity ? ` / ${capacity}` : ''}`
                          : `Seats: 0${capacity ? ` / ${capacity}` : ''}`;
                      }
                      const rawVariants: ChairVariant[] = Array.from(
                        { length: n },
                        (_, i) => (circleVariants[i] || circleVariant) as ChairVariant
                      );
                      const usedRaw = computeCircleSeatUnitsEffective(
                        n,
                        rawVariants,
                        circleStartDeg || 0
                      );
                      const used = capacity ? Math.min(usedRaw, capacity) : usedRaw;
                      return isSR
                        ? `Stolice: ${used}${capacity ? ` / ${capacity}` : ''}`
                        : `Seats: ${used}${capacity ? ` / ${capacity}` : ''}`;
                    })()}
                  </div>
                </div>
                {circleCount > 0 && (
                  <div className="space-y-2">
                    <div className={`${labelTextClass} text-xs`}>
                      {isSR ? 'Varijante po stolici' : 'Per-seat variants'}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(() => {
                        const seatCount = Math.max(0, circleCount);
                        return Array.from({ length: seatCount }, (_, i) => {
                          const isBooth = circleBoothEnabled && i === 0;
                          return (
                            <div key={`cv-${i}`} className="flex items-center gap-2">
                              <div className="text-xs w-8 text-right">{i + 1}</div>
                              <VariantDropdown
                                value={circleVariants[i] || circleVariant}
                                options={circleVariantOptions as unknown as SimpleOption[]}
                                isLight={isLight}
                                disabled={isBooth}
                                getOptionDisabled={(val) =>
                                  !isCircleVariantAllowedForSeat(i, val as ChairVariant)
                                }
                                onChange={(v) => {
                                  const nextVal = v as any;
                                  setCircleVariants(prev => {
                                    const next = prev.slice();
                                    while (next.length < circleCount) next.push(circleVariant);
                                    next[i] = nextVal;
                                    return next;
                                  });
                                }}
                              />
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <div className={`${labelTextClass} w-24`}>
                    {isSR ? 'Pomeraj°' : 'Offset°'}
                  </div>
                  <div className="flex items-center gap-2">
                    <button className={smallBtnClass} onClick={() => setCircleStartDeg(((circleStartDeg - 5) % 360 + 360) % 360)}>−</button>
                    <input
                      type="number"
                      min={0}
                      max={359}
                      value={circleStartDeg}
                      onChange={(e) => {
                        const v = parseInt(e.target.value || '0', 10) || 0;
                        setCircleStartDeg(((v % 360) + 360) % 360);
                      }}
                      onFocus={(e) => e.target.select()}
                      className={numberInputClass}
                    />
                    <button className={smallBtnClass} onClick={() => setCircleStartDeg(((circleStartDeg + 5) % 360 + 360) % 360)}>+</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* LEFT COLUMN: Top/Right/Bottom/Left */}
                <div className="space-y-4">
                  <div className={`${labelTextClass} text-[11px] font-medium uppercase tracking-wide`}>
                    {isSR ? 'Strane stola' : 'Table Sides'}
                  </div>
                  {(['top', 'right', 'bottom', 'left'] as const).map(side => {
                    const rawCount = side === 'top' ? top : side === 'right' ? right : side === 'bottom' ? bottom : left;
                    const maxSide = side === 'top' ? maxTop : side === 'right' ? maxRight : side === 'bottom' ? maxBottom : maxLeft;
                    const variant = side === 'top' ? topVariant : side === 'right' ? rightVariant : side === 'bottom' ? bottomVariant : leftVariant;
                    const isUSide = activeRectUSide === side;
                    const isOccupiedByU = !!activeRectUSide && rectUSideOccupies(side) && !isUSide;
                    // Šta prikazujemo u inputu:
                    // Na svim stranama koje zauzima U separe (uključujući i baznu stranu),
                    // prikazujemo 0 "stolica" – jer je tu zapravo U separe, a ne pojedinačne stolice.
                    const isUSideActive = activeRectUSide === side;
                    const displayCount =
                      isUSideActive ? 1 :
                      (!!activeRectUSide && rectUSideOccupies(side)) ? 0 :
                      variant === 'boothU' ? (rawCount > 0 ? 1 : 0) :
                      rawCount;
                    return (
                      <div key={side} className="flex items-start justify-between gap-3">
                        <div className={`capitalize ${labelTextClass} w-24 leading-8`}>
                          {isSR
                            ? side === 'top'
                              ? 'Gore'
                              : side === 'right'
                                ? 'Desno'
                                : side === 'bottom'
                                  ? 'Dole'
                                  : 'Levo'
                            : side}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <button
                              className={smallBtnClass}
                              type="button"
                              onClick={() => {
                                // Minus na strani koju zauzima U uklanja ceo U (vrati count na 0 i varijantu na standard),
                                // dok na drugim zauzetim stranama nema efekta.
                                if (variant === 'boothU') {
                                  if (side === 'top') {
                                    setTop(0);
                                    setTopSeatSizes([]);
                                    setTopVariant('standard');
                                  }
                                  if (side === 'right') {
                                    setRight(0);
                                    setRightSeatSizes([]);
                                    setRightVariant('standard');
                                  }
                                  if (side === 'bottom') {
                                    setBottom(0);
                                    setBottomSeatSizes([]);
                                    setBottomVariant('standard');
                                  }
                                  if (side === 'left') {
                                    setLeft(0);
                                    setLeftSeatSizes([]);
                                    setLeftVariant('standard');
                                  }
                                  return;
                                }
                                if (isOccupiedByU) return;
                                if (side === 'top') {
                                  setTop(prev => {
                                    const next = Math.max(0, (prev || 0) - 1);
                                    setTopSeatSizes(sizes => sizes.slice(0, next));
                                    return next;
                                  });
                                }
                                if (side === 'right') {
                                  setRight(prev => {
                                    const next = Math.max(0, (prev || 0) - 1);
                                    setRightSeatSizes(sizes => sizes.slice(0, next));
                                    return next;
                                  });
                                }
                                if (side === 'bottom') {
                                  setBottom(prev => {
                                    const next = Math.max(0, (prev || 0) - 1);
                                    setBottomSeatSizes(sizes => sizes.slice(0, next));
                                    return next;
                                  });
                                }
                                if (side === 'left') {
                                  setLeft(prev => {
                                    const next = Math.max(0, (prev || 0) - 1);
                                    setLeftSeatSizes(sizes => sizes.slice(0, next));
                                    return next;
                                  });
                                }
                              }}
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={32}
                              value={displayCount}
                              readOnly
                              className={numberInputClass}
                            />
                            <button
                              className={smallBtnClass}
                              type="button"
                              onClick={() => {
                                // Plus za U separe samo pali/ostavlja jedan U.
                                if (variant === 'boothU') {
                                  if (side === 'top') {
                                    setTop(1);
                                    setTopSeatSizes([]);
                                  }
                                  if (side === 'right') {
                                    setRight(1);
                                    setRightSeatSizes([]);
                                  }
                                  if (side === 'bottom') {
                                    setBottom(1);
                                    setBottomSeatSizes([]);
                                  }
                                  if (side === 'left') {
                                    setLeft(1);
                                    setLeftSeatSizes([]);
                                  }
                                  return;
                                }
                                if (isOccupiedByU) return;
                                const inc = (val: number, max: number) => Math.min(32, Math.min(max, (val || 0) + 1));
                                if (side === 'top') setTop(inc(top || 0, maxTop));
                                if (side === 'right') setRight(inc(right || 0, maxRight));
                                if (side === 'bottom') setBottom(inc(bottom || 0, maxBottom));
                                if (side === 'left') setLeft(inc(left || 0, maxLeft));
                              }}
                            >
                              +
                            </button>
                            {/* Variant select */}
                            <div className="ml-3 max-w-[220px]">
                              <VariantDropdown
                                value={variant}
                                options={rectSideVariantOptions as unknown as SimpleOption[]}
                                isLight={isLight}
                                disabled={displayCount === 0 && !isUSideActive}
                                getOptionDisabled={(val) => {
                                  if (val !== 'boothU') return false;
                                  if (!activeRectUSide) return false;
                                  // U-separe je već aktivan na nekoj strani – onemogući izbor
                                  // U na svim stranama koje taj separe zauzima, osim na bazičnoj strani.
                                  if (activeRectUSide === side) return false;
                                  return rectUSideOccupies(side);
                                }}
                                onChange={(v) => {
                                  const val = v as any;
                                // Uvek dozvoljavamo samo jedan U po stolu.
                                // Kada se uključi U na jednoj strani, broj stolica na
                                // svim stranama koje U fizički zauzima postaje 0.
                                if (val === 'boothU') {
                                  if (side === 'top') {
                                    setTopVariant('boothU');
                                    setTop(c => (c <= 0 ? 1 : c));
                                    // U na vrhu zauzima: top + left + right
                                    setLeft(0);
                                    setRight(0);
                                    setLeftSeatSizes([]);
                                    setRightSeatSizes([]);
                                    // Ostale strane resetuj ako su bile U
                                    setRightVariant(prev => prev === 'boothU' ? 'standard' : prev);
                                    setBottomVariant(prev => prev === 'boothU' ? 'standard' : prev);
                                    setLeftVariant(prev => prev === 'boothU' ? 'standard' : prev);
                                  } else if (side === 'right') {
                                    setRightVariant('boothU');
                                    setRight(c => (c <= 0 ? 1 : c));
                                    // U na desnoj zauzima: right + top + bottom
                                    setTop(0);
                                    setBottom(0);
                                    setTopSeatSizes([]);
                                    setBottomSeatSizes([]);
                                    setTopVariant(prev => prev === 'boothU' ? 'standard' : prev);
                                    setBottomVariant(prev => prev === 'boothU' ? 'standard' : prev);
                                    setLeftVariant(prev => prev === 'boothU' ? 'standard' : prev);
                                  } else if (side === 'bottom') {
                                    setBottomVariant('boothU');
                                    setBottom(c => (c <= 0 ? 1 : c));
                                    // U na dnu zauzima: bottom + left + right
                                    setLeft(0);
                                    setRight(0);
                                    setLeftSeatSizes([]);
                                    setRightSeatSizes([]);
                                    setTopVariant(prev => prev === 'boothU' ? 'standard' : prev);
                                    setRightVariant(prev => prev === 'boothU' ? 'standard' : prev);
                                    setLeftVariant(prev => prev === 'boothU' ? 'standard' : prev);
                                  } else if (side === 'left') {
                                    setLeftVariant('boothU');
                                    setLeft(c => (c <= 0 ? 1 : c));
                                    // U na levoj zauzima: left + top + bottom
                                    setTop(0);
                                    setBottom(0);
                                    setTopSeatSizes([]);
                                    setBottomSeatSizes([]);
                                    setTopVariant(prev => prev === 'boothU' ? 'standard' : prev);
                                    setRightVariant(prev => prev === 'boothU' ? 'standard' : prev);
                                    setBottomVariant(prev => prev === 'boothU' ? 'standard' : prev);
                                  }
                                  return;
                                }
                                // Ostale varijante rade standardno.
                                if (side === 'top') setTopVariant(val);
                                if (side === 'right') setRightVariant(val);
                                if (side === 'bottom') setBottomVariant(val);
                                if (side === 'left') setLeftVariant(val);
                              }}
                              />
                            </div>
                            <div className={`ml-2 text-[10px] ${mutedTextClass}`}>max {maxSide}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* RIGHT COLUMN: Corners */}
                <div className="space-y-4">
                  <div className={`${labelTextClass} text-[11px] font-medium uppercase tracking-wide`}>
                    {isSR ? 'Uglovi stola' : 'Table Corners'}
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-pressed={cornerTL}
                          onClick={() => setCornerTL(prev => !prev)}
                          className={
                            `w-6 h-6 rounded-full flex items-center justify-center border text-[10px] transition-colors cursor-pointer ` +
                            (cornerTL
                              ? 'bg-blue-500 border-blue-400 text-white shadow-[0_0_0_1px_rgba(59,130,246,0.6)]'
                              : isLight
                                ? 'bg-white border-gray-300 text-gray-400 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-500'
                                : 'bg-[#020617] border-gray-700 text-gray-500 hover:bg-blue-500/10 hover:border-blue-400 hover:text-blue-400')
                          }
                        >
                          {cornerTL && (
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke={isLight ? '#FFFFFF' : 'currentColor'}
                              strokeWidth="3"
                            >
                              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                        <span className={`text-xs ${labelTextClass}`}>
                          {isSR ? 'GL' : 'TL'}
                        </span>
                      </div>
                      <div className="max-w-[220px]">
                        <VariantDropdown
                          value={cornerTLVariant}
                          options={rectCornerVariantOptions as unknown as SimpleOption[]}
                          isLight={isLight}
                          onChange={(v) => setCornerTLVariant(v as any)}
                          disabled={!cornerTL}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-pressed={cornerTR}
                          onClick={() => setCornerTR(prev => !prev)}
                          className={
                            `w-6 h-6 rounded-full flex items-center justify-center border text-[10px] transition-colors cursor-pointer ` +
                            (cornerTR
                              ? 'bg-blue-500 border-blue-400 text-white shadow-[0_0_0_1px_rgba(59,130,246,0.6)]'
                              : isLight
                                ? 'bg-white border-gray-300 text-gray-400 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-500'
                                : 'bg-[#020617] border-gray-700 text-gray-500 hover:bg-blue-500/10 hover:border-blue-400 hover:text-blue-400')
                          }
                        >
                          {cornerTR && (
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke={isLight ? '#FFFFFF' : 'currentColor'}
                              strokeWidth="3"
                            >
                              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                        <span className={`text-xs ${labelTextClass}`}>
                          {isSR ? 'GD' : 'TR'}
                        </span>
                      </div>
                      <div className="max-w-[220px]">
                        <VariantDropdown
                          value={cornerTRVariant}
                          options={rectCornerVariantOptions as unknown as SimpleOption[]}
                          isLight={isLight}
                          onChange={(v) => setCornerTRVariant(v as any)}
                          disabled={!cornerTR}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-pressed={cornerBR}
                          onClick={() => setCornerBR(prev => !prev)}
                          className={
                            `w-6 h-6 rounded-full flex items-center justify-center border text-[10px] transition-colors cursor-pointer ` +
                            (cornerBR
                              ? 'bg-blue-500 border-blue-400 text-white shadow-[0_0_0_1px_rgba(59,130,246,0.6)]'
                              : isLight
                                ? 'bg-white border-gray-300 text-gray-400 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-500'
                                : 'bg-[#020617] border-gray-700 text-gray-500 hover:bg-blue-500/10 hover:border-blue-400 hover:text-blue-400')
                          }
                        >
                          {cornerBR && (
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke={isLight ? '#FFFFFF' : 'currentColor'}
                              strokeWidth="3"
                            >
                              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                        <span className={`text-xs ${labelTextClass}`}>
                          {isSR ? 'DD' : 'BR'}
                        </span>
                      </div>
                      <div className="max-w-[220px]">
                        <VariantDropdown
                          value={cornerBRVariant}
                          options={rectCornerVariantOptions as unknown as SimpleOption[]}
                          isLight={isLight}
                          onChange={(v) => setCornerBRVariant(v as any)}
                          disabled={!cornerBR}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-pressed={cornerBL}
                          onClick={() => setCornerBL(prev => !prev)}
                          className={
                            `w-6 h-6 rounded-full flex items-center justify-center border text-[10px] transition-colors cursor-pointer ` +
                            (cornerBL
                              ? 'bg-blue-500 border-blue-400 text-white shadow-[0_0_0_1px_rgba(59,130,246,0.6)]'
                              : isLight
                                ? 'bg-white border-gray-300 text-gray-400 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-500'
                                : 'bg-[#020617] border-gray-700 text-gray-500 hover:bg-blue-500/10 hover:border-blue-400 hover:text-blue-400')
                          }
                        >
                          {cornerBL && (
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke={isLight ? '#FFFFFF' : 'currentColor'}
                              strokeWidth="3"
                            >
                              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                        <span className={`text-xs ${labelTextClass}`}>
                          {isSR ? 'DL' : 'BL'}
                        </span>
                      </div>
                      <div className="max-w-[220px]">
                        <VariantDropdown
                          value={cornerBLVariant}
                          options={rectCornerVariantOptions as unknown as SimpleOption[]}
                          isLight={isLight}
                          onChange={(v) => setCornerBLVariant(v as any)}
                          disabled={!cornerBL}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
        </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="px-4 pb-4 pt-3 flex justify-end gap-3">
          <button
            className={saveBtnClass}
            onClick={handleSave}
            disabled={!hasChanges}
          >
            {t('save')}
          </button>
          <button className={cancelBtnClass} onClick={onClose}>
            {t('cancel')}
          </button>
        </div>
    </Modal>
  );
};

export default AddSeatsModal;


