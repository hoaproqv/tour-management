import React from "react";

import { MenuOutlined } from "@ant-design/icons";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { RoundItem } from "../../../api/trips";

export interface RowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  "data-row-key": string;
}

export const RoundContext = React.createContext<RoundItem[]>([]);

export const SortableRow = ({ children, ...props }: RowProps) => {
  const isPlaceholder =
    props.className?.includes("ant-table-placeholder") ||
    !props["data-row-key"];

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props["data-row-key"] || "empty",
  });

  const localRounds = React.useContext(RoundContext);
  const rowId = props["data-row-key"];
  const isFirstRound =
    localRounds.find((r) => String(r.id) === String(rowId))?.sequence === 1;

  if (isPlaceholder) {
    return <tr {...props}>{children}</tr>;
  }

  const style: React.CSSProperties = {
    ...props.style,
    transform: CSS.Transform.toString(transform && { ...transform, scaleY: 1 }),
    transition,
    ...(isDragging
      ? { position: "relative", zIndex: 9999, background: "#fafafa" }
      : {}),
  };

  return (
    <tr {...props} ref={setNodeRef} style={style} {...attributes}>
      {React.Children.map(children, (child) => {
        if ((child as React.ReactElement).key === "drag-handle") {
          const isPlanned =
            localRounds.find((r) => String(r.id) === String(rowId))?.status ===
            "planned";
          return React.cloneElement(child as React.ReactElement<any>, {
            children:
              isFirstRound || !isPlanned ? (
                <MenuOutlined
                  style={{
                    touchAction: "none",
                    cursor: "not-allowed",
                    color: "#cbd5e1",
                  }}
                />
              ) : (
                <MenuOutlined
                  style={{ touchAction: "none", cursor: "grab", color: "#999" }}
                  {...listeners}
                />
              ),
          });
        }
        return child;
      })}
    </tr>
  );
};
