import { useRef, useEffect, useState } from 'react';
import { Retool } from '@tryretool/custom-component-support';
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.entry';

export const ReactPdfHighlighter = () => {
  type Highlight = {
    bbox: [number, number, number, number] | null;
    color: [number, number, number];
    page: number;
  };

  const [pdfBase64] = Retool.useStateString({ name: 'pdfBase64' });
  const [highlightsUnparsed] = Retool.useStateArray({ name: 'highlights' });
  const highlights: Highlight[] = highlightsUnparsed as Highlight[];
  const [pageCount, setPageCount] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderPdfWithHighlights = async () => {
      const pdfData = atob(pdfBase64);
      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      const pdf = await loadingTask.promise;

      setPageCount(pdf.numPages); // Устанавливаем количество страниц

      if (!containerRef.current) return;

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });

        // Создаем canvas для каждой страницы
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          console.error(`Canvas context is null for page ${i}.`);
          continue;
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.marginBottom = '16px'; // Отступ между страницами
        canvas.style.display = 'block'; // Устанавливаем display block для центрирования
        canvas.style.margin = '0 auto'; // Центрируем канвас по горизонтали
        containerRef.current.appendChild(canvas);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        // Рендеринг страницы
        await page.render(renderContext).promise;

        // Добавление подсветки
        highlights
          .filter((highlight) => highlight.page === i) // Фильтруем подсветки для текущей страницы
          .forEach(({ bbox, color }) => {
            if (!bbox) return;

            const [x1, y1, x2, y2] = bbox;
            const highlightColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.5)`;

            context.fillStyle = highlightColor;
            context.fillRect(
              x1 * (viewport.width / 100),
              viewport.height - y2 * (viewport.height / 100), // Flip Y coordinate
              (x2 - x1) * (viewport.width / 100),
              (y2 - y1) * (viewport.height / 100)
            );
          });
      }
    };

    // Очищаем контейнер перед рендерингом
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    renderPdfWithHighlights();
  }, [pdfBase64, highlights]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100vh',
        overflowY: 'auto',
        position: 'relative',
        border: '1px solid black',
        padding: '8px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Страницы будут рендериться сюда */}
    </div>
  );
};