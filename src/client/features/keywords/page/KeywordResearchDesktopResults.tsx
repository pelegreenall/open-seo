import {
  ChevronDown,
  Download,
  FileDown,
  RotateCcw,
  Save,
  Sheet,
  SlidersHorizontal,
} from "lucide-react";
import {
  downloadKeywordResearchCsv,
  KEYWORD_RESEARCH_HEADERS,
  keywordResearchExportRow,
} from "@/client/features/keywords/state/keywordControllerActions";
import { exportTableToSheets } from "@/client/lib/exportToSheets";
import { captureClientEvent } from "@/client/lib/posthog";
import {
  OverviewStats,
} from "@/client/features/keywords/components";
import type { KeywordResearchControllerState } from "./types";
import {
  FilterRangeInputs,
  FilterTextInput,
} from "./keywordResearchDesktopFilters";
import { KeywordResearchDesktopTable } from "./KeywordResearchDesktopTable";
import {
  KeywordResearchPagination,
  useKeywordResearchPagination,
} from "./KeywordResearchPagination";
import {
  TableBulkActionBar,
  TableBulkActionButton,
  TableBulkExportMenu,
} from "@/client/components/table/TableBulkActionBar";
import { DesktopSerpPanel } from "./KeywordResearchSerpPanel";

type Props = {
  controller: KeywordResearchControllerState;
};

export function KeywordResearchDesktopResults({ controller }: Props) {
  return (
    <div className="flex-1 hidden md:flex flex-col xl:flex-row overflow-y-auto xl:overflow-hidden gap-4">
      <DesktopKeywordPanel controller={controller} />
      <DesktopSerpPanel controller={controller} />
    </div>
  );
}

function DesktopKeywordPanel({ controller }: Props) {
  const {
    lastResultSource,
    lastUsedFallback,
    searchedKeyword,
    showApproximateMatchNotice,
  } = controller;

  return (
    <div className="order-2 xl:order-1 flex flex-col min-w-0 gap-2 xl:basis-3/5">
      {showApproximateMatchNotice ? (
        <div
          className="rounded-lg border border-warning/40 bg-warning/15 px-3 py-2 text-sm text-base-content"
          role="status"
        >
          No exact match for{" "}
          <span className="font-medium">"{searchedKeyword}"</span>. Showing
          closest related keywords instead.
          {lastUsedFallback ? (
            <span className="text-base-content/75">
              {" "}
              Source: {lastResultSource} fallback.
            </span>
          ) : null}
        </div>
      ) : null}
      {controller.overviewKeyword ? (
        <OverviewStats keyword={controller.overviewKeyword} />
      ) : null}
      <DesktopTableCard controller={controller} />
    </div>
  );
}

