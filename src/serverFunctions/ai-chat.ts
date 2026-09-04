import { getOptionalEnvValue } from "@/server/lib/runtime-env";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";
import { ProjectService } from "@/server/features/projects/services/ProjectService";
import { KeywordResearchRepository } from "@/server/features/keywords/repositories/KeywordResearchRepository";
import { z } from "zod";
import http from "node:http";

async function callSandboxBridge(payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: 3001,
        path: "/api/sandbox-cli-bridge",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.from(postData).length,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e: any) {
              reject(new Error("Failed to parse response: " + e.message));
            }
          } else {
            reject(new Error(data || `HTTP ${res.statusCode}`));
          }
        });
      }
    );

    req.on("error", (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

export const runCliChat = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .inputValidator((data: unknown) =>
    z
      .object({
        agent: z.enum([
          "nairi-qwen",
          "nairi-deepseek",
          "nairi-mimo",
          "nairi-claude",
          "nairi-claude-opus",
          "nairi-claude-opus-4-6",
          "nairi-claude-opus-4-7",
          "nairi-claude-opus-4-8",
          "nairi-claude-3-7-sonnet",
          "nairi-claude-sonnet-4-6",
          "nairi-gemini",
          "nairi-gemini-2-5-pro",
          "nairi-gemini-3-0-flash",
          "nairi-gemini-3-0-pro",
          "nairi-gemini-3-5-flash",
          "nairi-gemini-3-5-pro"
        ]),
        message: z.string(),
        sessionId: z.string(),
        projectId: z.string().optional(),
      })
      .parse(data)
  )
  .handler(async ({ data, context }) => {
    const { agent, message, sessionId, projectId } = data;

    // Production Fallback: Forward prompts to Nairi API when running live
    if (!import.meta.env.DEV) {
      const apiKey = await getOptionalEnvValue("NAIRI_API_KEY");
      if (!apiKey) {
        return {
          success: false,
          output: "Live Nairi AI agent is not configured. Please set the NAIRI_API_KEY secret in your deployment settings.",
          rawStderr: "Missing NAIRI_API_KEY",
        };
      }

      try {
        // Create conversation task via Nairi public API
        const res = await fetch("https://api.nairi.ai/api/public/v1/conversations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            agent,
            message,
            sessionId,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || `API status ${res.status}`);
        }

        const result: any = await res.json();
        return {
          success: true,
          output: result.reply || result.message || "Message processed by agent.",
          rawStderr: "",
        };
      } catch (err: any) {
        return {
          success: false,
          output: `Failed to connect with Nairi agent: ${err.message}`,
          rawStderr: err.message,
        };
      }
    }

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

