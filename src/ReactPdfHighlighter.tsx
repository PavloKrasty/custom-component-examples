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
  const [scale, setScale] = useState(1.5);

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
        const viewport = page.getViewport({ scale });

        const canvasWrapper = document.createElement('div');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          console.error(`Canvas context is null for page ${i}.`);
          continue;
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.display = 'block';

        canvasWrapper.appendChild(canvas);
        containerRef.current.appendChild(canvasWrapper);

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
  }, [pdfBase64, highlights, scale]);

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

  const handleZoomIn = () => {
    setScale((prevScale) => Math.min(prevScale + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale((prevScale) => Math.max(prevScale - 0.25, 0.5));
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backgroundColor: '#2d2d2d',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '8px 16px',
        borderBottom: '1px solid #444',
        color: 'white',
      }}>
        <button onClick={handleZoomOut} style={{
          backgroundColor: 'transparent',
          color: 'white',
          border: '1px solid white',
          borderRadius: '4px',
          padding: '4px 8px',
          cursor: 'pointer',
          fontSize: '14px',
          marginRight: '16px',
        }}>-</button>
        <span style={{ fontSize: '14px', marginRight: '16px' }}>Page {currentPage} / {pageCount}</span>
        <span style={{ fontSize: '14px', marginRight: '16px' }}>{Math.round(scale * 100)}%</span>
        <button onClick={handleZoomIn} style={{
          backgroundColor: 'transparent',
          color: 'white',
          border: '1px solid white',
          borderRadius: '4px',
          padding: '4px 8px',
          cursor: 'pointer',
          fontSize: '14px',
        }}>+</button>
      </div>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: 'calc(100vh - 48px)',
          overflowY: 'auto',
          position: 'relative',
          padding: '16px',
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