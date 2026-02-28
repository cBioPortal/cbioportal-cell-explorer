import { useSyncExternalStore, useCallback } from "react";
import { Drawer, Table, Tag, Space, Button, Typography, message } from "antd";
import { DeleteOutlined, SaveOutlined } from "@ant-design/icons";
import useAppStore from "../../store/useAppStore";
import { saveProfileSession } from "../../utils/profileStorage";

const { Text } = Typography;

const columns = [
  {
    title: "#",
    dataIndex: "id",
    key: "id",
    width: 50,
  },
  {
    title: "Method",
    dataIndex: "method",
    key: "method",
    width: 120,
  },
  {
    title: "Key",
    dataIndex: "key",
    key: "key",
    ellipsis: true,
  },
  {
    title: "Cache",
    dataIndex: "cacheHit",
    key: "cacheHit",
    width: 80,
    render: (hit) => (
      <Tag color={hit ? "green" : "red"}>{hit ? "HIT" : "MISS"}</Tag>
    ),
  },
  {
    title: "Duration",
    dataIndex: "duration",
    key: "duration",
    width: 100,
    render: (ms) => `${ms.toFixed(1)} ms`,
    sorter: (a, b) => a.duration - b.duration,
  },
];

export default function ProfileDrawer({ open, onClose }) {
  const adata = useAppStore((s) => s.adata);
  const url = useAppStore((s) => s.url);
  const profiler = adata?.profiler;

  const subscribe = useCallback(
    (cb) => (profiler ? profiler.subscribe(cb) : () => {}),
    [profiler],
  );
  const getSnapshot = useCallback(
    () => (profiler ? profiler.entries : []),
    [profiler],
  );

  const entries = useSyncExternalStore(subscribe, getSnapshot);

  const totalTime = entries.reduce((sum, e) => sum + e.duration, 0);
  const cacheHits = entries.filter((e) => e.cacheHit).length;
  const hitRate = entries.length > 0 ? ((cacheHits / entries.length) * 100).toFixed(0) : 0;

  const handleClear = () => {
    profiler?.clear();
  };

  const handleSave = () => {
    if (!adata || entries.length === 0) return;
    saveProfileSession(url, adata.nObs, adata.nVar, profiler.toJSON());
    message.success("Profile session saved to history");
  };

  // Show most-recent-first
  const dataSource = [...entries].reverse();

  return (
    <Drawer
      title="Query Profiler"
      placement="right"
      width={600}
      open={open}
      onClose={onClose}
      mask={false}
    >
      <Space style={{ marginBottom: 16 }} wrap>
        <Text strong>Queries: {entries.length}</Text>
        <Text type="secondary">|</Text>
        <Text>Cache hit: {hitRate}%</Text>
        <Text type="secondary">|</Text>
        <Text>Total: {totalTime.toFixed(1)} ms</Text>
        <Button icon={<SaveOutlined />} size="small" onClick={handleSave} disabled={entries.length === 0}>
          Save to history
        </Button>
        <Button icon={<DeleteOutlined />} size="small" danger onClick={handleClear} disabled={entries.length === 0}>
          Clear
        </Button>
      </Space>
      <Table
        size="small"
        pagination={{ defaultPageSize: 50, showSizeChanger: true }}
        dataSource={dataSource}
        columns={columns}
        rowKey="id"
      />
    </Drawer>
  );
}
