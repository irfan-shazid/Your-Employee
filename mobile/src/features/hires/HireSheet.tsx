import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Avatar, Button, Sheet, Text } from '@/components/ui';
import { taka } from '@/lib/format';
import { radii, spacing, useTheme } from '@/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  workerName: string;
  workerAvatar?: string | null;
  fee: number;
  credits: number;
  loading?: boolean;
  onConfirm: (useCredit: boolean) => void;
};

/** Confirms a hire and explains the ৳10 fee (or lets the employer spend a free credit). */
export function HireSheet({ visible, onClose, workerName, workerAvatar, fee, credits, loading, onConfirm }: Props) {
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title={`Hire ${workerName.split(' ')[0]}?`}>
      <View style={{ gap: spacing.lg }}>
        <View style={styles.person}>
          <Avatar uri={workerAvatar} name={workerName} size={48} verified />
          <Text variant="subheading" style={{ flex: 1 }}>
            {workerName}
          </Text>
        </View>
        <View style={{ gap: spacing.sm }}>
          {[
            'Worker is notified instantly',
            "You'll both see each other's phone number",
            'Rate the worker after the job is done',
          ].map((t) => (
            <View key={t} style={styles.point}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              <Text variant="smallMedium">{t}</Text>
            </View>
          ))}
        </View>
        <View style={[styles.fee, { backgroundColor: colors.surfaceAlt }]}>
          <Text variant="bodyMedium">Hiring fee</Text>
          <Text variant="heading">{credits > 0 ? 'Free (1 credit)' : taka(fee)}</Text>
        </View>
        {credits > 0 ? (
          <>
            <Button title="Hire using 1 free credit" icon="gift-outline" onPress={() => onConfirm(true)} loading={loading} />
            <Button title={`Pay ${taka(fee)} instead`} variant="ghost" size="md" onPress={() => onConfirm(false)} />
          </>
        ) : (
          <Button title={`Hire & pay ${taka(fee)}`} icon="card-outline" onPress={() => onConfirm(false)} loading={loading} />
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  point: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fee: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderRadius: radii.md },
});
