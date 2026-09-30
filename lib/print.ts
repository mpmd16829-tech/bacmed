import type { Locale } from './i18n'

export function printDocument(title: string, body: string, locale: Locale) {
  const win = window.open('', '_blank', 'noopener,noreferrer')
  if (!win) return
  win.document.write(`<!doctype html><html lang="${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial,sans-serif;max-width:850px;margin:40px auto;padding:0 24px;color:#123c4a;line-height:1.7}h1,h2{font-family:Georgia,serif}section{margin:28px 0;padding-bottom:18px;border-bottom:1px solid #dce5e5}.note{background:#edf7f2;padding:16px;border-radius:10px}li{margin:8px 0}@media print{button{display:none}body{margin:0}}</style></head><body>${body}<script>window.onload=()=>window.print()</script></body></html>`)
  win.document.close()
}
