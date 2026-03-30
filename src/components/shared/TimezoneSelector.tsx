import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const STORAGE_KEY = "ff_timezone"

function getStoredTimezone(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return "UTC"
  }
}

function storeTimezone(tz: string) {
  try {
    localStorage.setItem(STORAGE_KEY, tz)
  } catch {
    // ignore
  }
}

// UTC offset timezones: one entry per offset, with a representative city
const UTC_OFFSETS = [
  { value: "Etc/GMT+12", offset: -12, label: "UTC-12" },
  { value: "Etc/GMT+11", offset: -11, label: "UTC-11" },
  { value: "Etc/GMT+10", offset: -10, label: "UTC-10", city: "Honolulu" },
  { value: "Etc/GMT+9", offset: -9, label: "UTC-9", city: "Anchorage" },
  { value: "Etc/GMT+8", offset: -8, label: "UTC-8", city: "Los Angeles" },
  { value: "Etc/GMT+7", offset: -7, label: "UTC-7", city: "Denver" },
  { value: "Etc/GMT+6", offset: -6, label: "UTC-6", city: "Chicago" },
  { value: "Etc/GMT+5", offset: -5, label: "UTC-5", city: "New York" },
  { value: "Etc/GMT+4", offset: -4, label: "UTC-4", city: "Santiago" },
  { value: "Etc/GMT+3", offset: -3, label: "UTC-3", city: "São Paulo" },
  { value: "Etc/GMT+2", offset: -2, label: "UTC-2" },
  { value: "Etc/GMT+1", offset: -1, label: "UTC-1" },
  { value: "UTC", offset: 0, label: "UTC", city: "London" },
  { value: "Etc/GMT-1", offset: 1, label: "UTC+1", city: "Berlin" },
  { value: "Etc/GMT-2", offset: 2, label: "UTC+2", city: "Athens" },
  { value: "Etc/GMT-3", offset: 3, label: "UTC+3", city: "Moscow" },
  { value: "Etc/GMT-4", offset: 4, label: "UTC+4", city: "Dubai" },
  { value: "Etc/GMT-5", offset: 5, label: "UTC+5", city: "Karachi" },
  { value: "Asia/Kolkata", offset: 5.5, label: "UTC+5:30", city: "Mumbai" },
  { value: "Etc/GMT-6", offset: 6, label: "UTC+6", city: "Dhaka" },
  { value: "Etc/GMT-7", offset: 7, label: "UTC+7", city: "Bangkok" },
  { value: "Etc/GMT-8", offset: 8, label: "UTC+8", city: "Singapore" },
  { value: "Etc/GMT-9", offset: 9, label: "UTC+9", city: "Tokyo" },
  { value: "Etc/GMT-10", offset: 10, label: "UTC+10", city: "Sydney" },
  { value: "Etc/GMT-11", offset: 11, label: "UTC+11" },
  { value: "Etc/GMT-12", offset: 12, label: "UTC+12", city: "Auckland" },
  { value: "Etc/GMT-13", offset: 13, label: "UTC+13" },
  { value: "Etc/GMT-14", offset: 14, label: "UTC+14" },
] as { value: string; offset: number; label: string; city?: string }[]

// Map common IANA zones to our UTC offset values for display
function normalizeTimezone(tz: string): string {
  // If it's already one of our values, use it
  if (UTC_OFFSETS.some((o) => o.value === tz)) return tz
  // Otherwise try to find the matching offset
  try {
    const now = new Date()
    const offset = -new Date(now.toLocaleString("en-US", { timeZone: tz })).getTimezoneOffset() / 60
    const match = UTC_OFFSETS.find((o) => o.offset === offset)
    return match?.value ?? tz
  } catch {
    return tz
  }
}

function getDisplayLabel(tz: string): string {
  const entry = UTC_OFFSETS.find((o) => o.value === tz)
  if (entry) return entry.city ? `${entry.label} (${entry.city})` : entry.label
  // Fallback for IANA zones
  return tz.replace(/_/g, " ").split("/").pop() ?? tz
}

interface TimezoneSelectorProps {
  value?: string
  onChange?: (timezone: string) => void
}

export function TimezoneSelector({ value, onChange }: TimezoneSelectorProps) {
  const currentTz = value || getStoredTimezone()
  const normalized = normalizeTimezone(currentTz)

  const handleChange = (tz: string) => {
    storeTimezone(tz)
    onChange?.(tz)
  }

  return (
    <Select value={normalized} onValueChange={handleChange}>
      <SelectTrigger className="w-[200px] h-9 text-xs">
        <SelectValue>{getDisplayLabel(normalized)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {UTC_OFFSETS.map((tz) => (
          <SelectItem key={tz.value} value={tz.value} className="text-xs">
            <span className="font-mono">{tz.label}</span>
            {tz.city && <span className="text-muted-foreground ml-2">{tz.city}</span>}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export { getStoredTimezone }
