const LAT = 13.961961329079667
const LNG = 121.51970450499091
const MAPS_EMBED = `https://maps.google.com/maps?q=${LAT},${LNG}&z=17&output=embed`

export function MapBlock() {
  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-sm w-full h-full min-h-[400px]">
      <iframe
        src={MAPS_EMBED}
        width="100%" height="100%"
        style={{ border: 0, display: 'block' }}
        allowFullScreen loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="eMemoria Funeral Services location"
      />
    </div>
  )
}
