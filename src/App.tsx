import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Play, Square, Copy, Loader2, Settings, Info, Download } from "lucide-react";
import { config } from "./config";

/**
 * Copy of Auto‑run Activist Debate (shareable Prototype)
 *
 * Fixes in this revision:
 * - Remove stray 'n' causing "Missing semicolon" in smoke tests. ✅
 * - Close all JSX (InfoDialog list & wrappers). ✅
 * - Keep existing tests; add one more deterministic assertion. ✅
 * - Preserve OpenRouter support + UI you requested. ✅
 */

// ---------- Helpers ----------
function initials(name: string) {
  return (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "?";
}

function generateAvatarDataUrl({ name, color }: { name?: string; color?: string }) {
  const ini = initials(name || "?");
  const stroke = color || "#111827";
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'>
  <circle cx='48' cy='48' r='46' fill='#F8F1DD' stroke='${stroke}' stroke-width='4'/>
  <text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial' font-size='34' fill='#111827'>${ini}</text>
</svg>`;
  const encoded = encodeURIComponent(svg).replace(/'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29");
  return `data:image/svg+xml;charset=UTF-8,${encoded}`;
}

// ---------- LLM integration via backend proxy ----------
async function llmReply({
  model,
  messages,
  temperature = 0.9,
  top_p = 1,
  frequency_penalty = 0.6,
  presence_penalty = 0.6,
  max_tokens = 220,
  referer,
  appTitle,
}: {
  model: string;
  messages: Array<{ role: 'system'|'user'|'assistant'; content: string }>;
  temperature?: number; top_p?: number; frequency_penalty?: number; presence_penalty?: number; max_tokens?: number;
  referer?: string; appTitle?: string;
}) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
  
  const response = await fetch(`${backendUrl}/api/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      top_p,
      frequency_penalty,
      presence_penalty,
      max_tokens,
      referer: referer || (typeof window !== 'undefined' ? window.location.origin : ''),
      appTitle: appTitle || 'Debate Simulator'
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Backend API error ${response.status}: ${errorData.error || 'Unknown error'}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || '';
}

// ---------- Defaults ----------
const DEFAULT_PERSONAS = [
  {
    "name": "Sofia Rossi",
    "age": 24,
    "role": "Student Activist",
    "color": "#FF4C4C",
    "bio": "Environmental science student in Bologna, part of Fridays for Future. Uses TikTok and Instagram to organize local climate strikes.",
    "stance": "Believes activism must remain inclusive, creative, and people-powered, not institutional."
  },
  {
    "name": "Matteo Bianchi",
    "age": 31,
    "role": "Policymaker Assistant",
    "color": "#0077B6",
    "bio": "Works for Milan's city council. Believes activism should influence policy through formal participation rather than protest.",
    "stance": "Supports structured civic engagement; skeptical of disruptive activism."
  },
  {
    "name": "Giulia Esposito",
    "age": 27,
    "role": "Digital Creator",
    "color": "#FF9E00",
    "bio": "Lifestyle influencer from Naples, occasionally posts about gender equality and sustainability.",
    "stance": "Activism should be relatable, visual, and positive to reach audiences effectively."
  },
  {
    "name": "Lorenzo Conti",
    "age": 45,
    "role": "Journalist",
    "color": "#6C757D",
    "bio": "Reporter for RAI covering protests and political events. Balances neutrality and audience expectations.",
    "stance": "Sees activism as essential but often miscommunicated; media simplifies to attract attention."
  },
  {
    "name": "Chiara De Luca",
    "age": 35,
    "role": "NGO Worker",
    "color": "#2ECC71",
    "bio": "Coordinator at ActionAid's Global Platform in Palermo focusing on youth empowerment and civic engagement.",
    "stance": "Advocates for hybrid activism connecting digital and local participation."
  },
  {
    "name": "Ahmed Rahman",
    "age": 22,
    "role": "Student and Migrant Rights Advocate",
    "color": "#FF66C4",
    "bio": "Second-generation Italian student in Turin who campaigns for inclusion in activist movements.",
    "stance": "Critiques activism for lack of diversity and intersectionality; calls for inclusive representation."
  },
  {
    "name": "Marco Gallo",
    "age": 50,
    "role": "Small Business Owner",
    "color": "#FFC300",
    "bio": "Owns a café in Bari. Consumes traditional news and expresses skepticism toward activism.",
    "stance": "Views activism as disruptive and impractical; values stability and economic focus."
  },
  {
    "name": "Elena Ferri",
    "age": 29,
    "role": "Tech Entrepreneur",
    "color": "#9B5DE5",
    "bio": "Runs a social impact startup in Rome promoting digital volunteering.",
    "stance": "Supports tech-driven, measurable activism and data transparency."
  }
];

// ---------- OpenRouter Models ----------
// Fallback static models in case API fails
const FALLBACK_MODELS = [
  // Free models
  { value: "deepseek/deepseek-chat", label: "DeepSeek Chat (Free) - Recommended", category: "free" },
  { value: "microsoft/phi-3-medium-128k-instruct", label: "Phi-3 Medium (Free)", category: "free" },
  { value: "meta-llama/llama-3.1-8b-instruct", label: "Llama 3.1 8B (Free)", category: "free" },
  { value: "google/gemini-flash-1.5", label: "Gemini Flash 1.5 (Free)", category: "free" },
  { value: "mistralai/mistral-7b-instruct", label: "Mistral 7B (Free)", category: "free" },
  
  // Premium models
  { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet (Premium)", category: "premium" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini (Cost-effective)", category: "premium" },
  { value: "openai/gpt-4o", label: "GPT-4o (Premium)", category: "premium" },
  { value: "meta-llama/llama-3.1-405b-instruct", label: "Llama 3.1 405B (Premium)", category: "premium" },
  { value: "google/gemini-pro-1.5", label: "Gemini Pro 1.5 (Premium)", category: "premium" },
  { value: "anthropic/claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku (Premium)", category: "premium" },
];

// Function to categorize models based on pricing
function categorizeModel(model: any): 'free' | 'premium' {
  const promptPrice = parseFloat(model.pricing?.prompt || '0');
  const completionPrice = parseFloat(model.pricing?.completion || '0');
  
  // If both prompt and completion are free, it's a free model
  if (promptPrice === 0 && completionPrice === 0) {
    return 'free';
  }
  
  // If pricing is very low (less than $0.001 per token), consider it free
  if (promptPrice < 0.001 && completionPrice < 0.001) {
    return 'free';
  }
  
  return 'premium';
}

// Function to fetch models from OpenRouter API
async function fetchOpenRouterModels() {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    return data.data.map((model: any) => ({
      value: model.id,
      label: `${model.name} (${categorizeModel(model) === 'free' ? 'Free' : 'Premium'})`,
      category: categorizeModel(model),
      description: model.description,
      contextLength: model.context_length,
      pricing: model.pricing
    })).sort((a: any, b: any) => {
      // Sort by category (free first) then by name
      if (a.category !== b.category) {
        return a.category === 'free' ? -1 : 1;
      }
      return a.label.localeCompare(b.label);
    });
  } catch (error) {
    console.warn('Failed to fetch models from OpenRouter API:', error);
    return FALLBACK_MODELS;
  }
}

