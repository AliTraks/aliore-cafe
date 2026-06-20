"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Users, X } from "lucide-react";

export interface TableData {
  id: string;
  number: number;
  zone: string;
  capacity: number;
  status: "available" | "reserved" | "occupied" | "maintenance";
  posX: number;
  posY: number;
  shape: "round" | "rect";
  pricePerSeat: number;
}

interface RestaurantMapProps {
  guestCount: number;
  selectedTable: TableData | null;
  onSelect: (table: TableData) => void;
}

// Seeded restaurant layout — admin can modify via DB in production
const TABLES: TableData[] = [
  // Indoor Zone
  { id:"t1",  number:1,  zone:"Indoor",    capacity:2, status:"available",   posX:120, posY:120, shape:"round", pricePerSeat:0 },
  { id:"t2",  number:2,  zone:"Indoor",    capacity:2, status:"available",   posX:200, posY:120, shape:"round", pricePerSeat:0 },
  { id:"t3",  number:3,  zone:"Indoor",    capacity:4, status:"reserved",    posX:310, posY:120, shape:"rect",  pricePerSeat:0 },
  { id:"t4",  number:4,  zone:"Indoor",    capacity:4, status:"available",   posX:420, posY:120, shape:"rect",  pricePerSeat:0 },
  { id:"t5",  number:5,  zone:"Indoor",    capacity:2, status:"occupied",    posX:120, posY:220, shape:"round", pricePerSeat:0 },
  { id:"t6",  number:6,  zone:"Indoor",    capacity:6, status:"available",   posX:250, posY:220, shape:"rect",  pricePerSeat:0 },
  { id:"t7",  number:7,  zone:"Indoor",    capacity:4, status:"available",   posX:420, posY:220, shape:"rect",  pricePerSeat:0 },
  // Terrace Zone
  { id:"t8",  number:8,  zone:"Terrace",   capacity:2, status:"available",   posX:120, posY:380, shape:"round", pricePerSeat:5 },
  { id:"t9",  number:9,  zone:"Terrace",   capacity:2, status:"available",   posX:220, posY:380, shape:"round", pricePerSeat:5 },
  { id:"t10", number:10, zone:"Terrace",   capacity:4, status:"reserved",    posX:340, posY:380, shape:"round", pricePerSeat:5 },
  { id:"t11", number:11, zone:"Terrace",   capacity:4, status:"available",   posX:460, posY:380, shape:"round", pricePerSeat:5 },
  // Bar Lounge
  { id:"t12", number:12, zone:"Bar",       capacity:2, status:"available",   posX:120, posY:520, shape:"round", pricePerSeat:0 },
  { id:"t13", number:13, zone:"Bar",       capacity:2, status:"occupied",    posX:200, posY:520, shape:"round", pricePerSeat:0 },
  { id:"t14", number:14, zone:"Bar",       capacity:2, status:"available",   posX:280, posY:520, shape:"round", pricePerSeat:0 },
  // Private Room
  { id:"t15", number:15, zone:"Private",   capacity:10, status:"available",  posX:380, posY:500, shape:"rect",  pricePerSeat:15 },
];

const STATUS_COLORS = {
  available:   { fill: "rgba(16,185,129,0.15)", stroke: "#10b981" },
  reserved:    { fill: "rgba(245,158,11,0.15)", stroke: "#f59e0b" },
  occupied:    { fill: "rgba(239,68,68,0.12)",  stroke: "#ef4444" },
  selected:    { fill: "rgba(201,168,76,0.35)", stroke: "#C9A84C" },
  maintenance: { fill: "rgba(107,114,128,0.1)", stroke: "#6b7280" },
};

const ZONE_AREAS = [
  { id:"indoor",  label:"Indoor Dining",    x:60,  y:70,  w:420, h:220, color:"rgba(255,255,255,0.02)" },
  { id:"terrace", label:"Garden Terrace",   x:60,  y:340, w:460, h:100, color:"rgba(201,168,76,0.03)" },
  { id:"bar",     label:"Bar Lounge",       x:60,  y:480, w:280, h:80,  color:"rgba(100,100,255,0.03)" },
  { id:"private", label:"Private Dining",   x:345, y:465, w:175, h:100, color:"rgba(201,168,76,0.05)" },
];

