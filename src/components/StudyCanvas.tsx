/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from "react";
import { Paintbrush, Eraser, RotateCcw, Trash2, Grid, Layers, AlignLeft, Edit3, HelpCircle, Save, Check, AlertTriangle } from "lucide-react";
import { DrawingStroke, DrawingPoint } from "../types";

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

  // Load existing strokes & text notes
  useEffect(() => {
    const savedStrokes = localStorage.getItem("english_tablet_canvas_strokes");
    if (savedStrokes) {
      try {
        setStrokes(JSON.parse(savedStrokes));
      } catch (err) {
        console.error("Erro ao carregar desenhos salvos:", err);
      }
    }

    const savedTextNotes = localStorage.getItem("english_tablet_text_notes");
    if (savedTextNotes) {
      setTextNotes(savedTextNotes);
    }
  }, []);

  // Sync text notes to localstorage with debounce/change
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setTextNotes(value);
    localStorage.setItem("english_tablet_text_notes", value);
    setIsSavedText(false);
  };

  // Quick insert buttons for text notes
  const handleInsertTag = (tagType: string) => {
    let tag = "";
    if (tagType === "vocab") tag = "\n📌 [VOCABULÁRIO]: Termo - Tradução - Significado\n";
    if (tagType === "grammar") tag = "\n💡 [NÚCLEO GRAMATICAL]: Explicação curta\n";
    if (tagType === "phrase") tag = "\n⭐ [FRASE DE EXPRESSÃO]: Frase em inglês - Tradução\n";
    
    const newVal = textNotes + tag;
    setTextNotes(newVal);
    localStorage.setItem("english_tablet_text_notes", newVal);
    onActivityLogged("notes");
  };

  const saveTextChanges = () => {
    setIsSavedText(true);
    onActivityLogged("notes");
    setTimeout(() => setIsSavedText(false), 2000);
  };

  // Clear Canvas Drawing Board
  const handleClearStrokes = () => {
    if (window.confirm("Deseja realmente limpar toda esta página do caderno?")) {
      setStrokes([]);
      localStorage.setItem("english_tablet_canvas_strokes", JSON.stringify([]));
    }
  };

  // Undo Last Stroke
  const handleUndoStroke = () => {
    const updated = [...strokes];
    updated.pop();
    setStrokes(updated);
    localStorage.setItem("english_tablet_canvas_strokes", JSON.stringify(updated));
  };

  // Set sizing of the HTML5 Canvas to fill its wrapper seamlessly
  const updateCanvasSize = () => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    canvas.width = containerRef.current.clientWidth;
    canvas.height = containerRef.current.clientHeight || 500;
    
    redrawCanvas();
  };

  // Trigger canvas sizing on mount, resize, and activeMode toggle
  useEffect(() => {
    if (activeMode === "handwritten") {
      // Delay slightly to allow container to render fully
      const timer = setTimeout(() => {
        updateCanvasSize();
      }, 100);

      window.addEventListener("resize", updateCanvasSize);
      return () => {
        window.removeEventListener("resize", updateCanvasSize);
        clearTimeout(timer);
      };
    }
  }, [activeMode, gridStyle]);

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
      // Configure stroke properties
      if (stroke.isEraser) {
        ctx.strokeStyle = "#ffffff"; // matching canvas background
        ctx.lineWidth = stroke.width * 2; // eraser is wider
      } else {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
      }

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      // Draw quadratic curve trails or line segments
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
      
      // Draw ruled writing lines
      for (let y = spacing; y < h; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Draw red margin line
      ctx.strokeStyle = "#fda4af80"; // soft rose red margin line
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

  // Draw event helpers
  const getCoordinates = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent): DrawingPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    
    // Check if Touch
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

  // Event Handlers
  const handleStartDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    // Hand Touch rejection logic when in Caneta (pen) mode with palm rejection enabled
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
        setPalmRejectedNote("Toque de mão rejeitado em favor da caneta Stylus!");
        setTimeout(() => setPalmRejectedNote(null), 2500);
        return; // REJECT TOUCH!
      }
    }

    const coords = getCoordinates(e.nativeEvent);
    if (!coords) return;

    isDrawingRef.current = true;
    currentPointsRef.current = [coords];

    // Trigger visual draw directly
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

    // Palm rejection block during drag moves
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
        return; // REJECT TOUCH DRAG!
      }
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
      localStorage.setItem("english_tablet_canvas_strokes", JSON.stringify(updated));
      onActivityLogged("draw");
    }

    currentPointsRef.current = [];
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
      {/* Top Bar Navigation / Toggle */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center bg-slate-200/75 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveMode("handwritten")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeMode === "handwritten"
                ? "bg-white text-slate-800 dark:bg-slate-700 dark:text-slate-100 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Caderno Digital (Caneta)
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
            Notepad (Teclado)
          </button>
        </div>

        {/* Dynamic Context controls based on selection */}
        {activeMode === "handwritten" ? (
          <div className="flex items-center gap-1.5">
            {/* Grid selector */}
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
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
              {isSavedText ? "Salvo" : "Salvar"}
            </button>
          </div>
        )}
      </div>

      {/* Main Study Note Space */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        {activeMode === "handwritten" ? (
          <div className="flex-1 flex flex-col min-h-0 relative">
            {/* Ink controls floating drawer */}
            <div className="absolute right-4 top-4 z-10 bg-white/95 dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 p-2.5 rounded-2xl shadow-lg flex flex-col gap-3">
              {/* Brush/Eraser Toggle */}
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
                  title="Borracha"
                >
                  <Eraser className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Color Drawer */}
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

              {/* Size Slider */}
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

              {/* Palm Rejection Toggle */}
              <div className="flex flex-col items-center gap-1.5 border-t border-slate-100/50 dark:border-slate-700/50 pt-2.5 mt-0.5">
                <span className="text-[9px] uppercase font-bold text-slate-450 dark:text-slate-400">Caneta Ativa</span>
                <button
                  onClick={() => setPalmRejection(!palmRejection)}
                  className={`w-full py-1.5 px-2 text-[10px] uppercase font-bold rounded-xl transition border flex items-center justify-center gap-1 cursor-pointer ${
                    palmRejection
                      ? "bg-emerald-600/10 text-emerald-400 border-emerald-500/20"
                      : "bg-slate-100 dark:bg-slate-900 text-slate-550 border-slate-200 dark:border-slate-800"
                  }`}
                  title="Bloquear o toque de mão/dedo se estiver usando a caneta"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${palmRejection ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                  {palmRejection ? "Ignorar Dedo" : "Aceitar Dedo"}
                </button>
              </div>
            </div>

            {/* Hand Touch Palm Rejection HUD Warning Notification */}
            {palmRejectedNote && (
              <div className="absolute left-1/2 -translate-x-1/2 top-4 z-40 bg-amber-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl shadow-md border border-amber-400/30 flex items-center gap-1.5 animate-bounce">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-slate-950 animate-pulse" />
                <span>{palmRejectedNote}</span>
              </div>
            )}

            {/* Instruction tooltip */}
            <div className="absolute left-6 top-4 z-10 bg-slate-50 border border-slate-200/60 p-1.5 px-3 rounded-lg flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Estilo Tablet: Desenhe ou faça anotações livres com a sua caneta digital
            </div>

            {/* Canvas Area Container wrapper */}
            <div ref={containerRef} className="flex-1 w-full bg-white relative overflow-hidden">
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
          // Text Rich notes interface
          <div className="flex-1 flex flex-col p-4 bg-slate-50 dark:bg-slate-950/20 overflow-y-auto">
            {/* Quick insert buttons wrapper */}
            <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-none flex-shrink-0">
              <button
                onClick={() => handleInsertTag("vocab")}
                className="px-2.5 py-1 text-[11px] bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border border-sky-100/50 rounded-lg hover:bg-sky-100 transition font-bold"
              >
                + Adicionar Bloco Vocabulário
              </button>
              <button
                onClick={() => handleInsertTag("grammar")}
                className="px-2.5 py-1 text-[11px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-100/50 rounded-lg hover:bg-emerald-100 transition font-bold"
              >
                + Adicionar Nota Gramatical
              </button>
              <button
                onClick={() => handleInsertTag("phrase")}
                className="px-2.5 py-1 text-[11px] bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100/50 rounded-lg hover:bg-indigo-100 transition font-bold"
              >
                + Adicionar Expressão Útil
              </button>
            </div>

            {/* Editor Textarea */}
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-3 shadow-xs">
              <textarea
                placeholder="Comece a registrar suas anotações livres de estudo aqui..."
                value={textNotes}
                onChange={handleTextChange}
                className="flex-1 w-full bg-transparent border-none outline-none resize-none text-slate-800 dark:text-slate-100 font-sans text-sm p-1 leading-relaxed focus:ring-0 placeholder-slate-400"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
