/**
 * Utility functions for handling zoom-adjusted coordinates
 */

/**
 * Gets the current zoom level from document.body.style.zoom
 * @returns The zoom factor (1.0 = 100%, 1.5 = 150%, etc.)
 */
export function getZoom(): number {
  // Prefer app-level zoom set on #app-zoom-root (App.tsx)
  const root = document.getElementById('app-zoom-root') as HTMLElement | null;
  const zoomStyle = root?.style?.zoom || document.body.style.zoom || '';
  if (!zoomStyle || zoomStyle === '') {
    return 1.0;
  }
  // Handle percentage values (e.g., "85%")
  if (zoomStyle.endsWith('%')) {
    const pct = parseFloat(zoomStyle.replace('%', ''));
    return isNaN(pct) ? 1.0 : (pct / 100);
  }
  // Handle decimal values (e.g., "0.85")
  const zoom = parseFloat(zoomStyle);
  return isNaN(zoom) ? 1.0 : zoom;
}

/**
 * Adjusts mouse coordinates to account for zoom level
 * @param clientX - The raw clientX coordinate from mouse event
 * @param clientY - The raw clientY coordinate from mouse event
 * @param rect - The bounding rectangle of the container element
 * @returns Adjusted coordinates that account for zoom
 */
export function getZoomAdjustedCoordinates(
  clientX: number, 
  clientY: number, 
  rect: DOMRect
): { x: number; y: number } {
  const zoom = getZoom();
  
  // Calculate relative coordinates within the element
  const relativeX = clientX - rect.left;
  const relativeY = clientY - rect.top;
  
  // Adjust for zoom
  const adjustedX = relativeX / zoom;
  const adjustedY = relativeY / zoom;
  
  return { x: adjustedX, y: adjustedY };
}

/**
 * Adjusts a single coordinate value for zoom
 * @param value - The coordinate value to adjust
 * @returns The zoom-adjusted value
 */
export function adjustValueForZoom(value: number): number {
  const zoom = getZoom();
  return value / zoom;
}

/**
 * Adjusts screen coordinates (like context menu position) for zoom
 * @param clientX - The raw clientX coordinate from mouse event
 * @param clientY - The raw clientY coordinate from mouse event
 * @returns Adjusted screen coordinates
 */
export function getZoomAdjustedScreenCoordinates(
  clientX: number, 
  clientY: number
): { x: number; y: number } {
  const zoom = getZoom();
  return { 
    x: clientX / zoom, 
    y: clientY / zoom 
  };
} 