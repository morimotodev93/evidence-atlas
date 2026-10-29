// Offline test adapter: execute the actual production Lua, mocking redis.call.
// No network sockets or Redis service. Fengari implements Lua 5.3; these scripts
// use the shared Lua 5.1 subset supported by Redis, not version-specific features.
import { createRequire } from "node:module";
import type { DemoChatEval } from "./chat-store";

const { lua, lauxlib, lualib, to_luastring, to_jsstring } = createRequire(import.meta.url)("fengari");
type Entry = { value: string | Map<string, string | number>; expires?: number };

export class OfflineRedis {
  now = Date.UTC(2026, 9, 27, 12);
  readonly entries = new Map<string, Entry>();
  calls: string[] = [];
  fail = false;
  beforeCommand?: (command: string, args: readonly string[]) => void;

  private command(command: string, ...args: string[]): unknown {
    this.calls.push(command);
    this.beforeCommand?.(command, args);
    for (const [key, entry] of this.entries) {
      if (entry.expires !== undefined && entry.expires <= this.now) this.entries.delete(key);
    }
    const [key, field, value] = args;
    const entry = this.entries.get(key);
    const map = () => {
      if (typeof entry?.value === "string") throw new Error("WRONGTYPE");
      if (entry) return entry.value as Map<string, string | number>;
      const result = new Map<string, string | number>();
      this.entries.set(key, { value: result });
      return result;
    };
    switch (command) {
      case "TIME": return [String(Math.floor(this.now / 1000)), String((this.now % 1000) * 1000)];
      case "EXISTS": return entry ? 1 : 0;
      case "GET": return entry?.value ?? false;
      case "PTTL": return entry ? entry.expires === undefined ? -1 : entry.expires - this.now : -2;
      case "SET":
        if (args.includes("NX") && entry) return false;
        this.entries.set(key, { value: field, expires: args.includes("EX") ? this.now + Number(args[args.indexOf("EX") + 1]) * 1000 : undefined });
        return "OK";
      case "INCR": {
        const next = Number(entry?.value ?? 0) + 1;
        this.entries.set(key, { ...entry, value: String(next) });
        return next;
      }
      case "HGET": case "ZSCORE": return entry ? map().get(field) ?? false : false;
      case "HSET": {
        const result = map();
        for (let i = 1; i < args.length; i += 2) result.set(args[i], args[i + 1]);
        return 1;
      }
      case "HLEN": return entry ? map().size : 0;
      case "HINCRBY": {
        const next = Number(map().get(field) ?? 0) + Number(value);
        map().set(field, next);
        return next;
      }
      case "ZCARD": return entry ? map().size : 0;
      case "ZADD": map().set(value, Number(field)); return 1;
      case "ZREM": return entry && map().delete(field) ? 1 : 0;
      case "ZREMRANGEBYSCORE": {
        if (!entry) return 0;
        let removed = 0;
        for (const [member, score] of map()) {
          if (Number(score) >= Number(field) && Number(score) <= Number(value)) {
            map().delete(member); removed++;
          }
        }
        return removed;
      }
      case "EXPIRE": case "PEXPIRE": case "PEXPIREAT":
        if (!entry) return 0;
        entry.expires = command === "PEXPIREAT" ? Number(field)
          : this.now + Number(field) * (command === "EXPIRE" ? 1000 : 1);
        return 1;
      default: throw new Error(`Unsupported mock Redis command: ${command}`);
    }
  }

  readonly eval: DemoChatEval = async (script, keys, args) => {
    if (this.fail) throw new Error("Synthetic Redis failure, never expose this detail");
    // Each EVAL executes synchronously and atomically, as Redis guarantees.
    // Promise.all callers from separate stores share this Redis state.
    const state = lauxlib.luaL_newstate();
    lualib.luaL_openlibs(state);
    const push = (value: unknown) => {
      if (Array.isArray(value)) {
        lua.lua_newtable(state);
        value.forEach((item, i) => { push(item); lua.lua_rawseti(state, -2, i + 1); });
      } else if (typeof value === "number") lua.lua_pushnumber(state, value);
      else if (typeof value === "string") lua.lua_pushstring(state, to_luastring(value));
      else lua.lua_pushboolean(state, false);
    };
    push(keys); lua.lua_setglobal(state, to_luastring("KEYS"));
    push(args.map(String)); lua.lua_setglobal(state, to_luastring("ARGV"));
    lua.lua_newtable(state);
    lua.lua_pushjsfunction(state, () => {
      try {
        const values = Array.from({ length: lua.lua_gettop(state) }, (_, i) => to_jsstring(lua.lua_tostring(state, i + 1)));
        push(this.command(values[0], ...values.slice(1)));
        return 1;
      } catch (error) {
        lua.lua_pushstring(state, to_luastring(String(error)));
        return lua.lua_error(state);
      }
    });
    lua.lua_setfield(state, -2, to_luastring("call"));
    lua.lua_setglobal(state, to_luastring("redis"));
    try {
      if (lauxlib.luaL_dostring(state, to_luastring(script)) !== lua.LUA_OK) {
        throw new Error(to_jsstring(lua.lua_tostring(state, -1)));
      }
      return lua.lua_tonumber(state, -1);
    } finally { lua.lua_close(state); }
  };
}
