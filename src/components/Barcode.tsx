import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export function Barcode({
  value,
  height = 50,
  width = 1.6,
  fontSize = 12,
  displayValue = true,
  className,
}: {
  value: string;
  height?: number;
  width?: number;
  fontSize?: number;
  displayValue?: boolean;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, String(value), {
        format: 'CODE128',
        height, width, fontSize, displayValue,
        margin: 0, background: '#ffffff', lineColor: '#000000',
      });
    } catch {
      // ignore
    }
  }, [value, height, width, fontSize, displayValue]);
  return <svg ref={ref} className={className} />;
}
