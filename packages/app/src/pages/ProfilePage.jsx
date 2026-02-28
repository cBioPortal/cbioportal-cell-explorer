import { useState } from "react";
import { Table, Tag, Button, Card, Space, Typography, Popconfirm } from "antd";
import { DeleteOutlined, ClearOutlined } from "@ant-design/icons";
import {
  getProfileHistory,
  removeProfileSession,
  clearProfileHistory,
} from "../utils/profileStorage";

const { Text, Title } = Typography;

const entryColumns = [
  { title: "#", dataIndex: "id", key: "id", width: 50 },
  { title: "Method", dataIndex: "method", key: "method", width: 120 },
  { title: "Key", dataIndex: "key", key: "key", ellipsis: true },
  {
    title: "Cache",
    dataIndex: "cacheHit",
    key: "cacheHit",
    width: 80,
    render: (hit) => <Tag color={hit ? "green" : "red"}>{hit ? "HIT" : "MISS"}</Tag>,
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

export default function ProfilePage() {
  const [history, setHistory] = useState(() => getProfileHistory());

  const handleRemove = (index) => {
    removeProfileSession(index);
    setHistory(getProfileHistory());
  };

  const handleClearAll = () => {
    clearProfileHistory();
    setHistory([]);
  };

  const sessionColumns = [
    {
      title: "URL",
      dataIndex: "url",
      key: "url",
      ellipsis: true,
      render: (url) => <Text style={{ maxWidth: 200 }} ellipsis={{ tooltip: url }}>{url}</Text>,
    },
    {
      title: "Date",
      dataIndex: "timestamp",
      key: "timestamp",
      width: 180,
      render: (ts) => new Date(ts).toLocaleString(),
      sorter: (a, b) => a.timestamp - b.timestamp,
      defaultSortOrder: "descend",
    },
    {
      title: "Shape",
      key: "shape",
      width: 140,
      render: (_, r) => `${r.nObs?.toLocaleString()} x ${r.nVar?.toLocaleString()}`,
    },
    {
      title: "Queries",
      key: "queries",
      width: 80,
      render: (_, r) => r.entries.length,
    },
    {
      title: "Total Time",
      key: "totalTime",
      width: 110,
      render: (_, r) => `${r.entries.reduce((s, e) => s + e.duration, 0).toFixed(1)} ms`,
      sorter: (a, b) =>
        a.entries.reduce((s, e) => s + e.duration, 0) -
        b.entries.reduce((s, e) => s + e.duration, 0),
    },
    {
      title: "Hit Rate",
      key: "hitRate",
      width: 90,
      render: (_, r) => {
        const hits = r.entries.filter((e) => e.cacheHit).length;
        return r.entries.length > 0 ? `${((hits / r.entries.length) * 100).toFixed(0)}%` : "-";
      },
    },
    {
      title: "",
      key: "actions",
      width: 50,
      render: (_, __, index) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleRemove(index)}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16, width: "100%", justifyContent: "space-between" }}>
        <Title level={4} style={{ margin: 0 }}>Profile History</Title>
        {history.length > 0 && (
          <Popconfirm title="Clear all profile history?" onConfirm={handleClearAll}>
            <Button icon={<ClearOutlined />} danger>Clear All</Button>
          </Popconfirm>
        )}
      </Space>
      {history.length === 0 ? (
        <Card>
          <Text type="secondary">No profile sessions saved yet. Use the profiler drawer to record and save sessions.</Text>
        </Card>
      ) : (
        <Table
          size="small"
          dataSource={history.map((s, i) => ({ ...s, key: i }))}
          columns={sessionColumns}
          pagination={false}
          expandable={{
            expandedRowRender: (record) => (
              <Table
                size="small"
                dataSource={record.entries}
                columns={entryColumns}
                rowKey="id"
                pagination={{ defaultPageSize: 25, showSizeChanger: true }}
              />
            ),
          }}
        />
      )}
    </div>
  );
}
