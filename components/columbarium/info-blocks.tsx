// Static info cards shown above the grid: How to Use, Legend, Pricing.

import { ROW_LABELS, ROW_PRICES } from './slot-grid'

interface InfoBlocksProps {
  available: number
  reserved: number
  occupied: number
  loading: boolean
}

export function InfoBlocks({ available, reserved, occupied, loading }: InfoBlocksProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* How to Use */}
      <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Guide</p>
        <h3 className="font-serif font-bold text-foreground mb-3">How to Use</h3>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li className="flex items-start gap-2"><span className="font-bold mt-0.5">·</span> Browse the available slots below</li>
          <li className="flex items-start gap-2"><span className="font-bold mt-0.5">·</span> Click a slot to view details</li>
          <li className="flex items-start gap-2"><span className="font-bold mt-0.5">·</span> Available slots can be reserved</li>
          <li className="flex items-start gap-2"><span className="font-bold mt-0.5">·</span> Occupied slots are already assigned</li>
        </ul>
      </div>

      {/* Legend + live counts */}
      <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Legend</p>
        <h3 className="font-serif font-bold text-foreground mb-3">Slot Status</h3>
        <ul className="text-sm text-muted-foreground space-y-3">
          <li className="flex items-center gap-3"><span className="w-4 h-4 rounded bg-[#4CAF50] shrink-0" /><span><span className="font-semibold text-foreground">Available</span> — open for reservation</span></li>
          <li className="flex items-center gap-3"><span className="w-4 h-4 rounded bg-[#F44336] shrink-0" /><span><span className="font-semibold text-foreground">Occupied</span> — already assigned</span></li>
          <li className="flex items-center gap-3"><span className="w-4 h-4 rounded bg-[#FFC107] shrink-0" /><span><span className="font-semibold text-foreground">Reserved</span> — pending confirmation</span></li>
        </ul>
        {!loading && (
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-2 text-center text-xs">
            <div><p className="font-bold text-primary text-base">{available}</p><p className="text-muted-foreground">Available</p></div>
            <div><p className="font-bold text-amber-500 text-base">{reserved}</p><p className="text-muted-foreground">Reserved</p></div>
            <div><p className="font-bold text-red-500 text-base">{occupied}</p><p className="text-muted-foreground">Occupied</p></div>
          </div>
        )}
      </div>

      {/* Pricing */}
      <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Pricing</p>
        <h3 className="font-serif font-bold text-foreground mb-3">Slot Rates</h3>
        <ul className="text-sm space-y-2">
          {Object.entries(ROW_LABELS).map(([row, label]) => (
            <li key={row} className="flex justify-between items-center">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-semibold text-foreground font-mono">₱{ROW_PRICES[Number(row)].toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
