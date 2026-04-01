import { INDIAN_STATES, type IndianState } from "@/constants/indian-states"
import { pinZones } from "@/constants/pin-data"

const STATE_NAME_ALIASES: Record<string, string> = {
  "jammu & kashmir": "jammu and kashmir",
  "dadra & nagar haveli and daman & diu": "dadra and nagar haveli and daman and diu",
  "army postal service": "other territory",
}

const normalizeStateName = (name: string) => {
  const normalized = name.trim().toLowerCase()
  return STATE_NAME_ALIASES[normalized] ?? normalized
}

const indianStateByNormalizedName = new Map<string, IndianState>(
  INDIAN_STATES.map((state) => [normalizeStateName(state.name), state])
)

const pinStateCodeSet = new Set<string>()
const pincodePrefixToStateCodes = new Map<string, Set<string>>()

for (const zone of pinZones) {
  for (const subzone of zone.subzones) {
    const matchedStateCodes = new Set<string>()

    for (const state of subzone.states) {
      const indianState = indianStateByNormalizedName.get(normalizeStateName(state.name))
      if (indianState) {
        matchedStateCodes.add(indianState.code)
        pinStateCodeSet.add(indianState.code)
      }
    }

    if (!pincodePrefixToStateCodes.has(subzone.code)) {
      pincodePrefixToStateCodes.set(subzone.code, new Set<string>())
    }

    const existing = pincodePrefixToStateCodes.get(subzone.code)
    if (existing) {
      for (const stateCode of matchedStateCodes) {
        existing.add(stateCode)
      }
    }
  }
}

export const PIN_MAPPED_STATES: IndianState[] = INDIAN_STATES.filter((state) =>
  pinStateCodeSet.has(state.code)
)

export function formatPinMappedStateDisplay(state: IndianState): string {
  return `${state.code} - ${state.name}`
}

export function getStateCodesForPincode(pincode: string): string[] {
  const prefix = pincode.trim().slice(0, 2)
  if (prefix.length < 2) return []

  const stateCodes = pincodePrefixToStateCodes.get(prefix)
  return stateCodes ? Array.from(stateCodes) : []
}

export function getStateNameForCode(stateCode: string): string | undefined {
  return PIN_MAPPED_STATES.find((state) => state.code === stateCode)?.name
}

export function getPreferredStateCodeForPincode(
  pincode: string,
  currentStateCode?: string
): string | undefined {
  const stateCodes = getStateCodesForPincode(pincode)

  if (stateCodes.length === 0) {
    return undefined
  }

  if (currentStateCode && stateCodes.includes(currentStateCode)) {
    return currentStateCode
  }

  if (stateCodes.length === 1) {
    return stateCodes[0]
  }

  return undefined
}

export function isStateCodeValidForPincode(stateCode: string, pincode: string): boolean {
  if (!stateCode || !pincode) {
    return true
  }

  const stateCodes = getStateCodesForPincode(pincode)
  if (stateCodes.length === 0) {
    return false
  }

  return stateCodes.includes(stateCode)
}
