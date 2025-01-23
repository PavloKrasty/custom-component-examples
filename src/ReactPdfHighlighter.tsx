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
  const [currentPage, setCurrentPage] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderPdfWithHighlights = async () => {
      const pdfData = atob(pdfBase64);
      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      const pdf = await loadingTask.promise;

      setPageCount(pdf.numPages);

      if (!containerRef.current) return;

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          console.error(`Canvas context is null for page ${i}.`);
          continue;
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.marginBottom = '16px';
        canvas.style.display = 'block';
        canvas.style.margin = '0 auto';
        containerRef.current.appendChild(canvas);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

        highlights
          .filter((highlight) => highlight.page === i)
          .forEach(({ bbox, color }) => {
            if (!bbox) return;

            const [x1, y1, x2, y2] = bbox;
            const highlightColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.5)`;

            context.fillStyle = highlightColor;
            context.fillRect(
              x1 * (viewport.width / 100),
              viewport.height - y2 * (viewport.height / 100),
              (x2 - x1) * (viewport.width / 100),
              (y2 - y1) * (viewport.height / 100)
            );
          });
      }
    };

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    renderPdfWithHighlights();
  }, [pdfBase64, highlights]);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const pages = Array.from(containerRef.current.querySelectorAll('canvas'));
      const scrollTop = containerRef.current.scrollTop;

      let visiblePage = 1;
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const pageTop = page.offsetTop;
        const pageHeight = page.offsetHeight;

        if (scrollTop >= pageTop && scrollTop < pageTop + pageHeight) {
          visiblePage = i + 1;
          break;
        }
      }

      setCurrentPage(visiblePage);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);

      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backgroundColor: 'white',
        textAlign: 'center',
        fontWeight: 'bold',
        padding: '8px 0',
        borderBottom: '1px solid #ccc',
      }}>
        Page {currentPage} / {pageCount}
      </div>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: 'calc(100vh - 40px)',
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
        {/* Pages will render here */}
      </div>
    </div>
  );
};
