import {
  Modal, SectionList, Text, TouchableOpacity, View, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Rudiment, RudimentCategory } from '@/types/rudiment';
import { CATEGORY_LABELS, RUDIMENTS } from '@/core/rudiments/catalog';

const SECTIONS = (Object.keys(CATEGORY_LABELS) as RudimentCategory[]).map((category) => ({
  title: CATEGORY_LABELS[category],
  data: RUDIMENTS.filter((rudiment) => rudiment.category === category),
}));

interface RudimentPickerProps {
  visible: boolean;
  selectedId: number;
  onSelect: (id: number) => void;
  onClose: () => void;
}

/** 40 種をカテゴリ別に並べた選択シート */
export default function RudimentPicker({
  visible, selectedId, onSelect, onClose,
}: RudimentPickerProps) {
  const insets = useSafeAreaInsets();

  const renderItem = ({ item, index, section }: {
    item: Rudiment;
    index: number;
    section: { data: Rudiment[] };
  }) => {
    const selected = item.id === selectedId;
    const showSub = item.subcategory && section.data[index - 1]?.subcategory !== item.subcategory;
    return (
      <View>
        {showSub && <Text style={styles.subcategory}>{item.subcategory}</Text>}
        <TouchableOpacity
          style={[styles.item, selected && styles.itemSelected]}
          onPress={() => onSelect(item.id)}
        >
          <Text style={styles.itemNumber}>{item.id}</Text>
          <Text style={[styles.itemName, selected && styles.itemNameSelected]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.isOriginal26 && <Text style={styles.badge}>26</Text>}
          <Text style={styles.meter}>
            {`${item.timeSignature.numerator}/${item.timeSignature.denominator}`}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>PAS 40 Rudiments</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={26} color="#d0d0d0" />
          </TouchableOpacity>
        </View>
        <SectionList
          sections={SECTIONS}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          stickySectionHeadersEnabled
          ListFooterComponent={(
            <Text style={styles.legend}>26 = the original 26 Standard American Drum Rudiments</Text>
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2e2e2e',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionHeader: {
    color: '#5b9bd5',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  subcategory: {
    color: '#888888',
    fontSize: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  itemSelected: {
    backgroundColor: '#1f3347',
  },
  itemNumber: {
    width: 26,
    color: '#888888',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  itemName: {
    flex: 1,
    color: '#e0e0e0',
    fontSize: 16,
  },
  itemNameSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  badge: {
    color: '#c9a227',
    fontSize: 11,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: '#c9a227',
    borderRadius: 4,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  meter: {
    width: 30,
    color: '#888888',
    fontSize: 13,
    textAlign: 'right',
  },
  legend: {
    color: '#666666',
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 10,
  },
});
