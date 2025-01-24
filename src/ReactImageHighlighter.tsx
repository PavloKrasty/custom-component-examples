import React, { useRef, useEffect, useState } from "react";
import Konva from "konva";
import { Retool } from "@tryretool/custom-component-support";

export const ImageHighlighter: React.FC = () => {
  type Word = {
    bbox: [number, number, number, number]; // Координаты [x1, y1, x2, y2]
    color: [number, number, number]; // Цвет [r, g, b]
    page?: number; // Номер страницы (опционально)
  };

  const stageRef = useRef<Konva.Stage | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);

  const [base64] = Retool.useStateString({ name: "base64" });
  const [rawWords] = Retool.useStateArray({ name: "words" });
  const words: Word[] = Array.isArray(rawWords) ? (rawWords as Word[]) : [];

  const [zoomPercent, setZoomPercent] = useState(100); // Для отображения процента масштаба

  useEffect(() => {
    if (!base64 || !stageRef.current || !layerRef.current) return;

    const stage = stageRef.current;
    const layer = layerRef.current;

    layer.destroyChildren();

    const imageObj = new window.Image();
    imageObj.src = `data:image/jpeg;base64,${base64}`;
    imageObj.onload = () => {
      const container = document.getElementById("konva-container");
      const containerWidth = container ? container.offsetWidth : 500;
      const containerHeight = container ? container.offsetHeight : 500;

      const aspectRatio = imageObj.width / imageObj.height;
      let canvasWidth = containerWidth;
      let canvasHeight = containerHeight;

      if (aspectRatio > containerWidth / containerHeight) {
        canvasWidth = containerWidth;
        canvasHeight = canvasWidth / aspectRatio;
      } else {
        canvasHeight = containerHeight;
        canvasWidth = canvasHeight * aspectRatio;
      }

      const offsetX = (containerWidth - canvasWidth) / 2;
      const offsetY = (containerHeight - canvasHeight) / 2;

      stage.width(containerWidth);
      stage.height(containerHeight);

      const group = new Konva.Group({
        x: offsetX,
        y: offsetY,
        draggable: true,
      });

      const konvaImage = new Konva.Image({
        image: imageObj,
        width: canvasWidth,
        height: canvasHeight,
      });
      group.add(konvaImage);

      if (words && words.length > 0) {
        words.forEach(({ bbox, color }) => {
          const [x1, y1, x2, y2] = bbox;
          const [r, g, b] = color;

          const rect = new Konva.Rect({
            x: x1 * (canvasWidth / 100),
            y: y1 * (canvasHeight / 100),
            width: (x2 - x1) * (canvasWidth / 100),
            height: (y2 - y1) * (canvasHeight / 100),
            stroke: `rgb(${r}, ${g}, ${b})`,
            strokeWidth: 2,
          });
          group.add(rect);
        });
      }

      layer.add(group);
      layer.draw();
    };
  }, [base64, words]);

  const handleZoom = (zoomIn: boolean) => {
    if (!stageRef.current) return;

    const stage = stageRef.current;

    const oldScale = stage.scaleX();
    const newScale = zoomIn ? oldScale * 1.2 : oldScale / 1.2;

    const stageCenter = {
      x: stage.width() / 2,
      y: stage.height() / 2,
    };

    const imagePoint = {
      x: (stageCenter.x - stage.x()) / oldScale,
      y: (stageCenter.y - stage.y()) / oldScale,
    };

    stage.scale({ x: newScale, y: newScale });

    const newPosition = {
      x: stageCenter.x - imagePoint.x * newScale,
      y: stageCenter.y - imagePoint.y * newScale,
    };

    stage.position(newPosition);
    stage.batchDraw();

    setZoomPercent(Math.round(newScale * 100)); // Обновляем процент масштаба
  };

  return (
    <div
      id="konva-container"
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#f8f8f8",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        ref={(container) => {
          if (container && !stageRef.current) {
            const stage = new Konva.Stage({
              container,
              width: container.offsetWidth || 500,
              height: container.offsetHeight || 500,
            });
            stageRef.current = stage;

            const layer = new Konva.Layer();
            stage.add(layer);
            layerRef.current = layer;
          }
        }}
      ></div>
      <div
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          display: "flex",
          gap: "10px",
          backgroundColor: "#f2f2f2",
          padding: "8px",
          borderRadius: "8px",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
          alignItems: "center",
        }}
      >
        <img
          src="https://www.svgrepo.com/show/393135/loop-plus.svg"
          alt="Zoom In"
          onClick={() => handleZoom(true)}
          style={{
            cursor: "pointer",
            width: "30px",
            height: "30px",
          }}
        />
        <span style={{ fontSize: "16px", fontWeight: "bold", color: "#333" }}>
          {zoomPercent}%
        </span>
        <img
          src="https://www.svgrepo.com/show/393133/loop-minus.svg"
          alt="Zoom Out"
          onClick={() => handleZoom(false)}
          style={{
            cursor: "pointer",
            width: "30px",
            height: "30px",
          }}
        />
      </div>
    </div>
  );
};
  