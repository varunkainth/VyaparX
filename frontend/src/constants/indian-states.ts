export interface IndianState {
  code: string;
  name: string;
  type: "state" | "union_territory";
}

export const INDIAN_STATES: IndianState[] = [
  // States
  { code: "01", name: "Jammu and Kashmir", type: "union_territory" },
  { code: "02", name: "Himachal Pradesh", type: "state" },
  { code: "03", name: "Punjab", type: "state" },
  { code: "04", name: "Chandigarh", type: "union_territory" },
  { code: "05", name: "Uttarakhand", type: "state" },
  { code: "06", name: "Haryana", type: "state" },
  { code: "07", name: "Delhi", type: "union_territory" },
  { code: "08", name: "Rajasthan", type: "state" },
  { code: "09", name: "Uttar Pradesh", type: "state" },
  { code: "10", name: "Bihar", type: "state" },
  { code: "11", name: "Sikkim", type: "state" },
  { code: "12", name: "Arunachal Pradesh", type: "state" },
  { code: "13", name: "Nagaland", type: "state" },
  { code: "14", name: "Manipur", type: "state" },
  { code: "15", name: "Mizoram", type: "state" },
  { code: "16", name: "Tripura", type: "state" },
  { code: "17", name: "Meghalaya", type: "state" },
  { code: "18", name: "Assam", type: "state" },
  { code: "19", name: "West Bengal", type: "state" },
  { code: "20", name: "Jharkhand", type: "state" },
  { code: "21", name: "Odisha", type: "state" },
  { code: "22", name: "Chhattisgarh", type: "state" },
  { code: "23", name: "Madhya Pradesh", type: "state" },
  { code: "24", name: "Gujarat", type: "state" },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu", type: "union_territory" },
  { code: "27", name: "Maharashtra", type: "state" },
  { code: "29", name: "Karnataka", type: "state" },
  { code: "30", name: "Goa", type: "state" },
  { code: "31", name: "Lakshadweep", type: "union_territory" },
  { code: "32", name: "Kerala", type: "state" },
  { code: "33", name: "Tamil Nadu", type: "state" },
  { code: "34", name: "Puducherry", type: "union_territory" },
  { code: "35", name: "Andaman and Nicobar Islands", type: "union_territory" },
  { code: "36", name: "Telangana", type: "state" },
  { code: "37", name: "Andhra Pradesh", type: "state" },
  { code: "38", name: "Ladakh", type: "union_territory" },
  { code: "97", name: "Other Territory", type: "union_territory" },
];

// Helper function to get state by code
export function getStateByCode(code: string): IndianState | undefined {
  return INDIAN_STATES.find((state) => state.code === code);
}

// Helper function to get state by name
export function getStateByName(name: string): IndianState | undefined {
  return INDIAN_STATES.find(
    (state) => state.name.toLowerCase() === name.toLowerCase()
  );
}

// Helper function to get all state codes
export function getAllStateCodes(): string[] {
  return INDIAN_STATES.map((state) => state.code);
}

// Helper function to get all state names
export function getAllStateNames(): string[] {
  return INDIAN_STATES.map((state) => state.name);
}

// Helper function to format state display (code - name)
export function formatStateDisplay(state: IndianState): string {
  return `${state.code} - ${state.name}`;
}
