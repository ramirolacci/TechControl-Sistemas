import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type {
  StockItem,
  Printer,
  Notebook,
  Order,
  Movement,
  OrderStatus,
  NotebookStatus,
  DataliveTV,
  Monitor,
  User,
  Guardia,
  SystemNote,
  OfficeTicket,
  DatabaseCredential,
  Objective,
  SpecialTask,
  SpecialEvent,
  ProductPrice,
  ProductPriceCategory,
} from "../types";
import {
  stockItems as initialItems,
  printers as initialPrinters,
  notebooks as initialNotebooks,
  monitors as initialMonitors,
  users as initialUsers,
  orders as initialOrders,
  movements as initialMovements,
  dataliveTVs as initialTVs,
  guardias as initialGuardias,
  systemNotes as initialNotes,
} from "../data/mock";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { getEffectivePrinterStatus, getEffectivePrinterBranch } from "@/lib/utils-app";

function guardiaFromDb(g: Record<string, unknown>): Guardia {
  return {
    id: g.id as string,
    date: g.date as string,
    startTime: g.start_time as string,
    endTime: g.end_time as string,
    hours: Number(g.hours),
    userId: g.user_id as string,
    userName: g.user_name as string,
    type: g.type as Guardia["type"],
    description: g.description as string,
    branchesAffected: (g.branches_affected as string) || undefined,
    status: g.status as Guardia["status"],
    notes: (g.notes as string) || undefined,
    createdAt: g.created_at as string,
    updatedAt: g.updated_at as string,
  };
}

function guardiaToDb(g: Guardia) {
  return {
    id: g.id,
    date: g.date,
    start_time: g.startTime,
    end_time: g.endTime,
    hours: g.hours,
    user_id: g.userId,
    user_name: g.userName,
    type: g.type,
    description: g.description,
    branches_affected: g.branchesAffected || "",
    status: g.status,
    notes: g.notes || "",
    created_at: g.createdAt,
    updated_at: g.updatedAt,
  };
}

function dedupeGuardias(list: Guardia[]): Guardia[] {
  const byId = new Map<string, Guardia>();
  for (const g of list) byId.set(g.id, g);
  return Array.from(byId.values());
}

interface AppContextValue {
  // Data
  stockItems: StockItem[];
  printers: Printer[];
  notebooks: Notebook[];
  monitors: Monitor[];
  users: User[];
  orders: Order[];
  movements: Movement[];
  dataliveTVs: DataliveTV[];
  guardias: Guardia[];

  // Stock actions
  addStockItem: (item: Omit<StockItem, "id" | "createdAt" | "updatedAt">) => void;
  updateStockItem: (id: string, data: Partial<StockItem>) => void;
  deleteStockItem: (id: string) => void;

  // Printer actions
  addPrinter: (p: Omit<Printer, "id" | "createdAt" | "updatedAt">) => void;
  updatePrinter: (id: string, data: Partial<Printer>) => void;
  deletePrinter: (id: string) => void;

  // Notebook actions
  addNotebook: (n: Omit<Notebook, "id" | "createdAt" | "updatedAt">) => void;
  updateNotebook: (id: string, data: Partial<Notebook>) => void;
  updateNotebookStatus: (id: string, status: NotebookStatus) => void;
  deleteNotebook: (id: string) => void;

  // Monitor actions
  addMonitor: (m: Omit<Monitor, "id" | "createdAt" | "updatedAt">) => void;
  updateMonitor: (id: string, data: Partial<Monitor>) => void;
  deleteMonitor: (id: string) => void;

  // User actions
  addUser: (u: Omit<User, "id" | "createdAt" | "updatedAt">) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;

  // Order actions
  addOrder: (o: Omit<Order, "id" | "requestedAt" | "history">) => void;
  updateOrder: (id: string, data: Partial<Order>) => void;
  updateOrderStatus: (id: string, status: OrderStatus, notes?: string, changedBy?: string) => void;
  deleteOrder: (id: string) => void;

  // Movement actions
  addMovement: (m: Omit<Movement, "id">) => void;

  // DataliveTV actions
  addDataliveTV: (tv: Omit<DataliveTV, "id" | "createdAt" | "updatedAt">) => void;
  updateDataliveTV: (id: string, data: Partial<DataliveTV>) => void;
  deleteDataliveTV: (id: string) => void;

  // Guardia actions
  addGuardia: (g: Omit<Guardia, "id" | "createdAt" | "updatedAt" | "hours">) => void;
  updateGuardia: (id: string, data: Partial<Guardia>) => void;
  deleteGuardia: (id: string) => void;

