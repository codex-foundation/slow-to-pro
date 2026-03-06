import { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFinanceStore } from '@/stores/financeStore';

const CUSTOM_CATEGORY_ID = '__custom__';
const CUSTOM_CATEGORY_COLOR = '#64748b';

interface ExpenseFormProps {
  onSubmitted?: () => void;
}

export function ExpenseForm({ onSubmitted }: ExpenseFormProps) {
  const { categories, addCategory, addExpense } = useFinanceStore();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const isCustomCategory = selectedCategoryId === CUSTOM_CATEGORY_ID;
  const canSubmit =
    !!amount.trim() && !!selectedCategoryId && (!isCustomCategory || !!customCategoryName.trim());

  const handleAdd = () => {
    const parsed = parseFloat(amount);
    if (!selectedCategoryId || isNaN(parsed) || parsed <= 0) return;

    let categoryId = selectedCategoryId;
    if (selectedCategoryId === CUSTOM_CATEGORY_ID) {
      const normalizedName = customCategoryName.trim();
      if (!normalizedName) return;

      const existing = categories.find(
        (cat) => cat.name.toLowerCase() === normalizedName.toLowerCase()
      );
      categoryId = existing ? existing.id : addCategory(normalizedName, CUSTOM_CATEGORY_COLOR);
    }

    addExpense({ categoryId, amount: parsed, note: note.trim() || undefined });
    setAmount('');
    setNote('');
    setCustomCategoryName('');
    setSelectedCategoryId(null);
    onSubmitted?.();
  };

  return (
    <View className="bg-gray-50 rounded-2xl p-4">
      <Text className="text-sm font-semibold text-gray-600 mb-2">Add expense</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            onPress={() => setSelectedCategoryId(cat.id)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: selectedCategoryId === cat.id ? cat.color : '#e5e7eb',
            }}>
            <Text
              style={{ color: selectedCategoryId === cat.id ? '#fff' : '#374151' }}
              className="text-sm font-medium">
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          onPress={() => setSelectedCategoryId(CUSTOM_CATEGORY_ID)}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            backgroundColor: isCustomCategory ? CUSTOM_CATEGORY_COLOR : '#e5e7eb',
          }}>
          <Text
            style={{ color: isCustomCategory ? '#fff' : '#374151' }}
            className="text-sm font-medium">
            Custom
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {isCustomCategory && (
        <TextInput
          className="border border-gray-200 bg-white rounded-xl px-4 py-3 text-base text-gray-800 mb-2"
          placeholder="Custom category name"
          value={customCategoryName}
          onChangeText={setCustomCategoryName}
        />
      )}

      <View className="flex-row gap-2 mb-2">
        <TextInput
          className="flex-1 border border-gray-200 bg-white rounded-xl px-4 py-3 text-base text-gray-800"
          placeholder="Amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />
        <TextInput
          className="flex-2 border border-gray-200 bg-white rounded-xl px-4 py-3 text-base text-gray-800"
          placeholder="Note (optional)"
          value={note}
          onChangeText={setNote}
        />
      </View>

      <TouchableOpacity
        onPress={handleAdd}
        className="bg-indigo-500 py-3 rounded-xl items-center"
        disabled={!canSubmit}>
        <Text className="text-white font-semibold">Add Expense</Text>
      </TouchableOpacity>
    </View>
  );
}
