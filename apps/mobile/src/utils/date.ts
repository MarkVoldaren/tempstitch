export function formatDateLabel(dateString: string) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateShort(dateString: string) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function formatWeekday(dateString: string, short = false) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString(undefined, {
    weekday: short ? "short" : "long",
  });
}

export function formatMonthLabel(dateString: string) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function getYearBounds(year: number) {
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
}

export function enumerateDateRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);

  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export function compareIsoDates(a: string, b: string) {
  return new Date(`${a}T12:00:00`).getTime() - new Date(`${b}T12:00:00`).getTime();
}

export function clampDateRange(startDate: string, endDate: string) {
  if (compareIsoDates(startDate, endDate) <= 0) {
    return { startDate, endDate };
  }

  return { startDate: endDate, endDate: startDate };
}

export function getMonthKey(dateString: string) {
  return dateString.slice(0, 7);
}

export function getMonthBreakIndexes(dateStrings: string[]) {
  const markers: Array<{ index: number; label: string; key: string }> = [];
  let previousKey = "";

  dateStrings.forEach((dateString, index) => {
    const key = getMonthKey(dateString);
    if (key !== previousKey) {
      markers.push({
        index,
        key,
        label: formatMonthLabel(dateString),
      });
      previousKey = key;
    }
  });

  return markers;
}

export function getMonthGroups(dateStrings: string[]) {
  const groups: Array<{ key: string; label: string; dates: string[] }> = [];

  dateStrings.forEach((dateString) => {
    const key = getMonthKey(dateString);
    const existing = groups[groups.length - 1];
    if (!existing || existing.key !== key) {
      groups.push({
        key,
        label: formatMonthLabel(dateString),
        dates: [dateString],
      });
      return;
    }

    existing.dates.push(dateString);
  });

  return groups;
}
