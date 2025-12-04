import React, { useMemo, useState } from 'react';
import Modal from '../common/Modal';

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
    circleCount?: number; circleStartDeg?: number; circleVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU'; circleVariants?: Array<'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU'>;
    // New optional overrides
    chairWidthPx?: number; chairHeightPx?: number; chairSpacingPx?: number;
    // Per-seat sizes per side
    topSeatSizes?: Array<{ w: number; h: number }>;
    rightSeatSizes?: Array<{ w: number; h: number }>;
    bottomSeatSizes?: Array<{ w: number; h: number }>;
    leftSeatSizes?: Array<{ w: number; h: number }>;
    // Per-corner explicit sizes
    cornerTLWidthPx?: number; cornerTLHeightPx?: number;
    cornerTRWidthPx?: number; cornerTRHeightPx?: number;
    cornerBRWidthPx?: number; cornerBRHeightPx?: number;
    cornerBLWidthPx?: number; cornerBLHeightPx?: number;
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
      topSeatSizes?: Array<{ w: number; h: number }>;
      rightSeatSizes?: Array<{ w: number; h: number }>;
      bottomSeatSizes?: Array<{ w: number; h: number }>;
      leftSeatSizes?: Array<{ w: number; h: number }>;
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

const AddSeatsModal: React.FC<AddSeatsModalProps> = ({ isOpen, onClose, onSave, table }) => {
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
  const [initialSnapshot, setInitialSnapshot] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);

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
      chairSpacingPx: Number.isFinite((init as any).chairSpacingPx) ? Number((init as any).chairSpacingPx) : GRID * 0.5
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
    chairSpacingPx
  });

  React.useEffect(() => {
    if (!initialSnapshot) {
      setHasChanges(false);
      return;
    }
    setHasChanges(currentSnapshot !== initialSnapshot);
  }, [currentSnapshot, initialSnapshot]);

  // Capacity calculation (per side) using simple packing with 1-cell gaps
  const tableWCells = Math.round(Math.max(1, (table?.width || GRID * 6)) / GRID);
  const tableHCells = Math.round(Math.max(1, (table?.height || GRID * 4)) / GRID);
  const maxFor = (side: 'top' | 'right' | 'bottom' | 'left') => {
    const along = (side === 'top' || side === 'bottom') ? tableWCells : tableHCells;
    // Allow larger variants but treat span >= 3 as same packing unit
    const span = CHAIR_SPAN; // could be extended to depend on selected variant
    return Math.max(0, Math.floor((along + GAP) / (span + GAP)));
  };
  const maxTop = maxFor('top');
  const maxRight = maxFor('right');
  const maxBottom = maxFor('bottom');
  const maxLeft = maxFor('left');

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
    // Circle capacity: limit by diameter in grid cells
    const circleMaxBySize = Math.round(Math.min(
      Math.round(Math.max(1, (table?.width || GRID * 8)) / GRID),
      Math.round(Math.max(1, (table?.height || GRID * 8)) / GRID)
    ));
    const requestedCircleCount = Math.max(0, Math.min(64, Number(circleCount) || 0));
    const finalCircleCount = table?.type === 'circle' ? Math.min(circleMaxBySize, requestedCircleCount) : 0;
    const finalCircleVariants = Array.from({ length: finalCircleCount }, (_, i) => circleVariants[i] || circleVariant);
    onSave({
      top: Math.max(0, Math.min(32, clampedTop)),
      right: Math.max(0, Math.min(32, clampedRight)),
      bottom: Math.max(0, Math.min(32, clampedBottom)),
      left: Math.max(0, Math.min(32, clampedLeft)),
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
      chairWidthPx: Math.max(4, Math.round(Number(chairWidthPx) || GRID * 3)),
      chairHeightPx: Math.max(4, Math.round(Number(chairHeightPx) || GRID * 1)),
      chairSpacingPx: Math.max(0, Math.round(Number(chairSpacingPx) || GRID * 0.5)),
      // Clear any legacy per-seat and per-corner size overrides so all chairs use type-based sizes
      topSeatSizes: undefined,
      rightSeatSizes: undefined,
      bottomSeatSizes: undefined,
      leftSeatSizes: undefined,
      cornerTLWidthPx: undefined,
      cornerTLHeightPx: undefined,
      cornerTRWidthPx: undefined,
      cornerTRHeightPx: undefined,
      cornerBRWidthPx: undefined,
      cornerBRHeightPx: undefined,
      cornerBLWidthPx: undefined,
      cornerBLHeightPx: undefined,
      ...(table?.type === 'circle'
        ? {
            circleCount: finalCircleCount,
            circleStartDeg: ((Number(circleStartDeg) % 360) + 360) % 360,
            circleVariant,
            circleVariants: finalCircleVariants
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

  const selectClass = isLight
    ? 'w-full px-2.5 py-1.5 text-xs rounded bg-white border border-gray-300 text-gray-900 focus:outline-none focus:border-gray-400'
    : 'w-full px-2.5 py-1.5 text-xs rounded bg-[#0A1929] border border-gray-800 text-gray-100 focus:outline-none focus:border-gray-600';

  const rectSideVariantOptions = [
    { value: 'standard', label: 'Standard' },
    { value: 'barstool', label: 'Bar stool' },
    { value: 'boothU', label: 'U booth' },
  ] as const;

  // For corners we forbid U-booth
  const rectCornerVariantOptions = [
    { value: 'standard', label: 'Standard' },
    { value: 'barstool', label: 'Bar stool' },
  ] as const;

  const circleVariantOptions = [
    { value: 'standard', label: 'Standard' },
    { value: 'barstool', label: 'Bar stool' },
    { value: 'boothCurved', label: 'Semi-circular booth' },
  ] as const;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add seats" size="xl">
      <div className="p-4 text-xs">
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
        <div className="space-y-4">
          {/* Preview card */}
          <div className={`${sectionClass} p-4`}>
            <div className={sectionHeaderClass}>Preview</div>
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
                      const ticks = [];
                      const centerX = drawW / 2;
                      const centerY = drawH / 2;
                      const radius = Math.min(drawW, drawH) / 2;
                      const tickLen = 14;
                      const thick = 2;
                      for (let i = 0; i < n; i++) {
                        const angleDeg = ((circleStartDeg || 0) + (360 * i / n));
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
                        ticks.push(<div key={`c-${i}`} style={style} />);
                      }
                      return ticks;
                    })()
                  ) : (
                    <>
                      {renderGuideTicks('top', top)}
                      {renderGuideTicks('right', right)}
                      {renderGuideTicks('bottom', bottom)}
                      {renderGuideTicks('left', left)}
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
                  const getDims = (variant: string) => {
                    switch (variant) {
                      case 'barstool': {
                        // Always render bar stool as a perfect circle in preview
                        const side = (Math.max(chairWidthPx, chairHeightPx) / GRID) * cellPx;
                        return { w: side, h: side };
                      }
                      case 'boothCurved': return { w: 4 * cellPx, h: 2 * cellPx };
                      case 'boothU': return { w: 4 * cellPx, h: 4 * cellPx };
                      default: return { w: (chairWidthPx / GRID) * cellPx, h: (chairHeightPx / GRID) * cellPx };
                    }
                  };
                  const placeChair = (cx: number, cy: number, variant: string, rotDeg: number, key: string, overrideDims?: { w: number; h: number }) => {
                    const { w, h } = overrideDims || getDims(variant);
                    if (variant === 'barstool') {
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
                                <path
                                  d={`M 20 85 V 15 H 80 V 85`}
                                  fill="none"
                                  stroke="white"
                                  strokeWidth="28"
                                  vectorEffect="non-scaling-stroke"
                                  strokeLinecap="square"
                                  strokeLinejoin="round"
                                />
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
                        className="absolute"
                        style={{
                          left: `${cx}px`,
                          top: `${cy}px`,
                          width: `${w}px`,
                          height: `${h}px`,
                          transform: `translate(-50%, -50%) rotate(${rotDeg}deg)`,
                          transformOrigin: 'center',
                          background: chairColor,
                          borderRadius: 6,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.25)'
                        }}
                      />
                    );
                  };
                  if (table?.type === 'circle') {
                    const n = Math.max(0, Math.min(64, Number(circleCount) || 0));
                    if (n > 0) {
                      const R = Math.min(drawW, drawH) / 2;
                      const perSeat = Array.from({ length: n }, (_, i) => circleVariants[i] || circleVariant);
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
                      for (let i = 0; i < n; i++) {
                        const v = perSeat[i];
                        const angleDeg = ((circleStartDeg || 0) + (360 * i / n));
                        if (v === 'boothCurved') {
                          addCurvedArc(angleDeg, 2 * cellPx, `c-arc-${i}`);
                          continue;
                        }
                        if (v === 'boothU') {
                          addCurvedArc(angleDeg, 4 * cellPx, `c-arc-u-${i}`);
                          continue;
                        }
                        const a = angleDeg * Math.PI / 180;
                        const { h } = getDims(v);
                        const offset = h / 2 + gapEdge; // inner edge flush-ish
                        const cx = drawW / 2 + Math.cos(a) * (R + offset);
                        const cy = drawH / 2 + Math.sin(a) * (R + offset);
                        placeChair(cx, cy, v, angleDeg + 90, `c-${i}`);
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
                      if (count <= 0) return;
                      // spacing in preview coordinates
                      const sPx = Math.max(0, (chairSpacingPx / GRID) * cellPx);
                      const stepPxTop = (drawW - Math.max(0, (count - 1)) * sPx) / (count + 1);
                      const stepPxSide = (drawH - Math.max(0, (count - 1)) * sPx) / (count + 1);
                      for (let i = 1; i <= count; i++) {
                        let dims = getDims(variant);
                        // Za U separe na pravougaonim stranama, skaliraj dimenzije tako da unutrašnji otvor prati dužinu ivice stola
                        if (variant === 'boothU') {
                          const sideLengthPx = (side === 'top' || side === 'bottom') ? drawW : drawH;
                          const thicknessPx = (30 / GRID) * cellPx; // isti wall kao na platnu (30px), skaliran u preview
                          const outer = sideLengthPx + 2 * thicknessPx;
                          dims = { w: outer, h: outer };
                        }
                        const w = dims.w, h = dims.h;
                        if (side === 'top') {
                          const x = stepPxTop * i + sPx * (i - 1);
                          const cx = x - halfW;
                          const centerY = variant === 'boothU'
                            ? - ((30 / GRID) * cellPx / 2)
                            : - (h / 2) - marginOut;
                          // Open side toward table (below) => 0deg
                          placeChair(halfW + cx, centerY, variant, 0, `t-${i}`, dims);
                        } else if (side === 'bottom') {
                          const x = stepPxTop * i + sPx * (i - 1);
                          const cx = x - halfW;
                          const centerY = variant === 'boothU'
                            ? drawH + ((30 / GRID) * cellPx / 2)
                            : drawH + (h / 2) + marginOut;
                          // Open side toward table (above) => 180deg
                          placeChair(halfW + cx, centerY, variant, 180, `b-${i}`, dims);
                        } else if (side === 'left') {
                          const y = stepPxSide * i + sPx * (i - 1);
                          const cy = y - halfH;
                          const centerX = - (h / 2) - marginOut;
                          // Open side toward table (right) => rotate 270deg (-90)
                          placeChair(centerX, halfH + cy, variant, 270, `l-${i}`, dims);
                        } else if (side === 'right') {
                          const y = stepPxSide * i + sPx * (i - 1);
                          const cy = y - halfH;
                          const centerX = drawW + (h / 2) + marginOut;
                          // Open side toward table (left) => rotate 90deg
                          placeChair(centerX, halfH + cy, variant, 90, `r-${i}`, dims);
                        }
                      }
                    });
                    // Corners – rotate to match actual canvas placement (wide side towards table corner)
                    const cornerNodes: Array<{ enabled: boolean; key: string; x: number; y: number; rot: number; variant: string }> = [
                      // Ovi uglovi prate isti ugao kao u autoGenerateChairsForTable (Canvas.tsx):
                      // tl: -45°, tr: 45°, br: 135°, bl: -135°
                      { enabled: !!cornerTL, key: 'ctl', x: - (cellPx / 2) - cornerMarginOut, y: - (cellPx / 2) - cornerMarginOut, rot: -45, variant: cornerTLVariant },
                      { enabled: !!cornerTR, key: 'ctr', x: drawW + (cellPx / 2) + cornerMarginOut, y: - (cellPx / 2) - cornerMarginOut, rot: 45, variant: cornerTRVariant },
                      { enabled: !!cornerBR, key: 'cbr', x: drawW + (cellPx / 2) + cornerMarginOut, y: drawH + (cellPx / 2) + cornerMarginOut, rot: 135, variant: cornerBRVariant },
                      { enabled: !!cornerBL, key: 'cbl', x: - (cellPx / 2) - cornerMarginOut, y: drawH + (cellPx / 2) + cornerMarginOut, rot: -135, variant: cornerBLVariant }
                    ];
                    cornerNodes.forEach(c => {
                      if (!c.enabled) return;
                      const dims = getDims(c.variant);
                      placeChair(c.x, c.y, c.variant, c.rot, c.key, dims);
                    });
                  }
                  return nodes;
                })()}
              </div>
            </div>
          </div>

          {/* General settings */}
          <div className={`${sectionClass} p-4`}>
            <div className={sectionHeaderClass}>General</div>
            <div className={`${mutedTextClass} mb-3`}>
              {table?.type === 'circle'
                ? 'Choose how many chairs can be drawn around the table. Chairs will snap to evenly spaced guide ticks around the circle.'
                : 'Choose how many chairs can be drawn on each side. Chairs will snap to evenly spaced guide ticks on that side.'}
            </div>
            <div className="space-y-3">
              {/* Chair size */}
              <div className="flex items-center justify-between gap-3">
                <div className={`${labelTextClass} w-24`}>Chair size</div>
                <div className="flex items-center gap-2">
                  <span className={mutedTextClass}>W</span>
                  <div className="flex items-center gap-1">
                    <button
                      className={smallBtnClass}
                      onClick={() => setChairWidthPx(w => Math.max(4, (w || 0) - 2))}
                      type="button"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={4}
                      value={chairWidthPx}
                      readOnly
                      className={numberInputClass}
                    />
                    <button
                      className={smallBtnClass}
                      onClick={() => setChairWidthPx(w => Math.max(4, (w || 0) + 2))}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                  <span className={mutedTextClass}>H</span>
                  <div className="flex items-center gap-1">
                    <button
                      className={smallBtnClass}
                      onClick={() => setChairHeightPx(h => Math.max(4, (h || 0) - 2))}
                      type="button"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={4}
                      value={chairHeightPx}
                      readOnly
                      className={numberInputClass}
                    />
                    <button
                      className={smallBtnClass}
                      onClick={() => setChairHeightPx(h => Math.max(4, (h || 0) + 2))}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                  <div className={`${mutedTextClass} text-xs ml-2`}>px</div>
                </div>
              </div>

              {/* Spacing */}
              <div className="flex items-center justify-between gap-3">
                <div className={`${labelTextClass} w-24`}>Spacing</div>
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
                      onClick={() => setChairSpacingPx(s => Math.max(0, (s || 0) + 2))}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                  <div className={`${mutedTextClass} text-xs ml-2`}>px between chairs</div>
                </div>
              </div>
            </div>
          </div>

          {/* Arrangement settings */}
          <div className={`${sectionClass} p-4`}>
            <div className={sectionHeaderClass}>
              {table?.type === 'circle' ? 'Seats around table' : 'Seats by side & corners'}
            </div>
            {table?.type === 'circle' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className={`${labelTextClass} w-24`}>Around</div>
                  <div className="flex items-center gap-2">
                    <button
                      className={smallBtnClass}
                      onClick={() => {
                        const d = Math.max(0, (circleCount || 0) - 1);
                        setCircleCount(d);
                        setCircleVariants(v => v.slice(0, d));
                      }}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={Math.round(Math.min(tableCellsW, tableCellsH))}
                      value={circleCount}
                      onChange={(e) => {
                        const max = Math.round(Math.min(tableCellsW, tableCellsH));
                        const v = Math.max(0, Math.min(max, parseInt(e.target.value || '0', 10) || 0));
                        setCircleCount(v);
                        setCircleVariants(prev => {
                          const next = prev.slice(0, v);
                          while (next.length < v) next.push(circleVariant);
                          return next;
                        });
                      }}
                      className={numberInputClass}
                    />
                    <button
                      className={smallBtnClass}
                      onClick={() => {
                        const max = Math.round(Math.min(tableCellsW, tableCellsH));
                        const d = Math.min(max, (circleCount || 0) + 1);
                        setCircleCount(d);
                        setCircleVariants(prev => {
                          const next = prev.slice(0, d);
                          while (next.length < d) next.push(circleVariant);
                          return next;
                        });
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className={`${labelTextClass} w-24`}>Variant</div>
                  <select
                    className={`max-w-[220px] ${selectClass}`}
                    value={circleVariant}
                    onChange={(e) => setCircleVariant(e.target.value as any)}
                  >
                    {circleVariantOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                {circleCount > 0 && (
                  <div className="space-y-2">
                    <div className={`${labelTextClass} text-xs`}>Per-seat variants</div>
                    <div className="grid grid-cols-2 gap-2">
                      {Array.from({ length: circleCount }, (_, i) => (
                        <div key={`cv-${i}`} className="flex items-center gap-2">
                          <div className="text-xs w-8 text-right">{i + 1}</div>
                          <select
                            className={selectClass}
                            value={circleVariants[i] || circleVariant}
                            onChange={(e) => {
                              const v = e.target.value as any;
                              setCircleVariants(prev => {
                                const next = prev.slice();
                                while (next.length < circleCount) next.push(circleVariant);
                                next[i] = v;
                                return next;
                              });
                            }}
                          >
                            {circleVariantOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <div className={`${labelTextClass} w-24`}>Offset°</div>
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
                  <div className={`${labelTextClass} text-[11px] font-medium uppercase tracking-wide`}>Table Sides</div>
                  {(['top', 'right', 'bottom', 'left'] as const).map(side => {
                    const count = side === 'top' ? top : side === 'right' ? right : side === 'bottom' ? bottom : left;
                    const maxSide = side === 'top' ? maxTop : side === 'right' ? maxRight : side === 'bottom' ? maxBottom : maxLeft;
                    const variant = side === 'top' ? topVariant : side === 'right' ? rightVariant : side === 'bottom' ? bottomVariant : leftVariant;
                    return (
                      <div key={side} className="flex items-start justify-between gap-3">
                        <div className={`capitalize ${labelTextClass} w-24 leading-8`}>{side}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <button
                              className={smallBtnClass}
                              type="button"
                              onClick={() => {
                                if (side === 'top') setTop(Math.max(0, (top || 0) - 1));
                                if (side === 'right') setRight(Math.max(0, (right || 0) - 1));
                                if (side === 'bottom') setBottom(Math.max(0, (bottom || 0) - 1));
                                if (side === 'left') setLeft(Math.max(0, (left || 0) - 1));
                              }}
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={32}
                              value={count}
                              readOnly
                              className={numberInputClass}
                            />
                            <button
                              className={smallBtnClass}
                              type="button"
                              onClick={() => {
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
                            <select
                              className={`ml-3 max-w-[220px] ${selectClass}`}
                              value={variant}
                              onChange={(e) => {
                                const v = e.target.value as any;
                                if (side === 'top') setTopVariant(v);
                                if (side === 'right') setRightVariant(v);
                                if (side === 'bottom') setBottomVariant(v);
                                if (side === 'left') setLeftVariant(v);
                              }}
                            >
                              {rectSideVariantOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                            <div className={`ml-2 text-[10px] ${mutedTextClass}`}>max {maxSide}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* RIGHT COLUMN: Corners */}
                <div className="space-y-4">
                  <div className={`${labelTextClass} text-[11px] font-medium uppercase tracking-wide`}>Table Corners</div>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <label className="flex items-center gap-1 text-sm">
                        <input type="checkbox" checked={cornerTL} onChange={(e) => setCornerTL(e.target.checked)} />
                        TL
                      </label>
                      <select
                        className={`max-w-[220px] ${selectClass}`}
                        value={cornerTLVariant}
                        onChange={(e) => setCornerTLVariant(e.target.value as any)}
                        disabled={!cornerTL}
                      >
                        {rectCornerVariantOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <label className="flex items-center gap-1 text-sm">
                        <input type="checkbox" checked={cornerTR} onChange={(e) => setCornerTR(e.target.checked)} />
                        TR
                      </label>
                      <select
                        className={`max-w-[220px] ${selectClass}`}
                        value={cornerTRVariant}
                        onChange={(e) => setCornerTRVariant(e.target.value as any)}
                        disabled={!cornerTR}
                      >
                        {rectCornerVariantOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <label className="flex items-center gap-1 text-sm">
                        <input type="checkbox" checked={cornerBR} onChange={(e) => setCornerBR(e.target.checked)} />
                        BR
                      </label>
                      <select
                        className={`max-w-[220px] ${selectClass}`}
                        value={cornerBRVariant}
                        onChange={(e) => setCornerBRVariant(e.target.value as any)}
                        disabled={!cornerBR}
                      >
                        {rectCornerVariantOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <label className="flex items-center gap-1 text-sm">
                        <input type="checkbox" checked={cornerBL} onChange={(e) => setCornerBL(e.target.checked)} />
                        BL
                      </label>
                      <select
                        className={`max-w-[220px] ${selectClass}`}
                        value={cornerBLVariant}
                        onChange={(e) => setCornerBLVariant(e.target.value as any)}
                        disabled={!cornerBL}
                      >
                        {rectCornerVariantOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="pt-2 flex justify-end gap-3">
            <button
              className={saveBtnClass}
              onClick={handleSave}
              disabled={!hasChanges}
            >
              Save
            </button>
            <button className={cancelBtnClass} onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AddSeatsModal;


