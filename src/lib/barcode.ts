import JsBarcode from 'jsbarcode';

export function generateBarcodeSvg(value: string, opts?: { height?: number; width?: number; fontSize?: number; displayValue?: boolean }): string {
  if (!value) return '';
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  try {
    JsBarcode(svg, String(value), {
      format: 'CODE128',
      height: opts?.height ?? 50,
      width: opts?.width ?? 1.6,
      fontSize: opts?.fontSize ?? 12,
      displayValue: opts?.displayValue ?? true,
      margin: 0,
      background: '#ffffff',
      lineColor: '#000000',
    });
  } catch {
    return '';
  }
  return new XMLSerializer().serializeToString(svg);
}
