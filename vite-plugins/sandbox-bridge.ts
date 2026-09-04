import type { Plugin } from "vite";
import * as fs from "node:fs";
import * as path from "node:path";
import { execFile } from "node:child_process";

const baseSandboxPath = path.resolve(process.cwd(), ".sandbox-workspace");

function getSessionPath(sessionId: string) {
  const sanitizedSessionId = sessionId.replace(/[^a-zA-Z0-9-]/g, "");
  return path.join(baseSandboxPath, "sessions", sanitizedSessionId);
}

function ensureSandbox(sessionId: string) {
  const sessionPath = getSessionPath(sessionId);
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }
  const gitignorePath = path.join(baseSandboxPath, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, "*\n!.gitignore\n");
  }
  return sessionPath;
}

function getCommandPath(cmd: "gemini" | "claude" | "nairi"): string {
  if (cmd === "nairi") {
    const p = "/home/peleg/.opencode/bin/opencode";
    return fs.existsSync(p) ? p : "opencode";
  } else if (cmd === "gemini") {
    const p = "/home/peleg/.nvm/versions/node/v20.20.2/bin/gemini";
    return fs.existsSync(p) ? p : "gemini";
  } else {
    const p = "/home/peleg/.local/bin/claude";
    return fs.existsSync(p) ? p : "claude";
  }
}

function runCliCommand(
  cmd: string,
  args: string[],
  cwd: string,
  env?: Record<string, string>
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const child = execFile(cmd, args, { cwd, env: { ...process.env, ...env } }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout || "",
        stderr: stderr || "",
        code: error ? (typeof error.code === "number" ? error.code : 1) : 0,
      });
    });
    child.stdin?.end();
  });
}

function listFilesRecursive(dir: string, baseDir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file.startsWith(".")) continue;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(listFilesRecursive(filePath, baseDir));
    } else {
      results.push(path.relative(baseDir, filePath));
    }
  }
  return results;
}

function getJsonBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: any) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        if (!body) {
          resolve({});
        } else {
          resolve(JSON.parse(body));
        }
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", (err: any) => {
      reject(err);
    });
  });
}

