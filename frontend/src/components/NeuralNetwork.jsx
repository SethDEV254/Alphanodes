import { useEffect, useRef } from 'react';

const LAYERS = [4, 6, 6, 3];

export default function NeuralNetwork({ height = 400 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animId;
    let W = 0, H = 0;
    let nodes = [];
    let signals = [];

    const getLayer = (li) => nodes.filter(n => n.layer === li);

    const build = () => {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W;
      canvas.height = H;
      nodes = [];
      signals = [];

      const padX = Math.max(90, W * 0.1);
      const usableW = W - padX * 2;
      const padY = H * 0.13;
      const usableH = H - padY * 2;

      LAYERS.forEach((count, li) => {
        const x = padX + (usableW / (LAYERS.length - 1)) * li;
        for (let i = 0; i < count; i++) {
          const y = count === 1 ? H / 2 : padY + (usableH / (count - 1)) * i;
          nodes.push({
            x, y,
            layer: li,
            pulse: Math.random() * Math.PI * 2,
            activeFade: 0,
          });
        }
      });
    };

    const cascade = (from) => {
      const next = getLayer(from.layer + 1);
      if (!next.length) return;
      next.forEach((to, i) => {
        setTimeout(() => {
          signals.push({ from, to, progress: 0, speed: 0.0055 + Math.random() * 0.004 });
        }, i * 18);
      });
    };

    const spawnWave = () => {
      const layer = getLayer(0);
      if (!layer.length) return;
      const src = layer[Math.floor(Math.random() * layer.length)];
      src.activeFade = 1;
      cascade(src);
    };

    const spawnAll = () => {
      getLayer(0).forEach((src, i) => {
        setTimeout(() => { src.activeFade = 1; cascade(src); }, i * 90);
      });
    };

    setTimeout(spawnAll, 150);
    const interval = setInterval(spawnWave, 1400);

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // Subtle dot grid background
      ctx.save();
      const spacing = 28;
      for (let gx = spacing; gx < W; gx += spacing) {
        for (let gy = spacing; gy < H; gy += spacing) {
          ctx.beginPath();
          ctx.arc(gx, gy, 0.8, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.04)';
          ctx.fill();
        }
      }
      ctx.restore();

      // "AI" ghost text
      ctx.save();
      ctx.font = `800 ${Math.min(W * 0.35, 220)}px 'Outfit', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(252,213,53,0.04)';
      ctx.fillText('AI', W / 2, H / 2);
      ctx.restore();

      // Connections
      for (let li = 0; li < LAYERS.length - 1; li++) {
        const a = getLayer(li);
        const b = getLayer(li + 1);
        a.forEach(na => {
          b.forEach(nb => {
            ctx.beginPath();
            ctx.moveTo(na.x, na.y);
            ctx.lineTo(nb.x, nb.y);
            ctx.strokeStyle = 'rgba(252,213,53,0.14)';
            ctx.lineWidth = 1;
            ctx.stroke();
          });
        });
      }

      // Signals
      signals = signals.filter(s => {
        s.progress += s.speed;
        if (s.progress >= 1) {
          s.to.activeFade = 1;
          if (s.to.layer < LAYERS.length - 1) cascade(s.to);
          return false;
        }

        const x = s.from.x + (s.to.x - s.from.x) * s.progress;
        const y = s.from.y + (s.to.y - s.from.y) * s.progress;

        // Bright lit trail
        const trailGrad = ctx.createLinearGradient(s.from.x, s.from.y, x, y);
        trailGrad.addColorStop(0, 'rgba(252,213,53,0)');
        trailGrad.addColorStop(1, `rgba(252,213,53,${0.5 * s.progress})`);
        ctx.beginPath();
        ctx.moveTo(s.from.x, s.from.y);
        ctx.lineTo(x, y);
        ctx.strokeStyle = trailGrad;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Large glow
        const g = ctx.createRadialGradient(x, y, 0, x, y, 22);
        g.addColorStop(0, 'rgba(252,213,53,1)');
        g.addColorStop(0.2, 'rgba(252,213,53,0.6)');
        g.addColorStop(0.6, 'rgba(252,213,53,0.15)');
        g.addColorStop(1, 'rgba(252,213,53,0)');
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();

        // Bright core
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fcd535';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        return true;
      });

      // Nodes
      nodes.forEach(node => {
        node.pulse += 0.028;
        if (node.activeFade > 0) node.activeFade -= 0.008;
        const fade = Math.max(0, node.activeFade);
        const pulse = Math.sin(node.pulse) * 0.5 + 0.5;
        const isActive = fade > 0.04;

        const color = isActive ? '#00c076' : '#fcd535';
        const r = isActive ? 9 + fade * 6 : 7 + pulse * 3;
        const glowR = r * 5.5;

        // Glow
        const gc = isActive ? `rgba(0,192,118,` : `rgba(252,213,53,`;
        const glowA = isActive ? fade * 0.8 : 0.22 + pulse * 0.2;
        const glow = ctx.createRadialGradient(node.x, node.y, r * 0.2, node.x, node.y, glowR);
        glow.addColorStop(0, `${gc}${glowA})`);
        glow.addColorStop(0.45, `${gc}${glowA * 0.35})`);
        glow.addColorStop(1, `${gc}0)`);
        ctx.beginPath();
        ctx.arc(node.x, node.y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Outer ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 3.5, 0, Math.PI * 2);
        ctx.strokeStyle = isActive
          ? `rgba(0,192,118,${fade * 0.55})`
          : `rgba(252,213,53,${0.25 + pulse * 0.25})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Inner ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 1, 0, Math.PI * 2);
        ctx.strokeStyle = isActive
          ? `rgba(0,192,118,${fade * 0.3})`
          : `rgba(252,213,53,${0.1 + pulse * 0.1})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();

        // Body
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = isActive ? 20 : 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Specular
        ctx.beginPath();
        ctx.arc(node.x - r * 0.27, node.y - r * 0.3, r * 0.38, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };

    build();
    draw();

    const ro = new ResizeObserver(() => build());
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(interval);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height, display: 'block' }}
    />
  );
}
