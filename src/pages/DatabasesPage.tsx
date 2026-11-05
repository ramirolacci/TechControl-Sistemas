import { useState, useMemo } from "react";
import { 
  Plus, Search, Copy, Eye, EyeOff, Trash2, Edit, Database, 
  Server, Shield, ExternalLink
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useApp } from "@/context/AppContext";
import { EmptyState } from "@/components/shared/EmptyState";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import type { DatabaseCredential } from "@/types";

const ENGINES = [
  { id: "postgres", label: "PostgreSQL", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", dotClass: "bg-blue-500" },
  { id: "mysql", label: "MySQL", color: "bg-orange-500/10 text-orange-500 border-orange-500/20", dotClass: "bg-orange-500" },
  { id: "sqlserver", label: "SQL Server", color: "bg-red-500/10 text-red-500 border-red-500/20", dotClass: "bg-red-500" },
  { id: "mongodb", label: "MongoDB", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", dotClass: "bg-emerald-500" },
  { id: "oracle", label: "Oracle", color: "bg-rose-500/10 text-rose-500 border-rose-500/20", dotClass: "bg-rose-500" },
  { id: "sqlite", label: "SQLite", color: "bg-sky-500/10 text-sky-500 border-sky-500/20", dotClass: "bg-sky-500" },
  { id: "other", label: "Otro", color: "bg-slate-500/10 text-slate-500 border-slate-500/20", dotClass: "bg-slate-500" }
];

export function DatabasesPage() {
  const { databaseCredentials, addDatabaseCredential, updateDatabaseCredential, deleteDatabaseCredential } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterEngine, setFilterEngine] = useState("all");
  const [revealPasswordId, setRevealPasswordId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draggedInfo, setDraggedInfo] = useState<{ sourceId: string; projectSlot: string; projectName: string } | null>(null);

  // Form Dialog state (Add / Edit)
  const [isOpen, setIsOpen] = useState(false);
  const [editingCred, setEditingCred] = useState<DatabaseCredential | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [engine, setEngine] = useState<any>("postgres");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [databaseName, setDatabaseName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [project1, setProject1] = useState("");
  const [project2, setProject2] = useState("");

  const handleOpenAdd = () => {
    setEditingCred(null);
    setName("");
    setEngine("postgres");
    setHost("");
    setPort("");
    setDatabaseName("");
    setUsername("");
    setPassword("");
    setNotes("");
    setProject1("");
    setProject2("");
    setIsOpen(true);
  };

  const handleOpenEdit = (cred: DatabaseCredential) => {
    setEditingCred(cred);
    setName(cred.name);
    setEngine(cred.engine);
    setHost(cred.host);
    setPort(cred.port || "");
    setDatabaseName(cred.databaseName || "");
    setUsername(cred.username || "");
    setPassword(cred.password || "");
    setNotes(cred.notes || "");
    setProject1(cred.project1 || "");
    setProject2(cred.project2 || "");
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !host.trim()) {
      toast.error("Por favor, completá los campos obligatorios");
      return;
    }

    const payload = {
      name: name.trim(),
      engine,
      host: host.trim(),
      port: port.trim() || undefined,
      databaseName: databaseName.trim() || undefined,
      username: username.trim() || undefined,
      password: password.trim() || undefined,
      notes: notes.trim() || undefined,
      project1: project1.trim() || undefined,
      project2: project2.trim() || undefined
    };

    try {
      if (editingCred) {
        await updateDatabaseCredential(editingCred.id, payload);
        toast.success("Credencial actualizada correctamente");
      } else {
        await addDatabaseCredential(payload);
        toast.success("Credencial registrada correctamente");
      }
      setIsOpen(false);
    } catch (err) {
      toast.error("Error al guardar la credencial");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta credencial de base de datos?")) {
      try {
        await deleteDatabaseCredential(id);
        toast.success("Credencial eliminada correctamente");
      } catch (err) {
        toast.error("Error al eliminar la credencial");
      }
    }
  };

  const handleCopy = (text?: string, label?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label || "Texto"} copiado al portapapeles`);
  };

  const filteredCreds = useMemo(() => {
    const filtered = databaseCredentials.filter(c => {
      const matchesSearch = 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.host.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.databaseName && c.databaseName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.notes && c.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesEngine = filterEngine === "all" || c.engine === filterEngine;
      return matchesSearch && matchesEngine;
    });

    return filtered.sort((a, b) => 
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [databaseCredentials, searchQuery, filterEngine]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Credenciales de Bases de Datos
          </h1>
          <p className="text-muted-foreground text-sm">
            Guardá y gestioná de forma segura las credenciales de bases de datos de la empresa.
          </p>
        </div>
        <Button 
          onClick={handleOpenAdd}
          className="rounded-xl h-11 px-5 shadow-sm shrink-0 self-start sm:self-center text-xs font-semibold"
        >
          <Plus className="size-4 mr-2" />
          Nueva Conexión
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500/5 to-indigo-500/10 border-indigo-500/20 shadow-sm">
          <CardContent className="flex items-center gap-4 py-4 px-5">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
              <Database className="size-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Conexiones</p>
              <h3 className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{databaseCredentials.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30 shadow-md shadow-emerald-500/5 relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 size-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500" />
          <CardContent className="flex items-center gap-2 sm:gap-4 py-3 sm:py-4 px-3 sm:px-5 relative z-10">
            <div className="p-1.5 sm:p-2.5 bg-emerald-500/15 rounded-xl text-emerald-500 shadow-inner shrink-0">
              <Server className="size-5 sm:size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-wider truncate">Proveedor Cloud</p>
              <h3 className="text-lg sm:text-2xl font-extrabold bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent tracking-tight truncate">
                Supabase ⚡
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1 bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20 shadow-sm">
          <CardContent className="flex items-center gap-4 py-4 px-5">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
              <Shield className="size-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Estado Seguridad</p>
              <h3 className="text-sm font-bold text-amber-700 dark:text-amber-400 mt-1 bg-amber-500/10 px-2 py-0.5 rounded-full inline-block">
                Encriptado RLS
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card className="border border-muted-foreground/15 shadow-sm">
        <CardContent className="py-4 px-5 flex flex-col md:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, host, base de datos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-xl border-border/80 focus-visible:ring-indigo-500 text-xs"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto items-center shrink-0">
            <Select value={filterEngine} onValueChange={setFilterEngine}>
              <SelectTrigger className="h-10 w-full md:w-[190px] rounded-xl border-border/80 bg-background text-xs cursor-pointer shadow-xs">
                <SelectValue placeholder="Todos los motores" />
              </SelectTrigger>
              <SelectContent position="popper" className="duration-150 ease-out">
                <SelectItem value="all" className="cursor-pointer text-xs">
                  <span className="flex items-center gap-2">
                    <Database className="size-3.5 text-muted-foreground shrink-0" />
                    <span>Todos los motores</span>
                  </span>
                </SelectItem>
                {ENGINES.map(e => (
                  <SelectItem key={e.id} value={e.id} className="cursor-pointer text-xs">
                    <span className="flex items-center gap-2">
                      <span className={`size-2 rounded-full shrink-0 ${e.dotClass}`} />
                      <span>{e.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              type="button"
              variant="outline"
              className="border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl h-10 px-3 text-xs font-semibold flex-1 min-w-0 whitespace-nowrap justify-center cursor-pointer"
              onClick={() => window.open("https://supabase.com/dashboard", "_blank")}
            >
              <ExternalLink className="size-3.5 mr-1.5 shrink-0" />
              <span className="truncate">Consola Supabase</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connections List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCreds.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Database}
              title="No hay conexiones"
              description="Registrá tus credenciales de bases de datos para verlas listadas aquí."
              className="py-16"
            />
          </div>
        ) : (
          filteredCreds.map((c) => {
            const engineConfig = ENGINES.find(e => e.id === c.engine) || ENGINES[6];
            const isRevealed = revealPasswordId === c.id;

            const isDragOver = dragOverId === c.id;
            const hasSpace = !c.project1 || !c.project2;
            const isSource = draggedInfo?.sourceId === c.id;

            return (
              <Card 
                key={c.id} 
                onDragOver={(e) => {
                  if (hasSpace && draggedInfo?.sourceId !== c.id) {
                    e.preventDefault();
                  }
                }}
                onDragEnter={() => {
                  if (hasSpace && draggedInfo?.sourceId !== c.id) {
                    setDragOverId(c.id);
                  }
                }}
                onDragLeave={() => {
                  setDragOverId(null);
                }}
                onDrop={async (e) => {
                  setDragOverId(null);
                  e.preventDefault();
                  try {
                    const rawData = e.dataTransfer.getData("text/plain");
                    if (!rawData) return;
                    const dragData = JSON.parse(rawData);
                    const { sourceId, projectSlot, projectName } = dragData;
                    
                    if (sourceId === c.id) return; // Drop on itself

                    let targetSlot = "";
                    if (!c.project1) {
                      targetSlot = "project1";
                    } else if (!c.project2) {
                      targetSlot = "project2";
                    }

                    if (!targetSlot) {
                      toast.error("Esta base de datos ya tiene el límite de 2 proyectos.");
                      return;
                    }

                    // 1. Remove project from source database
                    const sourceCred = databaseCredentials.find(x => x.id === sourceId);
                    if (sourceCred) {
                      const sourcePayload = {
                        [projectSlot]: ""
                      };
                      await updateDatabaseCredential(sourceId, sourcePayload);
                    }

                    // 2. Add project to target database
                    const targetPayload = {
                      [targetSlot]: projectName
                    };
                    await updateDatabaseCredential(c.id, targetPayload);

                    toast.success(`Proyecto "${projectName}" movido a "${c.name}"`);
                  } catch (err) {
                    console.error("Error moving project:", err);
                    toast.error("Error al mover el proyecto");
                  }
                }}
                className={`border border-muted-foreground/10 hover:border-indigo-500/20 shadow-sm relative group flex flex-col h-full bg-card hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden ${
                  isDragOver ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-500/10 scale-[1.02] z-10" : ""
                } ${isSource ? "opacity-60 border-dashed border-indigo-500/40" : ""}`}
              >
                {/* Header card indicator line */}
                <div className={`h-1.5 w-full ${
                  c.engine === 'postgres' ? 'bg-blue-500' :
                  c.engine === 'mysql' ? 'bg-orange-500' :
                  c.engine === 'sqlserver' ? 'bg-red-500' :
                  c.engine === 'mongodb' ? 'bg-emerald-500' : 'bg-slate-400'
                }`} />

                <CardContent className="p-5 flex-1 flex flex-col gap-4">
                  {/* Top line: title, badge, action buttons */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-foreground truncate">{c.name}</h4>
                      <Badge className={`px-2 py-0 h-5 text-[9px] uppercase font-bold tracking-wider rounded-md border mt-1 ${engineConfig.color}`}>
                        {engineConfig.label}
                      </Badge>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-lg text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50"
                        onClick={() => handleOpenEdit(c)}
                      >
                        <Edit className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(c.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <Separator className="bg-muted-foreground/10" />

                  {/* Connection Details */}
                  <div className="space-y-2 text-xs flex-1">
                    {/* Host */}
                    <div className="flex justify-between items-center group/field p-1.5 rounded-lg hover:bg-muted/40 transition-colors">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">Host / IP</span>
                        <span className="font-mono text-foreground break-all">{c.host}{c.port ? `:${c.port}` : ''}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 shrink-0 opacity-0 group-hover/field:opacity-100 transition-opacity ml-2"
                        onClick={() => handleCopy(c.host + (c.port ? `:${c.port}` : ''), "Host")}
                      >
                        <Copy className="size-3" />
                      </Button>
                    </div>

                    {/* DB Name */}
                    {c.databaseName && (
                      <div className="flex justify-between items-center group/field p-1.5 rounded-lg hover:bg-muted/40 transition-colors">
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">Base de Datos</span>
                          <span className="font-mono text-foreground truncate block">{c.databaseName}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 shrink-0 opacity-0 group-hover/field:opacity-100 transition-opacity ml-2"
                          onClick={() => handleCopy(c.databaseName, "Base de Datos")}
                        >
                          <Copy className="size-3" />
                        </Button>
                      </div>
                    )}

                    {/* Username */}
                    {c.username && (
                      <div className="flex justify-between items-center group/field p-1.5 rounded-lg hover:bg-muted/40 transition-colors">
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">Usuario</span>
                          <span className="font-mono text-foreground truncate block">{c.username}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 shrink-0 opacity-0 group-hover/field:opacity-100 transition-opacity ml-2"
                          onClick={() => handleCopy(c.username, "Usuario")}
                        >
                          <Copy className="size-3" />
                        </Button>
                      </div>
                    )}

                    {/* Password */}
                    {c.password && (
                      <div className="flex justify-between items-center group/field p-1.5 rounded-lg hover:bg-muted/40 transition-colors">
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">Contraseña</span>
                          <span className="font-mono text-foreground truncate block">
                            {isRevealed ? c.password : "••••••••••••"}
                          </span>
                        </div>
                        <div className="flex gap-0.5 shrink-0 ml-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50"
                            onClick={() => setRevealPasswordId(isRevealed ? null : c.id)}
                          >
                            {isRevealed ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 opacity-0 group-hover/field:opacity-100 transition-opacity"
                            onClick={() => handleCopy(c.password, "Contraseña")}
                          >
                            <Copy className="size-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Projects section */}
                  <Separator className="bg-muted-foreground/10" />
                  <div className="space-y-1.5">
                    <span className="text-[9px] text-muted-foreground block font-semibold uppercase tracking-wider">Proyectos ({[c.project1, c.project2].filter(Boolean).length}/2)</span>
                    <div className="grid grid-cols-2 gap-2">
                      {c.project1 ? (
                        <div 
                          draggable={true}
                          onDragStart={(e) => {
                            const info = { sourceId: c.id, projectSlot: "project1", projectName: c.project1 || "" };
                            setDraggedInfo(info);
                            e.dataTransfer.setData("text/plain", JSON.stringify(info));
                          }}
                          onDragEnd={() => {
                            setDraggedInfo(null);
                          }}
                          className={`bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/20 px-2 py-1.5 rounded-xl flex items-center gap-1.5 min-w-0 shadow-sm cursor-grab active:cursor-grabbing hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all ${
                            draggedInfo?.sourceId === c.id && draggedInfo?.projectSlot === "project1" 
                              ? "opacity-20 border-dashed border-indigo-500 bg-transparent scale-95" 
                              : ""
                          }`}
                        >
                          <span className="size-1.5 rounded-full bg-indigo-500 shrink-0" />
                          <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 truncate">{c.project1}</span>
                        </div>
                      ) : (
                        (() => {
                          const isTarget = !c.project1 && draggedInfo && draggedInfo.sourceId !== c.id;
                          const isHoveredTarget = isTarget && isDragOver;
                          return (
                            <div className={`border rounded-xl flex items-center justify-center min-w-0 transition-all duration-200 px-2 py-1.5 ${
                              isHoveredTarget 
                                ? "border-indigo-500 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-solid scale-[1.03] shadow-md shadow-indigo-500/10 font-bold animate-bounce" 
                                : isTarget 
                                  ? "border-indigo-500/40 bg-indigo-500/5 dark:bg-indigo-500/10 border-dashed animate-pulse text-indigo-500 dark:text-indigo-400 font-semibold"
                                  : "border-dashed border-muted-foreground/20 bg-muted/5 text-muted-foreground/60 font-medium italic"
                            }`}>
                              <span className="text-[10px] truncate">
                                {isHoveredTarget ? "¡Soltar aquí! 📥" : isTarget ? "Espacio disponible ➕" : "Espacio disponible ➕"}
                              </span>
                            </div>
                          );
                        })()
                      )}

                      {c.project2 ? (
                        <div 
                          draggable={true}
                          onDragStart={(e) => {
                            const info = { sourceId: c.id, projectSlot: "project2", projectName: c.project2 || "" };
                            setDraggedInfo(info);
                            e.dataTransfer.setData("text/plain", JSON.stringify(info));
                          }}
                          onDragEnd={() => {
                            setDraggedInfo(null);
                          }}
                          className={`bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/20 px-2 py-1.5 rounded-xl flex items-center gap-1.5 min-w-0 shadow-sm cursor-grab active:cursor-grabbing hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all ${
                            draggedInfo?.sourceId === c.id && draggedInfo?.projectSlot === "project2" 
                              ? "opacity-20 border-dashed border-indigo-500 bg-transparent scale-95" 
                              : ""
                          }`}
                        >
                          <span className="size-1.5 rounded-full bg-indigo-500 shrink-0" />
                          <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 truncate">{c.project2}</span>
                        </div>
                      ) : (
                        (() => {
                          const isTarget = c.project1 && !c.project2 && draggedInfo && draggedInfo.sourceId !== c.id;
                          const isHoveredTarget = isTarget && isDragOver;
                          return (
                            <div className={`border rounded-xl flex items-center justify-center min-w-0 transition-all duration-200 px-2 py-1.5 ${
                              isHoveredTarget 
                                ? "border-indigo-500 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-solid scale-[1.03] shadow-md shadow-indigo-500/10 font-bold animate-bounce" 
                                : isTarget 
                                  ? "border-indigo-500/40 bg-indigo-500/5 dark:bg-indigo-500/10 border-dashed animate-pulse text-indigo-500 dark:text-indigo-400 font-semibold"
                                  : "border-dashed border-muted-foreground/20 bg-muted/5 text-muted-foreground/60 font-medium italic"
                            }`}>
                              <span className="text-[10px] truncate">
                                {isHoveredTarget ? "¡Soltar aquí! 📥" : isTarget ? "Espacio disponible ➕" : "Espacio disponible ➕"}
                              </span>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  </div>

                  {/* Notes section */}
                  {c.notes && (
                    <>
                      <Separator className="bg-muted-foreground/10" />
                      <div className="bg-muted/30 p-2 rounded-xl border border-muted-foreground/5">
                        <span className="text-[9px] text-muted-foreground block font-semibold uppercase tracking-wider mb-0.5">Notas</span>
                        <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{c.notes}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl p-5 border border-muted-foreground/15 max-h-[90vh] overflow-y-auto scrollbar-none">
          <DialogHeader>
            <DialogTitle>{editingCred ? "Editar Conexión" : "Nueva Conexión"}</DialogTitle>
            <DialogDescription>
              Completá las credenciales de conexión de la base de datos.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre del Servidor / Tag</label>
              <Input
                placeholder="ej. Producción Principal, Réplica Reportes"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-10 rounded-xl border-border/80 focus-visible:ring-indigo-500 font-medium text-xs placeholder:text-muted-foreground/45 placeholder:font-normal"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Motor de DB</label>
                <Select value={engine} onValueChange={(val) => setEngine(val)}>
                  <SelectTrigger className="w-full h-10 rounded-xl border border-border/80 bg-background text-xs cursor-pointer shadow-xs">
                    <SelectValue placeholder="Seleccionar motor" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="duration-150 ease-out">
                    {ENGINES.map(e => (
                      <SelectItem key={e.id} value={e.id} className="cursor-pointer text-xs">
                        <span className="flex items-center gap-2">
                          <span className={`size-2 rounded-full shrink-0 ${e.dotClass}`} />
                          <span>{e.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Puerto</label>
                <Input
                  placeholder="ej. 5432, 3306 (Opcional)"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="h-10 rounded-xl border-border/80 focus-visible:ring-indigo-500 font-medium text-xs placeholder:text-muted-foreground/45 placeholder:font-normal"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Host / IP</label>
                <Input
                  placeholder="ej. 192.168.0.240, db.empresa.com"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  required
                  className="h-10 rounded-xl border-border/80 focus-visible:ring-indigo-500 font-medium text-xs placeholder:text-muted-foreground/45 placeholder:font-normal"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre de Base de Datos</label>
                <Input
                  placeholder="ej. techcontrol_db (Opcional)"
                  value={databaseName}
                  onChange={(e) => setDatabaseName(e.target.value)}
                  className="h-10 rounded-xl border-border/80 focus-visible:ring-indigo-500 font-medium text-xs placeholder:text-muted-foreground/45 placeholder:font-normal"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usuario</label>
                <Input
                  placeholder="ej. postgres, admin (Opcional)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-10 rounded-xl border-border/80 focus-visible:ring-indigo-500 font-medium text-xs placeholder:text-muted-foreground/45 placeholder:font-normal"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contraseña</label>
                <Input
                  type="password"
                  placeholder="Contraseña de la base de datos (Opcional)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 rounded-xl border-border/80 focus-visible:ring-indigo-500 font-medium text-xs placeholder:text-muted-foreground/45 placeholder:font-normal"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Proyecto 1</label>
                <Input
                  placeholder="ej. Fabrica MES (Opcional)"
                  value={project1}
                  onChange={(e) => setProject1(e.target.value)}
                  className="h-10 rounded-xl border-border/80 focus-visible:ring-indigo-500 font-medium text-xs placeholder:text-muted-foreground/45 placeholder:font-normal"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Proyecto 2</label>
                <Input
                  placeholder="ej. Romi Rooms (Opcional)"
                  value={project2}
                  onChange={(e) => setProject2(e.target.value)}
                  className="h-10 rounded-xl border-border/80 focus-visible:ring-indigo-500 font-medium text-xs placeholder:text-muted-foreground/45 placeholder:font-normal"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notas adicionales</label>
              <Textarea
                placeholder="Detalles sobre réplicas, accesos VPN, o configuraciones específicas de firewall..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-xl border-border/80 focus-visible:ring-indigo-500 text-xs resize-none placeholder:text-muted-foreground/45 placeholder:font-normal"
                rows={2}
              />
            </div>

            <DialogFooter className="pt-2 flex flex-row items-center justify-end gap-2">
              <Button type="submit" className="rounded-xl h-10 text-xs">
                {editingCred ? "Guardar cambios" : "Crear Conexión"}
              </Button>
              <Button type="button" variant="outline" className="rounded-xl h-10 text-xs" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
