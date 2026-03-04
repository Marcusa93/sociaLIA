'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface ConcentrationData {
  month: string
  top3: number
  resto: number
}

interface ConcentrationBarProps {
  data: ConcentrationData[]
  height?: number
}

export function ConcentrationBar({ data, height = 280 }: ConcentrationBarProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a3150" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={{ stroke: '#2a3150' }}
          tickLine={false}
          tickFormatter={v => v?.slice(5, 7) ?? ''}
        />
        <YAxis
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${(v * 100).toFixed(0)}%`}
          domain={[0, 1]}
        />
        <Tooltip
          contentStyle={{
            background: '#161b2e',
            border: '1px solid #2a3150',
            borderRadius: 8,
            color: '#fff',
          }}
          formatter={(value: number, name: string) => [
            `${(value * 100).toFixed(1)}%`,
            name === 'top3' ? 'Top-3 cuentas' : 'Resto',
          ]}
        />
        <Legend
          wrapperStyle={{ color: '#94a3b8', fontSize: 12 }}
          formatter={(value) => value === 'top3' ? 'Top-3 cuentas' : 'Resto'}
        />
        <Bar dataKey="top3" stackId="a" fill="#6674f1" radius={[0, 0, 0, 0]} />
        <Bar dataKey="resto" stackId="a" fill="#1e2540" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Activation Score chart
interface ActivationData {
  month: string
  value: number
}

interface ActivationChartProps {
  data: ActivationData[]
  accountName?: string
  height?: number
}

export function ActivationChart({ data, accountName, height = 200 }: ActivationChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a3150" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: '#94a3b8', fontSize: 10 }}
          axisLine={{ stroke: '#2a3150' }}
          tickLine={false}
          tickFormatter={v => v?.slice(5, 7) ?? ''}
        />
        <YAxis
          tick={{ fill: '#94a3b8', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => v.toFixed(2)}
          domain={[0, 1]}
        />
        <Tooltip
          contentStyle={{
            background: '#161b2e',
            border: '1px solid #2a3150',
            borderRadius: 8,
            color: '#fff',
          }}
          formatter={(value: number) => [value.toFixed(3), 'Activation Score']}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.value >= 0.75 ? '#f43f5e' : entry.value >= 0.5 ? '#6674f1' : '#2a3150'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
