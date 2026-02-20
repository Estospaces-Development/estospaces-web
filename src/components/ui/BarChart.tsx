'use client';

interface BarChartData {
    label: string;
    value: number;
    color?: string;
}

interface BarChartProps {
    data: BarChartData[];
    title?: string;
    height?: number;
    showValues?: boolean;
    formatValue?: (value: number) => string;
    showCurrency?: boolean;
}

const BarChart = ({ data, title, height = 200, showValues = true, formatValue, showCurrency = false }: BarChartProps) => {
    if (!data || data.length === 0) {
        return (
            <div className="w-full flex items-center justify-center" style={{ height: `${height}px` }}>
                <p className="text-gray-500 dark:text-gray-400">No data available</p>
            </div>
        );
    }

    const maxValue = Math.max(...data.map((item) => item.value || 0), 1);
    const minValue = Math.min(...data.map((item) => item.value || 0), 0);
    const range = maxValue - minValue || 1;

    const defaultFormatter = (value: number): string => {
        if (showCurrency) {
            return value >= 1000 ? `£${(value / 1000).toFixed(0)}k` : `£${value}`;
        }
        return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${value}`;
    };

    const formatter = formatValue || defaultFormatter;

    const formatAxisLabel = (value: number): string => {
        if (showCurrency) {
            return value >= 1000 ? `£${(value / 1000).toFixed(0)}k` : `£${value.toFixed(0)}`;
        }
        return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${value.toFixed(0)}`;
    };

    return (
        <div className="w-full">
            {title && <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">{title}</h3>}
            <div className="relative w-full" style={{ height: `${height}px` }}>
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between pr-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{formatAxisLabel(maxValue)}</span>
                    <span>{formatAxisLabel(maxValue * 0.75)}</span>
                    <span>{formatAxisLabel(maxValue * 0.5)}</span>
                    <span>{formatAxisLabel(maxValue * 0.25)}</span>
                    <span>{showCurrency ? '£0' : '0'}</span>
                </div>

                {/* Chart area */}
                <div className="ml-12 h-full flex items-end justify-between gap-2 md:gap-4">
                    {data.map((item, index) => {
                        const value = item.value || 0;
                        const barHeight = range > 0 ? ((value - minValue) / range) * 100 : 0;
                        const normalizedHeight = Math.max(barHeight, value > 0 ? 5 : 2);

                        return (
                            <div
                                key={index}
                                className="flex-1 flex flex-col items-center justify-end group h-full"
                            >
                                {/* Value tooltip on hover */}
                                {showValues && (
                                    <div className="absolute bottom-full mb-2 px-2 py-1 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                        {formatter(value)}
                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800 dark:border-t-gray-700"></div>
                                    </div>
                                )}

                                {/* Bar */}
                                <div
                                    className="w-full rounded-t-lg transition-all hover:opacity-90 cursor-pointer relative group/bar"
                                    style={{
                                        height: `${normalizedHeight}%`,
                                        backgroundColor: item.color || '#FF6B35',
                                        minHeight: '8px',
                                    }}
                                    title={`${item.label}: ${formatter(value)}`}
                                >
                                    {showValues && normalizedHeight > 25 && (
                                        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-white text-xs font-semibold">
                                            {formatter(value)}
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover/bar:opacity-100 transition-opacity rounded-t-lg"></div>
                                </div>

                                {/* Label */}
                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center px-1 font-medium truncate w-full">
                                    {item.label}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Grid lines */}
                <div className="absolute inset-0 ml-12 pointer-events-none">
                    {[0, 25, 50, 75, 100].map((percent) => (
                        <div
                            key={percent}
                            className="absolute left-0 right-0 border-t border-gray-200 dark:border-gray-700"
                            style={{ bottom: `${percent}%` }}
                        ></div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BarChart;
