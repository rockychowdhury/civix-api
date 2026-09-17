/**
 * Generate Work Order title tailored for technicians.
 */
export const generateWorkOrderTitle = (categoryName: string, issueNumber: string): string => {
	return `[${categoryName}] - Action Required (${issueNumber})`;
};

/**
 * Generate Work Order description tailored for technicians.
 */
export const generateWorkOrderDescription = (
	workInstructions: string | null,
	location: { address?: string | null; landmark?: string | null; postalCode?: string | null } | null
): string => {
	const instructions = workInstructions || "Standard operating procedure applies. Assess the situation and report updates.";
	
	const locationParts: string[] = [];
	if (location?.address) locationParts.push(location.address);
	if (location?.landmark) locationParts.push(`Landmark: ${location.landmark}`);
	if (location?.postalCode) locationParts.push(`Postal Code: ${location.postalCode}`);
	
	const locationDetails = locationParts.join(", ");
	
	return `Location: ${locationDetails || "N/A"}\n\nInstructions:\n${instructions}`;
};
