# Agent Migration Plan: A1 → Project Chatbot + A2 PDF Extraction Shift

## Executive Summary

**Goal:** Refactor the agent suite to better align with user workflows and agent specialization:
- **A1 (Workspace Concierge)** → **Project Intelligence Chatbot**: Move from workspace-wide generalist to project-focused predictor (progress tracking, deadline forecasting, risk analysis)
- **A2 (Task Planner)** → Absorb PDF task extraction (currently A1's responsibility)
- **UI Placement**: Move A1 from global assistant → embed in `/projects` page as contextual chatbot

---

## Part 1: A1 vs A2 — Current State vs Desired State

### **A1: Workspace Concierge (CURRENT)**

#### Role
- Generalist "front door" agent
- Read-only workspace summaries
- Routes to domain agents (A2, A3, A4, A5)
- NOT connected to UI location; global intent

#### Capabilities
- `listProjects`, `listTasks`, `getProjectDetail`, `listNotifications`
- Can answer: "What projects do I have?" "Which tasks are overdue?"
- Rarely produces writes

#### Limitations
- ❌ No predictive analytics
- ❌ No timeline/deadline reasoning
- ❌ No risk/velocity modeling
- ❌ Global scope (not project-centric)
- ❌ Owns PDF extraction (wrong responsibility)

---

### **A1: Project Intelligence Chatbot (DESIRED)**

#### Role
- **Project-focused conversational AI**
- Embedded in `/projects` page
- Analyzes project health, velocity, risk, timeline predictions
- Still hands off writes to A2, but enriches context with forecasting

#### Capabilities (NEW)
- `getProjectProgress` — task completion %, burndown, velocity
- `analyzeProjectRisk` — blockers, dependency analysis, resource gaps
- `predictDeadline` — forecast completion based on velocity/capacity
- `estimateTaskDuration` — infer task effort from collaborator history + priority
- `suggestResourceAllocation` — recommend assignees based on workload

#### Typical Prompts
- "How far along are we on Project X?"
- "Will we hit the March 15 deadline?"
- "Which tasks are at risk?"
- "Who should I assign this to based on current workload?"
- "What's our velocity this month vs last?"

#### Output
- Conversational answers with confidence levels
- Predictions backed by data (velocity, trends, historical patterns)
- Handoff to A2 for writes: "Break this into tasks" → A2 draft plan

---

### **A2: Task Planner (CURRENT)**

#### Role
- Translates goals → task plans
- Draft → Confirm → Apply workflow
- Write execution for task operations

#### Capabilities
- `createTask`, `updateTask`, `updateTaskStatus`, `deleteTask`
- Deduplication, idempotency, ordering

#### Limitations
- ❌ No PDF task extraction (that's A1's job currently)

---

### **A2: Task Planner + PDF Extraction (DESIRED)**

#### Role
- **Task planning + document-driven task generation**
- Pull tasks from descriptions OR from PDF uploads
- Deduplicate across both sources

#### Capabilities (NEW)
- `extractTasksFromPDF` — parse PDF, extract tasks/requirements, generate drafts
- `matchPdfTasksToExisting` — check for duplicates, suggest merges
- All existing task tools + PDF integration

#### Typical Prompts
- "Create tasks from this design doc" (PDF upload)
- "Generate a task plan from project description + this PDF spec"
- "Merge tasks from this PDF with my existing backlog"

#### Implementation Detail
- Move `extractTextFromPdf` from A1's tools to A2's tools
- Update A1 → A2 handoff to include PDF context
- A2 responsible for PDF task generation during Draft phase

---

## Part 2: Comparison Matrix

| Aspect | A1 (Current) | A1 (Desired) | A2 (Current) | A2 (Desired) |
|--------|---|---|---|---|
| **Primary Role** | Workspace navigator | Project intelligence | Task planner | Task planner + PDF |
| **UI Location** | Global (mention anywhere) | `/projects` page sidebar | Routed from A1 | Routed from A1 |
| **Read Tools** | workspace-wide | project-scoped + analytics | project tasks | project tasks |
| **Write Tools** | None (hand off) | None (hand off) | task CRUD | task CRUD |
| **New Tools** | None | progress, risk, predict | None | PDF extraction |
| **Output Type** | Q&A + handoff | Predictive + Q&A | Task plan draft | Task plan draft |
| **PDF Support** | ✅ Owns extraction | ❌ Removed | ❌ None | ✅ Owns extraction |
| **Scope** | Org/all projects | Single project | Single project | Single project |

---

## Part 3: Migration Plan (Step-by-Step)

### **Phase 0: Preparation (No Code Changes)**

**Goal:** Validate the design and get stakeholder alignment.

- [ ] Review this document with team
- [ ] Confirm `/projects` page is ready for A1 chatbot sidebar
- [ ] Audit current A1 usage to identify dependents
- [ ] Set feature flag: `AGENT_A1_CHATBOT_PROJECTS` (default: false)

---

### **Phase 1: A1 Schema & Context Refactor**

**Goal:** Add predictive tools to A1; keep old tools for backward compatibility (dual-mode).

**Tasks:**

1. **Create new read-only tools for A1:**
   - [ ] `getProjectProgress(projectId)`: returns task completion %, velocity trend
   - [ ] `analyzeProjectRisk(projectId)`: identifies blockers, resource gaps
   - [ ] `predictDeadline(projectId, targetDate?)`: forecasts completion
   - [ ] `estimateTaskDuration(taskId)`: effort estimation from history

   **File:** `src/server/agents/tools/a1/analyticsTools.ts`

2. **Update A1 context builder:**
   - [ ] Rename or extend: `src/server/agents/context/a1ContextBuilder.ts`
   - [ ] Add new optional `scope: { projectId }` (currently workspace-wide)
   - [ ] When `projectId` present, load project-scoped analytics
   - [ ] Cache velocity/trends for performance

   **File:** `src/server/agents/context/a1ContextBuilder.ts` (extend)

3. **Update A1 prompts:**
   - [ ] Create `src/server/agents/prompts/a1ProjectChatbotPrompts.ts`
   - [ ] Separate system prompt for project chatbot mode vs workspace mode
   - [ ] Emphasize: "You are a project intelligence advisor. Use analytics to provide predictions."

   **Files:**
   - `src/server/agents/prompts/a1Prompts.ts` (keep for backward compat)
   - `src/server/agents/prompts/a1ProjectChatbotPrompts.ts` (NEW)

4. **Update A1 profile:**
   - [ ] `src/server/agents/profiles/a1WorkspaceConcierge.ts`
   - [ ] Add feature flag check: if `AGENT_A1_CHATBOT_PROJECTS` then use new toolset
   - [ ] Else use old (global workspace) toolset

---

### **Phase 2: A2 PDF Extraction Integration**

**Goal:** Move PDF extraction from A1 → A2; a2ContextBuilder already exists.

**Tasks:**

1. **Move PDF extraction tool to A2:**
   - [ ] Take `extractTextFromPdf` from `src/server/agents/tools/a1/` (if it exists there)
   - [ ] Create `src/server/agents/tools/a2/pdfTools.ts`
   - [ ] Tool signature: `extractAndMatchPdfTasks(projectId, pdfContent, existingTasks)`

   **File:** `src/server/agents/tools/a2/pdfTools.ts` (NEW)

2. **Update A2 context builder:**
   - [ ] `src/server/agents/context/a2ContextBuilder.ts`
   - [ ] Add optional `pdfContent?: string` to context input
   - [ ] Pre-fetch existing tasks to help deduplication

3. **Update A2 schema to include PDF tasks:**
   - [ ] `src/server/agents/schemas/a2TaskPlannerSchemas.ts`
   - [ ] Add field: `sourcePdf?: { filename: string; extractedTasks: ... }`
   - [ ] Tracks where each task came from (PDF vs user intent vs conversation)

4. **Update A2 orchestrator:**
   - [ ] Handle PDF context in `draftTaskPlan()`
   - [ ] If `pdfContent` passed, include it in system prompt
   - [ ] Dedup logic: if task title matches >80%, suggest merge

   **File:** `src/server/agents/orchestrator/agentOrchestrator.ts` (extend)

5. **Update A2 prompts:**
   - [ ] `src/server/agents/prompts/a2Prompts.ts`
   - [ ] Add PDF-specific system prompt section
   - [ ] Example: "If provided a PDF with extracted tasks, cross-reference against existing backlog to avoid duplication"

---

### **Phase 3: UI / API Integration**

**Goal:** Move A1 from global assistant to `/projects` page chatbot; enable PDF upload in task planner (A2).

**Tasks:**

1. **Create A1 chatbot component for `/projects` page:**
   - [ ] `src/components/projects/ProjectIntelligenceChat.tsx`
   - [ ] Input: `projectId`, `userId`
   - [ ] Query: `api.agent.projectChatbot.useQuery({ projectId, message })`
   - [ ] Sidebar placement on `/projects/[id]` (or projects list page)

   **File:** `src/components/projects/ProjectIntelligenceChat.tsx` (NEW)

2. **Add tRPC endpoints for A1 and A2:**
   - [ ] `agent.projectChatbot(projectId, message)` → calls A1 with project scope
   - [ ] `agent.taskPlannerWithPdf(projectId, message, pdfContent)` → calls A2 with PDF
   - [ ] Keep existing `agent.taskPlannerDraft` for text-only input

   **File:** `src/server/api/routers/agent.ts` (extend)

3. **Add PDF upload handler for A2:**
   - [ ] Allow file input in task planner UI
   - [ ] Extract text using existing PDF library (pdfjs or similar)
   - [ ] Pass `pdfContent` to A2 context builder
   - [ ] Show extracted tasks in diff preview

   **File:** `src/components/projects/CreateProjectContainer.tsx` (extend)

4. **Update page routes:**
   - [ ] `/projects` or `/projects/[id]`: embed A1 chatbot sidebar
   - [ ] Task planner: add PDF upload button

---

### **Phase 4: Migration & Cleanup**

**Goal:** Deprecate old A1 workspace mode; move users to new flow.

**Tasks:**

1. **Deprecation:**
   - [ ] Keep old A1 global assistant working for backward compat (feature flag)
   - [ ] Add deprecation notice in UI: "Use project-specific chat on /projects"
   - [ ] Set sunset date (e.g., 2 sprints)

2. **Testing:**
   - [ ] Unit tests for new analytics tools
   - [ ] Unit tests for PDF extraction + dedup logic
   - [ ] Integration tests: A1 projection vs A2 task creation
   - [ ] User acceptance test: ask PM to test chatbot predictions

3. **Documentation:**
   - [ ] Update [`docs/agents/1-workspace-concierge.md`](docs/agents/1-workspace-concierge.md): reflect chatbot role
   - [ ] Update [`docs/agents/2-task-planner.md`](docs/agents/2-task-planner.md): add PDF extraction section
   - [ ] Create migration guide for developers

---

## Part 4: API Design Examples

### **A1: Project Chatbot Endpoint**

```typescript
// src/server/api/routers/agent.ts

projectChatbot: protectedProcedure
  .input(
    z.object({
      projectId: z.number(),
      message: z.string(),
    })
  )
  .query(async ({ ctx, input }) => {
    // 1. Fetch project + analytics
    const project = await getProject(input.projectId, ctx.session.user.id);
    const analytics = await buildProjectAnalytics(project.id);
    
    // 2. Build A1 context with project scope
    const contextPack = await buildA1Context(ctx, {
      projectId: input.projectId,
      analyticsData: analytics,
    });
    
    // 3. Call A1 with project chatbot prompt
    const response = await chatCompletion({
      messages: [
        { role: "system", content: getA1ProjectChatbotPrompt(contextPack) },
        { role: "user", content: input.message },
      ],
    });
    
    return {
      answer: response.content,
      confidence: 0.85, // based on data freshness
      predictions: extractPredictions(response.content),
    };
  })
```

### **A2: Task Planner with PDF**

```typescript
// src/server/api/routers/agent.ts

taskPlannerWithPdf: protectedProcedure
  .input(
    z.object({
      projectId: z.number(),
      message: z.string(),
      pdfContent: z.string().optional(), // base64 or raw text
    })
  )
  .query(async ({ ctx, input }) => {
    // 1. Extract tasks from PDF if provided
    let extractedTasks = [];
    if (input.pdfContent) {
      extractedTasks = await extractTasksFromPdf(input.pdfContent);
    }
    
    // 2. Build A2 context with PDF
    const contextPack = await buildA2Context(ctx, {
      projectId: input.projectId,
      pdfContent: input.pdfContent,
      extractedTasks,
    });
    
    // 3. Call A2 with PDF-aware prompt
    const draftPlan = await agentOrchestrator.draftTaskPlan({
      ctx,
      input: {
        message: input.message,
        scope: { projectId: input.projectId },
      },
      pdfContext: { extractedTasks, sourcePdf: input.pdfContent },
    });
    
    return {
      draftId: draftPlan.draftId,
      plan: draftPlan.plan,
      pdfMatches: matchPdfToExisting(extractedTasks, draftPlan.plan.creates),
    };
  })
```

---

## Part 5: Data Models & Implementations

### **A1 Analytics Tools**

```typescript
// src/server/agents/tools/a1/analyticsTools.ts

interface ProjectAnalytics {
  taskCompletion: {
    total: number;
    completed: number;
    percentage: number;
  };
  velocity: {
    thisWeek: number;
    lastWeek: number;
    trend: "up" | "down" | "stable";
  };
  dueSoon: Task[];
  blockers: Task[];
  riskScore: number; // 0-100
}

export const getProjectProgress: A1Tool<...> = {
  name: "getProjectProgress",
  inputSchema: z.object({ projectId: z.number() }),
  outputSchema: z.object({ ... }),
  async execute(ctx, input) {
    const tasks = await ctx.db.select().from(tasks).where(eq(tasks.projectId, input.projectId));
    const completed = tasks.filter(t => t.status === "completed").length;
    return {
      total: tasks.length,
      completed,
      percentage: (completed / tasks.length) * 100,
    };
  },
};

export const predictDeadline: A1Tool<...> = {
  name: "predictDeadline",
  inputSchema: z.object({ projectId: z.number(), targetDate: z.string().optional() }),
  outputSchema: z.object({ estimatedCompletion: z.string(), confidence: z.number() }),
  async execute(ctx, input) {
    // Fetch velocity (tasks/week)
    // Fetch remaining tasks
    // Calculate: remainingTasks / velocity = weeks remaining
    // Return: today + weeks_remaining
    const velocity = await calculateVelocity(input.projectId);
    const remaining = await countRemainingTasks(input.projectId);
    const weeksNeeded = remaining / velocity;
    const estimatedDate = addWeeks(new Date(), weeksNeeded);
    
    return {
      estimatedCompletion: estimatedDate.toISOString(),
      confidence: velocity > 0 ? 0.8 : 0.3, // lower confidence if no historical data
    };
  },
};
```

### **A2 PDF Tool**

```typescript
// src/server/agents/tools/a2/pdfTools.ts

export const extractTasksFromPdf: A2Tool<...> = {
  name: "extractTasksFromPdf",
  inputSchema: z.object({
    projectId: z.number(),
    pdfContent: z.string(), // text extracted from PDF
  }),
  outputSchema: z.object({
    extractedTasks: z.array(z.object({
      title: z.string(),
      description: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      sourceLine: z.number(), // line number in PDF for traceability
    })),
  }),
  async execute(ctx, input) {
    // 1. Parse PDF text into task-like bullets/headings
    const parsed = parseTasksFromText(input.pdfContent);
    
    // 2. Cross-reference with existing tasks
    const existing = await ctx.db.select().from(tasks).where(eq(tasks.projectId, input.projectId));
    const deduped = deduplicateTasks(parsed, existing);
    
    return {
      extractedTasks: deduped.map(t => ({
        title: t.title,
        description: t.description,
        priority: inferencePriority(t), // infer from context
        sourceLine: t.line,
      })),
    };
  },
};
```

---

## Part 6: Testing Strategy

### **A1 Chatbot Tests**

```typescript
// e.g., tests/agents/a1ProjectChatbot.test.ts

test("A1 predicts deadline correctly", async () => {
  const project = await createTestProject(5, "completed", 5, "todo");
  // 5 tasks done, 5 remaining = 0.5 tasks/day velocity
  
  const response = await api.agent.projectChatbot({
    projectId: project.id,
    message: "When will this be done?",
  });
  
  expect(response.predictions[0].estimatedDate).toBeWithin(10, 20); // 10-20 days
  expect(response.confidence).toBeGreaterThan(0.7);
});

test("A1 identifies blockers", async () => {
  const project = await createTestProject();
  const blocker = await createTestTask(project.id, { status: "blocked" });
  
  const response = await api.agent.projectChatbot({
    projectId: project.id,
    message: "Any blockers?",
  });
  
  expect(response.answer).toContain(blocker.title);
});
```

### **A2 PDF Tests**

```typescript
// e.g., tests/agents/a2PdfExtraction.test.ts

test("A2 extracts tasks from PDF", async () => {
  const pdfText = `
    # Project Spec
    - Design API endpoints
    - Implement authentication
    - Write tests
  `;
  
  const response = await api.agent.taskPlannerWithPdf({
    projectId: testProject.id,
    message: "Create tasks from this spec",
    pdfContent: pdfText,
  });
  
  expect(response.plan.creates).toHaveLength(3);
  expect(response.plan.creates[0].title).toContain("API");
});

test("A2 deduplicates PDF tasks with existing tasks", async () => {
  const existing = await createTestTask(testProject.id, { title: "Design API" });
  const pdfText = "- Design API endpoints"; // same task
  
  const response = await api.agent.taskPlannerWithPdf({
    projectId: testProject.id,
    message: "Create tasks from spec",
    pdfContent: pdfText,
  });
  
  expect(response.pdfMatches[0]).toMatchObject({
    pdfTask: "Design API endpoints",
    existingTask: existing.id,
    similarity: ">0.8",
    action: "merge",
  });
});
```

---

## Part 7: Implementation Timeline & Effort

| Phase | Tasks | Effort | Timeline |
|-------|-------|--------|----------|
| **Phase 0** | Design review, stakeholder alignment | 1 dev-day | Week 1 |
| **Phase 1** | A1 analytics tools + context + prompts | 5 dev-days | Week 2-3 |
| **Phase 2** | A2 PDF extraction + schema updates | 3 dev-days | Week 3-4 |
| **Phase 3** | UI components + API endpoints | 4 dev-days | Week 4-5 |
| **Phase 4** | Testing, docs, deprecation cleanup | 3 dev-days | Week 5-6 |
| **Total** | | ~16 dev-days | ~6 weeks |

---

## Part 8: Success Metrics

- [ ] **A1 Chatbot**: Users ask 20+ prediction questions in Week 1 of launch
- [ ] **A1 Accuracy**: Deadline prediction ±3 days for 80% of projects
- [ ] **A2 PDF**: Extract ≥90% of tasks from typical spec PDFs
- [ ] **Dedup Rate**: PDF tasks matched to existing tasks >70% (less noise)
- [ ] **User Satisfaction**: Chatbot NPS >7/10 in post-launch survey

---

## Part 9: Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| A1 predictions inaccurate | Users distrust chatbot | Start with low-confidence caveats; show data sources |
| PDF extraction misses tasks | Incomplete plans | Manual review + feedback loop; allow user edits |
| Duplication logic too aggressive | Merge wrong tasks | Show match confidence + preview before apply |
| Context size explodes | Token overflow, slowness | Implement task sampling; cache analytics |

---

## Appendix: File Structure Summary

```
docs/agents/
├── 1-workspace-concierge.md (UPDATE: reflect chatbot role)
├── 2-task-planner.md (UPDATE: add PDF section)
├── plans/
│   ├── 0-agent-migration-a1-a2-refactor.md (THIS FILE)
│   ├── 1-workspace-concierge-implementation-plan.md
│   └── 2-task-planner-implementation-plan.md (UPDATE: add PDF tasks)

src/server/agents/
├── tools/
│   ├── a1/
│   │   ├── readTools.ts (KEEP)
│   │   └── analyticsTools.ts (NEW)
│   ├── a2/
│   │   ├── readTools.ts (KEEP)
│   │   ├── writeTools.ts (KEEP)
│   │   └── pdfTools.ts (NEW)
├── prompts/
│   ├── a1Prompts.ts (KEEP for compat)
│   ├── a1ProjectChatbotPrompts.ts (NEW)
│   └── a2Prompts.ts (EXTEND)
├── profiles/
│   └── a1WorkspaceConcierge.ts (UPDATE: feature flag)
├── context/
│   ├── a1ContextBuilder.ts (EXTEND: project scope)
│   └── a2ContextBuilder.ts (EXTEND: PDF context)
└── orchestrator/
    └── agentOrchestrator.ts (EXTEND: PDF endpoint)

src/components/projects/
├── ProjectIntelligenceChat.tsx (NEW)
└── CreateProjectContainer.tsx (EXTEND: PDF upload)

src/server/api/routers/
└── agent.ts (ADD: projectChatbot, taskPlannerWithPdf endpoints)
```

---

## Sign-Off

- **Proposed by:** [Your name]
- **Reviewed by:** [Team lead]
- **Status:** Pending approval
- **Target launch:** [Date]
