# Conceptual architecture

Mappi separates process design from execution without asking the user to register the same work in multiple modules.

```text
Map
  └─ published snapshot
       └─ run
            ├─ current task
            │    ├─ checklist
            │    ├─ deadline ──→ calendar
            │    ├─ review
            │    └─ decision
            └─ next task
```

## Product contract

1. A map defines the order, type, and requirements of every step.
2. Publishing freezes an executable snapshot of the map.
3. Starting that snapshot creates only the current task.
4. The task completes its requirements and passes through review.
5. Approval records the outcome and releases the next connected step.
6. A decision can continue the main path or route the run through an explicit adjustment branch.
7. The calendar reads task deadlines; it does not maintain a parallel copy of the work.

## Demo implementation

The functional engine is isolated in `app/demo-engine.ts`. When a run starts, its task stores a synthetic snapshot of the published steps and connections, so later edits to the map cannot change an execution already in progress. The interface uses a spatial canvas for design and React state for execution. Maps, positions, connections, and tasks persist only in `localStorage` under a dedicated key.

There is no API, database, authentication, telemetry, or external connection. In a commercial product, persistence, versioning, authorization, auditability, and integrations would be separate services; those components are outside this public case study.
