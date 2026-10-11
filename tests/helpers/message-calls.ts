import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { ROOT } from "./source-files";

export type MessageCall = {
  where: string;
  /** The key, or for a template key like `a.${x}` its fixed prefix `a.`. */
  key: string;
  isPrefix: boolean;
  /** Parameter names when passed as an object literal; `undefined` when passed some other way. */
  params?: string[];
  /** `t.list(...)` rather than `t(...)`. */
  list: boolean;
};

const TRANSLATORS = new Set(["t", "ko"]);

/** `t(...)`, `ko(...)` and `getT(locale)(...)`: the ways the code asks for a message. */
const isTranslatorCall = (callee: ts.Expression) =>
  (ts.isIdentifier(callee) && TRANSLATORS.has(callee.text)) ||
  (ts.isCallExpression(callee) && ts.isIdentifier(callee.expression) && callee.expression.text === "getT");

/** `t.list(...)` and `getT(locale).list(...)`. */
const isListCall = (callee: ts.Expression) =>
  ts.isPropertyAccessExpression(callee) && callee.name.text === "list" && isTranslatorCall(callee.expression as ts.Expression);

const keyOf = (node: ts.Expression): { key: string; isPrefix: boolean } | undefined => {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return { key: node.text, isPrefix: false };
  if (ts.isTemplateExpression(node)) return { key: node.head.text, isPrefix: true };
  return undefined;
};

/** Finds every message request in a source file, by reading its syntax tree. */
export const findMessageCalls = (file: string): MessageCall[] => {
  const source = ts.createSourceFile(file, readFileSync(path.join(ROOT, file), "utf8"), ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const calls: MessageCall[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const list = isListCall(node.expression);
      if (list || isTranslatorCall(node.expression)) {
        const key = keyOf(node.arguments[0]);
        if (key) {
          const second = node.arguments[1];
          const params = second === undefined
            ? []
            : ts.isObjectLiteralExpression(second)
              ? second.properties.map((property) => (property.name && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) ? property.name.text : "?"))
              : undefined;
          const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
          calls.push({ where: `${file}:${line + 1}`, ...key, params, list });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return calls;
};
