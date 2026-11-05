import { useState, useMemo, useEffect, useRef } from "react";
import { 
  Plus, Search, Trash2, Copy, Pin, FileText, ArrowLeft 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { SystemNote } from "@/types";

const CATEGORIES = ["General", "Credenciales", "Procedimientos", "IPs/Redes", "Contactos", "Licencias"];

const CATEGORY_CONFIG: Record<string, { label: string; dotClass: string; badgeClass: string }> = {
  General: {
    label: "General",
    dotClass: "bg-slate-400",
    badgeClass: "bg-slate-500/10 text-slate-300 border-slate-500/20"
  },
  Credenciales: {
    label: "Credenciales",
    dotClass: "bg-amber-400",
    badgeClass: "bg-amber-500/10 text-amber-300 border-amber-500/20"
  },
  Procedimientos: {
    label: "Procedimientos",
    dotClass: "bg-emerald-400",
    badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
  },
  "IPs/Redes": {
    label: "IPs/Redes",
    dotClass: "bg-blue-400",
    badgeClass: "bg-blue-500/10 text-blue-300 border-blue-500/20"
  },
  Contactos: {
    label: "Contactos",
    dotClass: "bg-rose-400",
    badgeClass: "bg-rose-500/10 text-rose-300 border-rose-500/20"
  },
  Licencias: {
    label: "Licencias",
    dotClass: "bg-purple-400",
    badgeClass: "bg-purple-500/10 text-purple-300 border-purple-500/20"
  },
};

const getCategoryBadgeStyle = (category: string, isActive: boolean) => {
  if (isActive) {
    return "bg-primary-foreground text-primary border border-transparent shadow-sm font-semibold";
  }
  switch (category) {
    case "Credenciales":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-250 dark:border-amber-900/40";
    case "Procedimientos":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-250 dark:border-emerald-900/40";
    case "IPs/Redes":
      return "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-250 dark:border-blue-900/40";
    case "Contactos":
      return "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-250 dark:border-rose-900/40";
    case "Licencias":
      return "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-250 dark:border-purple-900/40";
    default: // General
      return "bg-slate-100 text-slate-800 dark:bg-slate-800/60 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60";
  }
};

const getCategoryLeftBorder = (category: string) => {
  switch (category) {
    case "Credenciales": return "border-l-amber-500 dark:border-l-amber-600";
    case "Procedimientos": return "border-l-emerald-500 dark:border-l-emerald-600";
    case "IPs/Redes": return "border-l-blue-500 dark:border-l-blue-600";
    case "Contactos": return "border-l-rose-500 dark:border-l-rose-600";
    case "Licencias": return "border-l-purple-500 dark:border-l-purple-600";
    default: return "border-l-slate-400 dark:border-l-slate-600";
  }
};


export function NotesPage() {
  const { notes, addNote, updateNote, deleteNote, reorderNotes } = useApp();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list');
  
  // Drag and Drop state
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedNoteId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedNoteId || draggedNoteId === targetId) return;

    const draggedIndex = notes.findIndex(n => n.id === draggedNoteId);
    const targetIndex = notes.findIndex(n => n.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const newNotes = [...notes];
    const [draggedNote] = newNotes.splice(draggedIndex, 1);
    newNotes.splice(targetIndex, 0, draggedNote);

    // Re-assign sort orders
    const updatedNotes = newNotes.map((n, idx) => ({ ...n, sortOrder: idx }));
    await reorderNotes(updatedNotes);
    setDraggedNoteId(null);
  };
  
  // Form/Editor temporary state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");
  const [isPinned, setIsPinned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Debounced auto-save ref
  const saveTimeoutRef = useRef<any | null>(null);
  const isEditingRef = useRef(false);

  const activeNote = useMemo(() => {
    return notes.find(n => n.id === activeNoteId) || null;
  }, [notes, activeNoteId]);

  // Load active note to editor
  useEffect(() => {
    if (activeNote) {
      isEditingRef.current = true;
      setTitle(activeNote.title);
      setContent(activeNote.content);
      setCategory(activeNote.category);
      setIsPinned(activeNote.isPinned);
      // Wait for next tick so any immediate change event doesn't trigger save
      setTimeout(() => {
        isEditingRef.current = false;
      }, 50);
    } else {
      setTitle("");
      setContent("");
      setCategory("General");
      setIsPinned(false);
    }
  }, [activeNoteId]); // Only trigger when the selected note ID changes

  // Auto-save logic
  const triggerAutoSave = (updatedFields: Partial<SystemNote>) => {
    if (!activeNoteId || isEditingRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setIsSaving(true);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await updateNote(activeNoteId, updatedFields);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSaving(false);
      }
    }, 1000); // Save after 1 second of inactivity
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    triggerAutoSave({ title: val });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    triggerAutoSave({ content: val });
  };

  const handleCategoryChange = (val: string) => {
    setCategory(val);
    if (activeNoteId) {
      updateNote(activeNoteId, { category: val });
      toast.success("Categoría actualizada");
    }
  };

  const handleTogglePin = async (note: SystemNote) => {
    await updateNote(note.id, { isPinned: !note.isPinned });
    if (note.id === activeNoteId) {
      setIsPinned(!note.isPinned);
    }
    toast.success(note.isPinned ? "Nota desanclada" : "Nota anclada");
  };

  const handleCreateNote = async () => {
    const newNoteId = await addNote({
      title: "Nueva Nota",
      content: "",
      category: selectedCategory === "all" ? "General" : selectedCategory,
      isPinned: false
    });
    setActiveNoteId(newNoteId);
    setMobileView('editor');
    toast.success("Nota creada");
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("¿Estás seguro de que querés eliminar esta nota?")) {
      await deleteNote(id);
      if (activeNoteId === id) {
        setActiveNoteId(notes.length > 1 ? notes.find(n => n.id !== id)?.id || null : null);
      }
      toast.success("Nota eliminada");
    }
  };

  // Filter notes based on search and category
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const matchSearch = 
        !search ||
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.toLowerCase().includes(search.toLowerCase());
      
      const matchCategory = selectedCategory === "all" || n.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [notes, search, selectedCategory]);

  // Split into pinned and normal
  const { pinnedNotes, normalNotes } = useMemo(() => {
    const pinned = filteredNotes.filter(n => n.isPinned);
    const normal = filteredNotes.filter(n => !n.isPinned);
    return { pinnedNotes: pinned, normalNotes: normal };
  }, [filteredNotes]);

  // Handle clipboard copy
  const handleCopyContent = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    toast.success("Contenido copiado al portapapeles");
  };

  // Auto-focus select first note if none active
  useEffect(() => {
    if (notes.length > 0 && !activeNoteId) {
      setActiveNoteId(notes[0].id);
    }
  }, [notes, activeNoteId]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
      {/* Panel Izquierdo: Lista de Notas */}
      <div className={`w-full md:w-[540px] lg:w-[600px] xl:w-[640px] border-r flex-col bg-muted/10 shrink-0 ${mobileView === 'editor' ? 'hidden md:flex' : 'flex mobile-slide-in'}`}>
        {/* Buscador & Nuevo */}
        <div className="p-3.5 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar notas..."
                className="pl-8 h-9 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button size="icon" variant="outline" className="size-9 shrink-0 cursor-pointer" onClick={handleCreateNote} title="Crear nueva nota">
              <Plus className="size-4" />
            </Button>
          </div>

          {/* Categorías (Todas en una sola línea) */}
          <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto scrollbar-none pt-0.5">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="xs"
              className={`text-[10.5px] h-6.5 px-2.5 rounded-full shrink-0 transition-all cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/80 border-border/70"
              }`}
              onClick={() => setSelectedCategory("all")}
            >
              Todos
            </Button>
            {CATEGORIES.map(cat => {
              const isSelected = selectedCategory === cat;
              return (
                <Button
                  key={cat}
                  variant={isSelected ? "default" : "outline"}
                  size="xs"
                  className={`text-[10.5px] h-6.5 px-2.5 rounded-full shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/80 border-border/70"
                  }`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  <span
                    className={`size-1.5 rounded-full shrink-0 ${
                      isSelected ? "bg-primary-foreground" : CATEGORY_CONFIG[cat]?.dotClass || "bg-slate-400"
                    }`}
                  />
                  <span>{cat}</span>
                </Button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {pinnedNotes.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase px-2 tracking-wider flex items-center gap-1">
                <Pin className="size-2.5 rotate-45 fill-current" /> Anclados
              </p>
              {pinnedNotes.map(note => (
                <div
                  key={note.id}
                  onClick={() => { setActiveNoteId(note.id); setMobileView('editor'); }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, note.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, note.id)}
                  className={`group relative flex flex-col gap-2 rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all text-left border-l-4 ${
                    draggedNoteId === note.id ? "opacity-40" : ""
                  } ${
                    activeNoteId === note.id
                      ? "bg-primary text-primary-foreground border-l-primary shadow-md scale-[1.01]"
                      : `hover:bg-muted bg-background/60 border border-border/40 ${getCategoryLeftBorder(note.category)}`
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-xs truncate flex-1 leading-tight">
                      {note.title || "Sin título"}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTogglePin(note); }}
                      className={`shrink-0 opacity-80 group-hover:opacity-100 ${activeNoteId === note.id ? "text-primary-foreground" : "text-muted-foreground"}`}
                    >
                      <Pin className="size-3 fill-current rotate-45" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium transition-colors ${getCategoryBadgeStyle(note.category, activeNoteId === note.id)}`}>
                      {note.category}
                    </span>
                    <button
                      onClick={(e) => handleDeleteNote(note.id, e)}
                      className={`opacity-0 group-hover:opacity-100 p-0.5 transition-opacity ${
                        activeNoteId === note.id ? "text-white hover:text-white/80" : "text-rose-500 hover:text-rose-600"
                      }`}
                      title="Eliminar nota"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1">
            {pinnedNotes.length > 0 && normalNotes.length > 0 && (
              <p className="text-[10px] font-bold text-muted-foreground uppercase px-2 tracking-wider mt-2">
                Notas
              </p>
            )}
            {normalNotes.map(note => (
              <div
                key={note.id}
                onClick={() => { setActiveNoteId(note.id); setMobileView('editor'); }}
                draggable
                onDragStart={(e) => handleDragStart(e, note.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, note.id)}
                className={`group relative flex flex-col gap-2 rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all text-left border-l-4 ${
                  draggedNoteId === note.id ? "opacity-40" : ""
                } ${
                  activeNoteId === note.id
                    ? "bg-primary text-primary-foreground border-l-primary shadow-md scale-[1.01]"
                    : `hover:bg-muted bg-background/60 border border-border/40 ${getCategoryLeftBorder(note.category)}`
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-xs truncate flex-1 leading-tight">
                    {note.title || "Sin título"}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleTogglePin(note); }}
                    className={`opacity-0 group-hover:opacity-100 shrink-0 ${activeNoteId === note.id ? "text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    <Pin className="size-3 rotate-45" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium transition-colors ${getCategoryBadgeStyle(note.category, activeNoteId === note.id)}`}>
                    {note.category}
                  </span>
                  <button
                    onClick={(e) => handleDeleteNote(note.id, e)}
                    className={`opacity-0 group-hover:opacity-100 p-0.5 transition-opacity ${
                      activeNoteId === note.id ? "text-white hover:text-white/80" : "text-rose-500 hover:text-rose-600"
                    }`}
                    title="Eliminar nota"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredNotes.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No hay notas que coincidan.
            </div>
          )}
        </div>
      </div>

      {/* Panel Derecho: Editor Activo */}
      <div className={`flex-1 flex-col bg-background relative overflow-y-auto ${mobileView === 'list' ? 'hidden md:flex' : 'flex mobile-slide-in'}`}>
        {activeNote ? (
          <div className="flex-1 flex flex-col p-4 md:p-6 space-y-4 h-full min-h-0">
            {/* Header del editor */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Button variant="ghost" size="sm" className="md:hidden text-xs px-2 h-8" onClick={() => setMobileView('list')}>
                  <ArrowLeft className="size-3.5 mr-1" /> Lista
                </Button>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:inline">Categoría:</span>
                <Select value={category} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="h-8.5 w-[170px] text-xs font-medium cursor-pointer bg-card/60 border-border/80 shadow-xs">
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="duration-150 ease-out">
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="cursor-pointer text-xs">
                        <span className="flex items-center gap-2">
                          <span className={`size-2 rounded-full shrink-0 ${CATEGORY_CONFIG[cat]?.dotClass || "bg-slate-400"}`} />
                          <span>{cat}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                {isSaving && (
                  <span className="text-[10px] text-muted-foreground italic flex items-center gap-1 animate-pulse">
                    Guardando...
                  </span>
                )}
                <Button variant="outline" size="sm" onClick={handleCopyContent} title="Copiar nota al portapapeles" className="cursor-pointer">
                  <Copy className="size-3.5 mr-1.5" /> Copiar todo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTogglePin(activeNote)}
                  className={`cursor-pointer ${isPinned ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400" : ""}`}
                >
                  <Pin className={`size-3.5 mr-1.5 ${isPinned ? "fill-current" : ""}`} /> 
                  {isPinned ? "Anclada" : "Anclar"}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Input de Título */}
            <Input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="Título de la nota..."
              className="text-xl font-bold border-none shadow-none px-0 focus-visible:ring-0 focus-visible:border-none focus-visible:outline-none"
            />

            {/* Editor de Texto */}
            <Textarea
              value={content}
              onChange={handleContentChange}
              placeholder="Escribí tus notas, procedimientos o credenciales acá..."
              className="flex-1 text-sm border-none shadow-none px-0 resize-none focus-visible:ring-0 focus-visible:outline-none font-sans leading-relaxed"
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={FileText}
              title="Guardá tus Datos y Notas"
              description="Creá notas importantes, credenciales de sistemas, procedimientos e IPs rápidas en un solo lugar seguro."
              action={
                <Button onClick={handleCreateNote} className="cursor-pointer">
                  <Plus className="size-4 mr-2" /> Crear primera nota
                </Button>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
