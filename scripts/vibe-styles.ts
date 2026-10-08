import ts from 'typescript';
import type { Plugin } from 'vite';
/** Extract Vibe's injected component styles into a same-origin stylesheet for strict CSP. */
export function vibeStyles(): Plugin {
  const styles = new Map<string, string>();
  return {
    name: 'friday-vibe-csp-styles',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'link',
          attrs: { rel: 'stylesheet', href: '/assets/vibe-components.css' },
          injectTo: 'head-prepend',
        },
      ];
    },
    transform(code, id) {
      if (!id.includes('/node_modules/@vibe/') || !id.endsWith('.scss.js')) return;
      const ast = ts.createSourceFile(id, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
      let changed = code;
      for (const statement of [...ast.statements].reverse()) {
        if (
          !ts.isExpressionStatement(statement) ||
          !statement.getText(ast).includes('globalThis.injectedStyles')
        )
          continue;
        let css: string | undefined;
        const visit = (node: ts.Node) => {
          if (ts.isCallExpression(node))
            for (const argument of node.arguments)
              if (
                ts.isStringLiteral(argument) &&
                argument.text.includes('{') &&
                argument.text.includes('\n')
              )
                css = argument.text;
          ts.forEachChild(node, visit);
        };
        visit(statement);
        if (css) {
          styles.set(id, css);
          changed = changed.slice(0, statement.getStart(ast)) + changed.slice(statement.end);
        }
      }
      return changed === code ? undefined : { code: changed, map: null };
    },
    generateBundle() {
      if (!styles.size) throw new Error('VIBE_STYLES_NOT_EXTRACTED');
      this.emitFile({
        type: 'asset',
        fileName: 'assets/vibe-components.css',
        source: [...styles.values()].reverse().join('\n'),
      });
    },
  };
}
