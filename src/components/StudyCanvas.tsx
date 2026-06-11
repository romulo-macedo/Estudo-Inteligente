/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from "react";
import { 
  Paintbrush, Eraser, RotateCcw, Trash2, Grid, Layers, AlignLeft, 
  Edit3, HelpCircle, Save, Check, AlertTriangle, BookOpen, Plus, 
  Folder, FileText, ChevronLeft, ChevronRight, Loader2, Edit, X 
} from "lucide-react";
import { DrawingStroke, DrawingPoint, Notebook, StudyNote } from "../types";

interface StudyCanvasProps {
  onActivityLogged: (type: "draw" | "notes") => void;
}

export default function StudyCanvas({ onActivityLogged }: StudyCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [activeMode, setActiveMode] = useState<"handwritten" | "text">("handwritten");
  
  // Canvas State
  const [paintColor, setPaintColor] = useState("#1e293b"); // default Slate 800
  const [brushWidth, setBrushWidth] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [gridStyle, setGridStyle] = useState<"ruled" | "dotted" | "blank">("ruled");
  const [palmRejection, setPalmRejection] = useState(true);
  const [palmRejectedNote, setPalmRejectedNote] = useState<string | null>(null);
  
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<DrawingPoint[]>([]);

  // Text Notes State
  const [textNotes, setTextNotes] = useState("");
  const [isSavedText, setIsSavedText] = useState(false);

  // --- SQLite State management ---
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeNoteTitle, setActiveNoteTitle] = useState("Minha Nota");

  // Sidebar controls
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Modals / Creational input states
  const [showAddNotebook, setShowAddNotebook] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState("");
  const [newNotebookColor, setNewNotebookColor] = useState("#6366f1");

  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteTitle, setEditingNoteTitle] = useState("");

  // 1. Fetch notebooks list from Server SQLite
  const fetchNotebooks = async (selectNotebookId?: string) => {
    try {
      const response = await fetch("/api/notebooks");
      if (response.ok) {
        const data: Notebook[] = await response.json();
        setNotebooks(data);
        if (data.length > 0) {
          const targetId = selectNotebookId || data[0].id;
          setActiveNotebookId(targetId);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar cadernos do SQLite:", err);
    }
  };

  // 2. Fetch study pages (notes) of the active notebook
  const fetchNotes = async (notebookId: string, selectNoteId?: string) => {
    try {
      const response = await fetch(`/api/notebooks/${notebookId}/notes`);
      if (response.ok) {
        const data: StudyNote[] = await response.json();
        setNotes(data);
        if (data.length > 0) {
          const targetNoteId = selectNoteId || data[0].id;
          setActiveNoteId(targetNoteId);
          const activePage = data.find(n => n.id === targetNoteId);
          if (activePage) {
            setActiveNoteTitle(activePage.title);
            setTextNotes(activePage.textNotes || "");
            try {
              const decodedStrokes = typeof activePage.strokes === "string"
                ? JSON.parse(activePage.strokes)
                : activePage.strokes;
              setStrokes(decodedStrokes || []);
            } catch (pErr) {
              setStrokes([]);
            }
          }
        } else {
          // Notebook is empty, craft a new page immediately
          const autoId = `note-${Date.now()}`;
          const autoTitle = "Anotação Inicial";
          await handleCreateNoteImmediate(autoId, notebookId, autoTitle);
        }
      }
    } catch (err) {
      console.error("Erro ao puxar notas do caderno:", err);
    }
  };

  // 3. Create note on sqlite backend immediately
  const handleCreateNoteImmediate = async (id: string, notebookId: string, title: string) => {
    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          notebookId,
          title,
          strokes: "[]",
          textNotes: ""
        })
      });
      if (response.ok) {
        if (notebookId === activeNotebookId) {
          await fetchNotes(notebookId, id);
        }
      }
    } catch (err) {
      console.error("Erro ao auto-criar nota:", err);
    }
  };

  // Save current active note data (strokes / textNotes) to SQLite DB
  const saveCurrentNoteData = async (noteIdToSave: string, strokesToSave: DrawingStroke[], textNotesToSave: string) => {
    if (!activeNotebookId || !noteIdToSave) return;
    setIsSaving(true);
    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: noteIdToSave,
          notebookId: activeNotebookId,
          title: activeNoteTitle,
          strokes: JSON.stringify(strokesToSave),
          textNotes: textNotesToSave
        })
      });
      if (response.ok) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
        
        // Sync note in current list states locally
        setNotes(prev => prev.map(n => {
          if (n.id === noteIdToSave) {
            return {
              ...n,
              title: activeNoteTitle,
              strokes: JSON.stringify(strokesToSave),
              textNotes: textNotesToSave,
              updatedAt: Date.now()
            };
          }
          return n;
        }));
      }
    } catch (err) {
      console.error("Erro ao salvar dados no SQLite:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Mount logic - load folders
  useEffect(() => {
    fetchNotebooks();
  }, []);

  // Reload notes when selected notebook folder toggles
  useEffect(() => {
    if (activeNotebookId) {
      fetchNotes(activeNotebookId);
    }
  }, [activeNotebookId]);

  // Handle switching pages
  const handleSelectPage = (noteId: string) => {
    // 1. Auto-save former active page data before switching
    if (activeNoteId) {
      saveCurrentNoteData(activeNoteId, strokes, textNotes);
    }

    const clicked = notes.find(n => n.id === noteId);
    if (clicked) {
      setActiveNoteId(noteId);
      setActiveNoteTitle(clicked.title);
      setTextNotes(clicked.textNotes || "");
      try {
        const decodedStrokes = typeof clicked.strokes === "string"
          ? JSON.parse(clicked.strokes)
          : clicked.strokes;
        setStrokes(decodedStrokes || []);
      } catch (e) {
        setStrokes([]);
      }
    }
  };

  // Create Notebook Actions
  const handleAddNotebookSubmit = async () => {
    if (!newNotebookName.trim()) return;
    const id = `notebook-${Date.now()}`;
    try {
      const response = await fetch("/api/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: newNotebookName.trim(),
          color: newNotebookColor
        })
      });
      if (response.ok) {
        setShowAddNotebook(false);
        setNewNotebookName("");
        await fetchNotebooks(id);
      }
    } catch (err) {
      console.error("Erro ao cadastrar caderno:", err);
    }
  };

  // Delete Notebook Action (deletes all notes in cascade)
  const handleDeleteNotebook = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (id === "caderno-principal") {
      alert("O Caderno Principal é vital de contingência e não pode ser excluído.");
      return;
    }
    if (window.confirm("Aviso de Segurança: Tem certeza de que deseja excluir este Caderno? Todos os desenhos de caneta e anotações dele serão apagados permanentemente do banco de dados SQLite!")) {
      try {
        const response = await fetch(`/api/notebooks/${id}`, { method: "DELETE" });
        if (response.ok) {
          if (activeNotebookId === id) {
            await fetchNotebooks();
          } else {
            setNotebooks(prev => prev.filter(nb => nb.id !== id));
          }
        }
      } catch (err) {
        console.error("Erro ao apagar caderno:", err);
      }
    }
  };

  // Create Note Page inside active Notebook
  const handleAddPageSubmit = async () => {
    if (!activeNotebookId) return;
    const title = newNoteTitle.trim() || `Aula ${notes.length + 1}`;
    const id = `note-${Date.now()}`;
    try {
      // Auto-save existing page before creation
      if (activeNoteId) {
        await saveCurrentNoteData(activeNoteId, strokes, textNotes);
      }

      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          notebookId: activeNotebookId,
          title,
          strokes: "[]",
          textNotes: ""
        })
      });
      if (response.ok) {
        setShowAddNote(false);
        setNewNoteTitle("");
        await fetchNotes(activeNotebookId, id);
      }
    } catch (err) {
      console.error("Erro ao salvar nova página:", err);
    }
  };

  // Delete specific study page
  const handleDeletePage = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (notes.length <= 1) {
      alert("Você precisa mantes pelo menos uma página ativa de estudo em cada caderno.");
      return;
    }
    if (window.confirm("Excluir Página: Deseja realmente remover essa folha do caderno com todos os seus riscos e digitações do SQLite?")) {
      try {
        const response = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
        if (response.ok) {
          if (activeNoteId === noteId) {
            const nextActiveList = notes.filter(n => n.id !== noteId);
            await handleSelectPage(nextActiveList[0].id);
          } else {
            setNotes(prev => prev.filter(n => n.id !== noteId));
          }
        }
      } catch (err) {
        console.error("Erro ao excluir página:", err);
      }
    }
  };

  // Rename page title inline Helper
  const startRenamePage = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNoteId(id);
    setEditingNoteTitle(currentTitle);
  };

  const handleRenamePageSubmit = async (id: string) => {
    if (!editingNoteTitle.trim()) return;
    try {
      const pageToEdit = notes.find(n => n.id === id);
      if (pageToEdit) {
        const response = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            notebookId: activeNotebookId,
            title: editingNoteTitle.trim(),
            strokes: typeof pageToEdit.strokes === "string" ? pageToEdit.strokes : JSON.stringify(pageToEdit.strokes),
            textNotes: pageToEdit.textNotes || ""
          })
        });
        if (response.ok) {
          if (activeNoteId === id) {
            setActiveNoteTitle(editingNoteTitle.trim());
          }
          setNotes(prev => prev.map(n => n.id === id ? { ...n, title: editingNoteTitle.trim() } : n));
          setEditingNoteId(null);
        }
      }
    } catch (err) {
      console.error("Erro ao renomear página:", err);
    }
  };


  // --- Original Drawing Logic Backings ---

  // Sync text notes to localstate & trigger server save on click
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setTextNotes(value);
    setIsSavedText(false);
  };

  // Quick helper inserts inside written Notepad
  const handleInsertTag = (tagType: string) => {
    let tag = "";
    if (tagType === "vocab") tag = "\n📌 [VOCABULÁRIO]: Termo - Tradução - Significado\n";
    if (tagType === "grammar") tag = "\n💡 [NÚCLEO GRAMATICAL]: Explicação curta\n";
    if (tagType === "phrase") tag = "\n⭐ [FRASE DE EXPRESSÃO]: Frase em inglês - Tradução\n";
    
    const newVal = textNotes + tag;
    setTextNotes(newVal);
    
    // Auto-save tag insertion
    if (activeNoteId) {
      saveCurrentNoteData(activeNoteId, strokes, newVal);
    }
    onActivityLogged("notes");
  };

  // Explicit Save Notepad button
  const saveTextChanges = () => {
    if (activeNoteId) {
      saveCurrentNoteData(activeNoteId, strokes, textNotes);
    }
    setIsSavedText(true);
    onActivityLogged("notes");
    setTimeout(() => setIsSavedText(false), 2000);
  };

  // Clear Canvas Drawing Board
  const handleClearStrokes = () => {
    if (window.confirm("Deseja realmente limpar toda esta página do caderno? Seus traços antigos serão redefinidos.")) {
      setStrokes([]);
      if (activeNoteId) {
        saveCurrentNoteData(activeNoteId, [], textNotes);
      }
    }
  };

  // Undo Last Stroke
  const handleUndoStroke = () => {
    const updated = [...strokes];
    updated.pop();
    setStrokes(updated);
    if (activeNoteId) {
      saveCurrentNoteData(activeNoteId, updated, textNotes);
    }
  };

  // Set sizing of the HTML5 Canvas to fill its wrapper seamlessly
  const updateCanvasSize = () => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;

    canvas.width = containerRef.current.clientWidth;
    canvas.height = containerRef.current.clientHeight || 500;
    
    redrawCanvas();
  };

  // Trigger canvas sizing on mount, resize, and activeMode toggle
  useEffect(() => {
    if (activeMode === "handwritten") {
      const timer = setTimeout(() => {
        updateCanvasSize();
      }, 150);

      window.addEventListener("resize", updateCanvasSize);
      return () => {
        window.removeEventListener("resize", updateCanvasSize);
        clearTimeout(timer);
      };
    }
  }, [activeMode, gridStyle, isSidebarOpen]);

  // Handle actual redraw updates
  useEffect(() => {
    redrawCanvas();
  }, [strokes, gridStyle, activeMode]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear whole stage
    ctx.clearRect(0, 0, w, h);

    // Draw Notebook Grid Backings
    drawNotebookBacking(ctx, w, h);

    // Draw existing strokes
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    strokes.forEach((stroke) => {
      if (stroke.points.length < 1) return;

      ctx.beginPath();
      if (stroke.isEraser) {
        ctx.strokeStyle = "#ffffff"; // matching canvas background
        ctx.lineWidth = stroke.width * 2;
      } else {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
      }

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
  };

  // Drawing Notebook lines
  const drawNotebookBacking = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (gridStyle === "ruled") {
      ctx.strokeStyle = "#38bdf840"; // Sky blue lines
      ctx.lineWidth = 1;
      const spacing = 28;
      
      for (let y = spacing; y < h; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Draw red margin line
      ctx.strokeStyle = "#fda4af80"; // soft rose red
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(48, 0);
      ctx.lineTo(48, h);
      ctx.stroke();
    } else if (gridStyle === "dotted") {
      ctx.fillStyle = "#cbd5e170"; // soft dot grays
      const spacing = 24;
      for (let x = spacing; x < w; x += spacing) {
        for (let y = spacing; y < h; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  };

  // Coordinates tracker
  const getCoordinates = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent): DrawingPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    
    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: (e as MouseEvent).clientX - rect.left,
        y: (e as MouseEvent).clientY - rect.top,
      };
    }
  };

  // Ink Draw Event Handlers
  const handleStartDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    if (!isEraser && palmRejection) {
      const nativeEvent = e.nativeEvent;
      let isFingerTouch = false;
      
      if ("touches" in e && e.touches.length > 0) {
        if (e.touches[0].touchType === "direct") {
          isFingerTouch = true;
        }
      } else if (nativeEvent && "touches" in nativeEvent && nativeEvent.touches.length > 0) {
        if (nativeEvent.touches[0].touchType === "direct") {
          isFingerTouch = true;
        }
      }

      if (isFingerTouch) {
        setPalmRejectedNote("Toque de mão rejeitado em favor de canetas ativas / Stylus!");
        setTimeout(() => setPalmRejectedNote(null), 2500);
        return;
      }
    }

    const coords = getCoordinates(e.nativeEvent);
    if (!coords) return;

    isDrawingRef.current = true;
    currentPointsRef.current = [coords];

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(coords.x, coords.y);
      
      if (isEraser) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = brushWidth * 2;
      } else {
        ctx.strokeStyle = paintColor;
        ctx.lineWidth = brushWidth;
      }
    }
  };

  const handleMoveDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;

    if (!isEraser && palmRejection) {
      const nativeEvent = e.nativeEvent;
      let isFingerTouch = false;
      
      if ("touches" in e && e.touches.length > 0) {
        if (e.touches[0].touchType === "direct") {
          isFingerTouch = true;
        }
      } else if (nativeEvent && "touches" in nativeEvent && nativeEvent.touches.length > 0) {
        if (nativeEvent.touches[0].touchType === "direct") {
          isFingerTouch = true;
        }
      }

      if (isFingerTouch) return;
    }
    
    const coords = getCoordinates(e.nativeEvent);
    if (!coords) return;

    currentPointsRef.current.push(coords);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const handleEndDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (currentPointsRef.current.length > 1) {
      const newStroke: DrawingStroke = {
        id: `stroke-${Date.now()}`,
        points: currentPointsRef.current,
        color: paintColor,
        width: brushWidth,
        isEraser: isEraser,
      };

      const updated = [...strokes, newStroke];
      setStrokes(updated);
      onActivityLogged("draw");

      // Auto-save on backend SQLite immediately
      if (activeNoteId) {
        saveCurrentNoteData(activeNoteId, updated, textNotes);
      }
    }

    currentPointsRef.current = [];
  };

  return (
    <div className="flex h-full bg-slate-100 dark:bg-slate-900 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
      
      {/* 1. Cadernos & Páginas Sidebar Organizator Panel */}
      {isSidebarOpen && (
        <div className="w-64 bg-slate-950 flex flex-col h-full border-r border-slate-900 shrink-0 text-slate-200">
          
          {/* Header Cadernos */}
          <div className="p-4 border-b border-slate-900 bg-slate-950/70 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
              <Folder className="w-4 h-4 text-amber-500" />
              Seus Cadernos
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowAddNotebook(!showAddNotebook)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
                title="Criar novo caderno"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition cursor-pointer"
                title="Ocultar Cadernos"
                id="btn-hide-notebooks-sidebar"
              >
                <ChevronLeft className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* New Notebook Popover Drawer Form */}
          {showAddNotebook && (
            <div className="p-4 bg-slate-900/60 border-b border-slate-850 space-y-3">
              <input
                type="text"
                placeholder="Anotações Incríveis..."
                value={newNotebookName}
                onChange={(e) => setNewNotebookName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[10px] text-slate-500">Cor de Identificação:</span>
                <div className="flex gap-1">
                  {["#6366f1", "#10b981", "#ef4444", "#f59e0b", "#a855f7"].map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewNotebookColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-3.5 h-3.5 rounded-full ring-offset-slate-900 ${
                        newNotebookColor === color ? "ring-2 ring-white" : ""
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-1.5 pt-1">
                <button
                  onClick={() => setShowAddNotebook(false)}
                  className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddNotebookSubmit}
                  className="px-3 py-1 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
                >
                  Criar
                </button>
              </div>
            </div>
          )}

          {/* List of Notebook Folders */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-950">
            {notebooks.map((nb) => {
              const isActive = activeNotebookId === nb.id;
              return (
                <div key={nb.id} className="space-y-1">
                  <div
                    onClick={() => {
                      if (activeNoteId) {
                        saveCurrentNoteData(activeNoteId, strokes, textNotes);
                      }
                      setActiveNotebookId(nb.id);
                    }}
                    style={{ borderLeftColor: nb.color }}
                    className={`group px-3 py-2 border-l-3 rounded-xl flex items-center justify-between cursor-pointer transition ${
                      isActive 
                        ? "bg-slate-900 text-white font-bold" 
                        : "text-slate-400 hover:bg-slate-900/45 hover:text-slate-200"
                    }`}
                  >
                    <span className="text-xs truncate flex items-center gap-2">
                      <span 
                        className="w-2 h-2 rounded-full inline-block" 
                        style={{ backgroundColor: nb.color }} 
                      />
                      {nb.name}
                    </span>
                    
                    {nb.id !== "caderno-principal" && (
                      <button
                        onClick={(e) => handleDeleteNotebook(nb.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-800 rounded-md text-slate-500 hover:text-red-400 transition"
                        title="Deletar este caderno"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* If active, list its corresponding page files below it in nested lists */}
                  {isActive && (
                    <div className="pl-4 pr-1 py-1.5 space-y-1 border-l border-slate-900 ml-3.5">
                      <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500 py-1 font-mono">
                        <span>Páginas Ativas</span>
                        <button
                          onClick={() => setShowAddNote(!showAddNote)}
                          className="hover:text-white p-0.5 rounded"
                          title="Nova folha de estudos"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Add Page Form popover inline */}
                      {showAddNote && (
                        <div className="p-2 bg-slate-900 rounded-xl space-y-1.5 border border-slate-850 mb-1.5">
                          <input
                            type="text"
                            placeholder="Aula de Gramática..."
                            value={newNoteTitle}
                            onChange={(e) => setNewNoteTitle(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none"
                          />
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => setShowAddNote(false)}
                              className="text-[9px] text-slate-400 px-1.5 py-0.5"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={handleAddPageSubmit}
                              className="bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-md"
                            >
                              Adicionar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Nested study pages list (notes) */}
                      {notes.map((note) => {
                        const isNoteActive = activeNoteId === note.id;
                        const isEditing = editingNoteId === note.id;

                        return (
                          <div
                            key={note.id}
                            onClick={() => handleSelectPage(note.id)}
                            className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-[11px] transition ${
                              isNoteActive
                                ? "bg-indigo-950/40 text-indigo-200 border border-indigo-900/50"
                                : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                            }`}
                          >
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingNoteTitle}
                                onChange={(e) => setEditingNoteTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleRenamePageSubmit(note.id);
                                  if (e.key === "Escape") setEditingNoteId(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onBlur={() => handleRenamePageSubmit(note.id)}
                                className="w-full bg-slate-950 border border-indigo-500 rounded px-1 text-[10px] text-white py-0.5"
                                autoFocus
                              />
                            ) : (
                              <span className="truncate flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                {note.title}
                              </span>
                            )}

                            {!isEditing && (
                              <div className="flex opacity-0 group-hover:opacity-100 items-center gap-0.5 select-none text-[10px]">
                                <button
                                  onClick={(e) => startRenamePage(note.id, note.title, e)}
                                  className="p-0.5 hover:bg-slate-800 text-slate-500 hover:text-slate-200 rounded"
                                  title="Renomear página"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => handleDeletePage(note.id, e)}
                                  className="p-0.5 hover:bg-slate-800 text-slate-500 hover:text-red-400 rounded"
                                  title="Excluir página"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* SQLite DB Active Indicator Footer */}
          <div className="p-3 bg-slate-950 border-t border-slate-900 text-[10px] text-slate-500 space-y-1">
            <span className="flex items-center gap-1 font-semibold text-sky-500">
              <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse" />
              SQLite Local DB Ativo
            </span>
            <p className="leading-tight">Todos os seus registros residem num banco SQLite dedicado de alta eficiência.</p>
          </div>
        </div>
      )}

      {/* 2. Main Canvas Blackboard & Written Notepad area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900">
        
        {/* Top bar controls */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {/* Sidebar toggle Book Button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 px-3 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 transition cursor-pointer flex items-center gap-1.5"
              title={isSidebarOpen ? "Recolher Cadernos" : "Gerenciador de Cadernos"}
              id="btn-toggle-notebooks-sidebar"
            >
              {isSidebarOpen ? (
                <BookOpen className="w-4 h-4 text-indigo-500" />
              ) : (
                <>
                  <BookOpen className="w-4 h-4 text-emerald-500 animate-pulse" />
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Mostrar Cadernos</span>
                </>
              )}
            </button>

            {/* Note title display label header */}
            <div className="hidden sm:block pl-2 border-l border-slate-300 dark:border-slate-700">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block font-mono">Página Atual</span>
              <strong className="text-xs text-slate-700 dark:text-slate-250 truncate block max-w-[150px]">
                {activeNoteTitle}
              </strong>
            </div>

            {/* Mode selection buttons switch to handwriting vs type text */}
            <div className="flex items-center bg-slate-200/75 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold ml-1">
              <button
                onClick={() => setActiveMode("handwritten")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeMode === "handwritten"
                    ? "bg-white text-slate-800 dark:bg-slate-700 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Caderno Digital (Caneta)</span>
                <span className="md:hidden">Caneta</span>
              </button>
              <button
                onClick={() => setActiveMode("text")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeMode === "text"
                    ? "bg-white text-slate-800 dark:bg-slate-700 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Notepad (Teclado)</span>
                <span className="md:hidden">Digitar</span>
              </button>
            </div>
          </div>

          {/* Context controls and server cloud syncing tags */}
          <div className="flex items-center gap-3">
            
            {/* Syncing indicator tag */}
            <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1.5 bg-slate-150/50 dark:bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-200/40">
              {isSaving ? (
                <>
                  <Loader2 className="w-3 h-3 text-indigo-500 animate-spin" />
                  <span>Salvando no SQLite...</span>
                </>
              ) : isSaved ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-500">Alterações salvas!</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>SQLite Sincronizado</span>
                </>
              )}
            </div>

            {activeMode === "handwritten" ? (
              <div className="flex items-center gap-1.5">
                {/* Grid style picker */}
                <div className="flex items-center bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
                  {(["ruled", "dotted", "blank"] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() => setGridStyle(style)}
                      title={`Fundo: ${style}`}
                      className={`px-2 py-1 text-[10px] uppercase font-bold rounded-md transition ${
                        gridStyle === style
                          ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      {style === "ruled" ? "Linhas" : style === "dotted" ? "Pontos" : "Liso"}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleUndoStroke}
                  disabled={strokes.length === 0}
                  className="p-2 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 disabled:opacity-40 rounded-lg text-slate-700 dark:text-slate-200 transition"
                  title="Desfazer traço"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleClearStrokes}
                  disabled={strokes.length === 0}
                  className="p-2 bg-white hover:bg-red-50 hover:text-red-500 dark:bg-slate-800 dark:hover:bg-red-950/20 border border-slate-200 dark:border-slate-700 disabled:opacity-40 rounded-lg text-slate-500 transition"
                  title="Limpar Caderno"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  onClick={saveTextChanges}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-sm transition duration-150 flex items-center gap-1"
                >
                  {isSavedText ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                  {isSavedText ? "Salvo" : "Salvar Notas"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Note Editor Active Stage space */}
        <div className="flex-1 min-h-0 relative flex flex-col">
          {activeMode === "handwritten" ? (
            <div className="flex-1 flex flex-col min-h-0 relative bg-white">
              
              {/* Tool drawer floating right pane */}
              <div className="absolute right-4 top-4 z-10 bg-white/95 dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 p-2.5 rounded-2xl shadow-lg flex flex-col gap-3">
                <div className="flex gap-1.5 p-0.5 bg-slate-100 dark:bg-slate-900 rounded-xl">
                  <button
                    onClick={() => setIsEraser(false)}
                    className={`p-2 rounded-lg transition ${
                      !isEraser
                        ? "bg-white text-indigo-600 dark:bg-slate-800 dark:text-indigo-400 font-bold"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                    title="Modo Caneta"
                  >
                    <Paintbrush className="w-4.5 h-4.5" />
                  </button>
                  <button
                    onClick={() => setIsEraser(true)}
                    className={`p-2 rounded-lg transition ${
                      isEraser
                        ? "bg-white text-indigo-600 dark:bg-slate-800 dark:text-indigo-400 font-bold"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                    title="Borracha de Apagar"
                  >
                    <Eraser className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Colors section */}
                {!isEraser && (
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-[9px] uppercase font-bold text-slate-400">Caneta</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { hex: "#1e293b", name: "Slate" },
                        { hex: "#2563eb", name: "Blue" },
                        { hex: "#16a34a", name: "Green" },
                        { hex: "#dc2626", name: "Red" }
                      ].map((color) => (
                        <button
                          key={color.hex}
                          onClick={() => {
                            setPaintColor(color.hex);
                            setIsEraser(false);
                          }}
                          style={{ backgroundColor: color.hex }}
                          className={`w-5.5 h-5.5 rounded-full border transition ${
                            paintColor === color.hex && !isEraser
                              ? "ring-2 ring-indigo-500 ring-offset-2 scale-110"
                              : "border-slate-300"
                          }`}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Sizes section picker */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400">Espessura</span>
                  <div className="flex gap-1">
                    {[2, 3, 5, 8].map((size) => (
                      <button
                        key={size}
                        onClick={() => setBrushWidth(size)}
                        className={`w-5 h-5 text-[10px] font-bold rounded flex items-center justify-center transition ${
                          brushWidth === size
                            ? "bg-indigo-100 text-indigo-700 dark:bg-slate-700 dark:text-indigo-300"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-500 dark:bg-slate-900"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Palm rejection toggler */}
                <div className="flex flex-col items-center gap-1.5 border-t border-slate-100/50 dark:border-slate-700/50 pt-2.5 mt-0.5">
                  <span className="text-[9px] uppercase font-bold text-slate-400">Caneta Ativa</span>
                  <button
                    onClick={() => setPalmRejection(!palmRejection)}
                    className={`w-full py-1.5 px-2 text-[10px] uppercase font-bold rounded-xl transition border flex items-center justify-center gap-1 cursor-pointer ${
                      palmRejection
                        ? "bg-emerald-600/10 text-emerald-400 border-emerald-500/20"
                        : "bg-slate-100 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${palmRejection ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                    {palmRejection ? "Ignorar Dedo" : "Aceitar Dedo"}
                  </button>
                </div>
              </div>

              {/* Rejected warn overlay HUD popup */}
              {palmRejectedNote && (
                <div className="absolute left-1/2 -translate-x-1/2 top-4 z-40 bg-amber-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl shadow-md border border-amber-400/30 flex items-center gap-2 animate-bounce">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-slate-950 animate-pulse" />
                  <span>{palmRejectedNote}</span>
                </div>
              )}

              {/* Info guideline indicator header */}
              <div className="absolute left-6 top-4 z-10 bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-700/60 p-1.5 px-3 rounded-lg flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 pointer-events-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Estilo Digital: Todos os seus traçados são sincronizados de forma nativa no SQLite.
              </div>

              {/* Drawing area stage */}
              <div ref={containerRef} className="flex-1 w-full relative overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleStartDrawing}
                  onMouseMove={handleMoveDrawing}
                  onMouseUp={handleEndDrawing}
                  onMouseLeave={handleEndDrawing}
                  onTouchStart={handleStartDrawing}
                  onTouchMove={handleMoveDrawing}
                  onTouchEnd={handleEndDrawing}
                  className="absolute inset-0 cursor-crosshair touch-none"
                />
              </div>
            </div>
          ) : (
            // Written Notepad editor panel
            <div className="flex-1 flex flex-col p-4 bg-slate-50 dark:bg-slate-950/20 overflow-y-auto">
              
              {/* Insert Tags helpers */}
              <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-none flex-shrink-0">
                <button
                  onClick={() => handleInsertTag("vocab")}
                  className="px-2.5 py-1 text-[11px] bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border border-sky-100/50 rounded-lg hover:bg-sky-100 transition font-bold cursor-pointer"
                >
                  + Adicionar Bloco Vocabulário
                </button>
                <button
                  onClick={() => handleInsertTag("grammar")}
                  className="px-2.5 py-1 text-[11px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-100/50 rounded-lg hover:bg-emerald-100 transition font-bold cursor-pointer"
                >
                  + Adicionar Nota Gramatical
                </button>
                <button
                  onClick={() => handleInsertTag("phrase")}
                  className="px-2.5 py-1 text-[11px] bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100/50 rounded-lg hover:bg-indigo-100 transition font-bold cursor-pointer"
                >
                  + Adicionar Expressão Útil
                </button>
              </div>

              {/* Notepad text area wrapper */}
              <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-3 shadow-xs">
                <textarea
                  placeholder="Seu rascunho de texto e anotações para salvar no banco SQLite..."
                  value={textNotes}
                  onChange={handleTextChange}
                  className="flex-1 w-full bg-transparent border-none outline-none resize-none text-slate-800 dark:text-slate-150 font-sans text-sm p-1 leading-relaxed focus:ring-0 placeholder-slate-400"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
