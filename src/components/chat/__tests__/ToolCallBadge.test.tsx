import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getToolLabel, ToolCallBadge } from "../ToolCallBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

// --- getToolLabel: str_replace_editor ---

test("str_replace_editor create running", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "/App.tsx" }, "call")).toBe("Creating App.tsx");
});

test("str_replace_editor create result", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "/App.tsx" }, "result")).toBe("Created App.tsx");
});

test("str_replace_editor str_replace running", () => {
  expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "/styles.css" }, "call")).toBe("Editing styles.css");
});

test("str_replace_editor str_replace result", () => {
  expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "/styles.css" }, "result")).toBe("Edited styles.css");
});

test("str_replace_editor insert running", () => {
  expect(getToolLabel("str_replace_editor", { command: "insert", path: "/index.ts" }, "call")).toBe("Editing index.ts");
});

test("str_replace_editor insert result", () => {
  expect(getToolLabel("str_replace_editor", { command: "insert", path: "/index.ts" }, "result")).toBe("Edited index.ts");
});

test("str_replace_editor view running", () => {
  expect(getToolLabel("str_replace_editor", { command: "view", path: "/config.json" }, "call")).toBe("Reading config.json");
});

test("str_replace_editor view result", () => {
  expect(getToolLabel("str_replace_editor", { command: "view", path: "/config.json" }, "result")).toBe("Read config.json");
});

test("str_replace_editor undo_edit running", () => {
  expect(getToolLabel("str_replace_editor", { command: "undo_edit", path: "/main.tsx" }, "call")).toBe("Undoing edit on main.tsx");
});

test("str_replace_editor undo_edit result", () => {
  expect(getToolLabel("str_replace_editor", { command: "undo_edit", path: "/main.tsx" }, "result")).toBe("Undid edit on main.tsx");
});

// --- getToolLabel: file_manager ---

test("file_manager delete running", () => {
  expect(getToolLabel("file_manager", { command: "delete", path: "/utils.ts" }, "call")).toBe("Deleting utils.ts");
});

test("file_manager delete result", () => {
  expect(getToolLabel("file_manager", { command: "delete", path: "/utils.ts" }, "result")).toBe("Deleted utils.ts");
});

test("file_manager rename running", () => {
  expect(getToolLabel("file_manager", { command: "rename", path: "/old.ts", new_path: "/new.ts" }, "call")).toBe("Renaming old.ts to new.ts");
});

test("file_manager rename result", () => {
  expect(getToolLabel("file_manager", { command: "rename", path: "/old.ts", new_path: "/new.ts" }, "result")).toBe("Renamed old.ts to new.ts");
});

// --- getToolLabel: basename extraction ---

test("extracts filename from deep Unix path", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "/src/components/Button.tsx" }, "result")).toBe("Created Button.tsx");
});

test("extracts filename from nested path without leading slash", () => {
  expect(getToolLabel("str_replace_editor", { command: "view", path: "src/app/page.tsx" }, "result")).toBe("Read page.tsx");
});

test("handles filename-only path", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "index.ts" }, "result")).toBe("Created index.ts");
});

test("extracts filename from Windows-style backslash path", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "src\\components\\Card.tsx" }, "result")).toBe("Created Card.tsx");
});

// --- getToolLabel: edge cases ---

test("unknown toolName returns raw toolName", () => {
  expect(getToolLabel("unknown_tool", { command: "create", path: "/App.tsx" }, "result")).toBe("unknown_tool");
});

test("known toolName with unknown command falls back to toolName", () => {
  expect(getToolLabel("str_replace_editor", { command: "unknown_cmd", path: "/App.tsx" }, "result")).toBe("str_replace_editor");
});

test("missing args.path does not crash", () => {
  expect(() => getToolLabel("str_replace_editor", { command: "create" }, "call")).not.toThrow();
});

test("file_manager rename with missing new_path does not crash", () => {
  expect(() => getToolLabel("file_manager", { command: "rename", path: "/foo.ts" }, "call")).not.toThrow();
});

test("non-result state shows in-progress label", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "/App.tsx" }, "partial-call")).toBe("Creating App.tsx");
});

// --- ToolCallBadge rendering ---

function makeInvocation(overrides: Partial<ToolInvocation> = {}): ToolInvocation {
  return {
    toolCallId: "test-id",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/App.tsx" },
    state: "call",
    ...overrides,
  } as ToolInvocation;
}

test("shows spinner when state is running", () => {
  const { container } = render(<ToolCallBadge toolInvocation={makeInvocation({ state: "call" })} />);
  expect(container.querySelector(".animate-spin")).toBeTruthy();
});

test("shows green dot when state is result", () => {
  const { container } = render(
    <ToolCallBadge toolInvocation={makeInvocation({ state: "result", result: "ok" } as Partial<ToolInvocation>)} />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeTruthy();
});

test("displays human-readable label, not raw tool name", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation({ state: "call" })} />);
  expect(screen.getByText("Creating App.tsx")).toBeDefined();
  expect(screen.queryByText("str_replace_editor")).toBeNull();
});

test("displays done label when state is result", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation({ state: "result", result: "ok" } as Partial<ToolInvocation>)} />);
  expect(screen.getByText("Created App.tsx")).toBeDefined();
});

test("does not crash when args is empty", () => {
  expect(() =>
    render(<ToolCallBadge toolInvocation={makeInvocation({ args: {} })} />)
  ).not.toThrow();
});

test("outer container has expected classes", () => {
  const { container } = render(<ToolCallBadge toolInvocation={makeInvocation()} />);
  const el = container.firstChild as HTMLElement;
  expect(el.className).toContain("bg-neutral-50");
  expect(el.className).toContain("rounded-lg");
  expect(el.className).toContain("font-mono");
});
