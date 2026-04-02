# Agents UI Implementation Plan

**Goal:** Implement a unified, cohesive UI for Agent A1 (Project Intelligence Chatbot) and Agent A2 (Task Planner) that matches the visual design language and component patterns established in the Settings/Appearance page.

**Target:** All agent UIs (chatbots, panels, dialogs, forms) should feel like native extensions of the KAIROS design system.

---

## Part 1: Design System Audit & Foundation

### 1.1 Current Design System (from AppearanceSettings.tsx & globals.css)

#### Color Palette (CSS Variables)

**Background Colors:**
```css
--bg-primary: 252 253 255;      /* Main background */
--bg-secondary: 248 250 252;    /* Secondary containers */
--bg-tertiary: 241 245 249;     /* Tertiary element backgrounds */
--bg-elevated: 253 254 255;     /* Elevated surface (modals, popovers) */
--bg-surface: 250 251 253;      /* Surface containers (panels, cards) */
--bg-overlay: 253 254 255;      /* Overlay backgrounds */
```

**Text Colors:**
```css
--fg-primary: 15 23 42;         /* Main text */
--fg-secondary: 71 85 105;      /* Secondary text */
--fg-tertiary: 100 116 139;     /* Tertiary/muted text */
--fg-quaternary: 148 163 184;   /* Quaternary/disabled text */
```

**Accent Colors (Theme-driven, defaults to purple):**
```css
--accent-primary: 150 107 157;      /* Main accent (purple) */
--accent-secondary: 178 134 186;    /* Accent secondary */
--accent-tertiary: 209 185 214;     /* Accent tertiary */
--accent-hover: 132 92 138;         /* Accent darker state */
--accent-glow: 178 134 186;         /* Accent glow/shadow */
```

**Brand Palette (6 fixed accent options):**
```css
--brand-purple: 150 107 157;        /* #966B9D */
--brand-pink: 213 145 145;          /* #D59191 */
--brand-caramel: 233 168 108;       /* #E9A86C */
--brand-mint: 95 180 156;           /* #5FB49C */
--brand-sky: 39 111 191;            /* #276FBF */
--brand-strawberry: 240 58 71;      /* #F03A47 */
```

**Semantic Colors:**
```css
--success: 34 197 94;
--warning: 251 146 60;
--error: 239 68 68;
--info: 59 130 246;
```

**Borders:**
```css
--border-light: 200 200 200;
--border-medium: 203 213 225;
--border-strong: 148 163 184;
```

**Shadows:**
```css
--shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
--shadow-accent: 0 10px 25px -5px rgb(var(--accent-primary) / 0.3);
```

#### Typography

**Font Families (from tailwind.config.js):**
```
--font-sans: Geist Sans (system UI font)
--font-display: Display font (headers)
--font-faustina: Serif (decorative)
--font-newsreader: Serif (body)
```

**Font Sizing & Spacing (inferred from settings components):**
- Header 1: `text-[34px] font-[700]` leading `[1.1]`
- Header 2: `text-[17px] font-[490-590]` leading `[1.235]`
- Body: `text-[15px] font-[400]` leading `[1.4667]`
- Caption: `text-[13px] font-[400]` leading `[1.3846]`
- Small: `text-[12px]`

**Letter Spacing:**
- Headers: `tracking-[-0.022em]` (tighter)
- Subheaders: `tracking-[-0.016em]`
- Body: `tracking-[-0.01em]` to `tracking-[-0.012em]`
- Captions: `tracking-[-0.006em]`

#### Component Patterns (from AppearanceSettings.tsx)

**Container Pattern:**
```
kairos-bg-surface + rounded-[10px] + overflow-hidden + kairos-section-border
```

**Section Container:**
```tsx
<div className="kairos-bg-surface rounded-[10px] overflow-hidden kairos-section-border">
  {/* list items, options, etc */}
</div>
```

**Button/Option Item Pattern:**
```tsx
<button className="w-full flex items-center justify-between pl-[16px] pr-[18px] py-[11px] active:kairos-active-state transition-colors duration-200">
  <div className="flex items-center gap-[13px]">
    <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center`}>
      <Icon size={18} />
    </div>
    <span className="text-[17px]">{label}</span>
  </div>
  {isActive && <Check size={20} />}
</button>
```

**Divider Pattern:**
```tsx
<div className="absolute bottom-0 left-[59px] right-0 h-[0.33px] kairos-divider" />
```

**Custom Tailwind Classes (from globals.css):**
```css
.kairos-bg-surface { @apply bg-bg-surface; }
.kairos-fg-primary { @apply text-fg-primary; }
.kairos-accent-primary { @apply text-accent-primary; }
.kairos-section-border { @apply border border-border-medium; }
.kairos-divider { @apply bg-border-medium; }
.kairos-active-state { @apply bg-accent-primary/10; }
.kairos-font-body { /* typography base */ }
.kairos-font-display { /* display typography */ }
.kairos-font-caption { /* caption typography */ }
```

---

## Part 2: Agent UI Component Architecture

### 2.1 Component Hierarchy

```
WorkspaceChatbot (A1 Global Chat - Full Page)
├── ChatContainer              (Full-page overlay/modal)
├── ChatHeader                 (Title + close button)
├── ChatMessages               (Message list, full width)
│   ├── MessageBubble          (Human / AI message)
│   ├── MessageTyping          (Loading indicator)
│   └── WorkspaceContextCard   (Org/workspace data)
├── ChatInput                  (Input field + send)
├── QuickActions               (Suggestion pills for workspace Q&A)
└── OpenButtonTrigger          (Floating button accessible from any page)

ProjectIntelligenceChat (A1 Project Chatbot)
├── ChatContainer              (Sidebar panel)
├── ChatMessages               (Message list)
│   ├── MessageBubble          (Human / AI message)
│   ├── MessageTyping          (Loading indicator)
│   └── ContextCard            (Project data inline)
├── ChatInput                  (Input field + send)
├── QuickActions               (Suggestion pills)
└── DataVisualization          (Charts/metrics inline)

TaskPlannerDraft (A2 Panel)
├── DraftHeader                (Plan summary)
├── TaskPlanGrid               (Creates/Updates/Deletes)
│   ├── TaskCreateCard         (New task)
│   ├── TaskUpdateCard         (Modified task)
│   ├── TaskDeleteCard         (Deleted task)
│   └── PdfMatches             (PDF deduplication)
├── RiskAssessment             (Warnings/blockers)
├── ConfirmActions             (Confirm/Cancel buttons)
└── IndexCard                  (Task metadata)

