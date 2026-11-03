import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { ja } from "@/lib/i18n/dictionaries/ja";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogPortal, DialogTitle } from "./dialog";

// Render the real Close under its Root, with a plain container replacing Popup
// because Base UI's Popup requires a browser Portal. Check Popup/Portal props
// separately; this does not verify focus trapping, key dispatch or placement.
function contentMarkup(props: Parameters<typeof DialogContent>[0] = {}) {
  const popup = DialogContent({ children: <DialogTitle>Original title</DialogTitle>, ...props }).props.children[1];
  return renderToStaticMarkup(<Dialog open><div lang={popup.props.lang}>{popup.props.children}</div></Dialog>);
}

describe("shared Dialog localization", () => {
  it.each([
    [undefined, "Close", "en"], ["en", "Close", "en"], ["ja", "閉じる", "ja"],
  ] as const)("labels the icon and optional footer Close for locale %s", (locale, label, language) => {
    const html = contentMarkup({ locale });
    expect(html).toContain(`class="sr-only" lang="${language}">${label}</span>`);
    expect(html).toContain('data-slot="dialog-close"');
    expect(html).toContain("Original title");
    expect(html).not.toContain("locale=");
    const footer = renderToStaticMarkup(<Dialog open><DialogFooter showCloseButton locale={locale} /></Dialog>);
    expect(footer).toContain(`lang="${language}"`);
    expect(footer).toContain(`>${label}</button>`);
    expect(footer).not.toContain("locale=");
    if (locale) expect(html).toContain(`lang="${language}"`);
  });

  it("keeps Portal/Overlay/Popup placement and applies language to the Popup inside the Portal", () => {
    const content = DialogContent({ locale: "ja", lang: "en", children: "Caller content" });
    expect(content.type).toBe(DialogPortal);
    const [overlay, popup] = content.props.children;
    expect(overlay.props).toEqual({});
    expect(popup.type).toBe(DialogPrimitive.Popup);
    expect(popup.props.lang).toBe("ja");
    expect(popup.props.children[0]).toBe("Caller content");
    expect(DialogPortal({ children: content }).type).toBe(DialogPrimitive.Portal);
    expect(DialogContent({}).props.children[1].props.lang).toBeUndefined();
    expect(DialogContent({ lang: "fr" }).props.children[1].props.lang).toBe("fr");
  });

  it("retains caller props, refs, focus options, children and Close visibility", () => {
    const ref = { current: null };
    const onKeyDown = vi.fn();
    const popup = DialogContent({
      id: "legacy-dialog", className: "legacy-class", ref,
      initialFocus: false, finalFocus: ref, onKeyDown,
      "aria-describedby": "legacy-description", showCloseButton: false,
      children: <input defaultValue="Original draft" />,
    }).props.children[1];
    expect(popup.props).toMatchObject({
      id: "legacy-dialog", ref, initialFocus: false, finalFocus: ref, onKeyDown,
      "aria-describedby": "legacy-description",
    });
    expect(popup.props.className).toContain("legacy-class");
    expect(contentMarkup({ showCloseButton: false })).not.toContain('data-slot="dialog-close"');
    expect(renderToStaticMarkup(<DialogFooter>Original actions</DialogFooter>)).not.toContain("<button");
    expect(renderToStaticMarkup(<DialogFooter>Original actions</DialogFooter>)).toContain("Original actions");
  });

  it("retains the same layout and button variants in both languages", () => {
    const english = DialogContent({ locale: "en" }).props.children[1];
    const japanese = DialogContent({ locale: "ja" }).props.children[1];
    expect(japanese.props.className).toBe(english.props.className);
    for (const popup of [english, japanese]) {
      const close = popup.props.children[1];
      expect(close.type).toBe(DialogPrimitive.Close);
      expect(close.props.render.props).toEqual({ variant: "ghost", className: "absolute top-2 right-2", size: "icon-sm" });
    }
    const enFooter = DialogFooter({ showCloseButton: true, locale: "en" });
    const jaFooter = DialogFooter({ showCloseButton: true, locale: "ja" });
    expect(jaFooter.props.className).toBe(enFooter.props.className);
    expect(jaFooter.props.children[1].props.render.props.variant).toBe("outline");
  });

  it("keeps Root and Close event handling delegated to Base UI without interception", () => {
    const onOpenChange = vi.fn();
    const root = Dialog({ open: true, onOpenChange });
    expect(root.type).toBe(DialogPrimitive.Root);
    expect(root.props.onOpenChange).toBe(onOpenChange);
    expect(root.props.modal).toBeUndefined(); // Base UI's modal/focus defaults apply.
    expect(root.props.disablePointerDismissal).toBeUndefined();
    // Verify forwarding of Base UI's dismissal reports, not real key dispatch.
    for (const reason of ["escape-key", "close-press"]) {
      const details = { reason, event: new Event("test") };
      root.props.onOpenChange(false, details);
      expect(onOpenChange).toHaveBeenLastCalledWith(false, details);
    }
    const onClick = vi.fn();
    const close = DialogClose({ onClick, disabled: true, children: "Custom close" });
    expect(close.type).toBe(DialogPrimitive.Close);
    expect(close.props).toMatchObject({ onClick, disabled: true, children: "Custom close" });
  });

  it("uses English fallback when the Japanese Close entry is missing", () => {
    const partial: { -readonly [K in keyof Dictionary]?: string } = ja;
    const saved = partial["dialog.close"];
    try {
      delete partial["dialog.close"];
      expect(contentMarkup({ locale: "ja" })).toContain(">Close</span>");
      expect(renderToStaticMarkup(<Dialog open><DialogFooter locale="ja" showCloseButton /></Dialog>))
        .toContain(">Close</button>");
    } finally { partial["dialog.close"] = saved; }
  });
});
