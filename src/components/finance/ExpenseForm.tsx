import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useFinanceStore } from '@/stores/financeStore';

interface ExpenseFormProps {
  onSubmitted?: () => void;
  onOpenCategoryModal?: () => void;
}

export function ExpenseForm({ onSubmitted, onOpenCategoryModal }: ExpenseFormProps) {
  const theme = useAppTheme();
  const { categories, addExpense } = useFinanceStore();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const canSubmit = !!amount.trim() && !!selectedCategoryId;

  const handleAdd = () => {
    const parsed = parseFloat(amount);
    if (!selectedCategoryId || isNaN(parsed) || parsed <= 0) return;

    addExpense({ categoryId: selectedCategoryId, amount: parsed, note: note.trim() || undefined });
    setAmount('');
    setNote('');
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

      <View className="flex-row gap-2 mb-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 8 }}
          scrollEnabled={true}
          nestedScrollEnabled={true}
          className="flex-1">
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
        </ScrollView>

        <TouchableOpacity
          onPress={onOpenCategoryModal}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.border,
            justifyContent: 'center',
            alignItems: 'center',
            flexShrink: 0,
          }}>
          <Ionicons name="settings-outline" size={18} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

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
