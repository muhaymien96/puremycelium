import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AppLayout } from '@/components/layout/AppLayout';
import { useReportsData } from '@/hooks/useReportsData';
import { subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import { DollarSign, ShoppingCart, TrendingUp, TrendingDown, Upload, Download, Percent, Receipt, Calendar, FileText, Package, ChevronDown, Wallet, PiggyBank, BarChart3, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProfitMarginAnalysis } from '@/components/reports/ProfitMarginAnalysis';
import { downloadCSV, formatCurrency } from '@/lib/common';

// Distinct colors for charts
const COLORS = [
  'hsl(24, 90%, 55%)',     // Orange (Primary)
  'hsl(217, 91%, 60%)',    // Blue
  'hsl(142, 76%, 36%)',    // Green
  'hsl(280, 65%, 60%)',    // Purple
  'hsl(45, 93%, 47%)',     // Yellow/Gold
];

export default function Reports() {
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const { data, isLoading } = useReportsData(
    dateRange.from!,
    dateRange.to!
  );

  const setQuickRange = (days: number) =>
    setDateRange({ from: subDays(new Date(), days), to: new Date() });

  const handlePrintPDF = () => {
    window.print();
  };

  if (isLoading) return (
    <AppLayout><div className="p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4,5,6,7,8].map(i=> <Skeleton key={i} className="h-24"/>)}
      </div>
    </div></AppLayout>
  );

  return (
    <AppLayout>
      <div ref={printRef} className="p-4 md:p-6 space-y-6 pb-20 print:p-2 print:pb-4">

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between print:hidden">
          <div>
            <h2 className="text-2xl font-bold">Reports & Analytics</h2>
            <p className="text-sm text-muted-foreground">
              Insights from {dateRange.from?.toLocaleDateString()} – {dateRange.to?.toLocaleDateString()}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => downloadCSV(data?.rawData.orders || [], 'orders_report')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Orders CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadCSV(data?.rawData.expenses || [], 'expenses_report')}>
                  <Receipt className="w-4 h-4 mr-2" />
                  Expenses CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadCSV(data?.rawData.productSales || [], 'product_sales')}>
                  <Package className="w-4 h-4 mr-2" />
                  Products CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrintPDF}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={()=>navigate('/import')}>
              <Upload className="w-4 h-4 mr-2"/> Import
            </Button>
          </div>
        </div>

        {/* Print Header (visible only when printing) */}
        <div className="hidden print:block mb-4">
          <h1 className="text-xl font-bold">Business Report</h1>
          <p className="text-sm text-muted-foreground">
            Period: {dateRange.from?.toLocaleDateString()} – {dateRange.to?.toLocaleDateString()}
          </p>
          <p className="text-xs text-muted-foreground">Generated: {new Date().toLocaleString()}</p>
        </div>

        {/* Quick ranges + picker */}
        <div className="flex flex-wrap gap-2 items-center print:hidden">
          <Button size="sm" variant="outline" onClick={()=>setQuickRange(7)}>Last 7 Days</Button>
          <Button size="sm" variant="outline" onClick={()=>setQuickRange(30)}>Last 30 Days</Button>
          <Button size="sm" variant="outline" onClick={()=>setQuickRange(90)}>Last 90 Days</Button>
          <DateRangePicker value={dateRange} onChange={setDateRange}/>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4 print:grid-cols-5 print:gap-2">
          {[
            { icon: DollarSign, label:"Revenue", value: formatCurrency(data?.kpis.totalRevenue || 0), tooltip: "Total sales revenue" },
            { icon: TrendingUp, label:"Gross Profit", value: formatCurrency(data?.kpis.grossProfit || 0), subtitle: `${(data?.kpis.grossMargin || 0).toFixed(1)}% margin`, className: (data?.kpis.grossProfit || 0) >= 0 ? 'text-green-600' : 'text-destructive', tooltip: "Revenue minus Cost of Goods Sold (COGS)" },
            { icon: ShoppingCart, label:"Orders", value: data?.kpis.totalOrders, tooltip: "Total number of orders placed" },
            { icon: Package, label:"Units Sold", value: data?.kpis.totalUnitsSold || 0, tooltip: "Total product units sold across all orders" },
            { icon: Target, label:"Avg Order", value: formatCurrency(data?.kpis.avgOrderValue || 0), tooltip: "Average revenue per order" },
            { icon: Wallet, label:"COGS", value: formatCurrency(data?.kpis.totalCost || 0), className: 'text-orange-600', tooltip: "Cost of Goods Sold - total cost price of items sold" },
            { icon: Receipt, label:"Expenses", value: formatCurrency(data?.kpis.totalExpenses || 0), className: 'text-destructive', tooltip: "Operating expenses (stall fees, travel, supplies, etc.)" },
            { icon: PiggyBank, label:"Net Profit", value: formatCurrency(data?.kpis.netProfit || 0), className: (data?.kpis.netProfit || 0) >= 0 ? 'text-green-600' : 'text-destructive', tooltip: "Gross Profit minus Expenses = Final profit" },
            { icon: BarChart3, label:"Margin", value: `${((data?.kpis.netProfit || 0) / (data?.kpis.totalRevenue || 1) * 100).toFixed(1)}%`, className: ((data?.kpis.netProfit || 0) / (data?.kpis.totalRevenue || 1) * 100) >= 20 ? 'text-green-600' : ((data?.kpis.netProfit || 0) / (data?.kpis.totalRevenue || 1) * 100) >= 0 ? 'text-orange-600' : 'text-destructive', tooltip: "Net Profit as percentage of Revenue" },
          ].map((kpi,i)=>(
            <Card key={i} className="print:border print:shadow-none group relative" title={(kpi as any).tooltip}>
              <CardContent className="pt-3 px-2 pb-2 md:pt-4 md:px-4 md:pb-3 print:p-2">
                <div className="flex items-center gap-1 md:gap-2 text-[10px] md:text-xs text-muted-foreground">
                  <kpi.icon className="w-3 h-3 md:w-4 md:h-4 shrink-0"/>
                  <span className="truncate">{kpi.label}</span>
                </div>
                <p className={`text-sm md:text-xl font-semibold mt-0.5 md:mt-1 truncate print:text-base ${(kpi as any).className || ''}`}>{kpi.value}</p>
                {(kpi as any).subtitle && <p className="text-[9px] md:text-xs text-muted-foreground truncate">{(kpi as any).subtitle}</p>}
              </CardContent>
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 print:hidden">
                {(kpi as any).tooltip}
              </div>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:gap-4">
        
          {/* Sales Performance Chart - Combined Bar + Line */}
          <Card className="lg:col-span-2 print:break-inside-avoid">
            <CardHeader className="pb-2 md:pb-4">
              <CardTitle className="text-base md:text-lg">Daily Sales Performance</CardTitle>
              <p className="text-xs md:text-sm text-muted-foreground">Revenue vs Costs with Profit trend</p>
            </CardHeader>
            <CardContent className="px-2 md:px-6">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data?.dailySales ?? []} barGap={0}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false}/>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tickFormatter={(v) => `R${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={45} />
                  <Tooltip 
                    formatter={(v: number, name: string) => [formatCurrency(v), name]}
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="revenue" name="Revenue" fill="hsl(24, 90%, 55%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cost" name="COGS" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="Profit" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                  {data?.dailySales?.some(d => d.expenses > 0) && (
                    <Bar dataKey="expenses" name="Expenses" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue by Category & Expense Breakdown - Side by Side */}
          <Card className="print:break-inside-avoid">
            <CardHeader className="pb-2 md:pb-4">
              <CardTitle className="text-base md:text-lg">Revenue by Category</CardTitle>
            </CardHeader>
            <CardContent className="px-2 md:px-6">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie 
                    data={data?.categoryData || []} 
                    dataKey="value" 
                    nameKey="name" 
                    outerRadius={70}
                    labelLine={false}
                  >
                    {(data?.categoryData || []).map((_:any,i:number)=>(
                      <Cell key={i} fill={COLORS[i % COLORS.length]}/>
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)}/>
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Expense Breakdown - moved up to fill gap */}
          <Card className="print:break-inside-avoid">
            <CardHeader className="pb-2 md:pb-4">
              <CardTitle className="text-base md:text-lg">Expense Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="px-2 md:px-6">
              {data?.expenseBreakdown && data.expenseBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie 
                      data={data.expenseBreakdown} 
                      dataKey="value" 
                      nameKey="name" 
                      outerRadius={70}
                      labelLine={false}
                    >
                      {data.expenseBreakdown.map((_:any,i:number)=>(
                        <Cell key={i} fill={COLORS[i % COLORS.length]}/>
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)}/>
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8 text-sm">No expenses recorded</p>
              )}
            </CardContent>
          </Card>

          {/* Profit Margin Analysis - Full Width */}
          <div className="lg:col-span-2">
            <ProfitMarginAnalysis products={data?.topProducts || []} />
          </div>

          {/* Top Products with Units Sold */}
          <Card className="print:break-inside-avoid">
            <CardHeader><CardTitle>Top Products by Revenue</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data?.topProducts || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3"/>
                  <XAxis type="number" tickFormatter={(v) => `R${v}`}/>
                  <YAxis type="category" dataKey="name" width={100}/>
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === 'revenue') return formatCurrency(value);
                      return value;
                    }}
                    labelFormatter={(label) => {
                      const product = data?.topProducts?.find(p => p.name === label);
                      return product ? `${label} (${product.unitsSold} units sold)` : label;
                    }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))"/>
                </BarChart>
              </ResponsiveContainer>
              {/* Units sold summary below chart */}
              <div className="mt-4 space-y-1">
                {data?.topProducts?.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{p.name}</span>
                    <span className="font-medium">{p.unitsSold} units</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order Status */}
          <Card className="print:break-inside-avoid">
            <CardHeader><CardTitle>Order Status</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={data?.statusData || []} dataKey="value" nameKey="name" outerRadius={80} innerRadius={50} label>
                    {(data?.statusData || []).map((_:any,i:number)=>(
                      <Cell key={i} fill={COLORS[i % COLORS.length]}/>
                    ))}
                  </Pie>
                  <Legend/>
                  <Tooltip/>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Event Profitability Table */}
        {data?.eventProfitability && data.eventProfitability.length > 0 && (
          <Card className="print:break-inside-avoid">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Event Profitability
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="print:hidden"
                  onClick={() => downloadCSV(data.eventProfitability.map(e => ({
                    name: e.name,
                    date: e.date,
                    location: e.location,
                    revenue: e.revenue,
                    costs: e.costs,
                    profit: e.profit,
                  })), 'event_profitability')}
                >
                  <Download className="w-4 h-4 mr-2"/> Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Costs</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.eventProfitability.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.name}</TableCell>
                      <TableCell>{new Date(event.date).toLocaleDateString()}</TableCell>
                      <TableCell>{event.location}</TableCell>
                      <TableCell className="text-right">{formatCurrency(event.revenue)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(event.costs)}</TableCell>
                      <TableCell className={`text-right font-semibold ${event.profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                        {formatCurrency(event.profit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </AppLayout>
  );
}