/**
 * SSCalendar — App.jsx
 * Drop-in replacement. Works with or without Supabase.
 * If VITE_SUPABASE_URL is missing, falls back to localStorage automatically.
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────

const USERNAME_KEY = "sscalendar_username";
const STORAGE_KEY  = "sscalendar_stories_v2";

const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAYS_FULL  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS     = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const CATEGORIES = ["Lifestyle","Routine","Work","Sponsored","Personal","Other"];

const SECTIONS = [
  { key:"morning",   label:"Morning",   icon:"○" },
  { key:"afternoon", label:"Afternoon", icon:"◑" },
  { key:"night",     label:"Night",     icon:"●" },
];

// ─── Storage layer (localStorage, no Supabase dependency) ────────────────────

function loadAllStories() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveAllStories(stories) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
}

// Simple pub/sub so multiple hooks can react to storage changes
const listeners = new Set();
function notifyListeners() { listeners.forEach(fn => fn()); }

function useStorageStories(dayKey) {
  const [stories, setStoriesState] = useState(() =>
    loadAllStories().filter(s => s.day_key === dayKey)
  );

  // Re-read from storage whenever another hook notifies
  useEffect(() => {
    const refresh = () => {
      setStoriesState(loadAllStories().filter(s => s.day_key === dayKey));
    };
    listeners.add(refresh);
    return () => listeners.delete(refresh);
  }, [dayKey]);

  const setStories = useCallback((updater) => {
    const all = loadAllStories();
    const dayStories = all.filter(s => s.day_key === dayKey);
    const rest       = all.filter(s => s.day_key !== dayKey);
    const next = typeof updater === "function" ? updater(dayStories) : updater;
    saveAllStories([...rest, ...next]);
    setStoriesState(next);
    notifyListeners();
  }, [dayKey]);

  return [stories, setStories];
}

function useMonthStories(year, month) {
  const start = makeDayKey(year, month, 1);
  const end   = makeDayKey(year, month, getDaysInMonth(year, month));

  const [map, setMap] = useState(() => buildMap(start, end));

  function buildMap(s, e) {
    const all = loadAllStories();
    const m = {};
    all.filter(x => x.day_key >= s && x.day_key <= e).forEach(x => {
      if (!m[x.day_key]) m[x.day_key] = [];
      m[x.day_key].push(x);
    });
    return m;
  }

  useEffect(() => {
    const refresh = () => setMap(buildMap(start, end));
    listeners.add(refresh);
    return () => listeners.delete(refresh);
  }, [start, end]);

  return map;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function makeDayKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}
function timeAgo(iso) {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function uid() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ─── Global styles ────────────────────────────────────────────────────────────

const GlobalStyle = () => (
  <style>{`
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: 'DM Sans','Helvetica Neue',sans-serif; background:#fff; -webkit-font-smoothing:antialiased; }
    @keyframes pulse { 0%,100%{opacity:0.2} 50%{opacity:0.7} }
    @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
    textarea { font-family: inherit; }
    button { font-family: inherit; }
  `}</style>
);

// ─── NameGate ────────────────────────────────────────────────────────────────

function NameGate({ onConfirm }) {
  const [name, setName] = useState("");
  const [err,  setErr]  = useState(false);

  const submit = () => {
    const t = name.trim();
    if (!t) { setErr(true); return; }
    localStorage.setItem(USERNAME_KEY, t);
    onConfirm(t);
  };

  return (
    <>
      <GlobalStyle />
      <div style={{
        minHeight:"100dvh", display:"flex", alignItems:"center",
        justifyContent:"center", background:"#fff", padding:"24px 20px",
      }}>
        <div style={{ width:"100%", maxWidth:380, textAlign:"center", animation:"fadeIn 0.4s ease" }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", opacity:0.28, marginBottom:24 }}>
            SSCalendar
          </div>
          <div style={{ fontSize:32, fontWeight:800, letterSpacing:"-0.8px", marginBottom:10, lineHeight:1.1 }}>
            What's your name?
          </div>
          <div style={{ fontSize:14, opacity:0.4, marginBottom:40, lineHeight:1.7 }}>
            Shown next to your edits.<br/>No account needed — ever.
          </div>
          <input
            autoFocus
            value={name}
            onChange={e => { setName(e.target.value); setErr(false); }}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="Your name…"
            style={{
              display:"block", width:"100%", padding:"15px 18px", fontSize:16,
              border:`1.5px solid ${err ? "#000" : "#ddd"}`, borderRadius:13,
              outline:"none", marginBottom:10, transition:"border-color 0.15s",
              background:"#fafafa",
            }}
          />
          {err && (
            <div style={{ fontSize:12, opacity:0.45, marginBottom:10, textAlign:"left", paddingLeft:2 }}>
              Please enter your name to continue.
            </div>
          )}
          <button
            onClick={submit}
            style={{
              display:"block", width:"100%", padding:"15px",
              background:"#000", color:"#fff", border:"none", borderRadius:13,
              fontSize:15, fontWeight:700, letterSpacing:"0.03em", cursor:"pointer",
              transition:"opacity 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            Enter SSCalendar →
          </button>
        </div>
      </div>
    </>
  );
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, inverted = false, height = 2 }) {
  return (
    <div style={{ width:"100%", height, background: inverted ? "rgba(255,255,255,0.18)" : "#ebebeb", borderRadius:999 }}>
      <div style={{
        height:"100%", width:`${Math.min(100, value)}%`, borderRadius:999,
        background: inverted ? "#fff" : "#000", transition:"width 0.45s ease",
      }} />
    </div>
  );
}

// ─── NavBtn ───────────────────────────────────────────────────────────────────

function NavBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        width:36, height:36, borderRadius:10, border:"1.5px solid #ddd",
        background:"#fff", cursor:"pointer", fontSize:15, display:"flex",
        alignItems:"center", justifyContent:"center", color:"#000",
        transition:"all 0.15s", padding:0,
      }}
      onMouseEnter={e => { e.currentTarget.style.background="#000"; e.currentTarget.style.color="#fff"; e.currentTarget.style.borderColor="#000"; }}
      onMouseLeave={e => { e.currentTarget.style.background="#fff"; e.currentTarget.style.color="#000"; e.currentTarget.style.borderColor="#ddd"; }}
    >
      {children}
    </button>
  );
}

// ─── StoryCard ────────────────────────────────────────────────────────────────

function StoryCard({ story, onToggle, onChangeText, onChangeCategory, onDelete }) {
  const [localText, setLocalText] = useState(story.text);
  const debounce = useRef(null);
  const focused  = useRef(false);

  // Sync remote changes only when not typing
  useEffect(() => {
    if (!focused.current) setLocalText(story.text);
  }, [story.text]);

  const handleText = (val) => {
    setLocalText(val);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => onChangeText(val), 400);
  };

  return (
    <div
      style={{
        background: story.posted ? "#f7f7f7" : "#fff",
        border: "1.5px solid #ebebeb",
        borderRadius: 14,
        padding: "14px 16px",
        transition: "opacity 0.2s, background 0.2s",
        opacity: story.posted ? 0.6 : 1,
        animation: "fadeIn 0.2s ease",
      }}
    >
      {/* Row 1: checkbox + textarea + delete */}
      <div style={{ display:"flex", alignItems:"flex-start", gap:11 }}>
        {/* Check */}
        <button
          onClick={() => onToggle(!story.posted)}
          style={{
            width:22, height:22, borderRadius:"50%", flexShrink:0, marginTop:2,
            border: story.posted ? "none" : "2px solid #ccc",
            background: story.posted ? "#000" : "transparent",
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor:"pointer", transition:"all 0.18s",
          }}
        >
          {story.posted && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.8 7L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>

        {/* Text */}
        <textarea
          value={localText}
          placeholder="Story idea…"
          rows={2}
          onFocus={() => { focused.current = true; }}
          onBlur={() => { focused.current = false; }}
          onChange={e => handleText(e.target.value)}
          style={{
            flex:1, border:"none", outline:"none", background:"transparent",
            fontSize:14, lineHeight:1.6, color:"#000", resize:"none",
            textDecoration: story.posted ? "line-through" : "none",
            opacity: story.posted ? 0.55 : 1, padding:0,
          }}
        />

        {/* Delete */}
        <button
          onClick={onDelete}
          style={{
            background:"none", border:"none", cursor:"pointer",
            fontSize:20, lineHeight:1, color:"#000", opacity:0.15,
            padding:"0 2px", flexShrink:0, transition:"opacity 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.65"}
          onMouseLeave={e => e.currentTarget.style.opacity = "0.15"}
        >×</button>
      </div>

      {/* Row 2: category chips */}
      <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:10, paddingLeft:33 }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => onChangeCategory(cat)}
            style={{
              padding:"3px 9px", borderRadius:20, border:"1.5px solid",
              borderColor: story.category === cat ? "#000" : "#e4e4e4",
              background: story.category === cat ? "#000" : "transparent",
              color: story.category === cat ? "#fff" : "#aaa",
              fontSize:10, fontWeight:600, letterSpacing:"0.04em",
              cursor:"pointer", transition:"all 0.12s",
            }}
          >{cat}</button>
        ))}
      </div>

      {/* Row 3: edited by */}
      {story.edited_by && (
        <div style={{ fontSize:10, opacity:0.28, marginTop:8, paddingLeft:33, letterSpacing:"0.01em" }}>
          ✎ {story.edited_by} · {timeAgo(story.updated_at)}
        </div>
      )}
    </div>
  );
}