AgentPanel (Generic container)
├── PanelHeader                (Title + close)
├── PanelContent               (Main area)
├── PanelFooter                (Actions)
└── PanelOverlay               (Backdrop + animation)
```

### 2.2 Styling Principles

**1. Surface Elevation:**
- Base: `kairos-bg-primary` (page background)
- Elevated: `kairos-bg-surface` (panels, containers)
- High: `kairos-bg-elevated` (modals, popovers)

**2. Typography Hierarchy:**
- Section title: `text-[34px] font-[700] kairos-font-display kairos-fg-primary` (rarely in agents)
- Item label: `text-[17px] font-[490] kairos-fg-primary`
- Item sublabel: `text-[13px] kairos-fg-tertiary`
- Inline text: `text-[15px] kairos-fg-primary`

**3. Spacing:**
- Tight spacing: `gap-[8px]` (icons in buttons)
- Standard spacing: `gap-[13px]` (icon + label)
- Section spacing: `mb-[8px]` (within container)
- Container spacing: `mb-[16px]` (between containers)
- Padding: `p-[16px]` (container padding)

**4. Border Radius:**
- Small buttons: `rounded-full` (circular icons)
- Containers: `rounded-[10px]` (panels, cards)
- Modals: `rounded-[12px]` (dialog boxes)

**5. Transitions:**
- Color transitions: `transition-colors duration-200`
- All transitions: `transition-all duration-200`
- No transition on mount (avoid jank)

**6. States:**
- Active: `.active:kairos-active-state` (bg with accent color at 10% opacity)
- Hover: Smoothly transition to secondary color
- Disabled: `opacity-50 cursor-not-allowed`
- Loading: Subtle skeleton or spinner

---

## Part 3: Detailed Agent UI Components

### 3.0 WorkspaceChatbot Component (Global AI Assistant)

**Purpose:** Workspace-wide chatbot accessible from any page. Full-page or modal experience where users can ask questions about their workspace, projects, tasks, org activity, and get predictions/insights across the entire workspace.

**File:** `src/components/agents/WorkspaceChatbot.tsx`

**Placement:**
- Floating trigger button (FAB) in bottom-right corner, accessible on every page
- Opens full-page modal or slide-in panel (toggleable)
- Can be minimized/closed without losing chat history (within session)

**Structure:**
```tsx
export function WorkspaceChatbot({ isOpen, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const chatQuery = api.agent.workspaceChatbot.useQuery(
    { message: input, context: 'workspace' },
    { enabled: false }
  );
  
  // Handle send, manage history, render full-page chat UI
  return (/* Full-page or modal chatbot */)
}
```

**Layout (Full Page):**
```tsx
<div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50">
  {/* Modal Panel */}
  <div className="fixed inset-y-0 right-0 sm:inset-0 sm:flex sm:items-center sm:justify-center w-full sm:w-auto">
    <div className="bg-bg-primary h-full sm:rounded-[16px] sm:shadow-2xl sm:max-w-[600px] sm:h-[80vh] flex flex-col">
      
      {/* Header */}
      <div className="px-[16px] py-[12px] border-b border-border-medium flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-[700] kairos-fg-primary">
            Workspace Assistant
          </h2>
          <p className="text-[12px] kairos-fg-tertiary mt-[2px]">
            Ask anything about your workspace
          </p>
        </div>
        <button onClick={onClose} className="p-[8px] hover:bg-bg-secondary rounded-[8px]">
          <X size={20} className="kairos-fg-secondary" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-[16px] space-y-[12px]">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && <TypingIndicator />}
      </div>

      {/* Input */}
      <div className="px-[16px] py-[12px] border-t border-border-medium">
        <ChatInput 
          onSend={handleSend} 
          placeholder="Ask about your projects, tasks, org..." 
        />
      </div>
    </div>
  </div>
</div>
```

#### 3.0.1 WorkspaceChatbot Trigger Button (FAB)

**Floating Action Button - accessible from any page:**

```tsx
// src/components/agents/WorkspaceChatbotTrigger.tsx

export function WorkspaceChatbotTrigger() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-[24px] right-[24px] w-[56px] h-[56px] rounded-full bg-accent-primary text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 flex items-center justify-center z-40"
        aria-label="Open workspace assistant"
      >
        <MessageCircle size={24} strokeWidth={2} />
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <WorkspaceChatbot 
          isOpen={isOpen} 
          onClose={() => setIsOpen(false)} 
        />
      )}
    </>
  );
}
```

**Placement in root layout** (`src/app/layout.tsx`):
```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        {/* Global workspace chatbot trigger */}
        <WorkspaceChatbotTrigger />
      </body>
    </html>
  );
}
```

#### 3.0.2 WorkspaceContextCard Component

**Display workspace metrics/context inline:**

```tsx
<div className="kairos-bg-surface kairos-section-border rounded-[10px] p-[12px] mb-[12px]">
  <h4 className="text-[13px] font-[590] kairos-fg-secondary mb-[8px]">
    Your Workspace Overview
  </h4>
  
  <div className="grid grid-cols-2 gap-[8px]">
    <div className="text-center p-[8px] bg-bg-primary rounded-[8px]">
      <div className="text-[20px] font-[700] kairos-fg-primary">
        {stats.projectCount}
      </div>
      <div className="text-[11px] kairos-fg-tertiary">Projects</div>
    </div>
    
    <div className="text-center p-[8px] bg-bg-primary rounded-[8px]">
      <div className="text-[20px] font-[700] kairos-fg-primary">
        {stats.taskCount}
      </div>
      <div className="text-[11px] kairos-fg-tertiary">Tasks</div>
    </div>
    
    <div className="text-center p-[8px] bg-bg-primary rounded-[8px]">
      <div className="text-[20px] font-[700] kairos-fg-primary">
        {stats.completionRate}%
      </div>
      <div className="text-[11px] kairos-fg-tertiary">Completion</div>
    </div>
    
    <div className="text-center p-[8px] bg-bg-primary rounded-[8px]">
      <div className="text-[20px] font-[700] kairos-fg-primary">
        {stats.teamSize}
      </div>
      <div className="text-[11px] kairos-fg-tertiary">Team Members</div>
    </div>
  </div>