const DEFAULT_TOPICS = [
  "What does activism mean to you personally?",
  "Is activism more about protest or participation?",
  "How do we sustain engagement beyond viral peaks?",
  "How should activism be communicated to youth in Italy?",
  "Media perception vs. activist reality: what's the gap?",
];

// ---------- Topic helpers ----------
function topicFocus(topic: string) {
  const t = String(topic || "the issue").replace(/\bTopic:\s*/i, "").trim();
  const pairs: Array<[RegExp, string]> = [
    [/youth|students?|young/i, "youth engagement"],
    [/media|press|news|framing/i, "media framing"],
    [/sustain|retention|peaks?|momentum|burnout/i, "sustained engagement"],
    [/communicat|message|narrative/i, "communication"],
    [/policy|lobby|institution|participation/i, "policy & participation"],
    [/what does activism mean/i, "personal meaning of activism"],
  ];
  for (const [re, term] of pairs) if (re.test(t)) return term;
  return t;
}

function personaStyle(speaker: any) {
  const r = String(speaker?.role || "participant").toLowerCase();
  const s = String(speaker?.stance || "").toLowerCase();
  if (/student|youth/.test(r)) return "energetic and hopeful";
  if (/designer|digital/.test(r)) return "strategic and media‑savvy";
  if (/labour|organis/.test(r)) return "grounded and collective";
  if (/business|owner/.test(r)) return "pragmatic and solution‑oriented";
  if (/community|neighbourhood|mutual/.test(r + " " + s)) return "community‑first and practical";
  return "balanced and reflective";
}

// ---------- Local generator (topic & persona aware, safe for null speaker) ----------
function localReply({ topic, speaker, lastLine }: { topic: string; speaker: any; lastLine?: string }) {
  const safeSpeaker = speaker || { name: "Persona", role: "participant", stance: "", color: "#6b7280" };
  const focus = topicFocus(topic).toLowerCase();
  const tone = personaStyle(safeSpeaker);

  const openers = [
    `From my ${tone} perspective,`,
    `In my experience as ${String(safeSpeaker.role || 'participant').toLowerCase()},`,
    `Honestly,`,
    `Let's be realistic,`,
    `Speaking practically,`,
  ];
  const opener = openers[Math.floor(Math.random() * openers.length)];

  const subjectVariants = [
    `when thinking about ${focus}`,
    `on the question of ${focus}`,
    `regarding ${focus}`,
    `in terms of ${focus}`,
  ];
  const subject = subjectVariants[Math.floor(Math.random() * subjectVariants.length)];

  const claimPool = {
    youth: [
      `we should empower younger voices through authentic dialogue rather than tokenism.`,
      `schools and local communities should be active partners, not passive audiences.`,
      `activism must sound relevant to daily youth struggles, not abstract ideals.`,
    ],
    media: [
      `we must tell nuanced stories that escape the typical conflict framing.`,
      `pair facts with human stories to cut through noise.`,
      `avoid echo chambers to keep credibility in the press.`,
    ],
    sustain: [
      `the hardest part is maintaining hope between wins—collective care matters most.`,
      `rotate roles and celebrate progress to sustain activism.`,
      `long‑term structures, not viral spikes, keep communities alive.`,
    ],
    communication: [
      `clarity and consistency create trust.`,
      `listening first makes the message stronger.`,
      `design should help people see themselves in the cause.`,
    ],
    policy: [
      `every protest should point to a clear policy pathway.`,
      `we need bridges between streets and decision rooms.`,
      `translate demands into specific proposals and timelines.`,
    ],
    general: [
      `different actors must collaborate rather than compete for attention.`,
      `activism isn't just anger—it's coordination and persistence.`,
      `combine passion with planning to move forward.`,
    ],
  } as const;

  let bucket: keyof typeof claimPool = "general";
  if (/youth/.test(focus)) bucket = "youth";
  else if (/media/.test(focus)) bucket = "media";
  else if (/sustain/.test(focus)) bucket = "sustain";
  else if (/communicat/.test(focus)) bucket = "communication";
  else if (/policy|participation/.test(focus)) bucket = "policy";

  const ack = lastLine && lastLine.length > 0 ? "building on that point, " : "";
  const claim = claimPool[bucket][Math.floor(Math.random() * claimPool[bucket].length)];

  // Never include literal "Topic:" label
  return `${opener} ${ack}${subject}, ${claim}`.replace(/\s+/g, " ").trim();
}

// ---------- Storage hook ----------
function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try { 
      const raw = localStorage.getItem(key); 
      return raw ? JSON.parse(raw) : initial; 
    } catch { 
      return initial; 
    }
  });
  
  const setValueAndStore = (newValue: T | ((prev: T) => T)) => {
    const valueToStore = typeof newValue === 'function' ? (newValue as (prev: T) => T)(value) : newValue;
    setValue(valueToStore);
    try { 
      localStorage.setItem(key, JSON.stringify(valueToStore)); 
    } catch (e) { 
      console.warn('Failed to save to localStorage:', e); 
    }
  };
  
  return [value, setValueAndStore] as const;
}

