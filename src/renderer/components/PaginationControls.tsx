import { useSearchParams } from "react-router-dom";

const PATIENTS_PER_PAGE = 10;

type PaginationControlsProps = {
  totalPages: number;
  totalCount: number;
  itemLabel?: string;
};

export function PaginationControls({
  totalPages,
  totalCount,
  itemLabel = "items",
}: PaginationControlsProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentPage = Math.max(
    1,
    parseInt(searchParams.get("page") || "1", 10)
  );

  const displayStart =
    totalCount === 0 ? 0 : (currentPage - 1) * PATIENTS_PER_PAGE + 1;
  const displayEnd = Math.min(currentPage * PATIENTS_PER_PAGE, totalCount);

  const handlePrevious = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  const handlePageChange = (page: number) => {
    setSearchParams({ page: String(page) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* Pagination Controls */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          Affichage de {displayStart} à {displayEnd} sur {totalCount}{" "}
          {itemLabel}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevious}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Précédent
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => {
              const page = i + 1;
              const isCurrentPage = page === currentPage;
              const isNear =
                Math.abs(page - currentPage) <= 1 ||
                page === 1 ||
                page === totalPages;

              if (!isNear) return null;

              if (!isNear && page > 1 && page < totalPages) {
                return (
                  <span key={`ellipsis-${page}`} className="px-1 text-gray-400">
                    ...
                  </span>
                );
              }

              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`w-8 h-8 text-sm font-medium rounded-lg transition-colors ${
                    isCurrentPage
                      ? "bg-sky-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleNext}
            disabled={currentPage >= totalPages}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Suivant
          </button>
        </div>
      </div>

      {/* Patient Count Summary */}
      <div className="text-center text-sm text-gray-500">
        Page {currentPage} sur {totalPages}
      </div>
    </>
  );
}