  notes: SystemNote[];
  addNote: (note: Omit<SystemNote, "id" | "createdAt" | "updatedAt">) => Promise<string>;
  updateNote: (id: string, data: Partial<SystemNote>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  reorderNotes: (reorderedNotes: SystemNote[]) => Promise<void>;

  officeTickets: OfficeTicket[];
  addOfficeTicket: (ticket: Omit<OfficeTicket, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateOfficeTicket: (id: string, data: Partial<OfficeTicket>) => Promise<void>;
  deleteOfficeTicket: (id: string) => Promise<void>;

  databaseCredentials: DatabaseCredential[];
  addDatabaseCredential: (credential: Omit<DatabaseCredential, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateDatabaseCredential: (id: string, data: Partial<DatabaseCredential>) => Promise<void>;
  deleteDatabaseCredential: (id: string) => Promise<void>;

  objectives: Objective[];
  addObjective: (objective: Omit<Objective, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateObjective: (id: string, data: Partial<Objective>) => Promise<void>;
  deleteObjective: (id: string) => Promise<void>;

  specialTasks: SpecialTask[];
  addSpecialTask: (specialTask: Omit<SpecialTask, "id" | "createdAt" | "updatedAt">) => Promise<SpecialTask>;
  updateSpecialTask: (id: string, data: Partial<SpecialTask>) => Promise<void>;
  deleteSpecialTask: (id: string) => Promise<void>;
  syncSpecialTasksFromSupabase: () => Promise<void>;

  specialEvents: SpecialEvent[];
  saveSpecialEvent: (event: SpecialEvent) => Promise<boolean>;
  deleteSpecialEvent: (eventId: string) => Promise<boolean>;
  syncSpecialEventsFromSupabase: () => Promise<void>;


  // Holiday and Turn Overrides
  holidayAssignments: Record<string, string>;
  turnOverrides: Record<string, string>;
  setHolidayAssignment: (date: string, userId: string) => Promise<void>;
  setTurnOverride: (date: string, user: string) => Promise<void>;
  clearTurnOverride: (date: string) => Promise<void>;

  // Navigation state
  currentPage: string;
  setCurrentPage: (page: string) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  loading: boolean;
  migrateAllData: () => Promise<void>;
  guardiasViewMode: "list" | "calendar";
  setGuardiasViewMode: (mode: "list" | "calendar") => void;

  // Session & Auth state
  session: any;
  userRole: "sistemas" | "marketing" | null;
  loadingSession: boolean;
  logout: () => Promise<void>;

  // Product Prices state
  productPrices: ProductPrice[];
  addProductPrice: (item: Omit<ProductPrice, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateProductPrice: (id: string, data: Partial<ProductPrice>) => Promise<void>;
  deleteProductPrice: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const pathMap: Record<string, string> = {
  "printers": "impresoras",
  "notebooks": "equipos",
  "monitors": "monitores",
  "catalog": "catalogo",
  "orders": "pedidos",
  "movements": "movimientos",
  "personal": "personal",
  "reports": "reportes",
  "datalive": "datalive",
  "notes": "notas",
  "databases": "bases",
  "office-tickets": "tareas-oficina",
  "objectives": "objetivos",
  "special-tasks": "campanias",
  "guardias": "guardias"
};

const getPageFromPath = (): string => {
  const hash = window.location.hash.replace(/^#\/?/, "").replace(/\/$/, "").split("?")[0];
  const pathname = window.location.pathname.replace(/\/$/, "");
  const searchParam = new URLSearchParams(window.location.search).get("page");

  for (const [page, route] of Object.entries(pathMap)) {
    if (hash === route || searchParam === page || pathname.endsWith("/" + route)) {
      return page;
    }
  }
  return "guardias";
};

const getPathFromPage = (page: string): string => {
  return pathMap[page] || "guardias";
};

// Helper to save data to localStorage safely without throwing QuotaExceededError when base64 images are stored
const safeLocalStorageSetItem = (key: string, data: any) => {
  try {
    let payload = data;
    if (typeof data === "object" && data !== null) {
      payload = JSON.stringify(payload);
    }
    localStorage.setItem(key, payload);
  } catch (e) {
    try {
      // Auto-prune non-essential cache keys to free up space
      const keysToClear = ["techcontrol_guardias", "techcontrol_special_tasks", "techcontrol_special_events", "techcontrol_notes", "techcontrol_product_prices"];
      for (const k of keysToClear) {
        if (k !== key) {
          localStorage.removeItem(k);
        }
      }
      let payload = data;
      if (typeof data === "object" && data !== null) {
        payload = JSON.stringify(payload);
      }
      localStorage.setItem(key, payload);
    } catch (retryErr) {
      // Safely ignore if storage quota remains full
    }
  }
};

const DATALIVE_BRANCH_LIST = [
  'Ballester', 'Balvanera', 'Barrancas de Belgrano', 'Bella Vista',
  'Belgrano', 'Caballito', 'Campana', 'Canitas', 'Delviso',
  'Don Torcuato', 'Devoto', 'Escobar', 'Floresta', 'Florida',
  'Hurlingham', 'Ituzaingo', 'Jose C Paz', 'Maschwitz', 'Martinez',
  'Mataderos', 'Merlo', 'Moreno', 'Muniz', 'Munro', 'Pacheco',
  'Palermo', 'Paternal', 'Pilar Centro', 'Pilar Derqui', 'Polvorines',
  'Puerto Madero', 'San Fernando', 'San Martin', 'San Miguel',
  'Tigre', 'Vicente Lopez', 'Villa Adelina', 'Villa Crespo',
  'Villa Urquiza'
];

const DATALIVE_BRANCH_TASKS = [
  { id: "task-datalive-ballester", title: "Migrar BALLESTER !", completed: true },
  { id: "task-datalive-campana", title: "Migrar CAMPANA !", completed: false },
  ...DATALIVE_BRANCH_LIST
    .filter(b => b !== 'Ballester' && b !== 'Campana')
    .map((branch) => ({
      id: `task-datalive-${branch.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-')}`,
      title: `Migrar ${branch.toUpperCase()}`,
      completed: true
    }))
];

const DEFAULT_PHOTO_OBJECTIVES: Objective[] = [
  {
    id: "obj-pickeos-bandejas",
    title: "Continuar proyecto de APP DE PICKEOS de bandejas",
    description: "",
    category: "other",
    horizon: "Q3 2026",
    status: "pending",
    priority: "medium",
    startDate: "2026-09-01",
    endDate: "2026-12-30",
    progress: 0,
    assignedTo: ["Facundo Carrizo", "Ramiro Lacci"],
    tasks: [
      { id: "t-pickeos-1", title: "Evaluar instacia actual de la app por parte de Datalive", completed: false },
      { id: "t-pickeos-2", title: "Intentar replicarla nosotros y evaluar tiempo de desarrollo menor al de data", completed: false }
    ],
    notes: "",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z"
  },
  {
    id: "obj-rp-sistemas",
    title: "Investigacion y reconocimiento de RP sistemas",
    description: "Aprender a fondo el funcionamiento completo de RP sistemas para poder dar catedra de uso dentro de fabrica para colaboradores y encargados",
    category: "infrastructure",
    horizon: "Q3 2026",
    status: "in-progress",
    priority: "medium",
    startDate: "2026-09-01",
    endDate: "2026-12-30",
    progress: 0,
    assignedTo: ["Facundo Carrizo", "Ramiro Lacci"],
    tasks: [
      { id: "t-rp-1", title: "Ver videos tutoriales", completed: false },
      { id: "t-rp-2", title: "Probar con usuario Piloto", completed: false },
      { id: "t-rp-3", title: "Hacer pruebas de funciones especificas", completed: false },
      { id: "t-rp-4", title: "Probar cada modulo", completed: false }
    ],
    notes: "",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z"
  }
];

const ensureDataliveObjective = (existingObjectives: Objective[]): Objective[] => {
  let list = [...existingObjectives];

  // Ensure photo objectives exist
  for (const photoObj of DEFAULT_PHOTO_OBJECTIVES) {
    const exists = list.some(o => o.id === photoObj.id || o.title.toLowerCase().trim() === photoObj.title.toLowerCase().trim());
    if (!exists) {
      list.push(photoObj);
      // Silently insert into Supabase if missing
      supabase.from("objectives").insert({
        id: photoObj.id,
        title: photoObj.title,
        description: photoObj.description || null,
        category: photoObj.category || null,
        horizon: photoObj.horizon || null,
        status: photoObj.status,
        priority: photoObj.priority,
        start_date: photoObj.startDate || null,
        end_date: photoObj.endDate || null,
        progress: photoObj.progress,
        assigned_to: photoObj.assignedTo || [],
        tasks: photoObj.tasks || [],
        notes: photoObj.notes || null,
        created_at: photoObj.createdAt,
        updated_at: photoObj.updatedAt
      }).then(({ error }) => {
        if (error) console.warn("Could not seed default objective to Supabase:", error);
      });
    }
  }

  const dataliveIndex = list.findIndex(o =>
    o.title.toLowerCase().includes("datalive") || o.id === "obj-datalive-migration"
  );

  const completedCount = DATALIVE_BRANCH_TASKS.filter(t => t.completed).length;
  const progress = Math.round((completedCount / DATALIVE_BRANCH_TASKS.length) * 100);

  if (dataliveIndex >= 0) {
    const target = list[dataliveIndex];
    list[dataliveIndex] = {
      ...target,
      title: "Migración completa DataliveTV",
      description: target.description || "Migración completa de todas las sucursales a Datalive TV.",
      tasks: DATALIVE_BRANCH_TASKS,
      progress,
      status: progress === 100 ? "completed" : "in-progress",
      updatedAt: new Date().toISOString()
    };
    return list;
  } else {
    const newObj: Objective = {
      id: "obj-datalive-migration",
      title: "Migración completa DataliveTV",
      description: "Migración completa de todas las sucursales a Datalive TV.",
      category: "software",
      horizon: "Q3 2026",
      status: "in-progress",
      priority: "high",
      startDate: "2026-06-01",
      endDate: "2026-09-30",
      progress,
      assignedTo: ["Facundo Carrizo", "Ramiro Lacci", "Gustavo Gonzalez"],
      tasks: DATALIVE_BRANCH_TASKS,
      notes: "Pendiente de migración y configuración final únicamente Campana.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return [newObj, ...list];
  }
};

const dedupeSubTasks = (tasks: any[]): any[] => {
  if (!Array.isArray(tasks) || tasks.length === 0) return [];
  const map = new Map<string, any>();

  tasks.forEach(t => {
    if (!t) return;
    const title = (t.title || t.name || "").trim();
    const baseTitle = title.split(":")[0].replace(/!/g, "").trim().toLowerCase();
    const key = baseTitle || t.id || Math.random().toString();

    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...t, title: t.title || t.name, name: t.name || t.title });
    } else {
      const isCompleted = Boolean(t.completed || existing.completed);
      const finalTitle = (t.title && t.title.includes(":"))
        ? t.title
        : ((existing.title && existing.title.includes(":"))
          ? existing.title
          : (t.title || existing.title || t.name || existing.name));
      const imageUrl = t.imageUrl || existing.imageUrl;
      map.set(key, {
        ...existing,
        ...t,
        title: finalTitle,
        name: finalTitle,
        imageUrl,
        completed: isCompleted,
        completedAt: isCompleted ? (t.completedAt || existing.completedAt || new Date().toISOString()) : undefined
      });
    }
  });

  return Array.from(map.values());
};

const DEFAULT_SEPTEMBER_2026_EVENTS: SpecialEvent[] = [
  {
    id: "promo-2026-09-02-pack3",
    date: "2026-09-02",
    name: "PACK 3 $11900 TURNO MAÑANA",
    type: "promotion",
    price: 11900,
    tasks: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z"
  },
  {
    id: "promo-2026-09-02-mgl",
    date: "2026-09-02",
    name: "MGL TODO EL DIA",
    type: "onfire",
    tasks: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z"
  },
  {
    id: "promo-2026-09-07-pack6",
    date: "2026-09-07",
    name: "PACK 6 MPD",
    type: "promotion",
    tasks: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z"
  },
  {
    id: "promo-2026-09-09-pack6plus2",
    date: "2026-09-09",
    name: "PACK 6+2 TURNO NOCHE",
    type: "onfire",
    tasks: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z"
  },
  {
    id: "promo-2026-09-15-clasica",
    date: "2026-09-15",
    name: "PROMO CLASICA - NOCHE DE LA PIZZA Y EMPANADA",
    type: "promotion",
    tasks: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z"
  },
  {
    id: "promo-2026-09-23-pizzafamily",
    date: "2026-09-23",
    name: "PIZZA FAMILY MUZZA TURNO NOCHE",
    type: "promotion",
    tasks: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z"
  },
  {
    id: "promo-2026-09-24-juevesonfire",
    date: "2026-09-24",
    name: "JUEVES ON FIRE",
    type: "onfire",
    tasks: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z"
  },
  {
    id: "promo-2026-09-30-pizzaindi",
    date: "2026-09-30",
    name: "PIZZA INDI $9900 TURNO NOCHE",
    type: "promotion",
    price: 9900,
    tasks: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z"
  }
];

const ensureSeptemberEvents = (existing: SpecialEvent[]): SpecialEvent[] => {
  const map = new Map<string, SpecialEvent>();
  existing.forEach(e => map.set(e.id, e));
  DEFAULT_SEPTEMBER_2026_EVENTS.forEach(evt => {
    if (!map.has(evt.id)) {
      map.set(evt.id, evt);
    }
  });
  return Array.from(map.values());
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [stockItems, setStockItems] = useState<StockItem[]>(initialItems);
  const [printers, setPrinters] = useState<Printer[]>(initialPrinters);
  const [notebooks, setNotebooks] = useState<Notebook[]>(initialNotebooks);
  const [monitors, setMonitors] = useState<Monitor[]>(initialMonitors);
  const [users, setUsers] = useState<User[]>(() => {
    const resolveCollabAvatar = (fullName: string, currentAvatar?: string | null) => {
      if (currentAvatar) return currentAvatar;
      const name = (fullName || "").toLowerCase();
      if (name.includes("facundo")) return "Colaboradores/Facu.jpg";
      if (name.includes("gustavo")) return "Colaboradores/Gus.jpg";
      if (name.includes("ramiro")) return "Colaboradores/Rami.png";
      return null;
    };
    const saved = localStorage.getItem("techcontrol_users");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((u: User) => {
            const initial = initialUsers.find(iu => iu.id === u.id || iu.fullName.toLowerCase() === (u.fullName || "").toLowerCase());
            return {
              ...u,
              avatarUrl: resolveCollabAvatar(u.fullName, u.avatarUrl || initial?.avatarUrl),
            };
          });
        }
      } catch (e) { }
    }
    return initialUsers;
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [dataliveTVs, setDataliveTVs] = useState<DataliveTV[]>(initialTVs);
  const [guardias, setGuardias] = useState<Guardia[]>([]);
  const [notes, setNotes] = useState<SystemNote[]>([]);
  const [officeTickets, setOfficeTickets] = useState<OfficeTicket[]>([]);
  const [databaseCredentials, setDatabaseCredentials] = useState<DatabaseCredential[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>(() => {
    const saved = localStorage.getItem("techcontrol_objectives");
    let initialList: Objective[] = [];
    if (saved) {
      try { initialList = JSON.parse(saved); } catch (e) { initialList = []; }
    }
    return ensureDataliveObjective(initialList);
  });
  const [specialEvents, setSpecialEvents] = useState<SpecialEvent[]>(() => {
    const saved = localStorage.getItem("techcontrol_special_events");
    let initialList: SpecialEvent[] = [];
    if (saved) {
      try { initialList = JSON.parse(saved); } catch (e) { initialList = []; }
    }
    return ensureSeptemberEvents(initialList);
  });
  const [specialTasks, setSpecialTasks] = useState<SpecialTask[]>(() => {
    const saved = localStorage.getItem("techcontrol_special_tasks");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return [];
  });
  const [productPrices, setProductPrices] = useState<ProductPrice[]>([]);
  const [currentPage, setCurrentPage] = useState(() => {
    return getPageFromPath();
  });

  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<"sistemas" | "marketing" | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const getRoleFromEmail = (email?: string): "sistemas" | "marketing" | null => {
    if (!email) return null;
    const systemsEmails = [
      "facundocarrizo@migusto.com.ar",
      "ramirolacci@migusto.com.ar",
      "gustavo.gonzalez@migusto.com.ar",
      "facundocarrizo@migusto.com.ar", // Duplicate clean check
    ].map(e => e.toLowerCase().trim());

    const marketingEmails = [
      "sharonmoner@migusto.com.ar",
      "camilaferro@migusto.com.ar",
      "camiladiaz@migusto.com.ar",
      "rodrigoricobene@migusto.com.ar"
    ].map(e => e.toLowerCase().trim());

    const cleanEmail = email.toLowerCase().trim();
    if (systemsEmails.includes(cleanEmail)) return "sistemas";
    if (marketingEmails.includes(cleanEmail)) return "marketing";
    return null;
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const role = getRoleFromEmail(session?.user?.email);
      setUserRole(role);
      if (role === "marketing") {
        setCurrentPage("special-tasks");
      }
      setLoadingSession(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      const role = getRoleFromEmail(session?.user?.email);
      setUserRole(role);
      if (role === "marketing") {
        setCurrentPage("special-tasks");
      }
      setLoadingSession(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    setLoadingSession(true);
    await supabase.auth.signOut();
    setSession(null);
    setUserRole(null);
    setLoadingSession(false);
  };

  const handleSetCurrentPage = useCallback((page: string) => {
    if (userRole === "marketing") {
      setCurrentPage("special-tasks");
    } else {
      setCurrentPage(page);
    }
  }, [userRole]);

  useEffect(() => {
    const route = getPathFromPage(currentPage);
    const currentHash = window.location.hash.replace(/^#\/?/, "").replace(/\/$/, "").split("?")[0];
    const currentPath = window.location.pathname.replace(/\/$/, "");

    if (currentHash !== route && !currentPath.endsWith("/" + route)) {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const search = window.location.search;
      const newUrl = `${base}/${search}#/${route}`;
      window.history.pushState(null, '', newUrl);
    }
  }, [currentPage]);

  useEffect(() => {
    const handlePopState = () => {
      const pageFromPath = getPageFromPath();
      if (pageFromPath !== currentPage) {
        if (userRole === "marketing") {
          setCurrentPage("special-tasks");
        } else {
          setCurrentPage(pageFromPath);
        }
      }
    };
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("hashchange", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handlePopState);
    };
  }, [currentPage, userRole]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardiasViewMode, setGuardiasViewMode] = useState<"list" | "calendar">("list");

  // New settings states
  const [holidayAssignments, setHolidayAssignments] = useState<Record<string, string>>({});
  const [turnOverrides, setTurnOverrides] = useState<Record<string, string>>({});
  const [hasDbHolidayAssignments, setHasDbHolidayAssignments] = useState(true);
  const [hasDbTurnOverrides, setHasDbTurnOverrides] = useState(true);

  const syncGuardiasFromSupabase = useCallback(async () => {
    try {
      const { data: gds, error: gdsError } = await supabase.from("guardias").select("*");

      let sourceGuardias: Guardia[] = [];
      if (gds && !gdsError && gds.length > 0) {
        sourceGuardias = gds.map((g) => guardiaFromDb(g as Record<string, unknown>));
      } else {
        const saved = localStorage.getItem("techcontrol_guardias");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              sourceGuardias = parsed;
            }
          } catch (e) { }
        }
        if (sourceGuardias.length === 0) {
          sourceGuardias = initialGuardias;
        }
      }

      const mappedGuardias = dedupeGuardias(sourceGuardias);
      setGuardias(mappedGuardias);
      safeLocalStorageSetItem("techcontrol_guardias", mappedGuardias);

      if (gdsError) {
        console.warn("Supabase guardias query returned error (table might not exist yet):", gdsError);
      }
      return mappedGuardias;
    } catch (err) {
      console.warn("Could not load guardias from Supabase:", err);
      const saved = localStorage.getItem("techcontrol_guardias");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setGuardias(parsed);
            return parsed;
          }
        } catch (e) { }
      }
      setGuardias(initialGuardias);
      return initialGuardias;
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let dbUsers: User[] = [];
    try {
      const [
        { data: items },
        { data: pts },
        { data: nbs },
        { data: mons },
        { data: usr },
        { data: ords },
        { data: movs },
        { data: tvs },
        { data: sysNotes },
        { data: dbTickets, error: ticketsError },
        { data: dbCreds, error: credsError },
        { data: dbObjectives, error: objectivesError },
        { data: dbSpecialTasks, error: specialTasksError }
      ] = await Promise.all([
        supabase.from("stock_items").select("*"),
        supabase.from("printers").select("*"),
        supabase.from("notebooks").select("*"),
        supabase.from("monitors").select("*"),
        supabase.from("users").select("*"),
        supabase.from("orders").select("*"),
        supabase.from("movements").select("*"),
        supabase.from("datalive_tvs").select("*"),
        supabase.from("system_notes").select("*").order("sort_order", { ascending: true }),
        supabase.from("office_tickets").select("*"),
        supabase.from("database_credentials").select("*").order("name", { ascending: true }),
        supabase.from("objectives").select("*"),
        supabase.from("special_tasks").select("*")
      ]);

      if (items) setStockItems(items.map(i => ({
        ...i,
        internalCode: i.internal_code,
        currentStock: i.current_stock,
        minStock: i.min_stock,
        createdAt: i.created_at,
        updatedAt: i.updated_at
      })));

      if (pts) {
        const mappedPts = pts.map(p => {
          let sectorName = (p.sector || "").trim();
          const sUpper = sectorName.toUpperCase();
          if (sUpper === "LOGISTICA" || sUpper === "LOGÍSTICA") {
            sectorName = "Logística";
          } else if (sUpper === "GENERAL" || sUpper === "• GENERAL •" || sUpper === "•GENERAL•") {
            sectorName = "• GENERAL •";
          } else if (sUpper === "VENTA" || sUpper === "VENTAS") {
            sectorName = "Ventas";
          } else if (sUpper === "DEPOSITO" || sUpper === "DEPÓSITO") {
            sectorName = "Depósito";
          }
          const printerObj = {
            ...p,
            sector: sectorName,
            branch: getEffectivePrinterBranch(sectorName),
            tonerModel: p.toner_model,
            tonerUnits:
              typeof p.toner_level === "number" && p.toner_level > 10
                ? Math.max(0, Math.round(p.toner_level / 20))
                : (p.toner_level ?? 0),
            tonerMinUnits: p.toner_min_units ?? 1,
            imageUnitModel: p.image_unit_model,
            imageUnitUnits:
              typeof p.image_unit_level === "number" && p.image_unit_level > 10
                ? Math.max(0, Math.round(p.image_unit_level / 20))
                : (p.image_unit_level ?? 0),
            imageUnitMinUnits: p.image_unit_min_units ?? 1,
            lastTonerChange: p.last_toner_change,
            lastImageUnitChange: p.last_image_unit_change,
            ipAddress: p.ip_address,
            serialNumber: p.serial_number,
            createdAt: p.created_at,
            updatedAt: p.updated_at
          };
          printerObj.status = getEffectivePrinterStatus(printerObj);
          return printerObj;
        });

        setPrinters(mappedPts);
      }

      if (nbs) setNotebooks(nbs.map(n => {
        let assignment = n.current_assignment;
        if (assignment && assignment.area) {
          const areaLower = assignment.area.toLowerCase();
          if (areaLower.includes("community manager")) {
            assignment = { ...assignment, area: "Marketing" };
          } else if (assignment.area === "Planta MG") {
            assignment = { ...assignment, area: "Fábrica" };
          } else if (areaLower.includes("fichaje") || areaLower.includes("seguridad")) {
            assignment = { ...assignment, area: "Seguridad" };
          }
        }
        return {
          ...n,
          serialNumber: n.serial_number,
          internalCode: n.internal_code,
          functionalStatus: n.functional_status,
          physicalCondition: n.physical_condition,
          currentAssignment: assignment,
          assignmentHistory: n.assignment_history,
          entryDate: n.entry_date,
          lastReviewDate: n.last_review_date,
          createdAt: n.created_at,
          updatedAt: n.updated_at,
          productKeyOEM: n.product_key_oem,
          productKeyInstalled: n.product_key_installed,
          activationStatus: n.activation_status,
          licenseChannel: n.license_channel,
          productId: n.product_id,
          uuid: n.uuid,
          biosVersion: n.bios_version,
          win11Evaluation: n.win11_evaluation,
          tpmInfo: n.tpm_info,
          currentUserLocal: n.current_user_local,
          coresThreads: n.cores_threads,
          ramModules: n.ram_modules,
          ramUsable: n.ram_usable
        };
      }));

      if (mons) setMonitors(mons.map(m => ({
        ...m,
        serialNumber: m.serial_number,
        internalCode: m.internal_code,
        physicalCondition: m.physical_condition,
        currentAssignment: m.current_assignment,
        entryDate: m.entry_date,
        createdAt: m.created_at,
        updatedAt: m.updated_at
      })));



      if (usr && usr.length > 0) {
        dbUsers = usr
          .filter((u) => Boolean(u?.id))
          .map((u) => {
            const username = typeof u.username === "string" && u.username.trim().length > 0
              ? u.username
              : (typeof u.full_name === "string" && u.full_name.trim().length > 0
                ? u.full_name
                : (typeof u.email === "string" && u.email.trim().length > 0
                  ? u.email
                  : "usuario"));

            return {
              id: u.id,
              username,
              fullName: typeof u.full_name === "string" && u.full_name.trim().length > 0
                ? u.full_name
                : username,
              email: u.email ?? null,
              phone: u.phone ?? null,
              location: u.location ?? "Sistemas",
              active: u.active ?? true,
              role: u.role ?? null,
              avatarUrl: u.avatar_url ?? null,
              createdAt: u.created_at ?? new Date().toISOString(),
              updatedAt: u.updated_at ?? new Date().toISOString(),
            };
          });
      }

      // Read saved local users first so user edits are not lost on refresh
      const savedUsersRaw = localStorage.getItem("techcontrol_users");
      const localUsersMap = new Map<string, User>();
      if (savedUsersRaw) {
        try {
          const parsed = JSON.parse(savedUsersRaw);
          if (Array.isArray(parsed)) {
            parsed.forEach((u: User) => {
              if (u?.id) localUsersMap.set(u.id, u);
            });
          }
        } catch (e) { }
      }

      // Helper to ensure collaborator avatars are always preserved
      const resolveCollaboratorAvatar = (fullName: string, currentAvatar?: string | null) => {
        if (currentAvatar) return currentAvatar;
        const name = (fullName || "").toLowerCase();
        if (name.includes("facundo")) return "Colaboradores/Facu.jpg";
        if (name.includes("gustavo")) return "Colaboradores/Gus.jpg";
        if (name.includes("ramiro")) return "Colaboradores/Rami.png";
        return null;
      };

      // Use initialUsers as baseline, overlaid with local modifications
      const userMap = new Map<string, User>();
      initialUsers.forEach(u => {
        const local = localUsersMap.get(u.id);
        const resolvedAvatar = resolveCollaboratorAvatar(u.fullName, local?.avatarUrl || u.avatarUrl);
        userMap.set(u.id, local ? { ...u, ...local, avatarUrl: resolvedAvatar } : { ...u, avatarUrl: resolvedAvatar });
      });

      // Also keep any custom user created locally that wasn't in initialUsers
      localUsersMap.forEach((u, id) => {
        if (!userMap.has(id)) {
          const resolvedAvatar = resolveCollaboratorAvatar(u.fullName, u.avatarUrl);
          userMap.set(id, { ...u, avatarUrl: resolvedAvatar });
        }
      });

      // Overlay with dbUsers details from Supabase if available
      dbUsers.forEach(u => {
        const existingKey = Array.from(userMap.entries()).find(
          ([_, existing]) => existing.id === u.id || existing.fullName.toLowerCase() === u.fullName.toLowerCase()
        )?.[0];
        if (existingKey) {
          const current = userMap.get(existingKey)!;
          const initial = initialUsers.find(iu => iu.id === current.id || iu.fullName.toLowerCase() === current.fullName.toLowerCase());
          const resolvedAvatar = resolveCollaboratorAvatar(
            current.fullName,
            u.avatarUrl || current.avatarUrl || initial?.avatarUrl
          );
          userMap.set(existingKey, {
            ...current,
            ...u,
            email: u.email || current.email,
            role: u.role || current.role,
            phone: u.phone || current.phone,
            username: u.username || current.username,
            avatarUrl: resolvedAvatar,
          });
        } else {
          const resolvedAvatar = resolveCollaboratorAvatar(u.fullName, u.avatarUrl);
          userMap.set(u.id, { ...u, avatarUrl: resolvedAvatar });
        }
      });

      const effectiveUsers = Array.from(userMap.values()).map((u) => {
        let loc = u.location || "Sistemas";
        if (loc.toLowerCase().includes("community manager")) {
          loc = "Marketing";
        } else if (loc === "Planta MG") {
          loc = "Fábrica";
        } else if (loc.toLowerCase().includes("fichaje") || loc.toLowerCase().includes("seguridad")) {
          loc = "Seguridad";
        }
        return { ...u, location: loc };
      });
      setUsers(effectiveUsers);
      safeLocalStorageSetItem("techcontrol_users", effectiveUsers);

      if (ords) setOrders(ords.map(o => ({
        ...o,
        itemName: o.item_name,
        requestedAt: o.requested_at,
        requestedBy: o.requested_by,
        relatedItemId: o.related_item_id,
        expectedDeliveryDate: o.expected_delivery_date
      })).sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()));

      if (movs) setMovements(movs.map(m => ({
        ...m,
        itemCategory: m.item_category,
        relatedOrderId: m.related_order_id,
        relatedAssetId: m.related_asset_id
      })));

      if (tvs && tvs.length > 0) {
        const dbMapped: DataliveTV[] = tvs.map(tv => ({
          id: tv.id,
          branch: tv.branch,
          name: tv.name,
          user: tv.username,
          deviceId: tv.device_id,
          pin: tv.pin,
          notes: tv.notes || undefined,
          createdAt: tv.created_at,
          updatedAt: tv.updated_at
        }));
        // Merge initialTVs with dbMapped, giving priority to initialTVs for branches modified locally (like Ballester) or combining them
        const dbMap = new Map<string, DataliveTV>(dbMapped.map(tv => [tv.id, tv]));
        // Remove old 'dtv-bal-soon' if present in dbMap
        dbMap.delete("dtv-bal-soon");
        initialTVs.forEach(tv => {
          if (!dbMap.has(tv.id)) {
            dbMap.set(tv.id, tv);
          }
        });
        const mergedTVs = Array.from(dbMap.values());
        setDataliveTVs(mergedTVs);
      } else {
        setDataliveTVs(initialTVs);
      }

      if (sysNotes) {
        const mappedNotes: SystemNote[] = sysNotes.map((n, idx) => ({
          id: n.id,
          title: n.title,
          content: n.content,
          category: n.category ?? "General",
          isPinned: n.is_pinned ?? false,
          sortOrder: typeof n.sort_order === "number" ? n.sort_order : idx,
          createdAt: n.created_at,
          updatedAt: n.updated_at
        }));

        mappedNotes.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

        const dbNoteIds = new Set(mappedNotes.map(n => n.id));
        const missingInitialNotes = initialNotes.filter(n => !dbNoteIds.has(n.id));

        if (missingInitialNotes.length > 0) {
          const mergedNotes = [...mappedNotes, ...missingInitialNotes];
          setNotes(mergedNotes);
          safeLocalStorageSetItem("techcontrol_notes", mergedNotes);

          // Silently upsert/insert missing initial notes to Supabase
          Promise.all(
            missingInitialNotes.map((n, idx) =>
              supabase.from("system_notes").insert({
                id: n.id,
                title: n.title,
                content: n.content,
                category: n.category,
                is_pinned: n.isPinned,
                sort_order: n.sortOrder ?? (mappedNotes.length + idx),
                created_at: n.createdAt,
                updated_at: n.updatedAt
              })
            )
          ).catch(err => console.warn("Error seeding missing notes to Supabase:", err));
        } else {
          setNotes(mappedNotes);
          safeLocalStorageSetItem("techcontrol_notes", mappedNotes);
        }
      } else {
        const saved = localStorage.getItem("techcontrol_notes");
        let localNotes: SystemNote[] = [];
        if (saved) {
          try {
            localNotes = JSON.parse(saved);
          } catch (e) { }
        }
        const localNoteIds = new Set(localNotes.map(n => n.id));
        const missingInitialNotes = initialNotes.filter(n => !localNoteIds.has(n.id));
        const mergedNotes = [...localNotes, ...missingInitialNotes];
        setNotes(mergedNotes);
      }

      if (dbTickets && !ticketsError) {
        const mappedTickets = dbTickets.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description || "",
          category: t.category,
          customCategory: t.custom_category || undefined,
          userId: t.user_id,
          userName: t.user_name,
          date: t.date,
          durationMinutes: t.duration_minutes,
          createdAt: t.created_at,
          updatedAt: t.updated_at
        }));
        setOfficeTickets(mappedTickets);
        safeLocalStorageSetItem("techcontrol_office_tickets", mappedTickets);
      } else {
        const saved = localStorage.getItem("techcontrol_office_tickets");
        if (saved) {
          try {
            setOfficeTickets(JSON.parse(saved));
          } catch (e) {
            setOfficeTickets([]);
          }
        } else {
          setOfficeTickets([]);
        }
      }

      if (dbCreds && !credsError) {
        const mappedCreds = dbCreds.map(c => ({
          id: c.id,
          name: c.name,
          engine: c.engine,
          host: c.host,
          port: c.port || undefined,
          databaseName: c.database_name || undefined,
          username: c.username || undefined,
          password: c.password || undefined,
          notes: c.notes || undefined,
          project1: c.project_1 || undefined,
          project2: c.project_2 || undefined,
          createdAt: c.created_at,
          updatedAt: c.updated_at
        }));

        if (mappedCreds.length === 0) {
          const SEED_DATABASES: DatabaseCredential[] = [
            { id: "db-1", name: "MiGusto DB 1", engine: "postgres", host: "database1@migusto.com.ar", password: "MiGusto123.", project1: "Fabrica MES", project2: "Romi Rooms", createdAt: now(), updatedAt: now() },
            { id: "db-2", name: "MiGusto DB 2", engine: "postgres", host: "database2@migusto.com.ar", password: "MiGusto123.", project1: "Fabrica DataCenter", project2: "", createdAt: now(), updatedAt: now() },
            { id: "db-3", name: "MiGusto DB 3", engine: "postgres", host: "database3@migusto.com.ar", password: "MiGusto123.", project1: "Sistemas App", project2: "", createdAt: now(), updatedAt: now() },
            { id: "db-4", name: "MiGusto DB 4", engine: "postgres", host: "database4@migusto.com.ar", password: "MiGusto123.", project1: "Capacitaciones", project2: "", createdAt: now(), updatedAt: now() },
            { id: "db-5", name: "MiGusto DB 5", engine: "postgres", host: "database5@migusto.com.ar", password: "MiGusto123.", project1: "", project2: "", createdAt: now(), updatedAt: now() },
            { id: "db-6", name: "MiGusto DB 6", engine: "postgres", host: "database6@migusto.com.ar", password: "MiGusto123.", project1: "Carta Digital", project2: "", createdAt: now(), updatedAt: now() }
          ];
          setDatabaseCredentials(SEED_DATABASES);
          safeLocalStorageSetItem("techcontrol_database_credentials", SEED_DATABASES);
          supabase.from("database_credentials").insert(SEED_DATABASES.map(c => ({
            id: c.id,
            name: c.name,
            engine: c.engine,
            host: c.host,
            password: c.password,
            project_1: c.project1 || null,
            project_2: c.project2 || null,
            created_at: c.createdAt,
            updated_at: c.updatedAt
          }))).then(() => { });
        } else {
          mappedCreds.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
          setDatabaseCredentials(mappedCreds);
          safeLocalStorageSetItem("techcontrol_database_credentials", mappedCreds);
        }
      } else {
        const saved = localStorage.getItem("techcontrol_database_credentials");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              parsed.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
              setDatabaseCredentials(parsed);
            }
          } catch (e) {
            setDatabaseCredentials([]);
          }
        } else {
          const SEED_DATABASES: DatabaseCredential[] = [
            { id: "db-1", name: "MiGusto DB 1", engine: "postgres", host: "database1@migusto.com.ar", password: "MiGusto123.", project1: "Fabrica MES", project2: "Romi Rooms", createdAt: now(), updatedAt: now() },
            { id: "db-2", name: "MiGusto DB 2", engine: "postgres", host: "database2@migusto.com.ar", password: "MiGusto123.", project1: "Fabrica DataCenter", project2: "", createdAt: now(), updatedAt: now() },
            { id: "db-3", name: "MiGusto DB 3", engine: "postgres", host: "database3@migusto.com.ar", password: "MiGusto123.", project1: "Sistemas App", project2: "", createdAt: now(), updatedAt: now() },
            { id: "db-4", name: "MiGusto DB 4", engine: "postgres", host: "database4@migusto.com.ar", password: "MiGusto123.", project1: "Capacitaciones", project2: "", createdAt: now(), updatedAt: now() },
            { id: "db-5", name: "MiGusto DB 5", engine: "postgres", host: "database5@migusto.com.ar", password: "MiGusto123.", project1: "", project2: "", createdAt: now(), updatedAt: now() },
            { id: "db-6", name: "MiGusto DB 6", engine: "postgres", host: "database6@migusto.com.ar", password: "MiGusto123.", project1: "Carta Digital", project2: "", createdAt: now(), updatedAt: now() }
          ];
          setDatabaseCredentials(SEED_DATABASES);
          safeLocalStorageSetItem("techcontrol_database_credentials", SEED_DATABASES);
        }
      }

      if (dbObjectives && !objectivesError) {
        const mappedObjectives = dbObjectives.map(o => ({
          id: o.id,
          title: o.title,
          description: o.description || "",
          category: o.category || undefined,
          horizon: o.horizon || undefined,
          status: o.status,
          priority: o.priority,
          startDate: o.start_date || undefined,
          endDate: o.end_date || undefined,
          progress: o.progress ?? 0,
          assignedTo: Array.isArray(o.assigned_to) ? o.assigned_to : [],
          tasks: Array.isArray(o.tasks) ? o.tasks : [],
          notes: o.notes || undefined,
          createdAt: o.created_at,
          updatedAt: o.updated_at
        }));
        const finalObjectives = ensureDataliveObjective(mappedObjectives);
        setObjectives(finalObjectives);
        safeLocalStorageSetItem("techcontrol_objectives", finalObjectives);
      } else {
        const saved = localStorage.getItem("techcontrol_objectives");
        let initialList: Objective[] = [];
        if (saved) {
          try {
            initialList = JSON.parse(saved);
          } catch (e) {
            initialList = [];
          }
        }
        const finalObjectives = ensureDataliveObjective(initialList);
        setObjectives(finalObjectives);
        safeLocalStorageSetItem("techcontrol_objectives", finalObjectives);
      }

      if (dbSpecialTasks && !specialTasksError) {
        const mappedSpecialTasks: SpecialTask[] = dbSpecialTasks.map(o => ({
          id: o.id,
          title: o.title,
          description: o.description || "",
          category: o.category,
          status: o.status,
          priority: o.priority,
          startDate: o.start_date || undefined,
          endDate: o.end_date || undefined,
          isConstant: o.is_constant ?? o.isConstant ?? (!o.end_date || o.end_date === ""),
          progress: o.progress ?? 0,
          assignedTo: Array.isArray(o.assigned_to) ? o.assigned_to : [],
          tasks: Array.isArray(o.tasks) ? o.tasks : [],
          notes: o.notes || undefined,
          bannerUrl: o.banner_url || o.bannerUrl || undefined,
          createdBy: o.created_by || o.createdBy || undefined,
          updatedBy: o.updated_by || o.updatedBy || undefined,
          price: o.price !== undefined && o.price !== null ? Number(o.price) : undefined,
          rendicion: o.rendicion !== undefined && o.rendicion !== null ? Number(o.rendicion) : undefined,
          createdAt: o.created_at,
          updatedAt: o.updated_at
        }));

        const saved = localStorage.getItem("techcontrol_special_tasks");
        let localTasks: SpecialTask[] = [];
        if (saved) {
          try { localTasks = JSON.parse(saved); } catch (e) { }
        }

        const mergedSpecialTasks = mappedSpecialTasks.map(dbTask => {
          const local = localTasks.find(l => l.id === dbTask.id);
          if (!local) return dbTask;

          const mergedSubTasks = dedupeSubTasks([...(local.tasks || []), ...(dbTask.tasks || [])]);

          const completedCount = mergedSubTasks.filter((t: any) => t.completed).length;
          const calculatedProgress = mergedSubTasks.length > 0
            ? Math.round((completedCount / mergedSubTasks.length) * 100)
            : (local.progress ?? dbTask.progress ?? 0);

          return {
            ...dbTask,
            ...local,
            tasks: mergedSubTasks,
            progress: calculatedProgress,
            bannerUrl: local.bannerUrl || dbTask.bannerUrl,
            price: local.price !== undefined ? local.price : dbTask.price,
            rendicion: local.rendicion !== undefined ? local.rendicion : dbTask.rendicion
          };
        });

        const dbIds = new Set(mappedSpecialTasks.map(t => t.id));
        const localOnly = localTasks.filter(l => !dbIds.has(l.id));
        const finalSpecialTasks = [...mergedSpecialTasks, ...localOnly];

        setSpecialTasks(finalSpecialTasks);
        safeLocalStorageSetItem("techcontrol_special_tasks", finalSpecialTasks);
      } else {
        const saved = localStorage.getItem("techcontrol_special_tasks");
        if (saved) {
          try {
            setSpecialTasks(JSON.parse(saved));
          } catch (e) {
            setSpecialTasks([]);
          }
        } else {
          setSpecialTasks([]);
        }
      }


      // Fetch guardias separately to handle missing table gracefully
      await syncGuardiasFromSupabase();

      // Fetch holiday assignments
      let dbHolidayAssignments: Record<string, string> = {};
      let hasHolidayDb = true;
      try {
        const { data: has, error: hasError } = await supabase.from("holiday_assignments").select("*");
        if (hasError) {
          if (hasError.code === "PGRST205" || hasError.message?.includes("does not exist")) {
            hasHolidayDb = false;
          } else {
            console.warn("Error querying holiday_assignments:", hasError);
          }
        } else if (has) {
          dbHolidayAssignments = has.reduce((acc, curr) => {
            acc[curr.date] = curr.user_id;
            return acc;
          }, {} as Record<string, string>);
        }
      } catch (err) {
        hasHolidayDb = false;
      }

      // Fetch turn overrides
      let dbTurnOverrides: Record<string, "facundo" | "ramiro"> = {};
      let hasTurnDb = true;
      try {
        const { data: tos, error: tosError } = await supabase.from("turn_overrides").select("*");
        if (tosError) {
          if (tosError.code === "PGRST205" || tosError.message?.includes("does not exist")) {
            hasTurnDb = false;
          } else {
            console.warn("Error querying turn_overrides:", tosError);
          }
        } else if (tos) {
          dbTurnOverrides = tos.reduce((acc, curr) => {
            acc[curr.date] = curr.assigned_user as "facundo" | "ramiro";
            return acc;
          }, {} as Record<string, "facundo" | "ramiro">);
        }
      } catch (err) {
        hasTurnDb = false;
      }

      // Fallbacks / Load values
      if (hasHolidayDb) {
        setHolidayAssignments(dbHolidayAssignments);
        safeLocalStorageSetItem("techcontrol_holiday_assignments", dbHolidayAssignments);
      } else {
        const saved = localStorage.getItem("techcontrol_holiday_assignments");
        if (saved) {
          try { setHolidayAssignments(JSON.parse(saved)); } catch (e) { }
        }
      }

      if (hasTurnDb) {
        setTurnOverrides(dbTurnOverrides);
        safeLocalStorageSetItem("techcontrol_turn_overrides", dbTurnOverrides);
      } else {
        const saved = localStorage.getItem("techcontrol_turn_overrides");
        if (saved) {
          try { setTurnOverrides(JSON.parse(saved)); } catch (e) { }
        }
      }

      setHasDbHolidayAssignments(hasHolidayDb);
      setHasDbTurnOverrides(hasTurnDb);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar los datos de Supabase");
    } finally {
      setLoading(false);
    }
  }, []);

  const syncSpecialEventsFromSupabase = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("special_events").select("*").order("date", { ascending: true });
      if (error) {
        if (error.code === "PGRST205" || error.message?.includes("does not exist")) {
          console.warn("La tabla special_events aún no existe en Supabase.");
        } else {
          console.warn("Error al cargar eventos especiales desde Supabase:", error);
        }
        return;
      }

      if (data && data.length > 0) {
        const mapped: SpecialEvent[] = data.map((row: any) => ({
          id: row.id as string,
          date: row.date as string,
          name: row.name as string,
          type: row.type as string,
          tasks: Array.isArray(row.tasks) ? row.tasks : [],
          bannerUrl: row.banner_url || undefined,
          price: row.price !== undefined && row.price !== null ? Number(row.price) : undefined,
          rendicion: row.rendicion !== undefined && row.rendicion !== null ? Number(row.rendicion) : undefined,
          createdAt: row.created_at as string | undefined,
          updatedAt: row.updated_at as string | undefined,
        }));

        setSpecialEvents(prev => {
          const map = new Map<string, SpecialEvent>();
          prev.forEach(e => map.set(e.id, e));
          mapped.forEach(dbEvt => {
            const existing = map.get(dbEvt.id);
            if (!existing) {
              map.set(dbEvt.id, dbEvt);
            } else {
              const mergedTasks = (dbEvt.tasks || []).map((dbSub: any) => {
                const localSub = (existing.tasks || []).find((ls: any) => ls.id === dbSub.id);
                return {
                  ...localSub,
                  ...dbSub,
                  imageUrl: dbSub.imageUrl || localSub?.imageUrl,
                  completed: dbSub.completed || localSub?.completed,
                  completedAt: dbSub.completedAt || localSub?.completedAt
                };
              });
              map.set(dbEvt.id, {
                ...existing,
                ...dbEvt,
                tasks: mergedTasks,
                bannerUrl: dbEvt.bannerUrl || existing.bannerUrl,
                price: dbEvt.price !== undefined ? dbEvt.price : existing.price,
                rendicion: dbEvt.rendicion !== undefined ? dbEvt.rendicion : existing.rendicion
              });
            }
          });
          const mergedList = Array.from(map.values());
          const next = ensureSeptemberEvents(mergedList);
          safeLocalStorageSetItem("techcontrol_special_events", next);
          return next;
        });
      }
    } catch (err) {
      console.warn("No se pudo sincronizar eventos especiales desde Supabase:", err);
    }
  }, []);

  const syncSpecialTasksFromSupabase = useCallback(async () => {
    try {
      const { data: dbSpecialTasks, error } = await supabase.from("special_tasks").select("*");
      if (error) {
        if (error.code === "PGRST205" || error.message?.includes("does not exist")) {
          console.warn("La tabla special_tasks aún no existe.");
        }
        return;
      }

      if (dbSpecialTasks && dbSpecialTasks.length > 0) {
        const mappedSpecialTasks: SpecialTask[] = dbSpecialTasks.map(o => ({
          id: o.id,
          title: o.title,
          description: o.description || "",
          category: o.category,
          status: o.status,
          priority: o.priority,
          startDate: o.start_date || undefined,
          endDate: o.end_date || undefined,
          isConstant: o.is_constant ?? o.isConstant ?? (!o.end_date || o.end_date === ""),
          progress: o.progress ?? 0,
          assignedTo: Array.isArray(o.assigned_to) ? o.assigned_to : [],
          tasks: Array.isArray(o.tasks) ? o.tasks : [],
          notes: o.notes || undefined,
          bannerUrl: o.banner_url || o.bannerUrl || undefined,
          createdBy: o.created_by || o.createdBy || undefined,
          updatedBy: o.updated_by || o.updatedBy || undefined,
          price: o.price !== undefined && o.price !== null ? Number(o.price) : undefined,
          rendicion: o.rendicion !== undefined && o.rendicion !== null ? Number(o.rendicion) : undefined,
          createdAt: o.created_at,
          updatedAt: o.updated_at
        }));

        setSpecialTasks(prev => {
          const map = new Map<string, SpecialTask>();
          prev.forEach(t => map.set(t.id, t));
          mappedSpecialTasks.forEach(dbTask => {
            const existing = map.get(dbTask.id);
            if (!existing) {
              map.set(dbTask.id, dbTask);
            } else {
              const dbTime = new Date(dbTask.updatedAt || 0).getTime();
              const localTime = new Date(existing.updatedAt || 0).getTime();

              const mergedTasks = (dbTask.tasks || []).map((dbSub: any) => {
                const localSub = (existing.tasks || []).find((ls: any) => ls.id === dbSub.id);
                return {
                  ...localSub,
                  ...dbSub,
                  imageUrl: dbSub.imageUrl || localSub?.imageUrl,
                  completed: dbSub.completed || localSub?.completed,
                  completedAt: dbSub.completedAt || localSub?.completedAt
                };
              });

              map.set(dbTask.id, {
                ...existing,
                ...dbTask,
                tasks: mergedTasks,
                bannerUrl: dbTask.bannerUrl || existing.bannerUrl,
                price: dbTask.price !== undefined ? dbTask.price : existing.price,
                rendicion: dbTask.rendicion !== undefined ? dbTask.rendicion : existing.rendicion,
                updatedAt: dbTime >= localTime ? dbTask.updatedAt : existing.updatedAt
              });
            }
          });
          const next = Array.from(map.values());
          safeLocalStorageSetItem("techcontrol_special_tasks", next);
          return next;
        });
      }
    } catch (err) {
      console.warn("No se pudo sincronizar tareas especiales desde Supabase:", err);
    }
  }, []);

  const saveSpecialEvent = useCallback(async (event: SpecialEvent) => {
    setSpecialEvents(prev => {
      const exists = prev.some(e => e.id === event.id);
      const next = exists
        ? prev.map(e => e.id === event.id ? event : e)
        : [...prev, event];
      safeLocalStorageSetItem("techcontrol_special_events", next);
      return next;
    });

    const payload: Record<string, any> = {
      id: event.id,
      date: event.date,
      name: event.name,
      type: event.type,
      tasks: (event.tasks || []).map((t: any) => ({
        id: t.id,
        name: t.name || t.title,
        title: t.title || t.name,
        completed: !!t.completed,
        imageUrl: t.imageUrl,
        completedAt: t.completedAt
      })),
      created_at: event.createdAt ?? new Date().toISOString(),
      updated_at: event.updatedAt ?? new Date().toISOString(),
    };
    if (event.bannerUrl !== undefined) payload.banner_url = event.bannerUrl;
    if (event.price !== undefined) payload.price = event.price;
    if (event.rendicion !== undefined) payload.rendicion = event.rendicion;

    let { error } = await supabase.from("special_events").upsert(payload);
    if (error) {
      const { error: insertErr } = await supabase.from("special_events").insert(payload);
      if (insertErr) {
        const { error: updateErr } = await supabase.from("special_events").update(payload).eq("id", event.id);
        error = updateErr;
      } else {
        error = null;
      }
    }

    if (error) {
      console.warn("No se pudo guardar el evento especial en Supabase:", error);
      return false;
    }
    return true;
  }, []);

  const deleteSpecialEvent = useCallback(async (eventId: string) => {
    setSpecialEvents(prev => {
      const next = prev.filter(e => e.id !== eventId);
      safeLocalStorageSetItem("techcontrol_special_events", next);
      return next;
    });

    const { error } = await supabase.from("special_events").delete().eq("id", eventId);
    if (error) {
      console.warn("No se pudo eliminar el evento especial desde Supabase:", error);
      return false;
    }
    return true;
  }, []);

  const getMockPrices = (): ProductPrice[] => [
    // Empanadas
    { id: 'emp-1', name: 'American Chicken', category: 'empanadas', price: 4700.00, isPremium: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'emp-2', name: 'Big Burger', category: 'empanadas', price: 4700.00, isPremium: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'emp-3', name: 'Carne Picante', category: 'empanadas', price: 4700.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'emp-4', name: 'Doble Bacon Cheese Burger', category: 'empanadas', price: 4700.00, isPremium: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'emp-5', name: 'La Sagrada', category: 'empanadas', price: 4700.00, isPremium: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'emp-6', name: 'Mexican Pibil Pork', category: 'empanadas', price: 4700.00, isPremium: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'emp-7', name: 'Carne al Cuchillo', category: 'empanadas', price: 4700.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'emp-8', name: 'Carne con Aceituna', category: 'empanadas', price: 4700.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'emp-9', name: 'Carne Suave', category: 'empanadas', price: 4700.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'emp-10', name: 'Pollo', category: 'empanadas', price: 4700.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'emp-11', name: 'Pollo al Champignon', category: 'empanadas', price: 4700.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'emp-12', name: 'Jamón y Queso', category: 'empanadas', price: 4700.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'emp-13', name: 'Vacío y Provoleta', category: 'empanadas', price: 4700.00, isPremium: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'emp-14', name: 'Matambre a la Pizza', category: 'empanadas', price: 4700.00, isPremium: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'emp-15', name: 'Queso y Cebolla', category: 'empanadas', price: 4700.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'emp-16', name: 'Roquefort con Jamón', category: 'empanadas', price: 4700.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'emp-17', name: 'Choclo', category: 'empanadas', price: 4700.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'emp-18', name: 'Verdura', category: 'empanadas', price: 4700.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'emp-19', name: 'Jamón, Huevo y Queso', category: 'empanadas', price: 4700.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'emp-20', name: 'Cuatro Quesos', category: 'empanadas', price: 4700.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },

    // Pizzas
    { id: 'piz-1', name: 'Muzzarella', category: 'pizzas', price: 20000.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'piz-2', name: 'Jamon con morron', category: 'pizzas', price: 20000.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'piz-3', name: 'Napolitana', category: 'pizzas', price: 20000.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'piz-4', name: 'Provolone', category: 'pizzas', price: 20000.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'piz-5', name: 'Panceta', category: 'pizzas', price: 20000.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'piz-6', name: 'Roquefort', category: 'pizzas', price: 20000.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'piz-7', name: 'Cuatro quesos', category: 'pizzas', price: 20000.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'piz-8', name: 'Fugazzeta', category: 'pizzas', price: 20000.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'piz-9', name: 'Pepperoni', category: 'pizzas', price: 20000.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },

    // Pizzas INDI
    { id: 'indi-1', name: 'Jamon Crudo y Rucula INDI', category: 'pizzas_indi', price: 9000.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'indi-2', name: 'Jamon y morron INDI', category: 'pizzas_indi', price: 9000.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'indi-3', name: 'Muzza INDI', category: 'pizzas_indi', price: 9000.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'indi-4', name: 'Napolitana INDI', category: 'pizzas_indi', price: 9000.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'indi-5', name: 'Pepperoni INDI', category: 'pizzas_indi', price: 9000.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },

    // Fitzzas
    { id: 'fitz-1', name: 'Fitzza Carne', category: 'fitzzas', price: 9500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'fitz-2', name: 'Fitzza Pollo', category: 'fitzzas', price: 9500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'fitz-3', name: 'Fitzza Jamón y Queso', category: 'fitzzas', price: 9500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'fitz-4', name: 'Fitzza Verdura', category: 'fitzzas', price: 9500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },

    // Salsas
    { id: 'sal-1', name: 'Salsa Criolla', category: 'salsas', price: 1200.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'sal-2', name: 'Salsa Chimichurri', category: 'salsas', price: 1200.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'sal-3', name: 'Salsa Picante', category: 'salsas', price: 1200.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'sal-4', name: 'Salsa Barbacoa', category: 'salsas', price: 1200.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'sal-5', name: 'Salsa Cheddar', category: 'salsas', price: 1400.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'sal-6', name: 'Salsa Alioli', category: 'salsas', price: 1200.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },

    // Bebidas
    { id: 'beb-1', name: 'Coca-Cola 500ml', category: 'bebidas', price: 2500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'beb-2', name: 'Coca-Cola Sin Azúcar 500ml', category: 'bebidas', price: 2500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'beb-3', name: 'Sprite 500ml', category: 'bebidas', price: 2500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'beb-4', name: 'Sprite Sin Azúcar 500ml', category: 'bebidas', price: 2500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'beb-5', name: 'Agua Mineral con Gas 500ml', category: 'bebidas', price: 2000.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'beb-6', name: 'Agua Mineral sin Gas 500ml', category: 'bebidas', price: 2000.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'beb-7', name: 'Cerveza Corona 330ml', category: 'bebidas', price: 3800.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'beb-8', name: 'Cerveza Stella Artois 473ml', category: 'bebidas', price: 4200.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },

    // Postres
    { id: 'pos-1', name: 'Volcán de Chocolate', category: 'postres', price: 4500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'pos-2', name: 'Flan Casero con Dulce de Leche', category: 'postres', price: 3800.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'pos-3', name: 'Cheesecake de Frutos Rojos', category: 'postres', price: 4500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'pos-4', name: 'Tiramisú', category: 'postres', price: 4200.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'pos-5', name: 'Helado Bombón Suizo', category: 'postres', price: 3500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },

    // Cafetería
    { id: 'caf-1', name: 'Café de Cortesia', category: 'cafeteria', price: 0.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-2', name: 'Jugo de Naranja 12oz', category: 'cafeteria', price: 3500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-3', name: 'Americano 6oz', category: 'cafeteria', price: 3200.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-4', name: 'Americano 8oz', category: 'cafeteria', price: 3800.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-5', name: 'Cappuccino 6oz', category: 'cafeteria', price: 3800.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-6', name: 'Cappuccino 8oz', category: 'cafeteria', price: 4500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-7', name: 'Caramel Latte 6oz', category: 'cafeteria', price: 4200.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-8', name: 'Caramel Latte 8oz', category: 'cafeteria', price: 4800.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-9', name: 'Doble Espresso 8oz', category: 'cafeteria', price: 3900.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-10', name: 'Doble Flat White 8oz', category: 'cafeteria', price: 4500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-11', name: 'Doble Latte 8oz', category: 'cafeteria', price: 4500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-12', name: 'Espresso 6oz', category: 'cafeteria', price: 3000.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-13', name: 'Flat White 6oz', category: 'cafeteria', price: 3800.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-14', name: 'Latte 6oz', category: 'cafeteria', price: 3800.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-15', name: 'Mocca 6oz', category: 'cafeteria', price: 4200.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-16', name: 'Mocca 8oz', category: 'cafeteria', price: 4800.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-17', name: 'Té', category: 'cafeteria', price: 2500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-18', name: 'Ice Caramel Latte 16oz', category: 'cafeteria', price: 5200.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-19', name: 'Ice Espresso 16oz', category: 'cafeteria', price: 4500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-20', name: 'Ice Latte', category: 'cafeteria', price: 4800.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-21', name: 'Ice Latte 16oz', category: 'cafeteria', price: 5200.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-22', name: 'Iced Mocca', category: 'cafeteria', price: 5200.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-23', name: 'Frappe Caramel', category: 'cafeteria', price: 5500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-24', name: 'Frappe Chocolate', category: 'cafeteria', price: 5500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-25', name: 'Frappe DDL', category: 'cafeteria', price: 5500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-26', name: 'Budín Chocolate Blanco', category: 'cafeteria', price: 3500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-27', name: 'Budín de limón', category: 'cafeteria', price: 3500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-28', name: 'Cookie Chips de Chocolate', category: 'cafeteria', price: 2800.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-29', name: 'Cookie Nutella', category: 'cafeteria', price: 3200.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-30', name: 'Croissant', category: 'cafeteria', price: 3000.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-31', name: 'Medialuna de Manteca', category: 'cafeteria', price: 1800.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-32', name: 'Medialuna J&Q', category: 'cafeteria', price: 2800.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-33', name: 'Roll de Canela', category: 'cafeteria', price: 3500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-34', name: 'Roll de queso', category: 'cafeteria', price: 3500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-35', name: 'Tostado J&Q', category: 'cafeteria', price: 4800.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-36', name: 'Café + 2 Medialunas', category: 'cafeteria', price: 5800.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-37', name: 'Café + Budín', category: 'cafeteria', price: 6500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'caf-38', name: 'Café + Tostado', category: 'cafeteria', price: 7500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },

    // Promos
    { id: 'pro-1', name: 'Promo 12 Empanadas + Bebida 1.5L', category: 'promos', price: 52000.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'pro-2', name: 'Promo 2 Pizzas Muzzarella', category: 'promos', price: 36000.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'pro-3', name: 'Promo 6 Empanadas + 1 Pizza Muzza', category: 'promos', price: 44000.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'pro-4', name: 'Combo Almuerzo (2 Empanadas + Bebida)', category: 'promos', price: 11500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'pro-5', name: 'Mega Promo Familiar (2 Pizzas + 12 Empanadas)', category: 'promos', price: 79000.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },

    // Packs
    { id: 'pack-1', name: 'Pack de 2 Empanadas', category: 'packs', price: 0.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'pack-2', name: '2 Empanadas + 1 Salsa', category: 'packs', price: 0.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'pack-3', name: 'Pack de 3 Empanadas', category: 'packs', price: 14900.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'pack-4', name: '3 Empanadas + 1 Salsa', category: 'packs', price: 14900.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'pack-5', name: 'Pack de 4 Empanadas', category: 'packs', price: 0.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'pack-6', name: '4 Empanadas + 1 Salsa', category: 'packs', price: 0.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'pack-7', name: 'Pack de 6 Empanadas', category: 'packs', price: 29500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'pack-8', name: '6 Empanadas + 2 Salsa', category: 'packs', price: 29500.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'pack-9', name: 'Pack 8 Empanadas', category: 'packs', price: 36900.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'pack-10', name: '8 empanadas + 2 Salsas', category: 'packs', price: 36900.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'pack-11', name: 'Pack 12 Empanadas', category: 'packs', price: 49900.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'pack-12', name: '12 Empanadas + 3 salsas', category: 'packs', price: 49900.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'pack-13', name: 'Pack 18 Empanadas', category: 'packs', price: 72900.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'pack-14', name: '18 empanadas + 5 salsas', category: 'packs', price: 72900.00, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
  ];

  const loadLocalPricesFallback = useCallback(() => {
    const saved = localStorage.getItem("techcontrol_product_prices");
    const mocks = getMockPrices();
    if (saved) {
      try {
        const parsed: ProductPrice[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existingIds = new Set(parsed.map(p => p.id));
          const missingMocks = mocks.filter(m => !existingIds.has(m.id));
          const updated = missingMocks.length > 0 ? [...parsed, ...missingMocks] : parsed;
          setProductPrices(updated);
          safeLocalStorageSetItem("techcontrol_product_prices", updated);
          return;
        }
      } catch (e) { }
    }
    setProductPrices(mocks);
    safeLocalStorageSetItem("techcontrol_product_prices", mocks);
  }, []);

  const syncProductPricesFromSupabase = useCallback(async () => {
    try {
      const mocks = getMockPrices();
      const { data, error } = await supabase.from("product_prices").select("*").order("name", { ascending: true });

      let dbMapped: ProductPrice[] = [];
      if (data && !error && data.length > 0) {
        dbMapped = data.map((p: any) => ({
          id: String(p.id),
          name: p.name,
          category: p.category as ProductPriceCategory,
          price: Number(p.price) || 0,
          isPremium: Boolean(p.is_premium || p.isPremium),
          createdAt: p.created_at || new Date().toISOString(),
          updatedAt: p.updated_at || new Date().toISOString()
        }));
      }

      if (error) { loadLocalPricesFallback(); return; }

      let localSaved: ProductPrice[] = [];
      const saved = localStorage.getItem("techcontrol_product_prices");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) localSaved = parsed;
        } catch (e) { }
      }

      let deletedIds = new Set<string>();
      const savedDeleted = localStorage.getItem("techcontrol_deleted_product_prices");
      if (savedDeleted) {
        try {
          const parsed = JSON.parse(savedDeleted);
          if (Array.isArray(parsed)) deletedIds = new Set(parsed);
        } catch (e) { }
      }

      const mergedMap = new Map<string, ProductPrice>();

      // 1. Mocks as baseline
      mocks.forEach(m => {
        if (!deletedIds.has(m.id)) mergedMap.set(m.id, m);
      });

      // 2. Local storage takes precedence over mocks
      localSaved.forEach(l => {
        if (l && l.id && !deletedIds.has(l.id)) {
          mergedMap.set(l.id, l);
        }
      });

      // 3. Supabase DB: if DB item has newer updatedAt or local doesn't exist, update mergedMap
      dbMapped.forEach(d => {
        if (d && d.id && !deletedIds.has(d.id)) {
          const currentLocal = mergedMap.get(d.id);
          if (!currentLocal) {
            mergedMap.set(d.id, d);
          } else {
            const localTime = new Date(currentLocal.updatedAt || 0).getTime();
            const dbTime = new Date(d.updatedAt || 0).getTime();
            if (dbTime >= localTime) {
              mergedMap.set(d.id, d);
            }
          }
        }
      });

      const finalPrices = Array.from(mergedMap.values()).sort((a, b) => a.name.localeCompare(b.name));

      setProductPrices(finalPrices);
      safeLocalStorageSetItem("techcontrol_product_prices", finalPrices);


    } catch (err) {
      console.warn("Error al sincronizar precios:", err);
      loadLocalPricesFallback();
    }
  }, [loadLocalPricesFallback]);

  const addProductPrice = useCallback(async (item: Omit<ProductPrice, "id" | "createdAt" | "updatedAt">) => {
    const newPrice: ProductPrice = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: item.name.trim(),
      category: item.category,
      price: item.price,
      isPremium: item.isPremium || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setProductPrices(prev => {
      const next = [...prev, newPrice].sort((a, b) => a.name.localeCompare(b.name));
      safeLocalStorageSetItem("techcontrol_product_prices", next);
      return next;
    });

    try {
      const dbPayload: any = {
        id: newPrice.id,
        name: newPrice.name,
        category: newPrice.category,
        price: newPrice.price,
        is_premium: newPrice.isPremium || false,
        created_at: newPrice.createdAt,
        updated_at: newPrice.updatedAt
      };
      const { error } = await supabase.from("product_prices").upsert(dbPayload);
      if (error) {
        delete dbPayload.is_premium;
        await supabase.from("product_prices").upsert(dbPayload);
      }
    } catch (e) {
      console.warn("Error al guardar producto en Supabase:", e);
    }
  }, []);

  const updateProductPrice = useCallback(async (id: string, data: Partial<ProductPrice>) => {
    let updatedItem: ProductPrice | undefined;
    setProductPrices(prev => {
      const next = prev.map(p => {
        if (p.id === id) {
          updatedItem = { ...p, ...data, updatedAt: new Date().toISOString() };
          return updatedItem;
        }
        return p;
      }).sort((a, b) => a.name.localeCompare(b.name));
      safeLocalStorageSetItem("techcontrol_product_prices", next);
      return next;
    });

    try {
      if (updatedItem) {
        const dbPayload: any = {
          id: updatedItem.id,
          name: updatedItem.name,
          category: updatedItem.category,
          price: updatedItem.price,
          is_premium: updatedItem.isPremium || false,
          updated_at: updatedItem.updatedAt
        };
        const { error } = await supabase.from("product_prices").upsert(dbPayload);
        if (error) {
          delete dbPayload.is_premium;
          await supabase.from("product_prices").upsert(dbPayload);
        }
      }
    } catch (e) {
      console.warn("Error al actualizar producto en Supabase:", e);
    }
  }, []);

  const deleteProductPrice = useCallback(async (id: string) => {
    setProductPrices(prev => {
      const next = prev.filter(p => p.id !== id);
      safeLocalStorageSetItem("techcontrol_product_prices", next);
      return next;
    });

    try {
      const savedDeleted = localStorage.getItem("techcontrol_deleted_product_prices");
      let deletedList: string[] = [];
      if (savedDeleted) {
        try { deletedList = JSON.parse(savedDeleted); } catch (e) { }
      }
      if (!deletedList.includes(id)) {
        deletedList.push(id);
        safeLocalStorageSetItem("techcontrol_deleted_product_prices", deletedList);
      }
    } catch (e) { }

    try {
      const { error } = await supabase.from("product_prices").delete().eq("id", id);
      if (error) console.warn("Error deleting product price from Supabase:", error);
    } catch (e) { }
  }, []);

  useEffect(() => {
    fetchData();
    void syncSpecialTasksFromSupabase();
    void syncSpecialEventsFromSupabase();
    void syncProductPricesFromSupabase();
  }, [fetchData, syncSpecialTasksFromSupabase, syncSpecialEventsFromSupabase, syncProductPricesFromSupabase]);

  useEffect(() => {
    // Realtime listener for instant multi-user synchronization across sessions
    const channel = supabase
      .channel("realtime-cards-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "special_tasks" }, () => {
        void syncSpecialTasksFromSupabase();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "special_events" }, () => {
        void syncSpecialEventsFromSupabase();
      })
      .subscribe();

    const handleFocus = () => {
      void syncSpecialTasksFromSupabase();
      void syncSpecialEventsFromSupabase();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", handleFocus);
    };
  }, [syncSpecialTasksFromSupabase, syncSpecialEventsFromSupabase]);

  const migrateAllData = async () => {
    setLoading(true);
    const t = toast.loading("Migrando datos a Supabase...");
    try {
      // 1. Users
      await supabase.from("users").upsert(initialUsers.map(u => ({
        id: u.id,
        username: u.username,
        full_name: u.fullName,
        email: u.email,
        phone: u.phone,
        location: u.location,
        active: u.active,
        created_at: u.createdAt,
        updated_at: u.updatedAt
      })));

      // 2. Stock Items
      await supabase.from("stock_items").upsert(initialItems.map(i => ({
        id: i.id,
        name: i.name,
        category: i.category,
        internal_code: i.internalCode,
        current_stock: i.currentStock,
        min_stock: i.minStock,
        location: i.location,
        status: i.status,
        supplier: i.supplier,
        notes: i.notes,
        created_at: i.createdAt,
        updated_at: i.updatedAt
      })));

      // 3. Printers
      await supabase.from("printers").upsert(initialPrinters.map(p => ({
        id: p.id,
        name: p.name,
        code: p.code,
        brand: p.brand,
        model: p.model,
        branch: p.branch,
        sector: p.sector,
        status: p.status,
        toner_model: p.tonerModel,
        toner_level: p.tonerUnits,
        image_unit_model: p.imageUnitModel,
        image_unit_level: p.imageUnitUnits,
        last_toner_change: p.lastTonerChange,
        last_image_unit_change: p.lastImageUnitChange,
        notes: p.notes,
        ip_address: p.ipAddress,
        serial_number: p.serialNumber,
        created_at: p.createdAt,
        updated_at: p.updatedAt
      })));

      // 4. Notebooks
      await supabase.from("notebooks").upsert(initialNotebooks.map(n => ({
        id: n.id,
        category: n.category,
        brand: n.brand,
        model: n.model,
        serial_number: n.serialNumber,
        internal_code: n.internalCode,
        processor: n.processor,
        ram: n.ram,
        storage: n.storage,
        screen_size: n.screenSize,
        os: n.os,
        physical_condition: n.physicalCondition,
        functional_status: n.functionalStatus,
        status: n.status,
        current_assignment: n.currentAssignment,
        assignment_history: n.assignmentHistory,
        entry_date: n.entryDate,
        last_review_date: n.lastReviewDate,
        notes: n.notes,
        created_at: n.createdAt,
        updated_at: n.updatedAt
      })));

      // 5. Monitors
      await supabase.from("monitors").upsert(initialMonitors.map(m => ({
        id: m.id,
        category: m.category,
        brand: m.brand,
        model: m.model,
        serial_number: m.serialNumber,
        internal_code: m.internalCode,
        size: m.size,
        status: m.status,
        physical_condition: m.physicalCondition,
        current_assignment: m.currentAssignment,
        location: m.location,
        entry_date: m.entryDate,
        notes: m.notes,
        created_at: m.createdAt,
        updated_at: m.updatedAt
      })));

      // 6. Orders
      await supabase.from("orders").upsert(initialOrders.map(o => ({
        id: o.id,
        item_name: o.itemName,
        quantity: o.quantity,
        category: o.category,
        reason: o.reason,
        priority: o.priority,
        requested_at: o.requestedAt,
        requested_by: o.requestedBy,
        status: o.status,
        history: o.history,
        related_item_id: o.relatedItemId,
        notes: o.notes,
        expected_delivery_date: o.expectedDeliveryDate
      })));

      // 7. Movements
      await supabase.from("movements").upsert(initialMovements.map(m => ({
        id: m.id,
        date: m.date,
        user: m.user,
        type: m.type,
        item_id: m.itemId,
        item_name: m.itemName,
        item_category: m.itemCategory,
        quantity: m.quantity,
        reason: m.reason,
        related_order_id: m.relatedOrderId,
        related_asset_id: m.relatedAssetId,
        notes: m.notes
      })));

      // 8. DataliveTV
      await supabase.from("datalive_tvs").upsert(initialTVs.map(tv => ({
        id: tv.id,
        branch: tv.branch,
        name: tv.name,
        username: tv.user,
        device_id: tv.deviceId,
        pin: tv.pin,
        notes: tv.notes,
        created_at: tv.createdAt,
        updated_at: tv.updatedAt
      })));

      // 9. System Notes
      await supabase.from("system_notes").upsert(initialNotes.map((n, idx) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        category: n.category,
        is_pinned: n.isPinned,
        sort_order: n.sortOrder ?? idx,
        created_at: n.createdAt,
        updated_at: n.updatedAt
      })));

      // 10. Objectives
      await supabase.from("objectives").upsert(objectives.map(o => ({
        id: o.id,
        title: o.title,
        description: o.description || null,
        category: o.category || null,
        horizon: o.horizon || null,
        status: o.status,
        priority: o.priority,
        start_date: o.startDate || null,
        end_date: o.endDate || null,
        progress: o.progress,
        assigned_to: o.assignedTo || [],
        tasks: o.tasks || [],
        notes: o.notes || null,
        created_at: o.createdAt,
        updated_at: o.updatedAt
      })));

      toast.success("Migración completada con éxito", { id: t });
      fetchData();
    } catch (err) {
      console.error("Migration error:", err);
      toast.error("Error durante la migración", { id: t });
    } finally {
      setLoading(false);
    }
  };

  const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const now = () => new Date().toISOString();

  // Stock Items
  const addStockItem = useCallback(
    async (item: Omit<StockItem, "id" | "createdAt" | "updatedAt">) => {
      const id = genId();
      const createdAt = now();
      const newItem: StockItem = { ...item, id, createdAt, updatedAt: createdAt };

      setStockItems((prev) => [...prev, newItem]);

      const { error } = await supabase.from("stock_items").insert({
        id: newItem.id,
        name: newItem.name,
        category: newItem.category,
        internal_code: newItem.internalCode,
        current_stock: newItem.currentStock,
        min_stock: newItem.minStock,
        location: newItem.location,
        status: newItem.status,
        supplier: newItem.supplier,
        notes: newItem.notes,
        created_at: newItem.createdAt,
        updated_at: newItem.updatedAt
      });

      if (error) {
        toast.error("Error al guardar en base de datos");
        fetchData();
      }
    },
    [fetchData]
  );

  const updateStockItem = useCallback(async (id: string, data: Partial<StockItem>) => {
    setStockItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...data, updatedAt: now() } : item))
    );

    const updateData: any = { ...data, updated_at: now() };
    if (data.internalCode !== undefined) {
      updateData.internal_code = data.internalCode;
      delete updateData.internalCode;
    }
    if (data.currentStock !== undefined) {
      updateData.current_stock = data.currentStock;
      delete updateData.currentStock;
    }
    if (data.minStock !== undefined) {
      updateData.min_stock = data.minStock;
      delete updateData.minStock;
    }
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const { error } = await supabase.from("stock_items").update(updateData).eq("id", id);
    if (error) {
      console.error("Supabase stock_items update error:", error);
      toast.error(error.message || "Error al actualizar stock");
      fetchData();
    }
  }, [fetchData]);

  const deleteStockItem = useCallback(async (id: string) => {
    setStockItems((prev) => prev.filter((item) => item.id !== id));
    const { error } = await supabase.from("stock_items").delete().eq("id", id);
    if (error) {
      toast.error("Error al eliminar item");
      fetchData();
    }
  }, [fetchData]);

  // Printers
  const addPrinter = useCallback(
    async (p: Omit<Printer, "id" | "createdAt" | "updatedAt">) => {
      const id = genId();
      const createdAt = now();
      const effectiveStatus = getEffectivePrinterStatus(p as any);
      const effectiveBranch = getEffectivePrinterBranch(p.sector);
      const newPrinter: Printer = { ...p, id, status: effectiveStatus, branch: effectiveBranch, createdAt, updatedAt: createdAt };

      setPrinters((prev) => [...prev, newPrinter]);

      const { error } = await supabase.from("printers").insert({
        id: newPrinter.id,
        name: newPrinter.name,
        code: newPrinter.code,
        brand: newPrinter.brand,
        model: newPrinter.model,
        branch: newPrinter.branch,
        sector: newPrinter.sector,
        status: newPrinter.status,
        toner_model: newPrinter.tonerModel,
        toner_level: newPrinter.tonerUnits,
        image_unit_model: newPrinter.imageUnitModel,
        image_unit_level: newPrinter.imageUnitUnits,
        last_toner_change: newPrinter.lastTonerChange,
        last_image_unit_change: newPrinter.lastImageUnitChange,
        notes: newPrinter.notes,
        ip_address: newPrinter.ipAddress,
        serial_number: newPrinter.serialNumber,
        created_at: newPrinter.createdAt,
        updated_at: newPrinter.updatedAt
      });

      if (error) {
        toast.error("Error al guardar impresora");
        fetchData();
      }
    },
    [fetchData]
  );

  const updatePrinter = useCallback(async (id: string, data: Partial<Printer>) => {
    let updatedPrinterObj: Printer | undefined;

    setPrinters((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const merged = { ...p, ...data };
        const effectiveStatus = getEffectivePrinterStatus(merged);
        const effectiveBranch = getEffectivePrinterBranch(merged.sector);
        updatedPrinterObj = { ...merged, status: effectiveStatus, branch: effectiveBranch, updatedAt: now() };
        return updatedPrinterObj;
      })
    );

    if (!updatedPrinterObj) return;

    const updateData: Record<string, unknown> = { updated_at: now() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.brand !== undefined) updateData.brand = data.brand;
    if (data.model !== undefined) updateData.model = data.model;
    if (data.sector !== undefined) updateData.sector = data.sector;

    // Always persist calculated status and branch
    updateData.status = updatedPrinterObj.status;
    updateData.branch = updatedPrinterObj.branch;

    if (data.tonerModel !== undefined) updateData.toner_model = data.tonerModel;
    if (data.tonerUnits !== undefined) updateData.toner_level = data.tonerUnits;
    if (data.imageUnitModel !== undefined) updateData.image_unit_model = data.imageUnitModel;
    if (data.imageUnitUnits !== undefined) updateData.image_unit_level = data.imageUnitUnits;
    if (data.lastTonerChange !== undefined) updateData.last_toner_change = data.lastTonerChange ? data.lastTonerChange : null;
    if (data.lastImageUnitChange !== undefined) updateData.last_image_unit_change = data.lastImageUnitChange ? data.lastImageUnitChange : null;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.ipAddress !== undefined) updateData.ip_address = data.ipAddress;
    if (data.serialNumber !== undefined) updateData.serial_number = data.serialNumber;

    const { error } = await supabase.from("printers").update(updateData).eq("id", id);
    if (error) {
      console.error("Supabase printers update:", error);
      toast.error(error.message || "Error al actualizar impresora");
      fetchData();
    }
  }, [fetchData]);

  const deletePrinter = useCallback(async (id: string) => {
    setPrinters((prev) => prev.filter((p) => p.id !== id));
    const { error } = await supabase.from("printers").delete().eq("id", id);
    if (error) {
      toast.error("Error al eliminar impresora");
      fetchData();
    }
  }, [fetchData]);

  // Notebooks
  const addNotebook = useCallback(
    async (n: Omit<Notebook, "id" | "createdAt" | "updatedAt">) => {
      const id = genId();
      const createdAt = now();
      const newNB: Notebook = { ...n, id, createdAt, updatedAt: createdAt };

      setNotebooks((prev) => [...prev, newNB]);

      const { error } = await supabase.from("notebooks").insert({
        id: newNB.id,
        category: newNB.category,
        brand: newNB.brand,
        model: newNB.model,
        serial_number: newNB.serialNumber,
        internal_code: newNB.internalCode,
        processor: newNB.processor,
        ram: newNB.ram,
        storage: newNB.storage,
        screen_size: newNB.screenSize,
        os: newNB.os,
        physical_condition: newNB.physicalCondition,
        functional_status: newNB.functionalStatus,
        status: newNB.status,
        current_assignment: newNB.currentAssignment,
        assignment_history: newNB.assignmentHistory,
        entry_date: newNB.entryDate,
        last_review_date: newNB.lastReviewDate,
        notes: newNB.notes,
        created_at: newNB.createdAt,
        updated_at: newNB.updatedAt,
        product_key_oem: newNB.productKeyOEM,
        product_key_installed: newNB.productKeyInstalled,
        activation_status: newNB.activationStatus,
        license_channel: newNB.licenseChannel,
        product_id: newNB.productId,
        uuid: newNB.uuid,
        bios_version: newNB.biosVersion,
        win11_evaluation: newNB.win11Evaluation,
        tpm_info: newNB.tpmInfo,
        current_user_local: newNB.currentUserLocal,
        cores_threads: newNB.coresThreads,
        ram_modules: newNB.ramModules,
        ram_usable: newNB.ramUsable
      });

      if (error) {
        console.error("Supabase insert error for notebook:", error);
        toast.error("Error al guardar notebook: " + (error.message || ""));
        fetchData();
      }
    },
    [fetchData]
  );

  const updateNotebook = useCallback(async (id: string, data: Partial<Notebook>) => {
    setNotebooks((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...data, updatedAt: now() } : n))
    );

    const updateData: any = { ...data, updated_at: now() };
    if (data.serialNumber !== undefined) {
      updateData.serial_number = data.serialNumber;
      delete updateData.serialNumber;
    }
    if (data.internalCode !== undefined) {
      updateData.internal_code = data.internalCode;
      delete updateData.internalCode;
    }
    if (data.screenSize !== undefined) {
      updateData.screen_size = data.screenSize;
      delete updateData.screenSize;
    }
    if (data.physicalCondition !== undefined) {
      updateData.physical_condition = data.physicalCondition;
      delete updateData.physicalCondition;
    }
    if (data.functionalStatus !== undefined) {
      updateData.functional_status = data.functionalStatus;
      delete updateData.functionalStatus;
    }
    if (data.currentAssignment !== undefined) {
      updateData.current_assignment = data.currentAssignment;
      delete updateData.currentAssignment;
    }
    if (data.assignmentHistory !== undefined) {
      updateData.assignment_history = data.assignmentHistory;
      delete updateData.assignmentHistory;
    }
    if (data.entryDate !== undefined) {
      updateData.entry_date = data.entryDate ? data.entryDate : null;
      delete updateData.entryDate;
    }
    if (data.lastReviewDate !== undefined) {
      updateData.last_review_date = data.lastReviewDate ? data.lastReviewDate : null;
      delete updateData.lastReviewDate;
    }
    if (data.productKeyOEM !== undefined) {
      updateData.product_key_oem = data.productKeyOEM;
      delete updateData.productKeyOEM;
    }
    if (data.productKeyInstalled !== undefined) {
      updateData.product_key_installed = data.productKeyInstalled;
      delete updateData.productKeyInstalled;
    }
    if (data.activationStatus !== undefined) {
      updateData.activation_status = data.activationStatus;
      delete updateData.activationStatus;
    }
    if (data.licenseChannel !== undefined) {
      updateData.license_channel = data.licenseChannel;
      delete updateData.licenseChannel;
    }
    if (data.productId !== undefined) {
      updateData.product_id = data.productId;
      delete updateData.productId;
    }
    if (data.uuid !== undefined) {
      updateData.uuid = data.uuid;
    }
    if (data.biosVersion !== undefined) {
      updateData.bios_version = data.biosVersion;
      delete updateData.biosVersion;
    }
    if (data.win11Evaluation !== undefined) {
      updateData.win11_evaluation = data.win11Evaluation;
      delete updateData.win11Evaluation;
    }
    if (data.tpmInfo !== undefined) {
      updateData.tpm_info = data.tpmInfo;
      delete updateData.tpmInfo;
    }
    if (data.currentUserLocal !== undefined) {
      updateData.current_user_local = data.currentUserLocal;
      delete updateData.currentUserLocal;
    }
    if (data.coresThreads !== undefined) {
      updateData.cores_threads = data.coresThreads;
      delete updateData.coresThreads;
    }
    if (data.ramModules !== undefined) {
      updateData.ram_modules = data.ramModules;
      delete updateData.ramModules;
    }
    if (data.ramUsable !== undefined) {
      updateData.ram_usable = data.ramUsable;
      delete updateData.ramUsable;
    }
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const { error } = await supabase.from("notebooks").update(updateData).eq("id", id);
    if (error) {
      console.error("Supabase notebooks update error:", error);
      toast.error(error.message || "Error al actualizar notebook");
      fetchData();
    }
  }, [fetchData]);

  const updateNotebookStatus = useCallback(async (id: string, status: NotebookStatus) => {
    updateNotebook(id, { status });
  }, [updateNotebook]);

  const deleteNotebook = useCallback(async (id: string) => {
    setNotebooks((prev) => prev.filter((n) => n.id !== id));
    const { error } = await supabase.from("notebooks").delete().eq("id", id);
    if (error) {
      toast.error("Error al eliminar notebook");
      fetchData();
    }
  }, [fetchData]);

  // Monitors
  const addMonitor = useCallback(
    async (m: Omit<Monitor, "id" | "createdAt" | "updatedAt">) => {
      const id = genId();
      const createdAt = now();
      const newMonitor: Monitor = { ...m, id, createdAt, updatedAt: createdAt };

      setMonitors((prev) => [...prev, newMonitor]);

      const { error } = await supabase.from("monitors").insert({
        id: newMonitor.id,
        category: newMonitor.category,
        brand: newMonitor.brand,
        model: newMonitor.model,
        serial_number: newMonitor.serialNumber,
        internal_code: newMonitor.internalCode,
        size: newMonitor.size,
        status: newMonitor.status,
        physical_condition: newMonitor.physicalCondition,
        current_assignment: newMonitor.currentAssignment,
        location: newMonitor.location,
        entry_date: newMonitor.entryDate,
        notes: newMonitor.notes,
        created_at: newMonitor.createdAt,
        updated_at: newMonitor.updatedAt
      });

      if (error) {
        toast.error("Error al guardar monitor");
        fetchData();
      }
    },
    [fetchData]
  );

  const updateMonitor = useCallback(async (id: string, data: Partial<Monitor>) => {
    setMonitors((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...data, updatedAt: now() } : m))
    );

    const updateData: any = { ...data, updated_at: now() };
    if (data.serialNumber !== undefined) {
      updateData.serial_number = data.serialNumber;
      delete updateData.serialNumber;
    }
    if (data.internalCode !== undefined) {
      updateData.internal_code = data.internalCode;
      delete updateData.internalCode;
    }
    if (data.physicalCondition !== undefined) {
      updateData.physical_condition = data.physicalCondition;
      delete updateData.physicalCondition;
    }
    if (data.currentAssignment !== undefined) {
      updateData.current_assignment = data.currentAssignment;
      delete updateData.currentAssignment;
    }
    if (data.entryDate !== undefined) {
      updateData.entry_date = data.entryDate ? data.entryDate : null;
      delete updateData.entryDate;
    }
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const { error } = await supabase.from("monitors").update(updateData).eq("id", id);
    if (error) {
      console.error("Supabase monitors update error:", error);
      toast.error(error.message || "Error al actualizar monitor");
      fetchData();
    }
  }, [fetchData]);

  const deleteMonitor = useCallback(async (id: string) => {
    setMonitors((prev) => prev.filter((m) => m.id !== id));
    const { error } = await supabase.from("monitors").delete().eq("id", id);
    if (error) {
      toast.error("Error al eliminar monitor");
      fetchData();
    }
  }, [fetchData]);

  // Users
  const addUser = useCallback(
    async (u: Omit<User, "id" | "createdAt" | "updatedAt">) => {
      const id = genId();
      const createdAt = now();
      const newUser: User = { ...u, id, createdAt, updatedAt: createdAt };

      setUsers((prev) => {
        const next = [...prev, newUser];
        safeLocalStorageSetItem("techcontrol_users", next);
        return next;
      });

      try {
        const { error } = await supabase.from("users").upsert({
          id: newUser.id,
          username: newUser.username,
          full_name: newUser.fullName,
          email: newUser.email,
          phone: newUser.phone,
          location: newUser.location,
          active: newUser.active,
          role: newUser.role,
          avatar_url: newUser.avatarUrl,
          created_at: newUser.createdAt,
          updated_at: newUser.updatedAt
        });

        if (error) {
          console.warn("Supabase user insert warning:", error.message);
        }
      } catch (err) {
        console.warn("Supabase user insert exception:", err);
      }
    },
    []
  );

  const updateUser = useCallback(async (id: string, data: Partial<User>) => {
    setUsers((prev) => {
      const next = prev.map((u) => {
        if (u.id === id) {
          const updated = { ...u, ...data, updatedAt: now() };
          if (!updated.avatarUrl) {
            const initial = initialUsers.find(iu => iu.id === id || iu.fullName.toLowerCase() === updated.fullName.toLowerCase());
            const name = (updated.fullName || "").toLowerCase();
            updated.avatarUrl = initial?.avatarUrl || (
              name.includes("facundo") ? "Colaboradores/Facu.jpg" :
              name.includes("gustavo") ? "Colaboradores/Gus.jpg" :
              name.includes("ramiro") ? "Colaboradores/Rami.png" : null
            );
          }
          return updated;
        }
        return u;
      });
      safeLocalStorageSetItem("techcontrol_users", next);
      return next;
    });

    try {
      const updateData: Record<string, unknown> = { updated_at: now() };
      if (data.fullName !== undefined) updateData.full_name = data.fullName;
      if (data.username !== undefined) updateData.username = data.username;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.location !== undefined) updateData.location = data.location;
      if (data.active !== undefined) updateData.active = data.active;
      if (data.role !== undefined) updateData.role = data.role;
      if (data.avatarUrl !== undefined) updateData.avatar_url = data.avatarUrl;

      let { error } = await supabase.from("users").upsert({ id, ...updateData });
      if (error && error.message?.toLowerCase().includes("role")) {
        console.warn("Supabase users table missing role column, saving other fields:", error.message);
        const { role: _, ...dataWithoutRole } = updateData;
        const { error: retryError } = await supabase.from("users").upsert({ id, ...dataWithoutRole });
        if (retryError) {
          console.warn("Supabase user update retry warning:", retryError.message);
        }
      }
      if (error) {
        console.warn("Supabase user update warning:", error.message);
      }
    } catch (err) {
      console.warn("Supabase user update exception:", err);
    }
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    setUsers((prev) => {
      const next = prev.filter((u) => u.id !== id);
      safeLocalStorageSetItem("techcontrol_users", next);
      return next;
    });

    try {
      const { error } = await supabase.from("users").delete().eq("id", id);
      if (error) {
        console.warn("Supabase user delete warning:", error.message);
      }
    } catch (err) {
      console.warn("Supabase user delete exception:", err);
    }
  }, []);

  // Orders
  const addOrder = useCallback(
    async (o: Omit<Order, "id" | "requestedAt" | "history">) => {
      const id = `ord-${genId()}`;
      const requestedAt = now();
      const newOrder: Order = {
        ...o,
        id,
        requestedAt,
        history: [
          {
            id: genId(),
            orderId: id,
            status: "requested",
            date: requestedAt,
            changedBy: o.requestedBy,
          },
        ],
      };

      // Optimistic update
      setOrders((prev) => [newOrder, ...prev]);

      const { error } = await supabase.from("orders").insert({
        id: newOrder.id,
        item_name: newOrder.itemName,
        quantity: newOrder.quantity,
        category: newOrder.category,
        reason: newOrder.reason,
        priority: newOrder.priority,
        requested_at: newOrder.requestedAt,
        requested_by: newOrder.requestedBy,
        status: newOrder.status,
        history: newOrder.history,
        related_item_id: newOrder.relatedItemId,
        notes: newOrder.notes,
        expected_delivery_date: newOrder.expectedDeliveryDate
      });

      if (error) {
        toast.error("Error al crear el pedido");
        fetchData(); // Rollback
      } else {
        toast.success("Pedido creado con éxito");
      }
    },
    [fetchData]
  );

  const updateOrder = useCallback(async (id: string, data: Partial<Order>) => {
    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...data, updatedAt: now() } : o))
    );

    const updateData: any = {};
    if (data.itemName) updateData.item_name = data.itemName;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.category) updateData.category = data.category;
    if (data.reason) updateData.reason = data.reason;
    if (data.priority) updateData.priority = data.priority;
    if (data.status) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.expectedDeliveryDate !== undefined) updateData.expected_delivery_date = data.expectedDeliveryDate;
    if (data.history) updateData.history = data.history;

    const { error } = await supabase.from("orders").update(updateData).eq("id", id);

    if (error) {
      toast.error("Error al actualizar el pedido");
      fetchData(); // Rollback
    }
  }, [fetchData]);

  const updateOrderStatus = useCallback(
    async (id: string, status: OrderStatus, notes?: string, changedBy = "Sistema") => {
      const order = orders.find(o => o.id === id);
      if (!order) return;

      const newHistory = [
        ...order.history,
        { id: genId(), orderId: id, status, date: now(), notes, changedBy },
      ];

      // Optimistic update
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== id) return o;
          return {
            ...o,
            status,
            history: newHistory,
          };
        })
      );

      const { error } = await supabase.from("orders").update({
        status,
        history: newHistory
      }).eq("id", id);

      if (error) {
        toast.error("Error al actualizar el estado");
        fetchData();
      } else {
        toast.success(`Pedido ${status === 'delivered' ? 'entregado' : 'actualizado'}`);
      }
    },
    [orders, fetchData]
  );

  const deleteOrder = useCallback(async (id: string) => {
    // Optimistic update
    setOrders((prev) => prev.filter((o) => o.id !== id));

    const { error } = await supabase.from("orders").delete().eq("id", id);

    if (error) {
      toast.error("Error al eliminar el pedido");
      fetchData();
    } else {
      toast.success("Pedido eliminado");
    }
  }, [fetchData]);

  // Movements
  const addMovement = useCallback((m: Omit<Movement, "id">) => {
    setMovements((prev) => [{ ...m, id: genId() }, ...prev]);
  }, []);

  // DataliveTV
  const addDataliveTV = useCallback(
    async (tv: Omit<DataliveTV, "id" | "createdAt" | "updatedAt">) => {
      const id = genId();
      const createdAt = now();
      const newTV: DataliveTV = { ...tv, id, createdAt, updatedAt: createdAt };

      setDataliveTVs((prev) => [...prev, newTV]);

      const { error } = await supabase.from("datalive_tvs").insert({
        id: newTV.id,
        branch: newTV.branch,
        name: newTV.name,
        username: newTV.user,
        device_id: newTV.deviceId,
        pin: newTV.pin,
        notes: newTV.notes,
        created_at: newTV.createdAt,
        updated_at: newTV.updatedAt
      });

      if (error) {
        toast.error("Error al registrar TV");
        fetchData();
      } else {
        toast.success("TV registrada con éxito");
      }
    },
    [fetchData]
  );

  const updateDataliveTV = useCallback(async (id: string, data: Partial<DataliveTV>) => {
    setDataliveTVs((prev) =>
      prev.map((tv) => (tv.id === id ? { ...tv, ...data, updatedAt: now() } : tv))
    );

    const updateData: any = {};
    if (data.branch) updateData.branch = data.branch;
    if (data.name) updateData.name = data.name;
    if (data.user) updateData.username = data.user;
    if (data.deviceId) updateData.device_id = data.deviceId;
    if (data.pin) updateData.pin = data.pin;
    if (data.notes !== undefined) updateData.notes = data.notes;
    updateData.updated_at = now();

    const { error } = await supabase.from("datalive_tvs").update(updateData).eq("id", id);

    if (error) {
      toast.error("Error al actualizar TV");
      fetchData();
    }
  }, [fetchData]);

  const deleteDataliveTV = useCallback(async (id: string) => {
    setDataliveTVs((prev) => prev.filter((tv) => tv.id !== id));

    const { error } = await supabase.from("datalive_tvs").delete().eq("id", id);

    if (error) {
      toast.error("Error al eliminar TV");
      fetchData();
    }
  }, [fetchData]);

  const calculateHours = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;
    try {
      const [startH, startM] = startTime.split(":").map(Number);
      const [endH, endM] = endTime.split(":").map(Number);

      let startMinutes = startH * 60 + startM;
      let endMinutes = endH * 60 + endM;

      if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
      }

      const diffMinutes = endMinutes - startMinutes;
      return Math.round((diffMinutes / 60) * 100) / 100;
    } catch (e) {
      return 0;
    }
  };

  const addGuardia = useCallback(
    async (g: Omit<Guardia, "id" | "createdAt" | "updatedAt" | "hours">) => {
      const id = `gd-${genId()}`;
      const createdAt = now();
      const hours = calculateHours(g.startTime, g.endTime);
      const newGuardia: Guardia = { ...g, id, hours, createdAt, updatedAt: createdAt };

      setGuardias((prev) => {
        const next = [...prev, newGuardia];
        safeLocalStorageSetItem("techcontrol_guardias", next);
        return next;
      });

      const { error } = await supabase.from("guardias").insert(guardiaToDb(newGuardia));

      if (error) {
        console.warn("Error inserting guardia into Supabase:", error);
        toast.info("Guardia guardada localmente");
      } else {
        await syncGuardiasFromSupabase();
        toast.success("Guardia registrada con éxito");
      }
    },
    [syncGuardiasFromSupabase]
  );

  const updateGuardia = useCallback(
    async (id: string, data: Partial<Guardia>) => {
      setGuardias((prev) => {
        const next = prev.map((g) => {
          if (g.id !== id) return g;
          const merged = { ...g, ...data, updatedAt: now() };
          if (data.startTime || data.endTime || data.date) {
            merged.hours = calculateHours(merged.startTime, merged.endTime);
          }
          return merged;
        });
        safeLocalStorageSetItem("techcontrol_guardias", next);
        return next;
      });

      const current = guardias.find((g) => g.id === id);
      if (!current) return;

      const merged = { ...current, ...data };
      const hours = calculateHours(merged.startTime, merged.endTime);

      const updateData: any = {
        updated_at: now(),
        hours
      };
      if (data.date) updateData.date = data.date;
      if (data.startTime) updateData.start_time = data.startTime;
      if (data.endTime) updateData.end_time = data.endTime;
      if (data.userId) updateData.user_id = data.userId;
      if (data.userName) updateData.user_name = data.userName;
      if (data.type) updateData.type = data.type;
      if (data.description) updateData.description = data.description;
      if (data.branchesAffected !== undefined) updateData.branches_affected = data.branchesAffected;
      if (data.status) updateData.status = data.status;
      if (data.notes !== undefined) updateData.notes = data.notes;

      const { error } = await supabase.from("guardias").update(updateData).eq("id", id);
      if (error) {
        console.warn("Error updating guardia in Supabase:", error);
      } else {
        await syncGuardiasFromSupabase();
        toast.success("Guardia actualizada");
      }
    },
    [guardias, syncGuardiasFromSupabase]
  );

  const deleteGuardia = useCallback(
    async (id: string) => {
      setGuardias((prev) => {
        const next = prev.filter((g) => g.id !== id);
        safeLocalStorageSetItem("techcontrol_guardias", next);
        return next;
      });

      const { error } = await supabase.from("guardias").delete().eq("id", id);
      if (error) {
        console.warn("Error deleting guardia from Supabase:", error);
      } else {
        await syncGuardiasFromSupabase();
        toast.success("Guardia eliminada");
      }
    },
    [syncGuardiasFromSupabase]
  );

  const setHolidayAssignment = useCallback(async (date: string, userId: string) => {
    setHolidayAssignments(prev => {
      const next = { ...prev };
      if (userId === "none") {
        delete next[date];
      } else {
        next[date] = userId;
      }
      safeLocalStorageSetItem("techcontrol_holiday_assignments", next);
      return next;
    });

    if (hasDbHolidayAssignments) {
      if (userId === "none") {
        const { error } = await supabase.from("holiday_assignments").delete().eq("date", date);
        if (error) console.error("Error deleting holiday_assignment:", error);
      } else {
        const { error } = await supabase.from("holiday_assignments").upsert({ date, user_id: userId });
        if (error) console.error("Error upserting holiday_assignment:", error);
      }
    }
  }, [hasDbHolidayAssignments]);

  const setTurnOverride = useCallback(async (date: string, user: string) => {
    setTurnOverrides(prev => {
      const next = { ...prev, [date]: user };
      safeLocalStorageSetItem("techcontrol_turn_overrides", next);
      return next;
    });

    if (hasDbTurnOverrides) {
      const { error } = await supabase.from("turn_overrides").upsert({ date, assigned_user: user });
      if (error) console.error("Error upserting turn_override:", error);
    }
  }, [hasDbTurnOverrides]);

  const clearTurnOverride = useCallback(async (date: string) => {
    setTurnOverrides(prev => {
      const next = { ...prev };
      delete next[date];
      safeLocalStorageSetItem("techcontrol_turn_overrides", next);
      return next;
    });

    if (hasDbTurnOverrides) {
      const { error } = await supabase.from("turn_overrides").delete().eq("date", date);
      if (error) console.error("Error deleting turn_override:", error);
    }
  }, [hasDbTurnOverrides]);

  // System Notes actions
  const addNote = useCallback(async (note: Omit<SystemNote, "id" | "createdAt" | "updatedAt">) => {
    const id = genId();
    const createdAt = now();
    const newNote: SystemNote = {
      ...note,
      id,
      createdAt,
      updatedAt: createdAt,
      sortOrder: notes.length
    };

    setNotes(prev => {
      const next = [newNote, ...prev];
      safeLocalStorageSetItem("techcontrol_notes", next);
      return next;
    });

    const { error } = await supabase.from("system_notes").insert({
      id: newNote.id,
      title: newNote.title,
      content: newNote.content,
      category: newNote.category,
      is_pinned: newNote.isPinned,
      sort_order: newNote.sortOrder,
      created_at: newNote.createdAt,
      updated_at: newNote.updatedAt
    });

    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("does not exist")) {
        console.warn("La tabla system_notes aún no existe en Supabase. Se guardó localmente.");
      } else {
        console.error("Error adding note to Supabase:", error);
        toast.error("Error al sincronizar nota: " + error.message);
      }
    }

    return id;
  }, [notes.length]);

  const updateNote = useCallback(async (id: string, data: Partial<SystemNote>) => {
    const updatedAt = now();
    setNotes(prev => {
      const next = prev.map(n => n.id === id ? { ...n, ...data, updatedAt } : n);
      safeLocalStorageSetItem("techcontrol_notes", next);
      return next;
    });

    const dbPayload: Record<string, any> = { updated_at: updatedAt };
    if (data.title !== undefined) dbPayload.title = data.title;
    if (data.content !== undefined) dbPayload.content = data.content;
    if (data.category !== undefined) dbPayload.category = data.category;
    if (data.isPinned !== undefined) dbPayload.is_pinned = data.isPinned;
    if (data.sortOrder !== undefined) dbPayload.sort_order = data.sortOrder;

    const { error } = await supabase.from("system_notes").update(dbPayload).eq("id", id);
    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("does not exist")) {
        console.warn("La tabla system_notes aún no existe en Supabase.");
      } else {
        console.error("Error updating note in Supabase:", error);
        toast.error("Error al actualizar nota: " + error.message);
      }
    }
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    setNotes(prev => {
      const next = prev.filter(n => n.id !== id);
      safeLocalStorageSetItem("techcontrol_notes", next);
      return next;
    });

    const { error } = await supabase.from("system_notes").delete().eq("id", id);
    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("does not exist")) {
        console.warn("La tabla system_notes aún no existe en Supabase.");
      } else {
        console.error("Error deleting note from Supabase:", error);
        toast.error("Error al eliminar nota en base de datos");
      }
    }
  }, []);

  const reorderNotes = useCallback(async (reorderedNotes: SystemNote[]) => {
    const notesWithSortOrder = reorderedNotes.map((n, idx) => ({
      ...n,
      sortOrder: idx
    }));
    setNotes(notesWithSortOrder);
    safeLocalStorageSetItem("techcontrol_notes", notesWithSortOrder);

    try {
      const results = await Promise.all(
        notesWithSortOrder.map((n, idx) =>
          supabase.from("system_notes").update({ sort_order: idx }).eq("id", n.id)
        )
      );
      const errResult = results.find(r => r.error);
      if (errResult?.error) {
        console.error("Error updating sort order in Supabase:", errResult.error);
        toast.error("No se pudo guardar el orden en Supabase");
      }
    } catch (e) {
      console.warn("Error updating sort order in Supabase:", e);
    }
  }, []);

  const addOfficeTicket = useCallback(async (ticket: Omit<OfficeTicket, "id" | "createdAt" | "updatedAt">) => {
    const id = genId();
    const createdAt = now();
    const newTicket: OfficeTicket = {
      ...ticket,
      id,
      createdAt,
      updatedAt: createdAt
    };

    setOfficeTickets(prev => {
      const next = [newTicket, ...prev];
      safeLocalStorageSetItem("techcontrol_office_tickets", next);
      return next;
    });

    const { error } = await supabase.from("office_tickets").insert({
      id: newTicket.id,
      title: newTicket.title,
      description: newTicket.description,
      category: newTicket.category,
      custom_category: newTicket.customCategory,
      user_id: newTicket.userId,
      user_name: newTicket.userName,
      date: newTicket.date,
      duration_minutes: newTicket.durationMinutes,
      created_at: newTicket.createdAt,
      updated_at: newTicket.updatedAt
    });

    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("does not exist")) {
        console.warn("La tabla office_tickets aún no existe en Supabase. Se guardó localmente.");
      } else {
        console.error("Error adding office ticket to Supabase:", error);
        toast.error("Error al sincronizar ticket de oficina: " + error.message);
      }
    }
  }, []);

  const updateOfficeTicket = useCallback(async (id: string, data: Partial<OfficeTicket>) => {
    const updatedAt = now();
    setOfficeTickets(prev => {
      const next = prev.map(t => t.id === id ? { ...t, ...data, updatedAt } : t);
      safeLocalStorageSetItem("techcontrol_office_tickets", next);
      return next;
    });

    const dbPayload: Record<string, any> = { updated_at: updatedAt };
    if (data.title !== undefined) dbPayload.title = data.title;
    if (data.category !== undefined) dbPayload.category = data.category;
    if (data.customCategory !== undefined) dbPayload.custom_category = data.customCategory;
    if (data.date !== undefined) dbPayload.date = data.date;
    if (data.durationMinutes !== undefined) dbPayload.duration_minutes = data.durationMinutes;

    const { error } = await supabase.from("office_tickets").update(dbPayload).eq("id", id);
    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("does not exist")) {
        console.warn("La tabla office_tickets aún no existe en Supabase.");
      } else {
        console.error("Error updating office ticket in Supabase:", error);
        toast.error("Error al actualizar ticket: " + error.message);
      }
    }
  }, []);

  const deleteOfficeTicket = useCallback(async (id: string) => {
    setOfficeTickets(prev => {
      const next = prev.filter(t => t.id !== id);
      safeLocalStorageSetItem("techcontrol_office_tickets", next);
      return next;
    });

    const { error } = await supabase.from("office_tickets").delete().eq("id", id);
    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("does not exist")) {
        console.warn("La tabla office_tickets aún no existe en Supabase.");
      } else {
        console.error("Error deleting office ticket from Supabase:", error);
        toast.error("Error al eliminar ticket en base de datos");
      }
    }
  }, []);

  const addDatabaseCredential = useCallback(async (credential: Omit<DatabaseCredential, "id" | "createdAt" | "updatedAt">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const createdAt = now();
    const updatedAt = now();
    const newCred: DatabaseCredential = { id, ...credential, createdAt, updatedAt };

    setDatabaseCredentials(prev => {
      const next = [newCred, ...prev].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      );
      safeLocalStorageSetItem("techcontrol_database_credentials", next);
      return next;
    });

    const { error } = await supabase.from("database_credentials").insert({
      id,
      name: newCred.name,
      engine: newCred.engine,
      host: newCred.host,
      port: newCred.port || null,
      database_name: newCred.databaseName || null,
      username: newCred.username || null,
      password: newCred.password || null,
      notes: newCred.notes || null,
      project_1: newCred.project1 || null,
      project_2: newCred.project2 || null,
      created_at: newCred.createdAt,
      updated_at: newCred.updatedAt
    });

    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("does not exist")) {
        console.warn("La tabla database_credentials aún no existe en Supabase. Se guardó localmente.");
      } else {
        console.error("Error adding database credential to Supabase:", error);
        toast.error("Error al sincronizar credencial de base de datos: " + error.message);
      }
    }
  }, []);

  const updateDatabaseCredential = useCallback(async (id: string, data: Partial<DatabaseCredential>) => {
    const updatedAt = now();
    setDatabaseCredentials(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...data, updatedAt } : c).sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      );
      safeLocalStorageSetItem("techcontrol_database_credentials", next);
      return next;
    });

    const dbPayload: Record<string, any> = { updated_at: updatedAt };
    if (data.name !== undefined) dbPayload.name = data.name;
    if (data.engine !== undefined) dbPayload.engine = data.engine;
    if (data.host !== undefined) dbPayload.host = data.host;
    if (data.port !== undefined) dbPayload.port = data.port || null;
    if (data.databaseName !== undefined) dbPayload.database_name = data.databaseName || null;
    if (data.username !== undefined) dbPayload.username = data.username || null;
    if (data.password !== undefined) dbPayload.password = data.password || null;
    if (data.notes !== undefined) dbPayload.notes = data.notes || null;
    if (data.project1 !== undefined) dbPayload.project_1 = data.project1 || null;
    if (data.project2 !== undefined) dbPayload.project_2 = data.project2 || null;

    const { error } = await supabase.from("database_credentials").update(dbPayload).eq("id", id);
    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("does not exist")) {
        console.warn("La tabla database_credentials aún no existe.");
      } else {
        console.error("Error updating database credential in Supabase:", error);
        toast.error("Error al actualizar credencial: " + error.message);
      }
    }
  }, []);

  const deleteDatabaseCredential = useCallback(async (id: string) => {
    setDatabaseCredentials(prev => {
      const next = prev.filter(c => c.id !== id);
      safeLocalStorageSetItem("techcontrol_database_credentials", next);
      return next;
    });

    const { error } = await supabase.from("database_credentials").delete().eq("id", id);
    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("does not exist")) {
        console.warn("La tabla database_credentials aún no existe.");
      } else {
        console.error("Error deleting database credential from Supabase:", error);
        toast.error("Error al eliminar credencial en base de datos");
      }
    }
  }, []);

  const addObjective = useCallback(async (objective: Omit<Objective, "id" | "createdAt" | "updatedAt">) => {
    const id = genId();
    const createdAt = now();
    const newObjective: Objective = {
      ...objective,
      id,
      createdAt,
      updatedAt: createdAt
    };

    setObjectives(prev => {
      const next = [newObjective, ...prev];
      safeLocalStorageSetItem("techcontrol_objectives", next);
      return next;
    });

    const dbPayload: Record<string, any> = {
      id: newObjective.id,
      title: newObjective.title,
      description: newObjective.description || null,
      category: newObjective.category || null,
      horizon: newObjective.horizon || null,
      status: newObjective.status,
      priority: newObjective.priority,
      start_date: newObjective.startDate || null,
      end_date: newObjective.endDate || null,
      progress: newObjective.progress,
      assigned_to: newObjective.assignedTo || [],
      tasks: newObjective.tasks || [],
      notes: newObjective.notes || null,
      created_at: newObjective.createdAt,
      updated_at: newObjective.updatedAt
    };

    let { error } = await supabase.from("objectives").insert(dbPayload);

    if (error && (error.message?.includes("category") || error.message?.includes("horizon") || error.code === "PGRST204")) {
      const retryPayload = { ...dbPayload };
      delete retryPayload.category;
      delete retryPayload.horizon;
      const retry = await supabase.from("objectives").insert(retryPayload);
      error = retry.error;
    }

    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("does not exist")) {
        console.warn("La tabla objectives aún no existe en Supabase. Se guardó localmente.");
      } else {
        console.error("Error adding objective to Supabase:", error);
        toast.error("Error al sincronizar objetivo en la nube: " + error.message);
      }
    }
  }, []);

  const updateObjective = useCallback(async (id: string, data: Partial<Objective>) => {
    const updatedAt = now();
    setObjectives(prev => {
      const next = prev.map(o => o.id === id ? { ...o, ...data, updatedAt } : o);
      safeLocalStorageSetItem("techcontrol_objectives", next);
      return next;
    });

    const dbPayload: Record<string, any> = { updated_at: updatedAt };
    if (data.title !== undefined) dbPayload.title = data.title;
    if (data.description !== undefined) dbPayload.description = data.description;
    if (data.category !== undefined) dbPayload.category = data.category;
    if (data.horizon !== undefined) dbPayload.horizon = data.horizon;
    if (data.status !== undefined) dbPayload.status = data.status;
    if (data.priority !== undefined) dbPayload.priority = data.priority;
    if (data.startDate !== undefined) dbPayload.start_date = data.startDate;
    if (data.endDate !== undefined) dbPayload.end_date = data.endDate;
    if (data.progress !== undefined) dbPayload.progress = data.progress;
    if (data.assignedTo !== undefined) dbPayload.assigned_to = data.assignedTo;
    if (data.tasks !== undefined) dbPayload.tasks = data.tasks;
    if (data.notes !== undefined) dbPayload.notes = data.notes;

    const { error } = await supabase.from("objectives").update(dbPayload).eq("id", id);
    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("does not exist")) {
        console.warn("La tabla objectives aún no existe en Supabase.");
      } else {
        console.error("Error updating objective in Supabase:", error);
        toast.error("Error al actualizar objetivo: " + error.message);
      }
    }
  }, []);

  const deleteObjective = useCallback(async (id: string) => {
    setObjectives(prev => {
      const next = prev.filter(o => o.id !== id);
      safeLocalStorageSetItem("techcontrol_objectives", next);
      return next;
    });

    const { error } = await supabase.from("objectives").delete().eq("id", id);
    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("does not exist")) {
        console.warn("La tabla objectives aún no existe en Supabase.");
      } else {
        console.error("Error deleting objective from Supabase:", error);
        toast.error("Error al eliminar objetivo en base de datos");
      }
    }
  }, []);

  const addSpecialTask = useCallback(async (specialTask: Omit<SpecialTask, "id" | "createdAt" | "updatedAt">) => {
    const id = genId();
    const createdAt = now();
    const newSpecialTask: SpecialTask = {
      ...specialTask,
      id,
      createdAt,
      updatedAt: createdAt
    };

    setSpecialTasks(prev => {
      const next = [newSpecialTask, ...prev];
      safeLocalStorageSetItem("techcontrol_special_tasks", next);
      return next;
    });

    const dbPayload: Record<string, any> = {
      id: newSpecialTask.id,
      title: newSpecialTask.title,
      description: newSpecialTask.description || null,
      category: newSpecialTask.category,
      status: newSpecialTask.status,
      priority: newSpecialTask.priority,
      start_date: newSpecialTask.startDate || null,
      end_date: newSpecialTask.endDate || null,
      progress: newSpecialTask.progress,
      assigned_to: newSpecialTask.assignedTo || [],
      tasks: newSpecialTask.tasks || [],
      notes: newSpecialTask.notes || null,
      created_by: newSpecialTask.createdBy || null,
      updated_by: newSpecialTask.updatedBy || null,
      price: newSpecialTask.price ?? null,
      rendicion: newSpecialTask.rendicion ?? null,
      created_at: newSpecialTask.createdAt,
      updated_at: newSpecialTask.updatedAt
    };
    if (newSpecialTask.bannerUrl) {
      dbPayload.banner_url = newSpecialTask.bannerUrl;
    }

    let { error } = await supabase.from("special_tasks").insert(dbPayload);
    if (error) {
      const retryPayload = { ...dbPayload };
      delete retryPayload.banner_url;
      delete retryPayload.created_by;
      delete retryPayload.updated_by;
      delete retryPayload.price;
      delete retryPayload.rendicion;
      const retry = await supabase.from("special_tasks").insert(retryPayload);
      error = retry.error;
    }

    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("does not exist")) {
        console.warn("La tabla special_tasks aún no existe en Supabase. Se guardó localmente.");
      } else {
        console.warn("Error adding special task to Supabase:", error);
      }
    }

    return newSpecialTask;
  }, []);

  const updateSpecialTask = useCallback(async (id: string, data: Partial<SpecialTask>) => {
    const updatedAt = now();
    setSpecialTasks(prev => {
      const exists = prev.some(o => o.id === id);
      let next: SpecialTask[];
      if (exists) {
        next = prev.map(o => o.id === id ? { ...o, ...data, updatedAt } : o);
      } else {
        const newTask: SpecialTask = {
          id,
          title: data.title || "Sin título",
          description: data.description,
          category: data.category || "campaign",
          status: data.status || "pending",
          priority: data.priority || "medium",
          startDate: data.startDate,
          endDate: data.endDate,
          isConstant: data.isConstant,
          progress: data.progress ?? 0,
          assignedTo: data.assignedTo || ["Equipo IT"],
          tasks: data.tasks || [],
          createdBy: data.createdBy,
          updatedBy: data.updatedBy,
          createdAt: updatedAt,
          updatedAt,
          bannerUrl: data.bannerUrl,
          price: data.price,
          rendicion: data.rendicion
        };
        next = [newTask, ...prev];
      }
      safeLocalStorageSetItem("techcontrol_special_tasks", next);
      return next;
    });

    const dbPayload: Record<string, any> = { id, updated_at: updatedAt };
    if (data.title !== undefined) dbPayload.title = data.title;
    if (data.description !== undefined) dbPayload.description = data.description;
    if (data.category !== undefined) dbPayload.category = data.category;
    if (data.status !== undefined) dbPayload.status = data.status;
    if (data.priority !== undefined) dbPayload.priority = data.priority;
    if (data.startDate !== undefined) dbPayload.start_date = data.startDate;
    if (data.endDate !== undefined) dbPayload.end_date = data.endDate;
    if (data.progress !== undefined) dbPayload.progress = data.progress;
    if (data.assignedTo !== undefined) dbPayload.assigned_to = data.assignedTo;
    if (data.tasks !== undefined) {
      dbPayload.tasks = data.tasks;
    }
    if (data.notes !== undefined) dbPayload.notes = data.notes;
    if (data.bannerUrl !== undefined) dbPayload.banner_url = data.bannerUrl;
    if (data.createdBy !== undefined) dbPayload.created_by = data.createdBy;
    if (data.updatedBy !== undefined) dbPayload.updated_by = data.updatedBy;
    if (data.price !== undefined) dbPayload.price = data.price;
    if (data.rendicion !== undefined) dbPayload.rendicion = data.rendicion;

    let { error } = await supabase.from("special_tasks").upsert(dbPayload);
    if (error) {
      const { error: updateErr } = await supabase.from("special_tasks").update(dbPayload).eq("id", id);
      error = updateErr;
    }

    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("does not exist")) {
        console.warn("La tabla special_tasks aún no existe en Supabase.");
      } else {
        console.warn("Error updating special task in Supabase:", error);
      }
    }
  }, []);

  const deleteSpecialTask = useCallback(async (id: string) => {
    setSpecialTasks(prev => {
      const next = prev.filter(o => o.id !== id);
      safeLocalStorageSetItem("techcontrol_special_tasks", next);
      return next;
    });

    const { error } = await supabase.from("special_tasks").delete().eq("id", id);
    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("does not exist")) {
        console.warn("La tabla special_tasks aún no existe en Supabase.");
      } else {
        console.error("Error deleting special task from Supabase:", error);
        toast.error("Error al eliminar tarea especial en base de datos");
      }
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        stockItems,
        printers,
        notebooks,
        monitors,
        users,
        orders,
        movements,
        addStockItem,
        updateStockItem,
        deleteStockItem,
        addPrinter,
        updatePrinter,
        deletePrinter,
        addNotebook,
        updateNotebook,
        updateNotebookStatus,
        deleteNotebook,
        addMonitor,
        updateMonitor,
        deleteMonitor,
        addUser,
        updateUser,
        deleteUser,
        addOrder,
        updateOrder,
        updateOrderStatus,
        deleteOrder,
        addMovement,
        dataliveTVs,
        addDataliveTV,
        updateDataliveTV,
        deleteDataliveTV,
        guardias,
        addGuardia,
        updateGuardia,
        deleteGuardia,
        notes,
        addNote,
        updateNote,
        deleteNote,
        reorderNotes,
        officeTickets,
        addOfficeTicket,
        updateOfficeTicket,
        deleteOfficeTicket,
        databaseCredentials,
        addDatabaseCredential,
        updateDatabaseCredential,
        deleteDatabaseCredential,
        objectives,
        addObjective,
        updateObjective,
        deleteObjective,
        specialTasks,
        addSpecialTask,
        updateSpecialTask,
        deleteSpecialTask,
        syncSpecialTasksFromSupabase,
        specialEvents,
        saveSpecialEvent,
        deleteSpecialEvent,
        syncSpecialEventsFromSupabase,
        holidayAssignments,
        turnOverrides,
        setHolidayAssignment,
        setTurnOverride,
        clearTurnOverride,
        currentPage,
        setCurrentPage: handleSetCurrentPage,
        selectedId,
        setSelectedId,
        loading,
        migrateAllData,
        guardiasViewMode,
        setGuardiasViewMode,
        session,
        userRole,
        loadingSession,
        logout,
        productPrices,
        addProductPrice,
        updateProductPrice,
        deleteProductPrice,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
