'use client';

interface PieChartData {
    label: string;
    value: number;
    color: string;
}

interface PieChartProps {
    data: PieChartData[];
    size?: number;
    title?: string;
}

const PieChart = ({ data, size = 200, title }: PieChartProps) => {
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
    const center = size / 2;
    const radius = size / 2 - 10;

    let currentAngle = -90;

    const createPath = (value: number, color: string, index: number) => {
        if (total === 0 || !value || value <= 0) return null;

        const percentage = (value / total) * 100;
        const angle = (percentage / 100) * 360;

        if (isNaN(angle) || isNaN(percentage)) return null;

        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;

        const x1 = center + radius * Math.cos((startAngle * Math.PI) / 180);
        const y1 = center + radius * Math.sin((startAngle * Math.PI) / 180);
        const x2 = center + radius * Math.cos((endAngle * Math.PI) / 180);
        const y2 = center + radius * Math.sin((endAngle * Math.PI) / 180);

        if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) return null;

        const largeArcFlag = angle > 180 ? 1 : 0;

        const pathData = [
            `M ${center} ${center}`,
            `L ${x1.toFixed(2)} ${y1.toFixed(2)}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
            'Z',
        ].join(' ');

        currentAngle = endAngle;

        return (
            <path
                key={index}
                d={pathData}
                fill={color}
                stroke="white"
                strokeWidth="2"
                className="hover:opacity-80 transition-opacity cursor-pointer"
            />
        );
    };

    if (total === 0) {
        return (
            <div className="flex flex-col items-center">
                {title && <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">{title}</h3>}
                <div className="relative">
                    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                        <circle cx={center} cy={center} r={radius} fill="none" stroke="#e5e7eb" strokeWidth="20" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-800 dark:text-white">0</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
                        </div>
                    </div>
                </div>
                <div className="mt-4 space-y-2 w-full">
                    {data.map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-800 dark:text-white">0</span>
                                <span className="text-gray-500 dark:text-gray-400">(0%)</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center">
            {title && <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">{title}</h3>}
            <div className="relative">
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    {data.map((item, index) => createPath(item.value, item.color, index))}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gray-800 dark:text-white">{total}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
                    </div>
                </div>
            </div>
            <div className="mt-4 space-y-2 w-full">
                {data.map((item, index) => {
                    const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                    return (
                        <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-800 dark:text-white">{item.value}</span>
                                <span className="text-gray-500 dark:text-gray-400">({percentage}%)</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PieChart;
