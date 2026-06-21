// Injects per-form custom CSS, scoped to the form root so it can never
// break the surrounding page (builder chrome, embed host) or run scripts.
//
// Available hooks on the rendered form:
//   #amrl-form-root      — the outermost container (use `:scope { ... }` to style it)
//   [data-form-card]     — the white form card
//   [data-form-header]   — title + description block
//   [data-form-title]    — the form title (h1)
//   [data-form-body]     — the fields container
//   [data-field]         — each field wrapper
//   [data-form-submit]   — the submit button

export const FORM_ROOT_ID = "amrl-form-root"

/** Strip anything that could close the <style> tag or open a script. */
function sanitizeCss(css: string): string {
  return css.replace(/<\s*\/?\s*(style|script)/gi, "")
}

export function FormStyle({ css }: { css?: string | null }) {
  if (!css || !css.trim()) return null
  // @scope keeps every selector confined to the form root — bare `body`/`:root`
  // rules simply don't match, so the host page stays untouched.
  const scoped = `@scope (#${FORM_ROOT_ID}) {\n${sanitizeCss(css)}\n}`
  return <style dangerouslySetInnerHTML={{ __html: scoped }} />
}
