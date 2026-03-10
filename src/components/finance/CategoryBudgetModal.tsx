import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Modal } from '@/components/ui/Modal';
import { useFinanceStore } from '@/stores/financeStore';
import { currentMonth } from '@/utils/date';

const PRESET_COLORS = [
  '#f97316',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#22c55e',
  '#eab308',
  '#14b8a6',
  '#94a3b8',
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function CategoryBudgetModal({ visible, onClose }: Props) {
  const theme = useAppTheme();
  const { categories, budgets, addCategory, deleteCategory, upsertBudget } = useFinanceStore();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const month = currentMonth();

  const getBudgetLimit = (categoryId: string) =>
    budgets.find((b) => b.categoryId === categoryId && b.month === month)?.monthlyLimit ?? 0;

  const handleAddCategory = () => {
    if (!newName.trim()) return;
    addCategory(newName.trim(), newColor);
    setNewName('');
    setNewColor(PRESET_COLORS[0]);
  };

  const handleDeleteCategory = (id: string, name: string) => {
    Alert.alert(
      'Delete category',
      `Delete "${name}"? All related expenses and budgets will also be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteCategory(id) },
      ]
    );
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Budgets & Categories">
      <Text
        className="text-xs font-semibold uppercase tracking-wide mb-2"
        style={{ color: theme.textSubtle }}>
        Monthly budgets ({month})
      </Text>

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View className="flex-row items-center mb-2 gap-2">
            <View className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <Text className="flex-1 text-sm" style={{ color: theme.textMuted }}>
              {item.name}
            </Text>
            <Ionicons
              name="cash-outline"
              size={14}
              color={theme.textSubtle}
              style={{ marginRight: 4 }}
            />
            <TextInput
              style={{
                width: 80,
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 6,
                fontSize: 14,
                textAlign: 'right',
                borderColor: theme.border,
                borderWidth: 1,
                backgroundColor: theme.surface,
                color: theme.text,
              }}
              keyboardType="decimal-pad"
              defaultValue={getBudgetLimit(item.id) > 0 ? String(getBudgetLimit(item.id)) : ''}
              placeholder="0"
              placeholderTextColor={theme.textSubtle}
              onEndEditing={(e) => {
                const val = parseFloat(e.nativeEvent.text);
                if (!isNaN(val) && val >= 0) upsertBudget(item.id, val, month);
              }}
            />
            <TouchableOpacity
              onPress={() => handleDeleteCategory(item.id, item.name)}
              className="pl-1"
              accessibilityRole="button"
              accessibilityLabel={`Delete category ${item.name}`}
              accessibilityHint="Removes this category and related data">
              <Ionicons name="trash-outline" size={16} color={theme.textSubtle} />
            </TouchableOpacity>
          </View>
        )}
      />

      <View className="h-px my-4" style={{ backgroundColor: theme.border }} />

      <Text
        className="text-xs font-semibold uppercase tracking-wide mb-2"
        style={{ color: theme.textSubtle }}>
        Add category
      </Text>
      <View className="flex-row flex-wrap gap-2 mb-2">
        {PRESET_COLORS.map((color) => (
          <TouchableOpacity
            key={color}
            onPress={() => setNewColor(color)}
            className={`w-7 h-7 rounded-full ${newColor === color ? 'border-2 border-gray-400' : ''}`}
            style={{ backgroundColor: color }}
          />
        ))}
      </View>
      <View className="flex-row gap-2">
        <TextInput
          className="flex-1 rounded-xl px-3 py-2.5 text-sm"
          style={{
            borderColor: theme.border,
            borderWidth: 1,
            backgroundColor: theme.surface,
            color: theme.text,
          }}
          placeholder="Category name"
          placeholderTextColor={theme.textSubtle}
          value={newName}
          onChangeText={setNewName}
          returnKeyType="done"
          onSubmitEditing={handleAddCategory}
        />
        <TouchableOpacity
          onPress={handleAddCategory}
          className="px-4 rounded-xl items-center justify-center"
          style={{ backgroundColor: newName.trim() ? theme.primary : theme.surface }}
          disabled={!newName.trim()}>
          <Text
            className="font-semibold"
            style={{ color: newName.trim() ? '#fff' : theme.textSubtle }}>
            Add
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