</div>
```

#### 3.0.3 QuickActions for Workspace Chat

**Suggestion pills tailored to workspace-level questions:**

```tsx
<div className="flex gap-[8px] flex-wrap mb-[12px]">
  <QuickAction 
    label="What am I behind on?" 
    prompt="What tasks and projects am I behind on this week?"
  />
  <QuickAction 
    label="Org activity summary" 
    prompt="Summarize activity in my organization this week"
  />
  <QuickAction 
    label="Team workload" 
    prompt="Who has the most tasks assigned right now?"
  />
  <QuickAction 
    label="Upcoming events" 
    prompt="What events do I have coming up?"
  />
  <QuickAction 
    label="Risk assessment" 
    prompt="What projects or tasks are at risk?"
  />
</div>
```

#### 3.0.4 API Endpoint for Workspace Chat

**Add to `src/server/api/routers/agent.ts`:**

```typescript
workspaceChatbot: protectedProcedure
  .input(
    z.object({
      message: z.string(),
      context: z.literal('workspace'),
    })
  )
  .query(async ({ ctx, input }) => {
    // 1. Build workspace context (all orgs, projects, tasks user has access to)
    const workspaceContext = await buildWorkspaceContext(ctx);
    
    // 2. Call A1 with workspace scope (NOT project-scoped)
    const response = await chatCompletion({
      messages: [
        { 
          role: "system", 
          content: getA1WorkspacePrompt(workspaceContext) 
        },
        { role: "user", content: input.message },
      ],
      temperature: 0.3,
      maxTokens: 2048,
    });
    
    return {
      answer: response.content,
      confidence: 0.85,
      contextSnapshot: {
        projectCount: workspaceContext.projects.length,
        taskCount: workspaceContext.tasks.length,
        completionRate: calculateCompletionRate(workspaceContext.tasks),
        teamSize: workspaceContext.teamMembers.length,
      },
    };
  })
```

#### 3.0.5 Workspace Context Builder

**Create `src/server/agents/context/workspaceContextBuilder.ts`:**

```typescript
export async function buildWorkspaceContext(
  ctx: TRPCContext
): Promise<WorkspaceContextPack> {
  const userId = ctx.session.user.id;
  
  // 1. Fetch user's organizations
  const orgs = await ctx.db
    .select()
    .from(organizations)
    .innerJoin(
      organizationMembers,
      eq(organizationMembers.organizationId, organizations.id)
    )
    .where(eq(organizationMembers.userId, userId));
  
  // 2. Fetch all projects across orgs
  const projects = await ctx.db
    .select()
    .from(projects)
    .where(
      or(
        eq(projects.createdById, userId),
        inArray(
          projects.organizationId,
          orgs.map(o => o.organizations.id)
        )
      )
    );
  
  // 3. Fetch tasks for those projects
  const tasks = await ctx.db
    .select()
    .from(tasks)
    .where(
      inArray(tasks.projectId, projects.map(p => p.id))
    )
    .limit(100); // Cap for performance
  
  // 4. Fetch team members
  const teamMembers = await ctx.db
    .select()
    .from(users)
    .innerJoin(
      organizationMembers,
      eq(organizationMembers.userId, users.id)
    )
    .where(
      inArray(
        organizationMembers.organizationId,
        orgs.map(o => o.organizations.id)
      )
    );
  
  // 5. Fetch recent activities/notifications
  const recentActivity = await ctx.db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(20);
  
  return {
    userId,
    organizations: orgs.map(o => o.organizations),
    projects,
    tasks,
    teamMembers,
    recentActivity,
    completionRate: calculateCompletionRate(tasks),
    overdueCount: tasks.filter(t => isOverdue(t)).length,
  };
}

interface WorkspaceContextPack {
  userId: string;
  organizations: Organization[];
  projects: Project[];
  tasks: Task[];
  teamMembers: User[];
  recentActivity: Notification[];
  completionRate: number;
  overdueCount: number;
}
```

#### 3.0.6 Workspace Chat System Prompt

**Create `src/server/agents/prompts/a1WorkspacePrompts.ts`:**

```typescript
export function getA1WorkspacePrompt(context: WorkspaceContextPack): string {
  return `You are the KAIROS Workspace Assistant — a compassionate, insightful AI that helps users understand and manage their entire workspace.

## Your Role
- Provide workspace-wide summaries and insights
- Answer questions about projects, tasks, team, and organizational activity
- Help users prioritize and make decisions
- Flag risks and opportunities
- Suggest next actions

## Workspace Context
- **Organizations:** ${context.organizations.map(o => o.name).join(', ')}
- **Total Projects:** ${context.projects.length}
- **Total Tasks:** ${context.tasks.length}
- **Completion Rate:** ${context.completionRate}%
- **Overdue Tasks:** ${context.overdueCount}
- **Team Size:** ${context.teamMembers.length}

## Recent Activity
${context.recentActivity
  .slice(0, 5)
  .map(a => \`- \${a.message} (\${formatDistanceToNow(a.createdAt)} ago)\`)
  .join('\n')}

## Your Guidelines
1. Be conversational and empathetic
2. Provide data-backed answers whenever possible
3. Highlight risks and blockers
4. Suggest concrete next steps
5. Use simple language, avoid jargon
6. If data is incomplete, say so

## Example Interactions
**User:** "What am I behind on?"
**You:** "You have 3 overdue tasks (2 in Project X, 1 in Project Y). The most urgent is [task], due 2 days ago. I'd suggest starting with that one."

**User:** "Who's overloaded right now?"
**You:** "Tom has 14 active tasks, which is 40% more than the team average. Sarah has 5. You might consider redistributing some of Tom's work."
`;
}
```

---

### 3.1 ProjectIntelligenceChat Component

**Purpose:** Sidebar chatbot on `/projects` page for project intelligence Q&A.

**File:** `src/components/agents/ProjectIntelligenceChat.tsx`

**Structure:**
```tsx
export function ProjectIntelligenceChat({ projectId, userId }: Props) {
  // State: messages, loading, input
  // Query: api.agent.projectChatbot({ projectId, message })
  // Render: Chat UI
}
```

**Styling Template:**
```tsx
<div className="w-full h-full flex flex-col bg-bg-primary">
  {/* Header */}
  <div className="px-[16px] py-[12px] border-b border-border-medium">
    <h3 className="text-[17px] font-[590] kairos-fg-primary kairos-font-body">
      Project Intelligence
    </h3>
  </div>

  {/* Messages Area */}
  <div className="flex-1 overflow-y-auto p-[16px] space-y-[12px]">
    {messages.map((msg) => (
      <MessageBubble key={msg.id} message={msg} />
    ))}
  </div>

  {/* Input Area */}
  <div className="px-[16px] py-[12px] border-t border-border-medium">
    <ChatInput onSend={handleSend} />
  </div>
