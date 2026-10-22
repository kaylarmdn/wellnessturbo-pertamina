import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PaginationControlProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  className?: string;
  showInfo?: boolean;
  scrollToTop?: boolean;
  itemLabel?: string;
}

export function PaginationControl({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  className,
  showInfo = true,
  scrollToTop = true,
  itemLabel = "data",
}: PaginationControlProps) {
  if (totalPages <= 1 && (!totalItems || totalItems <= (pageSize || 10))) {
    return null;
  }

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
    if (scrollToTop && typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Generate page numbers with ellipses
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      if (start > 2) {
        pages.push("ellipsis");
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push("ellipsis");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const startItem = totalItems && pageSize ? (currentPage - 1) * pageSize + 1 : undefined;
  const endItem =
    totalItems && pageSize ? Math.min(currentPage * pageSize, totalItems) : undefined;

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 pb-2 text-sm text-slate-600",
        className
      )}
    >
      {/* Information text */}
      {showInfo && totalItems !== undefined ? (
        <div className="text-xs sm:text-sm font-medium text-slate-500 order-2 sm:order-1">
          Menampilkan{" "}
          <span className="font-semibold text-slate-800">
            {totalItems === 0 ? 0 : `${startItem}-${endItem}`}
          </span>{" "}
          dari <span className="font-semibold text-slate-800">{totalItems}</span> {itemLabel}
        </div>
      ) : (
        <div className="order-2 sm:order-1" />
      )}

      {/* Pagination buttons */}
      <div className="flex items-center gap-1 order-1 sm:order-2 flex-wrap justify-center">
        {/* First Page */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(1)}
          disabled={currentPage <= 1}
          aria-label="Halaman Pertama"
          className="h-8 w-8 rounded-xl border-slate-200 text-slate-600 disabled:opacity-40"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Previous */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Halaman Sebelumnya"
          className="h-8 w-8 rounded-xl border-slate-200 text-slate-600 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page numbers */}
        {getPageNumbers().map((p, idx) => {
          if (p === "ellipsis") {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="px-2 text-xs font-bold text-slate-400 select-none"
              >
                ...
              </span>
            );
          }

          const isActive = p === currentPage;
          return (
            <Button
              key={`page-${p}`}
              type="button"
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => handlePageChange(p)}
              className={cn(
                "h-8 min-w-[2rem] px-2.5 rounded-xl text-xs font-bold transition-all",
                isActive
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-400/30 border-transparent"
                  : "border-slate-200 text-slate-700 hover:bg-slate-100"
              )}
            >
              {p}
            </Button>
          );
        })}

        {/* Next */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Halaman Selanjutnya"
          className="h-8 w-8 rounded-xl border-slate-200 text-slate-600 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last Page */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage >= totalPages}
          aria-label="Halaman Terakhir"
          className="h-8 w-8 rounded-xl border-slate-200 text-slate-600 disabled:opacity-40"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Helper hook to easily manage client-side pagination for any array
 */
export function usePagination<T>(items: T[], pageSize = 10, initialPage = 1) {
  const [currentPage, setCurrentPage] = React.useState(initialPage);

  // Reset to page 1 if item count drops below current page bounds
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedItems = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  return {
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedItems,
    totalItems: items.length,
    pageSize,
  };
}