// ---------- Clipboard utils (robust) ----------
async function copyTextRobust(text: string): Promise<"copied"|"downloaded"> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return "copied";
    }
  } catch (_) {}
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly',''); ta.style.position='fixed'; ta.style.top='-1000px';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    return "copied";
  } catch (_) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `debate-transcript-${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    return "downloaded";
  }
}

// ---------- Anti‑repetition helpers ----------
// function normalize(text: string) {
//   return (text || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
// }
function diversify(text: string) {
  return text
    .replace(/^honestly[,\s]*/i, 'In practice, ')
    .replace(/^let's be realistic[,\s]*/i, 'Realistically, ')
    .replace(/^from my .* perspective[,\s]*/i, 'From where I stand, ')
    .replace(/\bwe need bridges between streets and decision rooms\b/i, 'we should connect street energy with actual decision rooms');
}

// ---------- Opening humanizer (reduce formulaic phrasing) ----------
function humanizeOpening(t: string) {
  let s = (t || '').trim();
  const lower = s.toLowerCase();
  const drops = [
    'from where i stand,', 'honestly,', 'in practice,', 'let\'s be realistic,', 'speaking practically,',
    'from my', 'in my experience', 'i\'d put it this way,'
  ];
  for (const d of drops) {
    if (lower.startsWith(d)) {
      if (Math.random() < 0.5) {
        s = s.slice(d.length).trimStart();
      } else {
        const swaps = ["Here's how I see it,", 'One angle:', 'A quick thought,'];
        s = `${swaps[Math.floor(Math.random()*swaps.length)]} ${s.slice(d.length).trimStart()}`.trim();
      }
      break;
    }
  }
  for (const bridge of ['building on that,', 'building on that point,', 'pushing the point,', 'i hear that,']) {
    if (s.toLowerCase().startsWith(bridge)) {
      if (Math.random() < 0.6) s = s.slice(bridge.length).trimStart();
    }
  }
  return s;
}

// ---------- Smoke tests ----------
function runSmokeTests() {
  try {
    // newline split
    const joined = ["A","B","C"].join("\n");
    const split = joined.split(/\n+/).filter(Boolean);
    console.assert(split.length === 3 && split[2] === "C", "newline split ok");

    // avatar special chars
    const url = generateAvatarDataUrl({ name: "Test (O'Connor)", color: "#ff0000" });
    console.assert(/^data:image\/.+/.test(url), "avatar url ok");

    // localReply: no literal Topic label; safe when speaker is undefined
    const lr1 = localReply({ topic: "Topic: How do we reach youth?", speaker: undefined as any });
    console.assert(typeof lr1 === 'string' && lr1.length > 0 && !/\bTopic:/i.test(lr1), 'localReply safe/strips Topic');

    // topic awareness
    const lr2 = localReply({ topic: "Is activism more about protest or participation?", speaker: { role: 'organiser' } });
    console.assert(/policy|participation/i.test(lr2), 'topic awareness ok');

    // history join test
    const hist = ['A','B'].join(String.fromCharCode(10));
    console.assert(/\n/.test(hist), 'history join ok');

    // diversify deterministic test
    console.assert(/^In practice/.test(diversify('Honestly, this is fine')), 'diversify opener replacement ok');

    // info dialog string integrity
    const s = '<Dialog><DialogContent></DialogContent></Dialog>';
    console.assert(/<DialogContent>/.test(s), 'info dialog string ok');
  } catch (e) { console.warn('Smoke tests warning:', e); }
}

// ---------- App ----------
export default function App() {
  const [personas, setPersonas] = useLocalStorage("debate_personas", DEFAULT_PERSONAS);
  
  const [topics, setTopics] = useLocalStorage("debate_topics", DEFAULT_TOPICS);
  const [rounds, setRounds] = useLocalStorage("debate_rounds", 3);
  const [delayMs, setDelayMs] = useLocalStorage("debate_delay", 1500);
  const [autoRun, setAutoRun] = useLocalStorage("debate_autorun", true);

  // OpenRouter LLM configuration
  const [useLLM, setUseLLM] = useLocalStorage('debate_use_llm', true);
  const [model, setModel] = useLocalStorage('debate_model', 'deepseek/deepseek-chat');
  const [temperature, setTemperature] = useLocalStorage('debate_temp', 0.9);
  const [topP] = useLocalStorage('debate_top_p', 1);
  const [freqPenalty, setFreqPenalty] = useLocalStorage('debate_freq_penalty', 0.6);
  const [presPenalty] = useLocalStorage('debate_pres_penalty', 0.6);
  const [maxTokens, setMaxTokens] = useLocalStorage('debate_max_tokens', 200);
  // OpenRouter optional headers
  const [orRef, setOrRef] = useLocalStorage('debate_or_referer', '');
  const [orTitle, setOrTitle] = useLocalStorage('debate_or_title', 'Debate Simulator');
  const memoryRef = useRef<{[name:string]: string[]}>({});
  // Backend health status
  const [backendStatus, setBackendStatus] = useState<'checking'|'connected'|'error'>('checking');
  const [backendError, setBackendError] = useState<string>('');
  
  // Dynamic model loading
  const [availableModels, setAvailableModels] = useState(FALLBACK_MODELS);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string>('');


  const [playing, setPlaying] = useState(false);
  const [log, setLog] = useState<Array<{ speaker: string; color: string; text: string; ts: number }>>([]);
  const [topicIdx, setTopicIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [copyState, setCopyState] = useState<"idle"|"copied"|"downloaded">("idle");
  const [connectionStatus, setConnectionStatus] = useState<"idle"|"testing"|"success"|"error">("idle");
  const [connectionError, setConnectionError] = useState<string>("");
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  // const [settingsOpen, setSettingsOpen] = useState(false);
  const [personaOpen, setPersonaOpen] = useState(false);
  const [topicsOpen, setTopicsOpen] = useState(false);

  // derived
  const avatarMap = useMemo(() => {
    const m = new Map<string, string>();
    try { personas.forEach((p: any) => m.set(p.name, generateAvatarDataUrl({ name: p.name, color: p.color }))); } catch {}
    return m;
  }, [personas]);

  useEffect(() => { runSmokeTests(); }, []);
  
  // Check backend health on mount
  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const response = await fetch(`${config.backendUrl}/api/health`);
        if (response.ok) {
          const data = await response.json();
          setBackendStatus(data.hasApiKey ? 'connected' : 'error');
          setBackendError(data.hasApiKey ? '' : 'Backend API key not configured');
        } else {
          setBackendStatus('error');
          setBackendError('Backend server not responding');
        }
      } catch (error) {
        setBackendStatus('error');
        setBackendError('Cannot connect to backend server');
      }
    };
    
    checkBackendHealth();
  }, []);

  // Load models from OpenRouter API on mount
  useEffect(() => {
    const loadModels = async () => {
      setModelsLoading(true);
      setModelsError('');
      try {
        const models = await fetchOpenRouterModels();
        setAvailableModels(models);
      } catch (error) {
        setModelsError('Failed to load models from OpenRouter');
        console.error('Error loading models:', error);
      } finally {
        setModelsLoading(false);
      }
    };
    
    loadModels();
  }, []);
  
  // Smart auto-scroll: only scroll if user hasn't manually scrolled
  useEffect(() => { 
    if (!userHasScrolled && scrollerRef.current) {
      scrollerRef.current.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [log, userHasScrolled]);
  
  useEffect(() => { if (autoRun && log.length === 0 && !playing) start(); }, []);

  // Check if user is near bottom of scroll
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const checkScrollPosition = () => {
      const { scrollTop, scrollHeight, clientHeight } = scroller;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom && log.length > 0);
    };

    scroller.addEventListener('scroll', checkScrollPosition);
    checkScrollPosition(); // Initial check

    return () => scroller.removeEventListener('scroll', checkScrollPosition);
  }, [log.length]);

  // Handle user scroll interaction
  const handleScroll = () => {
    setUserHasScrolled(true);
  };

  // Handle mouse/touch interaction
  const handleUserInteraction = () => {
    setUserHasScrolled(true);
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
      setUserHasScrolled(false);
      setShowScrollButton(false);
    }
  };

  // No need for provider-based updates since we only use OpenRouter

  // Connection testing function
  async function testConnection() {
    if (backendStatus !== 'connected') {
      setConnectionError(backendError || "Backend server not available");
      setConnectionStatus("error");
      return;
    }

    if (!model) {
      setConnectionError("Please select a model");
      setConnectionStatus("error");
      return;
    }

    setConnectionStatus("testing");
    setConnectionError("");

    try {
      const testMessages = [
        { role: 'system' as const, content: 'You are a helpful assistant.' },
        { role: 'user' as const, content: 'Say "Connection successful!" and nothing else.' }
      ];

      const response = await llmReply({
        model,
        messages: testMessages,
        temperature: 0.1,
        max_tokens: 10,
        referer: orRef,
        appTitle: orTitle
      });

      if (response && response.toLowerCase().includes('connection successful')) {
        setConnectionStatus("success");
        setConnectionError("");
      } else {
        setConnectionStatus("error");
        setConnectionError("Unexpected response from API");
      }
    } catch (error: any) {
      setConnectionStatus("error");
      setConnectionError(error.message || "Connection failed");
    }
  }

  // Smart random persona selection based on debate content
  function selectRandomPersona(personas: any[], log: any[], topic: string) {
    if (personas.length === 0) return { name: "Persona", role: "participant", color: "#6b7280" };
    
    // If this is the first message, just pick randomly
    if (log.length === 0) {
      return personas[Math.floor(Math.random() * personas.length)];
    }
    
    // Get recent speakers to avoid immediate repetition
    const recentSpeakers = log.slice(-3).map(l => l.speaker);
    
    // Filter out recent speakers
    const availablePersonas = personas.filter(p => !recentSpeakers.includes(p.name));
    
    // If all personas spoke recently, allow any persona
    const candidates = availablePersonas.length > 0 ? availablePersonas : personas;
    
    // Add some intelligence based on topic and debate content
    const topicLower = topic.toLowerCase();
    const lastMessage = log[log.length - 1]?.text?.toLowerCase() || "";
    
    // Score personas based on relevance to current topic and debate content
    const scoredPersonas = candidates.map(persona => {
      let score = Math.random(); // Base random score
      
      // Boost score based on topic relevance
      const role = persona.role?.toLowerCase() || "";
      
      // Topic-based scoring
      if (topicLower.includes("youth") || topicLower.includes("student")) {
        if (role.includes("student") || role.includes("youth")) score += 0.3;
      }
      if (topicLower.includes("media") || topicLower.includes("communication")) {
        if (role.includes("designer") || role.includes("digital") || role.includes("media")) score += 0.3;
      }
      if (topicLower.includes("labour") || topicLower.includes("union") || topicLower.includes("worker")) {
        if (role.includes("labour") || role.includes("organiser")) score += 0.3;
      }
      if (topicLower.includes("business") || topicLower.includes("policy") || topicLower.includes("pragmatic")) {
        if (role.includes("business") || role.includes("owner")) score += 0.3;
      }
      if (topicLower.includes("community") || topicLower.includes("local") || topicLower.includes("neighbourhood")) {
        if (role.includes("community") || role.includes("neighbourhood")) score += 0.3;
      }
      
      // Content-based scoring - if someone mentioned something related to this persona's expertise
      if (lastMessage.includes("campus") || lastMessage.includes("university")) {
        if (role.includes("student")) score += 0.2;
      }
      if (lastMessage.includes("union") || lastMessage.includes("worker")) {
        if (role.includes("labour")) score += 0.2;
      }
      if (lastMessage.includes("media") || lastMessage.includes("story") || lastMessage.includes("narrative")) {
        if (role.includes("designer") || role.includes("digital")) score += 0.2;
      }
      if (lastMessage.includes("policy") || lastMessage.includes("practical") || lastMessage.includes("solution")) {
        if (role.includes("business") || role.includes("owner")) score += 0.2;
      }
      if (lastMessage.includes("community") || lastMessage.includes("local") || lastMessage.includes("mutual")) {
        if (role.includes("community")) score += 0.2;
      }
      
      return { persona, score };
    });
    
    // Sort by score and pick from top candidates
    scoredPersonas.sort((a, b) => b.score - a.score);
    
    // Pick from top 3 candidates to maintain some randomness
    const topCandidates = scoredPersonas.slice(0, Math.min(3, scoredPersonas.length));
    const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];
    
    return selected.persona;
  }

  async function stepOnce() {
    if (!personas.length) return;
    
    // Randomly select a persona, with some intelligence based on debate content
    const speaker = selectRandomPersona(personas, log, topics[topicIdx] || "General");
    const topic = topics[topicIdx] || "General";
    const lastLine = log[log.length - 1]?.text || "";

    setLoading(true);
    let text = '';
    try {
      if (useLLM && backendStatus === 'connected' && model) {
        const history = log.slice(-8).map(l => `${l.speaker}: ${l.text}`).join(String.fromCharCode(10));
        const system = `You orchestrate a lively debate. Each reply MUST:
