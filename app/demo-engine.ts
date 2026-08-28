export type StepKind = 'task' | 'decision' | 'approval' | 'interconnection';
export type DemoApp = 'none' | 'forms' | 'files' | 'messages';
export type TaskStatus = 'todo' | 'doing' | 'review' | 'done';
export type DecisionOutcome = 'approve' | 'adjust';

export interface FlowStep {
  id: string;
  kind: StepKind;
  title: string;
  app: DemoApp;
  checklist: string[];
  targetMap?: string;
}

export interface FlowConnection {
  source: string;
  target: string;
  outcome?: DecisionOutcome;
}

export interface FlowSnapshot {
  runId: string;
  steps: FlowStep[];
  connections: FlowConnection[];
}

export interface DemoTask {
  id: string;
  stepId: string;
  stepIndex: number;
  flowName: string;
  title: string;
  kind: StepKind;
  app: DemoApp;
  status: TaskStatus;
  checklist: Array<{ label: string; done: boolean }>;
  due: string;
  resumeAt?: number;
  outcome?: DecisionOutcome;
  runId?: string;
  flowSnapshot?: FlowSnapshot;
}

export interface FlowTemplate {
  id: string;
  label: string;
  name: string;
  steps: FlowStep[];
}

const dayInMs = 86_400_000;

function addDaysISO(base: Date, days: number) {
  const date = new Date(base.getTime() + days * dayInMs);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
}

export const flowTemplates: FlowTemplate[] = [
  {
    id: 'pedido',
    label: 'Aprovar pedido',
    name: 'Aprovar novo pedido',
    steps: [
      {
        id: 'pedido-conferir',
        kind: 'task',
        title: 'Conferir solicitação',
        app: 'forms',
        checklist: ['Dados essenciais conferidos', 'Prazo confirmado'],
      },
      {
        id: 'pedido-decidir',
        kind: 'decision',
        title: 'Pedido pode seguir?',
        app: 'none',
        checklist: [],
      },
      {
        id: 'pedido-aprovar',
        kind: 'approval',
        title: 'Liberar preparação',
        app: 'messages',
        checklist: ['Condições revisadas'],
      },
      {
        id: 'pedido-preparar',
        kind: 'task',
        title: 'Preparar entrega',
        app: 'files',
        checklist: ['Documento anexado', 'Responsável avisado'],
      },
    ],
  },
  {
    id: 'cliente',
    label: 'Novo cliente',
    name: 'Receber novo cliente',
    steps: [
      {
        id: 'cliente-receber',
        kind: 'task',
        title: 'Receber informações',
        app: 'forms',
        checklist: ['Contato validado', 'Objetivo registrado'],
      },
      {
        id: 'cliente-aprovar',
        kind: 'approval',
        title: 'Validar atendimento',
        app: 'messages',
        checklist: ['Escopo confirmado'],
      },
      {
        id: 'cliente-organizar',
        kind: 'task',
        title: 'Organizar arquivos',
        app: 'files',
        checklist: ['Pasta criada', 'Materiais reunidos'],
      },
    ],
  },
  {
    id: 'conteudo',
    label: 'Publicar conteúdo',
    name: 'Publicar novo conteúdo',
    steps: [
      {
        id: 'conteudo-criar',
        kind: 'task',
        title: 'Preparar conteúdo',
        app: 'files',
        checklist: ['Texto revisado', 'Imagem selecionada'],
      },
      {
        id: 'conteudo-decidir',
        kind: 'decision',
        title: 'Conteúdo está pronto?',
        app: 'none',
        checklist: [],
      },
      {
        id: 'conteudo-aprovar',
        kind: 'approval',
        title: 'Aprovar publicação',
        app: 'messages',
        checklist: ['Data confirmada'],
      },
    ],
  },
];

export function cloneTemplate(template: FlowTemplate): FlowStep[] {
  return template.steps.map((step) => ({
    ...step,
    checklist: [...step.checklist],
  }));
}

export function createTask(
  step: FlowStep,
  stepIndex: number,
  flowName: string,
  id: string,
  baseDate = new Date(),
  snapshot?: FlowSnapshot,
): DemoTask {
  return {
    id,
    stepId: step.id,
    stepIndex,
    flowName,
    title: step.title,
    kind: step.kind,
    app: step.app,
    status: 'todo',
    checklist: step.checklist.map((label) => ({ label, done: false })),
    due: addDaysISO(baseDate, stepIndex + 1),
    ...(snapshot
      ? {
          runId: snapshot.runId,
          flowSnapshot: {
            runId: snapshot.runId,
            steps: cloneTemplate({ id: snapshot.runId, label: flowName, name: flowName, steps: snapshot.steps }),
            connections: snapshot.connections.map((connection) => ({ ...connection })),
          },
        }
      : {}),
  };
}

