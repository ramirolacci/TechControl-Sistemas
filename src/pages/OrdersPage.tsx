import { useState } from "react";
import { Plus, Search, ShoppingCart, ChevronDown, ChevronUp, CircleCheck as CheckCircle, Circle as XCircle, History, Save, Pencil as Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/context/AppContext";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { AutoResizeTextarea } from "@/components/shared/AutoResizeTextarea";
import {
  orderStatusLabel,
  orderStatusColor,
  orderPriorityLabel,
  orderPriorityColor,
  categoryLabel,
  formatDateTime,
} from "@/lib/utils-app";
import type { Order, OrderStatus, OrderPriority, Category } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ORDER_STEPS: OrderStatus[] = ["requested", "in-process", "ordered", "delivered"];

function OrderTimeline({ order }: { order: Order }) {
  const currentIdx = ORDER_STEPS.indexOf(order.status);
  const isCancelledOrReturned = order.status === "cancelled" || order.status === "returned";

  return (
    <div className="mt-3">
      {isCancelledOrReturned ? (
        <div className="flex items-center gap-2 text-sm">
          <StatusBadge
            label={orderStatusLabel(order.status)}
            colorClass={orderStatusColor(order.status)}
          />
          <span className="text-muted-foreground">{order.notes}</span>
        </div>
      ) : (
        <div className="flex items-center gap-0">
          {ORDER_STEPS.map((step, idx) => {
            const isDone = idx <= currentIdx;
            const isCurrent = idx === currentIdx;
            return (
              <div key={step} className="flex items-center">
                <div className={cn(
                  "flex h-7 items-center rounded-full border px-2.5 text-xs font-medium transition-all",
                  isDone
                    ? isCurrent
                      ? orderStatusColor(step)
                      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-border bg-muted text-muted-foreground"
                )}>
                  {idx < currentIdx && <CheckCircle className="mr-1 size-3" />}
                  {orderStatusLabel(step)}
                </div>
                {idx < ORDER_STEPS.length - 1 && (
                  <div className={cn(
                    "h-px w-4 transition-all",
                    idx < currentIdx ? "bg-emerald-400" : "bg-border"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface OrderCardProps {
  order: Order;
  onEdit: (order: Order) => void;
  onDelete: (id: string) => void;
}

function OrderCard({ order, onEdit, onDelete }: OrderCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { updateOrderStatus } = useApp();

  const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
    requested: "in-process",
    "in-process": "ordered",
    ordered: "delivered",
  };

  const nextStatusLabel: Partial<Record<OrderStatus, string>> = {
    requested: "Marcar en proceso",
    "in-process": "Marcar pedido realizado",
    ordered: "Marcar entregado",
  };

  const canAdvance = order.status in nextStatus;

  const handleAdvance = () => {
    const next = nextStatus[order.status];
    if (next) {
      updateOrderStatus(order.id, next, undefined, "Sistema");
      toast.success(`Pedido actualizado a: ${orderStatusLabel(next)}`);
    }
  };

  const handleCancel = () => {
    updateOrderStatus(order.id, "cancelled", "Cancelado manualmente", "Sistema");
    toast.info("Pedido cancelado");
  };

  return (
    <Card className={cn(
      "transition-shadow hover:shadow-md",
      order.priority === "critical" ? "border-rose-200 dark:border-rose-800" : "",
      order.priority === "high" ? "border-orange-200 dark:border-orange-800" : "",
      order.status === "delivered" ? "opacity-75" : "",
      order.status === "cancelled" ? "opacity-60" : "",
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{order.itemName}</h3>
              <Badge variant="outline" className="text-xs">{categoryLabel(order.category)}</Badge>
              <StatusBadge
                label={orderPriorityLabel(order.priority)}
                colorClass={orderPriorityColor(order.priority)}
              />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Cantidad: <strong>{order.quantity}</strong> · Por: {order.requestedBy}
            </p>
            <p className="text-xs text-muted-foreground">{formatDateTime(order.requestedAt)}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge
              label={orderStatusLabel(order.status)}
              colorClass={orderStatusColor(order.status)}
              className="shrink-0"
            />
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-xs" onClick={() => onEdit(order)} title="Editar pedido">
                <Edit className="size-3" />
              </Button>
              <Button variant="ghost" size="icon-xs" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20" onClick={() => onDelete(order.id)} title="Eliminar pedido">
                <Trash2 className="size-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{order.reason}</p>

        <OrderTimeline order={order} />

        {/* Actions */}
        {(canAdvance || (order.status !== "cancelled" && order.status !== "delivered")) && (
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {canAdvance && (
              <Button 
                size="sm" 
                onClick={handleAdvance}
                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all active:scale-95"
              >
                <CheckCircle className="size-3.5" />
                {nextStatusLabel[order.status]}
              </Button>
            )}
            {order.status !== "cancelled" && order.status !== "delivered" && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleCancel} 
                className="h-8 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
              >
                <XCircle className="size-3.5" />
                Cancelar
              </Button>
            )}
          </div>
        )}

        {/* History toggle */}
        <button
          className="mt-3 flex w-full items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded(!expanded)}
        >
          <History className="size-3" />
          Historial ({order.history.length})
          {expanded ? <ChevronUp className="ml-auto size-3" /> : <ChevronDown className="ml-auto size-3" />}
        </button>

        {expanded && (
          <div className="mt-2 space-y-1 border-t pt-2">
            {[...order.history].reverse().map((h) => (
              <div key={h.id} className="flex items-start gap-2 text-xs">
                <div className="mt-0.5 size-1.5 rounded-full bg-muted-foreground/50 shrink-0 mt-1.5" />
                <div>
                  <span className="font-medium">{orderStatusLabel(h.status)}</span>
                  {" · "}
                  <span className="text-muted-foreground">{formatDateTime(h.date)}</span>
                  {" · "}
                  <span className="text-muted-foreground">{h.changedBy}</span>
                  {h.notes && <p className="text-muted-foreground">{h.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const defaultForm = {
  itemName: "",
  quantity: 1,
  category: "toner" as Category,
  reason: "",
  priority: "medium" as OrderPriority,
  requestedBy: "Carlos Rodríguez",
  notes: "",
};

const CATEGORIES: Category[] = [
  "printer", "toner", "image-unit", "notebook",
  "peripheral", "cable", "accessory", "other",
];

export function OrdersPage() {
  const { orders, addOrder, updateOrder, deleteOrder } = useApp();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [form, setForm] = useState(defaultForm);

  const filtered = orders.filter((o) => {
    const matchSearch =
      !search ||
      o.itemName.toLowerCase().includes(search.toLowerCase()) ||
      o.requestedBy.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    const matchPriority = filterPriority === "all" || o.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  const statsCounts: Record<OrderStatus, number> = {
    requested: orders.filter((o) => o.status === "requested").length,
    "in-process": orders.filter((o) => o.status === "in-process").length,
    ordered: orders.filter((o) => o.status === "ordered").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    returned: orders.filter((o) => o.status === "returned").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  const openCreate = () => {
    setEditingOrder(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (order: Order) => {
    setEditingOrder(order);
    setForm({
      itemName: order.itemName,
      quantity: order.quantity,
      category: order.category,
      reason: order.reason,
      priority: order.priority,
      requestedBy: order.requestedBy,
      notes: order.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de eliminar este pedido?")) {
      deleteOrder(id);
      toast.success("Pedido eliminado");
    }
  };

  const handleSave = () => {
    if (!form.itemName || !form.reason || !form.requestedBy) {
      toast.error("Completá los campos obligatorios");
      return;
    }

    if (editingOrder) {
      updateOrder(editingOrder.id, form);
      toast.success("Pedido actualizado correctamente");
    } else {
      addOrder({
        ...form,
        status: "requested",
      });
      toast.success("Pedido creado correctamente");
    }
    setDialogOpen(false);
    setForm(defaultForm);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pedidos a Compras</h1>
          <p className="text-sm text-muted-foreground">{orders.length} pedidos registrados</p>
        </div>
      </div>

      {/* Status summary cards - full width */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 w-full">
        {[
          { status: "requested" as OrderStatus, label: "Solicitados" },
          { status: "in-process" as OrderStatus, label: "En proceso" },
          { status: "ordered" as OrderStatus, label: "Pedido realizado" },
          { status: "delivered" as OrderStatus, label: "Entregados" },
          { status: "cancelled" as OrderStatus, label: "Cancelados" },
        ].map(({ status, label }) => {
          const isSelected = filterStatus === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(isSelected ? "all" : status)}
              className={cn(
                "flex flex-col justify-between p-3.5 sm:p-4 rounded-xl border text-left transition-all cursor-pointer shadow-xs",
                orderStatusColor(status),
                isSelected
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background font-semibold scale-[1.01]"
                  : "opacity-85 hover:opacity-100 hover:scale-[1.01]"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[11px] sm:text-xs font-semibold tracking-wider uppercase truncate">{label}</span>
                <span className={cn("size-2 rounded-full shrink-0", isSelected ? "bg-current animate-pulse" : "opacity-40 bg-current")} />
              </div>
              <span className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
                {statsCounts[status]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search, Filters and Action in one line */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por ítem o solicitante..."
            className="pl-8 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[170px] shrink-0 cursor-pointer">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent position="popper" className="duration-150 ease-out">
            <SelectItem value="all" className="cursor-pointer">Todos los estados</SelectItem>
            <SelectItem value="requested" className="cursor-pointer">Solicitado</SelectItem>
            <SelectItem value="in-process" className="cursor-pointer">En proceso</SelectItem>
            <SelectItem value="ordered" className="cursor-pointer">Pedido realizado</SelectItem>
            <SelectItem value="delivered" className="cursor-pointer">Entregado</SelectItem>
            <SelectItem value="returned" className="cursor-pointer">Devuelto</SelectItem>
            <SelectItem value="cancelled" className="cursor-pointer">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-full sm:w-[170px] shrink-0 cursor-pointer">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent position="popper" className="duration-150 ease-out">
            <SelectItem value="all" className="cursor-pointer">Todas las prioridades</SelectItem>
            <SelectItem value="critical" className="cursor-pointer">Crítica</SelectItem>
            <SelectItem value="high" className="cursor-pointer">Alta</SelectItem>
            <SelectItem value="medium" className="cursor-pointer">Media</SelectItem>
            <SelectItem value="low" className="cursor-pointer">Baja</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={openCreate} className="shrink-0 cursor-pointer">
          <Plus className="size-4 mr-1.5" />
          Nuevo pedido
        </Button>
      </div>

      {/* Orders */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Sin pedidos"
          description="No se encontraron pedidos con los filtros aplicados."
          action={<Button onClick={openCreate}><Plus className="size-4" />Nuevo pedido</Button>}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((order) => (
            <OrderCard 
              key={order.id} 
              order={order} 
              onEdit={openEdit} 
              onDelete={handleDelete} 
            />
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto scrollbar-none">
          <DialogHeader>
            <DialogTitle>{editingOrder ? "Editar pedido" : "Nuevo pedido a compras"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Ítem solicitado <span className="text-red-500">*</span></Label>
              <Input value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} placeholder="Toner HP 85A" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cantidad</Label>
                <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Categoría</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as Category })}>
                  <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
                  <SelectContent position="popper" className="duration-150 ease-out">
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="cursor-pointer">{categoryLabel(c)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prioridad</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as OrderPriority })}>
                  <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
                  <SelectContent position="popper" className="duration-150 ease-out">
                    <SelectItem value="critical" className="cursor-pointer">Crítica</SelectItem>
                    <SelectItem value="high" className="cursor-pointer">Alta</SelectItem>
                    <SelectItem value="medium" className="cursor-pointer">Media</SelectItem>
                    <SelectItem value="low" className="cursor-pointer">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Solicitante <span className="text-red-500">*</span></Label>
                <Input value={form.requestedBy} onChange={(e) => setForm({ ...form, requestedBy: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Motivo de la solicitud <span className="text-red-500">*</span></Label>
              <AutoResizeTextarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Describí el motivo del pedido..."
                rows={2}
                minHeight={60}
                maxHeight={220}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observaciones adicionales</Label>
              <AutoResizeTextarea 
                value={form.notes} 
                onChange={(e) => setForm({ ...form, notes: e.target.value })} 
                placeholder="Detalles u observaciones adicionales..."
                rows={2}
                minHeight={60}
                maxHeight={220}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-row items-center justify-end gap-2">
            <Button onClick={handleSave} className="cursor-pointer"><Save className="size-4 mr-1.5" />{editingOrder ? "Guardar" : "Crear pedido"}</Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="cursor-pointer">Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