</div>
```

#### 3.1.1 MessageBubble Component

**Human Message:**
```tsx
<div className="flex justify-end mb-[12px]">
  <div className="max-w-[85%] bg-accent-primary text-white rounded-[10px] px-[12px] py-[8px]">
    <p className="text-[15px] leading-[1.4] break-words">
      {message.content}
    </p>
  </div>
</div>
```

**AI Message (with optional data context):**
```tsx
<div className="flex justify-start mb-[12px]">
  <div className="max-w-[85%] kairos-bg-surface kairos-section-border rounded-[10px] px-[12px] py-[8px]">
    <p className="text-[15px] leading-[1.4] kairos-fg-primary break-words">
      {message.content}
    </p>
    {message.confidence && (
      <div className="text-[12px] kairos-fg-tertiary mt-[4px]">
        Confidence: {(message.confidence * 100).toFixed(0)}%
      </div>
    )}
  </div>
</div>
```

#### 3.1.2 QuickActions Component

**Suggestion Pills:**
```tsx
<div className="flex gap-[8px] flex-wrap mb-[12px]">
  {suggestions.map((action) => (
    <button
      key={action.id}
      onClick={() => send(action.prompt)}
      className="px-[12px] py-[6px] text-[13px] rounded-full kairos-bg-tertiary kairos-fg-primary hover:bg-bg-tertiary transition-colors"
    >
      {action.label}
    </button>
  ))}
</div>
```

#### 3.1.3 ContextCard Component

**Inline project metrics display:**
```tsx
<div className="kairos-bg-surface kairos-section-border rounded-[10px] p-[12px] mb-[12px]">
  <div className="flex items-center justify-between mb-[8px]">
    <span className="text-[13px] kairos-fg-secondary">Completion</span>
    <span className="text-[15px] font-[590] kairos-fg-primary">65%</span>
  </div>
  <div className="w-full h-[4px] bg-bg-tertiary rounded-full overflow-hidden">
    <div className="w-[65%] h-full bg-accent-primary" />
  </div>
</div>
```

#### 3.1.4 ChatInput Component

```tsx
<div className="flex gap-[8px] items-end">
  <input
    type="text"
    value={input}
    onChange={(e) => setInput(e.target.value)}
    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
    placeholder="Ask about this project..."
    className="flex-1 px-[12px] py-[8px] rounded-[8px] bg-bg-secondary kairos-fg-primary text-[15px] border border-border-light focus:border-accent-primary focus:outline-none transition-colors"
  />
  <button
    onClick={handleSend}
    disabled={!input.trim()}
    className="px-[12px] py-[8px] bg-accent-primary/10 text-accent-primary rounded-[8px] hover:bg-accent-primary/20 disabled:opacity-50 transition-colors"
  >
    <Send size={18} />
  </button>
</div>
```

---

### 3.2 TaskPlannerDraft Component

**Purpose:** Draft panel for A2 task planning with PDF support.

**File:** `src/components/agents/TaskPlannerDraft.tsx`

**Structure:**
```tsx
export function TaskPlannerDraft({ projectId, draftId, plan }: Props) {
  // State: expanded sections, confirmation state
  // Render: Draft UI with task cards
}
```

**Styling Template:**
```tsx
<div className="w-full bg-bg-primary overflow-y-auto">
  <div className="max-w-[600px] mx-auto px-[16px] py-[16px]">
    {/* Header Summary */}
    <DraftHeader plan={plan} />

    {/* Creates Section */}
    <PlanSection title="New Tasks" count={plan.creates.length}>
      {plan.creates.map((task) => (
        <TaskCreateCard key={task.id} task={task} />
      ))}
    </PlanSection>

    {/* Updates Section */}
    <PlanSection title="Updates" count={plan.updates.length}>
      {plan.updates.map((task) => (
        <TaskUpdateCard key={task.id} task={task} />
      ))}
    </PlanSection>

    {/* PDF Matches */}
    {plan.pdfMatches?.length > 0 && (
      <PlanSection title="Matched with Existing" count={plan.pdfMatches.length}>
        {plan.pdfMatches.map((match) => (
          <PdfMatchCard key={match.id} match={match} />
        ))}
      </PlanSection>
    )}

    {/* Risks */}
    {plan.risks?.length > 0 && (
      <RiskAssessment risks={plan.risks} />
    )}

    {/* Actions */}
    <div className="flex gap-[8px] mt-[16px]">
      <button className="flex-1 bg-accent-primary text-white py-[10px] rounded-[10px] font-[590]">
        Confirm & Apply
      </button>
      <button className="flex-1 bg-bg-secondary text-fg-primary py-[10px] rounded-[10px] font-[590]">
        Discard
      </button>
    </div>
  </div>
</div>
```

#### 3.2.1 TaskCreateCard Component

```tsx
<div className="kairos-bg-surface kairos-section-border rounded-[10px] p-[12px] mb-[8px]">
  <div className="flex gap-[8px] items-start">
    <div className="w-[20px] h-[20px] rounded-full bg-accent-primary/15 flex items-center justify-center flex-shrink-0 mt-[2px]">
      <Plus size={14} className="text-accent-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="text-[15px] font-[590] kairos-fg-primary break-words mb-[4px]">
        {task.title}
      </h4>
      {task.description && (
        <p className="text-[13px] kairos-fg-tertiary mb-[6px] break-words">
          {task.description}
        </p>
      )}
      <div className="flex gap-[8px] items-center">
        <span className="text-[12px] bg-accent-primary/10 text-accent-primary px-[6px] py-[2px] rounded-[4px]">
          {task.priority}
        </span>
        {task.assigneeId && (
          <span className="text-[12px] kairos-fg-secondary">
            @{task.assigneeName}
          </span>
        )}
      </div>
    </div>
  </div>