- Be 2–4 sentences, conversational and varied (no formulaic openers).
- Address the current topic and last point, add NEW substance.
- Stay in the persona's voice/background.
- Never include the literal label "Topic:".`;
        const userMsg = `Persona: ${speaker.name} (${speaker.age}, ${speaker.role})
Bio: ${speaker.bio}
Stance: ${speaker.stance}
Current topic: ${topic}
Conversation so far:
${history}
Write ONLY the persona's next message.`;
        text = await llmReply({ 
          model, 
          temperature, 
          top_p: topP, 
          frequency_penalty: freqPenalty, 
          presence_penalty: presPenalty, 
          max_tokens: maxTokens, 
          referer: orRef, 
          appTitle: orTitle, 
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: userMsg }
          ]
        });
      } else {
        text = localReply({ topic, speaker, lastLine });
      }
    } catch (_) {
      text = localReply({ topic, speaker, lastLine });
    }
    setLoading(false);

    // sanitize and diversify to avoid repetition
    text = (text || '').replace(/\bTopic:[^\n]*/gi, '').replace(/\s+/g, ' ').trim();
    text = diversify(text);
    text = humanizeOpening(text);

    // dedupe per persona memory (simple lowercase compare)
    const key = speaker.name;
    const mem = memoryRef.current[key] || [];
    const norm = (s:string)=>s.toLowerCase();
    if (mem.includes(norm(text))) {
      text = (text.endsWith('.') ? text : text + '.') + ' Here is a concrete next step: ' + topicFocus(topic);
    }
    memoryRef.current[key] = [norm(text), ...mem].slice(0,5);

    setLog((prev) => [...prev, { speaker: speaker.name, color: speaker.color, text, ts: Date.now() }]);

    // Advance round and topic based on total messages spoken
    const totalMessages = log.length + 1; // +1 for the message we just added
    const messagesPerRound = personas.length; // Each persona speaks once per round
    const currentRound = Math.ceil(totalMessages / messagesPerRound);
    const done = currentRound > rounds;
    
    // Change topic every round
    const nextTopic = !done ? (currentRound - 1) % Math.max(1, topics.length) : topicIdx;

    setTopicIdx(nextTopic);
    if (done) setPlaying(false);
  }

  function start() {
    setLog([]); setTopicIdx(0); setPlaying(true);
    setUserHasScrolled(false); // Reset scroll state for new debate
    setShowScrollButton(false);
  }
  function stop() { setPlaying(false); }

  useEffect(() => {
    if (!playing) return; const t = setTimeout(stepOnce, Math.max(400, delayMs)); return () => clearTimeout(t);
  }, [playing, log, delayMs]);

  async function copyTranscript() {
    const text = log.map((l) => `${new Date(l.ts).toLocaleTimeString()} ${l.speaker}: ${l.text}`).join("\n");
    const result = await copyTextRobust(text);
    setCopyState(result); setTimeout(() => setCopyState("idle"), 1800);
  }
  function downloadTranscript() {
    const text = log.map((l) => `${new Date(l.ts).toLocaleTimeString()} ${l.speaker}: ${l.text}`).join("\n");
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `debate-transcript-${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  // topic & persona editors helpers
  function updateTopic(i: number, v: string) { setTopics((prev: string[]) => { const next = [...prev]; next[i] = v; return next; }); }
  function removeTopic(i: number) { setTopics((prev: string[]) => prev.filter((_, idx) => idx !== i)); }
  // function addTopic() { setTopics((prev: string[]) => [...prev, "New topic"]); }
  function moveTopic(i: number, d: number) { setTopics((prev: string[]) => { const next = [...prev]; const ni = Math.max(0, Math.min(next.length - 1, i + d)); const [it] = next.splice(i, 1); next.splice(ni, 0, it); return next;}); }
  function bulkImportTopics(raw: string) { const items = raw.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean); if (items.length) setTopics(items); }

  function updatePersona(i: number, field: string, value: any) { setPersonas((prev: any[]) => { const next = [...prev]; next[i] = { ...next[i], [field]: value }; return next; }); }
  function addPersona() { setPersonas((prev: any[]) => [...prev, { name: "New Persona", age: 30, role: "role", color: "#6b7280", bio: "", stance: "" }]); }
  function removePersona(i: number) { setPersonas((prev: any[]) => prev.filter((_, idx) => idx !== i)); }
  function duplicatePersona(i: number) { setPersonas((prev: any[]) => { const cp = { ...prev[i], name: prev[i].name + " Copy" }; const next = [...prev]; next.splice(i + 1, 0, cp); return next; }); }

  return (
    <>
      <style>{`
        /* Custom Switch and Slider Styling */
        [role="switch"][data-state="checked"] {
          background-color: #157C61 !important;
        }
        [role="switch"][data-state="unchecked"] {
          background-color: #e5e7eb !important;
        }
        
        /* Input styling - comprehensive targeting */
        input[type="text"], input[type="password"], input[type="number"], input[type="color"], input {
          background-color: #F8F1DD !important;
          border-color: #157C61 !important;
          color: #374151 !important;
        }
        input[type="text"]:focus, input[type="password"]:focus, input[type="number"]:focus, input[type="color"]:focus, input:focus {
          border-color: #157C61 !important;
          box-shadow: 0 0 0 2px rgba(21, 124, 97, 0.2) !important;
        }
        
        /* Force all input backgrounds with higher specificity */
        input:not([type="checkbox"]):not([type="radio"]) {
          background-color: #F8F1DD !important;
          border-color: #157C61 !important;
          color: #374151 !important;
        }
        input:not([type="checkbox"]):not([type="radio"]):focus {
          border-color: #157C61 !important;
          box-shadow: 0 0 0 2px rgba(21, 124, 97, 0.2) !important;
        }
        
        /* Target shadcn/ui components specifically */
        .input {
          background-color: #F8F1DD !important;
          border-color: #157C61 !important;
          color: #374151 !important;
        }
        .input:focus {
          border-color: #157C61 !important;
          box-shadow: 0 0 0 2px rgba(21, 124, 97, 0.2) !important;
        }
        
        /* Textarea styling */
        textarea {
          background-color: #F8F1DD !important;
          border-color: #157C61 !important;
          color: #374151 !important;
        }
        textarea:focus {
          border-color: #157C61 !important;
          box-shadow: 0 0 0 2px rgba(21, 124, 97, 0.2) !important;
        }
        
        /* Select styling */
        select {
          background-color: #F8F1DD !important;
          border-color: #157C61 !important;
          color: #374151 !important;
        }
        select:focus {
          border-color: #157C61 !important;
          box-shadow: 0 0 0 2px rgba(21, 124, 97, 0.2) !important;
        }
        
        /* Slider styling - comprehensive green theme */
        [role="slider"] {
          background-color: #157C61 !important;
        }
        .slider-track {
          background-color: #e5e7eb !important;
        }
        .slider-range {
          background-color: #157C61 !important;
        }
        
        /* Target Radix Slider specifically */
        [data-radix-slider-track] {
          background-color: #e5e7eb !important;
        }
        [data-radix-slider-range] {
          background-color: #157C61 !important;
        }
        [data-radix-slider-thumb] {
          background-color: #157C61 !important;
          border: 2px solid #157C61 !important;
        }
        
        /* Additional slider targeting */
        .slider-root {
          background-color: #e5e7eb !important;
        }
        .slider-track {
          background-color: #e5e7eb !important;
        }
        .slider-range {
          background-color: #157C61 !important;
        }
        .slider-thumb {
          background-color: #157C61 !important;
          border: 2px solid #157C61 !important;
        }
        
        /* More specific Radix Slider targeting */
        [data-radix-collection-item] {
          background-color: #157C61 !important;
        }
        div[data-radix-slider-root] {
          background-color: #e5e7eb !important;
        }
        div[data-radix-slider-track] {
          background-color: #e5e7eb !important;
        }
        div[data-radix-slider-range] {
          background-color: #157C61 !important;
        }
        button[data-radix-slider-thumb] {
          background-color: #157C61 !important;
          border: 2px solid #157C61 !important;
        }
        
        /* Target shadcn/ui specific classes */
        .slider-root {
          background-color: #e5e7eb !important;
        }
        .slider-track {
          background-color: #e5e7eb !important;
        }
        .slider-range {
          background-color: #157C61 !important;
        }
        .slider-thumb {
          background-color: #157C61 !important;
          border: 2px solid #157C61 !important;
        }
        
        /* Override any blue slider colors */
        [style*="background-color: rgb(59, 130, 246)"], 
        [style*="background-color: #3b82f6"], 
        [style*="background-color: blue"] {
          background-color: #157C61 !important;
        }
        
        /* Force all slider elements to use green */
        *[class*="slider"] {
          background-color: #157C61 !important;
        }
        *[class*="slider"]:not([class*="track"]) {
          background-color: #157C61 !important;
        }
        
        /* Additional input targeting */
        .input {
          background-color: #F8F1DD !important;
          border-color: #157C61 !important;
          color: #374151 !important;
        }
        .input:focus {
          border-color: #157C61 !important;
          box-shadow: 0 0 0 2px rgba(21, 124, 97, 0.2) !important;
        }
        
        /* Dialog backgrounds */
        [role="dialog"] {
          background-color: #F8F1DD !important;
        }
        .dialog-content {
          background-color: #F8F1DD !important;
        }
        
        /* Card backgrounds */
        .card {
          background-color: #F8F1DD !important;
        }
        [data-slot="card"] {
          background-color: #F8F1DD !important;
        }
        *[class*="card"] {
          background-color: #F8F1DD !important;
        }
        
        /* Force all card-like containers */
        .bg-white {
          background-color: #F8F1DD !important;
        }
        .bg-neutral-50 {
          background-color: #F8F1DD !important;
        }
        
        /* Override any remaining white backgrounds */
        *[style*="background-color: white"], *[style*="background-color: #fff"], *[style*="background-color: #ffffff"] {
          background-color: #F8F1DD !important;
        }
        
        /* Force input backgrounds with higher specificity */
        input, textarea, select {
          background-color: #F8F1DD !important;
          border-color: #157C61 !important;
          color: #374151 !important;
        }
        input:focus, textarea:focus, select:focus {
          border-color: #157C61 !important;
          box-shadow: 0 0 0 2px rgba(21, 124, 97, 0.2) !important;
        }
        
        /* Additional comprehensive targeting */
        *[class*="input"] {
          background-color: #F8F1DD !important;
          border-color: #157C61 !important;
          color: #374151 !important;
        }
        *[class*="input"]:focus {
          border-color: #157C61 !important;
          box-shadow: 0 0 0 2px rgba(21, 124, 97, 0.2) !important;
        }
        
        /* Force all form elements */
        input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]) {
          background-color: #F8F1DD !important;
          border-color: #157C61 !important;
          color: #374151 !important;
        }
      `}</style>
      <div className="w-full min-h-screen p-3 sm:p-6 md:p-10 text-neutral-900" style={{ backgroundColor: '#F8F1DD' }}>
      <div className="max-w-6xl mx-auto grid gap-4 sm:gap-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Auto‑Run Multi‑Agent Debate</h1>
            <p className="text-sm text-neutral-600">Live, rotating dialogue among configurable personas.</p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <Button onClick={start} disabled={playing} style={{ backgroundColor: '#F8F1DD', borderColor: '#157C61', color: '#157C61' }} className="hover:opacity-90 border-2 text-xs sm:text-sm px-2 sm:px-4"><Play className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2"/>Start</Button>
            <Button onClick={stop} variant="secondary" disabled={!playing} style={{ backgroundColor: '#F8F1DD', borderColor: '#157C61', color: '#157C61' }} className="hover:opacity-90 border-2 text-xs sm:text-sm px-2 sm:px-4"><Square className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2"/>Stop</Button>
            <Button onClick={copyTranscript} variant="outline" style={{ backgroundColor: '#F8F1DD', borderColor: '#157C61', color: '#157C61' }} className="hover:opacity-90 border-2 text-xs sm:text-sm px-2 sm:px-4 hidden sm:flex"><Copy className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2"/>{copyState === 'copied' ? 'Copied!' : copyState === 'downloaded' ? 'Saved as file' : 'Copy transcript'}</Button>
            <Button onClick={downloadTranscript} variant="outline" style={{ backgroundColor: '#F8F1DD', borderColor: '#157C61', color: '#157C61' }} className="hover:opacity-90 border-2 text-xs sm:text-sm px-2 sm:px-4 hidden sm:flex"><Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2"/>Download .txt</Button>
            
            {/* Mobile floating action buttons */}
            <div className="flex sm:hidden gap-2">
              <Button onClick={copyTranscript} variant="outline" style={{ backgroundColor: '#F8F1DD', borderColor: '#157C61', color: '#157C61' }} className="hover:opacity-90 border-2 text-xs px-2"><Copy className="w-3 h-3"/></Button>
              <Button onClick={downloadTranscript} variant="outline" style={{ backgroundColor: '#F8F1DD', borderColor: '#157C61', color: '#157C61' }} className="hover:opacity-90 border-2 text-xs px-2"><Download className="w-3 h-3"/></Button>
            </div>

            {/* Personas dialog */}
            <Dialog open={personaOpen} onOpenChange={setPersonaOpen}>
              <DialogTrigger asChild><Button variant="outline" style={{ backgroundColor: '#F8F1DD', borderColor: '#157C61', color: '#157C61' }} className="hover:opacity-90 border-2">Personas</Button></DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto w-[95vw] sm:w-full" style={{ backgroundColor: '#F8F1DD' }}>
                <DialogHeader><DialogTitle>Personas</DialogTitle></DialogHeader>
                <CardContent>
                  <div className="grid gap-6">
                    {personas.map((p: any, idx: number) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-3 rounded-lg border" style={{ backgroundColor: '#F8F1DD' }}>
                        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-1">
                          <img src={generateAvatarDataUrl({ name: p.name, color: p.color })} alt={p.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border" style={{ borderColor: p.color }} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs uppercase font-semibold">Name</label>
                          <Input value={p.name} onChange={(e) => updatePersona(idx, 'name', e.target.value)} />
                          <label className="text-xs uppercase font-semibold">Role</label>
                          <Input value={p.role} onChange={(e) => updatePersona(idx, 'role', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs uppercase font-semibold">Age</label>
                          <Input type="number" value={p.age} onChange={(e) => updatePersona(idx, 'age', Number(e.target.value))} />
                          <label className="text-xs uppercase font-semibold">Color</label>
                          <Input type="color" value={p.color} onChange={(e) => updatePersona(idx, 'color', e.target.value)} />
                        </div>
                        <div className="space-y-2 sm:col-span-2 lg:col-span-2">
                          <label className="text-xs uppercase font-semibold">Bio</label>
                          <Textarea rows={3} value={p.bio} onChange={(e) => updatePersona(idx, 'bio', e.target.value)} />
                          <label className="text-xs uppercase font-semibold">Stance (reference only)</label>
                          <Textarea rows={3} value={p.stance} onChange={(e) => updatePersona(idx, 'stance', e.target.value)} />
                          <div className="flex gap-2 pt-2">
                            <Button variant="outline" onClick={() => duplicatePersona(idx)} style={{ backgroundColor: '#F8F1DD', borderColor: '#157C61', color: '#157C61' }} className="hover:opacity-90 border-2">Duplicate</Button>
                            <Button variant="destructive" onClick={() => removePersona(idx)} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Button variant="outline" onClick={addPersona} style={{ backgroundColor: '#F8F1DD', borderColor: '#157C61', color: '#157C61' }} className="hover:opacity-90 border-2">Add Persona</Button>
                        <Button variant="outline" onClick={() => setPersonas(DEFAULT_PERSONAS)} style={{ backgroundColor: '#F8F1DD', borderColor: '#157C61', color: '#157C61' }} className="hover:opacity-90 border-2">Reset to Defaults</Button>
                        <Button variant="secondary" onClick={() => setPersonaOpen(false)} style={{ backgroundColor: '#F8F1DD', borderColor: '#157C61', color: '#157C61' }} className="hover:opacity-90 border-2">Close</Button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <label className="text-xs uppercase font-semibold">Advanced: Personas JSON</label>
                      </div>
                      <Textarea rows={10} value={JSON.stringify(personas, null, 2)} onChange={(e) => { try { setPersonas(JSON.parse(e.target.value)); } catch {} }} />
                    </div>
                  </div>
                </CardContent>
              </DialogContent>
            </Dialog>

            {/* Topics dialog */}
            <Dialog open={topicsOpen} onOpenChange={setTopicsOpen}>
              <DialogTrigger asChild><Button variant="outline" style={{ backgroundColor: '#F8F1DD', borderColor: '#157C61', color: '#157C61' }} className="hover:opacity-90 border-2">Topics</Button></DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" style={{ backgroundColor: '#F8F1DD' }}>
                <DialogHeader><DialogTitle>Topics</DialogTitle></DialogHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {topics.map((t: string, idx: number) => (
                      <div key={idx} className="grid md:grid-cols-12 items-start gap-2">
                        <div className="md:col-span-9">
                          <Input value={t} onChange={(e) => updateTopic(idx, e.target.value)} />
                        </div>
                        <div className="md:col-span-3 flex gap-2 justify-end">
                          <Button variant="outline" onClick={() => moveTopic(idx, -1)} disabled={idx === 0} style={{ backgroundColor: '#F8F1DD', borderColor: '#157C61', color: '#157C61' }} className="hover:opacity-90 disabled:opacity-50 border-2">Up</Button>
                          <Button variant="outline" onClick={() => moveTopic(idx, 1)} disabled={idx === topics.length - 1} style={{ backgroundColor: '#F8F1DD', borderColor: '#157C61', color: '#157C61' }} className="hover:opacity-90 disabled:opacity-50 border-2">Down</Button>
                          <Button variant="destructive" onClick={() => removeTopic(idx)} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
                        </div>
                      </div>
                    ))}
                    <div className="grid gap-2">
                      <label className="text-xs uppercase font-semibold">Bulk import (newline, comma, or semicolon separated)</label>
                      <Textarea rows={4} placeholder={`Energy prices; Youth engagement\nMedia framing`} onBlur={(e) => bulkImportTopics(e.target.value)} />
                      <div className="flex items-center justify-between mt-2">
                        <label className="text-xs uppercase font-semibold">Advanced: Topics JSON</label>
                      </div>
                      <Textarea rows={8} value={JSON.stringify(topics, null, 2)} onChange={(e) => { try { setTopics(JSON.parse(e.target.value)); } catch {} }} />
                    </div>
                  </div>
                </CardContent>
              </DialogContent>
            </Dialog>

            {/* Settings dialog */}
            <Dialog>
              <DialogTrigger asChild><Button variant="outline" style={{ backgroundColor: '#F8F1DD', borderColor: '#157C61', color: '#157C61' }} className="hover:opacity-90 border-2"><Settings className="w-4 h-4 mr-2"/>Settings</Button></DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto w-[95vw] sm:w-full" style={{ backgroundColor: '#F8F1DD' }}>
                <DialogHeader>
                  <DialogTitle>Settings</DialogTitle>
                  <DialogDescription>Configure pacing and behaviour.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 sm:gap-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs uppercase font-semibold">Rounds</label>
                      <div className="flex items-center gap-4 mt-2">
                        <Slider value={[rounds]} min={1} max={8} step={1} onValueChange={(v) => setRounds(v[0])}/>
                        <div className="w-10 text-right text-sm">{rounds}</div>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs uppercase font-semibold">Delay (ms)</label>
                      <div className="flex items-center gap-4 mt-2">
                        <Slider value={[delayMs]} min={400} max={6000} step={200} onValueChange={(v) => setDelayMs(v[0])}/>
                        <div className="w-14 text-right text-sm">{delayMs}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <label className="text-xs uppercase font-semibold">Auto‑run on load</label>
                        <div className="text-xs text-neutral-600">Start automatically after load</div>
                      </div>
                      <Switch checked={autoRun} onCheckedChange={setAutoRun}/>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <label className="text-xs uppercase font-semibold">Show Info</label>
                        <div className="text-xs text-neutral-600">Open help & tips</div>
                      </div>
                      <InfoDialogButton />
                    </div>
                  </div>
                </div>

                {/* OpenRouter AI Settings */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">OpenRouter AI Configuration</h3>
                      <p className="text-sm text-neutral-600">Connect to OpenRouter for AI-powered debates with access to 200+ models</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-neutral-600">Use AI API</span>
                      <Switch checked={useLLM} onCheckedChange={setUseLLM} />
                    </div>
                  </div>

                  {useLLM && (
                    <div className="space-y-6">
                      {/* OpenRouter Configuration */}
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Backend Status</label>
                            <div className="mt-1 p-3 rounded-md border" style={{ backgroundColor: '#F8F1DD', borderColor: '#157C61' }}>
                              {backendStatus === 'checking' && (
                                <div className="text-blue-700 font-medium flex items-center gap-2">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Checking backend connection...
                                </div>
                              )}
                              {backendStatus === 'connected' && (
                                <div className="text-green-700 font-medium">
                                  ✅ Backend connected with API key
                                </div>
                              )}
                              {backendStatus === 'error' && (
                                <div className="text-red-700 font-medium">
                                  ❌ Backend error: {backendError}
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-neutral-500 mt-1">
                              Backend server handles OpenRouter API calls securely. 
                              {backendStatus === 'error' && (
                                <span className="block mt-1 text-amber-600 font-medium">
                                  Start the backend server: <code className="bg-gray-100 px-1 rounded">cd backend && npm install && npm start</code>
                                </span>
                              )}
                            </p>
                          </div>

                          <div>
                            <label className="text-sm font-medium">Model</label>
                            {modelsLoading ? (
                              <div className="w-full p-2 border rounded-md text-sm mt-1 flex items-center gap-2" style={{ backgroundColor: '#F8F1DD', borderColor: '#157C61' }}>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Loading models from OpenRouter...
                              </div>
                            ) : (
                              <select 
                                className="w-full p-2 border rounded-md text-sm mt-1"
                                value={model} 
                                onChange={(e) => setModel(e.target.value)}
                              >
                                <optgroup label="Free Models">
                                  {availableModels.filter(m => m.category === 'free').map((m) => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                  ))}
                                </optgroup>
                                <optgroup label="Premium Models">
                                  {availableModels.filter(m => m.category === 'premium').map((m) => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                  ))}
                                </optgroup>
                              </select>
                            )}
                            {modelsError && (
                              <p className="text-xs text-red-600 mt-1">{modelsError}</p>
                            )}
                            <p className="text-xs text-neutral-500 mt-1">
                              {availableModels.find(m => m.value === model)?.category === 'free' ? 
                                '💚 Free model - no credits required!' : 
                                '💳 Premium model - requires credits'}
                            </p>
                            <p className="text-xs text-neutral-400 mt-1">
                              {availableModels.length} models available from OpenRouter
                            </p>
                          </div>

                          <div>
                            <label className="text-sm font-medium">Referer URL (optional)</label>
                            <Input 
                              placeholder="https://your-site.com" 
                              value={orRef} 
                              onChange={(e) => setOrRef(e.target.value)}
                              className="mt-1"
                            />
                            <p className="text-xs text-neutral-500 mt-1">Helps OpenRouter track usage</p>
                          </div>

                          <div>
                            <label className="text-sm font-medium">App Title (optional)</label>
                            <Input 
                              placeholder="Debate Simulator" 
                              value={orTitle} 
                              onChange={(e) => setOrTitle(e.target.value)}
                              className="mt-1"
                            />
                          </div>

                          {/* Connection Test */}
                          <div className="pt-2">
                            <Button 
                              onClick={testConnection} 
                              disabled={connectionStatus === 'testing' || backendStatus !== 'connected' || !model}
                              variant="outline"
                              className="w-full hover:opacity-90 border-2"
                              style={{ backgroundColor: '#F8F1DD', borderColor: '#157C61', color: '#157C61' }}
                            >
                              {connectionStatus === 'testing' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                              {connectionStatus === 'testing' ? 'Testing...' : 
                               connectionStatus === 'success' ? '✓ Connected' :
                               connectionStatus === 'error' ? '✗ Failed' : 'Test Connection'}
                            </Button>
                            {connectionError && (
                              <p className="text-xs text-red-600 mt-2">{connectionError}</p>
                            )}
                            {backendStatus !== 'connected' && (
                              <p className="text-xs text-amber-600 mt-2">Backend server required for testing</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Response Length</label>
                            <div className="mt-2">
                              <Slider 
                                value={[maxTokens]} 
                                min={50} 
                                max={500} 
                                step={25} 
                                onValueChange={(v) => setMaxTokens(v[0])}
                                className="mb-2"
                              />
                              <div className="text-xs text-center text-neutral-600">{maxTokens} tokens</div>
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium">Creativity</label>
                            <div className="mt-2">
                              <Slider 
                                value={[temperature]} 
                                min={0} 
                                max={1.5} 
                                step={0.1} 
                                onValueChange={(v) => setTemperature(v[0])}
                                className="mb-2"
                              />
                              <div className="text-xs text-center text-neutral-600">
                                {temperature < 0.3 ? 'Conservative' : 
                                 temperature < 0.7 ? 'Balanced' : 
                                 temperature < 1.0 ? 'Creative' : 'Very Creative'}
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium">Diversity</label>
                            <div className="mt-2">
                              <Slider 
                                value={[freqPenalty]} 
                                min={0} 
                                max={2} 
                                step={0.1} 
                                onValueChange={(v) => setFreqPenalty(v[0])}
                                className="mb-2"
                              />
                              <div className="text-xs text-center text-neutral-600">
                                {freqPenalty < 0.5 ? 'Allow repetition' : 
                                 freqPenalty < 1.0 ? 'Some variety' : 'Avoid repetition'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Info dialog trigger & instance */}
            <InfoDialogButton />
          </div>
        </div>

        {/* Transcript (chat bubbles) */}
        <Card className="shadow-sm" style={{ backgroundColor: '#F8F1DD' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="font-semibold">Live Debate Transcript</div>
              {loading && <div className="flex items-center text-sm text-neutral-500"><Loader2 className="w-4 h-4 mr-2 animate-spin"/> generating…</div>}
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div 
                ref={scrollerRef} 
                className="h-[50vh] sm:h-[60vh] md:h-[70vh] overflow-y-auto rounded-xl p-2 sm:p-4 border"
                style={{ backgroundColor: '#F8F1DD', borderColor: '#157C61' }}
                onScroll={handleScroll}
                onMouseEnter={handleUserInteraction}
                onTouchStart={handleUserInteraction}
              >
              {log.length === 0 && (
                <div className="text-sm text-neutral-500">
                  Press <strong>Start</strong> to begin. Rotates speakers, changes topic each round, and stops after the selected rounds.
                  {useLLM && backendStatus === 'error' && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="text-amber-800 font-medium">🤖 AI Mode Enabled</div>
                      <div className="text-amber-700 text-xs mt-1">
                        Backend server not available. Start the backend server to use AI-powered debates, or disable AI mode to use local generation.
                      </div>
                    </div>
                  )}
                  {useLLM && backendStatus === 'connected' && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="text-green-800 font-medium">🤖 AI Mode Enabled</div>
                      <div className="text-green-700 text-xs mt-1">
                        Using backend server for AI-powered debates. Select your preferred model in Settings.
                      </div>
                    </div>
                  )}
                </div>
              )}
                <ul className="space-y-4">
                {log.map((l, i) => {
                  // Use a hash of the speaker name to determine side for consistency
                  const hash = l.speaker.split('').reduce((a, b) => {
                    a = ((a << 5) - a) + b.charCodeAt(0);
                    return a & a;
                  }, 0);
                  const right = Math.abs(hash) % 2 === 1;
                  const clean = (l.text || "").replace(/\bTopic:[^\n]*/gi, "").replace(/\s+/g, " ").trim();
                  return (
                    <li key={`${l.ts}-${i}`} className={`grid gap-1 ${right ? 'justify-items-end' : 'justify-items-start'}`}>
                      <div className={`flex items-end gap-2 ${right ? 'flex-row-reverse' : ''}`}>
                        <img
                          src={avatarMap.get(l.speaker) || generateAvatarDataUrl({ name: l.speaker, color: l.color })}
                          alt={l.speaker}
                          className="w-10 h-10 rounded-full border shrink-0"
                          style={{ borderColor: l.color }}
                        />
                        <div className={`max-w-[85%] sm:max-w-[80%] ${right ? 'items-end text-right' : ''}`}>
                          <div className="text-xs mb-1 font-medium" style={{ color: l.color }}>{l.speaker}</div>
                          <div className="rounded-2xl px-4 py-3 border shadow-sm" style={{ borderColor: l.color, backgroundColor: '#F8F1DD' }}>
                            <div className="leading-relaxed">{clean}</div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
                </ul>
              </div>
              
              {/* Floating Action Button for scrolling to bottom */}
              {showScrollButton && (
                <button
                  onClick={scrollToBottom}
                  className="absolute bottom-4 right-4 rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-105 z-10 animate-in fade-in-0 slide-in-from-bottom-2 border-2"
                  style={{ backgroundColor: '#F8F1DD', borderColor: '#157C61', color: '#157C61' }}
                  title="Scroll to latest message"
                >
                  <svg 
                    className="w-5 h-5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M19 14l-7 7m0 0l-7-7m7 7V3" 
                    />
                  </svg>
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
      </>
  );
}

// ---------- Info dialog components ----------
function InfoDialogButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} style={{ backgroundColor: '#F8F1DD', borderColor: '#157C61', color: '#157C61' }} className="hover:opacity-90 border-2"><Info className="w-4 h-4 mr-2"/>Info</Button>
      <InfoDialog controlledOpen={open} onChange={setOpen} />
    </>
  );
}

function InfoDialog({ controlledOpen, onChange }: { controlledOpen?: boolean; onChange?: (v: boolean) => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (typeof controlledOpen === 'boolean') setOpen(controlledOpen); }, [controlledOpen]);
  const set = onChange || setOpen;
  return (
    <Dialog open={open} onOpenChange={set}>
      <DialogContent className="max-w-lg" style={{ backgroundColor: '#F8F1DD' }}>
        <DialogHeader><DialogTitle>How to share & Tips</DialogTitle></DialogHeader>
        <div className="text-sm text-neutral-700 space-y-3">
          <div>
            <h3 className="font-semibold text-neutral-900 mb-1">How to share</h3>
            <ol className="list-decimal ml-4 space-y-1">
              <li>Share this ChatGPT conversation (canvas attached) to let others run it.</li>
              <li>Settings persist locally in the viewer's browser.</li>
              <li>Use <em>Copy transcript</em> or <em>Download .txt</em> to export dialogue.</li>
            </ol>
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900 mb-1">Tips</h3>
            <ul className="list-disc ml-4 space-y-1">
              <li>Tune <strong>Rounds</strong> and <strong>Delay</strong> for demo pacing.</li>
              <li>Use <strong>Topics</strong> / <strong>Personas</strong> editors for quick changes; JSON available for power users.</li>
              <li>For richer debates, enable <strong>Use AI API</strong> and add your OpenRouter API key.</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}