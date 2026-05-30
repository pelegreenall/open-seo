import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Send,
  Terminal,
  Trash2,
  Lock,
  AlertTriangle,
  Bot,
  User,
  X,
  ChevronDown,
} from "lucide-react";
import { runCliChat } from "@/serverFunctions/ai-chat";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { z } from "zod";

const messageSchema = z.object({
  id: z.string(),
  sender: z.enum(["user", "bot"]),
  text: z.string(),
  timestamp: z.string(),
  agent: z.enum(["claude", "gemini"]),
});

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  agent: "claude" | "gemini";
}

function parseHistory(savedHistory: string | null): Message[] {
  if (!savedHistory) return [];
  try {
    const parsed: unknown = JSON.parse(savedHistory);
    if (!Array.isArray(parsed)) return [];
    const checkedMessages: Message[] = [];
    for (const item of parsed) {
      const result = messageSchema.safeParse(item);
      if (result.success) {
        checkedMessages.push(result.data);
      }
    }
    return checkedMessages;
  } catch (e) {
    console.error("Failed to parse chat history", e);
    return [];
  }
}

export function ChatSidebar({
  projectId,
  onClose,
  width,
  onWidthChange,
}: {
  projectId: string;
  onClose: () => void;
  width: number;
  onWidthChange: (w: number) => void;
}) {
  const [agent, setAgent] = React.useState<"claude" | "gemini">("claude");
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [sessionId, setSessionId] = React.useState<string>("");

  const [size, setSize] = React.useState<{ height: number; isCustomHeight: boolean }>(() => {
    if (typeof window !== "undefined") {
      const savedHeight = localStorage.getItem("openseo_chat_height");
      const savedCustom = localStorage.getItem("openseo_chat_custom_height");
      return {
        height: savedHeight ? parseInt(savedHeight, 10) : window.innerHeight,
        isCustomHeight: savedCustom === "true",
      };
    }
    return { height: 600, isCustomHeight: false };
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      setSize((prev) => {
        if (!prev.isCustomHeight) {
          return { ...prev, height: window.innerHeight };
        }
        return prev;
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  React.useEffect(() => {
    localStorage.setItem("openseo_chat_height", String(size.height));
    localStorage.setItem("openseo_chat_custom_height", String(size.isCustomHeight));
  }, [size]);

  const handleMouseDown = (direction: "left" | "top" | "corner") => (e: React.MouseEvent) => {
    e.preventDefault();
    const startWidth = width;
    const startHeight = size.height;
    const startX = e.clientX;
    const startY = e.clientY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      if (direction === "left" || direction === "corner") {
        const newWidth = Math.max(300, Math.min(window.innerWidth - 60, startWidth - deltaX));
        onWidthChange(newWidth);
      }
      if (direction === "top" || direction === "corner") {
        setSize((prev) => {
          const newHeight = Math.max(250, Math.min(window.innerHeight, startHeight - deltaY));
          const newCustom = newHeight < window.innerHeight;
          return {
            height: newCustom ? newHeight : window.innerHeight,
            isCustomHeight: newCustom,
          };
        });
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

  // Initialize Session ID and History on Mount
  // Initialize fresh Session ID and load Agent on Mount
  React.useEffect(() => {
    const sessionKey = `openseo_chat_session_${projectId}`;
    const agentKey = `openseo_chat_agent_${projectId}`;

    // Always generate a fresh session ID on mount
    const newSessionId = crypto.randomUUID();
    localStorage.setItem(sessionKey, newSessionId);
    setSessionId(newSessionId);

    // Clear messages to start fresh
    setMessages([]);

    const savedAgent = localStorage.getItem(agentKey);
    if (savedAgent === "claude" || savedAgent === "gemini") {
      setAgent(savedAgent);
    }
  }, [projectId]);

  // Persist agent choice
  const handleAgentChange = (newAgent: "claude" | "gemini") => {
    setAgent(newAgent);
    if (projectId) {
      localStorage.setItem(`openseo_chat_agent_${projectId}`, newAgent);
    }
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Chat message submission mutation
  const chatMutation = useMutation({
    mutationFn: (messageText: string) =>
      runCliChat({
        data: {
          agent,
          message: messageText,
          sessionId,
          projectId,
        },
      }),
    onSuccess: (data) => {
      const botMessage: Message = {
        id: crypto.randomUUID(),
        sender: "bot",
        text: data.output,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agent,
      };
      setMessages((prev) => [...prev, botMessage]);
    },
    onError: (error: unknown) => {
      const errMsg = error instanceof Error ? error.message : String(error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        sender: "bot",
        text: `Command Execution Failed: ${errMsg}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agent,
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;

    const userMessageText = input;
    setInput("");

    const userMessage: Message = {
      id: crypto.randomUUID(),
      sender: "user",
      text: userMessageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      agent,
    };

    setMessages((prev) => [...prev, userMessage]);
    chatMutation.mutate(userMessageText);
  };

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to start a new chat session?")) {
      const sessionKey = `openseo_chat_session_${projectId}`;
      const newSessionId = crypto.randomUUID();

      localStorage.setItem(sessionKey, newSessionId);
      setSessionId(newSessionId);
      setMessages([]);
    }
  };

  return (
    <div
      className={`relative w-full flex flex-col bg-base-100 transition-all duration-75 ${
        size.isCustomHeight ? "border-t border-base-300 rounded-tl-xl shadow-lg" : "h-full"
      }`}
      style={{
        height: size.isCustomHeight ? `${size.height}px` : "100%",
      }}
    >
      {/* Resize handles */}
      <div
        className="absolute left-0 top-0 w-1.5 h-full cursor-ew-resize hover:bg-primary/20 active:bg-primary/40 transition-colors z-50"
        onMouseDown={handleMouseDown("left")}
      />
      <div
        className="absolute top-0 left-0 h-1.5 w-full cursor-ns-resize hover:bg-primary/20 active:bg-primary/40 transition-colors z-50"
        onMouseDown={handleMouseDown("top")}
      />
      <div
        className="absolute top-0 left-0 w-3.5 h-3.5 cursor-nwse-resize hover:bg-primary/30 active:bg-primary/55 transition-colors z-50 rounded-tl-xl"
        onMouseDown={handleMouseDown("corner")}
      />
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b border-base-300 px-4 shrink-0 bg-base-200/50 h-16">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-inner">
            <Terminal className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-base-content leading-tight">Local AI Chat</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">

          {/* Clear Button */}
          <button
            type="button"
            className="btn btn-xs btn-ghost btn-square text-error hover:bg-error/10"
            onClick={handleClearHistory}
            title="Clear chat history"
          >
            <Trash2 className="size-3.5" />
          </button>

          {/* Close Sidebar Button */}
          <button
            type="button"
            className="btn btn-xs btn-ghost btn-square text-base-content/70 hover:bg-base-300"
            onClick={onClose}
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Message Panel */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gradient-to-b from-base-100 to-base-200/20 text-xs">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-[280px] mx-auto py-8">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
              <Bot className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-base-content">Start a Sandboxed Chat</h3>
            <p className="text-[11px] text-base-content/60 mt-1 leading-relaxed">
              Interact with the local {agent === "claude" ? "Claude Code" : "Gemini"} CLI.
              All operations are contained in `.sandbox-workspace/`.
            </p>
            <p className="text-[10px] text-warning/80 mt-3 flex items-center gap-1 bg-warning/5 px-2 py-1.5 rounded border border-warning/10">
              <AlertTriangle className="size-3 shrink-0" />
              CLI must be installed globally.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded shadow-sm text-[10px] ${
                  msg.sender === "user"
                    ? "bg-secondary text-secondary-content"
                    : "bg-primary text-primary-content"
                }`}
              >
                {msg.sender === "user" ? <User className="size-3" /> : <Bot className="size-3" />}
              </div>

              {/* Message Box */}
              <div className="flex flex-col max-w-[85%]">
                <div className="flex items-center gap-1.5 mb-0.5 px-0.5">
                  <span className="text-[10px] font-semibold text-base-content/70">
                    {msg.sender === "user" ? "You" : msg.agent === "claude" ? "Claude CLI" : "Gemini CLI"}
                  </span>
                  <span className="text-[8px] text-base-content/40">{msg.timestamp}</span>
                </div>

                <div
                  className={`rounded-xl px-3 py-2 shadow-sm border border-base-300/40 leading-relaxed break-words ${
                    msg.sender === "user"
                      ? "bg-secondary/15 text-base-content border-secondary/20"
                      : "bg-base-200/90 text-base-content prose prose-sm max-w-none"
                  }`}
                >
                  {msg.sender === "user" ? (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    <Markdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        pre: ({ children }) => (
                          <pre className="my-1.5 overflow-x-auto rounded bg-base-300/80 p-2 text-[10px] font-mono border border-base-400/10">
                            {children}
                          </pre>
                        ),
                        code: ({ children, className }) => {
                          if (typeof className === "string" && className.startsWith("language-")) {
                            return <code className={className}>{children}</code>;
                          }
                          return (
                            <code className="rounded bg-base-300 px-0.5 py-0.2 text-[10px] font-mono">
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {msg.text}
                    </Markdown>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Pending Response Indicator */}
        {chatMutation.isPending && (
          <div className="flex gap-2.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary text-primary-content shadow-sm">
              <Bot className="size-3" />
            </div>
            <div className="flex flex-col max-w-[85%]">
              <div className="flex items-center gap-1.5 mb-0.5 px-0.5">
                <span className="text-[10px] font-semibold text-base-content/70">
                  {agent === "claude" ? "Claude CLI" : "Gemini CLI"}
                </span>
                <span className="text-[8px] text-primary/70 animate-pulse">Running...</span>
              </div>
              <div className="rounded-xl bg-base-200/90 border border-base-300/40 px-3 py-2 shadow-sm flex items-center gap-2">
                <span className="loading loading-dots loading-xs text-primary" />
                <span className="text-[10px] text-base-content/60 font-mono">
                  Executing sandbox process...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="border-t border-base-300 p-3 shrink-0 bg-base-200/30">
        <form onSubmit={handleSend} className="relative flex items-center w-full gap-1.5">
          {/* Agent Dropdown */}
          <div className="dropdown dropdown-top dropdown-start shrink-0">
            <div
              tabIndex={0}
              role="button"
              className="btn btn-xs h-9 bg-base-100 border border-base-300 rounded-lg px-2 flex items-center gap-1 text-[11px] font-semibold text-base-content/75 hover:bg-base-200 shadow-sm"
            >
              <span>{agent === "claude" ? "Claude" : "Gemini"}</span>
              <ChevronDown className="size-3 text-base-content/40" />
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content z-[60] menu p-1 shadow-lg bg-base-100 rounded-lg w-28 border border-base-300 mb-1"
            >
              <li>
                <button
                  type="button"
                  className={`btn btn-xs h-7 min-h-0 justify-start font-medium text-[11px] ${
                    agent === "claude" ? "bg-primary text-primary-content hover:bg-primary/90" : "btn-ghost text-base-content/85"
                  }`}
                  onClick={() => {
                    handleAgentChange("claude");
                    if (document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                  }}
                >
                  Claude
                </button>
              </li>
              <li className="mt-0.5">
                <button
                  type="button"
                  className={`btn btn-xs h-7 min-h-0 justify-start font-medium text-[11px] ${
                    agent === "gemini" ? "bg-primary text-primary-content hover:bg-primary/90" : "btn-ghost text-base-content/85"
                  }`}
                  onClick={() => {
                    handleAgentChange("gemini");
                    if (document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                  }}
                >
                  Gemini
                </button>
              </li>
            </ul>
          </div>

          <div className="relative flex-1 flex items-center">
            <input
              type="text"
              placeholder={`Ask ${agent === "claude" ? "Claude" : "Gemini"}...`}
              className="input input-bordered w-full pr-10 rounded-lg bg-base-100 focus:outline-none focus:border-primary border-base-300 text-xs h-9 shadow-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={chatMutation.isPending}
            />
            <button
              type="submit"
              className={`absolute right-1.5 btn btn-circle btn-xs btn-primary h-6 w-6 min-h-0 ${
                chatMutation.isPending || !input.trim() ? "btn-disabled bg-base-300/40 text-base-content/30" : ""
              }`}
              disabled={chatMutation.isPending || !input.trim()}
            >
              <Send className="size-3" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
