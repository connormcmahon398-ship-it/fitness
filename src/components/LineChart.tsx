import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useTheme } from '../lib/theme-context';
import { formatShortDate } from '../lib/format';
import { type } from '../theme';

export interface ChartPoint {
  date: number;
  value: number;
}

interface Props {
  points: ChartPoint[];
  height?: number;
  formatValue?: (v: number) => string;
}

const PAD_X = 4;
const PAD_TOP = 14;
const PAD_BOTTOM = 8;

/** Catmull-Rom → cubic bézier for a soft, thin line. */
function smoothPath(xs: number[], ys: number[]): string {
  if (xs.length === 0) return '';
  if (xs.length === 1) return `M ${xs[0]} ${ys[0]}`;
  let d = `M ${xs[0]} ${ys[0]}`;
  for (let i = 0; i < xs.length - 1; i += 1) {
    const x0 = xs[Math.max(0, i - 1)];
    const y0 = ys[Math.max(0, i - 1)];
    const x1 = xs[i];
    const y1 = ys[i];
    const x2 = xs[i + 1];
    const y2 = ys[i + 1];
    const x3 = xs[Math.min(xs.length - 1, i + 2)];
    const y3 = ys[Math.min(xs.length - 1, i + 2)];
    const c1x = x1 + (x2 - x0) / 6;
    const c1y = y1 + (y2 - y0) / 6;
    const c2x = x2 - (x3 - x1) / 6;
    const c2y = y2 - (y3 - y1) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
  }
  return d;
}

/**
 * A quiet line chart: one thin stroke, no axes, a dot on the latest point.
 * Touch and drag to read any session's value.
 */
export function LineChart({ points, height = 168, formatValue = (v) => String(v) }: Props) {
  const { palette } = useTheme();
  const [width, setWidth] = useState(0);
  const [scrub, setScrub] = useState<number | null>(null);

  const { xs, ys, min, max } = useMemo(() => {
    const values = points.map((p) => p.value);
    let lo = Math.min(...values);
    let hi = Math.max(...values);
    if (lo === hi) {
      lo -= 1;
      hi += 1;
    }
    const span = hi - lo;
    lo -= span * 0.12;
    hi += span * 0.08;
    const innerW = Math.max(1, width - PAD_X * 2);
    const innerH = height - PAD_TOP - PAD_BOTTOM;
    const xs = points.map((_, i) =>
      points.length === 1 ? PAD_X + innerW / 2 : PAD_X + (i / (points.length - 1)) * innerW,
    );
    const ys = points.map((p) => PAD_TOP + (1 - (p.value - lo) / (hi - lo)) * innerH);
    return { xs, ys, min: Math.min(...values), max: Math.max(...values) };
  }, [points, width, height]);

  const indexForX = (x: number) => {
    if (points.length < 2) return 0;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < xs.length; i += 1) {
      const d = Math.abs(xs[i] - x);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  };

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(0)
        .minDistance(0)
        .onBegin((e) => {
          'worklet';
          runOnJS(setScrub)(e.x);
        })
        .onUpdate((e) => {
          'worklet';
          runOnJS(setScrub)(e.x);
        })
        .onFinalize(() => {
          'worklet';
          runOnJS(setScrub)(null);
        }),
    [],
  );

  if (points.length === 0) return null;

  const activeIndex = scrub !== null ? indexForX(scrub) : null;
  const readout = activeIndex !== null ? points[activeIndex] : null;
  const path = width > 0 ? smoothPath(xs, ys) : '';
  const lastX = xs[xs.length - 1];
  const lastY = ys[ys.length - 1];

  return (
    <View>
      <View style={styles.readoutRow}>
        {readout ? (
          <>
            <Text style={[styles.readoutValue, { color: palette.text }, type.mono]}>
              {formatValue(readout.value)}
            </Text>
            <Text style={[styles.readoutDate, { color: palette.text2 }]}>
              {formatShortDate(readout.date)}
            </Text>
          </>
        ) : (
          <Text style={[styles.readoutDate, { color: palette.text3 }]}>
            {points.length > 1
              ? `${formatShortDate(points[0].date)} — ${formatShortDate(points[points.length - 1].date)}`
              : formatShortDate(points[0].date)}
          </Text>
        )}
      </View>
      <GestureDetector gesture={pan}>
        <View
          style={{ height }}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          accessible
          accessibilityLabel={`Progression chart, ${points.length} sessions, from ${formatValue(
            points[0].value,
          )} to ${formatValue(points[points.length - 1].value)}`}
        >
          {width > 0 && (
            <Svg width={width} height={height}>
              <Line
                x1={PAD_X}
                x2={width - PAD_X}
                y1={height - PAD_BOTTOM}
                y2={height - PAD_BOTTOM}
                stroke={palette.chartGrid}
                strokeWidth={1}
              />
              <Path d={path} stroke={palette.chartLine} strokeWidth={1.5} fill="none" />
              {activeIndex !== null ? (
                <>
                  <Line
                    x1={xs[activeIndex]}
                    x2={xs[activeIndex]}
                    y1={PAD_TOP - 6}
                    y2={height - PAD_BOTTOM}
                    stroke={palette.borderStrong}
                    strokeWidth={1}
                  />
                  <Circle cx={xs[activeIndex]} cy={ys[activeIndex]} r={3.5} fill={palette.accent} />
                </>
              ) : (
                <Circle cx={lastX} cy={lastY} r={3.5} fill={palette.accent} />
              )}
            </Svg>
          )}
        </View>
      </GestureDetector>
      <View style={styles.minMaxRow}>
        <Text style={[styles.minMax, { color: palette.text3 }, type.mono]}>
          {formatValue(min)}
        </Text>
        <Text style={[styles.minMax, { color: palette.text3 }, type.mono]}>
          {formatValue(max)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readoutRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    height: 24,
  },
  readoutValue: { fontSize: 15, fontWeight: '600' },
  readoutDate: { fontSize: 13 },
  minMaxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  minMax: { fontSize: 11 },
});
