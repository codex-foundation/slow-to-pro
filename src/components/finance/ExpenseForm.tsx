import { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useFinanceStore } from '@/stores/financeStore';

const CUSTOM_CATEGORY_ID = '__custom__';
const CUSTOM_CATEGORY_COLOR = '#64748b';

interface ExpenseFormProps {
  onSubmitted?: () => void;
}

export function ExpenseForm({ onSubmitted }: ExpenseFormProps) {
  const theme = useAppTheme();
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
    <View
      className="rounded-2xl p-4"
      style={{ backgroundColor: theme.surfaceMuted, borderColor: theme.border, borderWidth: 1 }}>
      <Text className="text-sm font-semibold mb-2" style={{ color: theme.textMuted }}>
        Add expense
      </Text>

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
              backgroundColor: selectedCategoryId === cat.id ? cat.color : theme.surface,
              borderWidth: 1,
              borderColor: selectedCategoryId === cat.id ? cat.color : theme.border,
            }}>
            <Text
              style={{ color: selectedCategoryId === cat.id ? '#fff' : theme.textMuted }}
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
            backgroundColor: isCustomCategory ? CUSTOM_CATEGORY_COLOR : theme.surface,
            borderWidth: 1,
            borderColor: isCustomCategory ? CUSTOM_CATEGORY_COLOR : theme.border,
          }}>
          <Text
            style={{ color: isCustomCategory ? '#fff' : theme.textMuted }}
            className="text-sm font-medium">
            Custom
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {isCustomCategory && (
        <TextInput
          className="rounded-xl px-4 py-3 text-base mb-2"
          style={{
            borderColor: theme.border,
            borderWidth: 1,
            backgroundColor: theme.surface,
            color: theme.text,
          }}
          placeholder="Custom category name"
          placeholderTextColor={theme.textSubtle}
          value={customCategoryName}
          onChangeText={setCustomCategoryName}
        />
      )}

      <View className="flex-row gap-2 mb-2">
        <TextInput
          className="flex-1 rounded-xl px-4 py-3 text-base"
          style={{
            borderColor: theme.border,
            borderWidth: 1,
            backgroundColor: theme.surface,
            color: theme.text,
          }}
          placeholder="Amount"
          placeholderTextColor={theme.textSubtle}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />
        <TextInput
          className="flex-2 rounded-xl px-4 py-3 text-base"
          style={{
            borderColor: theme.border,
            borderWidth: 1,
            backgroundColor: theme.surface,
            color: theme.text,
          }}
          placeholder="Note (optional)"
          placeholderTextColor={theme.textSubtle}
          value={note}
          onChangeText={setNote}
        />
      </View>

      <TouchableOpacity
        onPress={handleAdd}
        className="py-3 rounded-xl items-center"
        style={{ backgroundColor: canSubmit ? theme.primary : theme.surface }}
        disabled={!canSubmit}>
        <Text className="font-semibold" style={{ color: canSubmit ? '#fff' : theme.textSubtle }}>
          Add Expense
        </Text>
      </TouchableOpacity>
    </View>
  );
}
