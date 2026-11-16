/**
 * static/syntax.ts
 * Layer 1 Static Check: Syntax
 * Parses ORIGINAL and PATCHED file with the TypeScript compiler API.
 * FAILED if the patched file has syntax errors the original did not have.
 * SKIPPED for unsupported file types.
 */

import ts from "typescript";

const SUPPORTED_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);

export type StaticCheckStatus = "PASSED" | "FAILED" | "WARNING" | "SKIPPED";

export interface StaticCheckResult {
  name: string;
  status: StaticCheckStatus;
  note: string;
  details: string[];
}

function getScriptKind(ext: string): ts.ScriptKind {
  switch (ext) {
    case ".ts": return ts.ScriptKind.TS;
    case ".tsx": return ts.ScriptKind.TSX;
    case ".jsx": return ts.ScriptKind.JSX;
    case ".mjs": return ts.ScriptKind.Deferred;
    case ".cjs": return ts.ScriptKind.Deferred;
    default: return ts.ScriptKind.JS;
  }
}

function getSyntaxDiagnostics(
  content: string,
  fileName: string,
  scriptKind: ts.ScriptKind
): readonly ts.Diagnostic[] {
  try {
    const sourceFile = ts.createSourceFile(
      fileName,
      content,
      ts.ScriptTarget.Latest,
      true,
      scriptKind,
    );
    // Use the internal diagnostics from the source file if present
    const diags = (sourceFile as any).parseDiagnostics as readonly ts.Diagnostic[] | undefined;
    if (Array.isArray(diags)) return diags;

    // Fallback: use createProgram for a single file
    const dummyHost: ts.CompilerHost = {
      getSourceFile: (name) =>
        name === fileName ? ts.createSourceFile(name, content, ts.ScriptTarget.Latest, true, scriptKind) : undefined,
      writeFile: () => {},
      getDefaultLibFileName: () => "lib.d.ts",
      useCaseSensitiveFileNames: () => false,
      getCanonicalFileName: (n) => n,
      getCurrentDirectory: () => "/",
      getNewLine: () => "\n",
      fileExists: (n) => n === fileName,
      readFile: (n) => (n === fileName ? content : undefined),
    };
    const program = ts.createProgram([fileName], { noEmit: true, allowJs: true, checkJs: false }, dummyHost);
    return program.getSyntacticDiagnostics(program.getSourceFile(fileName));
  } catch {
    return [];
  }
}

export function checkSyntax(options: {
  filePath: string;
  originalContent: string;
  patchedContent: string;
}): StaticCheckResult {
  const { filePath, originalContent, patchedContent } = options;

  const lastDot = filePath.lastIndexOf(".");
  const ext = lastDot >= 0 ? filePath.slice(lastDot).toLowerCase() : "";

  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    return {
      name: "syntax",
      status: "SKIPPED",
      note: "File type not supported for syntax check",
      details: [],
    };
  }

  const scriptKind = getScriptKind(ext);
  const originalDiags = getSyntaxDiagnostics(originalContent, `original${ext}`, scriptKind);
  const patchedDiags = getSyntaxDiagnostics(patchedContent, `patched${ext}`, scriptKind);

  // Only fail if patched has NEW errors that original didn't
  if (patchedDiags.length > originalDiags.length) {
    const details = patchedDiags
      .slice(0, 5)
      .map((d) => {
        const msg = typeof d.messageText === "string" ? d.messageText : (d.messageText as any).messageText || "Syntax error";
        const pos = d.start ?? 0;
        const lineChar = d.file
          ? ts.getLineAndCharacterOfPosition(d.file, pos)
          : { line: 0, character: 0 };
        return `Line ${lineChar.line + 1}: ${msg}`;
      });

    return {
      name: "syntax",
      status: "FAILED",
      note: "Patched file has syntax errors",
      details: details.slice(0, 5),
    };
  }

  return {
    name: "syntax",
    status: "PASSED",
    note: "No new syntax errors",
    details: [],
  };
}
