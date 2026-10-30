import katex from "katex";

const MATH_PATTERN = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/g;

function renderMath(expression: string, displayMode: boolean): string {
  const source = expression
    .replace(/^\$\$|\$\$$/g, "")
    .replace(/^\$|\$$/g, "")
    .replace(/^\\\(|\\\)$/g, "")
    .replace(/^\\\[|\\\]$/g, "")
    .trim();
  if (!source) return "";
  try {
    return katex.renderToString(source, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: false,
      output: "html",
    });
  } catch {
    return "";
  }
}

/**
 * Renders inline/display LaTeX inside otherwise plain text. Non-math text is
 * kept as React children so it is escaped normally; KaTeX output is generated
 * in strict mode with HTML trust disabled.
 */
export function MathText({
  text,
  className,
}: {
  text: string | null | undefined;
  className?: string;
}) {
  if (!text) return null;
  const segments = text.split(MATH_PATTERN);
  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (!segment) return null;
        const display = segment.startsWith("$$") || segment.startsWith("\\[");
        if (display) {
          const html = renderMath(segment, true);
          return html ? (
            <span
              key={`math-${index}`}
              className="block overflow-x-auto py-1"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <span key={`math-${index}`}>{segment}</span>
          );
        }
        if (
          segment.startsWith("$") ||
          segment.startsWith("\\(") ||
          segment.startsWith("\\[")
        ) {
          const html = renderMath(segment, false);
          return html ? (
            <span
              key={`math-${index}`}
              className="inline-block align-middle"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <span key={`math-${index}`}>{segment}</span>
          );
        }
        return <span key={`text-${index}`}>{segment}</span>;
      })}
    </span>
  );
}
