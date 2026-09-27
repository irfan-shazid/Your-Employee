import { useState } from 'react';
import { View } from 'react-native';

import { SearchField } from '@/components/form/SearchField';
import { ChipFilter } from '@/components/lists/ChipFilter';
import { InfiniteList } from '@/components/lists/InfiniteList';
import { AppHeader, EmptyState } from '@/components/ui';
import { useGetAdminUsersInfiniteQuery } from '@/features/admin/api';
import { UserRow } from '@/features/admin/rows';
import { useDebounced } from '@/hooks/useDebounced';
import { spacing, useTheme } from '@/theme';
import type { Role } from '@/types/api';

const ROLES = [
  { value: undefined, label: 'All' },
  { value: 'WORKER', label: 'Workers' },
  { value: 'EMPLOYER', label: 'Employers' },
  { value: 'ADMIN', label: 'Admins' },
  { value: 'NONE', label: 'Not onboarded' },
] as const;

/** Everyone who signed up, searchable by name or email. */
export default function Users() {
  const { colors } = useTheme();
  const [role, setRole] = useState<Role | 'NONE' | undefined>();
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const users = useGetAdminUsersInfiniteQuery({ role, q: q || undefined });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title="Users" />
      <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md, paddingBottom: spacing.md }}>
        <SearchField value={search} onChangeText={setSearch} placeholder="Search name or email" />
        <ChipFilter options={ROLES} value={role} onChange={setRole} />
      </View>
      <InfiniteList
        query={users}
        gap={spacing.sm}
        skeletons={4}
        renderItem={(user) => <UserRow user={user} />}
        empty={<EmptyState icon="people-outline" title="No users found" />}
      />
    </View>
  );
}