function TableShape({ table, isSelected, onClick }: {
  table: TableData;
  isSelected: boolean;
  onClick: () => void;
}) {
  const status = isSelected ? "selected" : table.status;
  const colors = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.available;
  const isClickable = table.status === "available";

  const RenderShape = () => {
    if (table.shape === "round") {
      const r = table.capacity <= 2 ? 20 : 28;
      return (
        <g>
          <circle cx={table.posX} cy={table.posY} r={r} fill={colors.fill} stroke={colors.stroke} strokeWidth={isSelected ? 2 : 1.5} />
          {/* Chairs around round table */}
          {[...Array(table.capacity)].map((_, i) => {
            const angle = (i / table.capacity) * Math.PI * 2 - Math.PI / 2;
            const cr = r + 10;
            return (
              <circle key={i}
                cx={table.posX + Math.cos(angle) * cr}
                cy={table.posY + Math.sin(angle) * cr}
                r={5}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth={1}
              />
            );
          })}
          <text x={table.posX} y={table.posY + 4} textAnchor="middle" fontSize={10} fill={isSelected ? "#C9A84C" : "#9ca3af"} fontFamily="sans-serif" fontWeight="600">
            {table.number}
          </text>
        </g>
      );
    } else {
      const w = table.capacity <= 4 ? 60 : 90;
      const h = table.capacity <= 4 ? 36 : 44;
      const x = table.posX - w / 2;
      const y = table.posY - h / 2;
      const seats = Math.ceil(table.capacity / 2);
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} rx={4} fill={colors.fill} stroke={colors.stroke} strokeWidth={isSelected ? 2 : 1.5} />
          {/* Chairs on long sides */}
          {[...Array(seats)].map((_, i) => {
            const cx = x + (i + 0.5) * (w / seats);
            return (
              <g key={`top-${i}`}>
                <rect x={cx-5} y={y-10} width={10} height={8} rx={2} fill={colors.fill} stroke={colors.stroke} strokeWidth={1} />
                <rect x={cx-5} y={y+h+2} width={10} height={8} rx={2} fill={colors.fill} stroke={colors.stroke} strokeWidth={1} />
              </g>
            );
          })}
          <text x={table.posX} y={table.posY + 4} textAnchor="middle" fontSize={10} fill={isSelected ? "#C9A84C" : "#9ca3af"} fontFamily="sans-serif" fontWeight="600">
            {table.number}
          </text>
        </g>
      );
    }
  };

  return (
    <g
      onClick={isClickable ? onClick : undefined}
      style={{ cursor: isClickable ? "pointer" : "default" }}
      className="transition-opacity duration-200"
      opacity={table.status === "maintenance" ? 0.4 : 1}
    >
      <RenderShape />
      {isSelected && (
        <circle
          cx={table.posX}
          cy={table.posY}
          r={table.shape === "round" ? (table.capacity <= 2 ? 34 : 44) : 50}
          fill="none"
          stroke="#C9A84C"
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.5}
        />
      )}
    </g>
  );
}

