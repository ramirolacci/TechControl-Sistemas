import { useState, useMemo, useEffect, useRef } from "react";
import { 
  Plus, Search, Clock, Calendar, User, Users, Layers,
  Wrench, Network, Database, ShieldAlert, Code, FileText, 
  CheckCircle2, Trophy, Edit
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useApp } from "@/context/AppContext";
import { EmptyState } from "@/components/shared/EmptyState";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils-app";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { es } from "date-fns/locale";
import type { OfficeTicketCategory } from "@/types";

const CATEGORIES: { id: OfficeTicketCategory; label: string; icon: any; color: string; activeColor: string; iconColor: string }[] = [
  { id: "soporte", label: "Soporte", icon: Wrench, color: "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20", activeColor: "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-sm", iconColor: "text-blue-500" },
  { id: "redes", label: "Redes", icon: Network, color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20", activeColor: "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-sm", iconColor: "text-emerald-500" },
  { id: "servidores", label: "Servidores", icon: Database, color: "bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/20", activeColor: "bg-purple-600 text-white border-purple-600 hover:bg-purple-700 shadow-sm", iconColor: "text-purple-500" },
  { id: "mantenimiento", label: "Mantenimiento", icon: ShieldAlert, color: "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20", activeColor: "bg-amber-600 text-white border-amber-600 hover:bg-amber-700 shadow-sm", iconColor: "text-amber-500" },
  { id: "desarrollo", label: "Desarrollo", icon: Code, color: "bg-pink-500/10 text-pink-500 border-pink-500/20 hover:bg-pink-500/20", activeColor: "bg-pink-600 text-white border-pink-600 hover:bg-pink-700 shadow-sm", iconColor: "text-pink-500" },
  { id: "otro", label: "Otro", icon: FileText, color: "bg-slate-500/10 text-slate-500 border-slate-500/20 hover:bg-slate-500/20", activeColor: "bg-slate-600 text-white border-slate-600 hover:bg-slate-700 shadow-sm", iconColor: "text-slate-400" }
];

const DURATIONS = [5, 10, 15, 30, 45, 60, 120];

const getWeekRangeLabel = (dateStr: string) => {
  if (!dateStr) return "Fecha Desconocida";
  let parsedDateStr = dateStr;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    parsedDateStr = dateStr + "T12:00:00";
  }
  const date = new Date(parsedDateStr);
  if (isNaN(date.getTime())) return "Fecha Desconocida";

  // Calculate Monday and Sunday of this date's week
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const mondayDay = monday.getDate();
  const sundayDay = sunday.getDate();

  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const mondayMonth = months[monday.getMonth()];
  const sundayMonth = months[sunday.getMonth()];

  if (monday.getMonth() === sunday.getMonth()) {
    return `Semana del ${mondayDay} al ${sundayDay} de ${mondayMonth}`;
  } else {
    return `Semana del ${mondayDay} de ${mondayMonth} al ${sundayDay} de ${sundayMonth}`;
  }
};

const getDayOfWeekLabel = (dateStr: string) => {
  if (!dateStr) return "";
  let parsedDateStr = dateStr;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    parsedDateStr = dateStr + "T12:00:00";
  }
  const date = new Date(parsedDateStr);
  if (isNaN(date.getTime())) return "";
  const formatter = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" });
  const formatted = formatter.format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const getShortId = (id: any): string => {
  if (id === null || id === undefined) return "N/A";
  const idStr = String(id);
  if (idStr.includes("-")) {
    const parts = idStr.split("-");
    if (/^\d{10,13}$/.test(parts[0])) {
      return (parts[1] || parts[0]).toUpperCase();
    }
    return parts[0].toUpperCase();
  }
  return idStr.slice(-6).toUpperCase();
};

