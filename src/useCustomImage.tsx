import { useState, useEffect } from "react";

export function useCustomImage(src: string): [HTMLImageElement | null, boolean] {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [status, setStatus] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      setImage(img);
      setStatus(true);
    };
    img.onerror = () => setStatus(false);
  }, [src]);

  return [image, status];
}
