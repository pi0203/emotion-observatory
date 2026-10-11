import { readFileSync } from "node:fs";
import ts from "typescript";

export type HangulLiteral = { file: string; line: number; kind: string; text: string };

const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힣]/;

/**
 * Every piece of Korean text written into the code itself: string and template
 * literals, JSX text and JSX attribute strings. Comments are trivia to the
 * TypeScript parser, so they are never visited and never counted.
 */
export const findHangulLiterals = (file: string): HangulLiteral[] => {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found: HangulLiteral[] = [];
  const visit = (node: ts.Node) => {
    // named here because TypeScript gives some of these kinds two names
    let text: string | undefined;
    let kind = "";
    if (ts.isStringLiteral(node)) [text, kind] = [node.text, "StringLiteral"];
    else if (ts.isNoSubstitutionTemplateLiteral(node)) [text, kind] = [node.text, "NoSubstitutionTemplateLiteral"];
    else if (ts.isTemplateHead(node)) [text, kind] = [node.text, "TemplateHead"];
    else if (ts.isTemplateMiddle(node)) [text, kind] = [node.text, "TemplateMiddle"];
    else if (ts.isTemplateTail(node)) [text, kind] = [node.text, "TemplateTail"];
    else if (ts.isJsxText(node)) [text, kind] = [node.text, "JsxText"];
    if (text !== undefined && HANGUL.test(text)) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
      found.push({ file, line: line + 1, kind, text: text.trim() });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
};
