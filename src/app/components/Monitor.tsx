import { useState, useRef, useEffect, useCallback } from "react";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { useApp, Location } from "../contexts/AppContext";
import {
  Activity,
  MapPin,
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Layers,
  Radio,
  ZoomIn,
  ZoomOut,
  Locate,
} from "lucide-react";

export interface Location {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  status: "active" | "inactive" | "warning";
  isCustom?: boolean;
}

interface MonitorProps {
  locations: Location[];
}

/* ─── Tile math (Web Mercator / EPSG:3857) ─── */
const TILE_SIZE = 256;

function lngToTileXFloat(lng: number, zoom: number) {
  return ((lng + 180) / 360) * Math.pow(2, zoom);
}
function latToTileYFloat(lat: number, zoom: number) {
  const r = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) *
    Math.pow(2, zoom)
  );
}
function locToPixel(
  lat: number,
  lng: number,
  zoom: number,
  offsetX: number,
  offsetY: number
) {
  const tx = lngToTileXFloat(lng, zoom) * TILE_SIZE + offsetX;
  const ty = latToTileYFloat(lat, zoom) * TILE_SIZE + offsetY;
  return { x: tx, y: ty };
}

/* ─── Status helpers ─── */
const STATUS_META = {
  active: {
    label: "Active",
    color: "text-green-600",
    bg: "bg-green-50 border-green-200",
    dot: "bg-green-500",
    markerFill: "#22c55e",
    icon: Wifi,
  },
  warning: {
    label: "Warning",
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    dot: "bg-amber-500",
    markerFill: "#f59e0b",
    icon: AlertTriangle,
  },
  inactive: {
    label: "Offline",
    color: "text-gray-500",
    bg: "bg-gray-50 border-gray-200",
    dot: "bg-gray-400",
    markerFill: "#9ca3af",
    icon: WifiOff,
  },
};

