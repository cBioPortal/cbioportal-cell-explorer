import { Button } from "antd";

export type ChatThreadHeaderProps = {
  title: string | null;     // null = new mode
  onBack: () => void;
};

export function ChatThreadHeader({ title, onBack }: ChatThreadHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 8px",
        borderBottom: "1px solid #f0f0f0",
      }}
    >
      <Button
        type="text"
        size="small"
        onClick={onBack}
        aria-label="back to conversations"
      >
        ←
      </Button>
      <span
        style={{
          fontWeight: 500,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
          color: title ? "#333" : "#999",
        }}
      >
        {title ?? "New chat"}
      </span>
    </div>
  );
}
