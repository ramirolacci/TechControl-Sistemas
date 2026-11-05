import { useState, useMemo, useEffect, useRef } from "react";
import { 
  Plus, Search, Edit, Save, Trash2, Clock, Check, 
  FileDown, Printer, Filter, Calendar, 
  FileText, CheckCircle2, AlertCircle, User as UserIcon, Award, 
  ChevronLeft, ChevronRight, Building2, Maximize2, History,
  Key
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/context/AppContext";
import { EmptyState } from "@/components/shared/EmptyState";
import { toast } from "sonner";

import { Progress } from "@/components/ui/progress";

import { GUARDIA_TYPES, getGuardiaTypeShortLabel } from "@/data/guardiaTypes";
import { formatDate, formatToday, formatBranchesForDisplay } from "@/lib/utils-app";
import type { Guardia, User as AppUser, SpecialEvent, SpecialEventTask } from "@/types";
import { getHolidayInfo } from "@/data/holidays";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function formatCollaboratorRole(user: AppUser) {
  if (user.role?.trim()) return user.role.trim();
  if (user.location.toLowerCase().includes("sistemas")) return "Equipo de Sistemas IT";
  return user.location;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDateLong(dateStr: string) {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const formatted = date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch (e) {
    return dateStr;
  }
}

function formatTurnLabel(turnKey?: string, short = false): string {
  if (!turnKey) return "";
  if (turnKey === "both" || turnKey === "facundo,ramiro" || turnKey === "ramiro,facundo") {
    return short ? "Facu + Rami" : "Facundo y Ramiro";
  }
  if (turnKey === "facundo") return short ? "Facu" : "Facundo";
  if (turnKey === "ramiro") return short ? "Rami" : "Ramiro";
  return turnKey;
}

function getTurnResponsibles(
  dateStr: string,
  turnOverrides: Record<string, string>,
  getWeeklyTurn: (date: string) => "facundo" | "ramiro" | null
): string[] {
  const overridden = turnOverrides[dateStr];
  if (overridden) {
    if (overridden === "both" || overridden === "facundo,ramiro" || overridden === "ramiro,facundo") {
      return ["facundo", "ramiro"];
    }
    return [overridden];
  }
  const original = getWeeklyTurn(dateStr);
  return original ? [original] : [];
}

function CollaboratorAvatar({
  userName,
  avatarUrl,
}: {
  userName: string;
  avatarUrl?: string | null;
}) {
  let pathStr = avatarUrl;
  if (!pathStr) {
    const name = (userName || "").toLowerCase();
    if (name.includes("facundo") || name.includes("facu")) pathStr = "Colaboradores/Facu.jpg";
    else if (name.includes("gustavo") || name.includes("gus")) pathStr = "Colaboradores/Gus.jpg";
    else if (name.includes("ramiro") || name.includes("rami")) pathStr = "Colaboradores/Rami.png";
  }
  const clean = pathStr ? pathStr.replace(/^\/+/, "") : "";
  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const imageUrl = clean ? `${normalizedBase}${clean}` : null;

  return (
    <Avatar size="sm" className="size-7 shrink-0 border border-border/50">
      {imageUrl ? (
        <AvatarImage src={imageUrl} alt={userName} className="object-cover" />
      ) : null}
      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-[10px] font-semibold text-white">
        {getInitials(userName)}
      </AvatarFallback>
    </Avatar>
  );
}


function isLastThursdayOfMonth(dateStr: string): boolean {
  const date = new Date(dateStr + "T12:00:00");
  if (isNaN(date.getTime())) return false;
  if (date.getDay() !== 4) return false;
  const nextWeek = new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
  return nextWeek.getMonth() !== date.getMonth();
}

function isFirstWednesdayOfMonth(dateStr: string): boolean {
  const date = new Date(dateStr + "T12:00:00");
  if (isNaN(date.getTime())) return false;
  if (date.getDay() !== 3) return false; // 3 is Wednesday
  const prevWeek = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000);
  return prevWeek.getMonth() !== date.getMonth();
}

function toDisplayDate(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}

function toIsoDate(displayDate: string): string {
  if (!displayDate) return "";
  const parts = displayDate.split("/");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return displayDate;
}

function getWeeklyTurn(dateStr: string): "facundo" | "ramiro" {
  const date = new Date(dateStr + "T12:00:00");
  if (isNaN(date.getTime())) return "facundo";
  const refMonday = new Date("2026-01-05T12:00:00");
  const diffTime = date.getTime() - refMonday.getTime();
  const diffDays = Math.floor(diffTime / (24 * 60 * 60 * 1000));
  const weekIndex = Math.floor(diffDays / 7);
  const normalizedWeek = ((weekIndex % 2) + 2) % 2;
  return normalizedWeek === 1 ? "facundo" : "ramiro";
}

// ── Período de cierre mensual ─────────────────────────────────────────────────
// El período activo va del 25 del mes X al 24 del mes X+1.
// Si hoy >= 25: período activo comienza el 25 de este mes.
// Si hoy <= 24: período activo comienza el 25 del mes anterior.
const PERIOD_MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function getActivePeriod(today: Date): { start: string; end: string; label: string } {
  const day = today.getDate();
  let startYear: number, startMonth: number; // 0-indexed
  if (day >= 25) {
    startYear = today.getFullYear();
    startMonth = today.getMonth();
  } else {
    if (today.getMonth() === 0) {
      startYear = today.getFullYear() - 1;
      startMonth = 11;
    } else {
      startYear = today.getFullYear();
      startMonth = today.getMonth() - 1;
    }
  }
  const pad2 = (n: number) => n.toString().padStart(2, "0");
  const start = `${startYear}-${pad2(startMonth + 1)}-25`;
  const endMonth = (startMonth + 1) % 12;
  const endYear = startMonth === 11 ? startYear + 1 : startYear;
  const end = `${endYear}-${pad2(endMonth + 1)}-24`;
  const label = `${PERIOD_MONTH_NAMES[endMonth]} ${endYear}`;
  return { start, end, label };
}

/** Devuelve la etiqueta del período de cierre al que pertenece una guardia */
function getGuardiaPeriodLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  // Si el día es >= 25, el período comienza el 25 a las 00:01hs y cierra el 24 del mes siguiente
  let endMonth: number, endYear: number;
  if (d >= 25) {
    endMonth = m % 12; // siguiente mes 0-indexed
    endYear = m === 12 ? y + 1 : y;
  } else {
    endMonth = m - 1; // mismo mes 0-indexed
    endYear = y;
  }
  return `${PERIOD_MONTH_NAMES[endMonth]} ${endYear}`;
}

/** Devuelve la clave de ordenamiento del período (YYYY-MM) */
function getGuardiaPeriodSortKey(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  let endMonth: number, endYear: number;
  if (d >= 25) {
    endMonth = (m % 12) + 1;
    endYear = m === 12 ? y + 1 : y;
  } else {
    endMonth = m;
    endYear = y;
  }
  return `${endYear}-${endMonth.toString().padStart(2, "0")}`;
}

/** Devuelve el rango exacto de fechas del período (25/MM/YYYY a 24/MM/YYYY) */
function getGuardiaPeriodRange(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  let endMonth: number, endYear: number;
  if (d >= 25) {
    endMonth = (m % 12) + 1;
    endYear = m === 12 ? y + 1 : y;
  } else {
    endMonth = m;
    endYear = y;
  }
  const startMonth = endMonth === 1 ? 12 : endMonth - 1;
  const startYear = endMonth === 1 ? endYear - 1 : endYear;
  const pad2 = (n: number) => n.toString().padStart(2, "0");
  return `25/${pad2(startMonth)}/${startYear} a 24/${pad2(endMonth)}/${endYear}`;
}
// ─────────────────────────────────────────────────────────────────────────────



const EVENT_COLOR_MAP: Record<string, string> = {
  sky: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  indigo: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  violet: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  purple: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  fuchsia: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800",
  pink: "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300 border-pink-200 dark:border-pink-800",
  rose: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  red: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800",
  orange: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
  lime: "bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-300 border-lime-200 dark:border-lime-800",
  emerald: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  teal: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  cyan: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
  gray: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700"
};

function getDynamicEventStyle(tasks?: SpecialEventTask[]) {
  if (!tasks || tasks.length === 0) {
    return {
      style: {
        backgroundColor: "rgba(239, 68, 68, 0.12)",
        color: "rgb(220, 38, 38)",
        borderColor: "rgba(239, 68, 68, 0.3)"
      },
      percent: 0
    };
  }

  const completed = tasks.filter(t => t.completed).length;
  const pct = completed / tasks.length;
  const isComplete = completed === tasks.length;

  let style = {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    color: "rgb(220, 38, 38)",
    borderColor: "rgba(239, 68, 68, 0.3)"
  };

  if (isComplete) {
    style = {
      backgroundColor: "rgba(16, 185, 129, 0.12)",
      color: "rgb(5, 150, 105)",
      borderColor: "rgba(16, 185, 129, 0.3)"
    };
  } else if (completed > 1) {
    style = {
      backgroundColor: "rgba(249, 115, 22, 0.12)",
      color: "rgb(217, 119, 6)",
      borderColor: "rgba(249, 115, 22, 0.3)"
    };
  }

  return {
    style,
    percent: Math.round(pct * 100)
  };
}

