import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

interface ProjectData {
    name: string;
    total: number;
}

interface AssetsByProjectChartProps {
    data: ProjectData[];
}

export function AssetsByProjectChart({ data }: AssetsByProjectChartProps) {
    if (!data || data.length === 0) {
        return <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No project data available</div>;
    }

    // Sort by total descending for better visualization
    const sortedData = [...data].sort((a, b) => b.total - a.total).slice(0, 5);

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart
                    layout="vertical"
                    data={sortedData}
                    margin={{
                        top: 5,
                        right: 30,
                        left: 40,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                    <XAxis type="number" hide />
                    <YAxis
                        dataKey="name"
                        type="category"
                        width={100}
                        tick={{ fontSize: 12, fill: '#374151' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={20}>
                        {sortedData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill="#0f766e" />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
