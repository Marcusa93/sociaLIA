'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface DataPoint {
  month: string
  [platform: string]: number | string
}

interface TimeSeriesChartProps {
  data: DataPoint[]
  platforms?: string[]
  height?: number
}

const PLATFORM_COLORS = {
  instagram: '#e1306c',
  tiktok: '#69c9d0',
  facebook: '#1877f2',
}

const PLATFORM_LABELS = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
}

export function TimeSeriesChart({ data, platforms = ['instagram', 'tiktok', 'facebook'], height = 280 }: TimeSeriesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          {platforms.map(p => (
            <linearGradient key={p} id={`gradient-${p}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={PLATFORM_COLORS[p as keyof typeof PLATFORM_COLORS] ?? '#6674f1'} stopOpacity={0.3} />
              <stop offset="95%" stopColor={PLATFORM_COLORS[p as keyof typeof PLATFORM_COLORS] ?? '#6674f1'} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a3150" />
        <XAxis
          dataKey="month"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={{ stroke: '#2a3150' }}
          tickLine={false}
          tickFormatter={v => v?.slice(0, 7) ?? ''}
        />
        <YAxis
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
        />
        <Tooltip
          contentStyle={{
            background: '#161b2e',
            border: '1px solid #2a3150',
            borderRadius: 8,
            color: '#fff',
          }}
          formatter={(value: number, name: string) => [
            value.toLocaleString(),
            PLATFORM_LABELS[name as keyof typeof PLATFORM_LABELS] ?? name,
          ]}
        />
        <Legend
          wrapperStyle={{ color: '#94a3b8', fontSize: 12 }}
          formatter={(value) => PLATFORM_LABELS[value as keyof typeof PLATFORM_LABELS] ?? value}
        />
        {platforms.map(p => (
          <Area
            key={p}
            type="monotone"
            dataKey={p}
            stroke={PLATFORM_COLORS[p as keyof typeof PLATFORM_COLORS] ?? '#6674f1'}
            strokeWidth={2}
            fill={`url(#gradient-${p})`}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
