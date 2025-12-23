import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TimelineDataPoint } from '../../domain/analytics.types';
import styles from './TimelineChart.module.css';

interface TimelineChartProps {
  data: TimelineDataPoint[];
  title?: string;
}

export function TimelineChart({ data, title = 'Projects & Deliverables Timeline' }: TimelineChartProps) {
  // Transform data for chart display
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Transform data for recharts
    return data.map((point) => ({
      date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      'Projects Created': point.projectsCreated,
      'Projects Completed': point.projectsCompleted,
      'Deliverables Created': point.deliverablesCreated,
      'Deliverables Approved': point.deliverablesApproved,
    }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No data available for the selected period</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
          <XAxis
            dataKey="date"
            stroke="#94a3b8"
            style={{ fontSize: '12px', fontFamily: 'Manrope, system-ui, sans-serif' }}
          />
          <YAxis
            stroke="#94a3b8"
            style={{ fontSize: '12px', fontFamily: 'Manrope, system-ui, sans-serif' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid rgba(148, 163, 184, 0.22)',
              borderRadius: '12px',
              fontSize: '12px',
              fontFamily: 'Manrope, system-ui, sans-serif',
            }}
          />
          <Legend
            wrapperStyle={{
              fontSize: '12px',
              fontFamily: 'Manrope, system-ui, sans-serif',
            }}
          />
          <Line
            type="monotone"
            dataKey="Projects Created"
            stroke="#0f172a"
            strokeWidth={2}
            dot={{ fill: '#0f172a', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="Projects Completed"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="Deliverables Created"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="Deliverables Approved"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ fill: '#8b5cf6', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
