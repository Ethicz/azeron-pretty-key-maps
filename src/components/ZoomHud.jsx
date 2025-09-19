// src/components/ZoomHud.jsx
import React from 'react';
import { useStore } from '../lib/store.jsx';

export default function ZoomHud() {
  const { zoom, pan } = useStore();

  const setZoom = (z) => {
    const nz = Math.max(0.3, Math.min(2.0, z));
    useStore.setState({ zoom: nz });
  };
  const zoomIn = () => setZoom(useStore.getState().zoom + 0.1);
  const zoomOut = () => setZoom(useStore.getState().zoom - 0.1);
  const reset = () => useStore.setState({ zoom: 0.9, pan: { x: 40, y: 40 } });

  return (
    <div className="zoomHud" style={{ position: 'absolute', right: 16, bottom: 16, display: 'flex', gap: 8 }}>
      <button className="btn" onClick={zoomOut}>−</button>
      <div className="btn" aria-label="zoom readout" style={{ pointerEvents: 'none' }}>
        {(zoom * 100).toFixed(0)}%
      </div>
      <button className="btn" onClick={zoomIn}>+</button>
      <button className="btn" onClick={reset} title="Reset view">⟲</button>
    </div>
  );
}
