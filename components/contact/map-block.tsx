import { MapPin } from 'lucide-react'

const LAT = 13.961961329079667
const LNG = 121.51970450499091
const MAPS_EMBED = `https://maps.google.com/maps?q=${LAT},${LNG}&z=17&output=embed`
const MAPS_LINK  = `https://www.google.com/maps?q=${LAT},${LNG}`

export function MapBlock() {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl overflow-hidden border border-border shadow-sm aspect-[4/3] w-full">
        <iframe
          src={MAPS_EMBED}
          width="100%" height="100%"
          style={{ border: 0 }}
          allowFullScreen loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="M. P. Gayeta Funeral Services location"
        />
      </div>
      <a
        href={MAPS_LINK} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:text-muted-foreground transition-colors"
      >
        <MapPin className="h-4 w-4" /> Open in Google Maps →
      </a>
    </div>
  )
}