</div>
```

#### 3.2.2 TaskUpdateCard Component

```tsx
<div className="kairos-bg-surface kairos-section-border rounded-[10px] p-[12px] mb-[8px]">
  <div className="flex gap-[8px] items-start">
    <div className="w-[20px] h-[20px] rounded-full bg-warning/15 flex items-center justify-center flex-shrink-0">
      <Edit2 size={14} className="text-warning" />
    </div>
    <div className="flex-1">
      <h4 className="text-[15px] font-[590] kairos-fg-primary mb-[4px]">
        Update: {task.title}
      </h4>
      <div className="space-y-[4px] text-[13px]">
        {task.patch.title && (
          <div className="kairos-fg-secondary">
            Title: {task.patch.title}
          </div>
        )}
        {task.patch.priority && (
          <div className="kairos-fg-secondary">
            Priority: {task.patch.priority}
          </div>
        )}
      </div>
    </div>
  </div>
</div>
```

#### 3.2.3 PdfMatchCard Component

```tsx
<div className="kairos-bg-surface kairos-section-border rounded-[10px] p-[12px] mb-[8px]">
  <div className="flex gap-[8px] items-start">
    <div className="w-[20px] h-[20px] rounded-full bg-info/15 flex items-center justify-center flex-shrink-0">
      <Link2 size={14} className="text-info" />
    </div>
    <div className="flex-1">
      <div className="flex justify-between items-start gap-[8px]">
        <div>
          <h4 className="text-[15px] font-[590] kairos-fg-primary">
            {match.pdfTask}
          </h4>
          <p className="text-[13px] kairos-fg-tertiary mt-[2px]">
            Matches: {match.existingTask}
          </p>
        </div>
        <span className="text-[12px] bg-info/10 text-info px-[6px] py-[2px] rounded-[4px] whitespace-nowrap">
          {(match.similarity * 100).toFixed(0)}% match
        </span>
      </div>
    </div>
  </div>
</div>
```

#### 3.2.4 DraftHeader Component

```tsx
<div className="kairos-bg-surface kairos-section-border rounded-[10px] p-[12px] mb-[16px]">
  <h3 className="text-[17px] font-[590] kairos-fg-primary mb-[8px]">
    Task Plan Draft
  </h3>
  <div className="grid grid-cols-4 gap-[8px]">
    <Stat label="Create" value={plan.creates.length} />
    <Stat label="Update" value={plan.updates.length} />
    <Stat label="Delete" value={plan.deletes.length} />
    <Stat label="Risk" value={plan.risks.length} />
  </div>
</div>

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-[18px] font-[700] kairos-fg-primary">
        {value}
      </div>
      <div className="text-[11px] kairos-fg-tertiary">
        {label}
      </div>
    </div>
  );
}
```

#### 3.2.5 RiskAssessment Component

```tsx
<div className="kairos-bg-surface border-l-4 border-warning rounded-[10px] p-[12px] mb-[16px] bg-warning/5">
  <h4 className="text-[15px] font-[590] text-warning mb-[8px] flex items-center gap-[6px]">
    <AlertCircle size={16} />
    Risks & Warnings
  </h4>
  <ul className="space-y-[6px]">
    {risks.map((risk, i) => (
      <li key={i} className="text-[13px] kairos-fg-primary flex gap-[8px]">
        <span className="text-warning mt-[2px]">•</span>
        <span>{risk}</span>
      </li>
    ))}
  </ul>
</div>
```

---

### 3.3 AgentPanel Container

**Generic reusable container for any agent panel.**

**File:** `src/components/agents/AgentPanel.tsx`

```tsx
interface AgentPanelProps {
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AgentPanel({
  title,
  subtitle,
  isOpen,
  onClose,
  children,
  footer,
}: AgentPanelProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-bg-primary shadow-xl flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="px-[16px] py-[12px] border-b border-border-medium flex items-center justify-between">
          <div>
            <h3 className="text-[17px] font-[590] kairos-fg-primary">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[13px] kairos-fg-secondary mt-[2px]">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-[8px] hover:bg-bg-secondary rounded-[8px] transition-colors"
          >
            <X size={18} className="kairos-fg-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-[16px] py-[12px] border-t border-border-medium bg-bg-secondary">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
```

---

## Part 4: CSS & Tailwind Configuration

### 4.1 Additional Custom Classes Needed

**Add to `src/styles/globals.css`:**

```css
/* Agent UI Specific Classes */

/* Message bubbles */
.agent-message-human {
  @apply bg-accent-primary text-white rounded-[10px] max-w-[85%];
}

.agent-message-ai {
  @apply bg-bg-surface border border-border-medium rounded-[10px] max-w-[85%] kairos-fg-primary;
}

/* Task cards */
.agent-task-card {
  @apply bg-bg-surface border border-border-medium rounded-[10px] p-[12px] mb-[8px];
}

.agent-task-create {
  @apply border-l-4 border-success;
}

.agent-task-update {
  @apply border-l-4 border-warning;
}

.agent-task-delete {
  @apply border-l-4 border-error;
}

/* Status badges */
.agent-badge-success {
  @apply bg-success/10 text-success text-[12px] px-[6px] py-[2px] rounded-[4px];
}

.agent-badge-warning {
  @apply bg-warning/10 text-warning text-[12px] px-[6px] py-[2px] rounded-[4px];
}

.agent-badge-error {
  @apply bg-error/10 text-error text-[12px] px-[6px] py-[2px] rounded-[4px];
}

/* Panel overlays */
.agent-panel-overlay {
  @apply fixed inset-0 bg-black/20 transition-opacity duration-200;
}

.agent-panel-slide {
  @apply fixed inset-y-0 right-0 bg-bg-primary shadow-xl flex flex-col animate-in slide-in-from-right duration-300;
}

/* Chat input styling */
.agent-chat-input {
  @apply px-[12px] py-[8px] rounded-[8px] bg-bg-secondary kairos-fg-primary text-[15px] border border-border-light focus:border-accent-primary focus:outline-none transition-colors;
}

/* Quick action pills */
.agent-quick-action {
  @apply px-[12px] py-[6px] text-[13px] rounded-full bg-bg-tertiary kairos-fg-primary hover:bg-bg-secondary transition-colors cursor-pointer;
}

/* Grid cards for metrics */
.agent-metric-card {
  @apply text-center p-[8px];
}

.agent-metric-value {
  @apply text-[18px] font-[700] kairos-fg-primary;
}

.agent-metric-label {
  @apply text-[11px] kairos-fg-tertiary mt-[2px];
}

/* Confidence/match strength indicators */
.agent-confidence-bar {
  @apply h-[4px] bg-bg-tertiary rounded-full overflow-hidden;
}

.agent-confidence-fill {
  @apply h-full bg-accent-primary transition-all duration-300;
}

/* Loading states */
.agent-loading-pulse {
  @apply animate-pulse bg-bg-tertiary rounded-[10px];
}

.agent-typing-indicator {
  @apply flex gap-[4px] items-center;
}

.agent-typing-dot {
  @apply w-[6px] h-[6px] rounded-full bg-accent-primary animate-bounce;
}

/* Icons with background circles (matching settings pattern) */
.agent-icon-circle {
  @apply w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0;
}

.agent-icon-circle-accent {
  @apply bg-accent-primary/15 text-accent-primary;
}

.agent-icon-circle-secondary {
  @apply bg-bg-tertiary kairos-fg-secondary;
}

.agent-icon-circle-success {
  @apply bg-success/15 text-success;
}

.agent-icon-circle-warning {
  @apply bg-warning/15 text-warning;
}

.agent-icon-circle-error {
  @apply bg-error/15 text-error;
}
```

### 4.2 Dark Mode Support

**The existing design system already supports dark mode via CSS variables.**

Ensure dark mode variants in `src/styles/globals.css` are complete:

```css
@media (prefers-color-scheme: dark) {
  :root {
    /* Dark backgrounds */
    --bg-primary: 17 24 39;
    --bg-secondary: 23 32 45;
    --bg-tertiary: 30 41 59;
    --bg-elevated: 23 32 45;
    --bg-surface: 31 41 55;
    --bg-overlay: 17 24 39;
    
    /* Dark text */
    --fg-primary: 243 244 246;
    --fg-secondary: 209 213 219;
    --fg-tertiary: 156 163 175;
    --fg-quaternary: 107 114 128;
    
    /* Borders darker */
    --border-light: 75 85 99;
    --border-medium: 55 65 81;
    --border-strong: 107 114 128;
  }
  
  /* Ensure shadows work in dark mode */
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.3);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3);
  /* etc */
}
```

### 4.3 Responsive Breakpoints

**Use Tailwind's standard breakpoints with project adjustments:**

```tsx
{/* Mobile: sidebar hidden, chatbot in modal */}
<div className="hidden sm:block">
  <ProjectIntelligenceChat />