/* ─── OSM tile servers (round-robin) ─── */
const SERVERS = ["a", "b", "c"];
function tileUrl(x: number, y: number, z: number) {
  const s = SERVERS[Math.abs(x + y) % 3];
  return `https://${s}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

/* ─── Map canvas component ─── */
function MapCanvas({
  locations,
  selectedId,
  onSelectId,
}: {
  locations: Location[];
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(14);
  const [mapType, setMapType] = useState<"street" | "satellite">("street");

  // Calculate center from locations
  const avgLat =
    locations.length > 0
      ? locations.reduce((s, l) => s + l.lat, 0) / locations.length
      : 51.506;
  const avgLng =
    locations.length > 0
      ? locations.reduce((s, l) => s + l.lng, 0) / locations.length
      : -0.09;

  // Pan state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  // Container size
  const [size, setSize] = useState({ w: 800, h: 440 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setSize({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Base offset = position map so avgLat/avgLng is at centre of container
  const baseOffsetX = size.w / 2 - lngToTileXFloat(avgLng, zoom) * TILE_SIZE;
  const baseOffsetY = size.h / 2 - latToTileYFloat(avgLat, zoom) * TILE_SIZE;
  const offsetX = baseOffsetX + pan.x;
  const offsetY = baseOffsetY + pan.y;

  // Compute tile range
  const startTX = Math.floor(-offsetX / TILE_SIZE) - 1;
  const endTX = Math.ceil((size.w - offsetX) / TILE_SIZE) + 1;
  const startTY = Math.floor(-offsetY / TILE_SIZE) - 1;
  const endTY = Math.ceil((size.h - offsetY) / TILE_SIZE) + 1;

  const tiles: { x: number; y: number }[] = [];
  const maxTile = Math.pow(2, zoom);
  for (let tx = startTX; tx <= endTX; tx++) {
    for (let ty = startTY; ty <= endTY; ty++) {
      const nx = ((tx % maxTile) + maxTile) % maxTile;
      const ny = ty;
      if (ny >= 0 && ny < maxTile) tiles.push({ x: tx, y: ny, nx, ny } as any);
    }
  }

  // Drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    setPan({
      x: dragRef.current.panX + e.clientX - dragRef.current.startX,
      y: dragRef.current.panY + e.clientY - dragRef.current.startY,
    });
  }, []);
  const onMouseUp = useCallback(() => { dragRef.current = null; }, []);

  const handleZoom = (delta: number) => {
    setZoom((z) => Math.max(10, Math.min(18, z + delta)));
    setPan({ x: 0, y: 0 });
  };
  const handleReset = () => { setPan({ x: 0, y: 0 }); setZoom(14); };

  const satUrl = (tx: number, ty: number, tz: number) =>
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${tz}/${ty}/${tx}`;

  return (
    <div className="relative w-full h-full" style={{ height: 440 }}>
      {/* Map type toggle */}
      <div className="absolute top-3 right-3 z-20 flex gap-1 bg-white/90 backdrop-blur-sm rounded-xl p-1 shadow-md border border-border/30">
        {(["street", "satellite"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setMapType(t)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all capitalize ${
              mapType === t ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Zoom controls */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-1">
        <button
          onClick={() => handleZoom(1)}
          className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-border/30 flex items-center justify-center hover:bg-white transition-colors"
        >
          <ZoomIn className="w-4 h-4 text-foreground" />
        </button>
        <button
          onClick={() => handleZoom(-1)}
          className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-border/30 flex items-center justify-center hover:bg-white transition-colors"
        >
          <ZoomOut className="w-4 h-4 text-foreground" />
        </button>
        <button
          onClick={handleReset}
          className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-border/30 flex items-center justify-center hover:bg-white transition-colors"
        >
          <Locate className="w-4 h-4 text-foreground" />
        </button>
      </div>

      {/* Tile + marker canvas */}
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-2xl cursor-grab active:cursor-grabbing select-none"
        style={{ height: 440, position: "relative", background: "#e8e0d8" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* Tiles */}
        {tiles.map(({ x, y, nx, ny }: any) => (
          <img
            key={`${x}-${y}`}
            src={mapType === "satellite" ? satUrl(nx, ny, zoom) : tileUrl(nx, ny, zoom)}
            draggable={false}
            style={{
              position: "absolute",
              left: x * TILE_SIZE + offsetX,
              top: y * TILE_SIZE + offsetY,
              width: TILE_SIZE,
              height: TILE_SIZE,
              imageRendering: "auto",
              userSelect: "none",
              pointerEvents: "none",
            }}
            alt=""
          />
        ))}

        {/* Attribution */}
        <div className="absolute bottom-2 right-2 z-10 text-[10px] text-gray-600 bg-white/80 px-1.5 py-0.5 rounded">
          © <a href="https://openstreetmap.org/copyright" className="underline" target="_blank" rel="noreferrer">OpenStreetMap</a>
        </div>

        {/* Markers */}
        {locations.map((loc) => {
          const meta = STATUS_META[loc.status];
          const { x, y } = locToPixel(loc.lat, loc.lng, zoom, offsetX, offsetY);
          const isSelected = selectedId === loc.id;

          return (
            <div
              key={loc.id}
              style={{ position: "absolute", left: x, top: y, zIndex: isSelected ? 15 : 10 }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectId(isSelected ? null : loc.id);
              }}
              className="cursor-pointer"
            >
              {/* Pulse ring for active */}
              {loc.status === "active" && (
                <div
                  style={{
                    position: "absolute",
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: meta.markerFill,
                    opacity: 0.25,
                    top: -5,
                    left: -5,
                    animation: "mon-ping 2s ease-in-out infinite",
                    pointerEvents: "none",
                  }}
                />
              )}
              {/* Dot */}
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: meta.markerFill,
                  border: isSelected ? "3px solid white" : "2.5px solid white",
                  boxShadow: `0 2px 8px ${meta.markerFill}88`,
                  transform: isSelected ? "scale(1.4)" : "scale(1)",
                  transition: "transform 0.15s",
                  position: "relative",
                }}
              />

              {/* Tooltip */}
              {isSelected && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 20,
                    left: "50%",
                    transform: "translateX(-50%)",
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                    zIndex: 20,
                  }}
                  className="bg-white rounded-xl shadow-xl px-3 py-2 border border-border/30 text-left"
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0`}
                      style={{ background: meta.markerFill }}
                    />
                    <span className="text-xs font-semibold text-foreground">{loc.name}</span>
                    {loc.isCustom && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded-full">Custom</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground ml-3.5">{loc.address}</p>
                  <div className={`text-[11px] font-medium ml-3.5 mt-0.5 ${meta.color}`}>
                    {meta.label}
                  </div>
                  {/* Arrow */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: -5,
                      left: "50%",
                      transform: "translateX(-50%) rotate(45deg)",
                      width: 10,
                      height: 10,
                      background: "white",
                      borderRight: "1px solid #e5e7eb",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pulse animation style */}
      <style>{`
        @keyframes mon-ping {
          0%, 100% { transform: scale(1); opacity: 0.25; }
          50% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ─── Main Monitor page ─── */
export function Monitor() {
  const { locations } = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setLastUpdate(new Date()), 15000);
    return () => clearInterval(t);
  }, []);

  const activeCount = locations.filter((l) => l.status === "active").length;
  const warningCount = locations.filter((l) => l.status === "warning").length;
  const offlineCount = locations.filter((l) => l.status === "inactive").length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8faf9" }}>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Radio className="w-6 h-6 text-primary animate-pulse" />
              Live Monitor
            </h1>
            <p className="text-muted-foreground mt-0.5">
              Real-time device location tracking &amp; status
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-green-50 text-green-700 border-green-200 gap-1.5 px-3 py-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block" />
              {activeCount} Active
            </Badge>
            {warningCount > 0 && (
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 gap-1.5 px-3 py-1.5">
                <span className="w-2 h-2 bg-amber-500 rounded-full inline-block" />
                {warningCount} Warning
              </Badge>
            )}
            {offlineCount > 0 && (
              <Badge className="bg-gray-100 text-gray-600 border-gray-200 gap-1.5 px-3 py-1.5">
                <span className="w-2 h-2 bg-gray-400 rounded-full inline-block" />
                {offlineCount} Offline
              </Badge>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Devices", value: locations.length, icon: MapPin, color: "text-primary", bg: "bg-primary/10" },
            {
              label: "Online Rate",
              value: `${locations.length > 0 ? Math.round((activeCount / locations.length) * 100) : 0}%`,
              icon: Activity,
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              label: "Last Sync",
              value: lastUpdate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              icon: RefreshCw,
              color: "text-purple-600",
              bg: "bg-purple-50",
            },
          ].map((stat) => (
            <Card key={stat.label} className="border-border/30 shadow-sm bg-card/80">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                  <div className="font-semibold text-foreground text-lg leading-tight">{stat.value}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Map + List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Map */}
          <div className="lg:col-span-2">
            <Card className="border-border/30 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 bg-card/60">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Map View</span>
                  <span className="text-xs text-muted-foreground">(drag to pan)</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {locations.length} tracked sites
                </span>
              </div>
              <MapCanvas
                locations={locations}
                selectedId={selectedId}
                onSelectId={setSelectedId}
              />
            </Card>
          </div>

          {/* Location list */}
          <div className="lg:col-span-1">
            <Card className="border-border/30 shadow-sm h-full">
              <div className="px-4 py-2.5 border-b border-border/30 bg-card/60 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">All Locations</span>
                <span className="text-xs text-muted-foreground">({locations.length})</span>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: 456 }}>
                {locations.length === 0 && (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    No locations added yet.
                  </div>
                )}
                {locations.map((loc) => {
                  const meta = STATUS_META[loc.status];
                  const Icon = meta.icon;
                  const isSelected = selectedId === loc.id;
                  return (
                    <button
                      key={loc.id}
                      onClick={() => setSelectedId(isSelected ? null : loc.id)}
                      className={`w-full text-left px-4 py-3 border-b border-border/20 transition-all duration-150 hover:bg-muted/40 ${
                        isSelected ? "bg-primary/5 border-l-2 border-l-primary" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`mt-0.5 w-6 h-6 rounded-full ${meta.bg} flex items-center justify-center flex-shrink-0 border`}>
                          <Icon className={`w-3 h-3 ${meta.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-foreground truncate">{loc.name}</span>
                            {loc.isCustom && (
                              <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full flex-shrink-0">
                                Custom
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{loc.address}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} ${loc.status === "active" ? "animate-pulse" : ""}`} />
                            <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {loc.lat.toFixed(3)}, {loc.lng.toFixed(3)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}