export function OfficeTicketsPage() {
  const { officeTickets, addOfficeTicket, updateOfficeTicket, users } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter users from context that belong to systems (or fallbacks)
  const systemsUsers = useMemo(() => {
    const allowed = ["Facundo Carrizo", "Ramiro Lacci", "Gustavo Gonzalez"];
    const filtered = users.filter(u => allowed.includes(u.fullName));
    return filtered.length > 0 ? filtered : [
      { id: "facundo", fullName: "Facundo Carrizo" },
      { id: "ramiro", fullName: "Ramiro Lacci" },
      { id: "gustavo", fullName: "Gustavo Gonzalez" }
    ];
  }, [users]);

  // Form states
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Edit states
  const [editingTicket, setEditingTicket] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState<any>("soporte");
  const [editCustomCategory, setEditCustomCategory] = useState("");
  const [editDuration, setEditDuration] = useState(15);
  const [editSelectedDate, setEditSelectedDate] = useState<Date>(new Date());

  const handleOpenEdit = (ticket: any) => {
    setEditingTicket(ticket);
    setEditTitle(ticket.title);
    setEditCategory(ticket.category);
    setEditCustomCategory(ticket.customCategory || "");
    setEditDuration(ticket.durationMinutes);
    if (ticket.date) {
      const [y, m, d] = ticket.date.split("-").map(Number);
      setEditSelectedDate(new Date(y, m - 1, d));
    } else {
      setEditSelectedDate(new Date());
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTicket) return;
    if (!editTitle.trim()) {
      toast.error("Por favor, ingresá un título de la tarea");
      return;
    }
    if (editCategory === "otro" && !editCustomCategory.trim()) {
      toast.error("Por favor, especificá la categoría personalizada");
      return;
    }

    try {
      const y = editSelectedDate.getFullYear();
      const m = String(editSelectedDate.getMonth() + 1).padStart(2, '0');
      const d = String(editSelectedDate.getDate()).padStart(2, '0');
      const editDateStr = `${y}-${m}-${d}`;

      await updateOfficeTicket(editingTicket.id, {
        title: editTitle.trim(),
        category: editCategory,
        customCategory: editCategory === "otro" && editCustomCategory.trim() ? editCustomCategory.trim() : undefined,
        date: editDateStr,
        durationMinutes: editDuration
      });
      toast.success("Tarea actualizada correctamente");
      setEditingTicket(null);
    } catch (err) {
      toast.error("Error al actualizar la tarea");
    }
  };

  const [category, setCategory] = useState<OfficeTicketCategory | null>(null);
  const [customCategory, setCustomCategory] = useState("");
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  
  const date = useMemo(() => {
    if (!selectedDate) return "";
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [selectedDate]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUser, setFilterUser] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  // Clock state
  const [currentTime, setCurrentTime] = useState(() => new Date());

  // Auto-focus title and start clock timer on mount
  useEffect(() => {
    inputRef.current?.focus();

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Save selected technician to localStorage when changed
  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    localStorage.setItem("techcontrol_last_ticket_user", user.id);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      toast.error("Por favor, seleccioná quién realizó la tarea");
      return;
    }
    if (!category) {
      toast.error("Por favor, seleccioná una categoría");
      return;
    }
    if (!title.trim()) {
      toast.error("Por favor, ingresá un título de la tarea");
      return;
    }
    if (!duration) {
      toast.error("Por favor, seleccioná la duración de la tarea");
      return;
    }
    if (category === "otro" && !customCategory.trim()) {
      toast.error("Por favor, especificá la categoría personalizada");
      return;
    }

    try {
      await addOfficeTicket({
        title: title.trim(),
        description: "",
        category,
        customCategory: category === "otro" && customCategory.trim() ? customCategory.trim() : undefined,
        userId: selectedUser.id,
        userName: selectedUser.fullName,
        date,
        durationMinutes: duration
      });
      toast.success("Tarea registrada correctamente");
      // Reset form states and keep focus
      setTitle("");
      setCustomCategory("");
      setSelectedUser(null);
      setCategory(null);
      setDuration(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } catch (err: any) {
      toast.error("Error al registrar la tarea");
    }
  };

  // Statistics for Today
  const stats = useMemo(() => {
    const todayStr = (() => {
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    })();

    const todayTickets = officeTickets.filter(t => t.date === todayStr);
    const totalMinutes = todayTickets.reduce((acc, t) => acc + t.durationMinutes, 0);
    const totalHours = (totalMinutes / 60).toFixed(1);

    // Collective Daily Goal: 10 tasks
    const dailyGoal = 10;
    const goalProgressPercent = Math.min(100, Math.round((todayTickets.length / dailyGoal) * 100));

    // Find MVP of the Day (technician with the most tasks today)
    const userCounts = todayTickets.reduce((acc: any, t) => {
      acc[t.userName] = (acc[t.userName] || 0) + 1;
      return acc;
    }, {});
    
    let mvpName = "Nadie aún";
    let mvpCount = 0;
    Object.keys(userCounts).forEach(user => {
      if (userCounts[user] > mvpCount) {
        mvpCount = userCounts[user];
        mvpName = user;
      }
    });

    return {
      count: todayTickets.length,
      hours: totalHours,
      dailyGoal,
      goalProgressPercent,
      mvpName,
      mvpCount
    };
  }, [officeTickets]);

  // Filtered tickets list
  const filteredTickets = useMemo(() => {
    return officeTickets
      .filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          t.userName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesUser = filterUser === "all" || t.userId === filterUser;
        const matchesCategory = filterCategory === "all" || t.category === filterCategory;
        return matchesSearch && matchesUser && matchesCategory;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [officeTickets, searchQuery, filterUser, filterCategory]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      {/* Header and Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Registro de Tareas de Oficina
          </h1>
          <p className="text-muted-foreground text-sm">
            Registrá de forma rápida y sencilla las tareas cotidianas que realizás en Sistemas.
          </p>
        </div>
      </div>

      {/* Mini Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500/5 to-indigo-500/10 border-indigo-500/20 shadow-sm">
          <CardContent className="flex items-center gap-4 py-4 px-5">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Tareas hoy</p>
              <h3 className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{stats.count}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20 shadow-sm">
          <CardContent className="flex items-center gap-2 sm:gap-4 py-3 sm:py-4 px-3 sm:px-5">
            <div className="p-1.5 sm:p-2 bg-emerald-500/10 rounded-lg text-emerald-500 shrink-0">
              <Clock className="size-5 sm:size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground font-semibold uppercase tracking-wider truncate">Hora de Oficina</p>
              <h3 className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-emerald-700 dark:text-emerald-400 leading-tight">
                {currentTime.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </h3>
              <p className="text-[10px] sm:text-[11px] font-medium text-emerald-600/85 dark:text-emerald-500/85 truncate mt-0.5 capitalize">
                {currentTime.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1 bg-gradient-to-br from-amber-500/5 to-amber-500/15 border-amber-500/20 shadow-sm">
          <CardContent className="flex items-center gap-4 py-4 px-5">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
              <Trophy className="size-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">MVP del Día</p>
              <h3 className="text-lg font-bold text-amber-700 dark:text-amber-400 truncate flex items-center gap-1">
                {stats.mvpCount > 0 ? (
                  <>
                    <span className="truncate">{stats.mvpName}</span>
                    <span className="shrink-0 text-xs font-semibold text-amber-600 dark:text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                      {stats.mvpCount} {stats.mvpCount === 1 ? 'tarea' : 'tareas'}
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-medium text-muted-foreground">Nadie aún 👑</span>
                )}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Creation Panel */}
        <div className="space-y-6">
          {/* Form */}
          <Card className="border border-muted-foreground/15 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Nueva Tarea</CardTitle>
              <CardDescription>Cargá los detalles de la tarea realizada de forma ultra rápida.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* User selection */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">¿Quién realizó la tarea?</label>
                  <div className="flex flex-wrap gap-2">
                    {systemsUsers.map((u) => {
                      const isSelected = selectedUser?.id === u.id;
                      return (
                        <Button
                          key={u.id}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          className={`flex items-center gap-2 rounded-xl transition-all ${
                            isSelected 
                              ? "bg-primary text-primary-foreground shadow-md font-bold" 
                              : "hover:bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                          onClick={() => handleSelectUser(u as any)}
                        >
                          <User className="size-3.5" />
                          <span className="text-xs">{u.fullName}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Category selection */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categoría</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = category === cat.id;
                      return (
                        <Button
                          key={cat.id}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          className={`flex items-center justify-start gap-2 h-10 px-3 rounded-xl border border-border/80 transition-all ${
                            isSelected 
                              ? "bg-primary text-primary-foreground shadow-md font-bold" 
                              : "hover:bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                          onClick={() => setCategory(cat.id)}
                        >
                          <Icon className="size-4 shrink-0" />
                          <span className="text-xs">{cat.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                  {category === "otro" && (
                    <div className="pt-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      <Input
                        placeholder="Especificá otra categoría (ej. Telefonía, Backup Cloud...)"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        className="h-9 rounded-xl border-border/80 focus-visible:ring-indigo-500 text-xs bg-muted/20"
                        required
                      />
                    </div>
                  )}
                </div>

                {/* Title Input */}
                <div className="space-y-2">
                  <label htmlFor="ticket-title" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">¿Qué hiciste? (Título)</label>
                  <Input
                    id="ticket-title"
                    ref={inputRef}
                    placeholder="Ej. Cambio de tóner en administración"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="h-11 rounded-xl border-border/80 focus-visible:ring-indigo-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Date selection */}
                  <div className="space-y-2 flex flex-col">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start text-left font-normal h-11 rounded-xl border-border/80 focus-visible:ring-indigo-500 pr-10 relative bg-background"
                        >
                          <span className="text-sm font-medium">
                            {selectedDate ? formatDate(date) : "Seleccionar fecha"}
                          </span>
                          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                        <CalendarUI
                          mode="single"
                          selected={selectedDate}
                          onSelect={(d) => d && setSelectedDate(d)}
                          initialFocus
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Duration selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duración</label>
                    <div className="flex flex-wrap gap-1.5">
                      {DURATIONS.map((dur) => {
                        const isSelected = duration === dur;
                        const label = dur >= 60 ? `${dur / 60}h` : `${dur}m`;
                        return (
                          <Button
                            key={dur}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            className={`h-8 px-2.5 rounded-lg text-xs font-medium border-border/80 ${
                              isSelected 
                                ? "bg-primary text-primary-foreground font-bold shadow-xs" 
                                : "hover:bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                            onClick={() => setDuration(dur)}
                          >
                            {label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-fit px-6 h-11 rounded-xl shadow-md font-bold transition-all gap-2 mt-2">
                  <Plus className="size-4" />
                  Registrar Tarea de Oficina
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* List of Recent Tickets */}
        <div className="space-y-6">
          <Card className="border border-muted-foreground/15 shadow-sm h-full flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Tareas Recientes</CardTitle>
              <CardDescription>Historial de tareas cargadas en el sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col">
              {/* Search & Filters */}
              <div className="space-y-2.5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar tarea, persona..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 rounded-xl border-border/80 focus-visible:ring-indigo-500 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Select value={filterUser} onValueChange={setFilterUser}>
                    <SelectTrigger className="w-full h-8 rounded-lg border-border/80 text-xs cursor-pointer">
                      <SelectValue placeholder="Todos los técnicos" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-72 duration-150 ease-out">
                      <SelectItem value="all" className="cursor-pointer">
                        <span className="flex items-center gap-2">
                          <Users className="size-3.5 text-muted-foreground shrink-0" />
                          <span>Todos los técnicos</span>
                        </span>
                      </SelectItem>
                      {systemsUsers.map(u => (
                        <SelectItem key={u.id} value={u.id} className="cursor-pointer">
                          <span className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-indigo-500 shrink-0" />
                            <span>{u.fullName}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-full h-8 rounded-lg border-border/80 text-xs cursor-pointer">
                      <SelectValue placeholder="Todas las categorías" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-72 duration-150 ease-out">
                      <SelectItem value="all" className="cursor-pointer">
                        <span className="flex items-center gap-2">
                          <Layers className="size-3.5 text-muted-foreground shrink-0" />
                          <span>Todas las categorías</span>
                        </span>
                      </SelectItem>
                      {CATEGORIES.map(c => {
                        const CatIcon = c.icon;
                        let iconColor = "text-blue-500";
                        if (c.id === "redes") iconColor = "text-emerald-500";
                        if (c.id === "servidores") iconColor = "text-purple-500";
                        if (c.id === "mantenimiento") iconColor = "text-amber-500";
                        if (c.id === "desarrollo") iconColor = "text-pink-500";
                        if (c.id === "otro") iconColor = "text-slate-400";
                        return (
                          <SelectItem key={c.id} value={c.id} className="cursor-pointer">
                            <span className="flex items-center gap-2">
                              <CatIcon className={`size-3.5 ${iconColor} shrink-0`} />
                              <span>{c.label}</span>
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Tickets List */}
              <div className="space-y-4 overflow-y-auto max-h-[580px] flex-1 pr-1">
                {filteredTickets.length === 0 ? (
                  <EmptyState 
                    icon={FileText} 
                    title="No se encontraron tareas" 
                    description="Registrá una tarea nueva o modificá los filtros de búsqueda." 
                    className="py-12"
                  />
                ) : (
                  (() => {
                    let lastWeekLabel = "";
                    let lastDayLabel = "";
                    return filteredTickets.map((t) => {
                      const config = CATEGORIES.find(c => c.id === t.category) || CATEGORIES[5];
                      const Icon = config.icon;
                      // Format date
                      const displayDate = formatDate(t.date);
                      const currentWeekLabel = getWeekRangeLabel(t.date);
                      const currentDayLabel = getDayOfWeekLabel(t.date);
                      const showWeekSeparator = currentWeekLabel !== lastWeekLabel;
                      const showDaySeparator = currentDayLabel !== lastDayLabel || showWeekSeparator;
                      
                      if (showWeekSeparator) {
                        lastWeekLabel = currentWeekLabel;
                      }
                      if (showDaySeparator) {
                        lastDayLabel = currentDayLabel;
                      }

                      return (
                        <div key={t.id} className="flex flex-col gap-2">
                          {showWeekSeparator && (
                            <div className="pt-3 pb-1 flex items-center gap-3">
                              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/25">
                                {currentWeekLabel}
                              </span>
                              <div className="h-[1px] bg-indigo-500/25 dark:bg-indigo-500/15 flex-1" />
                            </div>
                          )}
                          {showDaySeparator && (
                            <div className="pl-1 pt-1.5 pb-0.5 flex items-center gap-2">
                              <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded capitalize">
                                {currentDayLabel}
                              </span>
                              <div className="h-[1px] bg-muted-foreground/10 flex-1 border-dashed border-t" />
                            </div>
                          )}
                          <div 
                            className="group relative border-2 border-neutral-200 dark:border-neutral-800 rounded-xl p-4 bg-card hover:bg-muted/30 hover:border-indigo-500/50 transition-all flex flex-col gap-2 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="font-semibold text-xs text-foreground truncate" title={t.title}>{t.title}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 rounded-lg text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleOpenEdit(t)}
                              >
                                <Edit className="size-3.5" />
                              </Button>
                            </div>

                            {t.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-2 pr-4">{t.description}</p>
                            )}

                            <div className="flex items-center justify-between gap-2 mt-1">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Badge className={`px-2 py-0 h-5 text-[10px] uppercase font-bold tracking-wide rounded-md border ${config.color}`}>
                                    <Icon className="size-2.5 mr-1" />
                                    {t.customCategory || config.label}
                                  </Badge>
                                  <Badge variant="outline" className="px-2 py-0 h-5 text-[10px] text-muted-foreground font-medium rounded-md border-border/80 flex items-center gap-1">
                                    <Clock className="size-2.5" />
                                    {t.durationMinutes >= 60 ? `${t.durationMinutes / 60}h` : `${t.durationMinutes}m`}
                                  </Badge>
                                </div>
                                <span className="text-[9px] font-mono font-bold text-muted-foreground/50 tracking-wider pl-0.5">
                                  ID: #{getShortId(t.id)}
                                </span>
                              </div>
                              <div className="text-[10px] text-muted-foreground font-medium text-right">
                                <span className="font-bold text-foreground block">{t.userName}</span>
                                <span>{displayDate}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!editingTicket} onOpenChange={(open) => !open && setEditingTicket(null)}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl p-5 border border-muted-foreground/15 no-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Editar Tarea
              {editingTicket && (
                <span className="text-xs font-mono font-bold text-muted-foreground bg-muted border border-border/60 px-1.5 py-0.5 rounded uppercase">
                  #{getShortId(editingTicket.id)}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>Modificá los detalles de la tarea registrada.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Título de la tarea</label>
              <Input
                placeholder="¿Qué tarea realizaste?"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
                className="h-10 rounded-xl border-border/80 focus-visible:ring-neutral-400 font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Categoría</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => {
                  const isSelected = editCategory === c.id;
                  const CatIcon = c.icon;
                  return (
                    <Button
                      key={c.id}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      className={`h-8 px-2.5 text-[11px] font-semibold rounded-lg transition-all ${
                        isSelected
                          ? `${c.activeColor} font-bold`
                          : "text-muted-foreground border-border/80 hover:text-foreground hover:bg-muted"
                      }`}
                      onClick={() => setEditCategory(c.id)}
                    >
                      <CatIcon className={`size-3 mr-1 ${isSelected ? "text-white" : c.iconColor}`} />
                      {c.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {editCategory === "otro" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categoría personalizada</label>
                <Input
                  placeholder="Especificá la categoría (ej. Limpieza, Café)"
                  value={editCustomCategory}
                  onChange={(e) => setEditCustomCategory(e.target.value)}
                  required
                  className="h-10 rounded-xl border-border/80 focus-visible:ring-neutral-400 text-xs font-medium"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start text-left font-normal h-10 rounded-xl border-border/80 focus-visible:ring-neutral-400 pr-10 relative bg-background text-xs"
                    >
                      <span className="font-medium">
                        {editSelectedDate ? formatDate(
                          `${editSelectedDate.getFullYear()}-${String(editSelectedDate.getMonth() + 1).padStart(2, '0')}-${String(editSelectedDate.getDate()).padStart(2, '0')}`
                        ) : "Seleccionar fecha"}
                      </span>
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                    <CalendarUI
                      mode="single"
                      selected={editSelectedDate}
                      onSelect={(d) => d && setEditSelectedDate(d)}
                      initialFocus
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duración</label>
                <div className="flex flex-wrap gap-1">
                  {DURATIONS.map((dur) => {
                    const isSelected = editDuration === dur;
                    const label = dur >= 60 ? `${dur / 60}h` : `${dur}m`;
                    return (
                      <Button
                        key={dur}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        className={`h-7 px-1.5 text-[10px] font-semibold rounded-md ${
                          isSelected
                            ? "bg-white text-black font-bold border-white hover:bg-white/90 shadow-xs"
                            : "text-muted-foreground border-border/80 hover:text-foreground hover:bg-muted"
                        }`}
                        onClick={() => setEditDuration(dur)}
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 flex flex-row items-center justify-end gap-2">
              <Button type="submit" className="rounded-xl h-10 px-5 bg-white text-black hover:bg-white/90 font-bold text-xs shadow-md border border-white/20">
                Guardar cambios
              </Button>
              <Button type="button" variant="outline" className="rounded-xl h-10 text-xs" onClick={() => setEditingTicket(null)}>
                Cancelar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
