import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabaseClient.js";

// ─── Constants ───────────────────────────────────────────────────────────────

const USERNAME_KEY = "sscalendar_username";
const DAYS        = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_FULL   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS      = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const CATEGORIES  = ["Lifestyle","Routine","Work","Sponsored","Personal","Other"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }
function makeDayKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}
function timeAgo(isoString) {
  if (!isoString) return "";
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Drag-and-drop hook ───────────────────────────────────────────────────────

function useDragList(items, onReorder) {
  const dragIdx = useRef(null);
  const dragOverIdx = useRef(null);

  const onDragStart = (i) => { dragIdx.current = i; };
  const onDragEnter = (i) => { dragOverIdx.current = i; };
  const onDragEnd   = () => {
    const from = dragIdx.current, to = dragOverIdx.current;
    dragIdx.current = null; dragOverIdx.current = null;
    if (from === null || to === null || from === to) return;
    const next = [...items];
    const [removed] = next.splice(from, 1);
    next.splice(to, 0, removed);
    onReorder(next);
  };

  return { onDragStart, onDragEnter, onDragEnd };
}

// ─── NameGate ────────────────────────────────────────────────────────────────

function NameGate({ onConfirm }) {
  const [name, setName] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) { setError(true); return; }
    localStorage.setItem(USERNAME_KEY, trimmed);
    onConfirm(trimmed);
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#fff",
      padding: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 400, textAlign: "center" }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          opacity: 0.3,
          marginBottom: 16,
        }}>
          SSCalendar
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 8 }}>
          What's your name?
        </div>
        <div style={{ fontSize: 14, opacity: 0.45, marginBottom: 36, lineHeight: 1.5 }}>
          This will be shown when you edit stories.<br />No account needed.
        </div>
        <input
          autoFocus
          value={name}
          onChange={e => { setName(e.target.value); setError(false); }}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          placeholder="Your name…"
          style={{
            width: "100%",
            padding: "14px 18px",
            fontSize: 16,
            fontFamily: "inherit",
            border: `1.5px solid ${error ? "#000" : "#e0e0e0"}`,
            borderRadius: 12,
            outline: "none",
            marginBottom: 12,
            transition: "border-color 0.15s",
          }}
        />
        {error && (
          <div style={{ fontSize: 12, color: "#000", opacity: 0.6, marginBottom: 12 }}>
            Please enter your name to continue.
          </div>
        )}
        <button
          onClick={handleSubmit}
          style={{
            width: "100%",
            padding: "14px",
            background: "#000",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.04em",
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = 0.8}
          onMouseLeave={e => e.currentTarget.style.opacity = 1}
        >
          Enter SSCalendar →
        </button>
      </div>
    </div>
  );
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, inverted }) {
  return (
    <div style={{ width: "100%", height: 2, background: inverted ? "rgba(255,255,255,0.2)" : "#e8e8e8", borderRadius: 2 }}>
      <div style={{
        height: "100%",
        width: `${value}%`,
        background: inverted ? "#fff" : "#000",
        borderRadius: 2,
        transition: "width 0.4s ease",
      }} />
    </div>
  );
}

// ─── OnlineAvatars ────────────────────────────────────────────────────────────

function OnlineAvatars({ users }) {
  if (!users || users.length === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ display: "flex", gap: -4 }}>
        {users.slice(0, 4).map((u, i) => (
          <div
            key={i}
            title={u}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#000",
              border: "2px solid #fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
              color: "#fff",
              marginLeft: i > 0 ? -8 : 0,
              letterSpacing: 0,
            }}
          >
            {u.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>
      <span style={{ fontSize: 11, opacity: 0.4, fontWeight: 600 }}>
        {users.length === 1 ? `${users[0]}` : `${users.length} online`}
      </span>
    </div>
  );
}

// ─── DayCard ─────────────────────────────────────────────────────────────────

