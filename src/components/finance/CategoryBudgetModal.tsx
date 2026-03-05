import { useState } from 'react';
import { Alert, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
      <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
        Monthly budgets ({month})
      </Text>

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View className="flex-row items-center mb-2 gap-2">
            <View className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <Text className="flex-1 text-sm text-gray-700">{item.name}</Text>
            <Text className="text-xs text-gray-400 mr-1">$</Text>
            <TextInput
              className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-800 text-right"
              keyboardType="decimal-pad"
              defaultValue={getBudgetLimit(item.id) > 0 ? String(getBudgetLimit(item.id)) : ''}
              placeholder="0"
              onEndEditing={(e) => {
                const val = parseFloat(e.nativeEvent.text);
                if (!isNaN(val) && val >= 0) upsertBudget(item.id, val, month);
              }}
            />
            <TouchableOpacity
              onPress={() => handleDeleteCategory(item.id, item.name)}
              className="pl-1">
              <Text className="text-gray-300 text-base">✕</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <View className="h-px bg-gray-100 my-4" />

      <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
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
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800"
          placeholder="Category name"
          value={newName}
          onChangeText={setNewName}
          returnKeyType="done"
          onSubmitEditing={handleAddCategory}
        />
        <TouchableOpacity
          onPress={handleAddCategory}
          className="bg-indigo-500 px-4 rounded-xl items-center justify-center"
          disabled={!newName.trim()}>
          <Text className="text-white font-semibold">Add</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
