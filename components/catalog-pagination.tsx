import Link from 'next/link';

type CatalogPaginationProps = {
  basePath: string;
  page: number;
  totalPages: number;
};

function pageHref(basePath: string, page: number) {
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}

export function CatalogPagination({ basePath, page, totalPages }: CatalogPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav className="catalog-pagination" aria-label="Catalog pagination">
      <div>
        {page > 1 ? (
          <Link rel="prev" href={pageHref(basePath, page - 1)}>← Previous</Link>
        ) : <span aria-hidden="true" />}
      </div>
      <span>Page {page} of {totalPages}</span>
      <div>
        {page < totalPages ? (
          <Link rel="next" href={pageHref(basePath, page + 1)}>Next →</Link>
        ) : <span aria-hidden="true" />}
      </div>
    </nav>
  );
}
