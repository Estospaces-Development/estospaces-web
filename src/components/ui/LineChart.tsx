'use client';

interface LineChartData {
    label: string;
    value: number;
}

interface LineChartProps {
    data: LineChartData[];
    title?: string;
    height?: number;
    color?: string;
}

const LineChart = ({ data, title, height = 200, color = '#FF6B35' }: LineChartProps) => {
    const maxValue = Math.max(...data.map((item) => item.value));
    const minValue = Math.min(...data.map((item) => item.value));
    const range = maxValue - minValue || 1;
    const width = 100;
    const chartHeight = height - 40;

    const points = data.map((item, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = chartHeight - ((item.value - minValue) / range) * chartHeight;
        return `${x},${y}`;
    });

    const pathData = `M ${points.join(' L ')}`;

    return (
        <div>
            {title && <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">{title}</h3>}
            <div className="relative" style={{ height: `${height}px` }}>
                <svg width="100%" height={chartHeight} viewBox={`0 0 ${width} ${chartHeight}`} className="overflow-visible">
                    {/* Grid lines */}
                    {[0, 25, 50, 75, 100].map((y) => (
                        <line
                            key={y}
                            x1="0"
                            y1={y}
                            x2={width}
                            y2={y}
                            stroke="#e5e7eb"
                            strokeWidth="1"
                            strokeDasharray="2,2"
                        />
                    ))}
                    {/* Line */}
                    <path
                        d={pathData}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        className="transition-all"
                    />
                    {/* Area under line */}
                    <path
                        d={`${pathData} L ${width},${chartHeight} L 0,${chartHeight} Z`}
                        fill={color}
                        fillOpacity="0.1"
                    />
                    {/* Data points */}
                    {data.map((item, index) => {
                        const x = (index / (data.length - 1)) * width;
                        const y = chartHeight - ((item.value - minValue) / range) * chartHeight;
                        return (
                            <g key={index}>
                                <circle
                                    cx={x}
                                    cy={y}
                                    r="3"
                                    fill={color}
                                    className="hover:r-4 transition-all cursor-pointer"
                                />
                                <text
                                    x={x}
                                    y={y - 8}
                                    textAnchor="middle"
                                    className="text-xs fill-gray-600 dark:fill-gray-400"
                                    style={{ fontSize: '8px' }}
                                >
                                    {item.value}
                                </text>
                            </g>
                        );
                    })}
                </svg>
                {/* Labels */}
                <div className="flex justify-between mt-2 text-xs text-gray-600 dark:text-gray-400">
                    {data.map((item, index) => (
                        <span key={index} className="flex-1 text-center">
                            {item.label}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LineChart;
