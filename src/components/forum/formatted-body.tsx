import type { ReactNode } from "react";
import { parseBBCode, type BBNode } from "@/lib/forum/bbcode";

// Pinta el AST de BBCode como nodos de React. El texto siempre pasa por React
// (que lo escapa), y los estilos vienen de la lista blanca del parser: no hay
// forma de inyectar HTML ni CSS arbitrario desde un mensaje.
function renderNodes(nodes: BBNode[]): ReactNode[] {
  return nodes.map((node, i) => {
    if (typeof node === "string") return <span key={i}>{node}</span>;
    return (
      <span key={i} style={node.style ?? undefined}>
        {renderNodes(node.children)}
      </span>
    );
  });
}

export function FormattedBody({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <div className={`whitespace-pre-wrap break-words ${className ?? ""}`}>
      {renderNodes(parseBBCode(text))}
    </div>
  );
}