</div>

{/* Tablet & Desktop: sidebar visible */}
<div className="sm:w-[300px] lg:w-[350px]">
  <ProjectIntelligenceChat />
</div>
```

---

## Part 5: Implementation Components Checklist

### 5.1 A1 (Workspace Chatbot - Global) Components

- [ ] **WorkspaceChatbot** (`src/components/agents/WorkspaceChatbot.tsx`)
  - [ ] Full-page/modal container
  - [ ] Message list management
  - [ ] Input handling & send
  - [ ] Loading states
  - [ ] Workspace context display

- [ ] **WorkspaceChatbotTrigger** (`src/components/agents/WorkspaceChatbotTrigger.tsx`)
  - [ ] Floating Action Button (FAB)
  - [ ] Open/close modal toggle
  - [ ] Accessible from any page
  - [ ] Position fixed bottom-right
  - [ ] Pulsing animation hint

- [ ] **WorkspaceContextCard** (`src/components/agents/WorkspaceContextCard.tsx`)
  - [ ] Organization summary
  - [ ] Project count
  - [ ] Task count
  - [ ] Completion rate
  - [ ] Team size metric

- [ ] **WorkspaceChatbotTrigger Integration**
  - [ ] Add to `src/app/layout.tsx` (root layout)
  - [ ] Or conditionally render based on feature flag
  - [ ] Ensure z-index doesn't conflict

### 5.2 A1 (Project Chatbot) Components

- [ ] **ProjectIntelligenceChat** (`src/components/agents/ProjectIntelligenceChat.tsx`)
  - [ ] Main chat container
  - [ ] Message list management
  - [ ] Input handling & send
  - [ ] Loading states

- [ ] **MessageBubble** (`src/components/agents/MessageBubble.tsx`)
  - [ ] Human message variant
  - [ ] AI message variant
  - [ ] Confidence display
  - [ ] Timestamp

- [ ] **ChatInput** (`src/components/agents/ChatInput.tsx`)
  - [ ] Text input field
  - [ ] Send button
  - [ ] Keyboard handling (Enter to send)
  - [ ] Disabled state

- [ ] **QuickActions** (`src/components/agents/QuickActions.tsx`)
  - [ ] Suggestion pills
  - [ ] Dynamic generation from AI hints
  - [ ] Click to populate input

- [ ] **ContextCard** (`src/components/agents/ContextCard.tsx`)
  - [ ] Project metrics display
  - [ ] Progress bar
  - [ ] Key statistics

- [ ] **TypingIndicator** (`src/components/agents/TypingIndicator.tsx`)
  - [ ] Animated dots
  - [ ] Pulsing animation

### 5.2 A2 (Task Planner) Components

- [ ] **TaskPlannerDraft** (`src/components/agents/TaskPlannerDraft.tsx`)
  - [ ] Draft header with summary
  - [ ] Collapsible sections
  - [ ] Action buttons (Confirm/Discard)

- [ ] **TaskCreateCard** (`src/components/agents/TaskCreateCard.tsx`)
  - [ ] Title & description
  - [ ] Priority badge
  - [ ] Assignee info
  - [ ] Acceptance criteria list

- [ ] **TaskUpdateCard** (`src/components/agents/TaskUpdateCard.tsx`)
  - [ ] Diff highlighting (what changed)
  - [ ] Before/after values
  - [ ] Update reason

- [ ] **TaskDeleteCard** (`src/components/agents/TaskDeleteCard.tsx`)
  - [ ] Task being deleted
  - [ ] Deletion reason
  - [ ] Warning styling

- [ ] **PdfMatchCard** (`src/components/agents/PdfMatchCard.tsx`)
  - [ ] Extracted task
  - [ ] Existing task match
  - [ ] Similarity score
  - [ ] Action (merge/keep separate)

- [ ] **RiskAssessment** (`src/components/agents/RiskAssessment.tsx`)
  - [ ] Warning icon
  - [ ] Risk list
  - [ ] Severity indicators

- [ ] **DraftHeader** (`src/components/agents/DraftHeader.tsx`)
  - [ ] Plan summary
  - [ ] Four-stat grid (Create/Update/Delete/Risk)
  - [ ] Impact assessment

### 5.3 A2 (Task Planner) Components - continued

[Previous section continues...]

### 5.4 Generic Components

- [ ] **AgentPanel** (`src/components/agents/AgentPanel.tsx`)
  - [ ] Container with header/footer slots
  - [ ] Backdrop & close handling
  - [ ] Slide-in animation
  - [ ] Responsive behavior

- [ ] **AgentSection** (`src/components/agents/AgentSection.tsx`)
  - [ ] Collapsible section container
  - [ ] Count badge
  - [ ] Expand/collapse icon

- [ ] **AgentButton** (`src/components/agents/AgentButton.tsx`)
  - [ ] Primary (accent) variant
  - [ ] Secondary variant
  - [ ] Disabled state
  - [ ] Loading state with spinner

- [ ] **ConfidenceIndicator** (`src/components/agents/ConfidenceIndicator.tsx`)
  - [ ] Percentage display
  - [ ] Visual bar
  - [ ] Color coding (high/medium/low)

---

## Part 6: CSS Implementation Timeline

### Phase 1: Foundation (Week 1)
- [ ] Review and document all custom Tailwind classes needed
- [ ] Add new agent-specific CSS classes to `globals.css`
- [ ] Test color palette consistency across light/dark modes
- [ ] Create shared utility styles for icons, badges, buttons

### Phase 2: Component Library (Week 2-3)
- [ ] Build all generic components (AgentPanel, AgentButton, etc.)
- [ ] Style each component to match settings design
- [ ] Test responsive behavior on mobile/tablet/desktop
- [ ] Verify accessibility (contrast, keyboard nav, ARIA labels)

### Phase 3: Agent-Specific UI (Week 3-4)
- [ ] Implement A1 chatbot components
- [ ] Implement A2 task planner components
- [ ] Integration into `/projects` page layout
- [ ] PDF upload integration

### Phase 4: Polish & Testing (Week 4-5)
- [ ] Animations (slide-in, fade, pulse)
- [ ] Loading states & skeletons
- [ ] Error states & fallbacks
- [ ] Dark mode verification
- [ ] Accessibility audit
- [ ] Cross-browser testing

---

## Part 7: Code Style & Standards

### 7.1 Component Template

All agent components should follow this structure:

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '~/trpc/react';
import { [Icons] from 'lucide-react';

interface [ComponentName]Props {
  // Props with JSDoc
}

export function [ComponentName]({ /* props */ }: [ComponentName]Props) {
  const t = useTranslations('agents');
  const [state, setState] = useState();
  
  // Queries/mutations
  
  // Handlers
  
  // Render
  return (
    <div className="...">
      {/* JSX */}
    </div>
  );
}
```

