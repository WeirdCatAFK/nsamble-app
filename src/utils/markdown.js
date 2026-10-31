import { marked } from "marked";

marked.setOptions({ breaks: true, gfm: true });
marked.use({
  renderer: {
    html: ({ text }) => escapeHtml(text),
    link: (token) => (isSafeUrl(token.href) ? false : escapeHtml(token.text)),
    image: (token) => (isSafeUrl(token.href) ? false : escapeHtml(token.text)),
  },
});

function isSafeUrl(href) {
  // eslint-disable-next-line no-control-regex -- strip ASCII controls: browsers ignore them in URL schemes
  const value = String(href ?? "").replace(/[\u0000-\u0020]+/g, "");
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return true;
  return /^(https?|mailto):/i.test(value);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderMarkdown(text) {
  return { __html: marked.parse(text || "") };
}
