/** Shared canvas dimensions for funnel editor ↔ API percent conversion */

export const CANVAS_WIDTH = 2000
export const CANVAS_HEIGHT = 1500

export function percentToPixel(percentX: number, percentY: number) {
  return {
    x: (percentX / 100) * CANVAS_WIDTH,
    y: (percentY / 100) * CANVAS_HEIGHT,
  }
}

export function pixelToPercent(x: number, y: number) {
  return {
    percentPosX: Math.round((x / CANVAS_WIDTH) * 100 * 100) / 100,
    percentPosY: Math.round((y / CANVAS_HEIGHT) * 100 * 100) / 100,
  }
}
