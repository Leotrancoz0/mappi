'use client';

import {
  addEdge,
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Blocks,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleUserRound,
  FileText,
  Folder,
  GitBranch,
  LayoutDashboard,
  Link2,
  ListTodo,
  Map,
  MessageSquare,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users,
  Webhook,
  Workflow,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type DragEvent } from 'react';
import {
  advanceTask,
  canSendToReview,
  cloneTemplate,
  createTask,
  flowTemplates,
  sendTaskToReview,
  startTask,
  toggleChecklist,
  type DecisionOutcome,
  type DemoApp,
  type DemoTask,
  type FlowStep,
  type FlowConnection,
  type FlowSnapshot,
  type StepKind,
  type TaskStatus,
} from './demo-engine';

type View = 'home' | 'maps' | 'tasks' | 'agenda' | 'apps';
type CanvasKind = StepKind | 'start' | 'end';
type CanvasData = {
  stepId?: string;
  label: string;
  kind: CanvasKind;
  app?: DemoApp;
  meta: string;
};
type CanvasNode = Node<CanvasData, 'mappiNode'>;
type MapStatus = 'Published' | 'Template' | 'Draft';
type MapDocument = {
  id: string;
  name: string;
  description: string;
  status: MapStatus;
  executions: number;
  color: string;
  steps: FlowStep[];
  nodes: CanvasNode[];
  edges: Edge[];
};

const storageKey = 'mappi-portfolio-demo-v3';
const appLabels: Record<DemoApp, string> = {
  none: 'No app',
  forms: 'Forms',
  files: 'Files',
  messages: 'Messages',
};

const kindLabels: Record<StepKind, string> = {
  task: 'Task',
  decision: 'Decision',
  approval: 'Approval',
  interconnection: 'Interconnection',
};

const statusLabels: Record<TaskStatus, string> = {
  todo: 'To do',
  doing: 'In progress',
  review: 'In review',
  done: 'Completed',
};

const statusOrder: TaskStatus[] = ['todo', 'doing', 'review', 'done'];

function moveBefore<T extends { id: string }>(items: T[], movingId: string, targetId: string): T[] {
  if (movingId === targetId) return items;
  const moving = items.find((item) => item.id === movingId);
  if (!moving) return items;
  const remaining = items.filter((item) => item.id !== movingId);
  const targetIndex = remaining.findIndex((item) => item.id === targetId);
  if (targetIndex < 0) return items;
  return [...remaining.slice(0, targetIndex), moving, ...remaining.slice(targetIndex)];
}

function moveToEnd<T extends { id: string }>(items: T[], movingId: string): T[] {
  const moving = items.find((item) => item.id === movingId);
  return moving ? [...items.filter((item) => item.id !== movingId), moving] : items;
}

function moveToStatusEnd(tasks: DemoTask[], taskId: string, status: TaskStatus): DemoTask[] {
  const moving = tasks.find((task) => task.id === taskId);
  if (!moving) return tasks;
  const nextTask = { ...moving, status };
  const remaining = tasks.filter((task) => task.id !== taskId);
  const lastIndex = remaining.findLastIndex((task) => task.status === status);
  return [
    ...remaining.slice(0, lastIndex + 1),
    nextTask,
    ...remaining.slice(lastIndex + 1),
  ];
}

const navItems: Array<{ id: View; label: string; icon: LucideIcon }> = [
  { id: 'home', label: 'Home', icon: LayoutDashboard },
  { id: 'maps', label: 'Maps', icon: Map },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'agenda', label: 'Calendar', icon: CalendarDays },
  { id: 'apps', label: 'Apps', icon: Blocks },
];

const initialMapMetadata: Array<Omit<MapDocument, 'steps' | 'nodes' | 'edges'>> = [
  {
    id: 'pedido',
    name: 'Approve new order',
    description: 'From request to preparation, with a decision and approval.',
    status: 'Published',
    executions: 12,
    color: '#1b7f70',
  },
  {
    id: 'cliente',
    name: 'Onboard new client',
    description: 'Organizes information, approves service, and gathers files.',
    status: 'Published',
    executions: 7,
    color: '#3977c5',
  },
  {
    id: 'conteudo',
    name: 'Publish new content',
    description: 'Preparation, readiness review, and final approval.',
    status: 'Template',
    executions: 0,
    color: '#8f6cb4',
  },
  {
    id: 'compras',
    name: 'Purchase request',
    description: 'A draft workflow for internal requests.',
    status: 'Draft',
    executions: 0,
    color: '#c37732',
  },
];

function makeSeedTasks(): DemoTask[] {
  return [
    {
      id: 'seed-doing',
      stepId: 'pedido-conferir',
      stepIndex: 0,
      flowName: 'Approve new order',
      title: 'Review request',
      kind: 'task',
      app: 'forms',
      status: 'doing',
      checklist: [
        { label: 'Essential details reviewed', done: true },
        { label: 'Deadline confirmed', done: false },
      ],
      due: '2026-08-28T12:00:00-03:00',
    },
    {
      id: 'seed-review',
      stepId: 'conteudo-criar',
      stepIndex: 0,
      flowName: 'Publish new content',
      title: 'Prepare content',
      kind: 'task',
      app: 'files',
      status: 'review',
      checklist: [
        { label: 'Copy reviewed', done: true },
        { label: 'Image selected', done: true },
      ],
      due: '2026-08-29T12:00:00-03:00',
    },
    {
      id: 'seed-todo',
      stepId: 'cliente-aprovar',
      stepIndex: 1,
      flowName: 'Onboard new client',
      title: 'Approve service plan',
      kind: 'approval',
      app: 'messages',
      status: 'todo',
      checklist: [{ label: 'Scope confirmed', done: false }],
      due: '2026-09-01T12:00:00-03:00',
    },
    {
      id: 'seed-done',
      stepId: 'cliente-receber',
      stepIndex: 0,
      flowName: 'Onboard new client',
      title: 'Collect information',
      kind: 'task',
      app: 'forms',
      status: 'done',
      checklist: [
        { label: 'Contact validated', done: true },
        { label: 'Goal recorded', done: true },
      ],
      due: '2026-08-26T12:00:00-03:00',
      outcome: 'approve',
    },
  ];
}

function buildCanvasNodes(steps: FlowStep[]): CanvasNode[] {
  const nodes: CanvasNode[] = [
    {
      id: 'start',
      type: 'mappiNode',
      position: { x: 70, y: 250 },
      data: { label: 'Start', kind: 'start', meta: 'Manual trigger' },
      draggable: false,
    },
  ];

  steps.forEach((step, index) => {
    nodes.push({
      id: step.id,
      type: 'mappiNode',
      position: { x: 300 + index * 285, y: index % 2 === 0 ? 205 : 305 },
      data: {
        stepId: step.id,
        label: step.title,
        kind: step.kind,
        app: step.app,
        meta:
          step.kind === 'interconnection' && step.targetMap
            ? step.targetMap
            : appLabels[step.app],
      },
    });
  });

  nodes.push({
    id: 'end',
    type: 'mappiNode',
    position: { x: 310 + steps.length * 285, y: 250 },
    data: { label: 'End', kind: 'end', meta: 'Run complete' },
    draggable: false,
  });

  return nodes;
}

function makeCanvasEdge(
  source: string,
  target: string,
  outcome: DecisionOutcome = 'approve',
): Edge {
  const adjustment = outcome === 'adjust';
  return {
    id: 'edge-' + source + '-' + target + '-' + outcome,
    source,
    target,
    type: 'smoothstep',
    ...(adjustment ? { label: 'adjust' } : {}),
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: adjustment ? '#b9783d' : '#a8aaa9',
    },
    style: {
      stroke: adjustment ? '#b9783d' : '#a8aaa9',
      strokeWidth: adjustment ? 1.4 : 1.6,
      ...(adjustment ? { strokeDasharray: '5 5' } : {}),
    },
    ...(adjustment
      ? { labelStyle: { fill: '#8c592a', fontSize: 11, fontWeight: 650 } }
      : {}),
    data: { outcome },
  };
}

