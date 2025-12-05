import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, AlertCircle, CheckCircle2, Calendar, Link as LinkIcon, ShieldAlert, MapPin } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { parseYocoCSV, extractUniqueProducts, type ParseResult, type UniqueProduct } from "@/lib/csv-parser";
import { useImportSales } from "@/hooks/useImportSales";
import { useProducts } from "@/hooks/useProducts";
import { useProductMappings } from "@/hooks/useProductMappings";
import { useMarketEvents } from "@/hooks/useMarketEvents";
import { format, subDays, parseISO } from "date-fns";
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { useSwipeable } from "react-swipeable";
import { StockImpactPreview } from "@/components/StockImpactPreview";
import { ImportProcessingModal } from "@/components/ImportProcessingModal";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Skeleton } from "@/components/ui/skeleton";

type PeriodType = "today" | "week" | "month" | "custom";

interface EventLinkingPreview {
  date: string;
  orderCount: number;
  matchedEvent: { id: string; name: string; location: string } | null;
}

export default function ImportSales() {
  const navigate = useNavigate();
  const { data: isAdmin, isLoading: isCheckingAdmin } = useIsAdmin();
  const { data: products } = useProducts();
  const { data: savedMappings } = useProductMappings();
  const { data: marketEvents } = useMarketEvents();
  const importMutation = useImportSales();

  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uniqueProducts, setUniqueProducts] = useState<UniqueProduct[]>([]);
  const [productMappings, setProductMappings] = useState<Record<string, string>>({});
  const [saveMappings, setSaveMappings] = useState(true);
  const [showStockPreview, setShowStockPreview] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<"processing" | "success" | "error" | null>(null);
  const [importing, setImporting] = useState(false);

  const handlers = useSwipeable({
    onSwipedLeft: () => navigate("/import-history"),
    onSwipedRight: () => navigate("/reports"),
    trackMouse: false,
    preventScrollOnSwipe: true,
  });

  const activeProducts = products?.filter((p) => p.is_active) || [];

  // Auto-apply saved mappings
  useEffect(() => {
    if (!savedMappings || uniqueProducts.length === 0) return;

    const updatedMappings = { ...productMappings };

    uniqueProducts.forEach((up) => {
      const saved = savedMappings.find((m) => m.external_sku === up.sku);
      if (saved?.product_id) updatedMappings[up.sku] = saved.product_id;
    });

    setProductMappings(updatedMappings);
  }, [savedMappings, uniqueProducts]);

  // Calculate event linking preview based on transaction dates
  const eventLinkingPreview = useMemo((): EventLinkingPreview[] => {
    if (!parseResult || !marketEvents) return [];

    // Group transactions by date
    const transactionsByDate = new Map<string, number>();
    parseResult.groups.forEach((group) => {
      const date = new Date(group.timestamp).toISOString().split('T')[0];
      transactionsByDate.set(date, (transactionsByDate.get(date) || 0) + 1);
    });

    // Build preview with event matching
    const preview: EventLinkingPreview[] = [];
    transactionsByDate.forEach((orderCount, date) => {
      const matchedEvent = marketEvents.find((e) => e.event_date === date);
      preview.push({
        date,
        orderCount,
        matchedEvent: matchedEvent ? {
          id: matchedEvent.id,
          name: matchedEvent.name,
          location: matchedEvent.location,
        } : null,
      });
    });

    // Sort by date
    return preview.sort((a, b) => a.date.localeCompare(b.date));
  }, [parseResult, marketEvents]);

  const linkedOrderCount = eventLinkingPreview.filter((p) => p.matchedEvent).reduce((sum, p) => sum + p.orderCount, 0);
  const unlinkedOrderCount = eventLinkingPreview.filter((p) => !p.matchedEvent).reduce((sum, p) => sum + p.orderCount, 0);

  const handlePeriodChange = (period: PeriodType) => {
    setPeriodType(period);
    const today = new Date();

    switch (period) {
      case "today":
        setDateRange({ from: today, to: today });
        break;
      case "week":
        setDateRange({ from: subDays(today, 7), to: today });
        break;
      case "month":
        setDateRange({ from: subDays(today, 30), to: today });
        break;
      case "custom":
        // Keep current range for custom selection
        break;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setError(null);
    setParseResult(null);
    setUniqueProducts([]);
    setProductMappings({});

    try {
      const content = await selected.text();
      const start = dateRange?.from;
      const end = dateRange?.to;

      const result = parseYocoCSV(content, start, end);
      setParseResult(result);

      const unique = extractUniqueProducts(result.groups);
      setUniqueProducts(unique);
    } catch (err: any) {
      setError(err.message ?? "Failed to parse CSV report.");
      setFile(null);
    }
  };

  const handleConfirmImport = async () => {
    if (!parseResult || !file) return;

    setImporting(true);
    setShowStockPreview(false);
    setProcessingStatus("processing");

    try {
      await importMutation.mutateAsync({
        groups: parseResult.groups,
        startDate: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
        endDate: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '',
        productMappings,
        fileName: file.name,
        saveProductMappings: saveMappings,
      });

      setProcessingStatus("success");
      setTimeout(() => {
        setFile(null);
        setParseResult(null);
        setDateRange(undefined);
        setUniqueProducts([]);
        setProductMappings({});
        setProcessingStatus(null);
        setImporting(false);
      }, 1750);
    } catch (err) {
      console.error(err);
      setProcessingStatus("error");
      setImporting(false);
    }
  };

  const getMatchedProduct = (sku: string) =>
    activeProducts.find((p) => p.id === productMappings[sku]);

  const unmatchedProducts = uniqueProducts.filter((up) => {
    const matchDirect = activeProducts.some((p) => p.sku === up.sku);
    const matchMapped = getMatchedProduct(up.sku);
    return !(matchDirect || matchMapped);
  });

  if (isCheckingAdmin) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto p-6">
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription>Admin access required.</AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div {...handlers} className="max-w-4xl mx-auto p-6 space-y-6 pb-24">
        <div>
          <h1 className="text-3xl font-bold mb-2">Import Yoco Sales Report</h1>
          <p className="text-muted-foreground">Upload and process item-level sales data</p>
        </div>

        {/* STEP 1 — Select Period */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <CardTitle>Select Report Period</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex flex-wrap gap-2">
                {(["today", "week", "month"] as PeriodType[]).map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={periodType === p ? "default" : "outline"}
                    onClick={() => handlePeriodChange(p)}
                  >
                    {p === "today" ? "Today" : p === "week" ? "Last Week" : "Last Month"}
                  </Button>
                ))}
              </div>
              <DateRangePicker
                value={dateRange}
                onChange={(range) => {
                  setDateRange(range);
                  if (range) setPeriodType("custom");
                }}
                className="w-full sm:w-auto"
              />
            </div>
          </CardContent>
        </Card>

        {/* STEP 2 — CSV Upload */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              <CardTitle>Upload CSV</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
              <Input id="csvFile" type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
              <Label htmlFor="csvFile" className="flex flex-col items-center cursor-pointer">
                <FileText className="h-10 w-10 opacity-70" />
                <span className="mt-2 font-medium text-sm">
                  {file ? file.name : "Click to select CSV file"}
                </span>
                <span className="text-xs text-muted-foreground">CSV files only</span>
              </Label>
            </div>

          {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* STEP 2.5 — Event Linking Preview (Auto-Detection) */}
        {parseResult && eventLinkingPreview.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                <CardTitle>Event Linking Preview</CardTitle>
              </div>
              <CardDescription>Orders will be automatically linked to market events by transaction date</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {linkedOrderCount > 0 && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    {linkedOrderCount} order(s) will be auto-linked to market events
                  </AlertDescription>
                </Alert>
              )}
              
              {unlinkedOrderCount > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {unlinkedOrderCount} order(s) have no matching event (no event on those dates)
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {eventLinkingPreview.map((preview) => (
                  <div
                    key={preview.date}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      preview.matchedEvent ? 'bg-green-50 border-green-200' : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        {format(parseISO(preview.date), "MMM d, yyyy")}
                      </span>
                      <Badge variant="secondary">{preview.orderCount} order(s)</Badge>
                    </div>
                    {preview.matchedEvent ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        → {preview.matchedEvent.name}
                      </Badge>
                    ) : (
                      <Badge variant="outline">No event match</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3 — Product Mapping */}
        {uniqueProducts.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                <CardTitle>Product Mapping</CardTitle>
              </div>
              <CardDescription>Match CSV products to inventory items</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {unmatchedProducts.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {unmatchedProducts.length} product(s) require mapping before import
                  </AlertDescription>
                </Alert>
              )}

              <div className="max-h-96 overflow-y-auto space-y-2">
                {uniqueProducts.map((up) => {
                  const direct = activeProducts.find((p) => p.sku === up.sku);
                  const mapped = getMatchedProduct(up.sku);
                  const isMatched = !!direct || !!mapped;

                  return (
                    <div
                      key={up.sku}
                      className={`border rounded-lg p-3 ${
                        isMatched ? "bg-green-50 border-green-300" : "border-border"
                      }`}
                    >
                      <div className="flex justify-between gap-4">
                        <div className="flex-1">
                          <div className="font-medium flex gap-2 items-center">
                            {isMatched && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                            {up.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            SKU: {up.sku} · {up.occurrences}x sold
                          </div>
                          {isMatched && (
                            <div className="text-xs text-green-700 mt-1">
                              Mapped to {direct?.name || mapped?.name}
                            </div>
                          )}
                        </div>

                        <div className="w-52">
                          <Select
                            disabled={!!direct}
                            value={productMappings[up.sku] || direct?.id || ""}
                            onValueChange={(val) =>
                              setProductMappings((prev) => ({ ...prev, [up.sku]: val }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {activeProducts.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} ({p.sku})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  id="saveMappings"
                  checked={saveMappings}
                  onCheckedChange={(c) => setSaveMappings(c === true)}
                />
                <Label htmlFor="saveMappings" className="text-sm">
                  Save mappings for future imports
                </Label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 4 — Preview */}
        {parseResult && (
          <Card>
            <CardHeader>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle>Preview & Validation</CardTitle>
              <CardDescription>
                Verified {parseResult.totalRows} valid rows across {parseResult.groups.length} sales
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {parseResult.warnings.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {parseResult.warnings.length} data warning(s)
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 5 — Import */}
        {parseResult && (
          <Card>
            <CardContent className="flex justify-between items-center pt-6">
              <div>
                <div className="font-medium">Ready to import</div>
                <p className="text-xs text-muted-foreground">
                  {parseResult.groups.length} orders will be created and stock reduced automatically.
                  {linkedOrderCount > 0 && ` ${linkedOrderCount} will be linked to events.`}
                </p>
              </div>
              <Button
                size="lg"
                disabled={importing || unmatchedProducts.length > 0}
                onClick={() => setShowStockPreview(true)}
              >
                Preview Stock Impact
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stock Impact Preview Modal */}
        <StockImpactPreview
          open={showStockPreview}
          onOpenChange={setShowStockPreview}
          groups={parseResult?.groups || []}
          productMappings={productMappings}
          products={activeProducts}
          onConfirm={handleConfirmImport}
          isImporting={importing}
        />

        {/* Processing Modal */}
        <ImportProcessingModal
          open={!!processingStatus}
          status={processingStatus || 'processing'}
          onClose={() => {
            setProcessingStatus(null);
            setImporting(false);
          }}
        />
      </div>
    </AppLayout>
  );
}
