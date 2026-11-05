import { useState } from "react";
import { Plus, Search, Monitor, User, Pencil as Edit, Trash2, Save, LayoutGrid, Copy, Check, Key } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AutoResizeTextarea } from "@/components/shared/AutoResizeTextarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/context/AppContext";
import { EmptyState } from "@/components/shared/EmptyState";
import { SUCURSALES } from "@/data/mock";
import type { DataliveTV } from "@/types";
import { toast } from "sonner";

interface TVBranchCardProps {
  branch: string;
  devices: DataliveTV[];
  onEdit: (tv: DataliveTV) => void;
  onDelete: (id: string) => void;
}

function TVBranchCard({ branch, devices, onEdit, onDelete }: TVBranchCardProps) {
  const [copied, setCopied] = useState(false);
  const hasRealDevices = devices.some(tv => tv.name !== "Próximamente");
  const visibleDevices = hasRealDevices ? devices.filter(tv => tv.name !== "Próximamente") : devices;

  const handleCopyAll = () => {
    if (visibleDevices.length === 0) return;

    // Sort devices by name (TV1, TV2, etc)
    const sortedDevices = [...visibleDevices].sort((a, b) => 
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

    const text = sortedDevices.map(tv => 
      `${tv.name}:\nUsuario: ${tv.user}\nID Dispositivo: ${tv.deviceId}\nPin: ${tv.pin}`
    ).join('\n\n');
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`Info de ${branch} copiada (${visibleDevices.length} dispositivos)`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="flex flex-col p-0 transition-shadow hover:shadow-md border-primary/20 bg-primary/5 overflow-hidden">
      <CardHeader className="p-4 bg-primary/10 rounded-none border-b border-primary/20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
              <Monitor className="size-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold leading-tight">{branch}</h3>
              <p className="text-xs text-muted-foreground">{visibleDevices.length} {visibleDevices.length === 1 ? 'Dispositivo' : 'Dispositivos'}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon-xs" 
            className={`transition-colors ${copied ? 'text-emerald-800 bg-emerald-100 border border-emerald-300' : 'hover:bg-primary/20 hover:text-primary'}`}
            onClick={handleCopyAll}
            title="Copiar toda la info de la sucursal"
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 pt-4 pb-4">
        <div className="grid grid-cols-1 gap-2">
          {visibleDevices.map((tv) => {
            const isSoon = tv.name === "Próximamente";
            return (
              <div 
                key={tv.id} 
                className={`group relative flex items-center justify-between rounded-md border border-border/40 px-3 py-2 transition-colors ${
                  isSoon 
                    ? 'bg-muted/20 opacity-60 grayscale' 
                    : 'bg-background/40 hover:border-primary/30'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase min-w-[80px]">
                    {tv.name.includes('VIDEOWALL') ? <LayoutGrid className="size-3 shrink-0" /> : <Monitor className="size-3 shrink-0" />}
                    <span className="truncate">{tv.name}</span>
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">ID:</span>
                    <span className="font-mono font-bold text-foreground">{tv.deviceId}</span>
                  </div>
                </div>

                {!isSoon && (
                  <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button variant="ghost" size="icon-xs" onClick={() => onEdit(tv)}>
                      <Edit className="size-3" />
                    </Button>
                    <Button variant="ghost" size="icon-xs" onClick={() => onDelete(tv.id)}>
                      <Trash2 className="size-3 text-rose-400" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {devices.some(tv => tv.notes) && (
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase px-1">Notas</p>
            {devices.filter(tv => tv.notes).map(tv => (
              <div key={tv.id + '-note'} className="rounded bg-muted/50 px-2 py-1 text-[10px] text-muted-foreground">
                <span className="font-bold">{tv.name}:</span> {tv.notes}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button 
      variant="ghost" 
      size="icon-xs" 
      className="ml-auto hover:bg-primary/20 hover:text-primary" 
      onClick={handleCopy}
    >
      {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
    </Button>
  );
}

const defaultForm = {
  branch: "Ballester",
  name: "TV1",
  user: "migusto",
  deviceId: "",
  pin: "85749621",
  notes: "",
};

export function DataliveTVPage() {
  const { dataliveTVs, addDataliveTV, updateDataliveTV, deleteDataliveTV } = useApp();
  const [search, setSearch] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTV, setEditingTV] = useState<DataliveTV | null>(null);
  const [form, setForm] = useState(defaultForm);

  const filtered = dataliveTVs.filter((tv) => {
    const matchSearch =
      !search ||
      tv.branch.toLowerCase().includes(search.toLowerCase()) ||
      tv.user.toLowerCase().includes(search.toLowerCase()) ||
      tv.deviceId.toLowerCase().includes(search.toLowerCase()) ||
      tv.name.toLowerCase().includes(search.toLowerCase());
    const matchBranch = filterBranch === "all" || tv.branch === filterBranch;
    return matchSearch && matchBranch;
  });

  // Group by branch
  const grouped = filtered.reduce((acc, tv) => {
    if (!acc[tv.branch]) acc[tv.branch] = [];
    acc[tv.branch].push(tv);
    return acc;
  }, {} as Record<string, DataliveTV[]>);

  const totalDevices = dataliveTVs.filter(tv => tv.name !== "Próximamente").length;
  const totalBranches = new Set(dataliveTVs.map(tv => tv.branch)).size;

  const openCreate = () => {
    setEditingTV(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (tv: DataliveTV) => {
    setEditingTV(tv);
    setForm({
      branch: tv.branch,
      name: tv.name,
      user: tv.user,
      deviceId: tv.deviceId,
      pin: tv.pin,
      notes: tv.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteDataliveTV(id);
    toast.success("Dispositivo eliminado");
  };

  const handleSave = () => {
    if (!form.branch || !form.deviceId) {
      toast.error("Completá los campos obligatorios");
      return;
    }

    const finalData = {
      ...form,
      user: "migusto",
      pin: "85749621",
    };

    if (editingTV) {
      updateDataliveTV(editingTV.id, finalData);
      toast.success("Dispositivo actualizado");
    } else {
      addDataliveTV(finalData);
      toast.success("Dispositivo registrado");
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">DataliveTV</h1>
          <p className="text-sm text-muted-foreground">
            Credenciales de cartelería digital por sucursal
          </p>
        </div>
      </div>

      {/* General Info & Stats */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 w-full">
          <div className="flex items-center gap-2 rounded-md border border-amber-400 bg-amber-100/80 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 shadow-sm">
            <Key className="size-3.5" />
            Acceso Universal para todas las TVs
          </div>
          <div className="h-px flex-1 bg-border/40" />
        </div>
        
        {/* Metric cards grid - expanded across screen */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
          <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-primary/30 bg-primary/5 px-4 h-16 shadow-sm transition-all hover:bg-primary/10">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <User className="size-3.5 text-primary shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">Usuario</span>
              </div>
              <span className="text-lg sm:text-xl font-black text-primary tracking-tight leading-none truncate">migusto</span>
            </div>
            <div className="shrink-0">
              <CopyButton text="migusto" />
            </div>
          </div>
          
          <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-primary/30 bg-primary/5 px-4 h-16 shadow-sm transition-all hover:bg-primary/10">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Key className="size-3.5 text-primary shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">PIN</span>
              </div>
              <span className="text-base sm:text-xl font-black font-mono tracking-[0.05em] text-primary leading-none truncate">85749621</span>
            </div>
            <div className="shrink-0">
              <CopyButton text="85749621" />
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-xl border border-border/80 bg-muted/30 px-4 h-16 shadow-sm transition-all hover:bg-muted/40">
            <span className="text-xl sm:text-2xl font-black text-foreground">{totalBranches}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sucursales</span>
          </div>
          
          <div className="flex items-center gap-3.5 rounded-xl border border-border/80 bg-muted/30 px-4 h-16 shadow-sm transition-all hover:bg-muted/40">
            <span className="text-xl sm:text-2xl font-black text-foreground">{totalDevices}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dispositivos</span>
          </div>
        </div>
      </div>

      {/* Search, Filter & Action - All in one line */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por sucursal, ID, nombre de TV..."
            className="pl-8 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Select value={filterBranch} onValueChange={setFilterBranch}>
            <SelectTrigger className="w-[180px] sm:w-[200px] shrink-0 font-medium">
              <SelectValue placeholder="Sucursal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las sucursales</SelectItem>
              {SUCURSALES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 gap-1.5 font-bold shadow-sm">
            <Plus className="size-4" />
            Nuevo dispositivo
          </Button>
        </div>
      </div>

      {/* Grid */}
      {Object.keys(grouped).length === 0 ? (
        <EmptyState
          icon={Monitor}
          title="Sin dispositivos"
          description="No se encontraron registros de DataliveTV con los filtros aplicados."
          action={<Button onClick={openCreate}><Plus className="size-4" />Nuevo dispositivo</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Object.entries(grouped)
            .sort(([a], [b]) => {
              if (a === "Campana") return -1;
              if (b === "Campana") return 1;
              return a.localeCompare(b);
            })
            .map(([branch, devices]) => (
            <TVBranchCard 
              key={branch} 
              branch={branch} 
              devices={devices} 
              onEdit={openEdit} 
              onDelete={handleDelete} 
            />
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg no-scrollbar">
          <DialogHeader>
            <DialogTitle>{editingTV ? "Editar dispositivo" : "Registrar nuevo dispositivo"}</DialogTitle>
            <DialogDescription className="sr-only">Detalles y configuración del dispositivo de cartelería digital</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sucursal <span className="text-red-500">*</span></Label>
                <Select value={form.branch} onValueChange={(v) => setForm({ ...form, branch: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUCURSALES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nombre del dispositivo <span className="text-red-500">*</span></Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ej. TV1 o VIDEOWALL1" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>ID del Dispositivo <span className="text-red-500">*</span></Label>
              <Input value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value })} placeholder="417" />
            </div>
            <div className="space-y-1.5">
              <Label>Observaciones</Label>
              <AutoResizeTextarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Notas u observaciones adicionales sobre el dispositivo..."
              />
            </div>
          </div>
          <DialogFooter className="flex flex-row items-center justify-end gap-2">
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm">
              <Save className="size-4 mr-1.5" />Guardar
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
