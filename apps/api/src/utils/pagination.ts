import type { Pagination } from "@/utils/serviceApi";

export const buildOffsetPagination = (
	totalItems: number,
	limit: number,
	offset: number
): Pagination => {
	const safeLimit = Math.max(1, limit);
	const safeOffset = Math.max(0, offset);
	const totalPages = Math.max(1, Math.ceil(totalItems / safeLimit));
	const currentPage = Math.floor(safeOffset / safeLimit) + 1;

	return {
		totalItems,
		limit: safeLimit,
		offset: safeOffset,
		currentPage,
		totalPages,
		hasPrevPage: currentPage > 1,
		hasNextPage: currentPage < totalPages,
		prevPage: currentPage > 1 ? currentPage - 1 : null,
		nextPage: currentPage < totalPages ? currentPage + 1 : null
	};
};