export default function RestaurantMap({ guestCount, selectedTable, onSelect }: RestaurantMapProps) {
  const t = useTranslations("reservation.map");
  const [hoveredTable, setHoveredTable] = useState<TableData | null>(null);
  const [activeZone, setActiveZone] = useState<string>("all");

  const zones = ["all", "Indoor", "Terrace", "Bar", "Private"];

  const visibleTables = activeZone === "all"
    ? TABLES
    : TABLES.filter(tbl => tbl.zone === activeZone);

  const handleTableClick = useCallback((table: TableData) => {
    if (table.status !== "available") return;
    if (table.capacity < guestCount) return;
    onSelect(table);
  }, [guestCount, onSelect]);

  return (
    <div className="space-y-4">
      {/* Zone filter tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {zones.map(z => (
          <button
            key={z}
            onClick={() => setActiveZone(z)}
            className={`px-4 py-2 rounded-full text-xs font-sans font-medium tracking-wider uppercase whitespace-nowrap transition-all ${
              activeZone === z
                ? "bg-gold-500 text-white"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-gold-500/10"
            }`}
          >
            {z === "all" ? t("zones.INDOOR").replace("Indoor", "All") : z === "Indoor" ? t("zones.INDOOR") : z === "Terrace" ? t("zones.TERRACE") : z === "Bar" ? t("zones.BAR") : t("zones.PRIVATE")}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs font-sans">
        {[
          { status: "available",   label: t("available"),  color: "#10b981" },
          { status: "reserved",    label: t("reserved"),   color: "#f59e0b" },
          { status: "occupied",    label: t("occupied"),   color: "#ef4444" },
          { status: "selected",    label: t("selected"),   color: "#C9A84C" },
        ].map(l => (
          <div key={l.status} className="flex items-center gap-1.5 text-neutral-500">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color, opacity: 0.7 }} />
            {l.label}
          </div>
        ))}
      </div>

      {/* SVG Map */}
      <div className="relative bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-800 shadow-[0_25px_50px_rgba(0,0,0,0.8)]">
        <svg
          viewBox="0 0 580 640"
          className="w-full"
          style={{ maxHeight: 560 }}
        >
          {/* Background grid */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="580" height="640" fill="url(#grid)" />

          {/* Zone areas */}
          {ZONE_AREAS.filter(z => activeZone === "all" || z.label.includes(activeZone)).map(zone => (
            <g key={zone.id}>
              <rect
                x={zone.x} y={zone.y} width={zone.w} height={zone.h}
                rx={8}
                fill={zone.color}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={1}
              />
              <text
                x={zone.x + 10} y={zone.y + 18}
                fontSize={9}
                fill="rgba(201,168,76,0.5)"
                fontFamily="sans-serif"
                fontWeight="600"
                letterSpacing="2"
              >
                {zone.label.toUpperCase()}
              </text>
            </g>
          ))}

          {/* Entrance indicator */}
          {activeZone === "all" && (
            <g>
              <rect x={240} y={600} width={100} height={30} rx={4} fill="rgba(201,168,76,0.08)" stroke="rgba(201,168,76,0.3)" strokeWidth={1} />
              <text x={290} y={620} textAnchor="middle" fontSize={9} fill="rgba(201,168,76,0.7)" fontFamily="sans-serif" fontWeight="600" letterSpacing="2">ENTRANCE</text>
            </g>
          )}

          {/* Bar counter */}
          {(activeZone === "all" || activeZone === "Bar") && (
            <rect x={60} y={460} width={280} height={14} rx={3} fill="rgba(100,100,255,0.08)" stroke="rgba(100,100,255,0.2)" strokeWidth={1} />
          )}

          {/* Tables */}
          {visibleTables.map(table => (
            <g
              key={table.id}
              onMouseEnter={() => setHoveredTable(table)}
              onMouseLeave={() => setHoveredTable(null)}
            >
              <TableShape
                table={table}
                isSelected={selectedTable?.id === table.id}
                onClick={() => handleTableClick(table)}
              />
              {/* Capacity warning tooltip */}
              {table.capacity < guestCount && table.status === "available" && (
                <text
                  x={table.posX}
                  y={table.posY + (table.shape === "round" ? 48 : 36)}
                  textAnchor="middle"
                  fontSize={7}
                  fill="#ef4444"
                  fontFamily="sans-serif"
                >
                  Too small
                </text>
              )}
            </g>
          ))}
        </svg>

        {/* Hover tooltip */}
        <AnimatePresence>
          {hoveredTable && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-4 left-4 glass-dark rounded-xl p-3 text-xs font-sans pointer-events-none"
            >
              <div className="text-white font-semibold mb-1">Table {hoveredTable.number} — {hoveredTable.zone}</div>
              <div className="flex items-center gap-3 text-neutral-400">
                <span className="flex items-center gap-1"><Users size={10}/> {hoveredTable.capacity} seats</span>
                {hoveredTable.pricePerSeat > 0 && (
                  <span className="text-gold-400">${hoveredTable.pricePerSeat}/seat deposit</span>
                )}
              </div>
              <div className={`mt-1 text-[10px] font-semibold tracking-widest uppercase ${
                hoveredTable.status === "available" ? "text-emerald-400" :
                hoveredTable.status === "reserved" ? "text-amber-400" : "text-red-400"
              }`}>
                {hoveredTable.status}
                {hoveredTable.capacity < guestCount && hoveredTable.status === "available" && " · Too small for your party"}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