function DayCard({ day, dayOfWeek, stories, isToday, onClick }) {
  const total = stories.length;
  const done  = stories.filter(s => s.posted).length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <button
      onClick={onClick}
      style={{
        background: isToday ? "#000" : "#fff",
        color: isToday ? "#fff" : "#000",
        border: "1.5px solid #e0e0e0",
        borderRadius: 16,
        padding: "16px 14px 14px",
        textAlign: "left",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 110,
        boxShadow: isToday ? "0 4px 20px rgba(0,0,0,0.18)" : "0 1px 6px rgba(0,0,0,0.06)",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        outline: "none",
        fontFamily: "inherit",
        aspectRatio: "1",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = isToday ? "0 8px 28px rgba(0,0,0,0.22)" : "0 4px 16px rgba(0,0,0,0.11)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = isToday ? "0 4px 20px rgba(0,0,0,0.18)" : "0 1px 6px rgba(0,0,0,0.06)";
      }}
    >
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1 }}>{day}</div>
        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", opacity: isToday ? 0.7 : 0.4, marginTop: 4 }}>
          {dayOfWeek}
        </div>
      </div>
      <div style={{ width: "100%" }}>
        {total > 0 ? (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", marginBottom: 5, opacity: isToday ? 0.75 : 0.5 }}>
              {done}/{total}
            </div>
            <ProgressBar value={pct} inverted={isToday} />
          </>
        ) : (
          <div style={{ fontSize: 10, opacity: isToday ? 0.4 : 0.25, letterSpacing: "0.06em" }}>— empty</div>
        )}
      </div>
    </button>
  );
}

// ─── StoryItem ────────────────────────────────────────────────────────────────

