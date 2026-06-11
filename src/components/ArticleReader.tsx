/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  BookOpen, Sparkles, FileText, Upload, PlusCircle, Check, Info, 
  Rss, Search, Loader2, RefreshCw, ChevronLeft, AlertCircle, Newspaper 
} from "lucide-react";
import { PresetArticle } from "../types";

interface ArticleReaderProps {
  onWordLookup: (word: string, context?: string) => void;
  activeLookupWord?: string;
}

const PRESET_ARTICLES: PresetArticle[] = [
  {
    id: "art-1",
    title: "Exploring a Coastal Town",
    level: "Iniciante",
    category: "Viagem & Cultura",
    content: "The small town sits right next to the beautiful blue ocean. Every morning, warm sunlight shines on the houses. People wake up early and walk along the quiet beach. Seafood restaurants open their doors, preparing fresh fish for lunch. Tourists love to take pictures of the old lighthouse. It is a peaceful place to learn English and enjoy nature concurrently."
  },
  {
    id: "art-2",
    title: "The Art of Coffee making",
    level: "Intermediário",
    category: "Culinária & Estilo de Vida",
    content: "Brewing the perfect cup of coffee is both a precise science and a passionate art form. Baristas carefully measure the weight of roasted coffee beans before grinding them. The temperature of the hot water must be perfectly controlled to extract the richest flavors without burning the delicate grinds. If the water is too cold, the coffee tastes sour; if it is boiling hot, the beverage becomes bitter. Taking a slow sip in a cozy atmosphere provides an extraordinary sense of comfort."
  },
  {
    id: "art-3",
    title: "Artificial Intelligence and the Future",
    level: "Avançado",
    category: "Tecnologia & Sociedade",
    content: "The unprecedented acceleration of artificial intelligence has sparked fierce debates among developers, regulators, and philosophers worldwide. Generative language models can now draft complex essays, program sophisticated software, and converse with humanlike fluency. While optimistic futurists anticipate a new era of absolute abundance, skeptics express profound concerns regarding labor displacement, computational biases, and cognitive decay. Establishing ethical frameworks remains a complex challenge for contemporary policy makers."
  }
];

