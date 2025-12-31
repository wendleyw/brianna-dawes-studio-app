import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

interface TrendData {
    label: string;
    assets: number;
    bonus: number;
}

interface DeliveryTrendChartProps {
    data: TrendData[];
}

export function DeliveryTrendChart({ data }: DeliveryTrendChartProps) {
    if (!data || data.length === 0) {
        return <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No trend data available</div>;
    }

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <AreaChart
                    data={data}
                    margin={{
                        top: 10,
                        right: 30,
                        left: 0,
                        bottom: 0,
                    }}
                >
                    <defs>
                        <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0f766e" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorBonus" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                    />
                    <YAxis
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        axisLine={false}
                        tickLine={false}
                        dx={-10}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="assets"
                        stroke="#0f766e"
                        fillOpacity={1}
                        fill="url(#colorAssets)"
                        name="Assets"
                        stackId="1"
                    />
                    <Area
                        type="monotone"
                        dataKey="bonus"
                        stroke="#f59e0b"
                        fillOpacity={1}
                        fill="url(#colorBonus)"
                        name="Bonus"
                        stackId="1"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
