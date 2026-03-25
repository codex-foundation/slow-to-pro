import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Modal } from '@/components/ui/Modal';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTaskStore } from '@/stores/taskStore';

const PRESET_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#6366f1',
  '#a855f7',
  '#ec4899',
  '#6b7280',
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ManageCategoriesModal({ visible, onClose }: Props) {
  const theme = useAppTheme();
  const { categories, addCategory, updateCategory, deleteCategory } = useTaskStore();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    addCategory(name, newColor);
    setNewName('');
    setNewColor(PRESET_COLORS[0]);
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const commitEdit = () => {
    if (editingId && editName.trim()) {
      updateCategory(editingId, { name: editName.trim() });
    }
    setEditingId(null);
    setEditName('');
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Categories">
      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
        {categories.length === 0 && (
          <Text className="text-sm text-center mb-4" style={{ color: theme.textSubtle }}>
            No categories yet
          </Text>
        )}
        {categories.map((cat) => (
          <View key={cat.id} className="flex-row items-center gap-3 mb-3">
            <View
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: cat.color,
                flexShrink: 0,
              }}
            />
            {editingId === cat.id ? (
              <TextInput
                className="flex-1 text-sm px-2 py-1 rounded-lg border"
                style={{
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  color: theme.text,
                }}
                value={editName}
                onChangeText={setEditName}
                onSubmitEditing={commitEdit}
                onBlur={commitEdit}
                autoFocus
                returnKeyType="done"
              />
            ) : (
              <Text className="flex-1 text-sm" style={{ color: theme.text }}>
                {cat.name}
              </Text>
            )}
            <TouchableOpacity
              onPress={() => startEdit(cat.id, cat.name)}
              className="p-1"
              accessibilityLabel={`Edit category ${cat.name}`}>
              <Ionicons name="pencil-outline" size={16} color={theme.textSubtle} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => deleteCategory(cat.id)}
              className="p-1"
              accessibilityLabel={`Delete category ${cat.name}`}>
              <Ionicons name="trash-outline" size={16} color={theme.danger} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <View className="mt-2 pt-4" style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
        <Text className="text-sm font-medium mb-2" style={{ color: theme.textMuted }}>
          New category
        </Text>
        <TextInput
          testID="new-category-name-input"
          className="border rounded-xl px-4 py-3 text-sm mb-3"
          style={{
            borderColor: theme.border,
            backgroundColor: theme.surface,
            color: theme.text,
          }}
          placeholder="Category name"
          placeholderTextColor={theme.textSubtle}
          value={newName}
          onChangeText={setNewName}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />

        <View className="flex-row flex-wrap gap-2 mb-3">
          {PRESET_COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              testID={`color-swatch-${color}`}
              onPress={() => setNewColor(color)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: color,
                borderWidth: newColor === color ? 3 : 0,
                borderColor: theme.text,
              }}
            />
          ))}
        </View>

        <TouchableOpacity
          testID="add-category-submit"
          onPress={handleAdd}
          className="py-3 rounded-xl items-center"
          style={{
            backgroundColor: theme.primary,
            opacity: newName.trim() ? 1 : 0.55,
          }}
          disabled={!newName.trim()}>
          <Text className="text-white font-semibold text-sm">Add Category</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