function StoryItem({ story, onTogglePosted, onChangeText, onChangeCategory, onDelete, dragHandlers, index, saving }) {
  const [localText, setLocalText] = useState(story.text);
  const debounceRef = useRef(null);

  // Sync external changes (from real-time) only when not actively editing
  const isFocused = useRef(false);
  useEffect(() => {
    if (!isFocused.current) setLocalText(story.text);
  }, [story.text]);

  const handleTextChange = (val) => {
    setLocalText(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChangeText(val), 600);
  };

  return (
    <div
      draggable
      onDragStart={() => dragHandlers.onDragStart(index)}
      onDragEnter={() => dragHandlers.onDragEnter(index)}
      onDragEnd={dragHandlers.onDragEnd}
      style={{
        background: story.posted ? "#f7f7f7" : "#fff",
        border: "1.5px solid #e8e8e8",
        borderRadius: 14,
        padding: "16px 18px",
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        transition: "opacity 0.2s, background 0.2s",
        opacity: story.posted ? 0.6 : 1,
        position: "relative",
      }}
    >
      {/* Saving indicator */}
      {saving && (
        <div style={{
          position: "absolute",
          top: 10,
          right: 12,
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#000",
          opacity: 0.3,
          animation: "pulse 1s ease-in-out infinite",
        }} />
      )}

      {/* Drag handle */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingTop: 5, opacity: 0.2, flexShrink: 0, cursor: "grab" }}>
        {[0,1,2].map(i => <div key={i} style={{ width: 14, height: 1.5, background: "#000", borderRadius: 2 }} />)}
      </div>

      {/* Checkbox */}
      <button
        onClick={() => onTogglePosted(!story.posted)}
        style={{
          width: 22, height: 22, borderRadius: "50%",
          border: story.posted ? "none" : "2px solid #ccc",
          background: story.posted ? "#000" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, cursor: "pointer", marginTop: 2,
          transition: "background 0.2s, border 0.2s",
        }}
      >
        {story.posted && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.8 7L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        <textarea
          value={localText}
          placeholder="Story idea…"
          onFocus={() => { isFocused.current = true; }}
          onBlur={() => { isFocused.current = false; }}
          onChange={e => handleTextChange(e.target.value)}
          rows={2}
          style={{
            border: "none", outline: "none", background: "transparent",
            fontFamily: "inherit", fontSize: 14, lineHeight: 1.5, color: "#000",
            resize: "none", width: "100%",
            textDecoration: story.posted ? "line-through" : "none",
            opacity: story.posted ? 0.6 : 1,
          }}
        />

        {/* Categories */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => onChangeCategory(cat)}
              style={{
                padding: "4px 10px", borderRadius: 20, border: "1.5px solid",
                borderColor: story.category === cat ? "#000" : "#e0e0e0",
                background: story.category === cat ? "#000" : "transparent",
                color: story.category === cat ? "#fff" : "#888",
                fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Last edited by */}
        {story.edited_by && (
          <div style={{ fontSize: 11, opacity: 0.35, letterSpacing: "0.01em", display: "flex", gap: 4, alignItems: "center" }}>
            <span>✎</span>
            <span>{story.edited_by}</span>
            {story.updated_at && <span>· {timeAgo(story.updated_at)}</span>}
          </div>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        style={{
          background: "none", border: "none", cursor: "pointer",
          opacity: 0.2, padding: 4, flexShrink: 0, lineHeight: 1,
          fontSize: 20, color: "#000", transition: "opacity 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = 0.8}
        onMouseLeave={e => e.currentTarget.style.opacity = 0.2}
      >
        ×
      </button>
    </div>
  );
}

// ─── DayView ──────────────────────────────────────────────────────────────────

function DayView({ year, month, day, username, onBack }) {
  const key = makeDayKey(year, month, day);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingIds, setSavingIds] = useState(new Set());

  // ── Load stories ──
  useEffect(() => {
    setLoading(true);
    supabase
      .from("stories")
      .select("*")
      .eq("day_key", key)
      .order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setStories(data);
        setLoading(false);
      });
  }, [key]);

  // ── Real-time subscription ──
  useEffect(() => {
    const channel = supabase
      .channel(`day-${key}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stories", filter: `day_key=eq.${key}` },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          setStories(prev => {
            if (eventType === "INSERT") {
              if (prev.find(s => s.id === newRow.id)) return prev;
              return [...prev, newRow].sort((a, b) => a.sort_order - b.sort_order);
            }
            if (eventType === "UPDATE") {
              return prev.map(s => s.id === newRow.id ? newRow : s);
            }
            if (eventType === "DELETE") {
              return prev.filter(s => s.id !== oldRow.id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [key]);

  // ── Mutations ──
  const markSaving = (id) => setSavingIds(s => new Set(s).add(id));
  const unmarkSaving = (id) => setSavingIds(s => { const n = new Set(s); n.delete(id); return n; });

  const addStory = async () => {
    const maxOrder = stories.reduce((m, s) => Math.max(m, s.sort_order), -1);
    const newStory = {
      day_key: key,
      text: "",
      category: "Lifestyle",
      posted: false,
      sort_order: maxOrder + 1,
      created_by: username,
      edited_by: username,
    };
    const { data, error } = await supabase.from("stories").insert(newStory).select().single();
    if (!error && data) setStories(prev => [...prev, data]);
  };

  const deleteStory = async (id) => {
    setStories(prev => prev.filter(s => s.id !== id));
    await supabase.from("stories").delete().eq("id", id);
  };

  const updateStory = async (id, changes) => {
    markSaving(id);
    setStories(prev => prev.map(s => s.id === id ? { ...s, ...changes } : s));
    const { error } = await supabase
      .from("stories")
      .update({ ...changes, edited_by: username, updated_at: new Date().toISOString() })
      .eq("id", id);
    unmarkSaving(id);
    if (error) console.error("Update error:", error);
  };

  const reorderStories = async (reordered) => {
    setStories(reordered);
    await Promise.all(
      reordered.map((s, i) =>
        supabase.from("stories").update({ sort_order: i }).eq("id", s.id)
      )
    );
  };

  const dragHandlers = useDragList(stories, reorderStories);

  const total = stories.length;
  const done  = stories.filter(s => s.posted).length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  const d = new Date(year, month, day);
  const fullDate = `${DAYS_FULL[d.getDay()]}, ${MONTHS[month]} ${day}`;

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "inherit", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #ebebeb", padding: "0 28px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "center", gap: 16, height: 68 }}>
          <button
            onClick={onBack}
            style={{
              background: "none", border: "1.5px solid #e0e0e0", borderRadius: 10,
              padding: "6px 14px", cursor: "pointer", fontFamily: "inherit",
              fontSize: 13, fontWeight: 600, color: "#000", letterSpacing: "0.02em",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#000"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#e0e0e0"}
          >
            ← Back
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.3px" }}>{fullDate}</div>
          </div>
          <div style={{ fontSize: 11, opacity: 0.35, fontWeight: 600 }}>
            {username}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 28px" }}>

        {/* Progress */}
        <div style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 16, padding: "20px 24px", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.4 }}>
              Progress
            </span>
            <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px" }}>
              {total === 0 ? "—" : `${pct}%`}
            </span>
          </div>
          <ProgressBar value={pct} />
          {total > 0 && (
            <div style={{ fontSize: 12, opacity: 0.4, marginTop: 8 }}>
              {done} of {total} {total === 1 ? "story" : "stories"} posted
            </div>
          )}
        </div>

        {/* Loading */}
        {loading ? (
          <div style={{ textAlign: "center", opacity: 0.3, fontSize: 13, padding: "40px 0" }}>
            Loading stories…
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {stories.map((story, i) => (
                <StoryItem
                  key={story.id}
                  story={story}
                  index={i}
                  saving={savingIds.has(story.id)}
                  onTogglePosted={(val) => updateStory(story.id, { posted: val })}
                  onChangeText={(val) => updateStory(story.id, { text: val })}
                  onChangeCategory={(val) => updateStory(story.id, { category: val })}
                  onDelete={() => deleteStory(story.id)}
                  dragHandlers={dragHandlers}
                />
              ))}
            </div>

            <button
              onClick={addStory}
              style={{
                width: "100%", padding: "15px", border: "1.5px dashed #ccc",
                borderRadius: 14, background: "transparent", cursor: "pointer",
                fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                letterSpacing: "0.05em", color: "#aaa", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#000"; e.currentTarget.style.color = "#000"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#ccc"; e.currentTarget.style.color = "#aaa"; }}
            >
              + Add Story
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

// ─── MonthView ────────────────────────────────────────────────────────────────

function MonthView({ year, month, username, storiesMap, onSelectDay, onPrevMonth, onNextMonth }) {
  const today = new Date();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay    = getFirstDayOfMonth(year, month);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (d) =>
    d && today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "inherit" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #ebebeb", padding: "0 28px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", height: 72, gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.35 }}>
              SSCalendar
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", marginTop: 1 }}>
              {MONTHS[month]} {year}
            </div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.35, letterSpacing: "0.02em" }}>
            {username}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <NavBtn onClick={onPrevMonth}>←</NavBtn>
            <NavBtn onClick={onNextMonth}>→</NavBtn>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 28px 0" }}>
        {/* Weekday labels */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10, marginBottom: 8 }}>
          {DAYS.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.3, paddingBottom: 6 }}>
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10, paddingBottom: 40 }}>
          {cells.map((d, i) =>
            d ? (
              <DayCard
                key={i}
                day={d}
                dayOfWeek={DAYS[new Date(year, month, d).getDay()]}
                stories={storiesMap[makeDayKey(year, month, d)] || []}
                isToday={isToday(d)}
                onClick={() => onSelectDay(d)}
              />
            ) : <div key={i} />
          )}
        </div>
      </div>
    </div>
  );
}

function NavBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 38, height: 38, borderRadius: 10, border: "1.5px solid #e0e0e0",
        background: "#fff", cursor: "pointer", fontSize: 16,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "inherit", color: "#000", transition: "all 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "#000"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#000"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#000"; e.currentTarget.style.borderColor = "#e0e0e0"; }}
    >
      {children}
    </button>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const now = new Date();
  const [username, setUsername] = useState(() => localStorage.getItem(USERNAME_KEY) || "");
  const [year, setYear]         = useState(now.getFullYear());
  const [month, setMonth]       = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);

  // storiesMap: { "2026-04-24": [...stories] }
  const [storiesMap, setStoriesMap] = useState({});

  // ── Load full month data for overview progress ──
  useEffect(() => {
    const start = makeDayKey(year, month, 1);
    const end   = makeDayKey(year, month, getDaysInMonth(year, month));

    supabase
      .from("stories")
      .select("id, day_key, posted, text, category")
      .gte("day_key", start)
      .lte("day_key", end)
      .then(({ data }) => {
        if (!data) return;
        const map = {};
        data.forEach(s => {
          if (!map[s.day_key]) map[s.day_key] = [];
          map[s.day_key].push(s);
        });
        setStoriesMap(map);
      });
  }, [year, month]);

  // ── Real-time for the whole month (progress updates) ──
  useEffect(() => {
    const start = makeDayKey(year, month, 1);
    const end   = makeDayKey(year, month, getDaysInMonth(year, month));

    const channel = supabase
      .channel(`month-${year}-${month}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stories" },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;

          const affectedKey = newRow?.day_key || oldRow?.day_key;
          if (!affectedKey || affectedKey < start || affectedKey > end) return;

          setStoriesMap(prev => {
            const dayStories = prev[affectedKey] ? [...prev[affectedKey]] : [];
            let updated;
            if (eventType === "INSERT") {
              if (dayStories.find(s => s.id === newRow.id)) return prev;
              updated = [...dayStories, newRow];
            } else if (eventType === "UPDATE") {
              updated = dayStories.map(s => s.id === newRow.id ? { ...s, ...newRow } : s);
            } else if (eventType === "DELETE") {
              updated = dayStories.filter(s => s.id !== oldRow.id);
            } else {
              return prev;
            }
            return { ...prev, [affectedKey]: updated };
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [year, month]);

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  if (!username) return <NameGate onConfirm={setUsername} />;

  if (selectedDay) {
    return (
      <DayView
        year={year}
        month={month}
        day={selectedDay}
        username={username}
        onBack={() => setSelectedDay(null)}
      />
    );
  }

  return (
    <MonthView
      year={year}
      month={month}
      username={username}
      storiesMap={storiesMap}
      onSelectDay={setSelectedDay}
      onPrevMonth={prevMonth}
      onNextMonth={nextMonth}
    />
  );
}
