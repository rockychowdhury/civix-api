import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import { buildPrismaQuery } from "../../utils/QueryBuilder";
import { notificationSearchableFields } from "./notification.constant";

const getMyNotifications = async (
	userId: string,
	filters: any = {},
	options: any = {},
) => {
	const { where, orderBy, skip, take, page, limit } = buildPrismaQuery(
		filters,
		options,
		notificationSearchableFields,
	);

	where.userId = userId;

	const [data, total, unreadCount] = await Promise.all([
		prisma.notification.findMany({
			where,
			orderBy: Object.keys(orderBy).length ? orderBy : { createdAt: "desc" },
			skip,
			take,
		}),
		prisma.notification.count({ where }),
		prisma.notification.count({ where: { userId, isRead: false } }),
	]);

	return {
		data,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
			unreadCount,
		},
	};
};

const markAsRead = async (userId: string, notificationId: string) => {
	const notification = await prisma.notification.findUnique({
		where: { id: notificationId },
	});

	if (!notification) {
		throw new AppError(httpStatus.NOT_FOUND, "Notification not found");
	}

	if (notification.userId !== userId) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You can only update your own notifications",
		);
	}

	const updated = await prisma.notification.update({
		where: { id: notificationId },
		data: { isRead: true, readAt: new Date() },
	});

	return updated;
};

const markAllAsRead = async (userId: string) => {
	await prisma.notification.updateMany({
		where: { userId, isRead: false },
		data: { isRead: true, readAt: new Date() },
	});
};

export const NotificationService = {
	getMyNotifications,
	markAsRead,
	markAllAsRead,
};
