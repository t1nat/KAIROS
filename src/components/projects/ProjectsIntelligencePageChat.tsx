"use client";

import { useMemo, useState } from "react";
import { api } from "~/trpc/react";
import { ProjectIntelligenceChat } from "./ProjectIntelligenceChat";

export function ProjectsIntelligencePageChat() {
  const { data: projects, isLoading } = api.project.getMyProjects.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
  });

  const options = useMemo(() => {
    const items = (projects ?? []).map((p) => ({ id: p.id, title: p.title }));
    items.sort((a, b) => a.title.localeCompare(b.title));
    return items;
  }, [projects]);

  const [selected, setSelected] = useState<number | "workspace">("workspace");

  return (
    <div className="kairos-bg-surface rounded-[10px] overflow-hidden kairos-section-border">
      <div className="px-5 py-4 flex items-center justify-between border-b border-border-light/20">
        <div>
          <h2 className="text-[15px] font-semibold kairos-fg-primary leading-tight">Intelligence Chat</h2>
          <p className="text-[12px] kairos-fg-secondary leading-tight">
            Pick a project or use Workspace to ask across all your projects.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[12px] kairos-fg-secondary">Scope</label>
          <select
            className="text-sm bg-bg-surface border border-border-light/30 rounded-lg px-3 py-2 text-fg-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
            value={selected}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "workspace") setSelected("workspace");
              else setSelected(Number(v));
            }}
            disabled={isLoading}
          >
            <option value="workspace">Workspace</option>
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-4">
        <ProjectIntelligenceChat projectId={selected === "workspace" ? undefined : selected} />
      </div>
    </div>
  );
}
