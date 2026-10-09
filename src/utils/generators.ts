// Utility for generating random passwords if none provided
export const generatePassword = () => Math.random().toString(36).slice(-8);

// Utility for unique Employee IDs
export const generateEmployeeId = (rolePrefix: string) => {
	const rand = Math.floor(1000 + Math.random() * 9000);
	return `${rolePrefix}-${Date.now().toString().slice(-4)}${rand}`;
};