function buildEdges(steps: FlowStep[]): Edge[] {
  const ids = ['start', ...steps.map((step) => step.id), 'end'];
  return ids.slice(0, -1).map((id, index) => makeCanvasEdge(id, ids[index + 1]));
}

function cloneNodes(nodes: CanvasNode[]): CanvasNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: 'mappiNode',
    position: { ...node.position },
    data: { ...node.data },
    ...(node.draggable === false ? { draggable: false } : {}),
  }));
}

function cloneEdges(edges: Edge[]): Edge[] {
  return edges.map((edge) => ({
    ...edge,
    data: edge.data ? { ...edge.data } : undefined,
    markerEnd:
      edge.markerEnd && typeof edge.markerEnd === 'object'
        ? { ...edge.markerEnd }
        : edge.markerEnd,
    style: edge.style ? { ...edge.style } : undefined,
    labelStyle: edge.labelStyle ? { ...edge.labelStyle } : undefined,
  }));
}

function makeInitialMapDocuments(): MapDocument[] {
  return initialMapMetadata.map((metadata) => {
    const template = flowTemplates.find((item) => item.id === metadata.id);
    const steps = template
      ? cloneTemplate(template)
      : [
          {
            id: 'compras-registrar',
            kind: 'task' as const,
            title: 'Record request',
            app: 'forms' as const,
            checklist: ['Essential information reviewed'],
          },
        ];
    return {
      ...metadata,
      steps,
      nodes: buildCanvasNodes(steps),
      edges: buildEdges(steps),
    };
  });
}

function toFlowConnections(edges: Edge[]): FlowConnection[] {
  return edges
    .filter((edge) => edge.source !== 'start')
    .map((edge) => ({
      source: edge.source,
      target: edge.target,
      outcome:
        edge.data && edge.data.outcome === 'adjust'
          ? 'adjust'
          : 'approve',
    }));
}

function graphIsExecutable(steps: FlowStep[], edges: Edge[]) {
  const adjacency = new globalThis.Map<string, string[]>();
  for (const edge of edges) {
    adjacency.set(edge.source, [...(adjacency.get(edge.source) ?? []), edge.target]);
  }
  const visited = new Set<string>();
  const pending = ['start'];
  while (pending.length) {
    const current = pending.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    for (const target of adjacency.get(current) ?? []) pending.push(target);
  }
  return visited.has('end') && steps.every((step) => visited.has(step.id));
}

function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', options ?? { day: '2-digit', month: 'short' }).format(
    new Date(value),
  );
}

function localDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function AppMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? 'app-mark is-compact' : 'app-mark'} aria-hidden="true">
      <Image src="/mappi.svg" width={compact ? 30 : 36} height={compact ? 30 : 36} alt="" />
    </span>
  );
}

function MappiNode({ data, selected }: NodeProps<CanvasNode>) {
  const kind = data.kind;
  const icon =
    kind === 'decision' ? (
      <GitBranch size={15} />
    ) : kind === 'approval' ? (
      <ShieldCheck size={15} />
    ) : kind === 'interconnection' ? (
      <Link2 size={15} />
    ) : kind === 'start' ? (
      <Play size={14} fill="currentColor" />
    ) : kind === 'end' ? (
      <Check size={15} />
    ) : (
      <CheckCircle2 size={15} />
    );

  return (
    <div className={'flow-node kind-' + kind + (selected ? ' is-selected' : '')}>
      {kind !== 'start' && <Handle type="target" position={Position.Left} />}
      <span className="flow-node-icon">{icon}</span>
      <span className="flow-node-copy">
        <strong>{data.label}</strong>
        <small>{data.meta}</small>
      </span>
      {kind !== 'end' && <Handle type="source" position={Position.Right} />}
    </div>
  );
}

const nodeTypes = { mappiNode: MappiNode };

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="section-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="section-action">{action}</div>}
    </header>
  );
}

function StatusDot({ status }: { status: TaskStatus }) {
  return <span className={'status-dot is-' + status} aria-hidden="true" />;
}

