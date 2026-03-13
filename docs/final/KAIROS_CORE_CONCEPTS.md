# KAIROS - Core Concepts and Technical Documentation

**Last Updated:** March 6, 2026  
**Version:** 2.0

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Overview](#architecture-overview)
3. [Core Features](#core-features)
4. [AI Agents System](#ai-agents-system)
5. [Authentication & Authorization](#authentication--authorization)
6. [Organization Management](#organization-management)
7. [Notes System](#notes-system)
8. [Events & Calendar](#events--calendar)
9. [Progress Tracking](#progress-tracking)
10. [Technology Stack](#technology-stack)
11. [Security Implementations](#security-implementations)
12. [Database Schema](#database-schema)

---

## Project Overview

**KAIROS** is a comprehensive productivity and collaboration platform that combines project management, note-taking, event coordination, and AI-powered assistance. The platform supports both personal and organizational workflows with advanced features like encrypted notes, role-based permissions, and intelligent AI agents.

### Key Capabilities

- **Multi-Mode Operation**: Personal and organization workspaces
- **AI Agent Suite**: 5 specialized AI agents for different tasks
- **End-to-End Encryption**: Password-protected notes with AES-256-GCM
- **Real-Time Collaboration**: Shared notes, projects, and events
- **Role-Based Access Control**: Granular permissions for organization members
- **Progressive Web App**: Responsive design with mobile support

---

## Architecture Overview

### Tech Stack

```
┌─────────────────────────────────────┐
│     Frontend (Next.js 15)           │
│  - React Server Components          │
│  - Tailwind CSS v4                  │
│  - TypeScript                       │
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│      API Layer (tRPC)               │
│  - Type-safe endpoints              │
│  - Input validation (Zod)           │
│  - Middleware for auth              │
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│   Database (PostgreSQL + Drizzle)  │
│  - Supabase hosted                  │
│  - Drizzle ORM                      │
└─────────────────────────────────────┘
```

### Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── calendar/          # Calendar view
│   ├── chat/              # AI agent chat interface
│   ├── notes/             # Notes dashboard
│   ├── progress/          # Progress tracking
│   └── api/               # API routes
├── components/            # React components
│   ├── auth/              # Authentication components
│   ├── notes/             # Notes-related components
│   ├── events/            # Events/calendar components
│   ├── progress/          # Progress tracking UI
│   └── providers/         # Context providers
├── server/               # Server-side code
│   ├── api/              # tRPC routers
│   ├── auth/             # NextAuth configuration
│   ├── db/               # Database schema & connection
│   ├── agents/           # AI agent implementations
│   └── encryption.ts     # Encryption utilities
└── styles/              # Global styles
```

---

## Core Features

### 1. Dual-Mode Workspace

KAIROS operates in two distinct modes:

#### Personal Mode
- Individual workspace for personal productivity
- Private notes, tasks, and events
- No collaboration features
- Quick setup with no organization required

#### Organization Mode
- Collaborative workspace with team members
- Shared projects, tasks, and resources
- Role-based permissions
- Organization-level analytics

Users can switch between modes or belong to multiple organizations simultaneously.

### 2. Onboarding Flow

When a user signs up:

1. **Account Creation** → Email verification → Welcome email sent via Resend
2. **Role Selection Modal** → User chooses:
   - Create Organization (becomes admin)
   - Join Organization (enters access code)
   - Personal Mode (skip for now)
3. **Dashboard Access** → Redirected to appropriate workspace

---

## AI Agents System

KAIROS includes 5 specialized AI agents that communicate with users and each other to provide intelligent assistance.

### Agent Architecture

```
┌─────────────────────────────────────────┐
│         User Interface (Chat)            │
└─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│     Agent Router (src/server/agents/)    │
│  - Routes messages to appropriate agent  │
│  - Maintains conversation context        │
└─────────────────────────────────────────┘
                │
      ┌─────────┴─────────┬──────────────┬──────────────┬───────────┐
      ▼                   ▼              ▼              ▼           ▼
┌──────────┐    ┌──────────────┐   ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Workspace│    │     Task     │   │  Notes   │  │  Events  │  │   Org    │
│ Concierge│    │   Planner    │   │  Vault   │  │Publisher │  │  Admin   │
└──────────┘    └──────────────┘   └──────────┘  └──────────┘  └──────────┘
```

### Agent Descriptions

#### 1. Workspace Concierge (General Assistant)
- **Role**: Primary interface, router, and general assistant
- **Capabilities**:
  - Answers general questions
  - Routes requests to specialized agents
  - Provides onboarding guidance
  - Explains features
- **Implementation**: `src/server/agents/workspaceConcierge.ts`

#### 2. Task Planner
- **Role**: Project and task management assistant
- **Capabilities**:
  - Creates projects and tasks
  - Assigns tasks to team members
  - Updates task status
  - Generates progress reports
- **Implementation**: `src/server/agents/taskPlanner.ts`
- **Database Access**: Projects, tasks, organization members

#### 3. Notes Vault
- **Role**: Note management and organization
- **Capabilities**:
  - Creates and edits notes
  - Organizes notes into notebooks
  - Searches note content
  - Manages note sharing
- **Implementation**: `src/server/agents/notesVault.ts`
- **Database Access**: Sticky notes, notebooks, note shares

#### 4. Events Publisher
- **Role**: Event and calendar management
- **Capabilities**:
  - Creates and schedules events
  - Manages event invitations
  - Handles event comments and interactions
  - Sends event notifications
- **Implementation**: `src/server/agents/eventsPublisher.ts`
- **Database Access**: Events, event invites, event likes

#### 5. Organization Admin
- **Role**: Organization and permissions management
- **Capabilities**:
  - Manages organization settings
  - Assigns roles and permissions
  - Generates access codes
  - Views member analytics
- **Implementation**: `src/server/agents/orgAdmin.ts`
- **Database Access**: Organizations, organization members, roles

### Agent Communication Protocol

Agents communicate through a structured message system:

```typescript
interface AgentMessage {
  role: "user" | "assistant" | "system";
  content: string;
  agentId?: string;     // Which agent sent this
  toolCalls?: ToolCall[]; // Function calls made
  metadata?: {
    timestamp: Date;
    userId: string;
    organizationId?: number;
  };
}
```

### LLM Integration

Agents use multiple LLM providers with fallback:

1. **Primary**: Hugging Face Router (Qwen/Qwen2.5-7B-Instruct)
2. **Fallback**: microsoft/Phi-3.5-mini-instruct
3. **Local Option**: Ollama (llama3.1:8b) for self-hosted deployments

Configuration in `.env`:
```env
LLM_BASE_URL=https://router.huggingface.co/v1
LLM_API_KEY=hf_xxx
LLM_DEFAULT_MODEL=Qwen/Qwen2.5-7B-Instruct
LLM_FALLBACK_MODEL=microsoft/Phi-3.5-mini-instruct
```

---

## Authentication & Authorization

### Authentication Flow

```
User Sign In → NextAuth.js → Credentials Provider
                 │
                 ├─ Email + Password → Argon2 verification
                 ├─ Google OAuth
                 └─ GitHub OAuth
                 │
                 ▼
            Session Created
                 │
                 ▼
            JWT Token with claims:
            - userId
            - email
            - activeOrganizationId
            - usageMode
```

### Implementation Details

**File**: `src/server/auth/index.ts`

- Uses **NextAuth.js v5** (Auth.js)
- Session strategy: JWT
- Password hashing: **Argon2id** with secure parameters:
  ```typescript
  {
    type: argon2id,
    memoryCost: 65536,  // 64MB
    timeCost: 3,
    parallelism: 4
  }
  ```

### Protected Routes

All authenticated routes use the `protectedProcedure` wrapper:

```typescript
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { session: ctx.session } });
});
```

---

## Organization Management

### Organization Structure

```
Organization
├── Access Code (unique, 12-char alphanumeric)
├── Members (users with roles)
│   ├── Admin (full permissions)
│   ├── Member (standard permissions)
│   └── Guest (limited permissions)
├── Projects
├── Events
└── Shared Notes
```

### Role-Based Permissions

**Organization Member Schema**:
```typescript
{
  role: "admin" | "member" | "guest",
  canAddMembers: boolean,
  canAssignTasks: boolean,
  canCreateProjects: boolean,
  canDeleteTasks: boolean,
  canKickMembers: boolean,
  canManageRoles: boolean,
  canEditProjects: boolean,
  canViewAnalytics: boolean
}
```

### Security Features

1. **Self-Permission Protection**: Users cannot modify their own permissions
2. **Role Escalation Prevention**: Targets must be verified members before role changes
3. **Creator Protection**: Organization creators cannot be removed if they're the only admin
4. **TRPCError Usage**: Proper HTTP error codes for all authorization failures

**Implementation**: `src/server/api/routers/organization.ts`

### Access Code Generation

Access codes use cryptographically secure randomness:

```typescript
function generateAccessCode(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes); // Web Crypto API
  
  let code = "";
  for (let i = 0; i < bytes.length; i++) {
    if (i > 0 && i % 4 === 0) code += "-";
    code += alphabet[bytes[i]! % alphabet.length];
  }
  return code; // Format: XXXX-XXXX-XXXX
}
```

### Organization Switching

Users can belong to multiple organizations and switch between them:

```typescript
// Updates activeOrganizationId in user record
await db.update(users)
  .set({
    usageMode: "organization",
    activeOrganizationId: organizationId
  })
  .where(eq(users.id, userId));
```

---

## Notes System

### Architecture

The notes system supports:
- Personal notes
- Shared notes (read/write permissions)
- Password-protected encrypted notes
- Notebook organization
- Rich text content

### Encryption Implementation

**File**: `src/server/encryption.ts`

Notes use **AES-256-GCM** encryption with Argon2id-derived keys:

```typescript
export function encryptContent(
  plaintext: string,
  password: string,
  salt: string
): string {
  // 1. Derive 256-bit key from password
  const key = crypto.pbkdf2Sync(
    password,
    Buffer.from(salt, "hex"),
    100000, // iterations
    32,     // key length
    "sha256"
  );
  
  // 2. Generate random IV
  const iv = crypto.randomBytes(12);
  
  // 3. Encrypt with AES-256-GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  // 4. Get auth tag
  const authTag = cipher.getAuthTag();
  
  // 5. Combine: IV + encrypted + authTag
  return iv.toString("hex") + ":" + encrypted + ":" + authTag.toString("hex");
}
```

### Note Sharing

**Workflow**:
1. Owner shares note with user via email lookup
2. Notification created with link to `/notes?noteId=X&tab=shared`
3. Recipient can view/edit based on permission level
4. Real-time updates through tRPC query invalidation

**Implementation**: `src/server/api/routers/note.ts`

### Notebooks

- Logical groupings of notes
- User-specific (not shared)
- Notes can be moved between notebooks or removed from notebooks
- Deleting a notebook doesn't delete notes (just unlinks them)

---

## Events & Calendar

### Event System

Events support:
- Public/Private visibility
- Location (address + Google Maps integration)
- Invitations with RSVP tracking
- Likes and comments
- Notifications for attendees

### Event Schema

```typescript
{
  id: number,
  title: string,
  description: string | null,
  location: string | null,
  eventDate: Date,
  createdById: string,
  organizationId: number | null,
  isPublic: boolean,
  invites: EventInvite[],
  likes: EventLike[],
  comments: EventComment[]
}
```

### Notification System

Events trigger notifications for:
- Event invitations
- Event updates/cancellations
- New comments
- New likes (if enabled)

**File**: `src/server/api/routers/event.ts`

Notifications include a direct link to the event page for quick access.

---

## Progress Tracking

### Task Timeline

The progress system tracks:
- Task completion status
- Project progress percentages
- Individual contributor statistics
- Team performance analytics

### Status Flow

```
pending → in_progress → completed
             ↓
          blocked
```

### Progress Calculation

Project progress is calculated server-side:

```typescript
const project = await db.query.projects.findFirst({
  where: eq(projects.id, projectId),
  with: {
    tasks: true
  }
});

const completedTasks = project.tasks.filter(t => t.status === "completed").length;
const totalTasks = project.tasks.length;
const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
```

### Real-Time Updates

When a task status changes:
1. Database updated
2. `project.getMyProjects` query invalidated
3. React Query refetches data
4. UI updates with new percentage

**Implementation**: `src/components/progress/TaskTimelineClient.tsx`

---

## Technology Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI**: React 18, Tailwind CSS v4
- **State Management**: React Query (TanStack Query) via tRPC
- **Forms**: Zod validation
- **Icons**: Lucide React
- **Internationalization**: next-intl

### Backend
- **API**: tRPC v11 (type-safe RPC)
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL (Supabase)
- **Authentication**: NextAuth.js v5
- **Email**: Resend
- **File Upload**: UploadThing

### AI/ML
- **LLM Providers**: Hugging Face, Ollama
- **Models**: Qwen 2.5-7B, Phi-3.5-mini, Llama 3.1-8B

### Security
- **Password Hashing**: Argon2id
- **Encryption**: AES-256-GCM
- **Session**: JWT tokens
- **CORS**: Configured for production domain

---

## Security Implementations

### 1. Password Storage

Never store plaintext passwords. All passwords use Argon2id:

```typescript
const hashedPassword = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4
});
```

### 2. Note Encryption

Encrypted notes use:
- AES-256-GCM (authenticated encryption)
- Random 96-bit IV per encryption
- 256-bit keys derived from user passwords via PBKDF2
- Separate salt storage

### 3. Authorization Checks

Every sensitive operation verifies:
- User is authenticated
- User has appropriate role/permissions
- User owns the resource OR has been granted access
- No self-modification of critical permissions

### 4. Input Validation

All API inputs validated with Zod schemas:

```typescript
.input(
  z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128)
  })
)
```

### 5. SQL Injection Prevention

Drizzle ORM uses parameterized queries - no raw SQL concatenation.

### 6. CSRF Protection

NextAuth.js handles CSRF tokens automatically for authentication flows.

---

## Database Schema

### Key Tables

#### users
- id (primary key)
- email (unique)
- password (Argon2 hash)
- name, image
- usageMode: "personal" | "organization"
- activeOrganizationId (foreign key)

#### organizations
- id (primary key)
- name
- accessCode (unique, indexed)
- createdById (foreign key → users)

#### organizationMembers
- id (primary key)
- organizationId (foreign key)
- userId (foreign key)
- role: "admin" | "member" | "guest"
- Permission booleans (canAddMembers, canAssignTasks, etc.)

#### stickyNotes
- id (primary key)
- content (text, or encrypted blob)
- title
- passwordHash (Argon2, if encrypted)
- passwordSalt (hex string)
- shareStatus: "private" | "shared_read" | "shared_write"
- notebookId (foreign key, nullable)
- createdById (foreign key)

#### projects
- id (primary key)
- name, description
- organizationId (foreign key, nullable)
- createdById (foreign key)

#### tasks
- id (primary key)
- title, description
- status: "pending" | "in_progress" | "completed" | "blocked"
- projectId (foreign key)
- assignedToId (foreign key → users)
- dueDate

#### events
- id (primary key)
- title, description, location
- eventDate
- isPublic: boolean
- createdById, organizationId

#### notifications
- id (primary key)
- userId (foreign key)
- type, title, message
- link (URL to navigate on click)
- read: boolean

---

## Email System

### Provider: Resend

Configuration:
```env
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL="Kairos <noreply@yourdomain.com>"
NEXT_PUBLIC_APP_URL=https://kairos.app
```

### Email Templates

1. **Welcome Email**: Sent after signup
2. **Password Reset Code**: 8-character code, 15-minute expiry
3. **Note Sharing Notification**: Includes direct link to shared note

**Implementation**: `src/server/email.ts`

All emails use responsive HTML templates with:
- Purple accent colors matching brand
- Mobile-friendly design
- Plaintext fallbacks

---

## Deployment Considerations

### Environment Variables

Required:
```env
# Database
DATABASE_URL=postgresql://...

# Auth
AUTH_SECRET=<generated>
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...

# Email
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...

# LLM
LLM_API_KEY=...
LLM_BASE_URL=...
```

### Build Command

```bash
pnpm install
pnpm db:push     # Push schema to database
pnpm build       # Build Next.js app
pnpm start       # Start production server
```

### Performance Optimizations

1. **React Server Components**: Reduce client bundle size
2. **tRPC Batching**: Multiple queries in single HTTP request
3. **Database Indexing**: All foreign keys and frequently queried columns
4. **Image Optimization**: Next.js automatic image optimization
5. **Code Splitting**: Dynamic imports for heavy components

---

## Conclusion

KAIROS is a feature-rich, secure, and scalable productivity platform. The architecture balances code reusability, type safety, and user security. The AI agent system provides intelligent assistance while maintaining user privacy and data integrity.

For specific implementation details, refer to the source code in the respective directories mentioned throughout this document.

**Maintainers**: Review this document quarterly and update as features evolve.

---

**Document Version**: 2.0  
**Last Review**: March 6, 2026
