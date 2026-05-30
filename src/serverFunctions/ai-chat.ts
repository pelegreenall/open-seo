import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";
import { ProjectService } from "@/server/features/projects/services/ProjectService";
import { KeywordResearchRepository } from "@/server/features/keywords/repositories/KeywordResearchRepository";
import { z } from "zod";

async function callSandboxBridge(payload: any): Promise<any> {
  const request = getRequest();
  const origin = new URL(request.url).origin;
  
  const res = await fetch(`${origin}/api/sandbox-cli-bridge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json();
}

export const runCliChat = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .inputValidator((data: unknown) =>
    z
      .object({
        agent: z.enum(["gemini", "claude"]),
        message: z.string(),
        sessionId: z.string(),
        projectId: z.string().optional(),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    if (!import.meta.env.DEV) {
      return {
        success: false,
        output: "AI chat sandbox is only available in local development mode.",
        rawStderr: "",
      };
    }

    const { agent, message, sessionId, projectId } = data;
    let projectContext: { name: string; domain: string | null; keywords: string[] } | undefined;

    if (projectId) {
      try {
        const project = await ProjectService.getProjectForOrganization(
          context.organizationId,
          projectId
        );
        const keywordsRes = await KeywordResearchRepository.listSavedKeywordsByProject({
          projectId,
          pageSize: 20,
        });
        projectContext = {
          name: project.name,
          domain: project.domain,
          keywords: keywordsRes.rows.map((r: any) => r.row.keyword),
        };
      } catch (e) {
        console.error("Failed to load project context for sandbox CLI:", e);
      }
    }

    try {
      return await callSandboxBridge({
        action: "run-cli",
        agent,
        message,
        sessionId,
        projectContext,
      });
    } catch (err: any) {
      return {
        success: false,
        output: `Error communicating with sandbox bridge: ${err.message}`,
        rawStderr: err.message,
      };
    }
  });

export const getSandboxFiles = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .inputValidator((data: unknown) =>
    z.object({ sessionId: z.string() }).parse(data)
  )
  .handler(async ({ data }) => {
    if (!import.meta.env.DEV) {
      return { success: false, files: [] };
    }

    try {
      return await callSandboxBridge({
        action: "list-files",
        ...data,
      });
    } catch (err: any) {
      console.error("Error fetching sandbox files:", err);
      return { success: false, files: [] };
    }
  });

export const getSandboxFileContent = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .inputValidator((data: unknown) =>
    z
      .object({
        sessionId: z.string(),
        filePath: z.string(),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    if (!import.meta.env.DEV) {
      return { success: false, content: "AI chat sandbox is only available in local development mode." };
    }

    try {
      return await callSandboxBridge({
        action: "read-file",
        ...data,
      });
    } catch (err: any) {
      return { success: false, content: `Error reading file: ${err.message}` };
    }
  });