export default function MappiPortfolio() {
  const initialMaps = useMemo(() => makeInitialMapDocuments(), []);
  const initialDocument = initialMaps[0];
  const initialSteps = initialDocument.steps;
  const [view, setView] = useState<View>('home');
  const [editorOpen, setEditorOpen] = useState(false);
  const [maps, setMaps] = useState<MapDocument[]>(initialMaps);
  const [currentMapId, setCurrentMapId] = useState(initialDocument.id);
  const [steps, setSteps] = useState<FlowStep[]>(() => cloneTemplate({
    id: initialDocument.id,
    label: initialDocument.name,
    name: initialDocument.name,
    steps: initialSteps,
  }));
  const [tasks, setTasks] = useState<DemoTask[]>(makeSeedTasks);
  const [published, setPublished] = useState(true);
  const [mapName, setMapName] = useState(initialDocument.name);
  const [calendarFocus, setCalendarFocus] = useState('2026-08-27T12:00:00-03:00');
  const [selectedStepId, setSelectedStepId] = useState<string | null>(initialSteps[0]?.id ?? null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [mapSearch, setMapSearch] = useState('');
  const [taskSearch, setTaskSearch] = useState('');
  const [newMapOpen, setNewMapOpen] = useState(false);
  const [newMapName, setNewMapName] = useState('');
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTaskMapId, setNewTaskMapId] = useState(initialDocument.id);
  const [profileOpen, setProfileOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [draggedMapId, setDraggedMapId] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [taskDropStatus, setTaskDropStatus] = useState<TaskStatus | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [connectedApps, setConnectedApps] = useState<DemoApp[]>(['forms', 'files', 'messages']);
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>(
    cloneNodes(initialDocument.nodes),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    cloneEdges(initialDocument.edges),
  );
  const selectedStep = steps.find((step) => step.id === selectedStepId) ?? null;
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const selectedTaskMap = selectedTask
    ? maps.find((document) => document.name === selectedTask.flowName)
    : undefined;
  const selectedTaskConnections =
    selectedTask?.flowSnapshot?.connections
    ?? (selectedTaskMap ? toFlowConnections(selectedTaskMap.edges) : []);
  const selectedTaskHasAdjustment = Boolean(
    selectedTask
    && selectedTask.kind === 'decision'
    && selectedTaskConnections.some(
      (connection) =>
        connection.source === selectedTask.stepId
        && connection.outcome === 'adjust',
    ),
  );
  const graphValid = useMemo(() => graphIsExecutable(steps, edges), [edges, steps]);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const saved = JSON.parse(raw) as {
            steps?: FlowStep[];
            tasks?: DemoTask[];
            maps?: MapDocument[];
            currentMapId?: string;
            nodes?: CanvasNode[];
            edges?: Edge[];
            mapName?: string;
            published?: boolean;
            connectedApps?: DemoApp[];
            calendarFocus?: string;
          };
          if (saved.steps?.length) setSteps(saved.steps);
          if (saved.tasks?.length) setTasks(saved.tasks);
          if (saved.maps?.length) setMaps(saved.maps);
          if (saved.currentMapId) setCurrentMapId(saved.currentMapId);
          if (saved.nodes?.length) setNodes(saved.nodes);
          if (saved.edges?.length) setEdges(saved.edges);
          if (saved.mapName) setMapName(saved.mapName);
          if (typeof saved.published === 'boolean') setPublished(saved.published);
          if (saved.connectedApps) setConnectedApps(saved.connectedApps);
          if (saved.calendarFocus) setCalendarFocus(saved.calendarFocus);
        }
      } catch {
        window.localStorage.removeItem(storageKey);
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [setEdges, setNodes]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        steps,
        tasks,
        maps,
        currentMapId,
        nodes: cloneNodes(nodes),
        edges: cloneEdges(edges),
        mapName,
        published,
        connectedApps,
        calendarFocus,
      }),
    );
  }, [
    calendarFocus,
    connectedApps,
    currentMapId,
    edges,
    hydrated,
    mapName,
    maps,
    nodes,
    published,
    steps,
    tasks,
  ]);

  useEffect(() => {
    setNodes((current) => {
      const fresh = buildCanvasNodes(steps);
      return fresh.map((node) => {
        const existing = current.find((candidate) => candidate.id === node.id);
        return existing
          ? {
              ...node,
              position: existing.position,
              selected: existing.selected,
            }
          : node;
      });
    });
  }, [setNodes, steps]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      setMaps((current) =>
        current.map((document) =>
          document.id === currentMapId
            ? {
                ...document,
                name: mapName,
                status: published ? 'Published' : 'Draft',
                steps: cloneTemplate({
                  id: currentMapId,
                  label: mapName,
                  name: mapName,
                  steps,
                }),
                nodes: cloneNodes(nodes),
                edges: cloneEdges(edges),
              }
            : document,
        ),
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [currentMapId, edges, hydrated, mapName, nodes, published, steps]);

  useEffect(() => {
    const closeTransientUi = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setProfileOpen(false);
      setAboutOpen(false);
      setSelectedTaskId(null);
      setNewMapOpen(false);
      setNewTaskOpen(false);
      setSelectedStepId(null);
    };
    window.addEventListener('keydown', closeTransientUi);
    return () => window.removeEventListener('keydown', closeTransientUi);
  }, []);

  useEffect(() => {
    const restoreLocation = () => {
      const route = window.location.hash.replace(/^#/, '');
      const [area, detail] = route.split('/');
      const next = (['home', 'maps', 'tasks', 'agenda', 'apps'] as View[]).includes(area as View)
        ? area as View
        : 'home';
      setView(next);
      setEditorOpen(next === 'maps' && detail === 'editor');
      setProfileOpen(false);
      setSelectedTaskId(null);
    };
    window.addEventListener('popstate', restoreLocation);
    const timer = window.setTimeout(restoreLocation, 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('popstate', restoreLocation);
    };
  }, []);

  const pushLocation = (next: View, editing = false) => {
    const suffix = next === 'maps' && editing ? '/editor' : '';
    window.history.pushState({}, '', '#' + next + suffix);
  };

  const saveCurrentMap = (overrides: Partial<MapDocument> = {}) => {
    setMaps((current) =>
      current.map((document) =>
        document.id === currentMapId
          ? {
              ...document,
              name: mapName,
              status: published ? 'Published' : 'Draft',
              steps: cloneTemplate({
                id: currentMapId,
                label: mapName,
                name: mapName,
                steps,
              }),
              nodes: cloneNodes(nodes),
              edges: cloneEdges(edges),
              ...overrides,
            }
          : document,
      ),
    );
  };

  const navigate = (next: View) => {
    if (editorOpen) saveCurrentMap();
    setView(next);
    if (next === 'maps') setEditorOpen(false);
    setProfileOpen(false);
    setSelectedTaskId(null);
    pushLocation(next);
  };

  const closeEditor = () => {
    saveCurrentMap();
    setEditorOpen(false);
    setSelectedStepId(null);
    pushLocation('maps');
  };

  const openMap = (documentId: string) => {
    const document = maps.find((item) => item.id === documentId);
    if (!document) return;
    setCurrentMapId(document.id);
    setMapName(document.name);
    setSteps(cloneTemplate({
      id: document.id,
      label: document.name,
      name: document.name,
      steps: document.steps,
    }));
    setNodes(cloneNodes(document.nodes));
    setEdges(cloneEdges(document.edges));
    setPublished(document.status === 'Published');
    setSelectedStepId(null);
    setView('maps');
    setEditorOpen(true);
    pushLocation('maps', true);
  };

  const createBlankMap = () => {
    const name = newMapName.trim();
    if (!name) return;
    const starter: FlowStep = {
      id: 'step-' + window.crypto.randomUUID(),
      kind: 'task',
      title: 'First task',
      app: 'none',
      checklist: [],
    };
    const id = 'map-' + window.crypto.randomUUID();
    const draftNodes = buildCanvasNodes([starter]);
    const draftEdges = buildEdges([starter]);
    const document: MapDocument = {
      id,
      name,
      description: 'New process created in this demo.',
      status: 'Draft',
      executions: 0,
      color: '#1b7f70',
      steps: [starter],
      nodes: draftNodes,
      edges: draftEdges,
    };
    setMaps((current) => [document, ...current]);
    setCurrentMapId(id);
    setMapName(name);
    setSteps([starter]);
    setNodes(cloneNodes(draftNodes));
    setEdges(cloneEdges(draftEdges));
    setPublished(false);
    setSelectedStepId(starter.id);
    setNewMapName('');
    setNewMapOpen(false);
    setEditorOpen(true);
    pushLocation('maps', true);
    notify('Draft created. Now design the path.');
  };

  const startMapExecution = ({
    documentId,
    flowName,
    executionSteps,
    executionEdges,
  }: {
    documentId: string;
    flowName: string;
    executionSteps: FlowStep[];
    executionEdges: Edge[];
  }) => {
    const firstStepId = executionEdges.find((edge) => edge.source === 'start')?.target;
    const firstIndex = executionSteps.findIndex((step) => step.id === firstStepId);
    const first = firstIndex >= 0 ? executionSteps[firstIndex] : undefined;
    if (!first) return;
    const runId = 'run-' + window.crypto.randomUUID();
    const snapshot: FlowSnapshot = {
      runId,
      steps: cloneTemplate({ id: runId, label: flowName, name: flowName, steps: executionSteps }),
      connections: toFlowConnections(executionEdges),
    };
    const task = createTask(first, firstIndex, flowName, runId + '-task', new Date(), snapshot);
    setTasks((current) => [task, ...current]);
    setMaps((current) => current.map((document) =>
      document.id === documentId
        ? { ...document, executions: document.executions + 1 }
        : document,
    ));
    setCalendarFocus(task.due);
    setView('tasks');
    setEditorOpen(false);
    setNewTaskOpen(false);
    pushLocation('tasks');
    notify('Run started: the first task was created.');
  };

  const createTaskFromMap = () => {
    const document = maps.find((item) => item.id === newTaskMapId && item.status === 'Published');
    if (!document || !graphIsExecutable(document.steps, document.edges)) {
      notify('Choose a published map that is ready to run.');
      return;
    }
    startMapExecution({
      documentId: document.id,
      flowName: document.name,
      executionSteps: document.steps,
      executionEdges: document.edges,
    });
  };

  const addStep = (kind: StepKind) => {
    const defaults: Record<StepKind, string> = {
      task: 'New task',
      decision: 'Make a decision',
      approval: 'Request approval',
      interconnection: 'Reference another map',
    };
    const step: FlowStep = {
      id: 'step-' + window.crypto.randomUUID(),
      kind,
      title: defaults[kind],
      app: 'none',
      checklist: [],
      ...(kind === 'interconnection'
        ? { targetMap: maps.find((document) => document.id !== currentMapId)?.name }
        : {}),
    };
    setSteps((current) => [...current, step]);
    const previous = steps.at(-1);
    setEdges((current) => {
      const withoutPreviousEnd = previous
        ? current.filter((edge) => !(edge.source === previous.id && edge.target === 'end'))
        : current;
      return previous
        ? [
            ...withoutPreviousEnd,
            makeCanvasEdge(previous.id, step.id),
            makeCanvasEdge(step.id, 'end'),
          ]
        : buildEdges([step]);
    });
    setSelectedStepId(step.id);
    setPublished(false);
  };

  const connectNodes = (connection: Connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) return;
    const sourceStep = steps.find((step) => step.id === connection.source);
    setEdges((current) => {
      const outgoing = current.filter((edge) => edge.source === connection.source);
      const outcome: DecisionOutcome =
        sourceStep?.kind === 'decision' && outgoing.some((edge) => edge.data?.outcome !== 'adjust')
          ? 'adjust'
          : 'approve';
      const retained =
        sourceStep?.kind === 'decision'
          ? current.filter(
              (edge) =>
                edge.source !== connection.source ||
                edge.data?.outcome !== outcome,
            )
          : current.filter((edge) => edge.source !== connection.source);
      const edge = makeCanvasEdge(connection.source, connection.target, outcome);
      return addEdge(edge, retained);
    });
    setPublished(false);
  };

  const handleEdgesChange = (changes: EdgeChange[]) => {
    if (changes.some((change) => change.type === 'remove')) setPublished(false);
    onEdgesChange(changes);
  };

  const updateStep = (patch: Partial<FlowStep>) => {
    if (!selectedStepId) return;
    setSteps((current) =>
      current.map((step) => (step.id === selectedStepId ? { ...step, ...patch } : step)),
    );
    setPublished(false);
  };

  const removeStep = () => {
    if (!selectedStepId || steps.length === 1) return;
    setEdges((current) => {
      const incoming = current.filter((edge) => edge.target === selectedStepId);
      const outgoing = current.filter((edge) => edge.source === selectedStepId);
      let next = current.filter(
        (edge) => edge.source !== selectedStepId && edge.target !== selectedStepId,
      );
      for (const before of incoming) {
        for (const after of outgoing) {
          if (!next.some((edge) => edge.source === before.source && edge.target === after.target)) {
            next = [
              ...next,
              makeCanvasEdge(
                before.source,
                after.target,
                before.data?.outcome === 'adjust' ? 'adjust' : 'approve',
              ),
            ];
          }
        }
      }
      return next;
    });
    const next = steps.filter((step) => step.id !== selectedStepId);
    setSteps(next);
    setSelectedStepId(next[0]?.id ?? null);
    setPublished(false);
  };

  const publishOrRun = () => {
    if (!published) {
      if (!graphValid) {
        notify('Connect every step to the path between Start and End.');
        return;
      }
      setPublished(true);
      saveCurrentMap({ status: 'Published' });
      notify('Map published and ready to run.');
      return;
    }
    startMapExecution({
      documentId: currentMapId,
      flowName: mapName,
      executionSteps: steps,
      executionEdges: edges,
    });
  };

  const startSelectedTask = () => {
    if (!selectedTask) return;
    setTasks((current) => startTask(current, selectedTask.id));
  };

  const toggleSelectedChecklist = (index: number) => {
    if (!selectedTask) return;
    setTasks((current) => toggleChecklist(current, selectedTask.id, index));
  };

  const reviewSelectedTask = () => {
    if (!selectedTask) return;
    if (!canSendToReview(selectedTask)) {
      notify('Complete the checklist before sending for review.');
      return;
    }
    setTasks((current) => sendTaskToReview(current, selectedTask.id));
    notify('Task sent for review.');
  };

  const finishSelectedTask = (outcome: DecisionOutcome = 'approve') => {
    if (!selectedTask) return;
    const savedDocument = maps.find((document) => document.name === selectedTask.flowName);
    const executionSteps =
      selectedTask.flowSnapshot?.steps ??
      savedDocument?.steps ??
      flowTemplates.find((item) => item.name === selectedTask.flowName)?.steps ??
      steps;
    const executionConnections =
      selectedTask.flowSnapshot?.connections ??
      (savedDocument ? toFlowConnections(savedDocument.edges) : undefined);
    const result = advanceTask({
      tasks,
      taskId: selectedTask.id,
      steps: executionSteps,
      connections: executionConnections,
      flowName: selectedTask.flowName,
      nextId: 'task-' + window.crypto.randomUUID(),
      outcome,
      baseDate: new Date(),
    });
    setTasks(result.tasks);
    setSelectedTaskId(result.nextTaskId ?? null);
    const nextTask = result.nextTaskId
      ? result.tasks.find((task) => task.id === result.nextTaskId)
      : undefined;
    if (nextTask) setCalendarFocus(nextTask.due);
    notify(
      result.complete
        ? 'Run complete.'
        : outcome === 'adjust'
          ? 'Adjustment task created before continuing.'
          : 'Next task created automatically.',
    );
  };

  const dropMapBefore = (targetId: string) => {
    if (!draggedMapId || draggedMapId === targetId) return;
    setMaps((current) => moveBefore(current, draggedMapId, targetId));
    setDraggedMapId(null);
    notify('Map order updated.');
  };

  const moveTask = (taskId: string, targetStatus: TaskStatus, targetId?: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    if (task.status === targetStatus) {
      setTasks((current) => targetId
        ? moveBefore(current, taskId, targetId)
        : moveToStatusEnd(current, taskId, targetStatus));
      return;
    }
    if (task.status === 'done') {
      notify('Completed steps remain in the run history.');
      return;
    }
    if (targetStatus === 'todo') {
      setTasks((current) => moveToStatusEnd(current, taskId, 'todo'));
      notify('Task moved to To do.');
      return;
    }
    if (targetStatus === 'doing') {
      setTasks((current) => moveToStatusEnd(current, taskId, 'doing'));
      notify('Task moved to In progress.');
      return;
    }
    if (targetStatus === 'review') {
      if (task.status !== 'doing' || !canSendToReview(task)) {
        notify('Complete the checklist before sending for review.');
        return;
      }
      setTasks((current) => moveToStatusEnd(current, taskId, 'review'));
      notify('Task sent for review.');
      return;
    }
    if (task.status !== 'review') {
      notify('The task must pass review before completion.');
      return;
    }
    if (task.kind === 'decision') {
      setSelectedTaskId(task.id);
      notify('Open the decision to choose the workflow path.');
      return;
    }

    const savedDocument = maps.find((document) => document.name === task.flowName);
    const executionSteps = task.flowSnapshot?.steps
      ?? savedDocument?.steps
      ?? flowTemplates.find((item) => item.name === task.flowName)?.steps
      ?? steps;
    const executionConnections = task.flowSnapshot?.connections
      ?? (savedDocument ? toFlowConnections(savedDocument.edges) : undefined);
    const result = advanceTask({
      tasks,
      taskId,
      steps: executionSteps,
      connections: executionConnections,
      flowName: task.flowName,
      nextId: 'task-' + window.crypto.randomUUID(),
      baseDate: new Date(),
    });
    setTasks(result.tasks);
    const nextTask = result.nextTaskId
      ? result.tasks.find((item) => item.id === result.nextTaskId)
      : undefined;
    if (nextTask) setCalendarFocus(nextTask.due);
    notify(result.complete ? 'Run complete.' : 'Next task created automatically.');
  };

  const beginMapDrag = (event: DragEvent<HTMLButtonElement>, mapId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', mapId);
    setDraggedMapId(mapId);
  };

  const beginTaskDrag = (event: DragEvent<HTMLButtonElement>, taskId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const finishTaskDrag = () => {
    setDraggedTaskId(null);
    setTaskDropStatus(null);
  };

  const resetDemo = () => {
    const resetMaps = makeInitialMapDocuments();
    const resetDocument = resetMaps[0];
    const resetSteps = resetDocument.steps;
    setMaps(resetMaps);
    setCurrentMapId(resetDocument.id);
    setSteps(resetSteps);
    setNodes(cloneNodes(resetDocument.nodes));
    setEdges(cloneEdges(resetDocument.edges));
    setTasks(makeSeedTasks());
    setMapName(resetDocument.name);
    setCalendarFocus('2026-08-27T12:00:00-03:00');
    setPublished(true);
    setConnectedApps(['forms', 'files', 'messages']);
    setNewTaskOpen(false);
    setNewTaskMapId(resetDocument.id);
    setSelectedStepId(resetSteps[0]?.id ?? null);
    setSelectedTaskId(null);
    setEditorOpen(false);
    setView('home');
    pushLocation('home');
    window.localStorage.removeItem(storageKey);
    notify('Demo restored.');
  };

  const filteredMaps = maps.filter((mapItem) =>
    (mapItem.name + ' ' + mapItem.description).toLowerCase().includes(mapSearch.toLowerCase()),
  );

  const filteredTasks = tasks.filter((task) =>
    (task.title + ' ' + task.flowName).toLowerCase().includes(taskSearch.toLowerCase()),
  );

  const taskCounts = statusOrder.reduce(
    (counts, status) => ({ ...counts, [status]: tasks.filter((task) => task.status === status).length }),
    {} as Record<TaskStatus, number>,
  );
  const publishedMapCount = maps.filter((document) => document.status === 'Published').length;
  const publishedMaps = maps.filter((document) => document.status === 'Published');
  const executionCount = maps.reduce((total, document) => total + document.executions, 0);
  const focusDateLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(calendarFocus));
  const tasksOnFocus = tasks.filter(
    (task) => task.status !== 'done' && task.due.slice(0, 10) === calendarFocus.slice(0, 10),
  ).length;

  const renderHome = () => {
    const focusTasks = tasks.filter((task) => task.status !== 'done').slice(0, 4);
    const focusMap = maps.find((document) => document.id === 'pedido') ?? maps[0];
    return (
      <div className="product-page home-page">
        <SectionHeader
          eyebrow={focusDateLabel.charAt(0).toUpperCase() + focusDateLabel.slice(1)}
          title="Good work, Marina."
          description="Here is what needs your attention now."
          action={
            <button
              className="icon-button"
              onClick={() => {
                const review = tasks.find((task) => task.status === 'review');
                setSelectedTaskId(review?.id ?? null);
                setView('tasks');
                pushLocation('tasks');
              }}
              aria-label={taskCounts.review + ' tasks awaiting review'}
            >
              <Bell size={18} />
              {taskCounts.review > 0 && <span className="notification-dot" />}
            </button>
          }
        />

        <section className="home-stats" aria-label="Summary">
          <article>
            <span className="stat-icon is-green"><ListTodo size={18} /></span>
            <div><strong>{taskCounts.todo + taskCounts.doing}</strong><span>Open tasks</span></div>
            <small>{tasksOnFocus} on the selected date</small>
          </article>
          <article>
            <span className="stat-icon is-blue"><Workflow size={18} /></span>
            <div><strong>{publishedMapCount}</strong><span>Published maps</span></div>
            <small>{executionCount} runs</small>
          </article>
          <article>
            <span className="stat-icon is-amber"><ShieldCheck size={18} /></span>
            <div><strong>{taskCounts.review}</strong><span>Awaiting review</span></div>
            <small>No delays</small>
          </article>
        </section>

        <div className="home-grid">
          <section className="surface focus-list">
            <div className="surface-heading">
              <div><h2>Upcoming tasks</h2><p>Sorted by due date</p></div>
              <button className="text-button" onClick={() => navigate('tasks')}>View all <ArrowRight size={14} /></button>
            </div>
            <div className="compact-task-list">
              {focusTasks.map((task) => (
                <button
                  key={task.id}
                  className="compact-task"
                  onClick={() => {
                    setSelectedTaskId(task.id);
                    setView('tasks');
                    pushLocation('tasks');
                  }}
                >
                  <StatusDot status={task.status} />
                  <span className="compact-task-copy">
                    <strong>{task.title}</strong>
                    <small>{task.flowName}</small>
                  </span>
                  <span className="compact-task-date">{formatDate(task.due)}</span>
                  <ChevronRight size={15} />
                </button>
              ))}
            </div>
          </section>

          <aside className="home-aside">
            <section className="surface quick-map">
              <div className="surface-heading">
                <div><h2>Focus map</h2><p>Most run this week</p></div>
              </div>
              <div className="mini-flow" aria-hidden="true">
                <span className="mini-node start" />
                <i />
                <span className="mini-node task" />
                <i />
                <span className="mini-node decision" />
                <i />
                <span className="mini-node task" />
              </div>
              <h3>{focusMap.name}</h3>
              <p>{focusMap.executions} runs · 83% completed on time</p>
              <button className="secondary-button full" onClick={() => openMap(focusMap.id)}>
                Open map <ArrowRight size={15} />
              </button>
            </section>

            <section className="surface connected-summary">
              <div className="surface-heading">
                <div><h2>Apps</h2><p>{connectedApps.length} connected</p></div>
                <button className="text-button" onClick={() => navigate('apps')}>Manage</button>
              </div>
              <div className="app-stack">
                {connectedApps.includes('forms') && <span><FileText size={16} /> Forms</span>}
                {connectedApps.includes('files') && <span><Folder size={16} /> Files</span>}
                {connectedApps.includes('messages') && <span><MessageSquare size={16} /> Messages</span>}
                {connectedApps.length === 0 && <span>No apps connected</span>}
              </div>
            </section>
          </aside>
        </div>
      </div>
    );
  };

  const renderMapLibrary = () => (
    <div className="product-page maps-page">
      <SectionHeader
        eyebrow="Operations"
        title="Maps"
        description="Design once. Mappi guides the work on every run."
        action={
          <button className="primary-button" onClick={() => setNewMapOpen((open) => !open)}>
            {newMapOpen ? <X size={16} /> : <Plus size={16} />}
            {newMapOpen ? 'Cancel' : 'New map'}
          </button>
        }
      />

      {newMapOpen && (
        <section className="new-map-composer">
          <AppMark compact />
          <div>
            <strong>What should this process be called?</strong>
            <span>You can adjust everything later.</span>
          </div>
          <input
            autoFocus
            value={newMapName}
            onChange={(event) => setNewMapName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && createBlankMap()}
            placeholder="For example: Approve refund"
            aria-label="New map name"
          />
          <button className="primary-button" disabled={!newMapName.trim()} onClick={createBlankMap}>
            Create
          </button>
        </section>
      )}

      <section className="map-command">
        <div><span>{executionCount}</span><small>recorded runs</small></div>
        <div><span>86%</span><small>completed on time</small></div>
        <div><span>1.8 days</span><small>average time</small></div>
        <div><span>{publishedMapCount}</span><small>published maps</small></div>
      </section>

      <section className="surface running-section">
        <div className="surface-heading">
          <div><h2>Running</h2><p>Active processes right now</p></div>
          <button className="text-button" onClick={() => navigate('tasks')}>Track tasks <ArrowRight size={14} /></button>
        </div>
        <div className="running-row">
          <div className="running-icon"><Workflow size={18} /></div>
          <div><strong>Approve new order</strong><span>Run #018 · 2 of 4 steps</span></div>
          <div className="progress-track"><i style={{ width: '50%' }} /></div>
          <span className="running-owner"><span className="avatar tiny">MC</span> Marina</span>
          <button className="secondary-button compact" onClick={() => navigate('tasks')}>Open</button>
        </div>
      </section>

      <div className="library-toolbar">
        <div>
          <h2>Library</h2>
          <span>{filteredMaps.length} maps</span>
        </div>
        <label className="search-field">
          <Search size={16} />
          <input value={mapSearch} onChange={(event) => setMapSearch(event.target.value)} placeholder="Search maps" />
        </label>
      </div>

      <section
        className="map-grid"
        onDragOver={(event) => {
          if (!draggedMapId) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(event) => {
          event.preventDefault();
          if (!draggedMapId) return;
          setMaps((current) => moveToEnd(current, draggedMapId));
          setDraggedMapId(null);
          notify('Map order updated.');
        }}
      >
        {filteredMaps.map((mapItem) => (
          <button
            className={'map-card' + (draggedMapId === mapItem.id ? ' is-dragging' : '')}
            key={mapItem.id}
            draggable
            onDragStart={(event) => beginMapDrag(event, mapItem.id)}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              dropMapBefore(mapItem.id);
            }}
            onDragEnd={() => setDraggedMapId(null)}
            onClick={() => openMap(mapItem.id)}
            title="Drag to reorder or click to open"
          >
            <span className="map-card-accent" style={{ '--map-color': mapItem.color } as CSSProperties} />
            <div className="map-card-top">
              <span className="map-icon" style={{ '--map-color': mapItem.color } as CSSProperties}><Workflow size={18} /></span>
              <span className={'map-state is-' + mapItem.status.toLowerCase()}>{mapItem.status}</span>
            </div>
            <h3>{mapItem.name}</h3>
            <p>{mapItem.description}</p>
            <div className="map-card-bottom">
              <span>{mapItem.executions ? mapItem.executions + ' runs' : 'Not run yet'}</span>
              <ArrowRight size={16} />
            </div>
          </button>
        ))}
      </section>
    </div>
  );

  const renderEditor = () => (
    <div className="editor-shell">
      <header className="editor-topbar">
        <div className="editor-title">
          <button className="icon-button subtle" onClick={closeEditor} aria-label="Back to library">
            <ArrowLeft size={18} />
          </button>
          <div>
            <input
              value={mapName}
              onChange={(event) => {
                setMapName(event.target.value);
                setPublished(false);
              }}
              aria-label="Map name"
            />
            <span><i className={published ? 'published-dot' : 'draft-dot'} />{published ? 'Published' : 'Unpublished changes'}</span>
          </div>
        </div>
        <div className="editor-actions">
          <button className="primary-button" onClick={publishOrRun}>
            {published ? <Play size={16} fill="currentColor" /> : <UploadCloud size={16} />}
            {published ? 'Start run' : 'Publish map'}
          </button>
        </div>
      </header>

      <div className="editor-layout">
        <aside className="operation-palette">
          <div>
            <p className="palette-label">Steps</p>
            <span>Add and arrange them on the map.</span>
          </div>
          <button onClick={() => addStep('task')}><span className="palette-icon task"><CheckCircle2 size={16} /></span><span><strong>Task</strong><small>Work to be done</small></span><Plus size={14} /></button>
          <button onClick={() => addStep('decision')}><span className="palette-icon decision"><GitBranch size={16} /></span><span><strong>Decision</strong><small>Creates two paths</small></span><Plus size={14} /></button>
          <button onClick={() => addStep('approval')}><span className="palette-icon approval"><ShieldCheck size={16} /></span><span><strong>Approval</strong><small>Owner validation</small></span><Plus size={14} /></button>
          <button onClick={() => addStep('interconnection')}><span className="palette-icon interconnection"><Link2 size={16} /></span><span><strong>Interconnection</strong><small>References another map</small></span><Plus size={14} /></button>
          <div className="palette-tip">
            <Sparkles size={15} />
            <p><strong>Test this map</strong><span>Publish and start a run. The first task will appear on the board.</span></p>
          </div>
        </aside>

        <main className="flow-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={connectNodes}
            onNodeClick={(_, node) => node.data.stepId && setSelectedStepId(node.data.stepId)}
            onNodeDragStop={() => setPublished(false)}
            onBeforeDelete={async ({ edges: edgesToDelete }) => ({
              nodes: [],
              edges: edgesToDelete,
            })}
            fitView
            fitViewOptions={{ padding: 0.22 }}
            minZoom={0.45}
            maxZoom={1.4}
          >
            <Background color="#d8dad9" gap={24} size={1} />
            <Controls showInteractive={false} position="bottom-left" />
          </ReactFlow>
          <div className="canvas-legend">
            <span><Link2 size={11} /> drag between handles to connect</span>
            <span><i className="line-dashed" /> returns for adjustment</span>
          </div>
        </main>

        <aside className={selectedStep ? 'step-inspector' : 'step-inspector is-empty'}>
          {selectedStep ? (
            <>
              <div className="inspector-heading">
                <div><span className={'palette-icon ' + selectedStep.kind}>
                  {selectedStep.kind === 'decision' ? <GitBranch size={16} /> : selectedStep.kind === 'approval' ? <ShieldCheck size={16} /> : selectedStep.kind === 'interconnection' ? <Link2 size={16} /> : <CheckCircle2 size={16} />}
                </span><div><p>Selected step</p><strong>{kindLabels[selectedStep.kind]}</strong></div></div>
                <button className="icon-button subtle" onClick={() => setSelectedStepId(null)} aria-label="Close details"><X size={16} /></button>
              </div>
              <label className="field-label">
                Name
                <input value={selectedStep.title} onChange={(event) => updateStep({ title: event.target.value })} />
              </label>
              <label className="field-label">
                Type
                <select
                  value={selectedStep.kind}
                  onChange={(event) => {
                    const kind = event.target.value as StepKind;
                    updateStep({
                      kind,
                      ...(kind === 'interconnection' && !selectedStep.targetMap
                        ? { targetMap: maps.find((document) => document.id !== currentMapId)?.name }
                        : {}),
                    });
                  }}
                >
                  {Object.entries(kindLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </label>
              {selectedStep.kind === 'interconnection' ? (
                <label className="field-label">
                  Related map
                  <select value={selectedStep.targetMap ?? ''} onChange={(event) => updateStep({ targetMap: event.target.value })}>
                    <option value="">Select a map</option>
                    {maps.filter((document) => document.id !== currentMapId).map((document) => (
                      <option value={document.name} key={document.id}>{document.name}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="field-label">
                  App
                  <select value={selectedStep.app} onChange={(event) => updateStep({ app: event.target.value as DemoApp })}>
                    {Object.entries(appLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                  </select>
                </label>
              )}
              <label className="field-label">
                Completion checklist
                <textarea
                  value={selectedStep.checklist.join('\n')}
                  onChange={(event) => updateStep({ checklist: event.target.value.split('\n').filter(Boolean) })}
                  placeholder="One check per line"
                  rows={5}
                />
              </label>
              <div className="inspector-note">
                <Zap size={15} />
                <p>
                  <strong>What happens?</strong>
                  <span>
                    {selectedStep.kind === 'interconnection'
                      ? 'The task keeps a reference to the related map without starting another run automatically.'
                      : 'When this step is reached, Mappi creates a task with a deadline and tracks its completion.'}
                  </span>
                </p>
              </div>
              <button className="danger-text-button" disabled={steps.length === 1} onClick={removeStep}>Remove step</button>
            </>
          ) : (
            <div className="inspector-empty">
              <Settings2 size={22} />
              <strong>Step details</strong>
              <p>Select a map step to configure the work it generates.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );

  const renderTasks = () => (
    <div className="product-page tasks-page">
      <SectionHeader
        eyebrow="Execution"
        title="Tasks"
        description="Work starts in maps and moves forward in one place."
        action={
          <div className="task-header-actions">
            <label className="search-field task-search">
              <Search size={16} />
              <input value={taskSearch} onChange={(event) => setTaskSearch(event.target.value)} placeholder="Search tasks" />
            </label>
            <button
              className="primary-button"
              onClick={() => {
                setNewTaskOpen((open) => !open);
                if (!publishedMaps.some((document) => document.id === newTaskMapId)) {
                  setNewTaskMapId(publishedMaps[0]?.id ?? '');
                }
              }}
            >
              {newTaskOpen ? <X size={16} /> : <Plus size={16} />}
              {newTaskOpen ? 'Cancel' : 'New task'}
            </button>
          </div>
        }
      />

      {newTaskOpen && (
        <section className="new-map-composer new-task-composer">
          <span className="composer-icon"><ListTodo size={17} /></span>
          <div>
            <strong>Which map should create this task?</strong>
            <span>Mappi starts the run from the first published step.</span>
          </div>
          <select
            autoFocus
            value={newTaskMapId}
            onChange={(event) => setNewTaskMapId(event.target.value)}
            aria-label="New task map"
          >
            {publishedMaps.map((document) => (
              <option value={document.id} key={document.id}>{document.name}</option>
            ))}
          </select>
          <button className="primary-button" disabled={!newTaskMapId} onClick={createTaskFromMap}>
            Create task
          </button>
        </section>
      )}

      <section className="board-summary">
        <span><Users size={16} /> My board</span>
        <div><span className="avatar tiny">MC</span><span className="avatar tiny secondary">RL</span><small>2 people</small></div>
      </section>

      <section className="kanban-board">
        {statusOrder.map((status) => (
          <div
            className={'kanban-column' + (taskDropStatus === status ? ' is-drop-target' : '')}
            key={status}
            onDragOver={(event) => {
              if (!draggedTaskId) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              setTaskDropStatus(status);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as globalThis.Node | null)) {
                setTaskDropStatus((current) => current === status ? null : current);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (draggedTaskId) moveTask(draggedTaskId, status);
              finishTaskDrag();
            }}
          >
            <header><span><StatusDot status={status} />{statusLabels[status]}</span><small>{filteredTasks.filter((task) => task.status === status).length}</small></header>
            <div className="kanban-list">
              {filteredTasks.filter((task) => task.status === status).map((task) => (
                <button
                  className={'task-card' + (draggedTaskId === task.id ? ' is-dragging' : '')}
                  key={task.id}
                  draggable
                  onDragStart={(event) => beginTaskDrag(event, task.id)}
                  onDragOver={(event) => {
                    if (!draggedTaskId) return;
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (draggedTaskId) moveTask(draggedTaskId, status, task.id);
                    finishTaskDrag();
                  }}
                  onDragEnd={finishTaskDrag}
                  onClick={() => setSelectedTaskId(task.id)}
                  title="Drag to move or click to open"
                >
                  <span className={'task-kind is-' + task.kind}>{kindLabels[task.kind]}</span>
                  <h3>{task.title}</h3>
                  <p>{task.flowName}</p>
                  {task.checklist.length > 0 && (
                    <div className="check-progress">
                      <i style={{ width: Math.round((task.checklist.filter((item) => item.done).length / task.checklist.length) * 100) + '%' }} />
                    </div>
                  )}
                  <footer>
                    <span className="avatar tiny">MC</span>
                    <span className="task-due"><CalendarDays size={13} />{formatDate(task.due)}</span>
                    {task.app !== 'none' && <span className="task-app">{appLabels[task.app]}</span>}
                  </footer>
                </button>
              ))}
              {!filteredTasks.some((task) => task.status === status) && <div className="empty-column">No tasks</div>}
            </div>
          </div>
        ))}
      </section>

      {selectedTask && (
        <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelectedTaskId(null)}>
          <aside className="task-drawer" role="dialog" aria-modal="true" aria-label="Task details">
            <header>
              <span className={'task-kind is-' + selectedTask.kind}>{kindLabels[selectedTask.kind]}</span>
              <button className="icon-button subtle" onClick={() => setSelectedTaskId(null)} aria-label="Close"><X size={18} /></button>
            </header>
            <div className="drawer-title">
              <h2>{selectedTask.title}</h2>
              <p><Workflow size={15} /> {selectedTask.flowName}</p>
            </div>
            <div className="drawer-meta">
              <div><span>Status</span><strong><StatusDot status={selectedTask.status} />{statusLabels[selectedTask.status]}</strong></div>
              <div><span>Due date</span><strong><CalendarDays size={15} />{formatDate(selectedTask.due, { day: '2-digit', month: 'long' })}</strong></div>
              <div><span>Assignee</span><strong><span className="avatar tiny">MC</span>Marina Costa</strong></div>
              {selectedTask.app !== 'none' && <div><span>App</span><strong><Blocks size={15} />{appLabels[selectedTask.app]}</strong></div>}
            </div>

            <section className="drawer-checklist">
              <div><h3>Completion checklist</h3><span>{selectedTask.checklist.filter((item) => item.done).length}/{selectedTask.checklist.length}</span></div>
              {selectedTask.checklist.length ? selectedTask.checklist.map((item, index) => (
                <button
                  key={item.label}
                  disabled={selectedTask.status !== 'doing'}
                  onClick={() => toggleSelectedChecklist(index)}
                  className={item.done ? 'is-done' : ''}
                >
                  {item.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                  <span>{item.label}</span>
                </button>
              )) : <p className="no-checklist">This step has no additional checks.</p>}
            </section>

            <div className="drawer-automation">
              <Zap size={16} />
              <p><strong>Map automation</strong><span>When completed, Mappi follows the published connection and creates the next task — or ends the run.</span></p>
            </div>

            <footer className="drawer-footer">
              {selectedTask.status === 'todo' && (
                <button className="primary-button full" onClick={startSelectedTask}>
                  <Play size={16} fill="currentColor" />
                  {selectedTask.kind === 'approval'
                    ? 'Prepare approval'
                    : selectedTask.kind === 'decision'
                      ? 'Review decision'
                      : 'Start task'}
                </button>
              )}
              {selectedTask.status === 'doing' && (
                <button className="primary-button full" onClick={reviewSelectedTask} disabled={!canSendToReview(selectedTask)}>
                  <ShieldCheck size={16} />
                  {selectedTask.kind === 'approval' ? 'Request approval' : 'Send for review'}
                </button>
              )}
              {selectedTask.status === 'review' && selectedTask.kind !== 'decision' && (
                <button className="primary-button full" onClick={() => finishSelectedTask('approve')}>
                  <Check size={16} />
                  {selectedTask.kind === 'approval' ? 'Approve and continue' : 'Complete and continue'}
                </button>
              )}
              {selectedTask.status === 'review' && selectedTask.kind === 'decision' && selectedTaskHasAdjustment && (
                <div className="decision-actions">
                  <button className="secondary-button" onClick={() => finishSelectedTask('adjust')}>Needs changes</button>
                  <button className="primary-button" onClick={() => finishSelectedTask('approve')}>Continue <ArrowRight size={15} /></button>
                </div>
              )}
              {selectedTask.status === 'review' && selectedTask.kind === 'decision' && !selectedTaskHasAdjustment && (
                <button className="primary-button full" onClick={() => finishSelectedTask('approve')}>
                  Continue <ArrowRight size={15} />
                </button>
              )}
              {selectedTask.status === 'done' && <div className="completed-message"><CheckCircle2 size={18} /><span>Step complete</span></div>}
            </footer>
          </aside>
        </div>
      )}
    </div>
  );

  const renderAgenda = () => {
    const focusDate = new Date(calendarFocus);
    const focusYear = focusDate.getFullYear();
    const focusMonth = focusDate.getMonth();
    const monthStart = new Date(focusYear, focusMonth, 1, 12);
    const gridStart = new Date(focusYear, focusMonth, 1 - monthStart.getDay(), 12);
    const days = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + index,
        12,
      );
      return date;
    });
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthLabel = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(focusDate);
    const focusKey = calendarFocus.slice(0, 10);
    return (
      <div className="product-page agenda-page">
        <SectionHeader
          eyebrow="Deadlines"
          title="Calendar"
          description="The same tasks, organized by when they need to happen."
          action={<button className="secondary-button" onClick={() => navigate('tasks')}><ListTodo size={16} />View board</button>}
        />
        <section className="calendar-shell">
          <header className="calendar-toolbar">
            <div><h2>{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</h2></div>
            <span className="today-pill">Selected, {focusDate.getDate()}</span>
          </header>
          <div className="calendar-weekdays">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
          <div className="calendar-grid">
            {days.map((date) => {
              const key = localDateKey(date);
              const dayTasks = tasks.filter((task) => task.due.slice(0, 10) === key);
              const isToday = key === focusKey;
              const isOtherMonth = date.getMonth() !== focusMonth;
              return (
                <div className={'calendar-day' + (isToday ? ' is-today' : '') + (isOtherMonth ? ' is-other' : '')} key={key}>
                  <span>{date.getDate()}</span>
                  <div>
                    {dayTasks.slice(0, 3).map((task) => (
                      <button key={task.id} className={'calendar-task is-' + task.status} onClick={() => { setSelectedTaskId(task.id); setView('tasks'); pushLocation('tasks'); }}>
                        <i />{task.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    );
  };

  const integrationGroups: Array<{
    group: string;
    items: Array<{ id: DemoApp; name: string; description: string; icon: LucideIcon; color: string }>;
  }> = [
    {
      group: 'Work',
      items: [
        { id: 'forms', name: 'Forms', description: 'Collect data before or during a step.', icon: FileText, color: '#3977c5' },
        { id: 'files', name: 'Files', description: 'Attach and organize process documents.', icon: Folder, color: '#c37732' },
      ],
    },
    {
      group: 'Communication',
      items: [
        { id: 'messages', name: 'Messages', description: 'Notify owners and record responses.', icon: MessageSquare, color: '#8f6cb4' },
      ],
    },
    {
      group: 'Automation',
      items: [
        { id: 'none', name: 'Webhook', description: 'Send events to external tools.', icon: Webhook, color: '#60656b' },
      ],
    },
  ];

  const renderApps = () => (
    <div className="product-page apps-page">
      <SectionHeader
        eyebrow="Connections"
        title="Apps"
        description="Add capabilities to maps without turning setup into a technical project."
      />
      <section className="apps-hero">
        <div className="apps-orbit" aria-hidden="true">
          <AppMark />
          <span className="orbit-item one"><FileText size={18} /></span>
          <span className="orbit-item two"><Folder size={18} /></span>
          <span className="orbit-item three"><MessageSquare size={18} /></span>
        </div>
        <div><span className="demo-badge">Demo environment</span><h2>Your process stays in Mappi.<br />Apps join when they help.</h2><p>The connections below are local simulations that show the product experience without accessing real services.</p></div>
      </section>
      {integrationGroups.map((group) => (
        <section className="app-group" key={group.group}>
          <div className="app-group-heading"><h2>{group.group}</h2><span>{group.items.length} {group.items.length === 1 ? 'app' : 'apps'}</span></div>
          <div className="integration-grid">
            {group.items.map((integration) => {
              const connected = integration.id !== 'none' && connectedApps.includes(integration.id);
              const Icon = integration.icon;
              return (
                <article className="integration-card" key={integration.name}>
                  <span className="integration-icon" style={{ '--integration-color': integration.color } as CSSProperties}><Icon size={21} /></span>
                  <div><h3>{integration.name}</h3><p>{integration.description}</p></div>
                  <button
                    className={connected ? 'connection-button is-connected' : 'connection-button'}
                    onClick={() => {
                      if (integration.id === 'none') {
                        notify('Webhook is available in the full plan.');
                        return;
                      }
                      setConnectedApps((current) =>
                        connected ? current.filter((app) => app !== integration.id) : [...current, integration.id],
                      );
                    }}
                  >
                    {connected ? <><Check size={14} />Connected</> : 'Connect'}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );

  const showEditor = view === 'maps' && editorOpen;

  return (
    <div className="demo-shell" onPointerDown={() => setProfileOpen(false)}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <AppMark />
          <span><strong>Mappi</strong><small>Connected work</small></span>
        </div>

        <div className="sector-picker" aria-label="Operations workspace">
          <span className="sector-symbol">O</span>
          <span><small>Workspace</small><strong>Operations</strong></span>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button className={view === item.id ? 'is-active' : ''} key={item.id} onClick={() => navigate(item.id)}>
                <Icon size={18} />
                <span>{item.label}</span>
                {item.id === 'tasks' && taskCounts.review > 0 && <small>{taskCounts.review}</small>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-info">
          <div><Sparkles size={16} /><span><strong>Interactive demo</strong><small>Data stays in this browser</small></span></div>
          <button onClick={() => setAboutOpen(true)}>About this version</button>
        </div>

        <div className="sidebar-bottom">
          <div className="profile-wrap" onPointerDown={(event) => event.stopPropagation()}>
            <button className="profile-button" onClick={() => setProfileOpen((open) => !open)}>
              <span className="avatar">MC</span>
              <span><strong>Marina Costa</strong><small>Administration</small></span>
              <ChevronDown size={15} />
            </button>
            {profileOpen && (
              <div className="profile-menu">
                <button onClick={() => { setAboutOpen(true); setProfileOpen(false); }}><CircleUserRound size={16} />About this account</button>
                <button
                  onClick={() => {
                    if (window.confirm('Restore the synthetic data in this demo?')) {
                      resetDemo();
                    }
                  }}
                >
                  <RotateCcw size={16} />Restore demo
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="app-main">
        <header className="mobile-topbar">
          <span className="mobile-brand"><AppMark compact /><strong>Mappi</strong></span>
          <button className="avatar" onClick={() => setAboutOpen(true)} aria-label="About the demo">MC</button>
        </header>
        {view === 'home' && renderHome()}
        {view === 'maps' && (showEditor ? renderEditor() : renderMapLibrary())}
        {view === 'tasks' && renderTasks()}
        {view === 'agenda' && renderAgenda()}
        {view === 'apps' && renderApps()}
      </main>

      {aboutOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setAboutOpen(false)}>
          <section className="about-modal" role="dialog" aria-modal="true" aria-labelledby="about-title">
            <header><AppMark /><button className="icon-button subtle" onClick={() => setAboutOpen(false)} aria-label="Close"><X size={18} /></button></header>
            <span className="demo-badge">Independent public case study</span>
            <h2 id="about-title">A safe, public Mappi demo.</h2>
            <p>This experience was rebuilt to present the product concept: visual maps that generate tasks, decisions, deadlines, and schedules.</p>
            <ul>
              <li><Check size={15} />Entirely synthetic data</li>
              <li><Check size={15} />Runs locally in the browser</li>
              <li><Check size={15} />No production code, routes, or integrations</li>
            </ul>
            <button className="primary-button full" onClick={() => setAboutOpen(false)}>Explore the demo</button>
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status"><CheckCircle2 size={17} />{toast}</div>}
    </div>
  );
}