### 7.2 ClassName Organization

Always organize Tailwind classes in this order:
1. Layout (`w-`, `h-`, `flex`, `grid`, `gap-`)
2. Spacing (`p-`, `m-`, `px-`, `py-`)
3. Colors (`bg-`, `text-`, `border-`)
4. Typography (`text-`, `font-`, `leading-`)
5. Effects (`rounded-`, `shadow-`, `opacity-`)
6. States (`hover:`, `focus:`, `disabled:`, `active:`)
7. Responsive (`sm:`, `md:`, `lg:`)
8. Animations (`animate-`, `transition-`)

**Example:**
```tsx
<div className="w-full flex items-center gap-[13px] px-[16px] py-[11px] bg-bg-surface text-[15px] text-fg-primary rounded-[10px] border border-border-medium hover:bg-bg-secondary focus:ring-2 focus:ring-accent-primary transition-colors sm:w-[300px]">
```

### 7.3 Component Props Naming

- Prefer `isActive`, `isLoading`, `isOpen` for boolean props
- Use `onAction` for event handlers
- Use `aria-*` attributes for accessibility
- Document all props with JSDoc above function

```tsx
interface TaskCardProps {
  /** Task ID from database */
  taskId: number;
  /** Task title to display */
  title: string;
  /** Whether task is selected */
  isSelected?: boolean;
  /** Callback when card is clicked */
  onClick?: (taskId: number) => void;
}
```

---

## Part 8: Accessibility Guidelines

### 8.1 Keyboard Navigation

- All interactive elements must be keyboard accessible
- Use semantic HTML (`<button>`, `<input>`, `<label>`)
- Tab order follows visual flow
- Focus state always visible (use `focus:ring-2 focus:ring-accent-primary`)

### 8.2 Screen Reader Support

```tsx
{/* Use aria-label for icon-only buttons */}
<button aria-label="Send message">
  <Send size={18} />
</button>

{/* Use aria-live for dynamic updates */}
<div aria-live="polite" aria-atomic="true">
  {loadingMessage}
</div>

{/* Label form inputs */}
<label htmlFor="message-input" className="sr-only">
  Message
</label>
<input id="message-input" />
```

### 8.3 Color Contrast

- Text on backgrounds must meet WCAG AA (4.5:1 for normal text)
- The design system meets this by default, but verify custom combinations
- Test with tools like WebAIM Contrast Checker

### 8.4 Motion & Animation

- Respect `prefers-reduced-motion` media query
- Keep animations under 300ms
- Avoid flashing/strobing (maintain accessibility for photosensitive users)

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Part 9: File Structure

