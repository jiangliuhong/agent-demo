"use client";

import { useState } from "react";
import {
  Alert,
  Badge,
  Card,
  Empty,
  Flex,
  Layout,
  Menu,
  Space,
  Tabs,
  Tag,
  Typography,
} from "antd";
import type { MenuProps, TabsProps } from "antd";

const { Sider, Content } = Layout;
const { Paragraph, Text, Title } = Typography;

type MenuLeafKey =
  | "database-management"
  | "knowledge-base-management"
  | "model-configuration";

type TabItem = NonNullable<TabsProps["items"]>[number];

type MenuDetail = {
  category: string;
  title: string;
  summary: string;
  status: string;
  highlights: string[];
  milestones: string[];
};

const menuDetails: Record<MenuLeafKey, MenuDetail> = {
  "database-management": {
    category: "资源管理",
    title: "数据库管理",
    summary:
      "统一维护数据库资源、连接状态与接入信息，作为后续数据同步、查询编排和授权管理的基础入口。",
    status: "待接入真实数据",
    highlights: [
      "集中展示数据库实例、类型、环境和责任人。",
      "后续可扩展连接测试、权限查看和库表浏览能力。",
      "适合作为数据源注册与治理的主工作台。",
    ],
    milestones: [
      "第一版先提供结构化工作区和静态说明。",
      "下一步可接入接口列表、连接状态和数据源详情。",
      "完成后可继续衔接知识库构建和模型调用链路。",
    ],
  },
  "knowledge-base-management": {
    category: "资源管理",
    title: "知识库管理",
    summary:
      "围绕知识库的创建、同步、索引和发布流程进行统一管理，方便后续接入文档、切片和召回配置。",
    status: "待接入真实数据",
    highlights: [
      "适合承载知识库列表、文档数、更新时间和索引状态。",
      "后续可补充文档导入、同步记录和重建入口。",
      "可继续扩展召回策略、标签筛选和版本信息。",
    ],
    milestones: [
      "第一版先保留多标签浏览体验。",
      "下一步可接入知识库分页列表和详情面板。",
      "后续可延展到文档管理和问答效果追踪。",
    ],
  },
  "model-configuration": {
    category: "系统管理",
    title: "模型配置",
    summary:
      "集中维护模型供应商、基础参数和默认策略，为后续应用编排、调用测试和发布切换提供配置底座。",
    status: "待接入真实数据",
    highlights: [
      "可承载模型名称、版本、供应商、接口地址等核心信息。",
      "适合继续扩展温度、上下文长度和默认提示模板配置。",
      "后续可增加启停状态、优先级和连通性校验。",
    ],
    milestones: [
      "第一版先确认页面框架和操作路径。",
      "下一步可接入模型列表、编辑抽屉和校验提示。",
      "后续可延展到多模型路由和默认策略切换。",
    ],
  },
};

const menuItems: MenuProps["items"] = [
  {
    key: "resource-management",
    label: "资源管理",
    children: [
      { key: "database-management", label: "数据库管理" },
      { key: "knowledge-base-management", label: "知识库管理" },
    ],
  },
  {
    key: "system-management",
    label: "系统管理",
    children: [{ key: "model-configuration", label: "模型配置" }],
  },
];

function DetailBulletList({
  items,
  ordered = false,
}: {
  items: string[];
  ordered?: boolean;
}) {
  const ListTag = ordered ? "ol" : "ul";

  return (
    <ListTag className="m-0 space-y-3 pl-5">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="pl-1">
          <Text className="leading-7 text-slate-600">
            {ordered ? `${index + 1}. ${item}` : item}
          </Text>
        </li>
      ))}
    </ListTag>
  );
}

