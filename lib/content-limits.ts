export const MAX_DELIVERY_SLOTS = 5;

export function isValidDeliveryTimes(value: unknown): value is string[] {
	return Array.isArray(value)
		&& value.length >= 1
		&& value.length <= MAX_DELIVERY_SLOTS
		&& value.every((time) => typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time))
		&& new Set(value).size === value.length;
}