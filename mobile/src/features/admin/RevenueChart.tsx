import { Fragment, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { currencySymbol, money, toMajor } from '@/lib/format';
import { spacing, useTheme } from '@/theme';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PLOT_HEIGHT = 132;

function niceMax(v: number) {
  if (v <= 0) return 100;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

/**
 * Single-series column chart (revenue per day). One hue, no legend (the card title names it),
 * thin columns with a rounded data-end, hairline grid, tap a column for its exact value.
 * Amounts are in minor units of `currency`.
 */
export function RevenueChart({ data, currency = 'BDT' }: { data: { date: string; amount: number }[]; currency?: string }) {
  const { colors } = useTheme();
  const max = niceMax(Math.max(...data.map((d) => toMajor(d.amount, currency))));
  const peak = data.reduce((best, d, i) => (d.amount > (data[best]?.amount ?? 0) ? i : best), 0);
  const [selected, setSelected] = useState<number | null>(null);
  const focus = selected ?? (data[peak]?.amount ? peak : null);

  return (
    <View>
      <View style={{ height: PLOT_HEIGHT + 22, justifyContent: 'flex-end' }}>
        {/* Gridlines, with tick values in a left gutter so they never collide with a column */}
        {[1, 0.5].map((f) => (
          <Fragment key={f}>
            <View style={[styles.grid, { bottom: PLOT_HEIGHT * f, borderColor: colors.border }]} />
            <Text variant="caption" color="textSubtle" style={[styles.tick, { bottom: PLOT_HEIGHT * f - 8 }]} numberOfLines={1}>
              {compactMoney(max * f, currency)}
            </Text>
          </Fragment>
        ))}
        <View style={[styles.plot, { borderBottomColor: colors.borderStrong }]}>
          {data.map((d, i) => {
            const h = d.amount > 0 ? Math.max(4, (toMajor(d.amount, currency) / max) * PLOT_HEIGHT) : 0;
            const day = DAYS[new Date(`${d.date}T00:00:00Z`).getUTCDay()]!;
            const active = focus === i;
            return (
              <Pressable
                key={d.date}
                onPress={() => setSelected(selected === i ? null : i)}
                style={styles.slot}
                accessibilityRole="button"
                accessibilityLabel={`${day} ${d.date}: ${money(d.amount, currency)}`}
                hitSlop={4}
              >
                {active ? (
                  <View style={[styles.tip, { bottom: h + 6, backgroundColor: colors.text }]}>
                    <Text variant="caption" style={{ color: colors.bg }} numberOfLines={1}>
                      {money(d.amount, currency)}
                    </Text>
                  </View>
                ) : null}
                <View
                  style={{
                    width: 22,
                    height: h,
                    backgroundColor: colors.chart,
                    opacity: selected === null || active ? 1 : 0.45,
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                  }}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.labels}>
        {data.map((d) => (
          <Text key={d.date} variant="caption" color="textMuted" style={styles.label}>
            {DAYS[new Date(`${d.date}T00:00:00Z`).getUTCDay()]}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** ৳500, ৳2.5K, $12K — short enough for the axis gutter (v in major units). */
function compactMoney(v: number, currency: string) {
  const symbol = currencySymbol(currency).trim();
  if (v < 1000) return `${symbol}${Number.isInteger(v) ? v : v.toFixed(2)}`;
  const k = v / 1000;
  return `${symbol}${Number.isInteger(k) ? k : k.toFixed(1)}K`;
}

const GUTTER = 48;

const styles = StyleSheet.create({
  grid: { position: 'absolute', left: GUTTER, right: 0, borderTopWidth: StyleSheet.hairlineWidth },
  tick: { position: 'absolute', left: 0, width: GUTTER - 8, textAlign: 'right' },
  plot: { flexDirection: 'row', alignItems: 'flex-end', height: PLOT_HEIGHT, borderBottomWidth: 1, marginLeft: GUTTER },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  tip: { position: 'absolute', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, zIndex: 2 },
  labels: { flexDirection: 'row', marginTop: spacing.xs, marginLeft: GUTTER },
  label: { flex: 1, textAlign: 'center' },
});
