"use client";

import { ToolInvocation } from "ai";
import { Loader2 } from "lucide-react";

function basename(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
}

export function getToolLabel(
  toolName: string,
  args: Record<string, unknown>,
  state: string
): string {
  const isDone = state === "result";
  const filename = typeof args.path === "string" ? basename(args.path) : "";

  if (toolName === "str_replace_editor") {
    switch (args.command) {
      case "create":
        return isDone ? `Created ${filename}` : `Creating ${filename}`;
      case "str_replace":
      case "insert":
        return isDone ? `Edited ${filename}` : `Editing ${filename}`;
      case "view":
        return isDone ? `Read ${filename}` : `Reading ${filename}`;
      case "undo_edit":
        return isDone ? `Undid edit on ${filename}` : `Undoing edit on ${filename}`;
      default:
        return toolName;
    }
  }

  if (toolName === "file_manager") {
    switch (args.command) {
      case "delete":
        return isDone ? `Deleted ${filename}` : `Deleting ${filename}`;
      case "rename": {
        const newFilename =
          typeof args.new_path === "string" ? basename(args.new_path) : "";
        return isDone
          ? `Renamed ${filename} to ${newFilename}`
          : `Renaming ${filename} to ${newFilename}`;
      }
      default:
        return toolName;
    }
  }

  return toolName;
}

interface ToolCallBadgeProps {
  toolInvocation: ToolInvocation;
}

export function ToolCallBadge({ toolInvocation }: ToolCallBadgeProps) {
  const { toolName, args, state } = toolInvocation;
  const label = getToolLabel(toolName, args as Record<string, unknown>, state);
  const isDone = state === "result";

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-neutral-700">{label}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-700">{label}</span>
        </>
      )}
    </div>
  );
}
