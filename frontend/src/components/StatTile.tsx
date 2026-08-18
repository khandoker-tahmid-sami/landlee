import type { CSSProperties, ReactNode } from "react";

interface StatTileProps {
  label: string;
  value: number;
  color: string;
  icon: ReactNode;
}

export function StatTile({ label, value, color, icon }: StatTileProps) {
  return (
    <div className="stat-tile" style={{ "--tile-color": color } as CSSProperties}>
      <div className="stat-tile-icon">{icon}</div>
      <span className="stat-tile-value">{value}</span>
      <span className="stat-tile-label">{label}</span>
    </div>
  );
}
