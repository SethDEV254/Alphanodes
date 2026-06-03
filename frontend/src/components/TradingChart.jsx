import { useEffect, useRef } from 'react';

export default function TradingChart({ symbol = 'BINANCE:BNBUSDT', interval = '15', height = 420 }) {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';
    widgetRef.current = null;

    const containerId = `tv_${Math.random().toString(36).slice(2)}`;
    const inner = document.createElement('div');
    inner.id = containerId;
    inner.style.width = '100%';
    inner.style.height = `${height}px`;
    containerRef.current.appendChild(inner);

    const initWidget = () => {
      if (!window.TradingView || widgetRef.current) return;
      widgetRef.current = new window.TradingView.widget({
        autosize: true,
        symbol,
        interval,
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        toolbar_bg: '#0d0d0d',
        enable_publishing: false,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        container_id: containerId,
        backgroundColor: '#0d0d0d',
        gridColor: 'rgba(255,255,255,0.03)',
        withdateranges: true,
        studies: [],
        overrides: {
          'paneProperties.background': '#0d0d0d',
          'paneProperties.backgroundType': 'solid',
          'scalesProperties.textColor': '#555',
        },
      });
    };

    if (window.TradingView) {
      initWidget();
    } else {
      const existing = document.getElementById('tradingview-script');
      if (!existing) {
        const script = document.createElement('script');
        script.id = 'tradingview-script';
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = initWidget;
        document.head.appendChild(script);
      } else {
        existing.addEventListener('load', initWidget);
        setTimeout(initWidget, 1000);
      }
    }

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = '';
      widgetRef.current = null;
    };
  }, [symbol, interval]);

  return (
    <div ref={containerRef} style={{ width: '100%', height, background: '#0d0d0d', borderRadius: 12, overflow: 'hidden' }} />
  );
}
