/* eslint-disable react-refresh/only-export-components -- the palettes are shared chart config. */
import type { LayoutChangeEvent } from 'react-native';
import type { Bar, Slice } from '@/lib/utils/admin-stats';
import * as React from 'react';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { Text, View } from '@/components/ui';
import { grouped, lakhs, niceTicks } from '@/lib/utils/admin-format';

export const STATUS_COLORS = ['#2E90FA', '#FF6C00', '#98A2B3'];
export const SERVICE_COLORS = ['#FF6C00', '#2E90FA', '#7C4DFF', '#12B76A', '#F59E0B'];

function useMeasuredWidth() {
  const [width, setWidth] = React.useState(0);
  const onLayout = React.useCallback((event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width), []);
  return { width, onLayout };
}

function smoothPath(coords: { x: number; y: number }[]) {
  return coords.slice(1).reduce((path, point, index) => {
    const previous = coords[index];
    const midX = (previous.x + point.x) / 2;
    return `${path} C${midX} ${previous.y} ${midX} ${point.y} ${point.x} ${point.y}`;
  }, `M${coords[0].x} ${coords[0].y}`);
}

export function Sparkline({ series, color, height = 34 }: { series: number[]; color: string; height?: number }) {
  const { width, onLayout } = useMeasuredWidth();
  const id = React.useMemo(() => `spark${color.replace('#', '')}`, [color]);
  const min = Math.min(...series);
  const span = Math.max(...series) - min || 1;
  const coords = series.map((value, index) => ({
    x: series.length > 1 ? (index / (series.length - 1)) * width : width / 2,
    y: height - 3 - ((value - min) / span) * (height - 8),
  }));

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 && series.length > 1 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.28} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={`${smoothPath(coords)} L${width} ${height} L0 ${height} Z`} fill={`url(#${id})`} />
          <Path d={smoothPath(coords)} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
        </Svg>
      )}
    </View>
  );
}

export function RevenueBars({ bars, height = 164 }: { bars: Bar[]; height?: number }) {
  const { width, onLayout } = useMeasuredWidth();
  const ticks = niceTicks(Math.max(...bars.map(bar => bar.value)));
  const max = ticks[ticks.length - 1];
  const plot = height - 18;
  const slot = bars.length > 0 ? width / bars.length : 0;
  const barWidth = Math.min(slot * 0.52, 22);

  return (
    <View>
      <View className="flex-row">
        <View className="w-8 justify-between" style={{ height: plot }}>
          {[...ticks].reverse().map(tick => (
            <Text key={tick} className="text-[9px] text-charcoal-300">{tick === 0 ? '0' : lakhs(tick)}</Text>
          ))}
        </View>
        <View className="flex-1" onLayout={onLayout}>
          {width > 0 && (
            <Svg width={width} height={plot}>
              <Defs>
                <LinearGradient id="barIdle" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#FFB183" />
                  <Stop offset="1" stopColor="#FFCBAA" />
                </LinearGradient>
                <LinearGradient id="barActive" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#FF6C00" />
                  <Stop offset="1" stopColor="#FF8C33" />
                </LinearGradient>
              </Defs>
              {ticks.map((tick, index) => (
                <Line key={tick} x1={0} x2={width} y1={plot - (index / (ticks.length - 1)) * plot} y2={plot - (index / (ticks.length - 1)) * plot} stroke="#EDF0F4" strokeWidth={1} />
              ))}
              {bars.map((bar, index) => (
                <Line key={`grid-${bar.key}`} x1={slot * (index + 1)} x2={slot * (index + 1)} y1={0} y2={plot} stroke="#F5F7F9" strokeWidth={1} />
              ))}
              {bars.map((bar, index) => {
                const barHeight = Math.max((bar.value / max) * plot, bar.value > 0 ? 3 : 0);
                return (
                  <Rect
                    key={bar.key}
                    x={slot * index + (slot - barWidth) / 2}
                    y={plot - barHeight}
                    width={barWidth}
                    height={barHeight}
                    rx={4}
                    fill={index === bars.length - 1 ? 'url(#barActive)' : 'url(#barIdle)'}
                  />
                );
              })}
            </Svg>
          )}
        </View>
      </View>
      <View className="mt-1.5 flex-row pl-8">
        {bars.map(bar => (
          <Text key={bar.key} className="flex-1 text-center text-[9px] text-muted-foreground" numberOfLines={1}>{bar.label}</Text>
        ))}
      </View>
    </View>
  );
}

export function Donut({ slices, total, caption, colors: palette, size = 124, stroke = 22 }: {
  slices: Slice[];
  total: number;
  caption: string;
  colors: string[];
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const denominator = Math.max(total, 1);
  const lengths = slices.map(slice => (slice.count / denominator) * circumference);

  return (
    <View className="items-center justify-center" style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G origin={`${size / 2}, ${size / 2}`} rotation={-90}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#F1F3F6" strokeWidth={stroke} fill="none" />
          {slices.map((slice, index) => (
            <Circle
              key={slice.id}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={palette[index % palette.length]}
              strokeWidth={stroke}
              strokeDasharray={`${lengths[index]} ${circumference - lengths[index]}`}
              strokeDashoffset={-lengths.slice(0, index).reduce((sum, value) => sum + value, 0)}
              fill="none"
            />
          ))}
        </G>
      </Svg>
      <View className="absolute items-center">
        <Text className="text-lg font-bold text-foreground">{grouped(total)}</Text>
        <Text className="text-[9px] text-muted-foreground">{caption}</Text>
      </View>
    </View>
  );
}

export function DonutLegend({ slices, colors: palette }: { slices: Slice[]; colors: string[] }) {
  return (
    <View className="flex-1 gap-3 pl-3">
      {slices.map((slice, index) => (
        <View key={slice.id} className="flex-row items-center gap-2">
          <View className="size-2.5 rounded-full" style={{ backgroundColor: palette[index % palette.length] }} />
          <Text className="flex-1 text-xs text-charcoal-800" numberOfLines={1}>{slice.label}</Text>
          <Text className="text-xs font-semibold text-foreground">{grouped(slice.count)}</Text>
          <Text className="w-7 text-right text-[11px] text-muted-foreground">
            {slice.share}
            %
          </Text>
        </View>
      ))}
    </View>
  );
}
