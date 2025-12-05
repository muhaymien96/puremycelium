import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ProductMargin {
  name: string;
  fullName: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  unitsSold: number;
}

interface ProfitMarginAnalysisProps {
  products: Array<{
    name: string;
    unitsSold: number;
    revenue: number;
    cost?: number;
  }>;
  financialData?: Array<{
    order_items?: Array<{
      product_name?: string;
      quantity?: number;
      subtotal?: number;
    }>;
  }>;
}

export const ProfitMarginAnalysis = ({ products }: ProfitMarginAnalysisProps) => {
  // Calculate margin for each product
  const productMargins: ProductMargin[] = products
    .filter(p => p.revenue > 0)
    .map(p => {
      const cost = p.cost || p.revenue * 0.6; // Fallback estimate
      const profit = p.revenue - cost;
      const margin = (profit / p.revenue) * 100;
      return {
        name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
        fullName: p.name,
        revenue: p.revenue,
        cost,
        profit,
        margin,
        unitsSold: p.unitsSold,
      };
    })
    .sort((a, b) => b.margin - a.margin);

  const mostProfitable = productMargins.slice(0, 5);
  const leastProfitable = [...productMargins].sort((a, b) => a.margin - b.margin).slice(0, 5);

  const formatCurrency = (val: number) => `R ${val.toFixed(2)}`;
  const formatPercent = (val: number) => `${val.toFixed(1)}%`;

  const getMarginColor = (margin: number) => {
    if (margin >= 40) return 'hsl(var(--chart-2))'; // green
    if (margin >= 20) return 'hsl(var(--chart-4))'; // yellow
    return 'hsl(var(--destructive))'; // red
  };

  const getMarginBadge = (margin: number) => {
    if (margin >= 40) return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">High</Badge>;
    if (margin >= 20) return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Medium</Badge>;
    return <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Low</Badge>;
  };

  const avgMargin = productMargins.length > 0
    ? productMargins.reduce((sum, p) => sum + p.margin, 0) / productMargins.length
    : 0;

  if (productMargins.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profit Margin Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No sales data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-2 print:break-inside-avoid">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Profit Margin Analysis</span>
          <div className="flex items-center gap-2 text-sm font-normal">
            <span className="text-muted-foreground">Avg Margin:</span>
            <span className={`font-semibold ${avgMargin >= 30 ? 'text-green-600' : avgMargin >= 15 ? 'text-amber-600' : 'text-destructive'}`}>
              {formatPercent(avgMargin)}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Margin Distribution Chart */}
        <div>
          <h4 className="text-sm font-medium mb-3">Margin by Product</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={productMargins.slice(0, 10)} layout="vertical">
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number, name: string, props: any) => {
                  return [
                    <div key="tooltip" className="space-y-1">
                      <div>Margin: {formatPercent(value)}</div>
                      <div>Revenue: {formatCurrency(props.payload.revenue)}</div>
                      <div>Profit: {formatCurrency(props.payload.profit)}</div>
                      <div>Units: {props.payload.unitsSold}</div>
                    </div>,
                    ''
                  ];
                }}
                labelFormatter={(label) => productMargins.find(p => p.name === label)?.fullName || label}
              />
              <Bar dataKey="margin" radius={[0, 4, 4, 0]}>
                {productMargins.slice(0, 10).map((entry, index) => (
                  <Cell key={index} fill={getMarginColor(entry.margin)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Most & Least Profitable */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Most Profitable */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Most Profitable
            </h4>
            <div className="space-y-2">
              {mostProfitable.slice(0, 3).map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.unitsSold} units</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">{formatPercent(p.margin)}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(p.profit)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Least Profitable */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Needs Attention
            </h4>
            <div className="space-y-2">
              {leastProfitable.slice(0, 3).map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.unitsSold} units</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${p.margin < 0 ? 'text-destructive' : 'text-amber-600'}`}>
                      {formatPercent(p.margin)}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(p.profit)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border-t pt-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>High (≥40%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-500" />
            <span>Medium (20-40%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span>Low (&lt;20%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
