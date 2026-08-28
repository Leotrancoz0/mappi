import assert from 'node:assert/strict';
import {
  advanceTask,
  canSendToReview,
  canCompleteTask,
  cloneTemplate,
  createTask,
  flowTemplates,
  sendTaskToReview,
  startTask,
  toggleChecklist,
} from '../app/demo-engine.ts';

const baseDate = new Date('2026-08-27T12:00:00.000Z');
const steps = cloneTemplate(flowTemplates[0]);
let tasks = [createTask(steps[0], 0, flowTemplates[0].name, 'task-1', baseDate)];

assert.equal(tasks.length, 1);
assert.equal(tasks[0].status, 'todo');
assert.equal(canCompleteTask(tasks[0]), false);

tasks = startTask(tasks, 'task-1');
tasks = toggleChecklist(tasks, 'task-1', 0);
tasks = toggleChecklist(tasks, 'task-1', 1);
assert.equal(canSendToReview(tasks[0]), true);
assert.equal(canCompleteTask(tasks[0]), false);
tasks = sendTaskToReview(tasks, 'task-1');
assert.equal(tasks[0].status, 'review');
assert.equal(canCompleteTask(tasks[0]), true);

let advanced = advanceTask({
  tasks,
  taskId: 'task-1',
  steps,
  flowName: flowTemplates[0].name,
  nextId: 'task-2',
  baseDate,
});
assert.equal(advanced.tasks.length, 2);
assert.equal(advanced.tasks[0].status, 'done');
assert.equal(advanced.tasks[1].kind, 'decision');

tasks = startTask(advanced.tasks, 'task-2');
tasks = sendTaskToReview(tasks, 'task-2');
advanced = advanceTask({
  tasks,
  taskId: 'task-2',
  steps,
  flowName: flowTemplates[0].name,
  nextId: 'task-adjust',
  outcome: 'adjust',
  baseDate,
});
assert.equal(advanced.tasks.filter((task) => task.id === 'task-adjust').length, 1);
assert.equal(advanced.tasks.at(-1)?.resumeAt, 2);

const unchanged = advanceTask({
  tasks: advanced.tasks,
  taskId: 'task-adjust',
  steps,
  flowName: flowTemplates[0].name,
  nextId: 'should-not-exist',
  baseDate,
});
assert.equal(unchanged.tasks.length, advanced.tasks.length);

const snapshotSteps = cloneTemplate(flowTemplates[0]);
const snapshot = {
  runId: 'run-snapshot',
  steps: snapshotSteps,
  connections: [
    {
      source: snapshotSteps[0].id,
      target: snapshotSteps[2].id,
      outcome: 'approve' as const,
    },
  ],
};
let snapshotTasks = [
  createTask(
    snapshotSteps[0],
    0,
    flowTemplates[0].name,
    'snapshot-task',
    baseDate,
    snapshot,
  ),
];
snapshotSteps[2].title = 'Title changed after publication';
snapshotTasks = startTask(snapshotTasks, 'snapshot-task');
snapshotTasks = toggleChecklist(snapshotTasks, 'snapshot-task', 0);
snapshotTasks = toggleChecklist(snapshotTasks, 'snapshot-task', 1);
snapshotTasks = sendTaskToReview(snapshotTasks, 'snapshot-task');
const frozenAdvance = advanceTask({
  tasks: snapshotTasks,
  taskId: 'snapshot-task',
  steps: snapshotSteps,
  flowName: flowTemplates[0].name,
  nextId: 'snapshot-next',
  baseDate,
});
assert.equal(frozenAdvance.tasks.at(-1)?.stepId, 'pedido-aprovar');
assert.equal(frozenAdvance.tasks.at(-1)?.title, 'Approve preparation');

const lockedDecisionSnapshot = {
  runId: 'run-locked-decision',
  steps: cloneTemplate(flowTemplates[0]),
  connections: [
    {
      source: 'pedido-decidir',
      target: 'pedido-aprovar',
      outcome: 'approve' as const,
    },
  ],
};
let lockedDecisionTasks = [
  createTask(
    lockedDecisionSnapshot.steps[1],
    1,
    flowTemplates[0].name,
    'locked-decision',
    baseDate,
    lockedDecisionSnapshot,
  ),
];
lockedDecisionTasks = startTask(lockedDecisionTasks, 'locked-decision');
lockedDecisionTasks = sendTaskToReview(lockedDecisionTasks, 'locked-decision');
const unavailableAdjustment = advanceTask({
  tasks: lockedDecisionTasks,
  taskId: 'locked-decision',
  steps: lockedDecisionSnapshot.steps,
  connections: lockedDecisionSnapshot.connections,
  flowName: flowTemplates[0].name,
  nextId: 'must-not-exist',
  outcome: 'adjust',
  baseDate,
});
assert.equal(unavailableAdjustment.tasks.length, 1);
assert.equal(unavailableAdjustment.tasks[0].status, 'review');

console.log(JSON.stringify({
  status: 'ok',
  scenarios: 7,
  checks: [
    'task starts in todo',
    'checklist gates completion',
    'ready task moves through review',
    'completion creates the next step once',
    'decision adjustment creates a task without skipping the flow',
    'published snapshot freezes content and connected path',
    'unpublished decision outcome cannot invent a task',
  ],
}));
