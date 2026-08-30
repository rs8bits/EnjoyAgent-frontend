import type { PagedResponse } from "@/app/types/api";

export async function fetchAllPages<T>(
  loadPage: (page: number, size: number) => Promise<PagedResponse<T>>,
  pageSize = 200,
  concurrency = 4
) {
  const firstPage = await loadPage(0, pageSize);
  if (firstPage.totalPages <= 1) {
    return firstPage.items;
  }

  const remainingPages: PagedResponse<T>[] = [];
  const batchSize = Math.max(1, Math.floor(concurrency));
  for (let startPage = 1; startPage < firstPage.totalPages; startPage += batchSize) {
    const endPage = Math.min(startPage + batchSize, firstPage.totalPages);
    remainingPages.push(...await Promise.all(
      Array.from({ length: endPage - startPage }, (_, index) => loadPage(startPage + index, pageSize))
    ));
  }
  return [firstPage, ...remainingPages].flatMap((page) => page.items);
}