// ─── SectionBlock ─────────────────────────────────────────────────────────────

function SectionBlock({ section, stories, onAdd, onToggle, onChangeText, onChangeCategory, onDelete }) {
  const done = stories.filter(s => s.posted).length;
  const total = stories.length;

  return (
    <div style={{ marginBottom:36 }}>
      {/* Section header */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        marginBottom:14, paddingBottom:12,
        borderBottom:"1.5px solid #f0f0f0",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <span style={{ fontSize:16, opacity:0.4, lineHeight:1 }}>{section.icon}</span>
          <span style={{ fontSize:14, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase" }}>
            {section.label}
          </span>
          {total > 0 && (
            <span style={{
              fontSize:10, fontWeight:700, background:"#000", color:"#fff",
              borderRadius:20, padding:"2px 8px", letterSpacing:"0.04em",
            }}>
              {done}/{total}
            </span>
          )}
        </div>

        {/* Add story button — always visible, clearly labeled */}
        <button
          onClick={onAdd}
          style={{
            background:"#000", color:"#fff", border:"none",
            borderRadius:10, padding:"8px 14px",
            fontSize:12, fontWeight:700, letterSpacing:"0.05em",
            cursor:"pointer", transition:"opacity 0.15s",
            display:"flex", alignItems:"center", gap:5,
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          <span style={{ fontSize:16, lineHeight:1, marginTop:-1 }}>+</span> Add story
        </button>
      </div>

      {/* Story cards */}
      {total > 0 ? (
        <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
          {stories.map(story => (
            <StoryCard
              key={story.id}
              story={story}
              onToggle={(val) => onToggle(story.id, val)}
              onChangeText={(val) => onChangeText(story.id, val)}
              onChangeCategory={(val) => onChangeCategory(story.id, val)}
              onDelete={() => onDelete(story.id)}
            />
          ))}
        </div>
      ) : (
        /* Empty state — also tappable */
        <button
          onClick={onAdd}
          style={{
            width:"100%", padding:"20px 16px", border:"1.5px dashed #e0e0e0",
            borderRadius:14, background:"transparent", cursor:"pointer",
            fontSize:13, fontWeight:500, color:"#bbb", letterSpacing:"0.02em",
            transition:"all 0.15s", textAlign:"center",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor="#000"; e.currentTarget.style.color="#000"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor="#e0e0e0"; e.currentTarget.style.color="#bbb"; }}
        >
          No {section.label.toLowerCase()} stories yet — tap to add one
        </button>
      )}
    </div>
  );
}

// ─── DayView ─────────────────────────────────────────────────────────────────

function DayView({ year, month, day, username, onBack }) {
  const dayKey = makeDayKey(year, month, day);
  const [stories, setStories] = useStorageStories(dayKey);

  // All mutations are synchronous (localStorage) — no async, no bugs
  const addStory = (section) => {
    const sectionStories = stories.filter(s => s.section === section);
    const maxOrder = sectionStories.reduce((m, s) => Math.max(m, s.sort_order), -1);
    const newStory = {
      id: uid(),
      day_key: dayKey,
      text: "",
      category: "Lifestyle",
      posted: false,
      section,
      sort_order: maxOrder + 1,
      created_by: username,
      edited_by: username,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    setStories(prev => [...prev, newStory]);
  };

  const deleteStory = (id) => {
    setStories(prev => prev.filter(s => s.id !== id));
  };

  const updateStory = (id, changes) => {
    setStories(prev => prev.map(s =>
      s.id === id
        ? { ...s, ...changes, edited_by: username, updated_at: new Date().toISOString() }
        : s
    ));
  };

  const storiesBySection = (sec) =>
    stories.filter(s => s.section === sec).sort((a, b) => a.sort_order - b.sort_order);

  const total = stories.length;
  const done  = stories.filter(s => s.posted).length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  const dateObj  = new Date(year, month, day);
  const fullDate = `${DAYS_FULL[dateObj.getDay()]}, ${MONTHS[month]} ${day}`;

  return (
    <>
      <GlobalStyle />
      <div style={{ minHeight:"100dvh", background:"#fafafa", paddingBottom:80 }}>

        {/* Sticky header */}
        <div style={{
          background:"#fff", borderBottom:"1px solid #ebebeb",
          padding:"0 20px", position:"sticky", top:0, zIndex:20,
        }}>
          <div style={{ maxWidth:640, margin:"0 auto", display:"flex", alignItems:"center", gap:14, height:62 }}>
            <button
              onClick={onBack}
              style={{
                background:"none", border:"1.5px solid #e0e0e0", borderRadius:10,
                padding:"6px 14px", cursor:"pointer", fontSize:13, fontWeight:600,
                color:"#000", transition:"border-color 0.15s", flexShrink:0,
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor="#000"}
              onMouseLeave={e => e.currentTarget.style.borderColor="#e0e0e0"}
            >
              ← Back
            </button>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{
                fontSize:16, fontWeight:800, letterSpacing:"-0.3px",
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
              }}>
                {fullDate}
              </div>
            </div>
            <div style={{ fontSize:11, opacity:0.28, fontWeight:600, flexShrink:0 }}>{username}</div>
          </div>
        </div>

        <div style={{ maxWidth:640, margin:"0 auto", padding:"24px 20px" }}>

          {/* Progress banner */}
          <div style={{
            background:"#000", color:"#fff", borderRadius:18,
            padding:"20px 24px", marginBottom:36,
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <div>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", opacity:0.45, marginBottom:4 }}>
                  Today's Progress
                </div>
                <div style={{ fontSize:13, opacity:0.5 }}>
                  {total === 0 ? "No stories planned yet" : `${done} of ${total} posted`}
                </div>
              </div>
              <div style={{ fontSize:36, fontWeight:800, letterSpacing:"-1.5px", lineHeight:1 }}>
                {total === 0 ? "—" : `${pct}%`}
              </div>
            </div>
            <ProgressBar value={pct} inverted height={3} />
          </div>

          {/* Three sections */}
          {SECTIONS.map(section => (
            <SectionBlock
              key={section.key}
              section={section}
              stories={storiesBySection(section.key)}
              onAdd={() => addStory(section.key)}
              onToggle={(id, val) => updateStory(id, { posted: val })}
              onChangeText={(id, val) => updateStory(id, { text: val })}
              onChangeCategory={(id, val) => updateStory(id, { category: val })}
              onDelete={deleteStory}
            />
          ))}
        </div>
      </div>
    </>
  );
}

// ─── FeedDayCard ─────────────────────────────────────────────────────────────

function FeedDayCard({ year, month, day, stories, isToday, onClick }) {
  const total  = stories.length;
  const done   = stories.filter(s => s.posted).length;
  const pct    = total > 0 ? Math.round((done / total) * 100) : 0;
  const dateObj = new Date(year, month, day);
  const isPast  = !isToday && dateObj < new Date(new Date().setHours(0,0,0,0));

  return (
    <button
      onClick={onClick}
      style={{
        width:"100%", display:"flex", alignItems:"center", gap:0,
        background: isToday ? "#000" : "#fff",
        color: isToday ? "#fff" : "#000",
        border:"none", borderBottom:"1px solid #f2f2f2",
        padding:"0 20px", cursor:"pointer", textAlign:"left",
        transition:"background 0.15s", minHeight:76,
      }}
      onMouseEnter={e => { if (!isToday) e.currentTarget.style.background="#f8f8f8"; }}
      onMouseLeave={e => { if (!isToday) e.currentTarget.style.background="#fff"; }}
    >
      {/* Date block */}
      <div style={{ flexShrink:0, width:52, textAlign:"center", padding:"14px 0" }}>
        <div style={{
          fontSize:9, fontWeight:700, letterSpacing:"0.1em",
          textTransform:"uppercase",
          opacity: isToday ? 0.65 : (isPast ? 0.28 : 0.4),
          marginBottom:3,
        }}>
          {DAYS_SHORT[dateObj.getDay()]}
        </div>
        <div style={{
          fontSize:26, fontWeight:800, letterSpacing:"-0.8px", lineHeight:1,
          opacity: isPast && !isToday ? 0.35 : 1,
        }}>
          {day}
        </div>
        {isToday && (
          <div style={{ width:4, height:4, borderRadius:"50%", background:"#fff", margin:"5px auto 0" }} />
        )}
      </div>

      {/* Divider */}
      <div style={{
        width:1, height:36, flexShrink:0,
        background: isToday ? "rgba(255,255,255,0.15)" : "#f0f0f0",
        margin:"0 18px",
      }} />

      {/* Content */}
      <div style={{ flex:1, minWidth:0, padding:"14px 0" }}>
        {total > 0 ? (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
              <div style={{ fontSize:12, fontWeight:600, opacity: isToday ? 0.7 : 0.45 }}>
                {total} {total === 1 ? "story" : "stories"} · {done} posted
              </div>
              <div style={{ fontSize:12, fontWeight:800, opacity: isToday ? 0.7 : 0.5 }}>
                {pct}%
              </div>
            </div>
            <ProgressBar value={pct} inverted={isToday} height={2} />
            {/* Section summary */}
            <div style={{ display:"flex", gap:10, marginTop:8 }}>
              {SECTIONS.map(sec => {
                const count = stories.filter(s => s.section === sec.key).length;
                if (!count) return null;
                return (
                  <span key={sec.key} style={{
                    fontSize:10, fontWeight:600, opacity: isToday ? 0.55 : 0.35,
                    letterSpacing:"0.02em",
                  }}>
                    {sec.icon} {count}
                  </span>
                );
              })}
            </div>
          </>
        ) : (
          <div style={{
            fontSize:12, opacity: isPast ? 0.22 : (isToday ? 0.5 : 0.3),
            letterSpacing:"0.01em",
          }}>
            {isToday ? "Plan your stories for today" : "No stories"}
          </div>
        )}
      </div>

      {/* Arrow */}
      <div style={{ fontSize:18, opacity: isToday ? 0.45 : 0.15, flexShrink:0, paddingLeft:8 }}>›</div>
    </button>
  );
}

// ─── FeedView ─────────────────────────────────────────────────────────────────

function FeedView({ year, month, username, storiesMap, onSelectDay, onPrevMonth, onNextMonth }) {
  const today       = new Date();
  const daysInMonth = getDaysInMonth(year, month);
  const todayRef    = useRef(null);
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  // Scroll to today only when viewing the current month
  useEffect(() => {
    if (isCurrentMonth && todayRef.current) {
      setTimeout(() => {
        todayRef.current?.scrollIntoView({ behavior:"smooth", block:"center" });
      }, 80);
    }
  }, [month, year]);

  const isToday = (d) => isCurrentMonth && today.getDate() === d;

  return (
    <>
      <GlobalStyle />
      <div style={{ minHeight:"100dvh", background:"#fff" }}>

        {/* Sticky header */}
        <div style={{
          background:"#fff", borderBottom:"1px solid #ebebeb",
          padding:"0 20px", position:"sticky", top:0, zIndex:20,
        }}>
          <div style={{ maxWidth:640, margin:"0 auto", display:"flex", alignItems:"center", height:60, gap:12 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", opacity:0.28, lineHeight:1, marginBottom:3 }}>
                SSCalendar
              </div>
              <div style={{ fontSize:20, fontWeight:800, letterSpacing:"-0.5px", lineHeight:1 }}>
                {MONTHS[month]} {year}
              </div>
            </div>
            <div style={{ fontSize:11, opacity:0.28, fontWeight:600, flexShrink:0, letterSpacing:"0.01em" }}>
              {username}
            </div>
            <div style={{ display:"flex", gap:6, flexShrink:0 }}>
              <NavBtn onClick={onPrevMonth}>←</NavBtn>
              <NavBtn onClick={onNextMonth}>→</NavBtn>
            </div>
          </div>
        </div>

        {/* Feed */}
        <div style={{ maxWidth:640, margin:"0 auto" }}>
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
            <div key={d} ref={isToday(d) ? todayRef : null}>
              <FeedDayCard
                year={year} month={month} day={d}
                stories={storiesMap[makeDayKey(year, month, d)] || []}
                isToday={isToday(d)}
                onClick={() => onSelectDay(d)}
              />
            </div>
          ))}
          <div style={{ height:60 }} />
        </div>
      </div>
    </>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState("today");
  const now = new Date();

  // Username: read once from localStorage on mount — never asks again if stored
  const [username, setUsername] = useState(() => {
    try { return localStorage.getItem(USERNAME_KEY) || ""; }
    catch { return ""; }
  });

  const [year, setYear]               = useState(now.getFullYear());
  const [month, setMonth]             = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);

  // Month-level story map for feed overview
  const storiesMap = useMonthStories(year, month);

  const prevMonth = () => { if (month === 0) { setYear(y => y-1); setMonth(11); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y+1); setMonth(0); } else setMonth(m => m+1); };

  const handleConfirmName = (name) => {
    setUsername(name); // localStorage already written inside NameGate
  };

  // 1. No username → show name gate
  if (!username) return <NameGate onConfirm={handleConfirmName} />;
const today = new Date();

if (view !== "calendar") {
  return (
    <DayView
      year={today.getFullYear()}
      month={today.getMonth()}
      day={today.getDate()}
      username={username}
      onBack={() => setView("calendar")}
    />
  );
}

</div>
  );
}
  // 2. Day selected → show day view
  if (selectedDay !== null) {
    return (
      <DayView
        year={year} month={month} day={selectedDay}
        username={username}
        onBack={() => setSelectedDay(null)}
      />
    );
  }

  // 3. Default → vertical feed
  return (
    <FeedView
      year={year} month={month}
      username={username}
      storiesMap={storiesMap}
      onSelectDay={setSelectedDay}
      onPrevMonth={prevMonth}
      onNextMonth={nextMonth}
    />
  );
}
const TESTE = "v2";