```
src/
├── components/
│   ├── agents/
│   │   ├── index.ts                        (exports)
│   │   ├── AgentPanel.tsx
│   │   ├── AgentButton.tsx
│   │   ├── AgentSection.tsx
│   │   ├── ConfidenceIndicator.tsx
│   │   ├── TypingIndicator.tsx
│   │   │
│   │   ├── WorkspaceChatbot.tsx            (Global workspace assistant)
│   │   ├── WorkspaceChatbotTrigger.tsx     (FAB button on all pages)
│   │   ├── WorkspaceContextCard.tsx        (Workspace metrics)
│   │   │
│   │   ├── ProjectIntelligenceChat.tsx     (Project-specific sidebar chat)
│   │   ├── MessageBubble.tsx
│   │   ├── ChatInput.tsx
│   │   ├── QuickActions.tsx
│   │   ├── ContextCard.tsx
│   │   │
│   │   ├── TaskPlannerDraft.tsx            (A2 task planning panel)
│   │   ├── TaskCreateCard.tsx
│   │   ├── TaskUpdateCard.tsx
│   │   ├── TaskDeleteCard.tsx
│   │   ├── PdfMatchCard.tsx
│   │   ├── RiskAssessment.tsx
│   │   └── DraftHeader.tsx
│   │
│   └── settings/
│       ├── AppearanceSettings.tsx
│       └── ...
│
├── server/agents/
│   ├── context/
│   │   ├── a1ContextBuilder.ts             (Project context)
│   │   ├── workspaceContextBuilder.ts      (Workspace context - NEW)
│   │   └── a2ContextBuilder.ts             (Task planner context)
│   ├── prompts/
│   │   ├── a1Prompts.ts                    (Project chatbot prompts)
│   │   ├── a1WorkspacePrompts.ts           (Workspace chatbot prompts - NEW)
│   │   └── a2Prompts.ts                    (Task planner prompts)
│   └── orchestrator/
│       └── agentOrchestrator.ts            (Add workspaceChatbot endpoint)
│
├── styles/
│   ├── globals.css               (+ new agent classes)
│   └── globals-mobile.css
│
└── app/
    ├── layout.tsx                (Add WorkspaceChatbotTrigger here)
    ├── projects/
    │   ├── page.tsx              (includes Project Chatbot sidebar)
    │   └── [id]/
    │       └── page.tsx          (project detail + A2 planner)
    │
    └── settings/
        └── page.tsx
```

---

## Part 10: Internationalization (i18n)

All agent UI text must use `next-intl` for multi-language support:

**Add to `src/i18n/messages/*.json`:**

```json
{
  "agents": {
    "workspaceChatbot": {
      "title": "Workspace Intelligence",
      "placeholder": "Ask about your workspace...",
      "sending": "Sending...",
      "context": {
        "projects": "Projects",
        "tasks": "Tasks",
        "completionRate": "Completion Rate",
        "teamMembers": "Team Members"
      },
      "quickActions": {
        "projectStatus": "What's the status of my projects?",
        "overdueTasks": "Which tasks are overdue?",
        "teamWorkload": "What's the team workload?",
        "upcomingDeadlines": "Show me upcoming deadlines",
        "projectRisks": "Identify project risks",
        "recommendations": "What should I prioritize?"
      },
      "confidenceLevel": "Confidence Level",
      "noContext": "No workspace data available"
    },
    "projectChatbot": {
      "title": "Project Intelligence",
      "placeholder": "Ask about this project...",
      "sending": "Sending...",
      "confidence": "Confidence"
    },
    "taskPlanner": {
      "title": "Task Plan",
      "newTasks": "New Tasks",
      "updates": "Updates",
      "deletes": "Deletes",
      "risks": "Risks & Warnings",
      "confirmApply": "Confirm & Apply",
      "discard": "Discard"
    },
    "messages": {
      "loadingProjectData": "Loading project data...",
      "loadingWorkspaceData": "Loading workspace data...",
      "noTasks": "No tasks in this project yet",
      "errorLoading": "Failed to load data",
      "connectionError": "Connection error. Please try again."
    }
  }
}
```

Use in components:
```tsx
const t = useTranslations('agents');

return (
  <div>
    <h3>{t('chatbot.title')}</h3>
    <input placeholder={t('chatbot.placeholder')} />
  </div>
);
```

---

## Part 11: Performance Optimization

### 11.1 Code Splitting

```tsx
import dynamic from 'next/dynamic';

const ProjectIntelligenceChat = dynamic(
  () => import('~/components/agents/ProjectIntelligenceChat'),
  { loading: () => <ChatSkeleton /> }
);
```

### 11.2 Memoization

```tsx
import { memo } from 'react';

export const MessageBubble = memo(function MessageBubble({ message }: Props) {
  return (/* JSX */);
});
```

### 11.3 Query Optimization

- Use `staleTime` to avoid redundant queries
- Implement request deduplication
- Cache API responses appropriately

```tsx
const { data: project } = api.project.getById.useQuery(
  { id: projectId },
  {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,   // 10 minutes
  }
);
```

---

## Part 12: Testing Strategy

### 12.1 Unit Tests

```tsx
// tests/components/agents/MessageBubble.test.tsx
describe('MessageBubble', () => {
  it('renders human message with correct styling', () => {
    render(
      <MessageBubble message={{ role: 'user', content: 'Hello' }} />
    );
    const bubble = screen.getByText('Hello');
    expect(bubble).toHaveClass('agent-message-human');
  });

  it('renders AI message with confidence indicator', () => {
    render(
      <MessageBubble 
        message={{ role: 'assistant', content: 'Hi', confidence: 0.95 }} 
      />
    );
    expect(screen.getByText('95%')).toBeInTheDocument();
  });
});
```

### 12.2 Integration Tests

- Test chatbot message flow
- Test task planner draft → confirm → apply
- Test PDF upload and matching
- Test responsive behavior on different screen sizes

### 12.3 Visual Regression Tests

Use tools like Chromatic or Percy to catch styling regressions:

```bash
npm run test:visual
```

---

## Part 13: Deployment Checklist

- [ ] All components built and tested
- [ ] CSS changes in `globals.css`
- [ ] i18n keys added for all UI text
- [ ] Dark mode verified
- [ ] Responsive design tested (mobile, tablet, desktop)
- [ ] Accessibility audit passed
- [ ] Performance metrics acceptable (LCP, CLS, FID)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Documentation updated
- [ ] Components added to Storybook (if applicable)
- [ ] Feature flag enabled for rollout

---

## Sign-Off

**Status:** Ready for development

**Estimated Effort:**
- Design & Component Build: 15-20 dev-days
- Integration & Testing: 8-10 dev-days
- Refinement & Polish: 5-7 dev-days
- **Total: 28-37 dev-days (~6-8 weeks with 1 developer)**

**Next Steps:**
1. Review this document with design/PM
2. Begin Phase 1 (Foundation & CSS)
3. Build generic component library
4. Implement agent-specific components
5. Integration and user testing

