type Handler = (...args: any[]) => void;

class EventBus {
  private handlers: Map<string, Set<Handler>> = new Map();

  on(evt: string, h: Handler) {
    const s = this.handlers.get(evt) ?? new Set();
    s.add(h);
    this.handlers.set(evt, s);
    // debug:
    try { console.debug("[eventBus] on", evt, "-> handlers:", s.size); } catch {}
    return () => this.off(evt, h);
  }

  off(evt: string, h?: Handler) {
    if (!h) {
      const removed = this.handlers.delete(evt);
      try { console.debug("[eventBus] off (all)", evt, "removed:", removed); } catch {}
      return;
    }
    const s = this.handlers.get(evt);
    if (!s) return;
    s.delete(h);
    try { console.debug("[eventBus] off (one)", evt, "remaining:", s.size); } catch {}
    if (s.size === 0) this.handlers.delete(evt);
  }

  emit(evt: string, ...args: any[]) {
    const s = this.handlers.get(evt);
    try { console.debug("[eventBus] emit", evt, "args:", args, "handlers:", s?.size ?? 0); } catch {}
    if (!s) return false;
    for (const h of Array.from(s)) {
      try { h(...args); } catch (e) { console.error("[eventBus] handler error for", evt, e); }
    }
    return true;
  }

  // helper for debugging in console
  _debug_listeners(evt?: string) {
    if (evt) {
      const s = this.handlers.get(evt);
      return { event: evt, count: s?.size ?? 0, handlers: s ? Array.from(s) : [] };
    }
    const map: Record<string, number> = {};
    for (const [k, v] of this.handlers.entries()) map[k] = v.size;
    return map;
  }
}

// ensure a single instance across HMR / module reloads / duplicate imports
const GLOBAL_KEY = "__zecrete_eventBus_v1";
const _global = (typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : {}) ) as any;
if (!_global[GLOBAL_KEY]) _global[GLOBAL_KEY] = new EventBus();

export const eventBus: EventBus = _global[GLOBAL_KEY];
export default eventBus;
