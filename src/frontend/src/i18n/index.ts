import { IS_COMMUNITY_EDITION_BUILD } from '../edition';
import { writeLocal } from '../storage';

// 静态导入英文字典（IS_COMMUNITY_EDITION_BUILD = true 时默认语言为 en，字典始终需要）。
// 注意：原版使用 `await import('./en')` 动态导入，但 Vite 的 top-level await
// 预构建有时在开发模式下无法正确处理，导致浏览器请求 /src/i18n/en/*.ts 404。
// 改用静态 import 可消除该问题，且 ~250KB 源码的编译时开销可忽略不计。
import { EN_DICT } from './en';

/**
 * 轻量 i18n：中文原文作 key，英文字典翻译，缺失回退中文。
 * 语言偏好存 localStorage；切换语言整页 reload，保证模块级常量
 * （constants.ts 等在 import 时求值的 t() 调用）也按新语言重新求值。
 */
export type Lang = 'zh-CN' | 'en';

export const LANG_STORAGE_KEY = 'jx_lang';

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'en' || saved === 'zh-CN') return saved;
  } catch {
    // localStorage 不可用（隐私模式等）时回退默认语言
  }
  return IS_COMMUNITY_EDITION_BUILD || import.meta.env.VITE_DEFAULT_LANGUAGE === 'en'
    ? 'en'
    : 'zh-CN';
}

const currentLang: Lang = detectLang();

// Keep the document locale aligned with the language actually selected by the
// application. Desktop chrome and assistive technologies use this semantic
// value instead of guessing from the operating-system language.
if (typeof document !== 'undefined') {
  document.documentElement.lang = currentLang;
}

// 英文字典已通过静态 import 加载，不再需要按需懒加载。
const dict: Record<string, string> = currentLang === 'en' ? EN_DICT : {};

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang): void {
  if (lang === currentLang) return;
  try {
    writeLocal(LANG_STORAGE_KEY, lang);
  } catch {
    // 存不进去也照样切换本次会话
  }
  window.location.reload();
}

function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  let out = text;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

/**
 * 翻译函数。`vars` 用于占位插值：t('已选 {n} 项', { n: 3 })，
 * 字典 key 与中文原文均保留 `{n}` 字面占位。
 */
export function t(text: string, vars?: Record<string, string | number>): string {
  return interpolate(currentLang === 'en' ? (dict[text] ?? text) : text, vars);
}

/**
 * 带语境的翻译：同一中文在不同场景需要不同英文时使用
 * （如「关闭」在按钮上是 Close、在开关态上是 Off）。
 * 中文模式原样返回；英文模式先查 `中文#ctx` 专用条目，miss 再走通用条目。
 */
export function tCtx(ctx: string, text: string, vars?: Record<string, string | number>): string {
  if (currentLang !== 'en') return interpolate(text, vars);
  return interpolate(dict[`${text}#${ctx}`] ?? dict[text] ?? text, vars);
}