export default function ArticleReader({ onWordLookup, activeLookupWord }: ArticleReaderProps) {
  const [selectedArticleId, setSelectedArticleId] = useState<string>("art-1");
  const [userPastedText, setUserPastedText] = useState("");
  const [customArticles, setCustomArticles] = useState<PresetArticle[]>([]);
  const [activeTab, setActiveTab] = useState<"preset" | "paste" | "rss">("preset");

  // RSS States
  const [rssFeedSource, setRssFeedSource] = useState<string>("bbc");
  const [rssCustomUrl, setRssCustomUrl] = useState<string>("");
  const [rssNews, setRssNews] = useState<any>(null);
  const [selectedRssNewsItem, setSelectedRssNewsItem] = useState<any>(null);
  const [rssLoading, setRssLoading] = useState<boolean>(false);
  const [rssError, setRssError] = useState<string | null>(null);
  const [rssFilterText, setRssFilterText] = useState<string>("");

  const LOCAL_RSS_FALLBACKS: Record<string, { title: string; description: string; items: any[] }> = {
    bbc: {
      title: "BBC News - Global Feed (Contingência)",
      description: "BBC News global updates and features.",
      items: [
        {
          id: "bbc-1",
          title: "Artificial Intelligence: How smart tools are changing jobs",
          link: "https://www.bbc.com/news/technology-60039239",
          pubDate: "June 2026",
          content: "New developments in large language models are transforming modern work environments. While some worry about displacement, many engineers and designers argue that collaborating with AI systems expands creative possibilities.",
          fullContent: "New developments in large language models are transforming modern work environments. Researchers from leading institutions point out that automation often reorganizes work rather than eliminating it entirely. While some administrative and repetitive tasks are heavily affected, many engineers, teachers, and visual designers argue that collaborating with generative AI systems expands creative boundaries, letting them prototype layouts or outline articles in seconds."
        },
        {
          id: "bbc-2",
          title: "Global inflation cooling faster than predicted by central banks",
          link: "https://www.bbc.com/news/business-60048123",
          pubDate: "June 2026",
          content: "Energy costs have dropped, leading to a steady decline in food prices and consumer goods worldwide. Stock exchanges reacted with sharp gains as market experts anticipate interest rate cuts in the next quarter.",
          fullContent: "Energy costs have dropped, leading to a steady decline in food prices, clothing, and consumer goods worldwide. National stock exchanges reacted with sharp gains yesterday as market experts anticipate interest rate cuts in the next economic quarter. Economists suggest that the normalization of container shipping lanes and increased domestic agricultural outputs helped relieve pressure points in the global supply index, although housing rents remain high in major metropolitan centers."
        }
      ]
    },
    nyt: {
      title: "The New York Times (Contingência)",
      description: "NY Times quality news highlights.",
      items: [
        {
          id: "nyt-1",
          title: "The Renaissance of Independent Bookstore Cafés",
          link: "https://www.nytimes.com/books/notebooks",
          pubDate: "June 2026",
          content: "Quiet neighborhood hubs are making a massive comeback as younger readers seek physical paper scent, real-world community events, and analog focus sanctuaries away from algorithm-driven notification streams.",
          fullContent: "Quiet neighborhood hubs are making a massive comeback as younger readers seek physical paper scent, real-world community events, and analog focus sanctuaries away from algorithm-driven notification streams. In cities like Seattle, Chicago, and Austin, independent bookshop owners report record-high physical catalog sales. These locations aren't just selling paperbacks; they operate as third-spaces hosting weekly silent book clubs, poetry open mics, and artisanal coffee pairings, proving that human connection still outperforms screens."
        }
      ]
    },
    npr: {
      title: "NPR Notícias - Ciência & Cultura (Contingência)",
      description: "NPR informative news feed.",
      items: [
        {
          id: "npr-1",
          title: "Deep Ocean Exploration: What Lies in the Mariana Trench?",
          link: "https://www.npr.org/science/mariana",
          pubDate: "June 2026",
          content: "Marine biologists have discovered twelve unidentified deep-sea species using robust remote-controlled deep diving submersibles. These animals utilize special glowing enzymes to survive freezing temperatures.",
          fullContent: "Marine biologists have discovered twelve unidentified deep-sea species using robust remote-controlled deep diving submersibles. These animals survive thousands of pounds of pressure per square inch and absolute darkness using advanced bioluminescent enzymes. Organisms on the ocean floor feed on nutrient-rich mineral vents, offering pharmaceutical researchers priceless bio-molecules for potential cellular treatments."
        }
      ]
    },
    techcrunch: {
      title: "TechCrunch - Inovação & Startups (Contingência)",
      description: "Technology and startup news.",
      items: [
        {
          id: "tc-1",
          title: "Quantum Computing Startup raises $250M for Silicon Lasers",
          link: "https://techcrunch.com/quantum-chips",
          pubDate: "June 2026",
          content: "A startup focusing on photonic quantum computers has closed its Series B round. The company promises to build room-temperature quantum processor boards compatible with existing server racks.",
          fullContent: "A startup focusing on photonic quantum computers has closed its Series B funding round with a valuation of over $1.2B. The founders promise to build room-temperature quantum processor boards that slot easily into existing data center server racks. By using silicon laser waveguides instead of cryogenically cooled super-conductors, they promise to reduce utility power consumption by over 90 percent while executing complex scientific material simulations."
        }
      ]
    },
    nasa: {
      title: "NASA Space Exploration Updates (Contingência)",
      description: "NASA breaking cosmic news.",
      items: [
        {
          id: "nasa-1",
          title: "James Webb Telescope Obtains Atmospheric Profile of Rocky Exoplanet",
          link: "https://nasa.gov/webb-exoplanet",
          pubDate: "June 2026",
          content: "Spectroscopic readings from the James Webb space telescope show a planet orbiting a nearby red dwarf sun contains water vapor and nitrogen compounds, suggesting potential habitability signs.",
          fullContent: "Spectroscopic readings from the James Webb space telescope show a planet orbiting a nearby red dwarf sun contains water vapor and nitrogen compounds, suggesting potential habitability signs. The planet, situated roughly 40 light-years away, receives mild solar radiation compared to closer solar bodies. While liquid seas are still unconfirmed, the presence of direct atmospheric buffers indicates the exoplanet could shield volatile surface compounds necessary for organic molecules to thrive."
        }
      ]
    }
  };

  const fetchRssNews = async (sourceKey: string, customUrl?: string) => {
    setRssLoading(true);
    setRssError(null);
    try {
      let queryUrl = `/api/rss-news?feed=${sourceKey}`;
      if (sourceKey === "custom") {
        if (!customUrl || !customUrl.trim().startsWith("http")) {
          setRssError("Por favor, digite uma URL válida com http:// ou https://");
          setRssLoading(false);
          return;
        }
        queryUrl += `&url=${encodeURIComponent(customUrl.trim())}`;
      }
      const response = await fetch(queryUrl);
      if (!response.ok) {
        throw new Error("Não foi possível carregar as notícias desse Feed RSS.");
      }
      const data = await response.json();
      setRssNews(data);
    } catch (err: any) {
      console.warn("[ArticleReader] Usando contingência RSS local por erro de conexão:", err.message);
      if (LOCAL_RSS_FALLBACKS[sourceKey]) {
        setRssNews(LOCAL_RSS_FALLBACKS[sourceKey]);
      } else {
        setRssError("O servidor não pôde processar este feed customizado e não há fallback estático configurado.");
      }
    } finally {
      setRssLoading(false);
    }
  };

  // Run automatically when tab changes or feed source changes (except custom)
  React.useEffect(() => {
    if (activeTab === "rss" && rssFeedSource !== "custom") {
      fetchRssNews(rssFeedSource);
    }
  }, [activeTab, rssFeedSource]);

  // Fetch real-time webpage full article content for authentic educational reading
  const [enrichedContentMap, setEnrichedContentMap] = useState<Record<string, string>>({});
  const [isEnriching, setIsEnriching] = useState<boolean>(false);
  const [enrichingError, setEnrichingError] = useState<string | null>(null);

  React.useEffect(() => {
    if (activeTab === "rss" && selectedRssNewsItem) {
      const id = selectedRssNewsItem.id;
      // If we already have the complete news, don't fetch again
      if (enrichedContentMap[id]) {
        setEnrichingError(null);
        return;
      }

      const fetchFullArticle = async () => {
        setIsEnriching(true);
        setEnrichingError(null);
        try {
          // Pass the real direct link so backend can fetch and extract real news paragraphs
          const response = await fetch(
            `/api/rss-enrich?title=${encodeURIComponent(selectedRssNewsItem.title)}&summary=${encodeURIComponent(selectedRssNewsItem.content || "")}&link=${encodeURIComponent(selectedRssNewsItem.link || "")}`
          );
          if (!response.ok) {
            throw new Error("Não foi possível carregar a notícia real completa.");
          }
          const result = await response.json();
          if (result && result.content) {
            setEnrichedContentMap(prev => ({
              ...prev,
              [id]: result.content
            }));
          } else {
            throw new Error("Sem conteúdo retornado pelo servidor.");
          }
        } catch (err: any) {
          console.warn("[RSS-Web] Ignorando falha de extração direta (usando fallback de resumo):", err.message || err);
          setEnrichingError("Problema ao carregar texto integral: " + err.message);
          // Auto fill with standard content snippet as fallback to avoid empty screens
          setEnrichedContentMap(prev => ({
            ...prev,
            [id]: selectedRssNewsItem.content || selectedRssNewsItem.fullContent || "Nenhum conteúdo pôde ser carregado para esta notícia."
          }));
        } finally {
          setIsEnriching(false);
        }
      };

      fetchFullArticle();
    }
  }, [selectedRssNewsItem, activeTab]);

  // Get current active article content
  const activeArticle =
    activeTab === "preset"
      ? PRESET_ARTICLES.find((a) => a.id === selectedArticleId)
      : activeTab === "paste"
      ? (customArticles.length > 0 ? customArticles[customArticles.length - 1] : null)
      : selectedRssNewsItem
      ? {
          id: selectedRssNewsItem.id,
          title: selectedRssNewsItem.title,
          level: "Notícia Real Completa",
          category: rssNews?.title || "Notícias em Tempo Real",
          content: enrichedContentMap[selectedRssNewsItem.id] || selectedRssNewsItem.content || selectedRssNewsItem.fullContent || ""
        }
      : null;

  const handleImportText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPastedText.trim()) return;

    const newArticle: PresetArticle = {
      id: `custom-${Date.now()}`,
      title: "Artigo Copiado / Personalizado",
      level: "Intermediário",
      category: "Importado",
      content: userPastedText.trim()
    };

    setCustomArticles([newArticle]);
    setUserPastedText("");
    // Switch to actual custom view by setting this tab
    alert("Texto importado com sucesso! Clique em qualquer palavra do texto para carregar a tradução.");
  };

  // Helper to split text into words and parse them as clickable elements
  const renderInteractiveText = (text: string) => {
    if (!text) return null;

    // Split by paragraphs first
    const paragraphs = text.split("\n\n");

    return paragraphs.map((para, paraIdx) => {
      // Split paragraph into words, capturing punctuations separately or within
      const tokens = para.split(/(\s+)/);

      return (
        <p key={paraIdx} className="mb-4 text-justify leading-relaxed text-slate-700 dark:text-slate-300 font-sans text-[15px] sm:text-base">
          {tokens.map((token, tokenIdx) => {
            // If token is just whitespace, render it directly
            if (/^\s+$/.test(token)) {
              return <span key={tokenIdx}>{token}</span>;
            }

            // Extract the core word, removing leading/trailing punctuation
            const cleanWord = token.replace(/^[.,\/#!$%\^&\*;:{}=\-_`~()?"']+|[.,\/#!$%\^&\*;:{}=\-_`~()?"']+$/g, "");
            const hasCleanWord = cleanWord.length > 0;
            const isTargetWord = activeLookupWord?.toLowerCase() === cleanWord.toLowerCase();

            if (hasCleanWord) {
              return (
                <span
                  key={tokenIdx}
                  onClick={() => onWordLookup(cleanWord, para)}
                  className={`inline-block cursor-pointer px-0.5 rounded transition ${
                    isTargetWord
                      ? "bg-amber-300 text-slate-900 border-b-2 border-amber-600 font-semibold"
                      : "hover:bg-indigo-100/80 hover:text-indigo-900 dark:hover:bg-indigo-950/70 dark:hover:text-indigo-200 border-b border-transparent"
                  }`}
                  title="Clique para traduzir com IA e salvar"
                >
                  {token}
                </span>
              );
            }

            return <span key={tokenIdx}>{token}</span>;
          })}
        </p>
      );
    });
  };

  const filteredRssItems = rssNews?.items?.filter((item: any) => {
    if (!rssFilterText.trim()) return true;
    const search = rssFilterText.toLowerCase();
    return (
      item.title?.toLowerCase().includes(search) ||
      item.content?.toLowerCase().includes(search)
    );
  }) || [];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-sans tracking-tight">Leitura de Artigos</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Desenvolva vocabulário e aprenda gramática no contexto.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-200/60 dark:bg-slate-800/80 p-1 rounded-xl mb-4 text-xs font-semibold select-none">
        <button
          onClick={() => setActiveTab("preset")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition cursor-pointer ${
            activeTab === "preset"
              ? "bg-white text-slate-800 dark:bg-slate-700 dark:text-slate-100 shadow-xs"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Artigos Recomendados
        </button>
        <button
          onClick={() => setActiveTab("rss")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition cursor-pointer ${
            activeTab === "rss"
              ? "bg-white text-slate-800 dark:bg-slate-700 dark:text-slate-100 shadow-xs"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          }`}
        >
          <Rss className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          Feeds de Notícias (RSS)
        </button>
        <button
          onClick={() => setActiveTab("paste")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition cursor-pointer ${
            activeTab === "paste"
              ? "bg-white text-slate-800 dark:bg-slate-700 dark:text-slate-100 shadow-xs"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          Colar Meu Texto
        </button>
      </div>

      {/* Custom Paste section */}
      {activeTab === "paste" && !activeArticle && (
        <form onSubmit={handleImportText} className="flex-1 flex flex-col mb-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xs border border-slate-200/60 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            Cole o artigo ou texto que deseja estudar
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            O aplicativo converterá automaticamente todas as palavras em botões clicáveis de tradução inteligente. Ideal para notícias, e-mails, ou posts de blogs.
          </p>
          <textarea
            placeholder="Cole o texto em inglês aqui (mínimo de 3 palavras)..."
            value={userPastedText}
            onChange={(e) => setUserPastedText(e.target.value)}
            className="flex-1 min-h-[160px] p-3 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 resize-none mb-3"
          />
          <button
            type="submit"
            disabled={userPastedText.trim().split(/\s+/).length < 2}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4.5 h-4.5" />
            Ativar Texto Interativo
          </button>
        </form>
      )}

      {/* RSS Selection & Feed list section */}
      {activeTab === "rss" && !activeArticle && (
        <div className="flex-1 flex flex-col gap-4 mb-4">
          
          {/* Feed source selection pills */}
          <div className="flex flex-wrap gap-1.5 p-2 bg-slate-100 dark:bg-slate-850 rounded-xl">
            {[
              { id: "bbc", name: "BBC News", icon: "🇬🇧" },
              { id: "nyt", name: "NY Times", icon: "🇺🇸" },
              { id: "npr", name: "NPR News", icon: "🎙️" },
              { id: "techcrunch", name: "TechCrunch", icon: "⚡" },
              { id: "nasa", name: "NASA Breaking", icon: "🚀" },
              { id: "custom", name: "+ Feed Customizado", icon: "🔗" }
            ].map((feed) => (
              <button
                key={feed.id}
                onClick={() => setRssFeedSource(feed.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  rssFeedSource === feed.id
                    ? "bg-white dark:bg-slate-755 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold border border-slate-205 dark:border-slate-705"
                    : "text-slate-600 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-slate-800"
                }`}
              >
                <span>{feed.icon}</span>
                <span>{feed.name}</span>
              </button>
            ))}
          </div>

          {/* Custom Feed url input drawer */}
          {rssFeedSource === "custom" && (
            <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Digitar Link de Feed RSS de Notícias</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://exemplo.com/feed.xml"
                  value={rssCustomUrl}
                  onChange={(e) => setRssCustomUrl(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => fetchRssNews("custom", rssCustomUrl)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-550 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  Carregar
                </button>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                Nota: Forneça um feed de notícias em inglês. O servidor processará e entregará o conteúdo para que você aprenda clicando nos termos.
              </p>
            </div>
          )}

          {/* News items filter, text count and Reload trigger */}
          {rssNews && !rssLoading && (
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="w-4 h-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  placeholder="Filtrar por palavras-chave em inglês..."
                  value={rssFilterText}
                  onChange={(e) => setRssFilterText(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                />
              </div>
              <button
                onClick={() => fetchRssNews(rssFeedSource, rssCustomUrl)}
                className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl transition text-slate-600 dark:text-slate-300 cursor-pointer"
                title="Recarregar Feed de Notícias"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* News Items Stack container */}
          <div className="flex-1 min-h-[250px] relative">
            {rssLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
                <p className="text-xs font-semibold">Buscando notícias frescas em inglês...</p>
                <p className="text-[10px] text-slate-500">Isso é puxado diretamente do feed RSS de forma segura.</p>
              </div>
            ) : rssError ? (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-150 dark:border-red-900 rounded-2xl text-red-750 dark:text-red-300 text-xs flex gap-2.5 items-start">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                <div>
                  <h4 className="font-bold">Ocorreu um problema ao carregar</h4>
                  <p className="mt-1 leading-normal">{rssError}</p>
                  <button
                    onClick={() => fetchRssNews(rssFeedSource, rssCustomUrl)}
                    className="mt-2 text-[10px] font-bold underline text-indigo-600 dark:text-indigo-400 cursor-pointer"
                  >
                    Tentar Novamente
                  </button>
                </div>
              </div>
            ) : rssNews ? (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest pl-1 font-mono">
                  {rssNews.title} • {filteredRssItems.length} {filteredRssItems.length === 1 ? 'notícia' : 'notícias'} encontradas
                </div>
                
                {filteredRssItems.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Nenhuma notícia atendeu à palavra-chave buscada.
                  </div>
                ) : (
                  filteredRssItems.map((item: any) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedRssNewsItem(item)}
                      className="p-3.5 bg-white dark:bg-slate-800 border border-slate-200/55 dark:border-slate-800 rounded-xl hover:shadow-xs hover:border-indigo-500/40 cursor-pointer transition flex flex-col gap-1.5"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 hover:text-indigo-650 dark:hover:text-indigo-400 leading-snug transition line-clamp-2">
                          {item.title}
                        </h4>
                      </div>
                      
                      {item.content && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                          {item.content}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 mt-1 border-t border-slate-100/50 dark:border-slate-700/50 font-mono">
                        <span>{item.creator} • {item.pubDate ? new Date(item.pubDate).toLocaleString("pt-BR", {hour: "2-digit", minute:"2-digit", day:"numeric", month:"short"}) : "Hoje"}</span>
                        <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
                          Estudar Notícia <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                <Newspaper className="w-8 h-8 text-slate-350" />
                <p>Abra o Feed RSS de Notícias de sua preferência acima para carregar artigos reais em tempo real!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Article selectors when Preset is active */}
      {activeTab === "preset" && (
        <div className="flex gap-2 pb-3 overflow-x-auto mb-3 scrollbar-none flex-shrink-0">
          {PRESET_ARTICLES.map((art) => (
            <button
              key={art.id}
              onClick={() => setSelectedArticleId(art.id)}
              className={`flex-shrink-0 px-3.5 py-2.5 rounded-xl text-left border transition cursor-pointer ${
                selectedArticleId === art.id
                  ? "bg-emerald-50/80 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800"
                  : "bg-white border-slate-200 hover:bg-slate-100/50 dark:bg-slate-800 dark:border-slate-800"
              }`}
            >
              <div className="flex items-center gap-1.5 justify-between">
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                  art.level === "Iniciante"
                    ? "bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400"
                    : art.level === "Intermediário"
                    ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
                    : "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                }`}>
                  {art.level}
                </span>
                <span className="text-[9px] text-slate-400 font-semibold">{art.category}</span>
              </div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1.5 w-32 truncate">{art.title}</h4>
            </button>
          ))}
        </div>
      )}

      {/* Active Article Viewer */}
      {activeArticle ? (
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-xs border border-slate-200/60 dark:border-slate-800 p-5 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-105 dark:border-slate-700/60 pb-3 mb-4 flex-shrink-0">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block truncate">{activeArticle.category}</span>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 font-sans leading-snug mt-0.5 truncate">{activeArticle.title}</h3>
            </div>
            <div className="flex-shrink-0 pl-2">
              {activeTab === "paste" && (
                <button
                  onClick={() => setCustomArticles([])}
                  className="text-xs text-red-500 hover:text-red-650 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  Limpar Texto
                </button>
              )}
              {activeTab === "rss" && (
                <button
                  onClick={() => setSelectedRssNewsItem(null)}
                  className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-705 dark:hover:bg-slate-650 text-indigo-600 dark:text-indigo-400 font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer border border-slate-200 dark:border-slate-605"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Voltar
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {isEnriching ? (
              <div className="flex flex-col items-center justify-center p-8 py-16 text-center space-y-4">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <div>
                  <p className="text-sm font-bold text-slate-850 dark:text-slate-150">
                    Buscando Notícia Completa Real...
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                    Acessando de forma direta e segura o portal original de notícias para extrair todos os parágrafos reais da cobertura original do artigo, sem uso de inteligência artificial.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {enrichingError && (
                  <div className="mb-3.5 p-2 px-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-400 rounded-xl text-[11px] flex items-center gap-1.5 font-sans">
                    <Info className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
                    <span>{enrichingError}. Exibindo resumo do Feed RSS original.</span>
                  </div>
                )}
                {renderInteractiveText(activeArticle.content)}
              </>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-1.5 text-[11px] text-slate-400 select-none">
            <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span>Toque em qualquer palavra para ver sua tradução inteligente e salvá-la em suas anotações.</span>
          </div>
        </div>
      ) : activeTab === "preset" ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 select-none">
          <p>Nenhum artigo selecionado</p>
        </div>
      ) : null}
    </div>
  );
}