export function sandboxBridgePlugin(): Plugin {
  return {
    name: "sandbox-cli-bridge",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith("/api/sandbox-cli-bridge")) {
          res.setHeader("Content-Type", "application/json");

          try {
            if (req.method !== "POST") {
              res.statusCode = 405;
              res.end(JSON.stringify({ error: "Method Not Allowed" }));
              return;
            }

            const body = await getJsonBody(req);
            const { action, sessionId } = body;

            if (!sessionId) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "Missing sessionId" }));
              return;
            }

            if (action === "run-cli") {
              const { agent, message, projectContext } = body;
              if (!agent || !message) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: "Missing agent or message" }));
                return;
              }

              const cwd = ensureSandbox(sessionId);

              if (projectContext) {
                try {
                  const claudeMdContent = `# Guidance for Claude Code inside OpenSEO Sandbox

This sandbox contains a subset of operations. You are assisting a user in the local development context of the **OpenSEO** application.

## Build and Testing Guidelines

- **Package Manager**: \`pnpm\`
- **Development Server**: \`pnpm dev\`
- **Build Command**: \`pnpm build\`
- **Lint Command**: \`pnpm lint\`
- **Testing**: \`pnpm test\`

## Coding Conventions

- **Frontend**: React 19, TSX, Tailwind CSS v4, DaisyUI v5.
- **Routing & State**: TanStack React Router, TanStack Start, TanStack React Query.
- **Backend / APIs**: Decoupled server functions in \`src/serverFunctions/\` declared using \`createServerFn\`.
- **Database**: Drizzle ORM (SQLite / D1). Database schema is in \`src/db/app.schema.ts\`.
- **Authentication**: Better Auth.
`;
                  fs.writeFileSync(path.join(cwd, "CLAUDE.md"), claudeMdContent);

                  const keywordsList = projectContext.keywords && projectContext.keywords.length > 0
                    ? projectContext.keywords.map((k: string) => `  - ${k}`).join("\n")
                    : "  - No keywords saved yet";

                  const projectContextContent = `# Project Context

This file is automatically generated by OpenSEO to provide context about the current project you are assisting with.

- **Project Name**: ${projectContext.name}
- **Target Domain**: ${projectContext.domain || "Not configured yet"}
- **Saved Target Keywords**:
${keywordsList}
`;
                  fs.writeFileSync(path.join(cwd, "PROJECT_CONTEXT.md"), projectContextContent);
                } catch (writeErr) {
                  console.error("Failed to write project context files to sandbox:", writeErr);
                }
              }

              let targetCmd: "gemini" | "claude" | "nairi" = "nairi";
              if (agent.startsWith("nairi-claude")) {
                targetCmd = "claude";
              } else if (agent.startsWith("nairi-gemini")) {
                targetCmd = "gemini";
              }

              const cmdPath = getCommandPath(targetCmd);

              const seoSystemInstruction = `You are an elite SEO Expert and strategist. Your goal is to help the user optimize their website, analyze search intent, cluster keywords, plan content, audit on-page SEO issues, and design search growth strategies.

Rules:
1. Always act as an SEO Expert. Do not introduce yourself as a software engineer or coding assistant.
2. Refer to PROJECT_CONTEXT.md inside your workspace for the active project's website and target keywords, and use this data to customize your recommendations.
3. Focus on technical SEO, content strategy, search intent mapping, and keyword optimization.
4. Keep your responses structured, actionable, and data-driven.`;

              let stdout = "";
              let stderr = "";
              let code = 0;

              if (targetCmd === "nairi") {
                // Map agent variant to corresponding OpenCode model
                let targetModel = "opencode-go/qwen3.7-max";
                if (agent === "nairi-deepseek") {
                  targetModel = "opencode/deepseek-v4-flash-free";
                } else if (agent === "nairi-mimo") {
                  targetModel = "opencode/mimo-v2.5-free";
                }

                // Run OpenCode directly in the sandbox with Nairi integration.
                // Sanitize the session ID so it is valid in OpenCode (e.g. alphanumeric/short).
                const opencodeSessionId = `ses_${sessionId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}`;
                
                // Claude Code uses --session-id, OpenCode uses --session
                const sessionFlag = cmdPath.includes("claude") ? "--session-id" : "--session";

                let r = await runCliCommand(
                  cmdPath,
                  [
                    "run",
                    message,
                    sessionFlag,
                    opencodeSessionId,
                    "--model",
                    targetModel,
                    "--dangerously-skip-permissions",
                    "--pure",
                  ],
                  cwd,
                  {
                    NAIRI_API_KEY: process.env.NAIRI_API_KEY || "",
                  }
                );
                
                // Fallback: If session doesn't exist yet, run without the --session flag to create it.
                const hasSessionNotFoundError = 
                  r.stderr.toLowerCase().includes("session not found") || 
                  r.stdout.toLowerCase().includes("session not found") ||
                  r.stderr.includes("NotFoundError") ||
                  r.stdout.includes("NotFoundError");

                if (hasSessionNotFoundError) {
                  r = await runCliCommand(
                    cmdPath,
                    [
                      "run",
                      message,
                      sessionFlag,
                      opencodeSessionId,
                      "--fork",
                      "--model",
                      targetModel,
                      "--dangerously-skip-permissions",
                      "--pure",
                    ],
                    cwd,
                    {
                      NAIRI_API_KEY: process.env.NAIRI_API_KEY || "",
                    }
                  );
                }
                
                stdout = r.stdout;
                stderr = r.stderr;
                code = r.code;
              } else if (targetCmd === "claude") {
                let modelFlag: string[] = [];
                if (agent === "nairi-claude-opus") {
                  modelFlag = ["--model", "opus"];
                } else if (agent === "nairi-claude-opus-4-6") {
                  modelFlag = ["--model", "claude-opus-4-6"];
                } else if (agent === "nairi-claude-opus-4-7") {
                  modelFlag = ["--model", "claude-opus-4-7"];
                } else if (agent === "nairi-claude-opus-4-8") {
                  modelFlag = ["--model", "claude-opus-4-8"];
                } else if (agent === "nairi-claude-3-7-sonnet") {
                  modelFlag = ["--model", "claude-3-7-sonnet-20250219"];
                } else if (agent === "nairi-claude-sonnet-4-6") {
                  modelFlag = ["--model", "claude-sonnet-4-6"];
                } else if (agent === "nairi-claude") {
                  modelFlag = ["--model", "claude-3-5-sonnet-20241022"];
                }

                const r = await runCliCommand(
                  cmdPath,
                  ["-p", message, "-r", sessionId, "--dangerously-skip-permissions", "--system-prompt", seoSystemInstruction, ...modelFlag],
                  cwd
                );
                if (
                  r.code !== 0 &&
                  (r.stderr.includes("No conversation found") ||
                    r.stdout.includes("No conversation found"))
                ) {
                  const initRes = await runCliCommand(
                    cmdPath,
                    ["-p", message, "--session-id", sessionId, "--dangerously-skip-permissions", "--system-prompt", seoSystemInstruction, ...modelFlag],
                    cwd
                  );
                  stdout = initRes.stdout;
                  stderr = initRes.stderr;
                  code = initRes.code;
                } else {
                  stdout = r.stdout;
                  stderr = r.stderr;
                  code = r.code;
                }
              } else {
                let modelFlag: string[] = [];
                if (agent === "nairi-gemini-2-5-pro") {
                  modelFlag = ["--model", "gemini-2.5-pro"];
                } else if (agent === "nairi-gemini-3-0-flash") {
                  modelFlag = ["--model", "gemini-3.0-flash"];
                } else if (agent === "nairi-gemini-3-0-pro") {
                  modelFlag = ["--model", "gemini-3.0-pro"];
                } else if (agent === "nairi-gemini-3-5-flash") {
                  modelFlag = ["--model", "gemini-3.5-flash"];
                } else if (agent === "nairi-gemini-3-5-pro") {
                  modelFlag = ["--model", "gemini-3.5-pro"];
                } else if (agent === "nairi-gemini") {
                  modelFlag = ["--model", "gemini-2.5-flash"];
                }

                const geminiMessage = `[SYSTEM INSTRUCTION: ${seoSystemInstruction}]\n\nUser Message: ${message}`;
                const r = await runCliCommand(
                  cmdPath,
                  ["-p", geminiMessage, "--resume", sessionId, "--skip-trust", "--sandbox", ...modelFlag],
                  cwd
                );
                if (
                  r.code !== 0 &&
                  (r.stderr.includes("Invalid session identifier") ||
                    r.stdout.includes("Invalid session identifier") ||
                    r.stderr.includes("Error resuming session") ||
                    r.stdout.includes("Error resuming session"))
                ) {
                  const initRes = await runCliCommand(
                    cmdPath,
                    ["-p", geminiMessage, "--session-id", sessionId, "--skip-trust", "--sandbox", ...modelFlag],
                    cwd
                  );
                  stdout = initRes.stdout;
                  stderr = initRes.stderr;
                  code = initRes.code;
                } else {
                  stdout = r.stdout;
                  stderr = r.stderr;
                  code = r.code;
                }
              }

              const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
              let cleanOutput = stdout
                .replace(ansiRegex, "")
                .replace(/Warning: Basic terminal detected[\s\S]*?visual experience\./g, "")
                .replace(/Warning: 256-color support not detected[\s\S]*?visual experience\./g, "")
                .replace(/^> build[\s\S]*?\n/i, "") // remove build model banner
                .replace(/^![\s\S]*?default agent\n/i, "") // remove fallback warnings
                .replace(/\r/g, "\n")
                .trim();

              res.statusCode = 200;
              res.end(
                JSON.stringify({
                  success: code === 0,
                  output: cleanOutput || stderr.replace(ansiRegex, "") || stdout.replace(ansiRegex, ""),
                  rawStderr: stderr,
                })
              );
              return;
            } else if (action === "list-files") {
              const cwd = getSessionPath(sessionId);
              if (!fs.existsSync(cwd)) {
                res.statusCode = 200;
                res.end(JSON.stringify({ success: true, files: [] }));
                return;
              }
              const files = listFilesRecursive(cwd, cwd);
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, files }));
              return;
            } else if (action === "read-file") {
              const { filePath } = body;
              if (!filePath) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: "Missing filePath" }));
                return;
              }

              const cwd = getSessionPath(sessionId);
              const absolutePath = path.resolve(cwd, filePath);
              if (!absolutePath.startsWith(cwd)) {
                res.statusCode = 403;
                res.end(JSON.stringify({ success: false, content: "Access Denied" }));
                return;
              }

              if (!fs.existsSync(absolutePath)) {
                res.statusCode = 404;
                res.end(JSON.stringify({ success: false, content: "File not found" }));
                return;
              }

              const content = fs.readFileSync(absolutePath, "utf-8");
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, content }));
              return;
            } else {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "Invalid action" }));
              return;
            }
          } catch (error: any) {
            console.error("Sandbox Bridge Error:", error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message || "Internal Server Error" }));
            return;
          }
        } else {
          next();
        }
      });
    },
  };
}