function buildTabItem(key: MenuLeafKey): TabItem {
  const detail = menuDetails[key];

  return {
    key,
    label: detail.title,
    closable: true,
    children: (
      <Flex vertical gap={16}>
        <Card className="border-0 shadow-sm" styles={{ body: { padding: 24 } }}>
          <Flex vertical gap={12}>
            <Space wrap size={[8, 8]}>
              <Tag color="blue">{detail.category}</Tag>
              <Badge status="processing" text={detail.status} />
            </Space>
            <div>
              <Title level={3} className="!mb-2">
                {detail.title}
              </Title>
              <Paragraph className="!mb-0 text-base leading-7 !text-slate-600">
                {detail.summary}
              </Paragraph>
            </div>
          </Flex>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card
            title="当前可承载内容"
            className="border-0 shadow-sm"
            styles={{ body: { padding: 20 } }}
          >
            <DetailBulletList items={detail.highlights} />
          </Card>

          <Card
            title="建设节奏"
            className="border-0 shadow-sm"
            styles={{ body: { padding: 20 } }}
          >
            <DetailBulletList items={detail.milestones} ordered />
          </Card>
        </div>

        <Alert
          type="info"
          showIcon
          title="第一版说明"
          description="当前页面先完成菜单工作台与多标签切换体验，后续可以在不改布局的前提下继续接入接口、表格和表单。"
        />
      </Flex>
    ),
  };
}

export default function Workbench() {
  const [collapsed, setCollapsed] = useState(false);
  const [tabs, setTabs] = useState<TabItem[]>([buildTabItem("database-management")]);
  const [activeKey, setActiveKey] = useState<string>("database-management");

  const openTab = (key: MenuLeafKey) => {
    const existed = tabs.some((tab) => tab?.key === key);

    if (!existed) {
      setTabs((currentTabs) => [...currentTabs, buildTabItem(key)]);
    }

    setActiveKey(key);
  };

  const removeTab = (targetKey: string) => {
    const targetIndex = tabs.findIndex((tab) => tab?.key === targetKey);
    const nextTabs = tabs.filter((tab) => tab?.key !== targetKey);

    setTabs(nextTabs);

    if (nextTabs.length === 0) {
      setActiveKey("");
      return;
    }

    if (activeKey !== targetKey) {
      return;
    }

    const fallbackTab = nextTabs[targetIndex - 1] ?? nextTabs[targetIndex]!;
    setActiveKey(String(fallbackTab.key));
  };

  return (
    <Layout className="min-h-screen bg-[radial-gradient(circle_at_top,_#eef6ff,_#f7f9fc_48%,_#f3f4f6_100%)]">
      <Sider
        width={264}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        className="border-r border-slate-200/70 bg-white/95"
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200/70 px-5 py-5">
            <Text className="block text-xs uppercase tracking-[0.24em] !text-slate-400">
              LC Demo
            </Text>
            {!collapsed ? (
              <Title level={4} className="!mb-0 !mt-2">
                控制台工作台
              </Title>
            ) : null}
          </div>

          <Menu
            mode="inline"
            items={menuItems}
            selectedKeys={activeKey ? [activeKey] : []}
            defaultOpenKeys={["resource-management", "system-management"]}
            onClick={({ key }) => openTab(key as MenuLeafKey)}
            className="flex-1 border-0 bg-transparent px-3 py-4"
          />
        </div>
      </Sider>

      <Layout className="min-h-screen bg-transparent">
        <Content className="flex min-h-screen flex-col p-5 md:p-6">
          <Card
            className="flex-1 border-0 bg-white/80 shadow-sm backdrop-blur"
            styles={{ body: { display: "flex", height: "100%", flexDirection: "column", padding: 20 } }}
          >
            {tabs.length > 0 ? (
              <Tabs
                className="h-full"
                hideAdd
                type="editable-card"
                items={tabs}
                activeKey={activeKey}
                onChange={setActiveKey}
                onEdit={(targetKey, action) => {
                  if (action === "remove" && typeof targetKey === "string") {
                    removeTab(targetKey);
                  }
                }}
                tabBarExtraContent={
                  <Text className="text-sm !text-slate-500">
                    已打开 {tabs.length} 个菜单
                  </Text>
                }
              />
            ) : (
              <Flex className="h-full min-h-[70vh]" align="center" justify="center">
                <Empty
                  description="从左侧菜单选择一个模块开始"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </Flex>
            )}
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
}
