import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { normalizeText } from "utils/weddingCatalog";

export default function CatalogSelect({ label, value, options, onChange }) {
  const id = useId();
  const root = useRef(null);
  const trigger = useRef(null);
  const typed = useRef("");
  const typingTimer = useRef(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [position, setPosition] = useState({ above: false, height: 300 });
  const selected = options.findIndex((option) => option.value === value);
  const show = () => { setHighlight(Math.max(0, selected)); setOpen(true); };
  const choose = (index) => { if (options[index]) onChange(options[index].value); setOpen(false); trigger.current?.focus(); };

  useEffect(() => {
    if (!open) return;
    const outside = (event) => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  useEffect(() => () => clearTimeout(typingTimer.current), []);
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const box = trigger.current.getBoundingClientRect();
      const filters = trigger.current.closest('.wc-filters');
      const boundary = filters && getComputedStyle(filters).overflowY === 'auto' ? filters.getBoundingClientRect() : null;
      const below = Math.min(window.innerHeight - 16, boundary ? boundary.bottom - 8 : Infinity) - box.bottom;
      const header = document.querySelector('.header__main')?.getBoundingClientRect();
      const above = box.top - Math.max(header && header.top <= 1 ? header.bottom + 12 : 16, boundary ? boundary.top + 8 : 0);
      const upwards = below < 240 && above > below;
      setPosition({ above: upwards, height: Math.max(120, Math.min(320, upwards ? above : below)) });
    };
    measure(); window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open]);
  useEffect(() => {
    if (open) document.getElementById(`${id}-option-${highlight}`)?.scrollIntoView({ block: "nearest" });
  }, [open, highlight, id]);

  const keyboard = (event) => {
    if (event.nativeEvent.isComposing) return;
    if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " ", "Escape"].includes(event.key)) {
      event.preventDefault();
      if (event.key === "Escape") { setOpen(false); return; }
      if (event.key === "Enter" || event.key === " ") { if (open) choose(highlight); else show(); return; }
      if (!open) { setOpen(true); setHighlight(event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : Math.max(0, selected)); return; }
      if (event.key === "Home") setHighlight(0);
      else if (event.key === "End") setHighlight(options.length - 1);
      else setHighlight((index) => (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
    } else if (event.key === "Tab") setOpen(false);
    else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault(); typed.current += event.key;
      clearTimeout(typingTimer.current); typingTimer.current = setTimeout(() => { typed.current = ""; }, 700);
      const match = options.findIndex((option) => normalizeText(option.label).startsWith(normalizeText(typed.current)));
      if (match >= 0) { setOpen(true); setHighlight(match); }
    }
  };

  return <div className="wc-field">
    <label htmlFor={`${id}-trigger`}>{label}</label>
    <div ref={root} className={`wc-select ${open ? "is-open" : ""}`} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <button ref={trigger} id={`${id}-trigger`} type="button" className="wc-select-trigger" role="combobox" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? `${id}-list` : undefined} aria-activedescendant={open ? `${id}-option-${highlight}` : undefined} onClick={() => open ? setOpen(false) : show()} onKeyDown={keyboard}>
        <span>{options[selected]?.label || options[0]?.label}</span>
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && <ul id={`${id}-list`} className={`wc-select-menu ${position.above ? "opens-above" : ""}`} style={{ maxHeight: position.height }} role="listbox" aria-label={label}>
        {options.map((option, index) => <li id={`${id}-option-${index}`} role="option" aria-selected={option.value === value} key={option.value} className={highlight === index ? "is-highlighted" : ""} onMouseEnter={() => setHighlight(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(index)}>
          <span>{option.label}</span>{option.value === value && <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>}
        </li>)}
      </ul>}
    </div>
  </div>;
}
