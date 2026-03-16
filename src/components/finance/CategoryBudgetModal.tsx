import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Alert,
  Modal as RNModal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Modal } from '@/components/ui/Modal';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { useEntitlementStore } from '@/stores/entitlementStore';
import { useFinanceStore } from '@/stores/financeStore';
import { currentMonth } from '@/utils/date';
import { PaywallModal } from '@/components/ui/PaywallModal';

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

interface ColorSwatchPickerProps {
  value: string;
  onChange: (color: string) => void;
  extraColors?: string[];
}

function ColorSwatchPicker({ value, onChange, extraColors = [] }: ColorSwatchPickerProps) {
  const theme = useAppTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draft, setDraft] = useState('#ff0000');
  const isPreset = PRESET_COLORS.includes(value);
  const isInExtra = extraColors.includes(value);
  const showCustomSwatch = !isPreset && !isInExtra;

  const openPicker = () => {
    setDraft(!isPreset ? value : '#ff0000');
    setPickerOpen(true);
  };

  const confirmColor = () => {
    onChange(draft);
    setPickerOpen(false);
  };

  return (
    <View className="mb-3">
      <View className="flex-row flex-wrap gap-2 mb-1">
        {PRESET_COLORS.map((color) => (
          <TouchableOpacity
            key={color}
            onPress={() => onChange(color)}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: color,
              borderWidth: value === color ? 2 : 0,
              borderColor: theme.text,
            }}
          />
        ))}

        {/* Extra custom colors from other categories */}
        {extraColors.map((color) => (
          <TouchableOpacity
            key={color}
            onPress={() => onChange(color)}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: color,
              borderWidth: value === color ? 2 : 0,
              borderColor: theme.text,
            }}
          />
        ))}

        {/* Current value swatch — only shown when it's not a preset or in extraColors */}
        {showCustomSwatch && (
          <TouchableOpacity
            onPress={openPicker}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: value,
              borderWidth: 2,
              borderColor: theme.text,
            }}
          />
        )}

        {/* + button to open the color picker modal */}
        <TouchableOpacity
          onPress={openPicker}
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text
            style={{ fontSize: 18, lineHeight: 20, fontWeight: '600', color: theme.textSubtle }}>
            +
          </Text>
        </TouchableOpacity>
      </View>

      {/* Color picker modal */}
      <RNModal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <View
            style={{
              backgroundColor: theme.surfaceElevated,
              borderRadius: 20,
              padding: 20,
              width: 280,
            }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 16 }}>
              Custom color
            </Text>
            <ColorPicker value={draft} onChange={setDraft} />
            {/* Preview + hex */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: draft }} />
              <Text style={{ fontSize: 14, color: theme.textMuted, fontVariant: ['tabular-nums'] }}>
                {draft.toUpperCase()}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setPickerOpen(false)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 12,
                  alignItems: 'center',
                  backgroundColor: theme.surface,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}>
                <Text style={{ fontWeight: '600', color: theme.textSubtle }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmColor}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 12,
                  alignItems: 'center',
                  backgroundColor: theme.primary,
                }}>
                <Text style={{ fontWeight: '600', color: '#fff' }}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </RNModal>
    </View>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function CategoryBudgetModal({ visible, onClose }: Props) {
  const theme = useAppTheme();
  const { categories, budgets, addCategory, updateCategory, deleteCategory, upsertBudget } =
    useFinanceStore();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(PRESET_COLORS[0]);
  const [showPaywall, setShowPaywall] = useState(false);
  const isPro = useEntitlementStore((s) => s.isPro);
  const month = currentMonth();

  const allExtraColors = [
    ...new Set([
      ...categories.map((c) => c.color).filter((c) => !PRESET_COLORS.includes(c)),
      ...(!PRESET_COLORS.includes(newColor) ? [newColor] : []),
      ...(!PRESET_COLORS.includes(editColor) ? [editColor] : []),
    ]),
  ];

  const getBudgetLimit = (categoryId: string) =>
    budgets.find((b) => b.categoryId === categoryId && b.month === month)?.monthlyLimit ?? 0;

  const handleAddCategory = () => {
    if (!newName.trim()) return;
    if (!isPro && categories.length >= 3) {
      setShowPaywall(true);
      return;
    }
    addCategory(newName.trim(), newColor);
    setNewName('');
    setNewColor(PRESET_COLORS[0]);
  };

  const handleStartEdit = (id: string, name: string, color: string) => {
    setEditingId(id);
    setEditName(name);
    setEditColor(color);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim()) return;
    updateCategory(editingId, editName.trim(), editColor);
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
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
    <>
      <Modal visible={visible} onClose={onClose} title="Budgets & Categories">
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 8 }}>
          <Text
            className="text-xs font-semibold uppercase tracking-wide mb-2"
            style={{ color: theme.textSubtle }}>
            Monthly budgets ({month})
          </Text>

          {categories.map((item) => (
            <View key={item.id} className="mb-3">
              {editingId === item.id ? (
                <View
                  className="rounded-xl p-3"
                  style={{
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    borderWidth: 1,
                  }}>
                  <ColorSwatchPicker
                    value={editColor}
                    onChange={setEditColor}
                    extraColors={allExtraColors}
                  />
                  <View className="flex-row gap-2">
                    <TextInput
                      className="flex-1 rounded-lg px-3 py-2 text-sm"
                      style={{
                        borderColor: theme.border,
                        borderWidth: 1,
                        backgroundColor: theme.surfaceMuted,
                        color: theme.text,
                      }}
                      value={editName}
                      onChangeText={setEditName}
                      returnKeyType="done"
                      onSubmitEditing={handleSaveEdit}
                      autoFocus
                    />
                    <TouchableOpacity
                      onPress={handleSaveEdit}
                      className="px-3 rounded-lg items-center justify-center"
                      style={{ backgroundColor: editName.trim() ? theme.primary : theme.surface }}>
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: editName.trim() ? '#fff' : theme.textSubtle }}>
                        Save
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleCancelEdit}
                      className="px-3 rounded-lg items-center justify-center"
                      style={{
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                        borderWidth: 1,
                      }}>
                      <Text className="text-sm" style={{ color: theme.textSubtle }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View className="flex-row items-center gap-2">
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
                    defaultValue={
                      getBudgetLimit(item.id) > 0 ? String(getBudgetLimit(item.id)) : ''
                    }
                    placeholder="0"
                    placeholderTextColor={theme.textSubtle}
                    onEndEditing={(e) => {
                      const val = parseFloat(e.nativeEvent.text);
                      if (!isNaN(val) && val >= 0) upsertBudget(item.id, val, month);
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => handleStartEdit(item.id, item.name, item.color)}
                    className="pl-1"
                    accessibilityRole="button"
                    accessibilityLabel={`Edit category ${item.name}`}>
                    <Ionicons name="pencil-outline" size={16} color={theme.textSubtle} />
                  </TouchableOpacity>
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
            </View>
          ))}

          <View className="h-px my-4" style={{ backgroundColor: theme.border }} />

          <Text
            className="text-xs font-semibold uppercase tracking-wide mb-2"
            style={{ color: theme.textSubtle }}>
            Add category
          </Text>
          <ColorSwatchPicker value={newColor} onChange={setNewColor} extraColors={allExtraColors} />
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
        </ScrollView>
      </Modal>
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgraded={() => setShowPaywall(false)}
      />
    </>
  );
}
