
import React, { useEffect, useRef } from 'react';

const InteractiveBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let mouse = { x: -1000, y: -1000 };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouseMove);
    resize();

    // grid settings
    const gridSize = 60;
    const boxes: { x: number; y: number; w: number; h: number; opacity: number }[] = [];

    // randomly place some boxes
    for (let i = 0; i < 15; i++) {
      boxes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        w: 50 + Math.random() * 150,
        h: 50 + Math.random() * 150,
        opacity: 0.05 + Math.random() * 0.1
      });
    }

    // boxes for the top left area 
    for (let i = 0; i < 2; i++) {
      boxes.push({
        x: Math.random() * (width * 0.3),
        y: Math.random() * (height * 0.3),
        w: 40 + Math.random() * 80,
        h: 40 + Math.random() * 80,
        opacity: 0.03 + Math.random() * 0.06
      });
    }

    // extra boxes for the top right
    for (let i = 0; i < 4; i++) {
      boxes.push({
        x: width * 0.65 + Math.random() * (width * 0.3),
        y: Math.random() * (height * 0.3),
        w: 40 + Math.random() * 80,
        h: 40 + Math.random() * 80,
        opacity: 0.03 + Math.random() * 0.06
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // draw the grid lines
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
      ctx.lineWidth = 1;

      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // the floating boxes that react to mouse
      boxes.forEach((box) => {
        const dx = mouse.x - (box.x + box.w / 2);
        const dy = mouse.y - (box.y + box.h / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        const factor = Math.max(0, 1 - dist / 500);

        ctx.strokeStyle = `rgba(0, 0, 0, ${box.opacity + factor * 0.1})`;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(box.x - factor * 10, box.y - factor * 10, box.w + factor * 20, box.h + factor * 20);
        ctx.setLineDash([]);

        // corner dots
        ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + factor * 0.2})`;
        ctx.fillRect(box.x - 2, box.y - 2, 4, 4);
        ctx.fillRect(box.x + box.w - 2, box.y - 2, 4, 4);
        ctx.fillRect(box.x - 2, box.y + box.h - 2, 4, 4);
        ctx.fillRect(box.x + box.w - 2, box.y + box.h - 2, 4, 4);
      });

      // crosshair that follows mouse
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.beginPath();
      ctx.moveTo(mouse.x, 0);
      ctx.lineTo(mouse.x, height);
      ctx.moveTo(0, mouse.y);
      ctx.lineTo(width, mouse.y);
      ctx.stroke();

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

export default InteractiveBackground;