function DesktopTableCard({ controller }: Props) {
  const {
    activeFilterCount,
    filteredRows,
    rows,
    selectedRows,
    sheetsExportRows,
    showFilters,
  } = controller;
  const { page, pageSize, pageRows, setPage, setPageSize } =
    useKeywordResearchPagination(filteredRows);

  const keywordCountLabel =
    selectedRows.size > 0
      ? `${selectedRows.size} of ${filteredRows.length} selected`
      : activeFilterCount > 0
        ? `Showing ${filteredRows.length} of ${rows.length} keywords`
        : `Showing ${filteredRows.length} keywords`;

  const canExport = filteredRows.length > 0;
  const selectedExportRows = filteredRows
    .filter((row) => selectedRows.has(row.keyword))
    .map(keywordResearchExportRow);
  const handleExportToSheets = () => {
    void exportTableToSheets({
      headers: KEYWORD_RESEARCH_HEADERS,
      rows: sheetsExportRows,
      feature: "keyword_research",
    });
  };
  const handleExportSelectionToSheets = () => {
    void exportTableToSheets({
      headers: KEYWORD_RESEARCH_HEADERS,
      rows: selectedExportRows,
      feature: "keyword_research",
    });
  };
  const handleExportSelectionCsv = () => {
    downloadKeywordResearchCsv(selectedExportRows);
    captureClientEvent("data:export", {
      source_feature: "keyword_research",
      result_count: selectedExportRows.length,
      scope: "selection",
    });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 border border-base-300 rounded-xl bg-base-100 overflow-hidden">
      <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-base-300">
        <button
          className={`btn btn-ghost btn-sm gap-1.5 ${showFilters ? "btn-active" : ""}`}
          onClick={() => controller.setShowFilters((current) => !current)}
          title="Toggle table filters"
        >
          <SlidersHorizontal className="size-3.5" />
          Filters
          {activeFilterCount > 0 ? (
            <span className="badge badge-xs badge-primary border-0 text-primary-content">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
        <span className="text-sm text-base-content/60">
          {keywordCountLabel}
        </span>
        <div className="flex-1" />
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className={`btn btn-ghost btn-sm gap-1 ${!canExport ? "btn-disabled" : ""}`}
          >
            <Download className="size-3.5" />
            <span className="hidden lg:inline">Export</span>
            <ChevronDown className="size-3 opacity-60" />
          </div>
          <ul
            tabIndex={0}
            className="dropdown-content z-10 menu p-2 shadow-lg bg-base-100 border border-base-300 rounded-box w-56"
          >
            <li>
              <button onClick={handleExportToSheets} disabled={!canExport}>
                <Sheet className="size-4" />
                Export to Sheets
              </button>
            </li>
            <li>
              <button onClick={controller.exportCsv} disabled={!canExport}>
                <FileDown className="size-4" />
                Export CSV
              </button>
            </li>
          </ul>
        </div>
      </div>

      <TableBulkActionBar
        selectedCount={selectedRows.size}
        onClear={() => controller.setSelectedRows(new Set())}
        actions={
          <div className="flex items-center px-1.5">
            <TableBulkActionButton
              icon={<Save className="size-3.5" />}
              onClick={controller.handleSaveKeywords}
            >
              Save Keywords
            </TableBulkActionButton>
            <TableBulkExportMenu
              actions={[
                {
                  label: "Export to Sheets",
                  icon: <Sheet className="size-4" />,
                  onClick: handleExportSelectionToSheets,
                },
                {
                  label: "Export CSV",
                  icon: <FileDown className="size-4" />,
                  onClick: handleExportSelectionCsv,
                },
              ]}
            />
          </div>
        }
      />

      {showFilters ? <DesktopFilters controller={controller} /> : null}
      <KeywordResearchDesktopTable
        activeFilterCount={controller.activeFilterCount}
        filteredRows={pageRows}
        overviewKeyword={controller.overviewKeyword}
        selectedRows={controller.selectedRows}
        setSelectedRows={controller.setSelectedRows}
        sortDir={controller.sortDir}
        sortField={controller.sortField}
        toggleSort={controller.toggleSort}
        resetFilters={controller.resetFilters}
        handleRowClick={controller.handleRowClick}
      />
      {filteredRows.length > 0 ? (
        <KeywordResearchPagination
          page={page}
          pageSize={pageSize}
          totalCount={filteredRows.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      ) : null}
    </div>
  );
}

function DesktopFilters({ controller }: Props) {
  const { activeFilterCount, filtersForm } = controller;

  return (
    <div className="shrink-0 border-b border-base-300 bg-gradient-to-b from-base-100 to-base-200/30 px-4 py-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">Refine table results</p>
          {activeFilterCount > 0 ? (
            <span className="badge badge-xs badge-primary border-0 text-primary-content">
              {activeFilterCount} active
            </span>
          ) : null}
        </div>
        <button
          className="btn btn-xs btn-ghost gap-1"
          onClick={controller.resetFilters}
          disabled={activeFilterCount === 0}
        >
          <RotateCcw className="size-3" />
          Clear all
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <FilterTextInput
          form={filtersForm}
          name="include"
          label="Include Terms"
          placeholder="audit, checker, template"
        />
        <FilterTextInput
          form={filtersForm}
          name="exclude"
          label="Exclude Terms"
          placeholder="jobs, salary, course"
        />
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        <FilterRangeInputs
          form={filtersForm}
          title="Search Volume"
          minName="minVol"
          maxName="maxVol"
        />
        <FilterRangeInputs
          form={filtersForm}
          title="CPC (USD)"
          minName="minCpc"
          maxName="maxCpc"
          step="0.01"
        />
        <FilterRangeInputs
          form={filtersForm}
          title="Difficulty"
          minName="minKd"
          maxName="maxKd"
        />
      </div>
    </div>
  );
}