export function GuardiasPage() {
  const { 
    guardias, 
    users, 
    addGuardia, 
    updateGuardia, 
    deleteGuardia,
    holidayAssignments,
    turnOverrides,
    setHolidayAssignment,
    setTurnOverride,
    clearTurnOverride,
    guardiasViewMode,
    setGuardiasViewMode,
    specialEvents,
    specialTasks,
    saveSpecialEvent,
    deleteSpecialEvent
  } = useApp();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuardia, setEditingGuardia] = useState<Guardia | null>(null);
  const [showAllBranches, setShowAllBranches] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Calendar states
  const viewMode = guardiasViewMode;
  const setViewMode = setGuardiasViewMode;
  const [currentCalMonth, setCurrentCalMonth] = useState(new Date().getMonth());
  const [currentCalYear, setCurrentCalYear] = useState(new Date().getFullYear());
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);
  const [showGuardias, setShowGuardias] = useState(true);
  const [showEventos, setShowEventos] = useState(true);
  const [showTurnos, setShowTurnos] = useState(true);
  const [showFeriados, setShowFeriados] = useState(true);

  // Historial modal
  const [historialOpen, setHistorialOpen] = useState(false);
  const [historialSearch, setHistorialSearch] = useState("");
  const [historialUserFilter, setHistorialUserFilter] = useState("all");

  // Modal exportar PDF por rango de fechas
  const [pdfExportOpen, setPdfExportOpen] = useState(false);
  const [pdfExportFrom, setPdfExportFrom] = useState("");
  const [pdfExportTo, setPdfExportTo] = useState("");
  const [pdfExportFiltered, setPdfExportFiltered] = useState(false);

  // Período activo de cierre
  const activePeriod = useMemo(() => getActivePeriod(new Date()), []);

  // Guardias del período activo
  const activeGuardias = useMemo(() =>
    guardias.filter(g => g.date >= activePeriod.start && g.date <= activePeriod.end),
    [guardias, activePeriod]
  );

  // Guardias históricas (fuera del período activo)
  const historicalGuardias = useMemo(() =>
    guardias.filter(g => g.date < activePeriod.start),
    [guardias, activePeriod]
  );

  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [selectedHolidayDate, setSelectedHolidayDate] = useState<string | null>(null);
  const [tempAssignedId, setTempAssignedId] = useState<string>("none");

  useEffect(() => {
    if (holidayDialogOpen && selectedHolidayDate) {
      setTempAssignedId(holidayAssignments[selectedHolidayDate] || "none");
    }
  }, [holidayDialogOpen, selectedHolidayDate, holidayAssignments]);

  // Special events states (pulled from global context)
  const manualEvents = specialEvents;

  const [eventTypes, setEventTypes] = useState<{ id: string; name: string; color: string }[]>(() => {
    const saved = localStorage.getItem("techcontrol_calendar_event_types");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [
      { id: "break", name: "☕ MG Break", color: "amber" },
      { id: "onfire", name: "🔥 Jueves OnFire", color: "rose" },
      { id: "promo", name: "🎯 Promo Importante", color: "purple" },
      { id: "custom", name: "⚙️ Personalizado", color: "sky" }
    ];
  });

  const [showManageTypes, setShowManageTypes] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeColor, setNewTypeColor] = useState<string>("sky");
  const [editingTypeColorId, setEditingTypeColorId] = useState<string | null>(null);

  const [renamingTaskId, setRenamingTaskId] = useState<string | null>(null);
  const [renamingTaskName, setRenamingTaskName] = useState("");

  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [eventForm, setEventForm] = useState<{
    id?: string;
    date: string;
    name: string;
    type: string;
    tasks: SpecialEventTask[];
  }>({
    date: "",
    name: "",
    type: "break",
    tasks: []
  });

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<SpecialEvent | null>(null);



  const openDetailEvent = (evt: SpecialEvent) => {
    setDetailEvent(evt);
    setDetailDialogOpen(true);
  };

  const toggleTaskInDetail = (taskId: string, completed: boolean) => {
    if (!detailEvent) return;
    const updatedTasks = (detailEvent.tasks || []).map(t => 
      t.id === taskId ? { ...t, completed } : t
    );
    const updatedEvent = { ...detailEvent, tasks: updatedTasks, updatedAt: new Date().toISOString() };
    setDetailEvent(updatedEvent);
    void saveSpecialEvent(updatedEvent);
  };

  const handleEditFromDetail = () => {
    if (!detailEvent) return;
    setDetailDialogOpen(false);
    openEditEvent(detailEvent);
  };

  const handleDeleteFromDetail = () => {
    if (!detailEvent) return;
    void deleteSpecialEvent(detailEvent.id);
    setDetailDialogOpen(false);
    toast.success("Evento eliminado");
  };

  const openCreateEvent = (prefilledDate?: string) => {
    setEventForm({
      date: toDisplayDate(prefilledDate || new Date().toISOString().split("T")[0]),
      name: "",
      type: "custom",
      tasks: []
    });
    setEventDialogOpen(true);
  };

  const openEditEvent = (evt: SpecialEvent) => {
    setEventForm({
      id: evt.id,
      date: toDisplayDate(evt.date),
      name: evt.name,
      type: evt.type,
      tasks: evt.tasks || []
    });
    setEventDialogOpen(true);
  };


  const getSpecialEvents = (dateStr: string): SpecialEvent[] => {
    const list: SpecialEvent[] = [];

    if (isLastThursdayOfMonth(dateStr)) {
      list.push({
        id: "last-thursday-onfire",
        date: dateStr,
        name: "🔥 Jueves OnFire",
        type: "onfire",
        tasks: []
      });
    }

    if (isFirstWednesdayOfMonth(dateStr)) {
      list.push({
        id: "first-wednesday-break",
        date: dateStr,
        name: "☕ MG Break",
        type: "break",
        tasks: []
      });
    }

    const seenIds = new Set<string>();
    const matches = manualEvents.filter(e => e.date === dateStr);
    for (const m of matches) {
      seenIds.add(m.id);
      list.push(m);
    }

    for (const st of (specialTasks || [])) {
      if (st.startDate === dateStr && !seenIds.has(st.id)) {
        seenIds.add(st.id);
        list.push({
          id: st.id,
          name: st.title,
          date: st.startDate,
          type: st.category === "special-day" ? "break" : st.category === "campaign" ? "onfire" : st.category === "promotion" ? "promotion" : "event",
          tasks: (st.tasks || []).map(t => ({
            id: t.id,
            name: t.title,
            title: t.title,
            completed: t.completed,
            imageUrl: t.imageUrl,
            completedAt: t.completedAt
          })),
          bannerUrl: st.bannerUrl,
          createdAt: st.createdAt,
          updatedAt: st.updatedAt
        });
      }
    }

    return list;
  };

  // Default form state
  const defaultForm = {
    date: toDisplayDate(new Date().toISOString().split("T")[0]),
    startTime: "18:00",
    endTime: "22:00",
    userId: "",
    userName: "",
    type: "soporte" as any,
    description: "",
    otherReason: "",
    branchesAffected: "",
    status: "pending_approval" as "pending_approval" | "approved",
    notes: ""
  };

  const [form, setForm] = useState(defaultForm);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const notesRef = useRef<HTMLTextAreaElement | null>(null);
  const otherReasonRef = useRef<HTMLTextAreaElement | null>(null);


  // ... (other code remains unchanged)




  // Handle autocomplete branch selection
  // Colaboradores elegibles para guardias: equipo IT + quienes ya tienen registros
  const usersById = useMemo(() => {
    return new Map(users.map((u) => [u.id, u]));
  }, [users]);

  const guardiaCollaborators = useMemo(() => {
    const guardiaUserIds = new Set(guardias.map((g) => g.userId));
    const eligible = users.filter(
      (u) =>
        u.active &&
        u.fullName !== "Mariano Garcia" &&
        u.id !== "usr-056" &&
        u.username !== "mariano.garcia" &&
        (u.location.toLowerCase().includes("sistemas") || guardiaUserIds.has(u.id))
    );
    return [...eligible].sort((a, b) =>
      a.fullName.localeCompare(b.fullName, "es", { sensitivity: "base" })
    );
  }, [users, guardias]);

  // Handle autocomplete branch selection
  const suggestedBranches = [
    "TODAS",
    "Balvanera",
    "Barrancas de Belgrano",
    "Bella Vista",
    "Ballester",
    "Belgrano",
    "Caballito",
    "Campana",
    "Cañitas",
    "Del Viso",
    "Devoto",
    "Don Torcuato",
    "Escobar",
    "Floresta",
    "Florida",
    "Gral Pacheco",
    "Hurlingham",
    "Ituzaingo",
    "Jose C. Paz",
    "Los Polvorines",
    "Martinez",
    "Maschwitz",
    "Mataderos",
    "Merlo",
    "Moreno",
    "Muñiz",
    "Munro",
    "Paternal",
    "Palermo",
    "Pilar Centro",
    "Pilar Derqui",
    "Puerto Madero",
    "San Fernando",
    "San Martin",
    "San Miguel",
    "Tigre",
    "Vicente Lopez",
    "Villa Adelina",
    "Villa Crespo",
    "Villa Urquiza",
  ];

  const handleToggleBranch = (branch: string) => {
    setForm((prev) => {
      const allBranches = suggestedBranches.filter((item) => item !== "TODAS");
      const currentRaw = prev.branchesAffected.trim();
      const currentUpper = currentRaw.toUpperCase();

      const isAllCurrentlySelected =
        currentUpper === "TODAS" ||
        currentUpper === "TODAS LAS SUCURSALES" ||
        currentUpper === "TODAS SUCURSALES" ||
        allBranches.every((item) =>
          currentRaw.split(",").map((entry) => entry.trim()).includes(item)
        );

      if (branch === "TODAS") {
        return {
          ...prev,
          branchesAffected: isAllCurrentlySelected ? "" : "Todas las sucursales",
        };
      }

      if (isAllCurrentlySelected) {
        return {
          ...prev,
          branchesAffected: branch,
        };
      }

      const current = currentRaw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const next = current.includes(branch)
        ? current.filter((item) => item !== branch)
        : [...current, branch];

      if (allBranches.every((item) => next.includes(item))) {
        return {
          ...prev,
          branchesAffected: "Todas las sucursales",
        };
      }

      return {
        ...prev,
        branchesAffected: next.join(", "),
      };
    });
  };

  // Filtered Guardias — opera solo sobre el período activo
  const filteredGuardias = useMemo(() => {
    return activeGuardias.filter((g) => {
      const matchSearch = 
        g.userName.toLowerCase().includes(search.toLowerCase()) ||
        g.description.toLowerCase().includes(search.toLowerCase()) ||
        (g.branchesAffected ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (g.notes ?? "").toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === "all" ? true : g.status === statusFilter;
      const matchType = typeFilter === "all" ? true : g.type === typeFilter;
      const matchUser = userFilter === "all" ? true : g.userId === userFilter;

      return matchSearch && matchStatus && matchType && matchUser;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activeGuardias, search, statusFilter, typeFilter, userFilter]);

  // Guardias del historial filtradas por búsqueda y colaborador
  const filteredHistorial = useMemo(() => {
    return historicalGuardias.filter(g => {
      const matchSearch = historialSearch === "" ||
        g.userName.toLowerCase().includes(historialSearch.toLowerCase()) ||
        g.description.toLowerCase().includes(historialSearch.toLowerCase()) ||
        (g.branchesAffected ?? "").toLowerCase().includes(historialSearch.toLowerCase());
      const matchUser = historialUserFilter === "all" || g.userId === historialUserFilter;
      return matchSearch && matchUser;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [historicalGuardias, historialSearch, historialUserFilter]);

  // Historial agrupado por período de cierre
  const historialByPeriod = useMemo(() => {
    const groups: Record<string, { label: string; dateRange: string; sortKey: string; guardias: typeof filteredHistorial }> = {};
    for (const g of filteredHistorial) {
      const sortKey = getGuardiaPeriodSortKey(g.date);
      const label = getGuardiaPeriodLabel(g.date);
      const dateRange = getGuardiaPeriodRange(g.date);
      if (!groups[sortKey]) groups[sortKey] = { label, dateRange, sortKey, guardias: [] };
      groups[sortKey].guardias.push(g);
    }
    return Object.values(groups).sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }, [filteredHistorial]);

  // Statistics / KPIs — basadas en el período activo
  const stats = useMemo(() => {
    const total = filteredGuardias.length;
    const totalHours = filteredGuardias.reduce((acc, curr) => acc + curr.hours, 0);
    
    const pendingGuardiasList = activeGuardias.filter(g => g.status === "pending_approval");
    const pending = pendingGuardiasList.length;
    const pendingHours = pendingGuardiasList.reduce((acc, curr) => acc + curr.hours, 0);
    
    // Hours this period
    const hoursThisMonth = activeGuardias.reduce((acc, curr) => acc + curr.hours, 0);
    const approvedHoursThisMonth = activeGuardias
      .filter(g => g.status === "approved")
      .reduce((acc, curr) => acc + curr.hours, 0);

    // Last registered guardia (within active period)
    const sortedByDate = [...activeGuardias].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastGuardia = sortedByDate.length > 0 ? sortedByDate[0] : null;

    // 1. Hora Más Concurrente (período activo)
    const hourCounts: Record<number, number> = {};
    activeGuardias.forEach(g => {
      try {
        const start = parseInt(g.startTime.split(":")[0], 10);
        let end = parseInt(g.endTime.split(":")[0], 10);
        if (end < start) {
          end += 24;
        }
        for (let h = start; h <= end; h++) {
          const hr = h % 24;
          hourCounts[hr] = (hourCounts[hr] || 0) + 1;
        }
      } catch (e) {}
    });
    let busiestHour = -1;
    let maxHourCount = 0;
    Object.entries(hourCounts).forEach(([hStr, count]) => {
      const h = parseInt(hStr, 10);
      if (count > maxHourCount) {
        maxHourCount = count;
        busiestHour = h;
      }
    });

    // 2. Día Más Ajetreado (período activo)
    const dateMap: Record<string, { hours: number; count: number }> = {};
    activeGuardias.forEach(g => {
      if (!dateMap[g.date]) {
        dateMap[g.date] = { hours: 0, count: 0 };
      }
      dateMap[g.date].hours += g.hours;
      dateMap[g.date].count += 1;
    });
    let busiestDate = "Sin registros";
    let busiestDateStats = { hours: 0, count: 0 };
    Object.entries(dateMap).forEach(([date, statsObj]) => {
      if (statsObj.hours > busiestDateStats.hours) {
        busiestDate = date;
        busiestDateStats = statsObj;
      }
    });

    // Developer hourly breakdown (período activo)
    const devMap: Record<string, { hours: number; count: number; name: string }> = {};
    activeGuardias.forEach(g => {
      if (!devMap[g.userId]) {
        devMap[g.userId] = { hours: 0, count: 0, name: g.userName };
      }
      devMap[g.userId].hours += g.hours;
      devMap[g.userId].count += 1;
    });

    const devBreakdown = Object.values(devMap).sort((a, b) => b.hours - a.hours);
    const mostActive = devBreakdown.length > 0 ? devBreakdown[0].name : "Ninguno";

    const monthPending = activeGuardias.filter((g) => g.status === "pending_approval");
    const monthPendingHours = monthPending.reduce((acc, g) => acc + g.hours, 0);

    const pendingByUserMap: Record<string, { name: string; count: number; hours: number }> = {};
    pendingGuardiasList.forEach((g) => {
      if (!pendingByUserMap[g.userId]) {
        pendingByUserMap[g.userId] = { name: g.userName, count: 0, hours: 0 };
      }
      pendingByUserMap[g.userId].count += 1;
      pendingByUserMap[g.userId].hours += g.hours;
    });
    const pendingByUser = Object.values(pendingByUserMap).sort((a, b) =>
      a.name.localeCompare(b.name, "es", { sensitivity: "base" })
    );

    const approvedHoursAll = activeGuardias
      .filter((g) => g.status === "approved")
      .reduce((acc, g) => acc + g.hours, 0);
    const totalHoursAll = activeGuardias.reduce((acc, g) => acc + g.hours, 0);

    return {
      total,
      totalHours,
      pending,
      pendingHours,
      hoursThisMonth,
      approvedHoursThisMonth,
      monthPendingCount: monthPending.length,
      monthPendingHours,
      pendingByUser,
      approvedHoursAll,
      totalHoursAll,
      lastGuardia,
      busiestHour,
      maxHourCount,
      busiestDate,
      busiestDateStats,
      mostActive,
      devBreakdown,
    };
  }, [filteredGuardias, activeGuardias]);

  const nextEvent = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const upcoming = manualEvents
      .filter(e => e.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));
    
    if (upcoming.length === 0) return null;
    
    const evt = upcoming[0];
    const eventDate = new Date(evt.date + "T12:00:00");
    const todayDate = new Date();
    todayDate.setHours(12,0,0,0);
    const diffTime = eventDate.getTime() - todayDate.getTime();
    const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    let daysLabel = "";
    if (daysRemaining === 0) {
      daysLabel = "Hoy";
    } else if (daysRemaining === 1) {
      daysLabel = "Mañana";
    } else {
      daysLabel = `En ${daysRemaining} días`;
    }
    
    return {
      ...evt,
      daysRemaining,
      daysLabel
    };
  }, [manualEvents]);

  const openCreate = (prefilledDate?: string) => {
    setEditingGuardia(null);
    setForm({
      ...defaultForm,
      userId: "",
      userName: "",
      type: "" as any,
      date: toDisplayDate(prefilledDate || new Date().toISOString().split("T")[0])
    });
    setShowAllBranches(false);
    setDialogOpen(true);
  };

  const openEdit = (g: Guardia) => {
    setEditingGuardia(g);
    setForm({
      date: toDisplayDate(g.date),
      startTime: g.startTime,
      endTime: g.endTime,
      userId: g.userId,
      userName: g.userName,
      type: g.type,
      description: g.description,
      otherReason: g.otherReason || "",
      branchesAffected: g.branchesAffected || "",
      status: g.status,
      notes: g.notes || ""
    });
    setShowAllBranches(false);
    setHistorialOpen(false);
    setDialogOpen(true);
  };

  const handleUserSelect = (userId: string) => {
    const selectedUser = users.find(u => u.id === userId);
    if (selectedUser) {
      setForm(prev => ({
        ...prev,
        userId: selectedUser.id,
        userName: selectedUser.fullName
      }));
    }
  };

  const handleSave = () => {
    if (!form.userId || !form.date || !form.startTime || !form.endTime || !form.type || !form.description) {
      toast.error("Completá los campos obligatorios (*)");
      return;
    }

    const isoDate = toIsoDate(form.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate) || isNaN(new Date(isoDate + "T12:00:00").getTime())) {
      toast.error("La fecha debe estar en formato DD/MM/AAAA (ej: 08/06/2026)");
      return;
    }

    if (!/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(form.startTime) || !/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(form.endTime)) {
      toast.error("El horario debe estar en formato de 24hs (HH:MM), ej: 18:00");
      return;
    }

    if (form.type === "otro" && !form.otherReason?.trim()) {
      toast.error("Especificá el motivo cuando el tipo es Otro motivo");
      return;
    }

    const parsedForm = {
      ...form,
      date: isoDate
    };

    if (editingGuardia) {
      updateGuardia(editingGuardia.id, parsedForm);
    } else {
      addGuardia(parsedForm);
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteGuardia(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleToggleStatus = (id: string) => {
    const guardiaObj = guardias.find(g => g.id === id);
    if (guardiaObj) {
      const nextStatus = guardiaObj.status === "approved" ? "pending_approval" : "approved";
      updateGuardia(id, { status: nextStatus });
      toast.success(nextStatus === "approved" ? "Guardia aprobada correctamente" : "Guardia marcada como pendiente");
    }
  };

  const autoResizeTextarea = (element: HTMLTextAreaElement | null) => {
    if (!element) return;
    const minHeight = Number(element.dataset.minHeight) || 72;
    element.style.height = "auto";
    element.style.height = `${Math.max(element.scrollHeight, minHeight)}px`;
  };

  useEffect(() => {
    autoResizeTextarea(descriptionRef.current);
    autoResizeTextarea(notesRef.current);
    autoResizeTextarea(otherReasonRef.current);
  }, [form.description, form.notes, form.otherReason, dialogOpen]);

  // Browser Print — Imprime la versión del reporte PDF en la vista previa del navegador
  const handlePrint = async (customGuardias?: Guardia[] | React.SyntheticEvent) => {
    const listToPrint = Array.isArray(customGuardias) ? customGuardias : filteredGuardias;
    if (listToPrint.length === 0) {
      toast.error("No hay guardias para imprimir con los filtros actuales");
      return;
    }
    try {
      const { exportGuardiasPdf } = await import("@/lib/exportGuardiasPdf");
      const ok = exportGuardiasPdf(listToPrint, "print");
      if (ok) toast.success("Generando vista previa de impresión...");
    } catch (err) {
      console.error("Error al imprimir reporte:", err);
      toast.error("No se pudo abrir la vista previa de impresión");
    }
  };

  const handleDownloadPeriodPdf = async (periodGuardias: Guardia[]) => {
    if (periodGuardias.length === 0) {
      toast.error("No hay guardias para exportar en este período");
      return;
    }
    try {
      const { exportGuardiasPdf } = await import("@/lib/exportGuardiasPdf");
      const ok = exportGuardiasPdf(periodGuardias);
      if (ok) toast.success("PDF del período descargado correctamente");
    } catch (err) {
      console.error("Error al exportar PDF del período:", err);
      toast.error("No se pudo generar el PDF");
    }
  };

  const getGuardTypeBadgeColor = (type: string) => {
    switch (type) {
      case "soporte": return "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800";
      case "promocion": return "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "actualizacion": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
      case "incidencia": return "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      case "cambio_precios": return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
    }
  };

  // Calendar Helpers & Navigation
  const MONTH_NAMES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const WEEK_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  const handlePrevMonth = () => {
    if (currentCalMonth === 0) {
      setCurrentCalMonth(11);
      setCurrentCalYear(prev => prev - 1);
    } else {
      setCurrentCalMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentCalMonth === 11) {
      setCurrentCalMonth(0);
      setCurrentCalYear(prev => prev + 1);
    } else {
      setCurrentCalMonth(prev => prev + 1);
    }
  };

  const handleGoToday = () => {
    const today = new Date();
    setCurrentCalMonth(today.getMonth());
    setCurrentCalYear(today.getFullYear());
  };

  // Generate calendar grid
  const pad = (n: number) => n.toString().padStart(2, "0");
  const firstDayIndex = new Date(currentCalYear, currentCalMonth, 1).getDay();
  // Adjust JS day (Sunday=0, Monday=1, ..., Saturday=6) to Lunes=0, ..., Domingo=6
  const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
  const daysInMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentCalYear, currentCalMonth, 0).getDate();

  const cells = useMemo(() => {
    const gridCells: { day: number; dateStr: string; isCurrentMonth: boolean }[] = [];

    // Faded days of previous month
    for (let i = startOffset - 1; i >= 0; i--) {
      const prevDay = daysInPrevMonth - i;
      const prevMonth = currentCalMonth === 0 ? 11 : currentCalMonth - 1;
      const prevYear = currentCalMonth === 0 ? currentCalYear - 1 : currentCalYear;
      gridCells.push({
        day: prevDay,
        dateStr: `${prevYear}-${pad(prevMonth + 1)}-${pad(prevDay)}`,
        isCurrentMonth: false
      });
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      gridCells.push({
        day,
        dateStr: `${currentCalYear}-${pad(currentCalMonth + 1)}-${pad(day)}`,
        isCurrentMonth: true
      });
    }

    // Faded days of next month to fill to multiple of 7
    const total = gridCells.length;
    const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let day = 1; day <= remaining; day++) {
      const nextMonth = currentCalMonth === 11 ? 0 : currentCalMonth + 1;
      const nextYear = currentCalMonth === 11 ? currentCalYear + 1 : currentCalYear;
      gridCells.push({
        day,
        dateStr: `${nextYear}-${pad(nextMonth + 1)}-${pad(day)}`,
        isCurrentMonth: false
      });
    }

    return gridCells;
  }, [currentCalMonth, currentCalYear, startOffset, daysInMonth, daysInPrevMonth]);

  const handleSaveEvent = () => {
    if (!eventForm.date || !eventForm.name) {
      toast.error("Completá los campos obligatorios (*)");
      return;
    }

    const isoDate = toIsoDate(eventForm.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate) || isNaN(new Date(isoDate + "T12:00:00").getTime())) {
      toast.error("La fecha debe estar en formato DD/MM/AAAA (ej: 09/06/2026)");
      return;
    }

    if (eventForm.id) {
      const updatedEvent: SpecialEvent = {
        id: eventForm.id,
        date: isoDate,
        name: eventForm.name,
        type: eventForm.type,
        tasks: eventForm.tasks,
        updatedAt: new Date().toISOString(),
      };
      void saveSpecialEvent(updatedEvent);
      toast.success("Evento especial actualizado");
    } else {
      const newEvent: SpecialEvent = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        date: isoDate,
        name: eventForm.name,
        type: eventForm.type,
        tasks: eventForm.tasks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      void saveSpecialEvent(newEvent);
      toast.success("Evento especial registrado");
    }

    setEventDialogOpen(false);
    
    // Also reopen/refresh the selected date so the user immediately sees the event they added/edited
    setSelectedCalDate(isoDate);
  };

  const isUrlFullscreen = typeof window !== "undefined" && (
    window.location.search.includes("fullscreenCalendar=true") ||
    window.location.hash.includes("fullscreenCalendar=true")
  );

  // Calculating Today's Turn variables for the weekly shift card
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  const todayOriginalTurn = getWeeklyTurn(todayStr);
  const todayOverriddenTurn = turnOverrides[todayStr];
  const todayHasOverride = todayOverriddenTurn && todayOverriddenTurn !== todayOriginalTurn;
  const currentTurnOwner = todayHasOverride ? todayOverriddenTurn : todayOriginalTurn;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="guardias-page-container space-y-6 p-3 sm:p-6 print:p-0 print:space-y-4 overflow-x-hidden">
      {isUrlFullscreen && (
        <div className="fullscreen-overlay fixed inset-0 z-40 bg-background p-1 flex flex-col select-none overflow-hidden">
          <style>{`
            nav, header, aside, [class*="Sidebar"], [class*="Navbar"], [class*="Header"], [class*="layout"] {
              display: none !important;
            }
            .guardias-page-container > *:not(.fullscreen-overlay) {
              display: none !important;
            }
            html, body, #root {
              height: 100% !important;
              width: 100% !important;
              overflow: hidden !important;
              margin: 0 !important;
              padding: 0 !important;
              background-color: var(--background) !important;
            }
          `}</style>

          <Card className="flex-1 flex flex-col border-muted-foreground/10 bg-card/45 backdrop-blur-xs overflow-hidden h-full">
            <CardHeader className="py-1 px-3 flex flex-row items-center justify-between gap-2 border-b border-muted-foreground/5 mb-1 shrink-0">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-primary animate-pulse" />
                <CardTitle className="text-sm font-bold">
                  Calendario Operativo
                </CardTitle>
              </div>
              
              {/* Month Navigation */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon-xs" className="size-6" onClick={handlePrevMonth} title="Mes anterior">
                  <ChevronLeft className="size-3.5" />
                </Button>
                <span className="text-xs font-bold min-w-[95px] text-center capitalize">
                  {MONTH_NAMES[currentCalMonth]} {currentCalYear}
                </span>
                <Button variant="outline" size="icon-xs" className="size-6" onClick={handleNextMonth} title="Mes siguiente">
                  <ChevronRight className="size-3.5" />
                </Button>
                <Button variant="ghost" size="xs" onClick={handleGoToday} className="text-xs font-semibold h-6 px-1.5">
                  Hoy
                </Button>
                <Separator orientation="vertical" className="h-4 mx-0.5" />
                <Button 
                  variant="destructive" 
                  size="xs" 
                  onClick={() => window.close()} 
                  className="text-xs font-semibold h-6 px-2"
                  title="Cerrar pestaña"
                >
                  Cerrar Pestaña
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 p-1 pt-0">
              {/* Filtros de Visualización */}
              <div className="flex flex-wrap items-center gap-1.5 mb-1 text-xs font-semibold border-b border-muted-foreground/5 pb-1 shrink-0">
                <span className="text-muted-foreground text-[10px]">Mostrar:</span>
                <div className="flex flex-wrap gap-1.5">
                  <Button 
                    variant={showGuardias ? "default" : "outline"} 
                    size="xs" 
                    className="h-6 text-[10.5px] gap-1 px-2" 
                    onClick={() => setShowGuardias(!showGuardias)}
                  >
                    <Clock className="size-3" />
                    Guardias
                  </Button>
                  <Button 
                    variant={showEventos ? "default" : "outline"} 
                    size="xs" 
                    className="h-6 text-[10.5px] gap-1 px-2"
                    onClick={() => setShowEventos(!showEventos)}
                  >
                    🔥 Eventos
                  </Button>
                  <Button 
                    variant={showTurnos ? "default" : "outline"} 
                    size="xs" 
                    className="h-6 text-[10.5px] gap-1 px-2"
                    onClick={() => setShowTurnos(!showTurnos)}
                  >
                    <UserIcon className="size-3" />
                    Turnos
                  </Button>
                  <Button 
                    variant={showFeriados ? "default" : "outline"} 
                    size="xs" 
                    className="h-6 text-[10.5px] gap-1 px-2"
                    onClick={() => setShowFeriados(!showFeriados)}
                  >
                    🎉 Feriados
                  </Button>
                </div>
              </div>

              {/* Grid Container */}
              <div className="flex-1 flex flex-col min-h-0">
                {/* Calendar Grid Header */}
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-muted-foreground mb-1 border-b border-muted-foreground/5 pb-0.5 shrink-0">
                  {WEEK_DAYS.map(d => (
                    <div key={d} className="py-0.5 truncate">{d}</div>
                  ))}
                </div>
                
                {/* Calendar Grid Cells - Flex grow using style for absolute stretching */}
                <div 
                  className="flex-1 grid grid-cols-7 gap-1 min-h-0"
                  style={{ gridTemplateRows: `repeat(${Math.ceil(cells.length / 7)}, 1fr)` }}
                >
                  {cells.map((cell, idx) => {
                    const dayGuardias = guardias.filter(g => g.date === cell.dateStr);
                    const isToday = cell.dateStr === new Date().toISOString().split("T")[0];
                    const originalTurn = getWeeklyTurn(cell.dateStr);
                    const overriddenTurn = turnOverrides[cell.dateStr];
                    const hasOverride = overriddenTurn && overriddenTurn !== originalTurn;
                    const weeklyTurn = hasOverride ? overriddenTurn : originalTurn;
                    const holidayName = getHolidayInfo(cell.dateStr);
                    const assignedUserId = holidayAssignments[cell.dateStr];
                    const assignedUser = assignedUserId ? users.find(u => u.id === assignedUserId) : null;
                    const isLimitDay = cell.day === 25 && cell.isCurrentMonth;
                    
                    // Construct hover title
                    let cellTitle = "Hacé click para ver y registrar guardias de este día";
                    if (isLimitDay) {
                      cellTitle = `⚠️ CORTE DE PERÍODO: Último día para registrar guardias en el período actual (corta a las 23:59 hs).\n\n${cellTitle}`;
                    }
                    if (holidayName && showFeriados) {
                      cellTitle = `Feriado: ${holidayName}\nAsiste: ${assignedUser ? assignedUser.fullName : "Sin asignar"}\n\n${cellTitle}`;
                    }

                    // Background styles for holiday
                    const cellBgClass = isLimitDay
                      ? "limit-day-pulse border-amber-500/50 dark:border-amber-500/30"
                      : (holidayName && showFeriados)
                        ? cell.isCurrentMonth
                          ? "bg-amber-500/10 border-amber-500/30 dark:bg-amber-950/20 dark:border-amber-900/40 hover:bg-amber-500/15"
                          : "bg-amber-500/5 border-amber-500/20 dark:bg-amber-950/10 dark:border-amber-900/20 opacity-50 hover:opacity-80 hover:bg-amber-500/10"
                        : cell.isCurrentMonth
                          ? "bg-background/40 border-muted-foreground/10"
                          : "bg-background/10 border-muted-foreground/5 opacity-40 hover:opacity-80";

                    return (
                      <Tooltip key={idx}>
                        <TooltipTrigger asChild>
                          <div
                            onClick={() => {
                              setSelectedCalDate(cell.dateStr);
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                            }}
                            onDrop={async (e) => {
                              e.preventDefault();
                              const id = e.dataTransfer.getData("text/plain");
                              if (id) {
                                try {
                                  await updateGuardia(id, { date: cell.dateStr });
                                  toast.success("Guardia reasignada correctamente");
                                } catch (err) {
                                  toast.error("Error al reasignar la guardia");
                                }
                              }
                            }}
                            className={`group relative rounded-lg border p-1.5 flex flex-col justify-between gap-1 transition-all duration-200 cursor-pointer overflow-hidden hover:scale-[1.015] hover:shadow-xl hover:shadow-primary/5 hover:border-primary/50 hover:ring-1 hover:ring-primary/25 active:scale-[0.99] ${cellBgClass} ${isToday ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""} ${isLimitDay ? "pb-6" : ""}`}
                          >
                            {/* Day Number and Add Icon */}
                            <div className="flex justify-between items-center min-w-0 overflow-hidden shrink-0">
                              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                {holidayName && showFeriados ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedHolidayDate(cell.dateStr);
                                      setHolidayDialogOpen(true);
                                    }}
                                    className="text-[11px] font-extrabold px-2 py-0.5 rounded-full shrink-0 transition-transform hover:scale-110 cursor-pointer bg-amber-500 text-white dark:bg-amber-600 dark:text-amber-100"
                                    title={`Feriado: ${holidayName}. Asignar guardia.`}
                                  >
                                    {cell.day}
                                  </button>
                                ) : (
                                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                    isToday 
                                      ? "bg-primary text-primary-foreground font-black" 
                                      : isLimitDay
                                        ? "bg-amber-500 text-black font-black animate-pulse"
                                        : "text-muted-foreground"
                                  }`}>
                                    {cell.day}
                                  </span>
                                )}
                                {showEventos && getSpecialEvents(cell.dateStr).map((evt) => {
                                  let style = {};
                                  let className = "";
                                  const evType = eventTypes.find(t => t.id === evt.type);
                                  const hasTasks = evt.tasks && evt.tasks.length > 0;
                                  if (hasTasks) {
                                    const dynamic = getDynamicEventStyle(evt.tasks);
                                    style = dynamic.style;
                                    className = "border";
                                  } else if (evt.id === "last-thursday-onfire") {
                                    className = "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30";
                                  } else if (evt.id === "first-wednesday-break") {
                                    className = "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30";
                                  } else if (evType) {
                                    className = EVENT_COLOR_MAP[evType.color] || EVENT_COLOR_MAP.gray;
                                  } else {
                                    className = "border bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
                                  }
                                  
                                  const isAllCompleted = evt.tasks && evt.tasks.length > 0 && evt.tasks.every(t => t.completed);
                                  return (
                                    <span 
                                      key={evt.id}
                                      style={style}
                                      onClick={(e) => {
                                        if (evt.id !== "last-thursday-onfire" && evt.id !== "first-wednesday-break") {
                                          e.stopPropagation();
                                          openDetailEvent(evt);
                                        }
                                      }}
                                      className={`text-[9px] ${className} px-2 py-0.5 rounded font-extrabold uppercase tracking-wider shrink-0 truncate max-w-full cursor-pointer hover:scale-105 transition-transform`}
                                      title={`${evt.name} (${evt.tasks ? evt.tasks.filter(t => t.completed).length : 0}/${evt.tasks ? evt.tasks.length : 0} tareas)`}
                                    >
                                      {evt.name} {isAllCompleted && "✓"}
                                    </span>
                                  );
                                })}
                              </div>
                              <Plus className="size-3.5 opacity-0 group-hover:opacity-60 transition-opacity text-primary shrink-0" />
                            </div>
                            
                            {isLimitDay && (
                              <div className="absolute bottom-0 left-0 right-0 bg-amber-500/20 dark:bg-amber-950/60 border-t border-dashed border-amber-500/40 text-amber-600 dark:text-amber-400 text-[8.5px] font-extrabold py-0.5 text-center select-none tracking-wide uppercase animate-pulse z-10" title="Corte de período: Último día para registrar guardias">
                                ⚠️ CORTE PERÍODO
                              </div>
                            )}

                            {/* Content Area */}
                            <div className="flex-1 flex flex-col gap-1 mt-1 justify-end min-h-0">
                              {/* Holiday Badge with Helper */}
                              {holidayName && showFeriados && (
                                <div 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedHolidayDate(cell.dateStr);
                                    setHolidayDialogOpen(true);
                                  }}
                                  className="rounded border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20 p-1.5 space-y-0.5 select-none shrink-0 cursor-pointer hover:bg-amber-500/15 dark:hover:bg-amber-950/40 transition-colors" 
                                  title={`Feriado: ${holidayName}. Hacer click para asignar responsable.`}
                                >
                                  <div className="text-[9px] font-extrabold text-amber-600 dark:text-amber-400 truncate">
                                    🎉 {holidayName}
                                  </div>
                                  {assignedUser && (
                                    <div className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                      <UserIcon className="size-2 shrink-0" />
                                      <span className="truncate">Asiste: {assignedUser.fullName.split(" ")[0]}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Guardias List */}
                              {showGuardias && dayGuardias.length > 0 && (
                                <div className="flex flex-col gap-1 overflow-y-auto max-h-[120px] pr-0.5 scrollbar-thin">
                                  {dayGuardias.map((g) => {
                                    const isApproved = g.status === "approved";
                                    const isSoporte = g.type === "soporte";
                                    return (
                                      <button 
                                        key={g.id} 
                                        draggable={true}
                                        onDragStart={(e) => {
                                          e.stopPropagation();
                                          e.dataTransfer.setData("text/plain", g.id);
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openEdit(g);
                                        }}
                                        className={`w-full text-left text-[9.5px] px-1.5 py-0.5 rounded-sm font-semibold truncate border transition-colors flex items-center justify-between gap-0.5 cursor-grab active:cursor-grabbing ${
                                          isApproved 
                                            ? isSoporte
                                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-950/20 hover:bg-emerald-500/20"
                                              : "bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-400 dark:bg-indigo-950/20 hover:bg-indigo-500/20"
                                            : "bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-400 dark:bg-amber-950/20 hover:bg-amber-500/20"
                                        }`}
                                        title={`${g.userName}: ${g.startTime}-${g.endTime} (${g.hours} hs) - Click para editar`}
                                      >
                                        <span className="truncate">👤 {g.userName.split(" ")[0]}</span>
                                        <span className="shrink-0 text-[8px] opacity-75">{g.hours}h</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Weekly Turn */}
                              {showTurnos && originalTurn && (
                                <div 
                                  className={`text-[9.5px] border px-1.5 py-0.5 rounded-sm text-center select-none shrink-0 flex items-center justify-center gap-1 ${
                                    weeklyTurn === "facundo"
                                      ? "bg-sky-500/5 dark:bg-sky-500/10 text-sky-600/80 dark:text-sky-400/80 border-sky-500/15"
                                      : "bg-purple-500/5 dark:bg-purple-500/10 text-purple-600/80 dark:text-purple-400/80 border-purple-500/15"
                                  }`}
                                  title={
                                    hasOverride
                                      ? `Turno modificado. Original: ${originalTurn === "facundo" ? "Facundo" : "Ramiro"} ➡️ Nuevo: ${overriddenTurn === "facundo" ? "Facundo" : "Ramiro"}`
                                      : `Esta semana es el turno de guardia de ${originalTurn === "facundo" ? "Facundo" : "Ramiro"}`
                                  }
                                >
                                  <span>🔑 Turno:</span>
                                  {hasOverride ? (
                                    <span className="flex items-center gap-1">
                                      <span className="line-through opacity-50">{originalTurn === "facundo" ? "Facu" : "Rami"}</span>
                                      <span>➡️</span>
                                      <span className="font-bold">{overriddenTurn === "facundo" ? "Facu" : "Rami"}</span>
                                    </span>
                                  ) : (
                                    <span>{originalTurn === "facundo" ? "Facundo" : "Ramiro"}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-popover text-popover-foreground border border-muted-foreground/20 shadow-xl w-64 p-3 rounded-lg space-y-2 z-50">
                          <div className="space-y-1">
                            <div className="font-bold text-xs flex justify-between items-center text-primary border-b border-muted-foreground/10 pb-1 mb-1.5">
                              <span>{formatDateLong(cell.dateStr)}</span>
                              {isToday && <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-black">HOY</span>}
                            </div>
                            
                            {/* Límite Guardias */}
                            {isLimitDay && (
                              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded p-1.5 text-[9.5px] font-bold flex items-center gap-1">
                                <span>⚠️</span>
                                <span>CORTE: Último día del período</span>
                              </div>
                            )}

                            {/* Holiday */}
                            {holidayName && showFeriados && (
                              <div className="bg-amber-500/5 border border-amber-500/20 text-amber-500 rounded p-1.5 text-[9.5px] font-bold space-y-0.5">
                                <div>🎉 Feriado: {holidayName}</div>
                                {assignedUser && (
                                  <div className="text-[9px] text-emerald-500 flex items-center gap-0.5">
                                    <span>👤 Asiste:</span>
                                    <span className="font-extrabold">{assignedUser.fullName}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Weekly turn */}
                            {showTurnos && originalTurn && (
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <span>🔑</span>
                                <span>Turno semanal: </span>
                                {hasOverride ? (
                                  <span className="flex items-center gap-1">
                                    <span className="line-through opacity-50">{originalTurn === "facundo" ? "Facundo" : "Ramiro"}</span>
                                    <span>➡️</span>
                                    <strong className="text-foreground">{overriddenTurn === "facundo" ? "Facundo" : "Ramiro"}</strong>
                                  </span>
                                ) : (
                                  <strong className="text-foreground">{originalTurn === "facundo" ? "Facundo" : "Ramiro"}</strong>
                                )}
                              </div>
                            )}

                            {/* Events */}
                            {showEventos && getSpecialEvents(cell.dateStr).length > 0 && (
                              <div className="space-y-1">
                                <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-black">✨ Eventos</div>
                                {getSpecialEvents(cell.dateStr).map(evt => (
                                  <div key={evt.id} className="text-[10px] flex items-center gap-1 pl-1 border-l-2 border-primary/40 text-foreground">
                                    <span className="font-medium">{evt.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Guardias */}
                            {showGuardias && dayGuardias.length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-black">👥 Guardias ({dayGuardias.length})</div>
                                <div className="space-y-1 max-h-[100px] overflow-y-auto pr-0.5 scrollbar-thin">
                                  {dayGuardias.map(g => {
                                    const isApproved = g.status === "approved";
                                    return (
                                      <div key={g.id} className="text-[9.5px] flex items-center justify-between gap-1 p-1 rounded bg-muted-foreground/5 border border-muted-foreground/10">
                                        <div className="flex items-center gap-1.5 truncate">
                                          <div className="size-4 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[8px] shrink-0">
                                            {g.userName.slice(0, 2).toUpperCase()}
                                          </div>
                                          <span className="font-semibold truncate text-foreground">{g.userName.split(" ")[0]}</span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <span className="text-[9px] font-extrabold bg-primary/10 text-primary px-1 rounded">{g.hours}h</span>
                                          <span className={`size-1.5 rounded-full ${isApproved ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {showGuardias && dayGuardias.length === 0 && !holidayName && (
                              <div className="text-[10px] text-muted-foreground italic pl-1">No hay guardias registradas</div>
                            )}
                            
                            <div className="text-[8px] text-muted-foreground/60 text-center pt-1 border-t border-muted-foreground/5 select-none">
                              Click para ver y registrar (Arrastrá para reasignar)
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Guardias del Personal IT</h1>
          <p className="text-sm text-muted-foreground">
            Registro, control operativo y visualización de horas de guardia trabajadas fuera de horario.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-row sm:items-center sm:gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={() => {
            setPdfExportFrom("");
            setPdfExportTo("");
            setPdfExportFiltered(false);
            setPdfExportOpen(true);
          }} className="flex-1 sm:flex-initial text-xs sm:text-sm px-2 sm:px-3">
            <FileDown className="size-3.5 sm:size-4 mr-1 sm:mr-1.5 shrink-0" />
            <span className="hidden sm:inline">Exportar PDF</span>
            <span className="sm:hidden">Exportar</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="flex-1 sm:flex-initial text-xs sm:text-sm px-2 sm:px-3">
            <Printer className="size-3.5 sm:size-4 mr-1 sm:mr-1.5 shrink-0" />
            <span className="hidden sm:inline">Imprimir Reporte</span>
            <span className="sm:hidden">Imprimir</span>
          </Button>
          <Button onClick={() => openCreateEvent()} variant="outline" className="flex-1 sm:flex-initial text-xs sm:text-sm px-2 sm:px-3 border border-primary/20">
            <Plus className="size-3.5 sm:size-4 mr-1 sm:mr-1.5 shrink-0 text-primary" />
            <span>Crear Evento</span>
          </Button>
          <Button onClick={() => openCreate()} className="flex-1 sm:flex-initial text-xs sm:text-sm px-2 sm:px-3">
            <Plus className="size-3.5 sm:size-4 mr-1 sm:mr-1.5 shrink-0" />
            <span className="hidden sm:inline">Registrar Guardia</span>
            <span className="sm:hidden">Registrar</span>
          </Button>
        </div>
      </div>

      {/* Print Only Header */}
      <div className="hidden print:block border-b pb-4 mb-4">
        <h1 className="text-2xl font-bold text-center text-gray-800">REPORTE OFICIAL DE GUARDIAS IT</h1>
        <p className="text-sm text-center text-gray-500">Generado el: {formatToday()} - Centro de Operaciones IT</p>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Horas totales de este mes */}
        <Card className="border-muted-foreground/10 bg-card/65 backdrop-blur-sm relative overflow-hidden p-3.5 sm:p-6 gap-2 sm:gap-6">
          <div className="absolute top-0 right-0 p-2 sm:p-3 opacity-15">
            <Calendar className="size-8 sm:size-10 text-primary" />
          </div>
          <CardHeader className="p-0">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground">Horas totales de este mes</p>
          </CardHeader>
          <CardContent className="p-0">
            <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-foreground">{stats.hoursThisMonth.toFixed(1)} hs</h2>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">Aprobadas + pendientes</p>
          </CardContent>
        </Card>

        {/* 2. Pendientes de aprobación */}
        <Card className="border-muted-foreground/10 bg-card/65 backdrop-blur-sm relative overflow-hidden p-3.5 sm:p-6 gap-2 sm:gap-6">
          <div className="absolute top-0 right-0 p-2 sm:p-3 opacity-15">
            <AlertCircle className="size-8 sm:size-10 text-amber-500" />
          </div>
          <CardHeader className="p-0">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground">Pendientes Aprobación</p>
          </CardHeader>
          <CardContent className="p-0">
            <h2 className={`text-xl sm:text-3xl font-extrabold tracking-tight ${stats.pending > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
              {stats.pending} {stats.pending === 1 ? "guardia" : "guardias"}
            </h2>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{stats.pendingHours.toFixed(1)} hs esperando revisión</p>
          </CardContent>
        </Card>

        {/* 3. Próximo Evento */}
        <Card className="border-muted-foreground/10 bg-card/65 backdrop-blur-sm relative overflow-hidden p-3.5 sm:p-6 gap-2 sm:gap-6">
          <div className="absolute top-0 right-0 p-2 sm:p-3 opacity-15">
            <Calendar className="size-8 sm:size-10 text-sky-500" />
          </div>
          <CardHeader className="p-0">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground">Próximo Evento</p>
          </CardHeader>
          <CardContent className="p-0 min-w-0">
            <h2 className={`text-base sm:text-xl font-extrabold tracking-tight truncate ${nextEvent ? "text-sky-600 dark:text-sky-400" : "text-muted-foreground"}`} title={nextEvent?.name || ""}>
              {nextEvent ? nextEvent.name : "Sin eventos"}
            </h2>
            <p className="text-[11px] sm:text-sm font-semibold text-foreground mt-1 flex items-center gap-1.5">
              {nextEvent ? (
                <>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    nextEvent.daysRemaining === 0 
                      ? "bg-rose-500 text-white animate-pulse" 
                      : nextEvent.daysRemaining === 1 
                        ? "bg-amber-500 text-black" 
                        : "bg-sky-500/20 text-sky-700 dark:text-sky-300"
                  }`}>
                    {nextEvent.daysLabel}
                  </span>
                  <span className="text-muted-foreground text-xs font-normal">
                    ({formatDate(nextEvent.date)})
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground font-normal">No hay eventos planificados</span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* 4. Responsable del Turno Semanal */}
        <Card className="border-muted-foreground/10 bg-card/65 backdrop-blur-sm relative overflow-hidden p-3.5 sm:p-6 gap-2 sm:gap-6">
          <div className="absolute top-0 right-0 p-2 sm:p-3 opacity-15">
            <Key className="size-8 sm:size-10 text-purple-500" />
          </div>
          <CardHeader className="p-0">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground">Turno de la Semana</p>
          </CardHeader>
          <CardContent className="p-0 min-w-0">
            <h2 className={`text-lg sm:text-2xl font-extrabold tracking-tight ${
              currentTurnOwner === "facundo"
                ? "text-sky-600 dark:text-sky-400"
                : "text-purple-600 dark:text-purple-400"
            }`}>
              {currentTurnOwner === "facundo" ? "Facundo Carrizo" : "Ramiro Lacci"}
            </h2>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5 sm:mt-1">
              {todayHasOverride ? (
                <span className="flex items-center gap-1">
                  <span className="line-through opacity-60">
                    {todayOriginalTurn === "facundo" ? "Facu" : "Ramiro"}
                  </span>
                  <span>➡️</span>
                  <span className="font-semibold text-foreground">Reasignado</span>
                </span>
              ) : (
                <span>Turno automático por cronograma</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-muted-foreground/10 pb-2 mb-2 print:hidden">
        <div className="flex gap-1.5 sm:gap-2 w-full sm:w-auto">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="font-semibold text-xs h-8 flex-1 sm:flex-initial"
          >
            <FileText className="size-3.5 mr-1.5" />
            Vista de Lista
          </Button>
          <Button
            variant={viewMode === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("calendar")}
            className="font-semibold text-xs h-8 flex-1 sm:flex-initial"
          >
            <Calendar className="size-3.5 mr-1.5" />
            Vista de Calendario
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(window.location.origin + window.location.pathname + "?fullscreenCalendar=true#/guardias", "_blank")}
            className="font-semibold text-xs h-8 px-2.5 shrink-0"
            title="Ver calendario en pestaña aparte"
          >
            <Maximize2 className="size-3.5" />
          </Button>
        </div>

        {/* Período activo + Botón Historial */}
        <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground bg-muted/50 border border-muted-foreground/10 rounded-md px-2.5 h-8">
            <Calendar className="size-3 shrink-0 text-primary" />
            Período: <span className="text-foreground font-bold">{activePeriod.label}</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHistorialOpen(true)}
            className="font-semibold text-xs h-8 gap-1.5 border-primary/20 hover:border-primary/40 hover:bg-primary/5 w-full sm:w-auto justify-center sm:justify-start"
            title={`Ver historial completo de guardias (${historicalGuardias.length} guardias archivadas)`}
          >
            <History className="size-3.5 text-primary" />
            Historial
            {historicalGuardias.length > 0 && (
              <span className="bg-primary/15 text-primary text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                {historicalGuardias.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {/* Left / Guardias Content (Takes 2 Cols in list view, 3 Cols in calendar view) */}
        <div className={`${viewMode === "calendar" ? "lg:col-span-3" : "lg:col-span-2"} space-y-4`}>
          {viewMode === "list" ? (
            <Card className="border-muted-foreground/10 bg-card/45 backdrop-blur-xs print:border-none print:shadow-none">
            <CardHeader className="pb-3 flex flex-row items-center justify-between print:hidden">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                Registros de Guardia ({filteredGuardias.length})
              </CardTitle>
              {/* Período activo indicator */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden sm:inline-flex items-center gap-1 text-[10.5px] font-semibold text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  Período: <span className="text-foreground font-bold ml-0.5">{activePeriod.label}</span>
                </span>
                {historicalGuardias.length > 0 && (
                  <button
                    onClick={() => setHistorialOpen(true)}
                    className="hidden sm:inline-flex items-center gap-1 text-[10.5px] font-semibold text-primary/80 hover:text-primary underline-offset-2 hover:underline transition-colors"
                    title="Ver historial completo"
                  >
                    <History className="size-3" />
                    Ver {historicalGuardias.length} en historial
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filter controls */}
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center print:hidden w-full">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] w-full">
                  <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar descripción, sucursal..."
                    className="pl-8 h-9 text-sm w-full"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {/* Filters Row */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3 w-full sm:w-auto">
                  {/* Status & Type on a single line on mobile */}
                  <div className="flex gap-2 w-full sm:w-auto">
                    {/* Status filter */}
                    <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                      <Filter className="size-3.5 text-muted-foreground shrink-0" />
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-9 w-full sm:w-[160px] text-xs shadow-xs">
                          <SelectValue placeholder="Todos los Estados" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="max-h-72 duration-150 ease-out">
                          <SelectItem value="all">Todos los Estados</SelectItem>
                          <SelectItem value="approved">Aprobado</SelectItem>
                          <SelectItem value="pending_approval">Pendiente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Type filter */}
                    <div className="flex-1 sm:flex-initial">
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="h-9 w-full sm:w-[150px] text-xs shadow-xs">
                          <SelectValue placeholder="Todos los Tipos" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="max-h-80 duration-150 ease-out">
                          <SelectItem value="all">Todos los Tipos</SelectItem>
                          {GUARDIA_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.shortLabel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Developer filter (separate line on mobile, inline on desktop) */}
                  <div className="w-full sm:w-auto">
                    <Select value={userFilter} onValueChange={setUserFilter}>
                      <SelectTrigger className="h-9 w-full sm:w-[190px] text-xs shadow-xs">
                        <SelectValue placeholder="Todos los Colaboradores" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-h-72 duration-150 ease-out">
                        <SelectItem value="all">Todos los Colaboradores</SelectItem>
                        {guardiaCollaborators.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator className="print:hidden" />

              {filteredGuardias.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="No hay guardias registradas"
                  description="Registra la primera guardia de sistemas utilizando el botón superior."
                  action={
                    <Button onClick={() => openCreate()} size="sm" className="print:hidden">
                      <Plus className="size-4 mr-1.5" /> Registrar Guardia
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-4">
                  {filteredGuardias.map((g) => {
                    const isApproved = g.status === "approved";
                    const collaborator = usersById.get(g.userId);
                    return (
                      <Card 
                        key={g.id} 
                        className={`group relative overflow-hidden transition-all duration-200 hover:shadow-md border border-muted-foreground/10 print:break-inside-avoid print:shadow-none`}
                      >
                        {/* Status side bar indicator */}
                        <div className={`absolute left-0 top-0 h-full w-1 ${isApproved ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                        
                        <CardContent className="p-4 space-y-3">
                          {/* Header of Guardia card */}
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="space-y-1 min-w-[200px]">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground text-sm flex items-center gap-2">
                                  <CollaboratorAvatar
                                    userName={g.userName}
                                    avatarUrl={collaborator?.avatarUrl}
                                  />
                                  {g.userName}
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className={`text-[10px] h-5 py-0 px-2 uppercase tracking-wide font-semibold ${getGuardTypeBadgeColor(g.type)}`}
                                >
                                  {getGuardiaTypeShortLabel(g.type)}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="size-3" />
                                  {formatDate(g.date)}
                                </span>
                                <span className="flex items-center gap-1 font-mono">
                                  <Clock className="size-3" />
                                  {g.startTime} - {g.endTime} ({g.hours} hs)
                                </span>
                              </div>
                            </div>

                            {/* Status Badge & Actions */}
                            <div className="flex items-center gap-2 print:hidden">
                              {/* Quick Approve Button for Boss */}
                              {!isApproved ? (
                                <Button 
                                  variant="outline" 
                                  size="xs" 
                                  className="h-7 bg-emerald-50/50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900"
                                  onClick={() => handleToggleStatus(g.id)}
                                  title="Aprobar guardia"
                                >
                                  <Check className="size-3.5 mr-1" />
                                  Aprobar
                                </Button>
                              ) : (
                                <Button 
                                  variant="ghost" 
                                  size="xs" 
                                  className="h-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                                  onClick={() => handleToggleStatus(g.id)}
                                  title="Revertir aprobación"
                                >
                                  Desaprobar
                                </Button>
                              )}

                              <Badge 
                                variant={isApproved ? "default" : "secondary"}
                                className={`text-[10px] h-6 px-2 capitalize cursor-pointer print:cursor-default ${
                                  isApproved 
                                    ? "bg-emerald-500 hover:bg-emerald-600 text-white" 
                                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-900"
                                }`}
                                onClick={() => handleToggleStatus(g.id)}
                              >
                                {isApproved ? (
                                  <span className="flex items-center gap-1 font-semibold">
                                    <CheckCircle2 className="size-3" />
                                    Aprobado
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 font-semibold">
                                    <Clock className="size-3" />
                                    Pendiente
                                  </span>
                                )}
                              </Badge>
                            </div>
                            
                            {/* Print status display */}
                            <div className="hidden print:block">
                              <span className={`text-xs font-bold border px-2 py-0.5 rounded ${isApproved ? "border-green-600 text-green-600" : "border-amber-600 text-amber-600"}`}>
                                {isApproved ? "APROBADO" : "PENDIENTE"}
                              </span>
                            </div>
                          </div>

                          {/* Body details */}
                          <div className="text-sm text-foreground/80 pl-5 border-l-2 border-muted/30">
                            <p className="font-medium whitespace-pre-wrap">{g.description}</p>
                            {g.notes && (
                              <p className="text-xs text-muted-foreground mt-2 italic bg-muted/20 p-2 rounded border border-muted/10">
                                <strong>Nota Técnica:</strong> {g.notes}
                              </p>
                            )}
                          </div>

                          {/* Footer details (Branches Affected) */}
                          {g.branchesAffected && (
                            <div className="flex flex-wrap items-center gap-1 text-xs pl-5 text-muted-foreground">
                              <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                              <span className="font-semibold mr-1">Alcance/Sucursales:</span>
                              <div className="flex flex-wrap gap-1">
                                {formatBranchesForDisplay(g.branchesAffected) === "Todas las sucursales" ? (
                                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-bold">
                                    Todas las sucursales
                                  </Badge>
                                ) : (
                                  g.branchesAffected.split(",").map((br, idx) => (
                                    <Badge key={idx} variant="outline" className="text-[10px] bg-background/50 border-muted-foreground/15">
                                      {br.trim()}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center justify-end gap-2 pt-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 print:hidden">
                            <Button variant="ghost" size="icon-xs" onClick={() => openEdit(g)} title="Editar guardia">
                              <Edit className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon-xs" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(g.id)} title="Eliminar registro">
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-muted-foreground/10 bg-card/45 backdrop-blur-xs print:border-none print:shadow-none overflow-hidden">
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 print:hidden border-b border-muted-foreground/5 mb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2 shrink-0">
                <Calendar className="size-4 text-primary" />
                Calendario de Guardias
              </CardTitle>
              
              {/* Month Navigation */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon-xs" className="size-7" onClick={handlePrevMonth} title="Mes anterior">
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-sm font-semibold min-w-[110px] text-center capitalize">
                  {MONTH_NAMES[currentCalMonth]} {currentCalYear}
                </span>
                <Button variant="outline" size="icon-xs" className="size-7" onClick={handleNextMonth} title="Mes siguiente">
                  <ChevronRight className="size-4" />
                </Button>
                <Button variant="ghost" size="xs" onClick={handleGoToday} className="text-xs font-semibold h-7">
                  Hoy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filtros de Visualización */}
              <div className="flex flex-wrap items-center gap-2 mb-4 text-xs font-semibold print:hidden border-b border-muted-foreground/5 pb-3">
                <span className="text-muted-foreground w-full sm:w-auto">Mostrar en Calendario:</span>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant={showGuardias ? "default" : "outline"} 
                    size="xs" 
                    className="h-7 text-xs gap-1" 
                    onClick={() => setShowGuardias(!showGuardias)}
                  >
                    <Clock className="size-3.5" />
                    Guardias
                  </Button>
                  <Button 
                    variant={showEventos ? "default" : "outline"} 
                    size="xs" 
                    className="h-7 text-xs gap-1"
                    onClick={() => setShowEventos(!showEventos)}
                  >
                    🔥 Eventos
                  </Button>
                  <Button 
                    variant={showTurnos ? "default" : "outline"} 
                    size="xs" 
                    className="h-7 text-xs gap-1"
                    onClick={() => setShowTurnos(!showTurnos)}
                  >
                    <UserIcon className="size-3.5" />
                    Turnos
                  </Button>
                  <Button 
                    variant={showFeriados ? "default" : "outline"} 
                    size="xs" 
                    className="h-7 text-xs gap-1"
                    onClick={() => setShowFeriados(!showFeriados)}
                  >
                    🎉 Feriados
                  </Button>
                </div>
              </div>

              {/* Calendar Grid Header */}
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center font-bold text-[10px] sm:text-xs text-muted-foreground mb-2 border-b border-muted-foreground/5 pb-1">
                 {WEEK_DAYS.map(d => (
                  <div key={d} className="py-1 truncate px-0.5">{d}</div>
                ))}
              </div>
              
              {/* Calendar Grid Cells */}
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5 auto-rows-[80px] sm:auto-rows-[100px]">
                {cells.map((cell, idx) => {
                  const dayGuardias = guardias.filter(g => g.date === cell.dateStr);
                  const isToday = cell.dateStr === new Date().toISOString().split("T")[0];
                  const originalTurn = getWeeklyTurn(cell.dateStr);
                  const overriddenTurn = turnOverrides[cell.dateStr];
                  const hasOverride = overriddenTurn && overriddenTurn !== originalTurn;
                  const weeklyTurn = hasOverride ? overriddenTurn : originalTurn;
                  const holidayName = getHolidayInfo(cell.dateStr);
                  const assignedUserId = holidayAssignments[cell.dateStr];
                  const assignedUser = assignedUserId ? users.find(u => u.id === assignedUserId) : null;
                  const isLimitDay = cell.day === 25 && cell.isCurrentMonth;
                  
                  // Construct hover title
                  let cellTitle = "Hacé click para ver y registrar guardias de este día";
                  if (isLimitDay) {
                    cellTitle = `⚠️ CORTE DE PERÍODO: Último día para registrar guardias en el período actual (corta a las 23:59 hs).\n\n${cellTitle}`;
                  }
                  if (holidayName && showFeriados) {
                    cellTitle = `Feriado: ${holidayName}\nAsiste: ${assignedUser ? assignedUser.fullName : "Sin asignar"}\n\n${cellTitle}`;
                  }

                  // Background styles for holiday
                  const cellBgClass = isLimitDay
                    ? "limit-day-pulse border-amber-500/50 dark:border-amber-500/30"
                    : (holidayName && showFeriados)
                      ? cell.isCurrentMonth
                        ? "bg-amber-500/10 border-amber-500/30 dark:bg-amber-950/20 dark:border-amber-900/40 hover:bg-amber-500/15"
                        : "bg-amber-500/5 border-amber-500/20 dark:bg-amber-950/10 dark:border-amber-900/20 opacity-50 hover:opacity-80 hover:bg-amber-500/10"
                      : cell.isCurrentMonth
                        ? "bg-background/40 border-muted-foreground/10"
                        : "bg-background/10 border-muted-foreground/5 opacity-40 hover:opacity-80";

                  return (
                    <Tooltip key={idx}>
                      <TooltipTrigger asChild>
                        <div
                          onClick={() => {
                            setSelectedCalDate(cell.dateStr);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                          }}
                          onDrop={async (e) => {
                            e.preventDefault();
                            const id = e.dataTransfer.getData("text/plain");
                            if (id) {
                              try {
                                await updateGuardia(id, { date: cell.dateStr });
                                toast.success("Guardia reasignada correctamente");
                              } catch (err) {
                                toast.error("Error al reasignar la guardia");
                              }
                            }
                          }}
                          className={`group relative rounded border sm:rounded-lg border p-1 ${isLimitDay ? "pb-5 sm:pb-6" : ""} flex flex-col justify-between gap-1 transition-all duration-200 cursor-pointer overflow-hidden hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/5 hover:border-primary/50 hover:ring-1 hover:ring-primary/20 active:scale-[0.98] ${cellBgClass} ${isToday ? "ring-1 sm:ring-2 ring-primary ring-offset-1 sm:ring-offset-2 ring-offset-background" : ""}`}
                        >
                          {/* Day Number and Add Icon */}
                          <div className="flex justify-between items-center min-w-0 overflow-hidden shrink-0">
                            <div className="flex items-center gap-1 min-w-0 flex-wrap">
                              {holidayName && showFeriados ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation(); // Stop opening normal Day Dialog
                                    setSelectedHolidayDate(cell.dateStr);
                                    setHolidayDialogOpen(true);
                                  }}
                                  className={`text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 transition-transform hover:scale-110 cursor-pointer bg-amber-500 text-white dark:bg-amber-600 dark:text-amber-100`}
                                  title={`Feriado: ${holidayName}. Hacé click para asignar o modificar el colaborador de guardia.`}
                                >
                                  {cell.day}
                                </button>
                              ) : (
                                <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                                  isToday 
                                    ? "bg-primary text-primary-foreground font-black" 
                                    : isLimitDay
                                      ? "bg-amber-500 text-black font-black animate-pulse"
                                      : "text-muted-foreground"
                                }`}>
                                  {cell.day}
                                </span>
                              )}
                              {showEventos && getSpecialEvents(cell.dateStr).map((evt) => {
                                let style = {};
                                let className = "";
                                const evType = eventTypes.find(t => t.id === evt.type);
                                const hasTasks = evt.tasks && evt.tasks.length > 0;
                                if (hasTasks) {
                                  const dynamic = getDynamicEventStyle(evt.tasks);
                                  style = dynamic.style;
                                  className = "border";
                                } else if (evt.id === "last-thursday-onfire") {
                                  className = "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30";
                                } else if (evt.id === "first-wednesday-break") {
                                  className = "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30";
                                } else if (evType) {
                                  className = EVENT_COLOR_MAP[evType.color] || EVENT_COLOR_MAP.gray;
                                } else {
                                  className = "border bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
                                }
                                
                                const isAllCompleted = evt.tasks && evt.tasks.length > 0 && evt.tasks.every(t => t.completed);
                                return (
                                  <span 
                                    key={evt.id}
                                    style={style}
                                    onClick={(e) => {
                                      if (evt.id !== "last-thursday-onfire" && evt.id !== "first-wednesday-break") {
                                        e.stopPropagation();
                                        openDetailEvent(evt);
                                      }
                                    }}
                                    className={`text-[8px] ${className} px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider shrink-0 truncate max-w-full cursor-pointer hover:scale-105 transition-transform`}
                                    title={`${evt.name} (${evt.tasks ? evt.tasks.filter(t => t.completed).length : 0}/${evt.tasks ? evt.tasks.length : 0} tareas)`}
                                  >
                                    {evt.name} {isAllCompleted && "✓"}
                                  </span>
                                );
                              })}
                            </div>
                            <Plus className="size-3 opacity-0 group-hover:opacity-60 transition-opacity text-primary shrink-0" />
                          </div>
                          
                          {isLimitDay && (
                            <div className="absolute bottom-0 left-0 right-0 bg-amber-500/20 dark:bg-amber-950/60 border-t border-dashed border-amber-500/40 text-amber-600 dark:text-amber-400 text-[7.5px] sm:text-[8.5px] font-black py-0.5 text-center select-none tracking-wide uppercase animate-pulse z-10" title="Corte de período: Último día para registrar guardias">
                              ⚠️ CORTE PERÍODO
                            </div>
                          )}

                          {/* Content Area */}
                          <div className="flex-1 flex flex-col gap-1 mt-1 justify-end min-h-0">
                            {/* Holiday Badge with Helper */}
                            {holidayName && showFeriados && (
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedHolidayDate(cell.dateStr);
                                  setHolidayDialogOpen(true);
                                }}
                                className="rounded border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20 p-1 space-y-0.5 select-none shrink-0 cursor-pointer hover:bg-amber-500/15 dark:hover:bg-amber-950/40 transition-colors" 
                                title={`Feriado: ${holidayName}. Hacer click para asignar responsable.`}
                              >
                                <div className="text-[8px] font-extrabold text-amber-600 dark:text-amber-400 truncate">
                                  🎉 {holidayName}
                                </div>
                                {assignedUser && (
                                  <div className="text-[7.5px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                    <UserIcon className="size-2 shrink-0" />
                                    <span className="truncate">Asiste: {assignedUser.fullName.split(" ")[0]}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Guardias in this day */}
                            {showGuardias && dayGuardias.length > 0 && (
                              <div className="flex flex-col gap-1 overflow-y-auto max-h-[50px] pr-0.5 scrollbar-thin">
                                {dayGuardias.map(g => {
                                  let userColor = "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20";
                                  if (g.userId === "usr-031") {
                                    userColor = "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-100 dark:border-sky-900/50 hover:bg-sky-100/50 dark:hover:bg-sky-900/50";
                                  } else if (g.userId === "usr-076") {
                                    userColor = "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-100 dark:border-purple-900/50 hover:bg-purple-100/50 dark:hover:bg-purple-900/50";
                                  } else if (g.userId === "usr-039") {
                                    userColor = "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-100 dark:border-amber-900/50 hover:bg-amber-100/50 dark:hover:bg-amber-900/50";
                                  }
                                  
                                  return (
                                    <button
                                      key={g.id}
                                      draggable={true}
                                      onDragStart={(e) => {
                                        e.stopPropagation();
                                        e.dataTransfer.setData("text/plain", g.id);
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation(); // Prevent opening create dialog
                                        openEdit(g);
                                      }}
                                      className={`w-full text-left text-[8.5px] font-bold py-0.5 px-1 rounded border transition-all truncate flex items-center justify-between gap-0.5 cursor-grab active:cursor-grabbing ${userColor}`}
                                      title={`${g.userName}: ${g.description} (${g.hours} hs) - Click para editar`}
                                    >
                                      <span className="truncate">{g.userName.split(" ")[0]}</span>
                                      <span className="shrink-0 text-[7.5px] opacity-75">{g.hours}h</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Turno Semanal */}
                            {showTurnos && originalTurn && (
                              <div 
                                className={`text-[8px] font-bold py-0.5 px-1 rounded border text-center select-none shrink-0 flex items-center justify-center gap-0.5 ${
                                  weeklyTurn === "facundo"
                                    ? "bg-sky-500/5 dark:bg-sky-500/10 text-sky-600/80 dark:text-sky-400/80 border-sky-500/15"
                                    : weeklyTurn === "ramiro"
                                      ? "bg-purple-500/5 dark:bg-purple-500/10 text-purple-600/80 dark:text-purple-400/80 border-purple-500/15"
                                      : "bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-300 border-teal-500/30"
                                }`}
                                title={
                                  hasOverride
                                    ? `Turno modificado. Original: ${formatTurnLabel(originalTurn)} ➡️ Nuevo: ${formatTurnLabel(overriddenTurn)}`
                                    : `Esta semana es el turno de guardia de ${formatTurnLabel(originalTurn)}`
                                }
                              >
                                <span>Turno:</span>
                                {hasOverride ? (
                                  <span className="flex items-center gap-0.5">
                                    <span className="line-through opacity-50">{formatTurnLabel(originalTurn, true)}</span>
                                    <span>➡️</span>
                                    <span className="font-extrabold">{formatTurnLabel(overriddenTurn, true)}</span>
                                  </span>
                                ) : (
                                  <span>{formatTurnLabel(originalTurn)}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-popover text-popover-foreground border border-muted-foreground/20 shadow-xl w-64 p-3 rounded-lg space-y-2 z-50">
                        <div className="space-y-1">
                          <div className="font-bold text-xs flex justify-between items-center text-primary border-b border-muted-foreground/10 pb-1 mb-1.5">
                            <span>{formatDateLong(cell.dateStr)}</span>
                            {isToday && <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-black">HOY</span>}
                          </div>
                          
                          {/* Corte de Período */}
                          {isLimitDay && (
                            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded p-1.5 text-[9.5px] font-bold flex items-center gap-1">
                              <span>⚠️</span>
                              <span>CORTE: Último día del período</span>
                            </div>
                          )}

                          {/* Holiday */}
                          {holidayName && showFeriados && (
                            <div className="bg-amber-500/5 border border-amber-500/20 text-amber-500 rounded p-1.5 text-[9.5px] font-bold space-y-0.5">
                              <div>🎉 Feriado: {holidayName}</div>
                              {assignedUser && (
                                <div className="text-[9px] text-emerald-500 flex items-center gap-0.5">
                                  <span>👤 Asiste:</span>
                                  <span className="font-extrabold">{assignedUser.fullName}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Weekly turn */}
                          {showTurnos && originalTurn && (
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <span>🔑</span>
                              <span>Turno semanal: </span>
                              {hasOverride ? (
                                <span className="flex items-center gap-1">
                                  <span className="line-through opacity-50">{formatTurnLabel(originalTurn)}</span>
                                  <span>➡️</span>
                                  <strong className="text-foreground">{formatTurnLabel(overriddenTurn)}</strong>
                                </span>
                              ) : (
                                <strong className="text-foreground">{formatTurnLabel(originalTurn)}</strong>
                              )}
                            </div>
                          )}

                          {/* Events */}
                          {showEventos && getSpecialEvents(cell.dateStr).length > 0 && (
                            <div className="space-y-1">
                              <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-black">✨ Eventos</div>
                              {getSpecialEvents(cell.dateStr).map(evt => (
                                <div key={evt.id} className="text-[10px] flex items-center gap-1 pl-1 border-l-2 border-primary/40 text-foreground">
                                  <span className="font-medium">{evt.name}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Guardias */}
                          {showGuardias && dayGuardias.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-black">👥 Guardias ({dayGuardias.length})</div>
                              <div className="space-y-1 max-h-[100px] overflow-y-auto pr-0.5 scrollbar-thin">
                                {dayGuardias.map(g => {
                                  const isApproved = g.status === "approved";
                                  return (
                                    <div key={g.id} className="text-[9.5px] flex items-center justify-between gap-1 p-1 rounded bg-muted-foreground/5 border border-muted-foreground/10">
                                      <div className="flex items-center gap-1.5 truncate">
                                        <div className="size-4 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[8px] shrink-0">
                                          {g.userName.slice(0, 2).toUpperCase()}
                                        </div>
                                        <span className="font-semibold truncate text-foreground">{g.userName.split(" ")[0]}</span>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <span className="text-[9px] font-extrabold bg-primary/10 text-primary px-1 rounded">{g.hours}h</span>
                                        <span className={`size-1.5 rounded-full ${isApproved ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {showGuardias && dayGuardias.length === 0 && !holidayName && (
                            <div className="text-[10px] text-muted-foreground italic pl-1">No hay guardias registradas</div>
                          )}
                          
                          <div className="text-[8px] text-muted-foreground/60 text-center pt-1 border-t border-muted-foreground/5 select-none">
                            Click para ver y registrar (Arrastrá para reasignar)
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

        {/* Right / Boss Overview and Hours Summary (Takes 1 Col in list view, 3 Cols in calendar view) */}
        <div className={viewMode === "calendar" ? "lg:col-span-3 space-y-6" : "lg:col-span-1 space-y-6"}>
          <Card className="border-muted-foreground/10 bg-card/65 backdrop-blur-sm print:break-inside-avoid overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Award className="size-4 text-primary shrink-0" />
                Resumen para Jefe de Sistemas
              </CardTitle>
              <p className="text-xs text-muted-foreground break-words">
                Totalización de horas y guardias acumuladas por colaborador del equipo.
              </p>
            </CardHeader>
            <CardContent className={viewMode === "calendar" ? "grid gap-6 md:grid-cols-2 items-start" : "space-y-4"}>
              <div className="space-y-3">
                {stats.devBreakdown.map((dev, index) => (
                  <div key={dev.name} className="flex items-center justify-between p-2 sm:p-2.5 rounded-lg border border-muted-foreground/5 bg-background/30 hover:bg-background/60 transition-all gap-2">
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-bold text-muted-foreground shrink-0">#{index + 1}</span>
                        <span className="text-sm font-semibold truncate text-foreground">{dev.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{dev.count} {dev.count === 1 ? "guardia registrada" : "guardias registradas"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm sm:text-base font-extrabold text-primary font-mono whitespace-nowrap">{dev.hours.toFixed(1)} hs</span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Liquidables</p>
                    </div>
                  </div>
                ))}
                {stats.devBreakdown.length === 0 && (
                  <p className="text-xs text-muted-foreground italic text-center py-4">No hay datos acumulados para resumir.</p>
                )}
              </div>

              {viewMode !== "calendar" && <Separator />}

              <div
                className={`rounded-lg border p-3 text-xs space-y-2 overflow-hidden break-words ${
                  stats.pending > 0
                    ? "bg-amber-500/5 border-amber-500/20 text-amber-900 dark:text-amber-300"
                    : "bg-emerald-500/5 border-emerald-500/20 text-emerald-900 dark:text-emerald-300"
                }`}
              >
                <p className="font-bold flex items-center gap-1">
                  {stats.pending > 0 ? (
                    <AlertCircle className="size-3.5 shrink-0" />
                  ) : (
                    <CheckCircle2 className="size-3.5 shrink-0" />
                  )}
                  {stats.pending > 0 ? "Requiere tu revisión" : "Estado al día"}
                </p>

                {stats.pending > 0 ? (
                  <>
                    <p className="text-[11px] leading-relaxed opacity-95">
                      Hay{" "}
                      <span className="font-semibold">
                        {stats.pending} {stats.pending === 1 ? "guardia" : "guardias"}
                      </span>{" "}
                      ({stats.pendingHours.toFixed(1)} hs) sin aprobar. Revisá el detalle en la lista
                      y confirmá con <span className="font-semibold">Aprobar</span> antes de liquidar.
                    </p>
                    <ul className="text-[11px] leading-relaxed opacity-95 space-y-0.5 pl-3 list-disc">
                      {stats.pendingByUser.map((u) => (
                        <li key={u.name}>
                          {u.name}: {u.count} {u.count === 1 ? "pendiente" : "pendientes"} (
                          {u.hours.toFixed(1)} hs)
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-[11px] leading-relaxed opacity-95">
                    No hay guardias pendientes. Podés exportar el PDF como respaldo para RRHH o
                    liquidación.
                  </p>
                )}

                <Separator className="opacity-40" />

                <p className="text-[11px] leading-relaxed opacity-90">
                  <span className="font-semibold">Mes en curso:</span>{" "}
                  {stats.approvedHoursThisMonth.toFixed(1)} hs aprobadas de{" "}
                  {stats.hoursThisMonth.toFixed(1)} hs registradas
                  {stats.monthPendingCount > 0 && (
                    <>
                      {" "}
                      · {stats.monthPendingHours.toFixed(1)} hs aún pendientes
                    </>
                  )}
                  .
                </p>
                <p className="text-[11px] leading-relaxed opacity-90">
                  <span className="font-semibold">Histórico del equipo:</span>{" "}
                  {stats.approvedHoursAll.toFixed(1)} hs aprobadas de{" "}
                  {stats.totalHoursAll.toFixed(1)} hs totales en el sistema.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card: Lista de Eventos Especiales */}
          <Card className="border-muted-foreground/10 bg-card/65 backdrop-blur-sm print:break-inside-avoid overflow-hidden">
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Calendar className="size-4 text-primary shrink-0" />
                  Eventos Especiales
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Eventos planificados y cumplimiento de sus tareas.
                </p>
              </div>
              <Button onClick={() => openCreateEvent()} size="xs" variant="outline" className="h-7 text-xs gap-1 font-semibold border-primary/20 hover:bg-primary/5">
                <Plus className="size-3 text-primary" /> Evento
              </Button>
            </CardHeader>
            <CardContent className={viewMode === "calendar" ? "grid gap-4 md:grid-cols-3 items-start" : "space-y-3"}>
              {manualEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-4 col-span-full">
                  No hay eventos registrados.
                </p>
              ) : (
                [...manualEvents]
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((evt) => {
                    const dynamic = getDynamicEventStyle(evt.tasks);
                    const completedTasks = evt.tasks ? evt.tasks.filter(t => t.completed).length : 0;
                    const totalTasks = evt.tasks ? evt.tasks.length : 0;
                    
                    return (
                      <div 
                        key={evt.id}
                        style={dynamic.style}
                        onClick={() => openDetailEvent(evt)}
                        className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:shadow-xs transition-all gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold font-mono px-1.5 py-0.5 rounded-sm bg-background/50 border border-muted-foreground/10">
                              {formatDate(evt.date)}
                            </span>
                            <Badge variant="outline" className="text-[9px] py-0 px-1 border-muted-foreground/20 font-bold bg-background/35 capitalize">
                              {evt.type === "break" ? "☕ Break" : evt.type === "onfire" ? "🔥 OnFire" : evt.type === "promo" ? "🎯 Promo" : "⚙️ Custom"}
                            </Badge>
                          </div>
                          <h4 className="text-sm font-bold text-foreground mt-1.5 truncate">
                            {evt.name}
                          </h4>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-16 h-1.5 rounded-full bg-muted-foreground/10 overflow-hidden shrink-0">
                              <div 
                                className="h-full rounded-full transition-all duration-300"
                                style={{ 
                                  width: `${dynamic.percent}%`,
                                  backgroundColor: dynamic.style.color
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-semibold opacity-85">
                              {totalTasks > 0 ? `${completedTasks}/${totalTasks} (${dynamic.percent}%)` : "Sin tareas"}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="icon-xs" 
                            className="h-7 w-7 hover:bg-background/40"
                            onClick={() => openEditEvent(evt)}
                          >
                            <Edit className="size-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon-xs" 
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              void deleteSpecialEvent(evt.id);
                              toast.success("Evento eliminado");
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Register/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle>
              {editingGuardia ? "Modificar Registro de Guardia" : "Registrar Nueva Guardia de Sistemas"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Formulario para {editingGuardia ? "modificar" : "registrar"} una guardia del personal de Sistemas IT.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2 pr-1 space-y-4">
            {/* Colaborador */}
            <div className="grid gap-2">
              <Label htmlFor="userId">Colaborador <span className="text-red-500">*</span></Label>
              <Select
                value={form.userId || undefined}
                onValueChange={handleUserSelect}
              >
                <SelectTrigger id="userId" className="h-auto min-h-9 py-2">
                  <SelectValue placeholder="Seleccionar colaborador" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-72">
                  <SelectGroup>
                    <SelectLabel>Equipo de Sistemas IT</SelectLabel>
                    {guardiaCollaborators.map((u) => (
                      <SelectItem
                        key={u.id}
                        value={u.id}
                        className="items-start py-2.5"
                      >
                        <span className="flex flex-col gap-0.5 text-left">
                          <span className="font-medium leading-tight">{u.fullName}</span>
                          <span className="text-xs text-muted-foreground font-normal">
                            {formatCollaboratorRole(u)}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Date and Times */}
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2 col-span-1">
                <Label htmlFor="date">Fecha <span className="text-red-500">*</span></Label>
                <Input 
                  id="date" 
                  type="text" 
                  placeholder="DD/MM/AAAA"
                  value={form.date} 
                  onChange={(e) => setForm({ ...form, date: e.target.value })} 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="startTime">Hora Inicio <span className="text-red-500">*</span></Label>
                <Input 
                  id="startTime" 
                  type="text" 
                  placeholder="HH:MM"
                  value={form.startTime} 
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })} 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endTime">Hora Fin <span className="text-red-500">*</span></Label>
                <Input 
                  id="endTime" 
                  type="text" 
                  placeholder="HH:MM"
                  value={form.endTime} 
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })} 
                />
              </div>
            </div>

            {/* Tipo / motivo */}
            <div className="grid gap-2">
              <Label htmlFor="type">Motivo / Tipo de Guardia <span className="text-red-500">*</span></Label>
              <Select
                value={form.type}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    type: value as Guardia["type"],
                    otherReason: value === "otro" ? prev.otherReason : "",
                  }))
                }
              >
                <SelectTrigger id="type" className="h-auto min-h-9 py-2">
                  <SelectValue placeholder="Seleccionar tipo de guardia" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-80">
                  {GUARDIA_TYPES.map((t) => (
                    <SelectItem
                      key={t.value}
                      value={t.value}
                      className="items-start py-2.5"
                    >
                      <span className="flex flex-col gap-0.5 text-left">
                        <span className="font-medium leading-tight">{t.label}</span>
                        <span className="text-xs text-muted-foreground font-normal">
                          {t.description}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div
              className={`grid gap-2 overflow-hidden transition-all duration-300 ease-out ${
                form.type === "otro" ? "max-h-[12rem] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              {form.type === "otro" ? (
                <>
                  <Label htmlFor="otherReason">Especificar motivo <span className="text-red-500">*</span></Label>
                  <textarea
                    ref={otherReasonRef}
                    id="otherReason"
                    data-min-height="44"
                    rows={1}
                    placeholder="Contá el motivo particular de la guardia..."
                    className="min-h-[2.75rem] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring resize-none overflow-hidden"
                    value={form.otherReason}
                    onChange={(e) => setForm({ ...form, otherReason: e.target.value })}
                  />
                </>
              ) : null}
            </div>

            {/* Branches affected */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="branchesAffected">Alcance / Sucursales afectadas</Label>
                <span className="text-[10px] text-muted-foreground">Opcional</span>
              </div>
              <div className="mt-1">
                {/* Tag row container with dynamic height for smooth single-row collapse/expand */}
                <div
                  className={`flex flex-wrap gap-1.5 overflow-hidden transition-all duration-300 ease-out ${
                    showAllBranches ? "max-h-[18rem] overflow-visible" : "max-h-[2.25rem]"
                  }`}
                >
                  {suggestedBranches.map((br) => {
                    const currentUpper = form.branchesAffected.trim().toUpperCase();
                    const isAllSelected =
                      currentUpper === "TODAS" ||
                      currentUpper === "TODAS LAS SUCURSALES" ||
                      currentUpper === "TODAS SUCURSALES" ||
                      suggestedBranches
                        .filter((item) => item !== "TODAS")
                        .every((item) =>
                          form.branchesAffected
                            .split(",")
                            .map((entry) => entry.trim())
                            .includes(item)
                        );

                    const selected = br === "TODAS"
                      ? isAllSelected
                      : !isAllSelected &&
                        form.branchesAffected
                          .split(",")
                          .map((item) => item.trim())
                          .includes(br);

                    return (
                      <button
                        key={br}
                        type="button"
                        className={`text-[10px] border rounded-md px-2 py-1 transition-colors ${
                          selected
                            ? "bg-white text-black border-primary/40 shadow-xs dark:text-black font-bold"
                            : "bg-muted/40 text-foreground hover:bg-muted-foreground/10"
                        }`}
                        onClick={() => handleToggleBranch(br)}
                      >
                        {br === "TODAS" ? "Todas las sucursales" : br}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="mt-1 text-[11px] font-medium text-primary hover:underline"
                  onClick={() => setShowAllBranches((prev) => !prev)}
                >
                  {showAllBranches ? "Mostrar menos" : "Mostrar más"}
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Descripción detallada del Trabajo <span className="text-red-500">*</span></Label>
              <textarea
                ref={descriptionRef}
                id="description"
                data-min-height="72"
                placeholder="Indicar qué se realizó (ej: Reestablecimiento de base de datos tras corte de luz o monitoreo de carga en server durante promo)"
                className="flex min-h-[4.5rem] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring resize-none overflow-hidden"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {/* Technical notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes">Notas técnicas / Observaciones</Label>
              <textarea
                ref={notesRef}
                id="notes"
                data-min-height="44"
                placeholder="Ej: Se coordinó con Fibertel, IP wan cambió a..."
                rows={1}
                className="flex min-h-[2.75rem] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring resize-none overflow-hidden"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            {/* Status (Pending/Approved) */}
            <div className="flex items-center gap-2 mt-2">
              <input 
                type="checkbox" 
                id="statusCheck" 
                checked={form.status === "approved"} 
                onChange={(e) => setForm({ ...form, status: e.target.checked ? "approved" : "pending_approval" })}
                className="h-4 w-4 rounded border-none bg-transparent accent-primary focus:ring-primary cursor-pointer"
              />
              <div className="grid">
                <Label htmlFor="statusCheck" className="cursor-pointer font-bold text-xs">Aprobar Guardia Inmediatamente</Label>
                <span className="text-[10px] text-muted-foreground">Si sos el jefe o registrás una guardia ya autorizada</span>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-3 flex flex-row items-center justify-end gap-2 shrink-0">
            <Button onClick={handleSave}>
              <Save className="size-4 mr-1.5" />
              Guardar Registro
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Guardias del Día */}
      <Dialog 
        open={!!selectedCalDate} 
        onOpenChange={(open) => {
          if (!open) setSelectedCalDate(null);
        }}
      >
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="flex flex-col gap-3 border-b border-muted-foreground/10 pb-4 mb-4">
            <div className="flex flex-row items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 flex-wrap">
                  <Calendar className="size-4 sm:size-5 text-primary shrink-0" />
                  <span>Guardias del día: {selectedCalDate ? formatDate(selectedCalDate) : ""}</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Registros activos y control operativo para esta jornada.
                </DialogDescription>
              </div>
            </div>
            {selectedCalDate && (
              <div className="flex items-center gap-2 print:hidden flex-wrap">
                <Button 
                  onClick={() => {
                    const dateToPass = selectedCalDate;
                    setSelectedCalDate(null);
                    openCreate(dateToPass);
                  }} 
                  size="sm" 
                  className="gap-1.5 h-8 font-semibold flex-1 sm:flex-initial"
                >
                  <Plus className="size-3.5 shrink-0" /> 
                  <span className="hidden sm:inline">Registrar Guardia</span>
                  <span className="sm:hidden">Registrar</span>
                </Button>
                <Button 
                  onClick={() => {
                    openCreateEvent(selectedCalDate);
                  }} 
                  size="sm" 
                  variant="outline"
                  className="gap-1.5 h-8 border-primary/20 text-primary hover:bg-primary/5 font-semibold flex-1 sm:flex-initial"
                >
                  <Plus className="size-3.5 shrink-0" /> 
                  <span className="hidden sm:inline">Agregar Evento</span>
                  <span className="sm:hidden">Evento</span>
                </Button>
              </div>
            )}
          </DialogHeader>

          <div className="space-y-6 py-2">
            {selectedCalDate && (() => {
              const dayGuardias = guardias.filter(g => g.date === selectedCalDate);
              const dayEvents = getSpecialEvents(selectedCalDate);
              const originalTurn = getWeeklyTurn(selectedCalDate);
              const overriddenTurn = turnOverrides[selectedCalDate];
              const hasOverride = overriddenTurn && overriddenTurn !== originalTurn;
              const holidayName = getHolidayInfo(selectedCalDate);
              const assignedUserId = holidayAssignments[selectedCalDate];
              const assignedUser = assignedUserId ? users.find(u => u.id === assignedUserId) : null;
              
              return (
                <div className="space-y-6">
                  {/* Responsable del Turno Semanal */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-muted-foreground/10 pb-1.5">
                      🔑 Responsable del Turno
                    </h3>
                    <Card className="border border-muted-foreground/10 bg-card/30">
                      <CardContent className="p-3 flex items-center justify-between gap-4 flex-wrap">
                        {(() => {
                          const activeUsers = getTurnResponsibles(selectedCalDate, turnOverrides, getWeeklyTurn);
                          const isFacundoSelected = activeUsers.includes("facundo");
                          const isRamiroSelected = activeUsers.includes("ramiro");

                          const toggleUser = async (target: "facundo" | "ramiro") => {
                            let nextFacu = isFacundoSelected;
                            let nextRami = isRamiroSelected;
                            if (target === "facundo") nextFacu = !isFacundoSelected;
                            if (target === "ramiro") nextRami = !isRamiroSelected;

                            if (nextFacu && nextRami) {
                              await setTurnOverride(selectedCalDate, "both");
                            } else if (nextFacu) {
                              await setTurnOverride(selectedCalDate, "facundo");
                            } else if (nextRami) {
                              await setTurnOverride(selectedCalDate, "ramiro");
                            } else {
                              await clearTurnOverride(selectedCalDate);
                            }
                          };

                          return (
                            <>
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground font-medium">Asignación para esta jornada:</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {isFacundoSelected && (
                                    <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 flex items-center gap-1">
                                      <Check className="size-3" /> Facundo
                                    </span>
                                  )}
                                  {isRamiroSelected && (
                                    <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center gap-1">
                                      <Check className="size-3" /> Ramiro
                                    </span>
                                  )}
                                  {!isFacundoSelected && !isRamiroSelected && (
                                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                      Sin asignar
                                    </span>
                                  )}
                                  {hasOverride && (
                                    <span className="text-[10px] text-muted-foreground opacity-80 italic ml-1">
                                      (Modificado. Original: {formatTurnLabel(originalTurn || "")})
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Control buttons to override / multi-select */}
                              <div className="flex items-center gap-1.5">
                                <Button
                                  variant={isFacundoSelected ? "default" : "outline"}
                                  size="xs"
                                  className={`h-8 font-semibold text-xs transition-all ${
                                    isFacundoSelected
                                      ? "bg-sky-600 hover:bg-sky-700 text-white border-sky-600 shadow-xs"
                                      : "hover:bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                                  }`}
                                  onClick={() => toggleUser("facundo")}
                                >
                                  {isFacundoSelected && <Check className="size-3.5 mr-1" />}
                                  Facundo
                                </Button>
                                <Button
                                  variant={isRamiroSelected ? "default" : "outline"}
                                  size="xs"
                                  className={`h-8 font-semibold text-xs transition-all ${
                                    isRamiroSelected
                                      ? "bg-purple-600 hover:bg-purple-700 text-white border-purple-600 shadow-xs"
                                      : "hover:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                                  }`}
                                  onClick={() => toggleUser("ramiro")}
                                >
                                  {isRamiroSelected && <Check className="size-3.5 mr-1" />}
                                  Ramiro
                                </Button>
                                {hasOverride && (
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    className="h-8 text-destructive hover:bg-destructive/10 text-xs ml-1"
                                    onClick={async () => {
                                      await clearTurnOverride(selectedCalDate);
                                    }}
                                    title="Restaurar turno original"
                                  >
                                    Restaurar
                                  </Button>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Responsable de Feriado */}
                  {holidayName && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-muted-foreground/10 pb-1.5">
                        🎉 Responsable de Feriado: {holidayName}
                      </h3>
                      <Card className="border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/10">
                        <CardContent className="p-3 flex items-center justify-between gap-4 flex-wrap">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground font-medium">Colaborador asignado para el feriado:</p>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                              assignedUser 
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                                : "bg-muted text-muted-foreground"
                            }`}>
                              {assignedUser ? assignedUser.fullName : "Sin asignar / Nadie"}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                            onClick={() => {
                              setSelectedHolidayDate(selectedCalDate);
                              setTempAssignedId(assignedUserId || "none");
                              setHolidayDialogOpen(true);
                            }}
                          >
                            {assignedUser ? "Cambiar Responsable" : "Asignar Responsable"}
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Eventos Especiales */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-muted-foreground/10 pb-1.5">
                      ✨ Eventos Especiales
                    </h3>
                    {dayEvents.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic pl-1 py-1">
                        No hay eventos especiales registrados para este día.
                      </p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {dayEvents.map((evt) => {
                          const isManual = evt.id !== "last-thursday-onfire" && evt.id !== "first-wednesday-break";
                          const dynamic = getDynamicEventStyle(evt.tasks);
                          const isOnfire = evt.id === "last-thursday-onfire";
                          const isBreak = evt.id === "first-wednesday-break";
                          let systemClass = "";
                          if (isOnfire) {
                            systemClass = "bg-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-500/15";
                          } else if (isBreak) {
                            systemClass = "bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/15";
                          }
                          
                          return (
                            <div 
                              key={evt.id} 
                              style={isManual ? dynamic.style : undefined}
                              className={`flex items-center justify-between px-3 py-2.5 rounded-lg border bg-card/20 transition-all hover:bg-card/45 gap-3 cursor-pointer ${systemClass}`}
                              onClick={() => {
                                if (isManual) {
                                  setSelectedCalDate(null);
                                  openDetailEvent(evt);
                                }
                              }}
                            >
                              <span className="text-xs font-bold flex flex-col gap-1 cursor-pointer flex-1 min-w-0">
                                <span className="truncate">{evt.name}</span>
                                {isManual && (
                                  <span className="text-[10px] opacity-75 font-normal">
                                    {evt.tasks && evt.tasks.length > 0 
                                      ? `${evt.tasks.filter(t => t.completed).length}/${evt.tasks.length} tareas (${dynamic.percent}%)` 
                                      : "Sin tareas"}
                                  </span>
                                )}
                              </span>
                              {isManual && (
                                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    className="h-7 w-7 text-foreground hover:bg-background/40"
                                    onClick={() => {
                                      setSelectedCalDate(null);
                                      openEditEvent(evt);
                                    }}
                                    title="Editar evento"
                                  >
                                    <Edit className="size-3.5" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon-xs" 
                                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                    onClick={() => {
                                      void deleteSpecialEvent(evt.id);
                                      toast.success("Evento eliminado");
                                    }}
                                    title="Eliminar evento"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Guardias del Día */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-muted-foreground/10 pb-1.5">
                      👥 Guardias Registradas
                    </h3>
                    {dayGuardias.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic pl-1 py-1">
                        No hay guardias registradas para este día.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {dayGuardias.map((g) => {
                          const isApproved = g.status === "approved";
                          return (
                            <Card 
                              key={g.id} 
                              className={`group relative overflow-hidden transition-all duration-200 hover:shadow-md border border-muted-foreground/10`}
                            >
                              {/* Status side bar indicator */}
                              <div className={`absolute left-0 top-0 h-full w-1 ${isApproved ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                              
                              <CardContent className="p-4 space-y-3">
                                {/* Header of Guardia card */}
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div className="space-y-1 min-w-[200px]">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                                        <UserIcon className="size-3.5 text-muted-foreground" />
                                        {g.userName}
                                      </span>
                                      <Badge 
                                        variant="outline" 
                                        className={`text-[10px] h-5 py-0 px-2 uppercase tracking-wide font-semibold ${getGuardTypeBadgeColor(g.type)}`}
                                      >
                                        {getGuardiaTypeShortLabel(g.type)}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="size-3" />
                                        {formatDate(g.date)}
                                      </span>
                                      <span className="flex items-center gap-1 font-mono">
                                        <Clock className="size-3" />
                                        {g.startTime} - {g.endTime} ({g.hours} hs)
                                      </span>
                                    </div>
                                  </div>

                                  {/* Status Badge & Actions */}
                                  <div className="flex items-center gap-2">
                                    {/* Quick Approve Button for Boss */}
                                    {!isApproved ? (
                                      <Button 
                                        variant="outline" 
                                        size="xs" 
                                        className="h-7 bg-emerald-50/50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900"
                                        onClick={() => handleToggleStatus(g.id)}
                                        title="Aprobar guardia"
                                      >
                                        <Check className="size-3.5 mr-1" />
                                        Aprobar
                                      </Button>
                                    ) : (
                                      <Button 
                                        variant="ghost" 
                                        size="xs" 
                                        className="h-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                                        onClick={() => handleToggleStatus(g.id)}
                                        title="Revertir aprobación"
                                      >
                                        Desaprobar
                                      </Button>
                                    )}

                                    <Badge 
                                      variant={isApproved ? "default" : "secondary"}
                                      className={`text-[10px] h-6 px-2 capitalize cursor-pointer ${
                                        isApproved 
                                          ? "bg-emerald-500 hover:bg-emerald-600 text-white" 
                                          : "bg-amber-500/10 text-amber-700 dark:text-amber-400 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-900"
                                      }`}
                                      onClick={() => handleToggleStatus(g.id)}
                                    >
                                      {isApproved ? (
                                        <span className="flex items-center gap-1 font-semibold">
                                          <CheckCircle2 className="size-3" />
                                          Aprobado
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-1 font-semibold">
                                          <Clock className="size-3" />
                                          Pendiente
                                        </span>
                                      )}
                                    </Badge>
                                  </div>
                                </div>

                                {/* Body details */}
                                <div className="text-sm text-foreground/80 pl-5 border-l-2 border-muted/30">
                                  <p className="font-medium whitespace-pre-wrap">{g.description}</p>
                                  {g.notes && (
                                    <p className="text-xs text-muted-foreground mt-2 italic bg-muted/20 p-2 rounded border border-muted/10">
                                      <strong>Nota Técnica:</strong> {g.notes}
                                    </p>
                                  )}
                                </div>

                                {/* Footer details (Branches Affected) */}
                                {g.branchesAffected && (
                                  <div className="flex flex-wrap items-center gap-1 text-xs pl-5 text-muted-foreground">
                                    <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                                    <span className="font-semibold mr-1">Alcance/Sucursales:</span>
                                    <div className="flex flex-wrap gap-1">
                                      {formatBranchesForDisplay(g.branchesAffected) === "Todas las sucursales" ? (
                                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-bold">
                                          Todas las sucursales
                                        </Badge>
                                      ) : (
                                        g.branchesAffected.split(",").map((br, idx) => (
                                          <Badge key={idx} variant="outline" className="text-[10px] bg-background/50 border-muted-foreground/15">
                                            {br.trim()}
                                          </Badge>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex items-center justify-end gap-2 pt-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                                  <Button 
                                    variant="ghost" 
                                    size="icon-xs" 
                                    onClick={() => {
                                      setSelectedCalDate(null);
                                      openEdit(g);
                                    }} 
                                    title="Editar guardia"
                                  >
                                    <Edit className="size-3.5" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon-xs" 
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10" 
                                    onClick={() => handleDelete(g.id)} 
                                    title="Eliminar registro"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Registrar/Editar Evento Especial */}
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{eventForm.id ? "Editar Evento Especial" : "Agregar Evento Especial"}</DialogTitle>
            <DialogDescription>
              {eventForm.id 
                ? "Modificá el evento especial y gestioná sus tareas." 
                : "Agregá un evento especial en el calendario y definí sus tareas."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2 pr-1 space-y-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="grid gap-2">
              <Label htmlFor="eventDate">Fecha <span className="text-red-500">*</span></Label>
              <Input
                id="eventDate"
                type="text"
                placeholder="DD/MM/AAAA"
                value={eventForm.date}
                onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="eventName">Nombre del Evento <span className="text-red-500">*</span></Label>
              <Input
                id="eventName"
                type="text"
                placeholder="Ej: ☕ MG Break Amistoso"
                value={eventForm.name}
                onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="eventType" className="font-semibold text-xs text-muted-foreground uppercase">Tipo de Evento</Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs text-primary px-2 hover:bg-muted/50"
                  onClick={() => setShowManageTypes(!showManageTypes)}
                >
                  {showManageTypes ? "✕ Cerrar" : "⚙️ Administrar Tipos"}
                </Button>
              </div>

              {showManageTypes ? (
                <div className="border border-border bg-muted/15 rounded-lg p-3 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Tipos de Eventos</span>
                  </div>
                  <div className="space-y-1 max-h-[110px] overflow-y-auto pr-1">
                    {eventTypes.map((t) => {
                      const bgMap: Record<string, string> = {
                        sky: "bg-sky-500", blue: "bg-blue-500", indigo: "bg-indigo-500", violet: "bg-violet-500",
                        purple: "bg-purple-500", fuchsia: "bg-fuchsia-500", pink: "bg-pink-500", rose: "bg-rose-500",
                        red: "bg-red-500", orange: "bg-orange-500", amber: "bg-amber-500", yellow: "bg-yellow-500",
                        lime: "bg-lime-500", emerald: "bg-emerald-500", teal: "bg-teal-500", cyan: "bg-cyan-500", gray: "bg-slate-500"
                      };
                      const isEditingColor = editingTypeColorId === t.id;
                      return (
                        <div key={t.id} className="flex flex-col gap-1.5 p-1.5 rounded-md border bg-card text-xs">
                          <div className="flex items-center justify-between">
                            <div 
                              className="flex items-center gap-2 cursor-pointer hover:opacity-80 group/dot"
                              onClick={() => setEditingTypeColorId(isEditingColor ? null : t.id)}
                              title="Click en el color para cambiarlo"
                            >
                              <span className={`w-2.5 h-2.5 rounded-full inline-block cursor-pointer hover:scale-120 transition-transform ${bgMap[t.color] || "bg-slate-500"}`} />
                              <span className="font-semibold">{t.name}</span>
                              <span className="text-[9px] text-muted-foreground opacity-0 group-hover/dot:opacity-100 transition-opacity">(Click color para cambiar)</span>
                            </div>
                            {t.id !== "break" && t.id !== "onfire" && t.id !== "promo" && t.id !== "custom" && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded"
                                onClick={() => {
                                  const next = eventTypes.filter(x => x.id !== t.id);
                                  setEventTypes(next);
                                  localStorage.setItem("techcontrol_calendar_event_types", JSON.stringify(next));
                                  if (eventForm.type === t.id) {
                                    setEventForm(prev => ({ ...prev, type: "custom" }));
                                  }
                                }}
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            )}
                          </div>

                          {isEditingColor && (
                            <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 p-1.5 bg-muted/40 rounded border border-border mt-1">
                              {(["sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose", "red", "orange", "amber", "yellow", "lime", "emerald", "teal", "cyan", "gray"] as const).map((colorName) => {
                                const isSelected = t.color === colorName;
                                return (
                                  <button
                                    key={colorName}
                                    type="button"
                                    className={`w-4 h-4 rounded-full ${bgMap[colorName]} border transition-transform cursor-pointer hover:scale-115 ${isSelected ? "border-foreground scale-110 shadow-xs" : "border-transparent"}`}
                                    onClick={() => {
                                      const next = eventTypes.map(x => x.id === t.id ? { ...x, color: colorName } : x);
                                      setEventTypes(next);
                                      localStorage.setItem("techcontrol_calendar_event_types", JSON.stringify(next));
                                      toast.success(`Color de "${t.name}" actualizado`);
                                      setEditingTypeColorId(null);
                                    }}
                                    title={colorName}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Agregar Nuevo Tipo</span>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nombre (ej: Lanzamiento)"
                        value={newTypeName}
                        onChange={(e) => setNewTypeName(e.target.value)}
                        className="h-8 text-xs flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3"
                        onClick={() => {
                          if (!newTypeName.trim()) return;
                          const newId = `type-${Date.now()}`;
                          const next = [...eventTypes, { id: newId, name: newTypeName.trim(), color: newTypeColor }];
                          setEventTypes(next);
                          localStorage.setItem("techcontrol_calendar_event_types", JSON.stringify(next));
                          setEventForm(prev => ({ ...prev, type: newId }));
                          setNewTypeName("");
                          setShowManageTypes(false);
                          toast.success("Tipo de evento agregado");
                        }}
                      >
                        Crear
                      </Button>
                    </div>

                    {/* Extended responsive 17 color circles grid */}
                    <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 p-2 bg-background rounded-lg border border-input">
                      {(["sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose", "red", "orange", "amber", "yellow", "lime", "emerald", "teal", "cyan", "gray"] as const).map((colorName) => {
                        const isSelected = newTypeColor === colorName;
                        const bgMap = {
                          sky: "bg-sky-500", blue: "bg-blue-500", indigo: "bg-indigo-500", violet: "bg-violet-500",
                          purple: "bg-purple-500", fuchsia: "bg-fuchsia-500", pink: "bg-pink-500", rose: "bg-rose-500",
                          red: "bg-red-500", orange: "bg-orange-500", amber: "bg-amber-500", yellow: "bg-yellow-500",
                          lime: "bg-lime-500", emerald: "bg-emerald-500", teal: "bg-teal-500", cyan: "bg-cyan-500", gray: "bg-slate-500"
                        };
                        return (
                          <button
                            key={colorName}
                            type="button"
                            className={`w-5.5 h-5.5 rounded-full ${bgMap[colorName]} border-2 transition-transform cursor-pointer hover:scale-110 flex items-center justify-center ${isSelected ? "border-foreground scale-110 shadow-xs" : "border-transparent"}`}
                            onClick={() => setNewTypeColor(colorName)}
                            title={colorName}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <Select
                  value={eventForm.type}
                  onValueChange={(val: any) => setEventForm({ ...eventForm, type: val })}
                >
                  <SelectTrigger id="eventType">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((t) => {
                      const bgMap: Record<string, string> = {
                        sky: "bg-sky-500", blue: "bg-blue-500", indigo: "bg-indigo-500", violet: "bg-violet-500",
                        purple: "bg-purple-500", fuchsia: "bg-fuchsia-500", pink: "bg-pink-500", rose: "bg-rose-500",
                        red: "bg-red-500", orange: "bg-orange-500", amber: "bg-amber-500", yellow: "bg-yellow-500",
                        lime: "bg-lime-500", emerald: "bg-emerald-500", teal: "bg-teal-500", cyan: "bg-cyan-500", gray: "bg-slate-500"
                      };
                      return (
                        <SelectItem key={t.id} value={t.id}>
                          <span className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full inline-block ${bgMap[t.color] || "bg-slate-500"}`} />
                            {t.name}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Tareas List */}
            <div className="space-y-3 border-t pt-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-muted-foreground uppercase">Tareas del Evento</span>
                  <span className="font-bold text-primary">
                    {eventForm.tasks.filter(t => t.completed).length}/{eventForm.tasks.length} ({eventForm.tasks.length > 0 ? Math.round((eventForm.tasks.filter(t => t.completed).length / eventForm.tasks.length) * 100) : 0}%)
                  </span>
                </div>
                {eventForm.tasks.length > 0 && (
                  <Progress 
                    value={eventForm.tasks.length > 0 ? (eventForm.tasks.filter(t => t.completed).length / eventForm.tasks.length) * 100 : 0} 
                    className="h-1.5 bg-muted-foreground/10" 
                  />
                )}
              </div>
              
              {/* Add Task Input */}
              <div className="flex gap-2">
                <Input
                  id="newTaskInput"
                  placeholder="Escribí una tarea y apretá Enter..."
                  className="h-9 text-xs flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = e.currentTarget.value.trim();
                      if (val) {
                        setEventForm(prev => ({
                          ...prev,
                          tasks: [...prev.tasks, { id: `${Date.now()}-${Math.random()}`, name: val, completed: false }]
                        }));
                        e.currentTarget.value = "";
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-9 px-3 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shrink-0"
                  onClick={() => {
                    const el = document.getElementById("newTaskInput") as HTMLInputElement;
                    const val = el?.value.trim();
                    if (val) {
                      setEventForm(prev => ({
                        ...prev,
                        tasks: [...prev.tasks, { id: `${Date.now()}-${Math.random()}`, name: val, completed: false }]
                      }));
                      el.value = "";
                    }
                  }}
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              {/* List of current Tasks */}
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                {eventForm.tasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-3 text-center bg-muted/10 rounded-md border border-dashed">
                    No hay tareas cargadas para este evento.
                  </p>
                ) : (
                  eventForm.tasks.map((task) => (
                    <div 
                      key={task.id} 
                      className="flex items-center justify-between p-2 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors shadow-xs group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={(e) => {
                            setEventForm(prev => ({
                              ...prev,
                              tasks: prev.tasks.map(t => t.id === task.id ? { ...t, completed: e.target.checked } : t)
                            }));
                          }}
                          className="h-4 w-4 rounded border-input text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                        />
                        {renamingTaskId === task.id ? (
                          <Input
                            value={renamingTaskName}
                            onChange={(e) => setRenamingTaskName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                if (renamingTaskName.trim()) {
                                  setEventForm(prev => ({
                                    ...prev,
                                    tasks: prev.tasks.map(t => t.id === task.id ? { ...t, name: renamingTaskName.trim() } : t)
                                  }));
                                }
                                setRenamingTaskId(null);
                              } else if (e.key === "Escape") {
                                setRenamingTaskId(null);
                              }
                            }}
                            onBlur={() => {
                              if (renamingTaskName.trim()) {
                                setEventForm(prev => ({
                                  ...prev,
                                  tasks: prev.tasks.map(t => t.id === task.id ? { ...t, name: renamingTaskName.trim() } : t)
                                }));
                              }
                              setRenamingTaskId(null);
                            }}
                            className="h-7 py-0 px-1.5 text-xs flex-1 font-medium"
                            autoFocus
                          />
                        ) : (
                          <span 
                            className={`text-xs truncate cursor-pointer select-none flex-1 py-0.5 ${task.completed ? "line-through text-muted-foreground font-normal" : "text-foreground font-semibold"}`}
                            onDoubleClick={() => {
                              setRenamingTaskId(task.id);
                              setRenamingTaskName(task.name);
                            }}
                            title="Doble click para renombrar"
                          >
                            {task.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {renamingTaskId !== task.id && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setRenamingTaskId(task.id);
                              setRenamingTaskName(task.name);
                            }}
                            title="Renombrar"
                          >
                            <Edit className="size-3" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded"
                          onClick={() => {
                            setEventForm(prev => ({
                              ...prev,
                              tasks: prev.tasks.filter(t => t.id !== task.id)
                            }));
                          }}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-3 flex flex-row items-center justify-end gap-2 shrink-0">
            <Button onClick={handleSaveEvent}>
              {eventForm.id ? "Guardar Cambios" : "Guardar Evento"}
            </Button>
            <Button variant="outline" onClick={() => setEventDialogOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Vista Detallada de Tareas del Evento */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[450px] max-h-[85vh] overflow-hidden flex flex-col border border-muted-foreground/10 bg-card/95 backdrop-blur-md">
          {detailEvent && (() => {
            const dynamic = getDynamicEventStyle(detailEvent.tasks);
            const completedTasks = detailEvent.tasks ? detailEvent.tasks.filter(t => t.completed).length : 0;
            const totalTasks = detailEvent.tasks ? detailEvent.tasks.length : 0;
            
            return (
              <>
                <DialogHeader className="border-b pb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-sm bg-muted text-muted-foreground border border-muted-foreground/10">
                      {formatDate(detailEvent.date)}
                    </span>
                    <Badge variant="outline" className={`text-[10px] py-0 px-2 uppercase font-semibold border-muted-foreground/20 ${
                      eventTypes.find(t => t.id === detailEvent.type) 
                        ? EVENT_COLOR_MAP[eventTypes.find(t => t.id === detailEvent.type)!.color] 
                        : "bg-background/50 text-foreground"
                    }`}>
                      {eventTypes.find(t => t.id === detailEvent.type)?.name || detailEvent.type}
                    </Badge>
                  </div>
                  <DialogTitle className="text-xl font-bold mt-2 text-foreground break-words">
                    {detailEvent.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-1">
                    Control de tareas y estado del evento.
                  </DialogDescription>
                </DialogHeader>

                {/* Progress Section */}
                <div className="py-4 border-b space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-muted-foreground">Progreso de Frentes</span>
                    <span style={{ color: dynamic.style.color }} className="font-bold">
                      {totalTasks > 0 ? `${completedTasks}/${totalTasks} (${dynamic.percent}%)` : "Sin tareas"}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300"
                      style={{ 
                        width: `${totalTasks > 0 ? dynamic.percent : 0}%`,
                        backgroundColor: dynamic.style.color
                      }}
                    />
                  </div>
                </div>

                {/* Tasks List */}
                <div className="flex-1 overflow-y-auto py-4 space-y-2.5 [scrollbar-width:thin]">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Tareas a Cumplir
                  </h4>
                  
                  {!detailEvent.tasks || detailEvent.tasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-6 text-center bg-muted/20 rounded-lg">
                      No hay tareas definidas para este evento. Hacé click en "Editar" para agregarlas.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {detailEvent.tasks.map((task) => (
                        <div 
                          key={task.id} 
                          className="flex items-center gap-3 p-3 rounded-lg border border-muted-foreground/10 bg-background/40 hover:bg-background/70 transition-colors cursor-pointer select-none"
                          onClick={() => toggleTaskInDetail(task.id, !task.completed)}
                        >
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleTaskInDetail(task.id, e.target.checked);
                            }}
                            className="h-4 w-4 rounded border-muted accent-primary cursor-pointer shrink-0"
                          />
                          <span className={`text-sm ${task.completed ? "line-through text-muted-foreground font-normal" : "text-foreground font-medium"}`}>
                            {task.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <DialogFooter className="border-t pt-4 flex items-center justify-between sm:justify-between gap-2 shrink-0">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 h-9"
                      onClick={handleDeleteFromDetail}
                    >
                      <Trash2 className="size-4 mr-1.5" />
                      Eliminar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-9"
                      onClick={handleEditFromDetail}
                    >
                      <Edit className="size-4 mr-1.5" />
                      Editar
                    </Button>
                  </div>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="h-9 px-5"
                    onClick={() => setDetailDialogOpen(false)}
                  >
                    Listo / Cerrar
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Dialog: Asignar Colaborador en Feriado */}
      <Dialog open={holidayDialogOpen} onOpenChange={setHolidayDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="size-5 text-amber-500" />
              <span>Asignar Guardia - Día Feriado</span>
            </DialogTitle>
            <DialogDescription>
              Seleccioná el colaborador que asistirá a trabajar durante este día feriado.
            </DialogDescription>
          </DialogHeader>

          {selectedHolidayDate && (() => {
            const hName = getHolidayInfo(selectedHolidayDate);
            
            return (
              <div className="grid gap-4 py-4">
                <div className="space-y-1 bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/10 rounded-lg p-3 text-sm">
                  <p className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <span>🎉</span> {hName}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium">
                    Fecha: {formatDate(selectedHolidayDate)}
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="holidayCollaborator">Colaborador Asignado</Label>
                  <Select
                    value={tempAssignedId}
                    onValueChange={setTempAssignedId}
                  >
                    <SelectTrigger id="holidayCollaborator">
                      <SelectValue placeholder="Seleccionar colaborador" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-72 duration-150 ease-out">
                      <SelectItem value="none">❌ Sin asignar / Nadie</SelectItem>
                      {guardiaCollaborators.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })()}

          <DialogFooter className="flex flex-row items-center justify-end gap-2">
            <Button onClick={async () => {
              await setHolidayAssignment(selectedHolidayDate!, tempAssignedId);
              setHolidayDialogOpen(false);
              toast.success("Asignación de feriado guardada correctamente");
            }}>
              Guardar Asignación
            </Button>
            <Button variant="outline" onClick={() => setHolidayDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: EXPORTAR PDF POR RANGO DE FECHAS
          ───────────────────────────────────────────────────────────── */}
      {(() => {
        // Guardias filtradas por rango de fechas seleccionado
        const pdfRangeGuardias = (() => {
          if (!pdfExportFiltered || !pdfExportFrom || !pdfExportTo) return [];
          return [...guardias]
            .filter(g => g.date >= pdfExportFrom && g.date <= pdfExportTo)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        })();

        // Agrupar por colaborador para mostrar en la lista previa
        const pdfColabMap: Record<string, { name: string; hours: number; count: number; avatarUrl?: string | null }> = {};
        pdfRangeGuardias.forEach(g => {
          if (!pdfColabMap[g.userId]) {
            const u = users.find(u => u.id === g.userId);
            pdfColabMap[g.userId] = { name: g.userName, hours: 0, count: 0, avatarUrl: u?.avatarUrl };
          }
          pdfColabMap[g.userId].hours += g.hours;
          pdfColabMap[g.userId].count += 1;
        });
        const pdfColabs = Object.values(pdfColabMap).sort((a, b) => b.hours - a.hours);
        const pdfTotalHours = pdfRangeGuardias.reduce((a, g) => a + g.hours, 0);

        const handleGeneratePdf = async () => {
          if (pdfRangeGuardias.length === 0) {
            toast.error("No hay guardias en el rango de fechas seleccionado");
            return;
          }
          try {
            const { exportGuardiasPdf } = await import("@/lib/exportGuardiasPdf");
            const ok = exportGuardiasPdf(pdfRangeGuardias);
            if (ok) {
              toast.success("PDF descargado correctamente");
              setPdfExportOpen(false);
            }
          } catch (err) {
            console.error("Error al exportar PDF:", err);
            toast.error("No se pudo generar el PDF");
          }
        };

        return (
          <Dialog open={pdfExportOpen} onOpenChange={(open) => {
            setPdfExportOpen(open);
            if (!open) { setPdfExportFrom(""); setPdfExportTo(""); setPdfExportFiltered(false); }
          }}>
            <DialogContent className="sm:max-w-[700px] max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden">
              {/* Header */}
              <DialogHeader className="px-6 pt-5 pb-4 border-b border-muted-foreground/10 shrink-0">
                <DialogTitle className="flex items-center gap-2.5 text-base font-bold">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileDown className="size-4 text-primary" />
                  </div>
                  <div>
                    <div>Exportar Guardias a PDF</div>
                    <p className="text-xs font-normal text-muted-foreground mt-0.5">
                      Seleccioná un rango de fechas para filtrar y descargar el reporte
                    </p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              {/* Date filter bar */}
              <div className="flex flex-col gap-3 px-6 py-4 border-b border-muted-foreground/10 shrink-0 bg-muted/20">
                {/* Quick presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground mr-1">Rápido:</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-[11px] font-semibold"
                    onClick={() => {
                      const now = new Date();
                      let baseYear = now.getFullYear();
                      let baseMonth = now.getMonth();
                      if (now.getDate() < 25) {
                        baseMonth -= 1;
                      }
                      const startDate = new Date(baseYear, baseMonth, 25);
                      const endDate = new Date(baseYear, baseMonth + 1, 24);
                      const formatIso = (d: Date) => {
                        const y = d.getFullYear();
                        const m = String(d.getMonth() + 1).padStart(2, "0");
                        const day = String(d.getDate()).padStart(2, "0");
                        return `${y}-${m}-${day}`;
                      };
                      setPdfExportFrom(formatIso(startDate));
                      setPdfExportTo(formatIso(endDate));
                      setPdfExportFiltered(true);
                    }}
                  >
                    Este mes
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-[11px] font-semibold"
                    onClick={() => {
                      const now = new Date();
                      let baseYear = now.getFullYear();
                      let baseMonth = now.getMonth() - 1;
                      if (now.getDate() < 25) {
                        baseMonth -= 1;
                      }
                      const startDate = new Date(baseYear, baseMonth, 25);
                      const endDate = new Date(baseYear, baseMonth + 1, 24);
                      const formatIso = (d: Date) => {
                        const y = d.getFullYear();
                        const m = String(d.getMonth() + 1).padStart(2, "0");
                        const day = String(d.getDate()).padStart(2, "0");
                        return `${y}-${m}-${day}`;
                      };
                      setPdfExportFrom(formatIso(startDate));
                      setPdfExportTo(formatIso(endDate));
                      setPdfExportFiltered(true);
                    }}
                  >
                    Mes anterior
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-[11px] font-semibold"
                    onClick={() => {
                      const now = new Date();
                      const past = new Date();
                      past.setDate(now.getDate() - 30);
                      const fY = past.getFullYear();
                      const fM = String(past.getMonth() + 1).padStart(2, "0");
                      const fD = String(past.getDate()).padStart(2, "0");
                      const tY = now.getFullYear();
                      const tM = String(now.getMonth() + 1).padStart(2, "0");
                      const tD = String(now.getDate()).padStart(2, "0");
                      setPdfExportFrom(`${fY}-${fM}-${fD}`);
                      setPdfExportTo(`${tY}-${tM}-${tD}`);
                      setPdfExportFiltered(true);
                    }}
                  >
                    Últimos 30 días
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row items-end gap-3 w-full">
                  {/* Fecha Desde Popover */}
                  <div className="flex-1 w-full">
                    <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Fecha desde</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "h-9 w-full justify-start text-left font-normal text-xs bg-background border-input",
                            !pdfExportFrom && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 size-3.5 text-primary shrink-0" />
                          {pdfExportFrom ? formatDate(pdfExportFrom) : "Seleccionar fecha desde..."}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarUI
                          mode="single"
                          selected={pdfExportFrom ? new Date(pdfExportFrom + "T12:00:00") : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const y = date.getFullYear();
                              const m = String(date.getMonth() + 1).padStart(2, "0");
                              const d = String(date.getDate()).padStart(2, "0");
                              setPdfExportFrom(`${y}-${m}-${d}`);
                              setPdfExportFiltered(false);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Fecha Hasta Popover */}
                  <div className="flex-1 w-full">
                    <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Fecha hasta</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "h-9 w-full justify-start text-left font-normal text-xs bg-background border-input",
                            !pdfExportTo && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 size-3.5 text-primary shrink-0" />
                          {pdfExportTo ? formatDate(pdfExportTo) : "Seleccionar fecha hasta..."}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarUI
                          mode="single"
                          selected={pdfExportTo ? new Date(pdfExportTo + "T12:00:00") : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const y = date.getFullYear();
                              const m = String(date.getMonth() + 1).padStart(2, "0");
                              const d = String(date.getDate()).padStart(2, "0");
                              setPdfExportTo(`${y}-${m}-${d}`);
                              setPdfExportFiltered(false);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    className="h-9 px-5 text-xs shrink-0 w-full sm:w-auto font-semibold"
                    disabled={!pdfExportFrom || !pdfExportTo || pdfExportFrom > pdfExportTo}
                    onClick={() => setPdfExportFiltered(true)}
                  >
                    <Filter className="size-3.5 mr-1.5" />
                    Filtrar
                  </Button>
                </div>
              </div>

              {/* Results body */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {!pdfExportFiltered ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                    <div className="size-14 rounded-full bg-muted flex items-center justify-center">
                      <Calendar className="size-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">Seleccioná un rango de fechas</p>
                      <p className="text-xs text-muted-foreground mt-1">Ingresá la fecha desde y hasta, luego hacé click en <strong>Filtrar</strong> para ver las guardias disponibles.</p>
                    </div>
                  </div>
                ) : pdfRangeGuardias.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                    <div className="size-14 rounded-full bg-muted flex items-center justify-center">
                      <FileText className="size-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">Sin resultados</p>
                      <p className="text-xs text-muted-foreground mt-1">No se encontraron guardias en el rango seleccionado. Probá con otras fechas.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary chips */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 rounded-md px-2.5 h-7">
                        <FileText className="size-3" />
                        {pdfRangeGuardias.length} guardia{pdfRangeGuardias.length !== 1 ? "s" : ""}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-muted border border-muted-foreground/15 rounded-md px-2.5 h-7 text-muted-foreground">
                        <Clock className="size-3 text-primary" />
                        {pdfTotalHours.toFixed(1)} hs totales
                      </span>
                      {pdfColabs.map(c => (
                        <div key={c.name} className="flex items-center gap-1.5 text-[11px] font-semibold bg-background border border-muted-foreground/15 rounded-full px-2.5 h-7">
                          <div className="size-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-[8px] font-black shrink-0">
                            {getInitials(c.name)}
                          </div>
                          <span className="text-foreground">{c.name.split(" ")[0]}</span>
                          <span className="text-primary font-bold">{c.hours.toFixed(1)} hs</span>
                          <span className="text-muted-foreground">({c.count})</span>
                        </div>
                      ))}
                    </div>

                    {/* Guardias list */}
                    <div className="rounded-xl border border-muted-foreground/10 bg-card/50 overflow-hidden">
                      <div className="divide-y divide-muted-foreground/8">
                        {pdfRangeGuardias.map(g => {
                          const isApproved = g.status === "approved";
                          return (
                            <div
                              key={g.id}
                              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`size-1.5 rounded-full shrink-0 ${isApproved ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                                <CollaboratorAvatar userName={g.userName} avatarUrl={users.find(u => u.id === g.userId)?.avatarUrl} />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-foreground truncate">{g.userName}</p>
                                  <p className="text-[10px] text-muted-foreground truncate max-w-[260px]">{g.description}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-auto">
                                <span className="text-[11px] text-muted-foreground font-medium">{formatDate(g.date)}</span>
                                <span className="text-[10px] text-muted-foreground">{g.startTime}–{g.endTime}</span>
                                <span className="text-[11px] font-bold bg-primary/10 text-primary border border-primary/15 rounded px-1.5 py-0.5">{g.hours}h</span>
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] py-0 px-1.5 h-5 font-bold ${
                                    isApproved
                                      ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/8"
                                      : "border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/8"
                                  }`}
                                >
                                  {isApproved ? "Aprobada" : "Pendiente"}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <DialogFooter className="px-6 py-3 border-t border-muted-foreground/10 shrink-0 bg-muted/10">
                <div className="flex items-center justify-between w-full gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    {pdfExportFiltered && pdfRangeGuardias.length > 0
                      ? `${pdfRangeGuardias.length} guardia${pdfRangeGuardias.length !== 1 ? "s" : ""} · ${pdfTotalHours.toFixed(1)} hs totales listas para exportar`
                      : "Filtrá por fechas para ver los registros disponibles"}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-8 px-5"
                      disabled={!pdfExportFiltered || pdfRangeGuardias.length === 0}
                      onClick={handleGeneratePdf}
                    >
                      <FileDown className="size-3.5 mr-1.5" />
                      Descargar PDF
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 px-4" onClick={() => setPdfExportOpen(false)}>Cancelar</Button>
                  </div>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: HISTORIAL DE GUARDIAS
          ───────────────────────────────────────────────────────────── */}
      <Dialog open={historialOpen} onOpenChange={(open) => {
        setHistorialOpen(open);
        if (!open) { setHistorialSearch(""); setHistorialUserFilter("all"); }
      }}>
        <DialogContent className="sm:max-w-[820px] max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-muted-foreground/10 shrink-0">
            <DialogTitle className="flex items-center gap-2.5 text-base font-bold">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <History className="size-4 text-primary" />
              </div>
              <div>
                <div>Historial de Guardias</div>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  Todos los registros anteriores al período activo · Organizado por cierre mensual
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Filters bar */}
          <div className="flex flex-col sm:flex-row gap-2 px-6 py-3 border-b border-muted-foreground/10 shrink-0 bg-muted/20">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar en el historial..."
                value={historialSearch}
                onChange={e => setHistorialSearch(e.target.value)}
                className="w-full pl-8 pr-3 h-8 text-xs rounded-md border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <Select value={historialUserFilter} onValueChange={setHistorialUserFilter}>
              <SelectTrigger className="h-8 w-full sm:w-[190px] text-xs">
                <SelectValue placeholder="Todos los colaboradores" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-72 duration-150 ease-out">
                <SelectItem value="all">Todos los colaboradores</SelectItem>
                {guardiaCollaborators.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Global summary chips */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-muted border border-muted-foreground/15 rounded-md px-2 h-8 text-muted-foreground">
                <Clock className="size-3 text-primary" />
                {historicalGuardias.reduce((a, g) => a + g.hours, 0).toFixed(1)} hs totales
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-muted border border-muted-foreground/15 rounded-md px-2 h-8 text-muted-foreground">
                <FileText className="size-3 text-primary" />
                {historicalGuardias.length} guardias
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {historialByPeriod.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <div className="size-14 rounded-full bg-muted flex items-center justify-center">
                  <History className="size-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">Sin historial</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {historialSearch || historialUserFilter !== "all"
                      ? "No hay resultados con los filtros seleccionados."
                      : "No hay guardias de períodos anteriores registradas aún."}
                  </p>
                </div>
              </div>
            ) : (
              historialByPeriod.map(period => {
                const periodHours = period.guardias.reduce((a, g) => a + g.hours, 0);
                const approvedCount = period.guardias.filter(g => g.status === "approved").length;
                const pendingCount = period.guardias.filter(g => g.status === "pending_approval").length;

                // Breakdown por colaborador
                const colabMap: Record<string, { name: string; hours: number; count: number; approved: number }> = {};
                period.guardias.forEach(g => {
                  if (!colabMap[g.userId]) colabMap[g.userId] = { name: g.userName, hours: 0, count: 0, approved: 0 };
                  colabMap[g.userId].hours += g.hours;
                  colabMap[g.userId].count += 1;
                  if (g.status === "approved") colabMap[g.userId].approved += 1;
                });
                const colabs = Object.values(colabMap).sort((a, b) => b.hours - a.hours);

                return (
                  <div key={period.sortKey} className="rounded-xl border border-muted-foreground/10 bg-card/50 overflow-hidden">
                    {/* Period header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-muted/30 border-b border-muted-foreground/10">
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
                          <Calendar className="size-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-foreground">
                            Período: {period.label} <span className="text-xs font-normal text-muted-foreground ml-1.5">({period.dateRange})</span>
                          </p>
                          <p className="text-[10px] text-muted-foreground font-medium">
                            {period.guardias.length} guardia{period.guardias.length !== 1 ? "s" : ""} · Corte el 24 (23:59hs)
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 ml-2.5 print:hidden">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[10px] font-semibold gap-1 border-primary/20 hover:border-primary/45 hover:bg-primary/5"
                            onClick={() => handleDownloadPeriodPdf(period.guardias)}
                            title="Descargar reporte PDF de este período"
                          >
                            <FileDown className="size-3 text-primary" />
                            <span>Descargar PDF</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[10px] font-semibold gap-1 border-muted-foreground/20 hover:border-foreground/40 hover:bg-muted/50"
                            onClick={() => handlePrint(period.guardias)}
                            title="Abrir vista previa de impresión del reporte PDF"
                          >
                            <Printer className="size-3 text-muted-foreground" />
                            <span>Imprimir</span>
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-xs font-bold bg-primary/10 text-primary border border-primary/20 rounded-md px-2.5 py-1">
                          <Clock className="size-3" />
                          {periodHours.toFixed(1)} hs
                        </span>
                        {approvedCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-md px-2 py-1">
                            <CheckCircle2 className="size-3" />
                            {approvedCount} aprobada{approvedCount !== 1 ? "s" : ""}
                          </span>
                        )}
                        {pendingCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-md px-2 py-1">
                            <AlertCircle className="size-3" />
                            {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Collaborator breakdown */}
                    {colabs.length > 0 && (
                      <div className="px-4 py-2.5 border-b border-muted-foreground/8 bg-muted/10 flex flex-wrap items-center justify-center gap-2">
                        {colabs.map(c => (
                          <div key={c.name} className="flex items-center gap-1.5 text-[11px] font-semibold bg-background border border-muted-foreground/15 rounded-full px-2.5 py-1">
                            <div className="size-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-[8px] font-black shrink-0">
                              {getInitials(c.name)}
                            </div>
                            <span className="text-foreground">{c.name.split(" ")[0]}</span>
                            <span className="text-primary font-bold">{c.hours.toFixed(1)} hs</span>
                            <span className="text-muted-foreground">({c.count})</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Guardias list */}
                    <div className="divide-y divide-muted-foreground/8">
                      {period.guardias.map(g => {
                        const isApproved = g.status === "approved";
                        return (
                          <div
                            key={g.id}
                            className="group flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5 hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() => openEdit(g)}
                            title="Hacé click para editar esta guardia"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`size-1.5 rounded-full shrink-0 ${isApproved ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                              <CollaboratorAvatar userName={g.userName} avatarUrl={users.find(u => u.id === g.userId)?.avatarUrl} />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">{g.userName}</p>
                                <p className="text-[10px] text-muted-foreground truncate max-w-[260px]">{g.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-auto">
                              <span className="text-[11px] text-muted-foreground font-medium">{formatDate(g.date)}</span>
                              <span className="text-[10px] text-muted-foreground">{g.startTime}–{g.endTime}</span>
                              <span className="text-[11px] font-bold bg-primary/10 text-primary border border-primary/15 rounded px-1.5 py-0.5">{g.hours}h</span>
                              <Badge
                                variant="outline"
                                className={`text-[9px] py-0 px-1.5 h-5 font-bold cursor-pointer select-none transition-all hover:bg-emerald-500/20 active:scale-95 ${isApproved
                                  ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/8 hover:bg-emerald-500/20"
                                  : "border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/8 hover:bg-amber-500/20"
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleStatus(g.id);
                                }}
                                title="Click para cambiar el estado"
                              >
                                {isApproved ? "Aprobada" : "Pendiente"}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-3 border-t border-muted-foreground/10 shrink-0 bg-muted/10">
            <div className="flex items-center justify-between w-full gap-2">
              <p className="text-[11px] text-muted-foreground">
                {historialByPeriod.length} período{historialByPeriod.length !== 1 ? "s" : ""} archivado{historialByPeriod.length !== 1 ? "s" : ""}
                {" · "} período activo: <strong className="text-foreground">{activePeriod.label}</strong>
              </p>
              <Button size="sm" className="h-8 px-5" onClick={() => setHistorialOpen(false)}>
                Cerrar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent size="sm" className="border-destructive/20">
          <AlertDialogHeader>
            <div className="mx-auto mb-1 flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 className="size-6" />
            </div>
            <AlertDialogTitle className="text-center text-base font-bold">
              Eliminar registro de guardia
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm">
              Esta acción no se puede deshacer. El registro será eliminado permanentemente del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:justify-center">
            <AlertDialogAction
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={confirmDelete}
            >
              <Trash2 className="size-4 mr-1.5" />
              Eliminar
            </AlertDialogAction>
            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
