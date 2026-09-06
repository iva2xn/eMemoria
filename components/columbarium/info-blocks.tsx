// Info cards shown above the grid: Pricing, live counts, and legend.

import { ROW_LABELS, ROW_PRICES } from './slot-grid'

interface InfoBlocksProps {
  available: number
  reserved: number
  occupied: number
  loading: boolean
}

function fmtAmt(n: number) {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2 })
}

const DOT_STYLE: React.CSSProperties = {
  position: 'absolute',
  width: 3,
  height: 3,
  borderRadius: '50%',
  background: '#a98844',
  boxShadow: '14px 0 0 #a98844',
}

export function InfoBlocks({ available, reserved, occupied, loading }: InfoBlocksProps) {
  return (
    <div className="space-y-5">

      {/* ── Pricing + Counts ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Pricing */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border/60">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Level Pricing</p>
          </div>
          <div className="divide-y divide-border/40">
            {Object.entries(ROW_LABELS).map(([row, label]) => (
              <div key={row} className="flex items-center justify-between px-5 py-2.5">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-xs font-bold text-foreground font-mono">
                  {fmtAmt(ROW_PRICES[Number(row)])}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Live counts */}
        {!loading && (
          <div className="grid grid-cols-3 gap-3 content-start">
            {[
              { label: 'Available', count: available, color: 'text-primary',          bg: 'bg-primary/10' },
              { label: 'Reserved',  count: reserved,  color: 'text-muted-foreground', bg: 'bg-muted/20' },
              { label: 'Occupied',  count: occupied,  color: 'text-destructive',      bg: 'bg-destructive/10' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} border border-border rounded-2xl p-4 text-center`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div className="bg-card border border-border rounded-2xl px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-4">Slot Legend</p>
        <div className="flex flex-wrap justify-center items-start gap-6 text-[11px] font-semibold text-muted-foreground">

          {/* Available */}
          <span className="flex items-center gap-2.5">
            <span style={{
              display: 'inline-block',
              width: 22, height: 22, borderRadius: 2, flexShrink: 0,
              backgroundColor: '#2a2a2a',
              border: '2px solid #8e9091',
              boxShadow: 'inset 0 5px 10px rgba(0,0,0,0.8), inset 0 1px 3px rgba(0,0,0,0.5)',
            }} />
            <span>
              <span className="block text-foreground">Available</span>
              <span className="block font-normal text-[10px]">Click to view and reserve</span>
            </span>
          </span>

          {/* Reserved */}
          <span className="flex items-center gap-2.5">
            <span style={{
              display: 'inline-flex',
              width: 22, height: 22, borderRadius: 2, flexShrink: 0,
              background: 'linear-gradient(145deg, #7a7c7e, #5a5c5d)',
              border: '1px solid #4a4a4a',
              boxShadow: '2px 2px 5px rgba(0,0,0,0.3)',
              alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              <span style={{ ...DOT_STYLE, top: 3, left: 3 }} />
              <span style={{ ...DOT_STYLE, bottom: 3, left: 3 }} />
              <span style={{
                background: 'linear-gradient(145deg, #d4af37, #aa8222)',
                color: '#333',
                fontSize: 6, fontWeight: 800,
                padding: '1px 3px', borderRadius: 1,
                border: '1px solid #7a6015',
                textTransform: 'uppercase',
                lineHeight: 1.2, letterSpacing: 0.3,
                position: 'relative', zIndex: 2,
              }}>RSV</span>
            </span>
            <span>
              <span className="block text-foreground">Reserved</span>
              <span className="block font-normal text-[10px]">Awaiting full payment</span>
            </span>
          </span>

          {/* Occupied */}
          <span className="flex items-center gap-2.5">
            <span style={{
              display: 'inline-block',
              width: 22, height: 22, borderRadius: 2, flexShrink: 0,
              position: 'relative',
              backgroundColor: '#5a5c5d',
              backgroundImage: [
                'linear-gradient(#d4af37, #d4af37)',
                'linear-gradient(#d4af37, #d4af37)',
                'linear-gradient(145deg, #7a7c7e, #5a5c5d)',
              ].join(', '),
              backgroundSize: '3px 14px, 11px 3px, 100% 100%',
              backgroundPosition: 'center 4px, center 9px, center center',
              backgroundRepeat: 'no-repeat',
              border: '1px solid #4a4a4a',
              boxShadow: '2px 2px 5px rgba(0,0,0,0.3)',
            }}>
              <span style={{ ...DOT_STYLE, top: 3, left: 3 }} />
              <span style={{ ...DOT_STYLE, bottom: 3, left: 3 }} />
            </span>
            <span>
              <span className="block text-foreground">Occupied</span>
              <span className="block font-normal text-[10px]">Niche is in use</span>
            </span>
          </span>

        </div>
      </div>

    </div>
  )
}
