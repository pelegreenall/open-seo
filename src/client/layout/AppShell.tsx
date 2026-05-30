import * as React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronsUpDown,
  CircleHelp,
  CreditCard,
  Menu,
  Settings,
  Terminal,
  User,
  Sparkles,
} from "lucide-react";
import { Sidebar } from "@/client/components/Sidebar";
import { Logo } from "@/client/components/Logo";
import { ChatSidebar } from "@/client/features/ai-chat/ChatSidebar";
import {
  AppContent,
  MissingSeoSetupModal,
  SeoApiStatusBanners,
} from "@/client/layout/AppShellParts";
import { getProjectNavGroups } from "@/client/navigation/items";
import { signOutAndRedirect, useSession } from "@/lib/auth-client";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { BILLING_ROUTE } from "@/shared/billing";
import { getSeoApiKeyStatus } from "@/serverFunctions/config";
import { getOrCreateDefaultProject } from "@/serverFunctions/projects";

const DATAFORSEO_HELP_PATH = "/help/dataforseo-api-key";
const SUPPORT_PATH = "/support";

export function AuthenticatedAppLayout({
  children,
  projectId,
  banner,
}: {
  children: React.ReactNode;
  projectId?: string;
  banner?: React.ReactNode;
}) {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const setupModalRef = React.useRef<HTMLDivElement | null>(null);
  const [showMissingSeoApiKeyModal, setShowMissingSeoApiKeyModal] =
    React.useState(false);
  const defaultProjectQuery = useQuery({
    queryKey: ["defaultProject"],
    queryFn: () => getOrCreateDefaultProject(),
    enabled: !projectId,
  });
  const headerProjectId = projectId ?? defaultProjectQuery.data?.id ?? null;
  const shouldCheckSeoApiKeyStatus = location.pathname !== BILLING_ROUTE;
  const seoApiKeyStatusQuery = useQuery({
    queryKey: ["seoApiKeyStatus"],
    queryFn: () => getSeoApiKeyStatus(),
    enabled: shouldCheckSeoApiKeyStatus,
  });
  const isSeoApiKeyConfigured = shouldCheckSeoApiKeyStatus
    ? (seoApiKeyStatusQuery.data?.configured ?? null)
    : null;
  const seoApiKeyStatusError =
    shouldCheckSeoApiKeyStatus && seoApiKeyStatusQuery.isError;

  const [chatOpen, setChatOpen] = React.useState(false);
  const [chatWidth, setChatWidth] = React.useState<number>(() => {
    if (typeof window !== "undefined") {
      const savedWidth = localStorage.getItem("openseo_chat_width");
      return savedWidth ? parseInt(savedWidth, 10) : 380;
    }
    return 380;
  });

  const handleChatWidthChange = (newWidth: number) => {
    setChatWidth(newWidth);
    localStorage.setItem("openseo_chat_width", String(newWidth));
  };

  React.useEffect(() => {
    if (!shouldCheckSeoApiKeyStatus) {
      setShowMissingSeoApiKeyModal(false);
      return;
    }

    if (seoApiKeyStatusQuery.isError) {
      setShowMissingSeoApiKeyModal(false);
      return;
    }

    if (!seoApiKeyStatusQuery.isSuccess) return;
    setShowMissingSeoApiKeyModal(!seoApiKeyStatusQuery.data.configured);
  }, [
    location.pathname,
    seoApiKeyStatusQuery.data,
    seoApiKeyStatusQuery.isError,
    seoApiKeyStatusQuery.isSuccess,
    shouldCheckSeoApiKeyStatus,
  ]);

  const shouldShowMissingSeoApiKeyModal =
    showMissingSeoApiKeyModal && location.pathname !== DATAFORSEO_HELP_PATH;

  const shouldShowSeoApiWarning =
    !seoApiKeyStatusError &&
    isSeoApiKeyConfigured === false &&
    !shouldShowMissingSeoApiKeyModal;

  React.useEffect(() => {
    if (!shouldShowMissingSeoApiKeyModal) return;

    setupModalRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowMissingSeoApiKeyModal(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [shouldShowMissingSeoApiKeyModal]);

  React.useEffect(() => {
    if (!projectId) {
      setDrawerOpen(false);
    }
  }, [projectId]);

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-base-200">
      {/* Persistent Left Sidebar on Desktop */}
      {headerProjectId && (
        <div className="hidden md:block h-full shrink-0">
          <Sidebar projectId={headerProjectId} />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col h-full min-w-0 overflow-hidden">
        <TopNav
          drawerOpen={drawerOpen}
          projectId={headerProjectId}
          pathname={location.pathname}
          onOpenDrawer={() => setDrawerOpen(true)}
          chatOpen={chatOpen}
          onToggleChat={() => setChatOpen((prev) => !prev)}
        />

        <SeoApiStatusBanners
          shouldShowSeoApiWarning={shouldShowSeoApiWarning}
          seoApiKeyStatusError={seoApiKeyStatusError}
        />

        {banner}

        <AppContent
          drawerOpen={drawerOpen}
          projectId={headerProjectId}
          onCloseDrawer={() => setDrawerOpen(false)}
        >
          {children}
        </AppContent>
      </div>

      {/* Chat Sidebar Drawer */}
      {chatOpen && headerProjectId && (
        <div
          style={{ width: `${chatWidth}px` }}
          className="h-full shrink-0 z-30 flex items-end border-l border-base-300 bg-base-100"
        >
          <ChatSidebar
            projectId={headerProjectId}
            onClose={() => setChatOpen(false)}
            width={chatWidth}
            onWidthChange={handleChatWidthChange}
          />
        </div>
      )}

      <MissingSeoSetupModal
        ref={setupModalRef}
        isOpen={shouldShowMissingSeoApiKeyModal}
        onClose={() => setShowMissingSeoApiKeyModal(false)}
      />
    </div>
  );
}

function TopNav({
  drawerOpen,
  projectId,
  pathname,
  onOpenDrawer,
  chatOpen,
  onToggleChat,
}: {
  drawerOpen: boolean;
  projectId: string | null;
  pathname: string;
  onOpenDrawer: () => void;
  chatOpen: boolean;
  onToggleChat: () => void;
}) {
  const isSupportActive = pathname === SUPPORT_PATH;
  const isSettingsActive = pathname === "/settings";

  return (
    <div className="navbar shrink-0 gap-2 border-b border-base-300 bg-base-100 h-16">
      <div className="flex flex-none items-center md:hidden">
        {projectId ? (
          <button
            type="button"
            className="btn btn-square btn-ghost"
            aria-label="Toggle sidebar"
            aria-expanded={drawerOpen}
            onClick={onOpenDrawer}
          >
            <Menu className="h-6 w-6" />
          </button>
        ) : null}
        <Link to="/" className="ml-1 flex items-center">
          <Logo className="h-9 w-auto text-base-content" />
        </Link>
      </div>

      <div className="hidden items-center gap-1 md:flex">
        {/* Navigation is persistent in the left sidebar on desktop */}
      </div>

      <div className="flex-1" />

      <div className="hidden flex-none items-center gap-2 md:flex">
        <div className="tooltip tooltip-bottom" data-tip="Help & Community">
          <Link
            to={SUPPORT_PATH}
            className={`btn btn-ghost btn-circle btn-sm ${
              isSupportActive
                ? "bg-primary/10 text-primary"
                : "text-base-content/60 hover:text-base-content"
            }`}
          >
            <CircleHelp className="h-4 w-4" />
          </Link>
        </div>

        <button
          type="button"
          onClick={onToggleChat}
          className={`btn btn-sm gap-1.5 font-semibold transition-all rounded-lg text-xs h-9 min-h-0 ${
            chatOpen
              ? "bg-primary text-primary-content hover:bg-primary/95 shadow-sm border-primary"
              : "btn-ghost border border-base-300 hover:bg-base-200 text-base-content/85"
          }`}
        >
          <Sparkles className="size-3.5" />
          <span>Ask AI</span>
        </button>

        <div className="tooltip tooltip-bottom" data-tip="Settings">
          <Link
            to="/settings"
            className={`btn btn-ghost btn-circle btn-sm ${
              isSettingsActive
                ? "bg-primary/10 text-primary"
                : "text-base-content/60 hover:text-base-content"
            }`}
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex items-center rounded-full border border-base-300 bg-base-100/70 px-1 py-1 shadow-sm">
          <div
            className="tooltip tooltip-left before:whitespace-nowrap"
            data-tip="Multiple projects coming soon"
          >
            <button
              type="button"
              className="flex h-10 cursor-default items-center gap-2 rounded-full px-3 text-left transition-colors hover:bg-base-200/80"
              aria-label="Current project"
            >
              <span className="max-w-28 truncate text-sm font-medium text-base-content">
                Default
              </span>
              <ChevronsUpDown className="size-3.5 shrink-0 text-base-content/35" />
            </button>
          </div>

          <AccountMenu />
        </div>
      </div>

      <AccountMenu mobileOnly />
    </div>
  );
}

function AccountMenu({ mobileOnly = false }: { mobileOnly?: boolean }) {
  const { data: session } = useSession();
  const isHostedMode = isHostedClientAuthMode();
  const email = session?.user?.email;

  const handleSignOut = () => signOutAndRedirect();

  const menu = (
    <div className={mobileOnly ? "ml-2 flex-none md:hidden" : "flex-none"}>
      <div className="dropdown dropdown-end">
        <button
          type="button"
          tabIndex={0}
          className={`btn btn-ghost btn-circle ${mobileOnly ? "" : "hover:bg-base-200/80"}`}
          aria-label="Open account menu"
        >
          <User className="h-5 w-5" />
        </button>
        <ul
          tabIndex={0}
          className="dropdown-content z-20 menu mt-3 min-w-56 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
        >
          {email ? (
            <li className="menu-title max-w-full">
              <span className="truncate text-base-content" data-ph-mask>
                {email}
              </span>
            </li>
          ) : null}
          {mobileOnly ? (
            <li>
              <Link to={SUPPORT_PATH} className="flex items-center gap-2">
                <CircleHelp className="h-4 w-4" />
                Help & Community
              </Link>
            </li>
          ) : null}
          {isHostedMode ? (
            <li>
              <Link to={BILLING_ROUTE} className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Billing
              </Link>
            </li>
          ) : null}
          <li>
            <Link to="/settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </li>
          {isHostedMode && email ? (
            <li>
              <button
                type="button"
                className="text-error"
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );

  if (mobileOnly) {
    return menu;
  }

  return (
    <>
      <div className="mx-1 h-6 w-px bg-base-300" />
      {menu}
    </>
  );
}
