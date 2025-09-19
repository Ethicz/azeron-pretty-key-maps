import React from 'react';
import { lightenColor, isLight } from '../../lib/utils.js';

/**
 * Split mouse wheel widget (two stacked halves).
 * Click top -> select MW_UP. Click bottom -> select MW_DOWN.
 * Right-click opens context menu for that half.
 */
export default function SplitWheel({
  x = 0,
  y = 0,
  w = 120,
  h = 140,
  up,
  down,
  gloss = true,
  onPick,        // (id: 'MW_UP' | 'MW_DOWN', event)
  onContext      // (id, clientX, clientY)
}) {
  const upData = up   || { label: 'Mouse Up',   color: '#26c6da' };
  const downData = down || { label: 'Mouse Down', color: '#1e88e5' };

  // Background builder: FLAT when gloss is false; gradient + subtle radial highlight when true
  function surface(color) {
    if (!gloss) return { backgroundColor: color };
    const top = lightenColor(color, 30);
    const bottom = lightenColor(color, -10);
    const baseGrad = `linear-gradient(150deg, ${top}, ${bottom})`;
    const highlight = `radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 65%)`;
    return { backgroundImage: `${baseGrad}, ${highlight}` };
  }

  // Text contrast: flip to dark on light backgrounds, consistent with KeyTile
  const upLabelColor   = isLight(upData.color)   ? '#0c1225' : '#ffffff';
  const downLabelColor = isLight(downData.color) ? '#0c1225' : '#ffffff';

  const halfBase = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '50%',
    fontSize: 14,
    userSelect: 'none'
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 10px 20px rgba(0,0,0,0.4)',
        cursor: 'pointer'
      }}
    >
      <div
        style={{
          ...halfBase,
          ...surface(upData.color),
          color: upLabelColor,
          borderBottom: '1px solid rgba(0,0,0,0.12)' // subtle divider, non-glossy
        }}
        title="Mouse Up"
        onClick={(e) => { e.stopPropagation(); onPick?.('MW_UP', e); }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContext?.('MW_UP', e.clientX, e.clientY); }}
      >
        {upData.label || 'Mouse Up'}
      </div>

      <div
        style={{
          ...halfBase,
          ...surface(downData.color),
          color: downLabelColor
        }}
        title="Mouse Down"
        onClick={(e) => { e.stopPropagation(); onPick?.('MW_DOWN', e); }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContext?.('MW_DOWN', e.clientX, e.clientY); }}
      >
        {downData.label || 'Mouse Down'}
      </div>
    </div>
  );
}
