import type { ThreadCommentDto, ThreadWithUserDto } from "@freediving.ph/types";

export type ThreadWithUser = ThreadWithUserDto;
export type ThreadComment = ThreadCommentDto;

export interface Thread {
	id: number;
	title: string;
	content: string;
	author: {
		id: number;
		username: string | null;
		alias: string | null;
	};
	tags: string[];
	likeCount: number;
	commentCount: number;
	createdAt: string;
	updatedAt: string;
}

export interface CreateThreadData {
	title: string;
	content: string;
	tags?: string[];
}

export interface UpdateThreadData {
	title?: string;
	content?: string;
	tags?: string[];
}

export interface ThreadFilters {
	search?: string;
	authorId?: number;
	sortBy?: "newest" | "oldest" | "most_liked" | "most_commented";
}