export function startTask(tasks: DemoTask[], taskId: string): DemoTask[] {
  return tasks.map((task) =>
    task.id === taskId && task.status === 'todo'
      ? { ...task, status: 'doing' }
      : task,
  );
}

export function toggleChecklist(
  tasks: DemoTask[],
  taskId: string,
  checklistIndex: number,
): DemoTask[] {
  return tasks.map((task) => {
    if (task.id !== taskId || task.status !== 'doing') return task;
    return {
      ...task,
      checklist: task.checklist.map((item, index) =>
        index === checklistIndex ? { ...item, done: !item.done } : item,
      ),
    };
  });
}

export function canSendToReview(task: DemoTask) {
  return task.status === 'doing' && task.checklist.every((item) => item.done);
}

export function sendTaskToReview(tasks: DemoTask[], taskId: string): DemoTask[] {
  return tasks.map((task) =>
    task.id === taskId && canSendToReview(task)
      ? { ...task, status: 'review' }
      : task,
  );
}

export function canCompleteTask(task: DemoTask) {
  return task.status === 'review';
}

export function advanceTask({
  tasks,
  taskId,
  steps,
  flowName,
  nextId,
  outcome = 'approve',
  baseDate = new Date(),
  connections,
}: {
  tasks: DemoTask[];
  taskId: string;
  steps: FlowStep[];
  flowName: string;
  nextId: string;
  outcome?: DecisionOutcome;
  baseDate?: Date;
  connections?: FlowConnection[];
}): { tasks: DemoTask[]; nextTaskId?: string; complete: boolean } {
  const current = tasks.find((task) => task.id === taskId);
  if (!current || !canCompleteTask(current)) {
    return { tasks, complete: false };
  }

  const executionSteps = current.flowSnapshot?.steps ?? steps;
  const executionConnections = current.flowSnapshot?.connections ?? connections;
  const outgoing = executionConnections?.filter((connection) => connection.source === current.stepId) ?? [];
  const connected = outgoing.find((connection) => connection.outcome === outcome)
    ?? (outcome === 'approve'
      ? outgoing.find((connection) => connection.outcome === undefined)
      : undefined);
  if (
    current.kind === 'decision'
    && outcome === 'adjust'
    && executionConnections !== undefined
    && !connected
  ) {
    return { tasks, complete: false };
  }
  const completed = tasks.map((task) =>
    task.id === taskId
      ? { ...task, status: 'done' as const, outcome }
      : task,
  );
  const connectedIndex = connected && connected.target !== 'end'
    ? executionSteps.findIndex((step) => step.id === connected.target)
    : -1;
  const nextIndex = connectedIndex >= 0
    ? connectedIndex
    : current.resumeAt ?? current.stepIndex + 1;

  if (connected?.target === 'end') {
    return { tasks: completed, complete: true };
  }

  if (current.kind === 'decision' && outcome === 'adjust' && connectedIndex < 0) {
    const adjustment: DemoTask = {
      id: nextId,
      stepId: `${current.stepId}-adjustment`,
      stepIndex: current.stepIndex,
      flowName,
      title: 'Ajustar antes de seguir',
      kind: 'task',
      app: 'forms',
      status: 'todo',
      checklist: [
        { label: 'Ajuste realizado', done: false },
        { label: 'Informações reconferidas', done: false },
      ],
      due: addDaysISO(baseDate, nextIndex + 1),
      resumeAt: nextIndex,
      runId: current.runId,
      flowSnapshot: current.flowSnapshot,
    };
    return {
      tasks: [...completed, adjustment],
      nextTaskId: adjustment.id,
      complete: false,
    };
  }

  const nextStep = executionSteps[nextIndex];
  if (!nextStep) return { tasks: completed, complete: true };

  const nextTask = createTask(
    nextStep,
    nextIndex,
    flowName,
    nextId,
    baseDate,
    current.flowSnapshot,
  );
  return {
    tasks: [...completed, nextTask],
    nextTaskId: nextTask.id,
    complete: false,
  };
}
