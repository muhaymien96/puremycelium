export interface ParsedRow {
  timestamp: Date;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
  status: string;
  category: string;
  receiptNumber?: string;
}

export interface TransactionGroup {
  timestamp: Date;
  items: ParsedRow[];
  totalAmount: number;
  firstSku: string;
}

export interface ParseResult {
  groups: TransactionGroup[];
  totalRows: number;
  dateRange: { min: Date; max: Date } | null;
  warnings: string[];
}

export interface UniqueProduct {
  sku: string;
  name: string;
  occurrences: number;
}

// Support multiple header variants seen across Yoco exports
const YOCO_COLUMNS: Record<string, string[]> = {
  date: ["Date", "Payment date", "Transaction date"],
  time: ["Time", "Payment time", "Time created"],
  item: ["Item", "Item name", "Product"],
  sku: ["SKU", "Item code"],
  quantity: ["Quantity", "Qty"],
  unitPrice: ["Unit price", "Price"],
  totalInclTax: ["Total (incl tax)", "Amount", "Total"],
  status: ["Status", "Payment status"],
  category: ["Category", "Product category"],
  receiptNumber: ["Receipt number", "Transaction ID"],
  totalDiscount: ["Total discount"],
};

export function parseYocoCSV(
  csvContent: string,
  startDate?: Date,
  endDate?: Date
): ParseResult {
  const warnings: string[] = [];
  const rows: ParsedRow[] = [];

  const lines = csvContent.split("\n").filter((line) => line.trim());
  if (lines.length === 0) throw new Error("CSV file is empty");

  // Normalize end-of-day filtering
  const endOfDay = (date: Date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  };
  const effectiveEndDate = endDate ? endOfDay(endDate) : undefined;

  // Detect headers (within first 10 lines)
  let headerIndex = -1;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const parsed = parseCSVLine(lines[i]);
    if (
      parsed.some((h) =>
        YOCO_COLUMNS.date.some((v) =>
          h.toLowerCase().includes(v.toLowerCase())
        )
      )
    ) {
      headerIndex = i;
      headers = parsed.map((h) => h.trim());
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error("Could not detect headers. Ensure correct Yoco export.");
  }

  // Map correct column index for each field
  const colMap: Record<string, number> = {};
  Object.entries(YOCO_COLUMNS).forEach(([key, variants]) => {
    for (const v of variants) {
      const idx = headers.findIndex(
        (h) => h.toLowerCase() === v.toLowerCase()
      );
      if (idx !== -1) {
        colMap[key] = idx;
        break;
      }
    }
  });

  const requiredCols = ["date", "time", "item", "quantity", "totalInclTax"];
  const missing = requiredCols.filter((c) => colMap[c] === undefined);

  if (missing.length > 0) {
    throw new Error(
      `Missing required columns: ${missing.join(", ")}`
    );
  }

  // Parse rows
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (!values.length || values.every((v) => !v.trim())) continue;

    const rawStatus = values[colMap.status]?.trim() || "";
    const statusLc = rawStatus.toLowerCase();
    if (rawStatus && statusLc !== "approved") continue; // skip non-approved

    const dateStr = values[colMap.date]?.trim();
    const timeStr = values[colMap.time]?.trim();
    if (!dateStr || !timeStr) continue;

    const timestamp = parseYocoDateTime(dateStr, timeStr);

    // Correct filter logic 👍
    if (startDate && timestamp < startDate) continue;
    if (effectiveEndDate && timestamp > effectiveEndDate) continue;

    const productSku = values[colMap.sku]?.trim() || "";
    if (!productSku) {
      warnings.push(`Row ${i + 1}: Missing SKU — skipped`);
      continue;
    }

    const quantity = parseFloat(values[colMap.quantity] || "0");
    const lineTotal = parseFloat(values[colMap.totalInclTax] || "0");

    if (quantity <= 0 || lineTotal <= 0) {
      warnings.push(`Row ${i + 1}: Invalid amount — skipped`);
      continue;
    }

    const unitPrice =
      colMap.unitPrice !== undefined
        ? parseFloat(values[colMap.unitPrice] || "0")
        : lineTotal / quantity;

    rows.push({
      timestamp,
      productName: values[colMap.item]?.trim() || "Unknown Product",
      productSku,
      quantity,
      unitPrice,
      discount:
        colMap.totalDiscount !== undefined
          ? parseFloat(values[colMap.totalDiscount] || "0")
          : 0,
      lineTotal,
      status: rawStatus,
      category:
        colMap.category !== undefined
          ? values[colMap.category]?.trim()
          : "",
      receiptNumber:
        colMap.receiptNumber !== undefined
          ? values[colMap.receiptNumber]?.trim()
          : undefined,
    });
  }

  if (rows.length === 0) {
    throw new Error(
      "No valid Approved transactions were found in this date range."
    );
  }

  const groups = groupIntoTransactions(rows);

  const timestamps = rows.map((r) => r.timestamp.getTime());
  const dateRange = {
    min: new Date(Math.min(...timestamps)),
    max: new Date(Math.max(...timestamps)),
  };

  return { groups, totalRows: rows.length, dateRange, warnings };
}

// CSV parsing
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quotes = !quotes;
      }
    } else if (ch === "," && !quotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }

  values.push(current.trim());
  return values;
}

// Parse D/M/Y or Y-M-D
function parseYocoDateTime(dateStr: string, timeStr: string): Date {
  const cleanedDate = dateStr.replace(/-/g, "/");
  const parts = cleanedDate.split("/").map(Number);

  let year, month, day;
  if (parts[0] > 31) [year, month, day] = parts;
  else [day, month, year] = parts;

  const [h, m, s] = timeStr.split(":").map(Number);
  return new Date(year, month - 1, day, h, m, s || 0);
}

// Group rows within 2 seconds as a single POS transaction
function groupIntoTransactions(rows: ParsedRow[]): TransactionGroup[] {
  const sorted = [...rows].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  const groups: TransactionGroup[] = [];
  let bucket: ParsedRow[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const diff = sorted[i].timestamp.getTime() - sorted[i - 1].timestamp.getTime();
    if (Math.abs(diff) <= 2000) {
      bucket.push(sorted[i]);
    } else {
      groups.push(finalizeGroup(bucket));
      bucket = [sorted[i]];
    }
  }

  groups.push(finalizeGroup(bucket));
  return groups;
}

function finalizeGroup(items: ParsedRow[]): TransactionGroup {
  return {
    timestamp: items[0].timestamp,
    items,
    totalAmount: items.reduce((sum, i) => sum + i.lineTotal, 0),
    firstSku: items[0].productSku,
  };
}

// Optional helper: for UI mapping
export function extractUniqueProducts(groups: TransactionGroup[]): UniqueProduct[] {
  const map = new Map<string, { name: string; count: number }>();

  for (const group of groups) {
    for (const item of group.items) {
      const ex = map.get(item.productSku);
      ex
        ? (ex.count += 1)
        : map.set(item.productSku, { name: item.productName, count: 1 });
    }
  }

  return Array.from(map.entries())
    .map(([sku, { name, count }]) => ({
      sku,
      name,
      occurrences: count,
    }))
    .sort((a, b) => b.occurrences - a.occurrences);
}
