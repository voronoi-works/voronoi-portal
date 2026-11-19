'use client';
import { useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { dates, islandAt } from './island';
import { residentsAt, islandScene } from './residents';

type Tool = { name: string; title: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute: (input: unknown) => unknown };
type Context = { registerTool: (tool: Tool, options: { signal: AbortSignal }) => void | Promise<void> };

/** Optional browser-native navigation API; the site works without WebMCP. */
export function useIslandTools(day: number, setDay: (day: number) => void, setView: (view: string) => void) {
  const current = useRef(day);
  useEffect(() => { current.current = day; }, [day]);
  useEffect(() => {
    const context = (document as Document & { modelContext?: Context }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: Tool) => {
      try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Optional, unsupported implementation. */ }
    };
    register({ name: 'read_island_state', title: '表示中の島を読む', description: 'Read the displayed date, area status and selected publication records. No state change.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute(input) {
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw new Error('Expected an empty object.');
      return { activitySource: 'selected-publications', residentsAreIllustrative: true, ...islandAt(dates[current.current]), residents: residentsAt(dates[current.current]), scene: islandScene };
    } });
    register({ name: 'navigate_island_date', title: '島の日付を移動', description: 'Navigate the visible island to a supported snapshot date. Changes the displayed date and opens the island view; does not edit history.', inputSchema: { type: 'object', properties: { date: { type: 'string', enum: dates } }, required: ['date'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute(input) {
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => key !== 'date')) throw new Error('Expected only date.');
      const date = (input as { date?: unknown }).date;
      if (typeof date !== 'string' || !dates.includes(date)) throw new Error('Date is outside this island history.');
      const next = dates.indexOf(date);
      flushSync(() => { setDay(next); setView('island'); });
      current.current = next;
      return { activitySource: 'selected-publications', residentsAreIllustrative: true, ...islandAt(date), residents: residentsAt(date), scene: islandScene };
    } });
    return () => lifecycle.abort();
  }, [setDay, setView]);
}

